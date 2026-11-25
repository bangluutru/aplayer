import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import {
  canChromiumDirectPlay,
  getExtension,
  getMediaKindFromExt,
  isSubtitleFile
} from '../shared/formats'
import type {
  AudioTrackInfo,
  ChapterInfo,
  MediaProbeResult,
  SubtitleTrackInfo
} from '../shared/types'
import { getAugmentedEnv, getBinaries } from './binaries'

const execFileAsync = promisify(execFile)

interface FfprobeStream {
  index: number
  codec_type?: string
  codec_name?: string
  width?: number
  height?: number
  avg_frame_rate?: string
  r_frame_rate?: string
  channels?: number
  sample_rate?: string
  bits_per_raw_sample?: string
  bits_per_sample?: number
  disposition?: {
    attached_pic?: number
    default?: number
  }
  tags?: Record<string, string>
}

interface FfprobeChapter {
  start_time?: string
  end_time?: string
  tags?: Record<string, string>
}

interface FfprobeOutput {
  streams?: FfprobeStream[]
  format?: {
    format_name?: string
    duration?: string
    size?: string
    bit_rate?: string
    tags?: Record<string, string>
  }
  chapters?: FfprobeChapter[]
}

const TEXT_SUBTITLE_CODECS = new Set([
  'subrip',
  'srt',
  'ass',
  'ssa',
  'webvtt',
  'mov_text',
  'text',
  'ttml',
  'sami'
])

function pickTag(tags: Record<string, string> | undefined, keys: string[]): string | undefined {
  if (!tags) return undefined
  const lowerMap = new Map<string, string>()
  for (const [k, v] of Object.entries(tags)) {
    lowerMap.set(k.toLowerCase(), v)
  }
  for (const key of keys) {
    const val = lowerMap.get(key.toLowerCase())
    if (val && val.trim()) return val.trim()
  }
  return undefined
}

function parseFrameRate(raw?: string): number | undefined {
  if (!raw || raw === '0/0') return undefined
  const parts = raw.split('/')
  if (parts.length === 2) {
    const num = Number(parts[0])
    const den = Number(parts[1])
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) {
      return Math.round((num / den) * 100) / 100
    }
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : undefined
}

function findSidecarFiles(filePath: string): {
  subtitles: SubtitleTrackInfo[]
  lrcPath?: string
} {
  const dir = path.dirname(filePath)
  const baseName = path.basename(filePath, path.extname(filePath))
  const baseLower = baseName.toLowerCase()
  const subtitles: SubtitleTrackInfo[] = []
  let lrcPath: string | undefined

  try {
    const entries = fs.readdirSync(dir)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      const ext = getExtension(entry)
      const entryBase = entry.slice(0, entry.length - (ext ? ext.length + 1 : 0))
      const entryLower = entryBase.toLowerCase()

      if (ext === 'lrc' && entryLower === baseLower) {
        lrcPath = fullPath
        continue
      }

      if (
        isSubtitleFile(entry) &&
        (entryLower === baseLower || entryLower.startsWith(`${baseLower}.`) || entryLower.startsWith(`${baseLower}_`))
      ) {
        const suffix = entryBase.slice(baseName.length).replace(/^[._\-\s]+/, '')
        subtitles.push({
          externalPath: fullPath,
          codec: ext,
          language: suffix || undefined,
          title: suffix ? `${suffix.toUpperCase()} (${ext.toUpperCase()})` : `External (${ext.toUpperCase()})`,
          isExternal: true
        })
      }
    }
  } catch {
    // directory unreadable; ignore sidecars
  }

  return { subtitles, lrcPath }
}

const probeCache = new Map<string, { mtimeMs: number; result: MediaProbeResult }>()

export async function probeMediaFile(filePath: string): Promise<MediaProbeResult> {
  const stat = await fs.promises.stat(filePath)
  const cached = probeCache.get(filePath)
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return cached.result
  }

  const fileName = path.basename(filePath)
  const ext = getExtension(filePath)
  const fallbackKind = getMediaKindFromExt(ext) || 'video'
  const fallbackTitle = path.basename(filePath, path.extname(filePath))
  const sidecars = findSidecarFiles(filePath)

  const bins = await getBinaries()
  let parsed: FfprobeOutput | null = null

  if (bins.ffprobePath) {
    try {
      const { stdout } = await execFileAsync(
        bins.ffprobePath,
        [
          '-v',
          'quiet',
          '-print_format',
          'json',
          '-show_format',
          '-show_streams',
          '-show_chapters',
          filePath
        ],
        {
          timeout: 15000,
          maxBuffer: 8 * 1024 * 1024,
          env: getAugmentedEnv()
        }
      )
      parsed = JSON.parse(stdout) as FfprobeOutput
    } catch {
      parsed = null
    }
  }

  const streams = parsed?.streams || []
  const format = parsed?.format

  const hasEmbeddedArtwork = streams.some(
    (s) => s.codec_type === 'video' && s.disposition?.attached_pic === 1
  )

  const videoStream = streams.find(
    (s) =>
      s.codec_type === 'video' &&
      s.disposition?.attached_pic !== 1 &&
      s.codec_name !== 'mjpeg' &&
      s.codec_name !== 'png'
  ) || (fallbackKind === 'video'
    ? streams.find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1)
    : undefined)

  const audioStreams = streams.filter((s) => s.codec_type === 'audio')
  const subtitleStreams = streams.filter((s) => s.codec_type === 'subtitle')

  const kind = videoStream ? 'video' : audioStreams.length > 0 ? 'audio' : fallbackKind

  const audioTracks: AudioTrackInfo[] = audioStreams.map((s, idx) => ({
    streamIndex: s.index,
    audioIndex: idx,
    codec: s.codec_name || 'unknown',
    channels: s.channels || 2,
    sampleRate: s.sample_rate ? Number(s.sample_rate) : undefined,
    language: pickTag(s.tags, ['language', 'lang']),
    title:
      pickTag(s.tags, ['title', 'handler_name']) ||
      `Track ${idx + 1}${s.tags?.language ? ` (${s.tags.language.toUpperCase()})` : ''}`
  }))

  const embeddedSubs: SubtitleTrackInfo[] = subtitleStreams
    .filter((s) => !s.codec_name || TEXT_SUBTITLE_CODECS.has(s.codec_name.toLowerCase()))
    .map((s, idx) => {
      const lang = pickTag(s.tags, ['language', 'lang'])
      const title =
        pickTag(s.tags, ['title']) ||
        (lang ? `Subtitle ${idx + 1} (${lang.toUpperCase()})` : `Subtitle ${idx + 1}`)
      return {
        streamIndex: s.index,
        codec: s.codec_name,
        language: lang,
        title,
        isExternal: false
      }
    })

  const chapters: ChapterInfo[] = (parsed?.chapters || []).map((c, idx) => ({
    title: pickTag(c.tags, ['title']) || `Chapter ${idx + 1}`,
    startTime: Number(c.start_time || 0),
    endTime: Number(c.end_time || 0)
  }))

  const primaryAudio = audioStreams[0]
  const tags = { ...(primaryAudio?.tags || {}), ...(format?.tags || {}) }
  const duration = Number(format?.duration || 0)
  const bitrate = format?.bit_rate ? Number(format.bit_rate) : undefined
  const bitDepth = primaryAudio?.bits_per_raw_sample
    ? Number(primaryAudio.bits_per_raw_sample)
    : primaryAudio?.bits_per_sample && primaryAudio.bits_per_sample > 0
      ? primaryAudio.bits_per_sample
      : undefined

  const compat = canChromiumDirectPlay(ext, videoStream?.codec_name, primaryAudio?.codec_name)

  const result: MediaProbeResult = {
    filePath,
    fileName,
    ext,
    kind,
    sizeBytes: stat.size,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    bitrate: bitrate && Number.isFinite(bitrate) ? bitrate : undefined,
    containerFormat: format?.format_name || ext,
    videoCodec: videoStream?.codec_name,
    audioCodec: primaryAudio?.codec_name,
    width: videoStream?.width,
    height: videoStream?.height,
    fps: parseFrameRate(videoStream?.avg_frame_rate || videoStream?.r_frame_rate),
    sampleRate: primaryAudio?.sample_rate ? Number(primaryAudio.sample_rate) : undefined,
    bitDepth,
    channels: primaryAudio?.channels,
    title: pickTag(tags, ['title']) || fallbackTitle,
    artist: pickTag(tags, ['artist', 'album_artist', 'composer', 'author']) || (kind === 'video' ? 'Local Video' : 'Unknown Artist'),
    album: pickTag(tags, ['album']) || '',
    year: pickTag(tags, ['date', 'year', 'creation_time'])?.slice(0, 4),
    genre: pickTag(tags, ['genre']),
    hasEmbeddedArtwork,
    canDirectPlay: compat.canDirectPlay,
    needsVideoTranscode: compat.needsVideoTranscode,
    needsAudioTranscode: compat.needsAudioTranscode,
    audioTracks,
    subtitleTracks: [...embeddedSubs, ...sidecars.subtitles],
    chapters,
    lrcPath: sidecars.lrcPath
  }

  probeCache.set(filePath, { mtimeMs: stat.mtimeMs, result })
  return result
}

export function clearProbeCache(filePath?: string): void {
  if (filePath) {
    probeCache.delete(filePath)
  } else {
    probeCache.clear()
  }
}
