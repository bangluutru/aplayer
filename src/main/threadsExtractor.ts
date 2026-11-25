import type { AnalyzedMediaInfo } from '../shared/types'

export interface ThreadsExtractedMedia {
  url: string
  title: string
  uploader: string
  thumbnail?: string
  directVideoUrl?: string
  duration: number
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
}

function extractMetaContent(html: string, property: string): string | undefined {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i')
  const match = re1.exec(html) || re2.exec(html)
  return match?.[1] ? decodeHtmlEntities(match[1]) : undefined
}

interface CandidateVideo {
  url: string
  width?: number
  height?: number
}

function findVideoVersionsInObject(node: unknown, out: CandidateVideo[], meta: { caption?: string; username?: string; thumb?: string }): void {
  if (!node || typeof node !== 'object') return

  if (Array.isArray(node)) {
    for (const item of node) {
      findVideoVersionsInObject(item, out, meta)
    }
    return
  }

  const obj = node as Record<string, unknown>

  if (typeof obj.username === 'string' && !meta.username) {
    meta.username = obj.username
  }

  if (obj.caption && typeof obj.caption === 'object') {
    const cap = obj.caption as Record<string, unknown>
    if (typeof cap.text === 'string' && cap.text.trim() && !meta.caption) {
      meta.caption = cap.text.trim()
    }
  }

  if (Array.isArray(obj.video_versions)) {
    for (const v of obj.video_versions) {
      if (v && typeof v === 'object') {
        const vo = v as Record<string, unknown>
        if (typeof vo.url === 'string' && /^https?:\/\//i.test(vo.url)) {
          out.push({
            url: decodeHtmlEntities(vo.url),
            width: typeof vo.width === 'number' ? vo.width : undefined,
            height: typeof vo.height === 'number' ? vo.height : undefined
          })
        }
      }
    }
  }

  if (obj.image_versions2 && typeof obj.image_versions2 === 'object' && !meta.thumb) {
    const imgObj = obj.image_versions2 as Record<string, unknown>
    if (Array.isArray(imgObj.candidates) && imgObj.candidates.length > 0) {
      const first = imgObj.candidates[0] as Record<string, unknown>
      if (typeof first?.url === 'string') {
        meta.thumb = decodeHtmlEntities(first.url)
      }
    }
  }

  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object') {
      findVideoVersionsInObject(val, out, meta)
    }
  }
}

export function parseThreadsHtmlPayload(postUrl: string, html: string): ThreadsExtractedMedia {
  const ogVideo =
    extractMetaContent(html, 'og:video:secure_url') || extractMetaContent(html, 'og:video')
  const ogImage = extractMetaContent(html, 'og:image')
  const ogTitle = extractMetaContent(html, 'og:title')
  const ogDesc = extractMetaContent(html, 'og:description')

  const candidates: CandidateVideo[] = []
  const jsonMeta: { caption?: string; username?: string; thumb?: string } = {}

  const scriptRegex = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = scriptRegex.exec(html)) !== null) {
    const payload = match[1]
    if (!payload.includes('video_versions') && !payload.includes('video_url')) continue
    try {
      const parsed = JSON.parse(payload)
      findVideoVersionsInObject(parsed, candidates, jsonMeta)
    } catch {
      // ignore malformed script JSON
    }
  }

  // Fallback regex scan for escaped CDN mp4 URLs in inline hydration bundles
  if (candidates.length === 0) {
    const rawMp4Regex = /"url"\s*:\s*"(https?:\\?\/\\?\/[^"]+?\.mp4[^"]*)"/gi
    let m: RegExpExecArray | null
    while ((m = rawMp4Regex.exec(html)) !== null) {
      const decoded = decodeHtmlEntities(m[1])
      if (decoded.startsWith('http')) {
        candidates.push({ url: decoded })
      }
    }
  }

  candidates.sort((a, b) => (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0))
  const directVideoUrl = candidates[0]?.url || ogVideo

  const urlUserMatch = /\/@([^/?#]+)/i.exec(postUrl)
  const uploader = jsonMeta.username || urlUserMatch?.[1] || 'Threads'
  const rawTitle = jsonMeta.caption || ogDesc || ogTitle || `Threads post by @${uploader}`
  const title = rawTitle.replace(/\s+/g, ' ').trim().slice(0, 140)

  return {
    url: postUrl,
    title,
    uploader: uploader.startsWith('@') ? uploader : `@${uploader}`,
    thumbnail: jsonMeta.thumb || ogImage,
    directVideoUrl,
    duration: 0
  }
}

export type OffscreenHtmlFetcher = (targetUrl: string) => Promise<{
  html: string
  videoSrc?: string
  title?: string
  poster?: string
} | null>

export async function extractThreadsMedia(
  rawUrl: string,
  offscreenFetcher?: OffscreenHtmlFetcher
): Promise<AnalyzedMediaInfo> {
  const normalizedUrl = rawUrl.trim().replace(/^http:\/\//i, 'https://')
  const embedCandidate = normalizedUrl.replace(/\/?(\?.*)?$/, '/embed')

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Sec-Fetch-Mode': 'navigate'
  }

  let extracted: ThreadsExtractedMedia | null = null

  // Attempt 1: Direct HTML fetch of post URL and embed endpoint
  for (const candidateUrl of [normalizedUrl, embedCandidate]) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000)
      const resp = await fetch(candidateUrl, {
        headers,
        redirect: 'follow',
        signal: controller.signal
      })
      clearTimeout(timer)
      if (!resp.ok) continue
      const html = await resp.text()
      const parsed = parseThreadsHtmlPayload(normalizedUrl, html)
      if (parsed.directVideoUrl) {
        extracted = parsed
        break
      }
      if (!extracted) {
        extracted = parsed
      }
    } catch {
      // try next strategy
    }
  }

  // Attempt 2: Hidden Electron offscreen renderer for client-hydrated Threads posts
  if ((!extracted || !extracted.directVideoUrl) && offscreenFetcher) {
    try {
      const rendered = await offscreenFetcher(normalizedUrl)
      if (rendered) {
        const parsed = parseThreadsHtmlPayload(normalizedUrl, rendered.html)
        const finalVideoUrl = rendered.videoSrc || parsed.directVideoUrl
        extracted = {
          url: normalizedUrl,
          title: rendered.title || parsed.title,
          uploader: parsed.uploader,
          thumbnail: rendered.poster || parsed.thumbnail,
          directVideoUrl: finalVideoUrl,
          duration: 0
        }
      }
    } catch {
      // ignore offscreen errors
    }
  }

  if (!extracted || !extracted.directVideoUrl) {
    throw new Error(
      'Không tìm thấy video trực tiếp trong bài đăng Threads này (bài đăng có thể chỉ có ảnh, riêng tư hoặc cần đăng nhập).'
    )
  }

  return {
    url: normalizedUrl,
    platform: 'threads',
    title: extracted.title,
    uploader: extracted.uploader,
    duration: extracted.duration,
    thumbnail: extracted.thumbnail,
    isPlaylist: false,
    extractorEngine: 'threads-native',
    directVideoUrl: extracted.directVideoUrl,
    formats: [
      {
        id: 'threads-mp4',
        label: 'Original MP4 (Threads HD)',
        ext: 'mp4',
        resolution: 'HD',
        isAudioOnly: false
      },
      {
        id: 'threads-audio',
        label: 'Extracted Audio (MP3 / FLAC / M4A)',
        ext: 'mp3',
        isAudioOnly: true
      }
    ]
  }
}
