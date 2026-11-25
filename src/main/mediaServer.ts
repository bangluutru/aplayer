import { spawn, execFile, type ChildProcess } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import http, { type IncomingMessage, type ServerResponse } from 'http'
import path from 'path'
import { promisify } from 'util'
import { convertSrtToVtt, getExtension, getMimeTypeForExt } from '../shared/formats'
import { getAugmentedEnv, getBinaries } from './binaries'
import { probeMediaFile } from './mediaProbe'

const execFileAsync = promisify(execFile)

export interface MediaServerHandle {
  baseUrl: string
  port: number
  token: string
  stop: () => Promise<void>
}

export async function startMediaServer(cacheDir: string): Promise<MediaServerHandle> {
  const token = crypto.randomBytes(24).toString('hex')
  const thumbsDir = path.join(cacheDir, 'thumbs')
  await fs.promises.mkdir(thumbsDir, { recursive: true })

  const activeProcesses = new Set<ChildProcess>()

  const setCorsHeaders = (res: ServerResponse): void => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')
  }

  const sendError = (res: ServerResponse, status: number, message: string): void => {
    if (res.headersSent) {
      res.end()
      return
    }
    setCorsHeaders(res)
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: message }))
  }

  const validateFilePath = async (rawPath: string | null): Promise<{ filePath: string; stat: fs.Stats } | null> => {
    if (!rawPath) return null
    const resolved = path.resolve(rawPath)
    try {
      const stat = await fs.promises.stat(resolved)
      if (!stat.isFile()) return null
      return { filePath: resolved, stat }
    } catch {
      return null
    }
  }

  const handleDirectRange = async (req: IncomingMessage, res: ServerResponse, filePath: string, stat: fs.Stats): Promise<void> => {
    const ext = getExtension(filePath)
    const mime = getMimeTypeForExt(ext)
    const fileSize = stat.size
    const rangeHeader = req.headers.range

    setCorsHeaders(res)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'no-cache')

    if (rangeHeader) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim())
      if (!match) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
        res.end()
        return
      }
      const start = match[1] ? parseInt(match[1], 10) : 0
      const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1
      if (start >= fileSize || start > end || start < 0) {
        res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` })
        res.end()
        return
      }

      const chunkSize = end - start + 1
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize,
        'Content-Type': mime
      })

      if (req.method === 'HEAD') {
        res.end()
        return
      }

      const stream = fs.createReadStream(filePath, { start, end })
      stream.on('error', () => {
        if (!res.destroyed) res.end()
      })
      res.on('close', () => stream.destroy())
      stream.pipe(res)
      return
    }

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mime
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = fs.createReadStream(filePath)
    stream.on('error', () => {
      if (!res.destroyed) res.end()
    })
    res.on('close', () => stream.destroy())
    stream.pipe(res)
  }

  const handleSmartStream = async (
    req: IncomingMessage,
    res: ServerResponse,
    filePath: string,
    url: URL
  ): Promise<void> => {
    const bins = await getBinaries()
    if (!bins.ffmpegPath) {
      sendError(res, 503, 'FFmpeg is not installed on this system')
      return
    }

    const startSec = Math.max(0, Number(url.searchParams.get('start') || '0') || 0)
    const audioTrackIdx = Math.max(0, parseInt(url.searchParams.get('audioTrack') || '0', 10) || 0)
    const forceVideoTranscode = url.searchParams.get('transcodeVideo') === '1'

    let probe
    try {
      probe = await probeMediaFile(filePath)
    } catch {
      sendError(res, 404, 'Unable to inspect media file')
      return
    }

    const args: string[] = ['-hide_banner', '-loglevel', 'error']
    if (startSec > 0.05) {
      args.push('-ss', startSec.toFixed(3))
    }
    args.push('-i', filePath)

    let contentType = 'video/mp4'

    if (probe.kind === 'audio') {
      // Lossless real-time FLAC stream for universal audio compatibility (WMA, ALAC, APE, WV, AIFF, AC3, DTS)
      contentType = 'audio/flac'
      args.push(
        '-vn',
        '-map',
        `0:a:${audioTrackIdx}?`,
        '-c:a',
        'flac',
        '-compression_level',
        '1',
        '-f',
        'flac',
        'pipe:1'
      )
    } else {
      contentType = 'video/mp4'
      const canCopyH264 = probe.videoCodec?.toLowerCase() === 'h264' && !forceVideoTranscode
      args.push('-map', '0:v:0', '-map', `0:a:${audioTrackIdx}?`)

      if (canCopyH264) {
        args.push('-c:v', 'copy')
      } else {
        // Fast, universal H.264 stream with guaranteed even dimensions & yuv420p for Chromium playback
        args.push(
          '-vf',
          'scale=trunc(iw/2)*2:trunc(ih/2)*2',
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-tune',
          'zerolatency',
          '-crf',
          '21',
          '-pix_fmt',
          'yuv420p'
        )
      }

      args.push(
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ac',
        '2',
        '-f',
        'mp4',
        '-movflags',
        'frag_keyframe+empty_moov+default_base_moof',
        'pipe:1'
      )
    }

    setCorsHeaders(res)
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    })

    const proc = spawn(bins.ffmpegPath, args, {
      env: getAugmentedEnv(),
      stdio: ['ignore', 'pipe', 'pipe']
    })
    activeProcesses.add(proc)

    const cleanup = (): void => {
      activeProcesses.delete(proc)
      if (!proc.killed) {
        try {
          proc.kill('SIGKILL')
        } catch {
          // ignore
        }
      }
    }

    req.on('close', cleanup)
    req.on('aborted', cleanup)
    res.on('close', cleanup)

    proc.stdout.pipe(res)

    proc.on('error', () => {
      cleanup()
      if (!res.destroyed) res.end()
    })
    proc.on('exit', () => {
      activeProcesses.delete(proc)
      if (!res.writableEnded) res.end()
    })
  }

  const handleEmbeddedSubtitle = async (
    res: ServerResponse,
    filePath: string,
    streamIndex: number
  ): Promise<void> => {
    const bins = await getBinaries()
    if (!bins.ffmpegPath) {
      sendError(res, 503, 'FFmpeg is unavailable')
      return
    }
    try {
      const { stdout } = await execFileAsync(
        bins.ffmpegPath,
        ['-hide_banner', '-loglevel', 'error', '-i', filePath, '-map', `0:${streamIndex}`, '-f', 'webvtt', 'pipe:1'],
        {
          timeout: 20000,
          maxBuffer: 16 * 1024 * 1024,
          env: getAugmentedEnv()
        }
      )
      setCorsHeaders(res)
      res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8' })
      res.end(stdout)
    } catch {
      sendError(res, 500, 'Failed to extract embedded subtitle')
    }
  }

  const handleExternalSubtitle = async (res: ServerResponse, subPath: string): Promise<void> => {
    const ext = getExtension(subPath)
    try {
      if (ext === 'vtt') {
        const content = await fs.promises.readFile(subPath, 'utf-8')
        setCorsHeaders(res)
        res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8' })
        res.end(content)
        return
      }
      if (ext === 'srt') {
        const content = await fs.promises.readFile(subPath, 'utf-8')
        const vtt = convertSrtToVtt(content)
        setCorsHeaders(res)
        res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8' })
        res.end(vtt)
        return
      }
      const bins = await getBinaries()
      if (bins.ffmpegPath) {
        const { stdout } = await execFileAsync(
          bins.ffmpegPath,
          ['-hide_banner', '-loglevel', 'error', '-i', subPath, '-f', 'webvtt', 'pipe:1'],
          { timeout: 15000, maxBuffer: 16 * 1024 * 1024, env: getAugmentedEnv() }
        )
        setCorsHeaders(res)
        res.writeHead(200, { 'Content-Type': 'text/vtt; charset=utf-8' })
        res.end(stdout)
        return
      }
      sendError(res, 415, 'Unsupported subtitle format without FFmpeg')
    } catch {
      sendError(res, 500, 'Failed to load external subtitle')
    }
  }

  const handleArtwork = async (
    res: ServerResponse,
    filePath: string,
    stat: fs.Stats,
    kindHint?: string
  ): Promise<void> => {
    const cacheKey = crypto
      .createHash('sha1')
      .update(`${filePath}:${stat.mtimeMs}:${stat.size}`)
      .digest('hex')
    const cachedThumbPath = path.join(thumbsDir, `${cacheKey}.jpg`)
    const noArtMarker = path.join(thumbsDir, `${cacheKey}.none`)

    try {
      const existing = await fs.promises.readFile(cachedThumbPath)
      setCorsHeaders(res)
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      })
      res.end(existing)
      return
    } catch {
      // not cached yet
    }

    if (fs.existsSync(noArtMarker)) {
      sendError(res, 404, 'No artwork available')
      return
    }

    const bins = await getBinaries()
    if (!bins.ffmpegPath) {
      sendError(res, 404, 'No artwork available')
      return
    }

    try {
      const probe = await probeMediaFile(filePath)
      const isVideo = kindHint ? kindHint === 'video' : probe.kind === 'video'

      if (!isVideo) {
        if (!probe.hasEmbeddedArtwork) {
          await fs.promises.writeFile(noArtMarker, '')
          sendError(res, 404, 'No embedded artwork')
          return
        }
        await execFileAsync(
          bins.ffmpegPath,
          [
            '-hide_banner',
            '-loglevel',
            'error',
            '-y',
            '-i',
            filePath,
            '-an',
            '-vcodec',
            'mjpeg',
            '-frames:v',
            '1',
            '-q:v',
            '3',
            cachedThumbPath
          ],
          { timeout: 10000, env: getAugmentedEnv() }
        )
      } else {
        const seekAt = probe.duration > 6 ? Math.min(probe.duration * 0.15, 30) : Math.max(0, probe.duration * 0.25)
        await execFileAsync(
          bins.ffmpegPath,
          [
            '-hide_banner',
            '-loglevel',
            'error',
            '-y',
            '-ss',
            seekAt.toFixed(2),
            '-i',
            filePath,
            '-frames:v',
            '1',
            '-vf',
            'scale=640:-2',
            '-q:v',
            '3',
            cachedThumbPath
          ],
          { timeout: 15000, env: getAugmentedEnv() }
        )
      }

      const data = await fs.promises.readFile(cachedThumbPath)
      setCorsHeaders(res)
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400'
      })
      res.end(data)
    } catch {
      try {
        await fs.promises.writeFile(noArtMarker, '')
      } catch {
        // ignore
      }
      sendError(res, 404, 'Artwork extraction failed')
    }
  }

  const handleStaticFile = async (res: ServerResponse, filePath: string): Promise<void> => {
    const ext = getExtension(filePath)
    const imageMimes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      avif: 'image/avif'
    }
    const mime = imageMimes[ext] || 'application/octet-stream'
    try {
      const data = await fs.promises.readFile(filePath)
      setCorsHeaders(res)
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' })
      res.end(data)
    } catch {
      sendError(res, 404, 'File not found')
    }
  }

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res)
      res.writeHead(204)
      res.end()
      return
    }

    const reqUrl = new URL(req.url || '/', 'http://127.0.0.1')

    if (reqUrl.pathname === '/health') {
      setCorsHeaders(res)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }

    const reqToken = reqUrl.searchParams.get('token')
    if (reqToken !== token) {
      sendError(res, 403, 'Invalid media token')
      return
    }

    const rawPath = reqUrl.searchParams.get('path')

    if (reqUrl.pathname === '/media/direct') {
      const validated = await validateFilePath(rawPath)
      if (!validated) {
        sendError(res, 404, 'Media file not found')
        return
      }
      await handleDirectRange(req, res, validated.filePath, validated.stat)
      return
    }

    if (reqUrl.pathname === '/media/stream') {
      const validated = await validateFilePath(rawPath)
      if (!validated) {
        sendError(res, 404, 'Media file not found')
        return
      }
      await handleSmartStream(req, res, validated.filePath, reqUrl)
      return
    }

    if (reqUrl.pathname === '/media/subtitle') {
      const validated = await validateFilePath(rawPath)
      const streamIdx = parseInt(reqUrl.searchParams.get('stream') || '-1', 10)
      if (!validated || Number.isNaN(streamIdx) || streamIdx < 0) {
        sendError(res, 400, 'Invalid subtitle parameters')
        return
      }
      await handleEmbeddedSubtitle(res, validated.filePath, streamIdx)
      return
    }

    if (reqUrl.pathname === '/media/ext-subtitle') {
      const validated = await validateFilePath(rawPath)
      if (!validated) {
        sendError(res, 404, 'Subtitle file not found')
        return
      }
      await handleExternalSubtitle(res, validated.filePath)
      return
    }

    if (reqUrl.pathname === '/media/artwork') {
      const validated = await validateFilePath(rawPath)
      if (!validated) {
        sendError(res, 404, 'Media file not found')
        return
      }
      await handleArtwork(res, validated.filePath, validated.stat, reqUrl.searchParams.get('kind') || undefined)
      return
    }

    if (reqUrl.pathname === '/media/file') {
      const validated = await validateFilePath(rawPath)
      if (!validated) {
        sendError(res, 404, 'File not found')
        return
      }
      await handleStaticFile(res, validated.filePath)
      return
    }

    if (reqUrl.pathname === '/media/lrc') {
      const validated = await validateFilePath(rawPath)
      if (!validated) {
        sendError(res, 404, 'Lyrics file not found')
        return
      }
      try {
        const text = await fs.promises.readFile(validated.filePath, 'utf-8')
        setCorsHeaders(res)
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end(text)
      } catch {
        sendError(res, 404, 'Lyrics read error')
      }
      return
    }

    sendError(res, 404, 'Not found')
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })

  const addr = server.address()
  const port = typeof addr === 'object' && addr ? addr.port : 0

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    port,
    token,
    stop: async () => {
      for (const proc of activeProcesses) {
        try {
          proc.kill('SIGKILL')
        } catch {
          // ignore
        }
      }
      activeProcesses.clear()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  }
}
