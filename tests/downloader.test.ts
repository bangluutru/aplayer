import { describe, expect, it } from 'vitest'
import {
  buildVideoFormatSelector,
  buildYtDlpArgs,
  getHelpfulErrorHint,
  parseYtDlpProgressLine,
  resolveDownloadDirectory
} from '../src/main/downloader'
import { parseThreadsHtmlPayload } from '../src/main/threadsExtractor'

describe('Downloader argument builder & folder routing', () => {
  it('routes downloads into platform subfolders when enabled, or flat when disabled', () => {
    expect(resolveDownloadDirectory('/Users/demo/Movies', 'youtube', true)).toBe(
      '/Users/demo/Movies/YouTube'
    )
    expect(resolveDownloadDirectory('/Users/demo/Movies', 'threads', true)).toBe(
      '/Users/demo/Movies/Threads'
    )
    expect(resolveDownloadDirectory('/Users/demo/Music', 'tiktok', false)).toBe(
      '/Users/demo/Music'
    )
  })

  it('builds correct yt-dlp args for 1080p MP4 video and FLAC audio with cookies', () => {
    const videoArgs = buildYtDlpArgs(
      {
        url: 'https://www.youtube.com/watch?v=test123',
        mode: 'video',
        videoQuality: '1080',
        videoContainer: 'mp4',
        audioFormat: 'mp3',
        outputDir: '/tmp/videos',
        organizeByPlatform: true,
        embedSubtitles: true,
        embedThumbnail: true,
        cookieBrowser: 'chrome'
      },
      '/tmp/videos/YouTube',
      '/opt/homebrew/bin',
      '/opt/homebrew/bin/deno'
    )
    expect(videoArgs).toContain('--cookies-from-browser')
    expect(videoArgs).toContain('chrome')
    expect(videoArgs).toContain('--merge-output-format')
    expect(videoArgs).toContain('mp4')
    expect(videoArgs).toContain('--embed-subs')
    expect(videoArgs).toContain('--ffmpeg-location')
    expect(buildVideoFormatSelector('1080')).toContain('height<=1080')

    const audioArgs = buildYtDlpArgs(
      {
        url: 'https://www.tiktok.com/@demo/video/12345',
        mode: 'audio',
        videoQuality: 'best',
        videoContainer: 'mp4',
        audioFormat: 'flac',
        outputDir: '/tmp/audio',
        organizeByPlatform: false,
        embedSubtitles: false,
        embedThumbnail: true,
        cookieBrowser: 'none'
      },
      '/tmp/audio',
      '/opt/homebrew/bin',
      null
    )
    expect(audioArgs).toContain('-x')
    expect(audioArgs).toContain('--audio-format')
    expect(audioArgs).toContain('flac')
    expect(audioArgs).toContain('--embed-thumbnail')
    expect(audioArgs).not.toContain('--cookies-from-browser')
  })

  it('parses APLAYER_PROGRESS and standard yt-dlp progress lines', () => {
    const custom = parseYtDlpProgressLine('APLAYER_PROGRESS| 47.3%| 8.42MiB/s|00:12|124.50MiB')
    expect(custom).toEqual({
      progress: 47.3,
      speed: '8.42MiB/s',
      eta: '00:12',
      totalSize: '124.50MiB'
    })

    const std = parseYtDlpProgressLine('[download]  82.5% of   54.10MiB at    5.20MiB/s ETA 00:02')
    expect(std?.progress).toBe(82.5)
    expect(std?.speed).toBe('5.20MiB/s')
    expect(std?.eta).toBe('00:02')

    const unknownFields = parseYtDlpProgressLine('APLAYER_PROGRESS|  0.3%| Unknown B/s|Unknown|       N/A')
    expect(unknownFields).toEqual({
      progress: 0.3,
      speed: undefined,
      eta: undefined,
      totalSize: undefined
    })
  })

  it('provides actionable cookie guidance for login-gated platforms', () => {
    const hint = getHelpfulErrorHint('instagram', 'ERROR: Instagram sent an empty media response. Login required.')
    expect(hint).toContain('Cookie')
  })
})

describe('Native Threads Extractor HTML & JSON hydration parser', () => {
  it('extracts highest-resolution video_versions from Threads JSON hydration payload', () => {
    const mockHtml = `
      <html>
        <head>
          <meta property="og:image" content="https://cdn.example.com/thumb.jpg" />
          <meta property="og:title" content="Fallback OG title" />
        </head>
        <body>
          <script type="application/json">
            {
              "post": {
                "user": { "username": "creative_lab" },
                "caption": { "text": "Awesome Threads glass motion clip" },
                "video_versions": [
                  { "width": 480, "height": 854, "url": "https://cdn.example.com/low.mp4?a=1&amp;b=2" },
                  { "width": 1080, "height": 1920, "url": "https://cdn.example.com/hd.mp4?a=1&amp;b=2" }
                ]
              }
            }
          </script>
        </body>
      </html>
    `
    const parsed = parseThreadsHtmlPayload('https://www.threads.net/@creative_lab/post/C9XYZ', mockHtml)
    expect(parsed.directVideoUrl).toBe('https://cdn.example.com/hd.mp4?a=1&b=2')
    expect(parsed.title).toBe('Awesome Threads glass motion clip')
    expect(parsed.uploader).toBe('@creative_lab')
    expect(parsed.thumbnail).toBe('https://cdn.example.com/thumb.jpg')
  })

  it('falls back to og:video when no JSON hydration block is present', () => {
    const html = `
      <html><head>
        <meta property="og:video:secure_url" content="https://video.cdn.example/reel.mp4?sig=abc&amp;v=1" />
        <meta property="og:description" content="Short video on Threads" />
      </head></html>
    `
    const parsed = parseThreadsHtmlPayload('https://www.threads.com/@demo/post/123', html)
    expect(parsed.directVideoUrl).toBe('https://video.cdn.example/reel.mp4?sig=abc&v=1')
    expect(parsed.uploader).toBe('@demo')
  })
})
