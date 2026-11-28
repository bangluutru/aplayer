import { describe, expect, it } from 'vitest'
import { createDefaultSettings, createDefaultVoiceHubSettings } from '../src/shared/themes'
import { normalizeHubBaseUrl, sanitizeAudioFilename } from '../src/main/voiceHubManager'

describe('APlayer Voice Studio & LAN Remote Hub Config', () => {
  it('defaults to local offline AIWF Voice Hub with Gemini Cloud disabled', () => {
    const settings = createDefaultSettings('/tmp/videos', '/tmp/audio')
    expect(settings.voiceHub.mode).toBe('local')
    expect(settings.voiceHub.localPort).toBe(8765)
    expect(settings.voiceHub.enableGeminiCloud).toBe(false)
    expect(settings.voiceHub.autoImportGenerated).toBe(true)
    expect(settings.voiceHub.outputDir).toBe('/tmp/audio/VoiceStudio')

    const standalone = createDefaultVoiceHubSettings('/Users/test/Music/APlayer')
    expect(standalone.enableGeminiCloud).toBe(false)
  })

  it('normalizes LAN URLs and rejects unsafe protocols', () => {
    expect(normalizeHubBaseUrl('imac-m4.local:8765/')).toBe('http://imac-m4.local:8765')
    expect(normalizeHubBaseUrl('http://192.168.1.20:8765///')).toBe('http://192.168.1.20:8765')
    expect(normalizeHubBaseUrl('https://voice.local:8443/')).toBe('https://voice.local:8443')
    expect(normalizeHubBaseUrl('')).toBe('')
    expect(() => normalizeHubBaseUrl('file:///etc/passwd')).toThrow()
    expect(() => normalizeHubBaseUrl('javascript:alert(1)')).toThrow()
  })

  it('sanitizes generated WAV filenames cleanly', () => {
    expect(sanitizeAudioFilename('vi_vieneu_Thùy Dung/../../hack')).toBe('vi_vieneu_Thuy_Dung_hack')
    expect(sanitizeAudioFilename('   ')).toBe('voice_studio')
  })
})
