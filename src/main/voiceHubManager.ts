import { spawn, type ChildProcess } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import type {
  VoiceHubCatalog,
  VoiceHubHealth,
  VoiceHubJob,
  VoiceHubRecipeResult,
  VoiceHubSettings,
  VoiceHubSynthesizeRequest,
  VoiceHubTokenInfo
} from '../shared/types'

const ALLOWED_REF_EXTS = new Set(['.wav', '.mp3', '.m4a', '.flac', '.ogg', '.aac', '.aiff', '.opus'])
const MAX_REF_BYTES = 25 * 1024 * 1024

export function normalizeHubBaseUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  let candidate = trimmed
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)
  const looksLikeHostPort = /^[a-zA-Z0-9.-]+:\d+(\/.*)?$/.test(candidate)
  if (!hasScheme || looksLikeHostPort) {
    candidate = `http://${candidate}`
  }
  const parsed = new URL(candidate)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Chi ho tro giao thuc http:// hoac https:// cho Voice Hub LAN.')
  }
  return `${parsed.protocol}//${parsed.host}`
}

export function sanitizeAudioFilename(raw: string): string {
  const cleaned = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72)
  return cleaned || 'voice_studio'
}

function discoverVoiceSelectorDir(): string | null {
  const home = os.homedir()
  const candidates = [
    process.env.APLAYER_VOICE_HUB_DIR,
    path.resolve(__dirname, '../../../voice-selector'),
    path.join(home, '.gemini', 'antigravity-ide', 'scratch', 'xtools', 'voice-selector'),
    path.join(home, 'xtools', 'voice-selector')
  ].filter(Boolean) as string[]

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'backend', 'app.py'))) {
      return dir
    }
  }
  return null
}

function discoverAiwfRoot(): string | null {
  const home = os.homedir()
  const candidates = [
    process.env.AIWF_ROOT,
    path.join(home, '.gemini', 'antigravity-ide', 'scratch', 'chibo-os', 'ai-workforce'),
    path.join(home, 'chibo-os', 'ai-workforce')
  ].filter(Boolean) as string[]

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, '.agents', 'skills', '_shared', 'media', 'tts.py'))) {
      return dir
    }
  }
  return null
}

function discoverHubPython(voiceSelectorDir: string, aiwfRoot: string | null): string | null {
  const candidates = [
    aiwfRoot ? path.join(aiwfRoot, '.venv-tts', 'bin', 'python3') : null,
    path.join(voiceSelectorDir, '.venv', 'bin', 'python'),
    path.join(voiceSelectorDir, '.venv', 'bin', 'python3')
  ].filter(Boolean) as string[]

  for (const py of candidates) {
    if (fs.existsSync(py)) return py
  }
  return null
}

export class VoiceHubManager {
  private child: ChildProcess | null = null
  private startingPromise: Promise<void> | null = null
  private previewCacheDir: string
  private lastSpawnError = ''

  constructor(cacheRootDir: string) {
    this.previewCacheDir = path.join(cacheRootDir, 'voice-previews')
    fs.mkdirSync(this.previewCacheDir, { recursive: true })
  }

  private getEffectiveBaseUrl(settings: VoiceHubSettings): string {
    if (settings.mode === 'remote') {
      const normalized = normalizeHubBaseUrl(settings.remoteUrl)
      if (!normalized) {
        throw new Error('Chua nhap dia chi Remote LAN Server (vi du: http://imac-m4.local:8765).')
      }
      return normalized
    }
    const port = Number.isFinite(settings.localPort) && settings.localPort > 1024 ? settings.localPort : 8765
    return `http://127.0.0.1:${port}`
  }

  private buildHeaders(settings: VoiceHubSettings, hasJsonBody = false): Record<string, string> {
    const headers: Record<string, string> = {}
    if (hasJsonBody) {
      headers['Content-Type'] = 'application/json'
    }
    if (settings.mode === 'remote' && settings.remoteToken?.trim()) {
      headers['X-Voice-Hub-Token'] = settings.remoteToken.trim()
    }
    return headers
  }

  private async isAlive(baseUrl: string, settings: VoiceHubSettings, timeoutMs = 2200): Promise<boolean> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(`${baseUrl}/api/hub/health`, {
        headers: this.buildHeaders(settings),
        signal: ctrl.signal
      })
      return res.ok
    } catch {
      return false
    } finally {
      clearTimeout(timer)
    }
  }

  async ensureLocalRunning(settings: VoiceHubSettings): Promise<void> {
    if (settings.mode !== 'local') return
    const baseUrl = this.getEffectiveBaseUrl(settings)
    if (await this.isAlive(baseUrl, settings, 1200)) {
      return
    }
    if (this.startingPromise) {
      return this.startingPromise
    }

    this.startingPromise = (async () => {
      const vsDir = discoverVoiceSelectorDir()
      if (!vsDir) {
        throw new Error('Khong tim thay ma nguon voice-selector tren may nay.')
      }
      const aiwfRoot = discoverAiwfRoot()
      const py = discoverHubPython(vsDir, aiwfRoot)
      if (!py) {
        throw new Error('Khong tim thay Python (.venv-tts) cho Voice Hub. Hay cai AI Workforce TTS truoc.')
      }

      const port = Number.isFinite(settings.localPort) && settings.localPort > 1024 ? settings.localPort : 8765
      this.lastSpawnError = ''
      const proc = spawn(
        py,
        ['-m', 'uvicorn', 'backend.app:app', '--host', '127.0.0.1', '--port', String(port)],
        {
          cwd: vsDir,
          env: {
            ...process.env,
            ...(aiwfRoot ? { AIWF_ROOT: aiwfRoot } : {}),
            PYTHONUNBUFFERED: '1'
          },
          stdio: ['ignore', 'pipe', 'pipe']
        }
      )

      this.child = proc
      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8').trim()
        if (text) this.lastSpawnError = text.slice(-300)
      })
      proc.on('exit', () => {
        if (this.child === proc) {
          this.child = null
        }
      })

      const deadline = Date.now() + 12000
      while (Date.now() < deadline) {
        if (await this.isAlive(baseUrl, settings, 1200)) {
          return
        }
        if (this.child !== proc) {
          throw new Error(`Voice Hub dung som: ${this.lastSpawnError || 'kiem tra Python/uvicorn'}`)
        }
        await new Promise((r) => setTimeout(r, 350))
      }
      throw new Error('Khoi dong local Voice Hub qua thoi gian cho (12s).')
    })()

    try {
      await this.startingPromise
    } finally {
      this.startingPromise = null
    }
  }

  private async requestJson<T>(
    settings: VoiceHubSettings,
    endpoint: string,
    init?: { method?: string; body?: unknown; timeoutMs?: number; skipAutoStart?: boolean }
  ): Promise<T> {
    if (settings.mode === 'local' && !init?.skipAutoStart) {
      await this.ensureLocalRunning(settings)
    }
    const baseUrl = this.getEffectiveBaseUrl(settings)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), init?.timeoutMs ?? 15000)
    try {
      const hasBody = init?.body !== undefined
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: init?.method || (hasBody ? 'POST' : 'GET'),
        headers: this.buildHeaders(settings, hasBody),
        body: hasBody ? JSON.stringify(init?.body) : undefined,
        signal: ctrl.signal
      })
      const rawText = await res.text()
      let data: Record<string, unknown> = {}
      try {
        data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {}
      } catch {
        data = { detail: rawText.slice(0, 220) }
      }
      if (!res.ok) {
        const msg =
          typeof data.detail === 'string'
            ? data.detail
            : `Voice Hub tra ve loi HTTP ${res.status}`
        throw new Error(msg)
      }
      return data as unknown as T
    } finally {
      clearTimeout(timer)
    }
  }

  async getHealth(settings: VoiceHubSettings, skipAutoStart = false): Promise<VoiceHubHealth> {
    try {
      const baseUrl = this.getEffectiveBaseUrl(settings)
      const data = await this.requestJson<VoiceHubHealth>(settings, '/api/hub/health', {
        timeoutMs: 8000,
        skipAutoStart
      })
      return {
        ...data,
        mode: settings.mode,
        baseUrl
      }
    } catch (err) {
      return {
        ready: false,
        mode: settings.mode,
        baseUrl: settings.mode === 'remote' ? settings.remoteUrl : `http://127.0.0.1:${settings.localPort}`,
        voice_bank_count: 0,
        engines: [],
        gemini_default_enabled: false,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  async getCatalog(settings: VoiceHubSettings): Promise<VoiceHubCatalog> {
    return this.requestJson<VoiceHubCatalog>(settings, '/api/hub/catalog', { timeoutMs: 12000 })
  }

  async getLocalTokenInfo(settings: VoiceHubSettings): Promise<VoiceHubTokenInfo> {
    const localSettings: VoiceHubSettings = { ...settings, mode: 'local' }
    await this.ensureLocalRunning(localSettings)
    return this.requestJson<VoiceHubTokenInfo>(localSettings, '/api/hub/token', { timeoutMs: 5000 })
  }

  async getPreviewFilePath(
    settings: VoiceHubSettings,
    voiceId: string,
    lang?: string,
    engine?: string
  ): Promise<{ filePath: string; source: string }> {
    if (settings.mode === 'local') {
      await this.ensureLocalRunning(settings)
    }
    const baseUrl = this.getEffectiveBaseUrl(settings)
    const cacheKey = crypto
      .createHash('sha1')
      .update(`${baseUrl}|${voiceId}|${lang || ''}|${engine || ''}`)
      .digest('hex')
      .slice(0, 20)
    const targetPath = path.join(this.previewCacheDir, `prev_${cacheKey}.wav`)

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 256) {
      return { filePath: targetPath, source: 'aplayer_local_cache' }
    }

    const qs = new URLSearchParams()
    if (lang) qs.set('lang', lang)
    if (engine) qs.set('engine', engine)
    const url = `${baseUrl}/api/hub/preview/${encodeURIComponent(voiceId)}${qs.toString() ? `?${qs.toString()}` : ''}`

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 90000)
    try {
      const res = await fetch(url, {
        headers: this.buildHeaders(settings),
        signal: ctrl.signal
      })
      if (!res.ok) {
        let detail = `Khong tai duoc mau nghe (HTTP ${res.status})`
        try {
          const j = (await res.json()) as { detail?: string }
          if (j.detail) detail = j.detail
        } catch {
          // ignore
        }
        throw new Error(detail)
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const tmp = `${targetPath}.tmp`
      await fs.promises.writeFile(tmp, buf)
      await fs.promises.rename(tmp, targetPath)
      return { filePath: targetPath, source: res.headers.get('x-preview-source') || 'hub' }
    } finally {
      clearTimeout(timer)
    }
  }

  async startSynthesize(
    settings: VoiceHubSettings,
    req: VoiceHubSynthesizeRequest
  ): Promise<VoiceHubJob> {
    const payload: Record<string, unknown> = { ...req }

    // Khi gui sang iMac M4 qua mang LAN ma co file giong mau cuc bo → doc & encode base64 an toan
    if (settings.mode === 'remote' && req.ref_audio_path) {
      const resolved = path.resolve(req.ref_audio_path)
      const ext = path.extname(resolved).toLowerCase()
      if (!ALLOWED_REF_EXTS.has(ext)) {
        throw new Error(`Dinh dang file giong mau khong ho tro: ${ext}`)
      }
      const stat = await fs.promises.stat(resolved)
      if (!stat.isFile() || stat.size > MAX_REF_BYTES) {
        throw new Error('File giong mau khong hop le hoac vuot qua 25 MB.')
      }
      const raw = await fs.promises.readFile(resolved)
      payload.ref_audio_base64 = raw.toString('base64')
      payload.ref_audio_filename = path.basename(resolved)
      payload.ref_audio_path = null
    }

    return this.requestJson<VoiceHubJob>(settings, '/api/hub/synthesize', {
      method: 'POST',
      body: payload,
      timeoutMs: 25000
    })
  }

  async getJob(settings: VoiceHubSettings, jobId: string): Promise<VoiceHubJob> {
    return this.requestJson<VoiceHubJob>(settings, `/api/hub/jobs/${encodeURIComponent(jobId)}`, {
      timeoutMs: 10000
    })
  }

  async cancelJob(settings: VoiceHubSettings, jobId: string): Promise<{ state: string }> {
    return this.requestJson<{ state: string }>(
      settings,
      `/api/hub/jobs/${encodeURIComponent(jobId)}`,
      { method: 'DELETE', timeoutMs: 8000 }
    )
  }

  async getHistory(settings: VoiceHubSettings): Promise<VoiceHubJob[]> {
    return this.requestJson<VoiceHubJob[]>(settings, '/api/hub/history', { timeoutMs: 8000 })
  }

  async buildRecipe(
    settings: VoiceHubSettings,
    req: VoiceHubSynthesizeRequest
  ): Promise<VoiceHubRecipeResult> {
    return this.requestJson<VoiceHubRecipeResult>(settings, '/api/hub/recipe', {
      method: 'POST',
      body: req,
      timeoutMs: 6000
    })
  }

  async saveHubAudioToLocalDir(
    settings: VoiceHubSettings,
    audioUrlPath: string,
    suggestedBaseName: string,
    fallbackDir: string
  ): Promise<string> {
    if (settings.mode === 'local') {
      await this.ensureLocalRunning(settings)
    }
    const baseUrl = this.getEffectiveBaseUrl(settings)
    const cleanUrl = audioUrlPath.startsWith('http') ? audioUrlPath : `${baseUrl}${audioUrlPath}`
    const res = await fetch(cleanUrl, { headers: this.buildHeaders(settings) })
    if (!res.ok) {
      throw new Error(`Khong tai duoc file audio tu Voice Hub (HTTP ${res.status}).`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const outDir = settings.outputDir?.trim() || path.join(fallbackDir, 'VoiceStudio')
    await fs.promises.mkdir(outDir, { recursive: true })

    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    const fileName = `${sanitizeAudioFilename(suggestedBaseName)}_${stamp}.wav`
    const fullPath = path.join(outDir, fileName)
    const tmpPath = `${fullPath}.tmp`
    await fs.promises.writeFile(tmpPath, buf)
    await fs.promises.rename(tmpPath, fullPath)
    return fullPath
  }

  getExternalVoxaUrl(settings: VoiceHubSettings, openGemini = false): string {
    const base =
      settings.mode === 'remote' && settings.remoteUrl.trim()
        ? normalizeHubBaseUrl(settings.remoteUrl)
        : `http://127.0.0.1:${settings.localPort || 8765}`
    return openGemini ? `${base}/?engine=gemini` : `${base}/`
  }

  dispose(): void {
    if (this.child && !this.child.killed) {
      try {
        this.child.kill('SIGTERM')
      } catch {
        // ignore
      }
      this.child = null
    }
  }
}
