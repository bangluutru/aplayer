import { describe, expect, it } from 'vitest'
import {
  canChromiumDirectPlay,
  convertSrtToVtt,
  detectPlatformFromUrl,
  formatDuration,
  formatFileSize,
  getMediaKindFromExt,
  isSupportedMediaFile,
  parseLrc
} from '../src/shared/formats'

describe('Media format detection & compatibility', () => {
  it('recognizes all major video and audio extensions', () => {
    const videos = ['movie.mp4', 'film.mkv', 'clip.mov', 'old.avi', 'web.webm', 'stream.flv', 'win.wmv', 'tv.ts']
    for (const v of videos) {
      expect(isSupportedMediaFile(v)).toBe(true)
      expect(getMediaKindFromExt(v.split('.').pop()!)).toBe('video')
    }

    const audios = ['song.mp3', 'hires.flac', 'pcm.wav', 'apple.m4a', 'lossless.alac', 'vorbis.ogg', 'voice.opus', 'win.wma', 'studio.aiff', 'monkey.ape']
    for (const a of audios) {
      expect(isSupportedMediaFile(a)).toBe(true)
      expect(getMediaKindFromExt(a.split('.').pop()!)).toBe('audio')
    }

    expect(isSupportedMediaFile('readme.txt')).toBe(false)
    expect(isSupportedMediaFile('photo.png')).toBe(false)
  })

  it('classifies direct play vs FFmpeg smart remux accurately', () => {
    expect(canChromiumDirectPlay('mp4', 'h264', 'aac').canDirectPlay).toBe(true)
    expect(canChromiumDirectPlay('webm', 'vp9', 'opus').canDirectPlay).toBe(true)
    expect(canChromiumDirectPlay('flac', undefined, 'flac').canDirectPlay).toBe(true)
    expect(canChromiumDirectPlay('mp3', undefined, 'mp3').canDirectPlay).toBe(true)

    // MKV with H.264 + AC3 should use FFmpeg remux (video copy, audio transcode)
    const mkvH264 = canChromiumDirectPlay('mkv', 'h264', 'ac3')
    expect(mkvH264.canDirectPlay).toBe(false)
    expect(mkvH264.needsVideoTranscode).toBe(false)
    expect(mkvH264.needsAudioTranscode).toBe(true)

    // AVI with mpeg4 should transcode video + audio
    const aviOld = canChromiumDirectPlay('avi', 'mpeg4', 'mp3')
    expect(aviOld.canDirectPlay).toBe(false)
    expect(aviOld.needsVideoTranscode).toBe(true)

    // WMA audio should transcode cleanly
    expect(canChromiumDirectPlay('wma', undefined, 'wmav2').canDirectPlay).toBe(false)
  })
})

describe('Platform URL detection (YouTube, Facebook, X, TikTok, IG, Threads)', () => {
  it('detects every requested video sharing platform', () => {
    expect(detectPlatformFromUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube')
    expect(detectPlatformFromUrl('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
    expect(detectPlatformFromUrl('https://music.youtube.com/watch?v=abc123')).toBe('youtube')
    expect(detectPlatformFromUrl('https://www.facebook.com/watch/?v=123456')).toBe('facebook')
    expect(detectPlatformFromUrl('https://fb.watch/xyz123/')).toBe('facebook')
    expect(detectPlatformFromUrl('https://x.com/user/status/123456789')).toBe('x')
    expect(detectPlatformFromUrl('https://twitter.com/user/status/123456789')).toBe('x')
    expect(detectPlatformFromUrl('https://www.tiktok.com/@creator/video/723456789')).toBe('tiktok')
    expect(detectPlatformFromUrl('https://vm.tiktok.com/ZM2abcdef/')).toBe('tiktok')
    expect(detectPlatformFromUrl('https://www.instagram.com/reel/C8abc123/')).toBe('instagram')
    expect(detectPlatformFromUrl('https://www.threads.net/@natgeo/post/C8H5FiCtESk')).toBe('threads')
    expect(detectPlatformFromUrl('https://www.threads.com/@natgeo/post/C8H5FiCtESk')).toBe('threads')
    expect(detectPlatformFromUrl('https://vimeo.com/12345678')).toBe('other')
  })
})

describe('Subtitle & Lyrics parsers and formatters', () => {
  it('converts SRT timestamps to WebVTT cleanly', () => {
    const srt = `1\n00:00:01,250 --> 00:00:04,500\nXin chào APlayer!\n\n2\n00:00:05,000 --> 00:00:08,120\nLine 1\nLine 2\n`
    const vtt = convertSrtToVtt(srt)
    expect(vtt.startsWith('WEBVTT')).toBe(true)
    expect(vtt).toContain('00:00:01.250 --> 00:00:04.500')
    expect(vtt).toContain('Xin chào APlayer!')
    expect(vtt).toContain('00:00:05.000 --> 00:00:08.120')
  })

  it('parses synced LRC timestamps in sorted order', () => {
    const lrc = `[00:12.50]Second line\n[00:05.10]First line\n[01:02.00]Third line`
    const parsed = parseLrc(lrc)
    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toEqual({ time: 5.1, text: 'First line' })
    expect(parsed[1]).toEqual({ time: 12.5, text: 'Second line' })
    expect(parsed[2]).toEqual({ time: 62, text: 'Third line' })
  })

  it('formats durations and file sizes', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatFileSize(1024 * 1024 * 5.5)).toBe('5.5 MB')
  })
})
