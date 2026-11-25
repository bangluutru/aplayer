import type { MediaKind, SupportedPlatform } from './types'

export const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'm4v',
  'mkv',
  'webm',
  'mov',
  'avi',
  'flv',
  'wmv',
  'ts',
  'm2ts',
  'mts',
  'mpg',
  'mpeg',
  'ogv',
  '3gp',
  '3g2',
  'vob',
  'asf',
  'rmvb',
  'rm',
  'divx',
  'f4v'
])

export const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'flac',
  'wav',
  'aac',
  'm4a',
  'ogg',
  'oga',
  'opus',
  'alac',
  'wma',
  'aiff',
  'aif',
  'ape',
  'wv',
  'ac3',
  'dts',
  'amr',
  'mka',
  'caf',
  'm4b'
])

export const SUBTITLE_EXTENSIONS = new Set(['srt', 'vtt', 'ass', 'ssa', 'sub'])

export const ALL_MEDIA_EXTENSIONS = new Set([
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS
])

export function getExtension(filePath: string): string {
  const clean = filePath.split('?')[0].split('#')[0]
  const idx = clean.lastIndexOf('.')
  if (idx === -1) return ''
  return clean.slice(idx + 1).toLowerCase()
}

export function getMediaKindFromExt(ext: string): MediaKind | null {
  const normalized = ext.replace(/^\./, '').toLowerCase()
  if (VIDEO_EXTENSIONS.has(normalized)) return 'video'
  if (AUDIO_EXTENSIONS.has(normalized)) return 'audio'
  return null
}

export function isSupportedMediaFile(filePath: string): boolean {
  return getMediaKindFromExt(getExtension(filePath)) !== null
}

export function isSubtitleFile(filePath: string): boolean {
  return SUBTITLE_EXTENSIONS.has(getExtension(filePath))
}

export function detectPlatformFromUrl(rawUrl: string): SupportedPlatform {
  const trimmed = rawUrl.trim()
  if (!trimmed) return 'other'
  let hostname = ''
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    hostname = new URL(withProto).hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '')
  } catch {
    return 'other'
  }

  if (
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be' ||
    hostname === 'music.youtube.com'
  ) {
    return 'youtube'
  }
  if (
    hostname === 'facebook.com' ||
    hostname.endsWith('.facebook.com') ||
    hostname === 'fb.watch' ||
    hostname === 'fb.com'
  ) {
    return 'facebook'
  }
  if (
    hostname === 'x.com' ||
    hostname.endsWith('.x.com') ||
    hostname === 'twitter.com' ||
    hostname.endsWith('.twitter.com') ||
    hostname === 'fxtwitter.com' ||
    hostname === 'vxtwitter.com'
  ) {
    return 'x'
  }
  if (
    hostname === 'tiktok.com' ||
    hostname.endsWith('.tiktok.com') ||
    hostname === 'vm.tiktok.com' ||
    hostname === 'vt.tiktok.com'
  ) {
    return 'tiktok'
  }
  if (
    hostname === 'instagram.com' ||
    hostname.endsWith('.instagram.com') ||
    hostname === 'instagr.am'
  ) {
    return 'instagram'
  }
  if (
    hostname === 'threads.net' ||
    hostname.endsWith('.threads.net') ||
    hostname === 'threads.com' ||
    hostname.endsWith('.threads.com')
  ) {
    return 'threads'
  }
  return 'other'
}

export interface PlatformMeta {
  id: SupportedPlatform
  name: string
  shortName: string
  color: string
  gradient: string
  folderName: string
  oftenNeedsCookies: boolean
}

export const PLATFORM_METADATA: Record<SupportedPlatform, PlatformMeta> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YT',
    color: '#FF3B5C',
    gradient: 'from-rose-500 to-red-600',
    folderName: 'YouTube',
    oftenNeedsCookies: false
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'FB',
    color: '#3B82F6',
    gradient: 'from-blue-500 to-indigo-600',
    folderName: 'Facebook',
    oftenNeedsCookies: true
  },
  x: {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    color: '#E2E8F0',
    gradient: 'from-zinc-400 to-slate-600',
    folderName: 'X',
    oftenNeedsCookies: false
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TT',
    color: '#2DD4BF',
    gradient: 'from-cyan-400 via-teal-400 to-pink-500',
    folderName: 'TikTok',
    oftenNeedsCookies: false
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'IG',
    color: '#F472B6',
    gradient: 'from-amber-400 via-pink-500 to-purple-600',
    folderName: 'Instagram',
    oftenNeedsCookies: true
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    shortName: 'TH',
    color: '#C084FC',
    gradient: 'from-violet-400 to-fuchsia-500',
    folderName: 'Threads',
    oftenNeedsCookies: false
  },
  other: {
    id: 'other',
    name: 'Web Media',
    shortName: 'WEB',
    color: '#38BDF8',
    gradient: 'from-sky-400 to-blue-500',
    folderName: 'Web',
    oftenNeedsCookies: false
  }
}

export function formatDuration(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let val = bytes
  let u = 0
  while (val >= 1024 && u < units.length - 1) {
    val /= 1024
    u++
  }
  return `${val >= 100 ? val.toFixed(0) : val.toFixed(1)} ${units[u]}`
}

export function convertSrtToVtt(srtContent: string): string {
  const normalized = srtContent.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = normalized.trim().split(/\n{2,}/)
  const vttBlocks: string[] = ['WEBVTT\n']

  for (const block of blocks) {
    const lines = block.split('\n').filter((l) => l.trim().length > 0)
    if (lines.length === 0) continue

    let timeLineIdx = 0
    if (/^\d+$/.test(lines[0].trim()) && lines.length > 1) {
      timeLineIdx = 1
    }

    const timeLine = lines[timeLineIdx]
    if (!timeLine || !timeLine.includes('-->')) continue

    const convertedTime = timeLine.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    const cueLines = lines.slice(timeLineIdx + 1)
    vttBlocks.push(`${convertedTime}\n${cueLines.join('\n')}\n`)
  }

  return vttBlocks.join('\n')
}

export function parseLrc(lrcContent: string): Array<{ time: number; text: string }> {
  const lines = lrcContent.replace(/\r\n/g, '\n').split('\n')
  const result: Array<{ time: number; text: string }> = []
  const tagRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g

  for (const rawLine of lines) {
    const matches = [...rawLine.matchAll(tagRegex)]
    if (matches.length === 0) continue
    const text = rawLine.replace(tagRegex, '').trim()
    if (!text) continue
    for (const m of matches) {
      const min = parseInt(m[1], 10)
      const sec = parseInt(m[2], 10)
      const msRaw = m[3] || '0'
      const frac = parseInt(msRaw.padEnd(3, '0').slice(0, 3), 10) / 1000
      result.push({ time: min * 60 + sec + frac, text })
    }
  }

  return result.sort((a, b) => a.time - b.time)
}

export function getMimeTypeForExt(ext: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    m4v: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    flv: 'video/x-flv',
    wmv: 'video/x-ms-wmv',
    ts: 'video/mp2t',
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/opus',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    aiff: 'audio/aiff',
    aif: 'audio/aiff',
    wma: 'audio/x-ms-wma'
  }
  return map[ext.toLowerCase()] || 'application/octet-stream'
}

export function canChromiumDirectPlay(
  ext: string,
  videoCodec?: string,
  audioCodec?: string
): { canDirectPlay: boolean; needsVideoTranscode: boolean; needsAudioTranscode: boolean } {
  const e = ext.toLowerCase()
  const vc = (videoCodec || '').toLowerCase()
  const ac = (audioCodec || '').toLowerCase()

  // Audio-only native formats in Electron/Chromium
  if (AUDIO_EXTENSIONS.has(e)) {
    const nativeAudioContainers = new Set(['mp3', 'flac', 'wav', 'ogg', 'oga', 'opus', 'm4a', 'aac'])
    const nativeAudioCodecs = new Set(['mp3', 'flac', 'pcm_s16le', 'pcm_s24le', 'pcm_f32le', 'pcm_u8', 'vorbis', 'opus', 'aac'])
    if (nativeAudioContainers.has(e) && (!ac || nativeAudioCodecs.has(ac))) {
      return { canDirectPlay: true, needsVideoTranscode: false, needsAudioTranscode: false }
    }
    return { canDirectPlay: false, needsVideoTranscode: false, needsAudioTranscode: true }
  }

  // Video formats
  const mp4NativeVideo = new Set(['h264', 'av1', 'vp9', 'hevc', 'h265'])
  const webmNativeVideo = new Set(['vp8', 'vp9', 'av1'])
  const nativeVideoAudio = new Set(['aac', 'mp3', 'opus', 'flac', 'vorbis', ''])

  if (e === 'mp4' || e === 'm4v') {
    const vOk = !vc || mp4NativeVideo.has(vc)
    const aOk = nativeVideoAudio.has(ac)
    if (vOk && aOk) {
      return { canDirectPlay: true, needsVideoTranscode: false, needsAudioTranscode: false }
    }
    return { canDirectPlay: false, needsVideoTranscode: !vOk, needsAudioTranscode: !aOk }
  }

  if (e === 'webm') {
    const vOk = !vc || webmNativeVideo.has(vc)
    const aOk = !ac || ac === 'opus' || ac === 'vorbis'
    if (vOk && aOk) {
      return { canDirectPlay: true, needsVideoTranscode: false, needsAudioTranscode: false }
    }
    return { canDirectPlay: false, needsVideoTranscode: !vOk, needsAudioTranscode: !aOk }
  }

  // MOV, MKV, AVI, FLV, WMV, TS, VOB, etc. -> FFmpeg smart remux/transcode!
  // If video codec is already H.264, we can stream-copy video (-c:v copy) at near 0% CPU!
  const canCopyVideo = vc === 'h264'
  return {
    canDirectPlay: false,
    needsVideoTranscode: !canCopyVideo && Boolean(vc),
    needsAudioTranscode: ac !== 'aac' && Boolean(ac)
  }
}
