import { execFile, spawn, type ChildProcess } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { detectPlatformFromUrl, PLATFORM_METADATA } from '../shared/formats'
import type {
  AnalyzedMediaInfo,
  BrowserCookieSource,
  DownloadFormatOption,
  DownloadRequest,
  DownloadTask,
  SupportedPlatform,
  VideoQualityPreset
} from '../shared/types'
import { getAugmentedEnv, getBinaries } from './binaries'
import { extractThreadsMedia, type OffscreenHtmlFetcher } from './threadsExtractor'

const execFileAsync = promisify(execFile)

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return (cleaned || 'APlayer_Media').slice(0, 110)
}

export function buildVideoFormatSelector(quality: VideoQualityPreset): string {
  if (quality === 'best') {
    return 'bv*+ba/b'
  }
  const h = parseInt(quality, 10)
  if (!Number.isFinite(h)) return 'bv*+ba/b'
  return `bv*[height<=${h}]+ba/b[height<=${h}]/bv*+ba/b`
}

export function buildYtDlpArgs(
  req: DownloadRequest,
  targetDir: string,
  ffmpegDir: string | null,
  denoPath: string | null
): string[] {
  const args: string[] = [
    '--newline',
    '--progress',
    '--progress-template',
    'download:APLAYER_PROGRESS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_str,progress._total_bytes_estimate_str)s',
    '--print',
    'after_move:APLAYER_FILE|%(filepath)s',
    '--windows-filenames',
    '-N',
    '4'
  ]

  if (!req.allowPlaylist) {
    args.push('--no-playlist')
  }

  if (ffmpegDir) {
    args.push('--ffmpeg-location', ffmpegDir)
  }

  if (denoPath) {
    args.push('--js-runtimes', `deno:${denoPath}`)
  }

  if (req.cookieBrowser && req.cookieBrowser !== 'none') {
    args.push('--cookies-from-browser', req.cookieBrowser)
  }

  const outputTemplate = path.join(targetDir, '%(title).110B [%(id)s].%(ext)s')
  args.push('-o', outputTemplate)

  if (req.mode === 'audio') {
    args.push('-x', '--audio-format', req.audioFormat, '--audio-quality', '0')
    if (req.embedThumbnail) {
      args.push('--add-metadata')
      if (req.audioFormat !== 'wav') {
        args.push('--embed-thumbnail')
      }
    }
  } else {
    args.push('-f', buildVideoFormatSelector(req.videoQuality))
    args.push('--merge-output-format', req.videoContainer)
    if (req.videoContainer === 'mp4') {
      args.push('-S', 'vcodec:h264,ext:mp4:m4a')
    }
    if (req.embedSubtitles) {
      args.push('--write-subs', '--write-auto-subs', '--sub-langs', 'vi,en', '--embed-subs')
    }
    if (req.embedThumbnail) {
      args.push('--add-metadata')
    }
  }

  args.push(req.url.trim())
  return args
}

export interface ParsedProgressLine {
  progress: number
  speed?: string
  eta?: string
  totalSize?: string
}

export function parseYtDlpProgressLine(line: string): ParsedProgressLine | null {
  const trimmed = line.trim()
  if (trimmed.startsWith('APLAYER_PROGRESS|')) {
    const parts = trimmed.split('|')
    const pctStr = (parts[1] || '').replace('%', '').trim()
    const pct = Number(pctStr)
    const isMeaningful = (val?: string): string | undefined => {
      if (!val) return undefined
      const t = val.trim()
      if (!t || t === 'N/A' || t === 'NA' || t.toLowerCase().includes('unknown')) return undefined
      return t
    }
    return {
      progress: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0,
      speed: isMeaningful(parts[2]),
      eta: isMeaningful(parts[3]),
      totalSize: isMeaningful(parts[4])
    }
  }

  // Fallback standard yt-dlp line format
  const stdMatch = /\[download\]\s+(\d+(?:\.\d+)?)%\s+of\s+~?\s*([^\s]+)(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/i.exec(
    trimmed
  )
  if (stdMatch) {
    return {
      progress: Math.min(100, Math.max(0, Number(stdMatch[1]))),
      totalSize: stdMatch[2],
      speed: stdMatch[3],
      eta: stdMatch[4]
    }
  }
  return null
}

export function getHelpfulErrorHint(platform: SupportedPlatform, stderr: string): string | undefined {
  const lower = stderr.toLowerCase()
  if (
    lower.includes('login') ||
    lower.includes('sign in') ||
    lower.includes('cookies') ||
    lower.includes('403') ||
    lower.includes('private') ||
    lower.includes('not available') ||
    lower.includes('rate-limit') ||
    lower.includes('instagram') ||
    lower.includes('facebook')
  ) {
    if (platform === 'instagram' || platform === 'facebook' || platform === 'threads' || platform === 'x') {
      return 'Nền tảng này thường yêu cầu đăng nhập. Hãy chọn trình duyệt bạn đã đăng nhập (Chrome / Safari) ở mục "Cookie trình duyệt" rồi thử lại.'
    }
    return 'Hãy thử bật "Cookie trình duyệt" (Chrome / Safari) trong Tuỳ chọn nâng cao hoặc kiểm tra đường link.'
  }
  return undefined
}

export function resolveDownloadDirectory(
  baseDir: string,
  platform: SupportedPlatform,
  organizeByPlatform: boolean
): string {
  const resolved = path.resolve(baseDir)
  if (!organizeByPlatform) return resolved
  const sub = PLATFORM_METADATA[platform]?.folderName || 'Web'
  return path.join(resolved, sub)
}

interface ActiveDownloadControl {
  cancel: () => void
}

export interface DownloaderCallbacks {
  onTaskUpdate: (task: DownloadTask) => void
  onDownloadComplete: (task: DownloadTask) => void
  offscreenFetcher?: OffscreenHtmlFetcher
}

export class DownloadManager {
  private tasks: DownloadTask[] = []
  private activeControls = new Map<string, ActiveDownloadControl>()
  private callbacks: DownloaderCallbacks

  constructor(initialTasks: DownloadTask[], callbacks: DownloaderCallbacks) {
    this.tasks = [...initialTasks]
    this.callbacks = callbacks
  }

  getTasks(): DownloadTask[] {
    return this.tasks
  }

  private emitUpdate(task: DownloadTask): void {
    const idx = this.tasks.findIndex((t) => t.id === task.id)
    if (idx >= 0) {
      this.tasks[idx] = { ...task }
    } else {
      this.tasks.unshift({ ...task })
    }
    this.callbacks.onTaskUpdate({ ...task })
  }

  async analyzeUrl(rawUrl: string, cookieBrowser: BrowserCookieSource = 'none'): Promise<AnalyzedMediaInfo> {
    const url = rawUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      throw new Error('Vui lòng nhập đường dẫn hợp lệ bắt đầu bằng http:// hoặc https://')
    }

    const platform = detectPlatformFromUrl(url)

    if (platform === 'threads') {
      return extractThreadsMedia(url, this.callbacks.offscreenFetcher)
    }

    const bins = await getBinaries()
    if (!bins.ytDlpPath) {
      throw new Error('Không tìm thấy yt-dlp. Vui lòng cài đặt bằng: brew install yt-dlp')
    }

    const args = ['--dump-single-json', '--no-warnings', '--flat-playlist']
    if (bins.denoPath) {
      args.push('--js-runtimes', `deno:${bins.denoPath}`)
    }
    if (cookieBrowser && cookieBrowser !== 'none') {
      args.push('--cookies-from-browser', cookieBrowser)
    }
    args.push(url)

    try {
      const { stdout } = await execFileAsync(bins.ytDlpPath, args, {
        timeout: 45000,
        maxBuffer: 32 * 1024 * 1024,
        env: getAugmentedEnv()
      })

      const json = JSON.parse(stdout) as Record<string, unknown>
      const isPlaylist = json._type === 'playlist' && Array.isArray(json.entries)
      const entries = isPlaylist ? (json.entries as Array<Record<string, unknown>>) : []

      const rawFormats = Array.isArray(json.formats) ? (json.formats as Array<Record<string, unknown>>) : []
      const seenHeights = new Set<number>()
      const formats: DownloadFormatOption[] = []

      for (const f of rawFormats) {
        const height = typeof f.height === 'number' ? f.height : 0
        const vcodec = typeof f.vcodec === 'string' ? f.vcodec : 'none'
        const acodec = typeof f.acodec === 'string' ? f.acodec : 'none'
        if (height > 0 && vcodec !== 'none' && !seenHeights.has(height)) {
          seenHeights.add(height)
          formats.push({
            id: String(f.format_id || height),
            label: `${height}p${typeof f.fps === 'number' && f.fps >= 50 ? ` ${Math.round(f.fps)}fps` : ''}`,
            ext: String(f.ext || 'mp4'),
            resolution: `${height}p`,
            fps: typeof f.fps === 'number' ? f.fps : undefined,
            filesizeApprox:
              typeof f.filesize === 'number'
                ? f.filesize
                : typeof f.filesize_approx === 'number'
                  ? f.filesize_approx
                  : undefined,
            vcodec,
            acodec,
            isAudioOnly: false
          })
        }
      }

      formats.sort((a, b) => parseInt(b.resolution || '0', 10) - parseInt(a.resolution || '0', 10))

      const thumbs = Array.isArray(json.thumbnails) ? (json.thumbnails as Array<Record<string, unknown>>) : []
      const bestThumb =
        (typeof json.thumbnail === 'string' && json.thumbnail) ||
        (thumbs.length > 0 && typeof thumbs[thumbs.length - 1]?.url === 'string'
          ? String(thumbs[thumbs.length - 1].url)
          : undefined)

      return {
        url,
        platform,
        title: String(json.title || 'Untitled Media'),
        uploader: String(json.uploader || json.channel || json.creator || PLATFORM_METADATA[platform].name),
        duration: typeof json.duration === 'number' ? json.duration : 0,
        thumbnail: bestThumb,
        viewCount: typeof json.view_count === 'number' ? json.view_count : undefined,
        description: typeof json.description === 'string' ? json.description.slice(0, 300) : undefined,
        isPlaylist,
        playlistCount: isPlaylist ? entries.length : undefined,
        extractorEngine: 'yt-dlp',
        formats: formats.slice(0, 8)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const hint = getHelpfulErrorHint(platform, message)
      throw new Error(hint ? `${hint}\n\nChi tiết: ${message.slice(0, 260)}` : message.slice(0, 320))
    }
  }

  async resolveDirectStreamUrl(
    rawUrl: string,
    cookieBrowser: BrowserCookieSource = 'none'
  ): Promise<{ streamUrl: string; title: string; uploader: string; thumbnail?: string; platform: SupportedPlatform }> {
    const url = rawUrl.trim()
    const platform = detectPlatformFromUrl(url)

    if (platform === 'threads') {
      const info = await extractThreadsMedia(url, this.callbacks.offscreenFetcher)
      if (!info.directVideoUrl) throw new Error('Không thể lấy luồng video từ Threads')
      return {
        streamUrl: info.directVideoUrl,
        title: info.title,
        uploader: info.uploader,
        thumbnail: info.thumbnail,
        platform: 'threads'
      }
    }

    const bins = await getBinaries()
    if (!bins.ytDlpPath) {
      throw new Error('Không tìm thấy yt-dlp')
    }

    const args = ['-f', 'b[ext=mp4]/b', '-g', '--no-playlist', '--no-warnings']
    if (bins.denoPath) {
      args.push('--js-runtimes', `deno:${bins.denoPath}`)
    }
    if (cookieBrowser && cookieBrowser !== 'none') {
      args.push('--cookies-from-browser', cookieBrowser)
    }
    args.push(url)

    const { stdout } = await execFileAsync(bins.ytDlpPath, args, {
      timeout: 30000,
      env: getAugmentedEnv()
    })
    const streamUrl = stdout.trim().split('\n')[0]?.trim()
    if (!streamUrl) {
      throw new Error('Không thể lấy link phát trực tiếp cho đường dẫn này')
    }
    return {
      streamUrl,
      title: `${PLATFORM_METADATA[platform].name} Stream`,
      uploader: PLATFORM_METADATA[platform].name,
      platform
    }
  }

  async startDownload(req: DownloadRequest): Promise<DownloadTask> {
    const url = req.url.trim()
    const platform = detectPlatformFromUrl(url)
    const targetDir = resolveDownloadDirectory(req.outputDir, platform, req.organizeByPlatform)
    await fs.promises.mkdir(targetDir, { recursive: true })

    const qualityLabel =
      req.mode === 'audio'
        ? `Audio · ${req.audioFormat.toUpperCase()}`
        : `${req.videoQuality === 'best' ? 'Best' : `${req.videoQuality}p`} · ${req.videoContainer.toUpperCase()}`

    const task: DownloadTask = {
      id: crypto.randomUUID(),
      url,
      platform,
      title: req.titleHint || `${PLATFORM_METADATA[platform].name} Media`,
      uploader: req.uploaderHint,
      thumbnail: req.thumbnailHint,
      mode: req.mode,
      qualityLabel,
      outputDir: targetDir,
      status: 'analyzing',
      progress: 0,
      createdAt: Date.now()
    }

    this.emitUpdate(task)

    if (platform === 'threads' || req.extractorEngine === 'threads-native') {
      void this.runThreadsDownload(task, req)
    } else {
      void this.runYtDlpDownload(task, req)
    }

    return task
  }

  private async runThreadsDownload(task: DownloadTask, req: DownloadRequest): Promise<void> {
    const controller = new AbortController()
    let activeFfmpeg: ChildProcess | null = null

    this.activeControls.set(task.id, {
      cancel: () => {
        controller.abort()
        if (activeFfmpeg && !activeFfmpeg.killed) {
          try {
            activeFfmpeg.kill('SIGKILL')
          } catch {
            // ignore
          }
        }
      }
    })

    try {
      let directUrl = req.directVideoUrl
      if (!directUrl) {
        const info = await extractThreadsMedia(req.url, this.callbacks.offscreenFetcher)
        directUrl = info.directVideoUrl
        task.title = info.title
        task.uploader = info.uploader
        task.thumbnail = info.thumbnail
      }
      if (!directUrl) {
        throw new Error('Không tìm thấy luồng video từ Threads.')
      }

      task.status = 'downloading'
      this.emitUpdate(task)

      const resp = await fetch(directUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
      })

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status} khi tải video từ Threads`)
      }

      const totalBytes = Number(resp.headers.get('content-length') || '0')
      const baseName = `${sanitizeFilename(task.title)} [${task.id.slice(0, 6)}]`
      const rawMp4Path = path.join(task.outputDir, `${baseName}.mp4`)

      const fileStream = fs.createWriteStream(rawMp4Path)
      const reader = resp.body.getReader()
      let received = 0
      const startedAt = Date.now()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          fileStream.write(Buffer.from(value))
          received += value.byteLength
          const elapsedSec = Math.max(0.2, (Date.now() - startedAt) / 1000)
          const mbps = received / 1024 / 1024 / elapsedSec
          task.speed = `${mbps.toFixed(1)} MB/s`
          if (totalBytes > 0) {
            task.progress = Math.min(99, Math.round((received / totalBytes) * 1000) / 10)
            task.totalSize = `${(totalBytes / 1024 / 1024).toFixed(1)} MB`
          } else {
            task.progress = 50
            task.totalSize = `${(received / 1024 / 1024).toFixed(1)} MB`
          }
          this.emitUpdate(task)
        }
      }

      await new Promise<void>((resolve, reject) => {
        fileStream.on('finish', resolve)
        fileStream.on('error', reject)
        fileStream.end()
      })

      let finalPath = rawMp4Path

      if (req.mode === 'audio') {
        const bins = await getBinaries()
        if (!bins.ffmpegPath) {
          throw new Error('Cần FFmpeg để tách audio từ video Threads')
        }
        task.status = 'processing'
        task.progress = 96
        this.emitUpdate(task)

        finalPath = path.join(task.outputDir, `${baseName}.${req.audioFormat}`)
        const codecArgs: Record<string, string[]> = {
          mp3: ['-c:a', 'libmp3lame', '-b:a', '320k'],
          m4a: ['-c:a', 'aac', '-b:a', '256k'],
          flac: ['-c:a', 'flac'],
          wav: ['-c:a', 'pcm_s16le'],
          opus: ['-c:a', 'libopus', '-b:a', '192k']
        }
        const args = [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-i',
          rawMp4Path,
          '-vn',
          ...(codecArgs[req.audioFormat] || codecArgs.mp3),
          finalPath
        ]

        await new Promise<void>((resolve, reject) => {
          activeFfmpeg = spawn(bins.ffmpegPath!, args, { env: getAugmentedEnv() })
          activeFfmpeg.on('error', reject)
          activeFfmpeg.on('close', (code) => {
            if (code === 0) resolve()
            else reject(new Error(`FFmpeg chuyển đổi audio thất bại (code ${code})`))
          })
        })

        try {
          await fs.promises.unlink(rawMp4Path)
        } catch {
          // ignore cleanup
        }
      }

      task.status = 'completed'
      task.progress = 100
      task.outputFilePath = finalPath
      task.completedAt = Date.now()
      this.activeControls.delete(task.id)
      this.emitUpdate(task)
      this.callbacks.onDownloadComplete({ ...task })
    } catch (err) {
      this.activeControls.delete(task.id)
      if (controller.signal.aborted || task.status === 'cancelled') {
        task.status = 'cancelled'
        this.emitUpdate(task)
        return
      }
      const msg = err instanceof Error ? err.message : String(err)
      task.status = 'error'
      task.errorMessage = msg
      task.hintMessage = getHelpfulErrorHint('threads', msg)
      this.emitUpdate(task)
    }
  }

  private async runYtDlpDownload(task: DownloadTask, req: DownloadRequest): Promise<void> {
    const bins = await getBinaries()
    if (!bins.ytDlpPath) {
      task.status = 'error'
      task.errorMessage = 'Không tìm thấy yt-dlp trên máy.'
      this.emitUpdate(task)
      return
    }

    const ffmpegDir = bins.ffmpegPath ? path.dirname(bins.ffmpegPath) : null
    const args = buildYtDlpArgs(req, task.outputDir, ffmpegDir, bins.denoPath)

    let cancelled = false
    const proc = spawn(bins.ytDlpPath, args, {
      env: getAugmentedEnv(),
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.activeControls.set(task.id, {
      cancel: () => {
        cancelled = true
        if (!proc.killed) {
          try {
            proc.kill('SIGTERM')
            setTimeout(() => {
              if (!proc.killed) proc.kill('SIGKILL')
            }, 1200)
          } catch {
            // ignore
          }
        }
      }
    })

    task.status = 'downloading'
    this.emitUpdate(task)

    let finalFilePath: string | undefined
    let stderrBuf = ''
    let stdoutRemainder = ''

    const processLine = (line: string): void => {
      const trimmed = line.trim()
      if (!trimmed) return

      if (trimmed.startsWith('APLAYER_FILE|')) {
        const extractedPath = trimmed.slice('APLAYER_FILE|'.length).trim()
        if (extractedPath) {
          finalFilePath = extractedPath
          task.title = path.basename(extractedPath, path.extname(extractedPath))
        }
        return
      }

      if (
        trimmed.startsWith('[Merger]') ||
        trimmed.startsWith('[ExtractAudio]') ||
        trimmed.startsWith('[EmbedThumbnail]') ||
        trimmed.startsWith('[Metadata]') ||
        trimmed.startsWith('[VideoRemuxer]')
      ) {
        task.status = 'processing'
        task.progress = Math.max(task.progress, 96)
        this.emitUpdate(task)
        return
      }

      const destMatch = /^\[download\]\s+Destination:\s+(.+)$/i.exec(trimmed)
      if (destMatch?.[1]) {
        finalFilePath = destMatch[1].trim()
        if (!req.titleHint) {
          task.title = path.basename(finalFilePath, path.extname(finalFilePath))
        }
        this.emitUpdate(task)
        return
      }

      const parsedProgress = parseYtDlpProgressLine(trimmed)
      if (parsedProgress) {
        task.status = 'downloading'
        task.progress = parsedProgress.progress
        if (parsedProgress.speed) task.speed = parsedProgress.speed
        if (parsedProgress.eta) task.eta = parsedProgress.eta
        if (parsedProgress.totalSize) task.totalSize = parsedProgress.totalSize
        this.emitUpdate(task)
      }
    }

    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutRemainder += chunk.toString('utf-8')
      const lines = stdoutRemainder.split(/\r?\n/)
      stdoutRemainder = lines.pop() || ''
      for (const line of lines) {
        processLine(line)
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8')
      stderrBuf += text
      for (const line of text.split(/\r?\n/)) {
        if (line.includes('APLAYER_PROGRESS|')) {
          processLine(line)
        }
      }
    })

    proc.on('error', (err) => {
      this.activeControls.delete(task.id)
      task.status = 'error'
      task.errorMessage = err.message
      this.emitUpdate(task)
    })

    proc.on('close', (code) => {
      if (stdoutRemainder) processLine(stdoutRemainder)
      this.activeControls.delete(task.id)

      if (cancelled) {
        task.status = 'cancelled'
        this.emitUpdate(task)
        return
      }

      if (code === 0) {
        task.status = 'completed'
        task.progress = 100
        task.eta = undefined
        task.outputFilePath = finalFilePath
        task.completedAt = Date.now()
        this.emitUpdate(task)
        this.callbacks.onDownloadComplete({ ...task })
      } else {
        task.status = 'error'
        const cleanErr = stderrBuf
          .split('\n')
          .filter((l) => l.includes('ERROR:'))
          .slice(-2)
          .join(' ')
          .trim()
        task.errorMessage = cleanErr || `yt-dlp thoát với mã lỗi ${code}`
        task.hintMessage = getHelpfulErrorHint(task.platform, stderrBuf)
        this.emitUpdate(task)
      }
    })
  }

  cancelDownload(taskId: string): void {
    const ctrl = this.activeControls.get(taskId)
    if (ctrl) {
      ctrl.cancel()
    }
    const task = this.tasks.find((t) => t.id === taskId)
    if (task && task.status !== 'completed') {
      task.status = 'cancelled'
      this.emitUpdate(task)
    }
  }

  removeTask(taskId: string): DownloadTask[] {
    this.cancelDownload(taskId)
    this.tasks = this.tasks.filter((t) => t.id !== taskId)
    return this.tasks
  }

  clearCompleted(): DownloadTask[] {
    this.tasks = this.tasks.filter(
      (t) => t.status === 'downloading' || t.status === 'analyzing' || t.status === 'processing' || t.status === 'queued'
    )
    return this.tasks
  }

  cancelAll(): void {
    for (const ctrl of this.activeControls.values()) {
      ctrl.cancel()
    }
    this.activeControls.clear()
  }
}
