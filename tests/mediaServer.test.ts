import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getBinaries } from '../src/main/binaries'
import { probeMediaFile } from '../src/main/mediaProbe'
import { startMediaServer, type MediaServerHandle } from '../src/main/mediaServer'

const execFileAsync = promisify(execFile)

describe('Universal FFmpeg Media Probe & Streaming Server', () => {
  let tmpDir: string
  let server: MediaServerHandle
  let files: Record<string, string> = {}

  beforeAll(async () => {
    const bins = await getBinaries()
    expect(bins.ffmpegPath).toBeTruthy()
    expect(bins.ffprobePath).toBeTruthy()

    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'aplayer-media-test-'))
    server = await startMediaServer(path.join(tmpDir, 'cache'))

    const ffmpeg = bins.ffmpegPath!
    const srtPath = path.join(tmpDir, 'sample_mkv.vi.srt')
    await fs.promises.writeFile(
      srtPath,
      '1\n00:00:00,100 --> 00:00:01,800\nPhụ đề tiếng Việt thử nghiệm\n',
      'utf-8'
    )

    const lrcPath = path.join(tmpDir, 'sample_song.lrc')
    await fs.promises.writeFile(lrcPath, '[00:00.20]Giai điệu thử nghiệm APlayer\n', 'utf-8')

    // Generate real media samples across popular video & audio formats
    files = {
      mp4: path.join(tmpDir, 'sample.mp4'),
      mkv: path.join(tmpDir, 'sample_mkv.mkv'),
      avi: path.join(tmpDir, 'sample.avi'),
      flv: path.join(tmpDir, 'sample.flv'),
      mov: path.join(tmpDir, 'sample.mov'),
      webm: path.join(tmpDir, 'sample.webm'),
      mp3: path.join(tmpDir, 'sample_song.mp3'),
      flac: path.join(tmpDir, 'sample.flac'),
      wav: path.join(tmpDir, 'sample.wav'),
      ogg: path.join(tmpDir, 'sample.ogg'),
      aiff: path.join(tmpDir, 'sample.aiff'),
      wmv: path.join(tmpDir, 'sample.wmv'),
      ts: path.join(tmpDir, 'sample.ts'),
      alac: path.join(tmpDir, 'sample_alac.m4a'),
      srt: srtPath
    }

    // 1. MP4 (H.264 + AAC)
    await execFileAsync(ffmpeg, [
      '-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x180:rate=24',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      '-metadata', 'title=Demo MP4 Video', files.mp4
    ])

    // 2. MKV with H.264 + AC3 audio + embedded SRT subtitle
    await execFileAsync(ffmpeg, [
      '-y', '-i', files.mp4, '-i', srtPath,
      '-map', '0:v', '-map', '0:a', '-map', '1:s',
      '-c:v', 'copy', '-c:a', 'ac3', '-c:s', 'srt',
      '-metadata:s:s:0', 'language=vie',
      files.mkv
    ])

    // 3. AVI (MPEG-4 + MP3)
    await execFileAsync(ffmpeg, [
      '-y', '-i', files.mp4, '-c:v', 'mpeg4', '-c:a', 'libmp3lame', files.avi
    ])

    // 4. FLV
    await execFileAsync(ffmpeg, [
      '-y', '-i', files.mp4, '-c:v', 'flv1', '-c:a', 'libmp3lame', files.flv
    ])

    // 5. MOV
    await execFileAsync(ffmpeg, [
      '-y', '-i', files.mp4, '-c:v', 'copy', '-c:a', 'copy', files.mov
    ])

    // 6. WebM (VP9 + Opus)
    await execFileAsync(ffmpeg, [
      '-y', '-i', files.mp4, '-c:v', 'libvpx', '-c:a', 'libopus', files.webm
    ])

    // 7. Audio formats: MP3 (with tags), FLAC, WAV, OGG, AIFF
    await execFileAsync(ffmpeg, [
      '-y', '-f', 'lavfi', '-i', 'sine=frequency=523:duration=2',
      '-c:a', 'libmp3lame', '-b:a', '192k',
      '-metadata', 'title=Midnight Glass', '-metadata', 'artist=APlayer Studio',
      files.mp3
    ])
    await execFileAsync(ffmpeg, ['-y', '-i', files.mp3, '-c:a', 'flac', files.flac])
    await execFileAsync(ffmpeg, ['-y', '-i', files.mp3, '-c:a', 'pcm_s16le', files.wav])
    await execFileAsync(ffmpeg, ['-y', '-i', files.mp3, '-c:a', 'libopus', files.ogg])
    await execFileAsync(ffmpeg, ['-y', '-i', files.mp3, '-c:a', 'pcm_s16be', files.aiff])
    await execFileAsync(ffmpeg, ['-y', '-i', files.mp3, '-c:a', 'alac', files.alac])
    await execFileAsync(ffmpeg, ['-y', '-i', files.mp4, '-c:v', 'wmv2', '-c:a', 'wmav2', files.wmv])
    await execFileAsync(ffmpeg, ['-y', '-i', files.mp4, '-c:v', 'copy', '-c:a', 'aac', files.ts])
  })

  afterAll(async () => {
    await server?.stop()
    if (tmpDir) {
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
    }
  })

  it('probes all 11 video & audio formats accurately with tracks, subtitles & LRC', async () => {
    const mp4 = await probeMediaFile(files.mp4)
    expect(mp4.kind).toBe('video')
    expect(mp4.canDirectPlay).toBe(true)
    expect(mp4.width).toBe(320)
    expect(mp4.height).toBe(180)
    expect(mp4.title).toBe('Demo MP4 Video')

    const mkv = await probeMediaFile(files.mkv)
    expect(mkv.kind).toBe('video')
    expect(mkv.canDirectPlay).toBe(false)
    expect(mkv.audioCodec).toBe('ac3')
    // Both embedded SRT and sidecar vi.srt should be discovered!
    expect(mkv.subtitleTracks.length).toBeGreaterThanOrEqual(2)
    expect(mkv.subtitleTracks.some((s) => !s.isExternal)).toBe(true)
    expect(mkv.subtitleTracks.some((s) => s.isExternal)).toBe(true)

    const avi = await probeMediaFile(files.avi)
    expect(avi.kind).toBe('video')
    expect(avi.canDirectPlay).toBe(false)

    const flv = await probeMediaFile(files.flv)
    expect(flv.kind).toBe('video')
    expect(flv.canDirectPlay).toBe(false)

    const mp3 = await probeMediaFile(files.mp3)
    expect(mp3.kind).toBe('audio')
    expect(mp3.canDirectPlay).toBe(true)
    expect(mp3.title).toBe('Midnight Glass')
    expect(mp3.artist).toBe('APlayer Studio')
    expect(mp3.lrcPath).toBeTruthy()

    const flac = await probeMediaFile(files.flac)
    expect(flac.kind).toBe('audio')
    expect(flac.canDirectPlay).toBe(true)

    const aiff = await probeMediaFile(files.aiff)
    expect(aiff.kind).toBe('audio')
    expect(aiff.canDirectPlay).toBe(false)

    const alac = await probeMediaFile(files.alac)
    expect(alac.kind).toBe('audio')
    expect(alac.audioCodec).toBe('alac')
    expect(alac.canDirectPlay).toBe(false)

    const wmv = await probeMediaFile(files.wmv)
    expect(wmv.kind).toBe('video')
    expect(wmv.canDirectPlay).toBe(false)

    const ts = await probeMediaFile(files.ts)
    expect(ts.kind).toBe('video')
    expect(ts.canDirectPlay).toBe(false)
  })

  it('enforces token security on media server', async () => {
    const unauth = await fetch(`${server.baseUrl}/media/direct?path=${encodeURIComponent(files.mp4)}`)
    expect(unauth.status).toBe(403)
  })

  it('serves HTTP 206 byte ranges for direct play files (MP4 & FLAC)', async () => {
    const res = await fetch(
      `${server.baseUrl}/media/direct?token=${server.token}&path=${encodeURIComponent(files.mp4)}`,
      { headers: { Range: 'bytes=0-1023' } }
    )
    expect(res.status).toBe(206)
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('content-range')).toContain('bytes 0-1023/')
    const buf = Buffer.from(await res.arrayBuffer())
    expect(buf.length).toBe(1024)
  })

  it('transmuxes MKV/AVI video and AIFF audio live via FFmpeg', async () => {
    const mkvRes = await fetch(
      `${server.baseUrl}/media/stream?token=${server.token}&path=${encodeURIComponent(files.mkv)}&start=0`
    )
    expect(mkvRes.status).toBe(200)
    expect(mkvRes.headers.get('content-type')).toBe('video/mp4')
    const mkvBuf = Buffer.from(await mkvRes.arrayBuffer())
    expect(mkvBuf.length).toBeGreaterThan(2000)
    // Valid fragmented MP4 starts with ftyp box
    expect(mkvBuf.subarray(4, 8).toString('ascii')).toBe('ftyp')

    const aviRes = await fetch(
      `${server.baseUrl}/media/stream?token=${server.token}&path=${encodeURIComponent(files.avi)}&start=0`
    )
    expect(aviRes.status).toBe(200)
    const aviBuf = Buffer.from(await aviRes.arrayBuffer())
    expect(aviBuf.length).toBeGreaterThan(2000)
    expect(aviBuf.subarray(4, 8).toString('ascii')).toBe('ftyp')

    const aiffRes = await fetch(
      `${server.baseUrl}/media/stream?token=${server.token}&path=${encodeURIComponent(files.aiff)}&start=0`
    )
    expect(aiffRes.status).toBe(200)
    expect(aiffRes.headers.get('content-type')).toBe('audio/flac')
    const aiffBuf = Buffer.from(await aiffRes.arrayBuffer())
    // Valid FLAC stream starts with fLaC magic
    expect(aiffBuf.subarray(0, 4).toString('ascii')).toBe('fLaC')

    const wmvRes = await fetch(
      `${server.baseUrl}/media/stream?token=${server.token}&path=${encodeURIComponent(files.wmv)}&start=0`
    )
    expect(wmvRes.status).toBe(200)
    const wmvBuf = Buffer.from(await wmvRes.arrayBuffer())
    expect(wmvBuf.subarray(4, 8).toString('ascii')).toBe('ftyp')

    const alacRes = await fetch(
      `${server.baseUrl}/media/stream?token=${server.token}&path=${encodeURIComponent(files.alac)}&start=0`
    )
    expect(alacRes.status).toBe(200)
    const alacBuf = Buffer.from(await alacRes.arrayBuffer())
    expect(alacBuf.subarray(0, 4).toString('ascii')).toBe('fLaC')
  })

  it('extracts embedded MKV subtitles, external SRT -> VTT, and video artwork JPEG', async () => {
    const mkv = await probeMediaFile(files.mkv)
    const embedded = mkv.subtitleTracks.find((s) => !s.isExternal)!
    const subRes = await fetch(
      `${server.baseUrl}/media/subtitle?token=${server.token}&path=${encodeURIComponent(files.mkv)}&stream=${embedded.streamIndex}`
    )
    expect(subRes.status).toBe(200)
    const vttText = await subRes.text()
    expect(vttText).toContain('WEBVTT')
    expect(vttText).toContain('Phụ đề tiếng Việt thử nghiệm')

    const extSubRes = await fetch(
      `${server.baseUrl}/media/ext-subtitle?token=${server.token}&path=${encodeURIComponent(files.srt)}`
    )
    expect(extSubRes.status).toBe(200)
    expect(await extSubRes.text()).toContain('WEBVTT')

    const artRes = await fetch(
      `${server.baseUrl}/media/artwork?token=${server.token}&path=${encodeURIComponent(files.mp4)}&kind=video`
    )
    expect(artRes.status).toBe(200)
    expect(artRes.headers.get('content-type')).toBe('image/jpeg')
    const jpg = Buffer.from(await artRes.arrayBuffer())
    expect(jpg[0]).toBe(0xff)
    expect(jpg[1]).toBe(0xd8)
  })
})
