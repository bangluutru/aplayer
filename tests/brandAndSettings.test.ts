import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { createDefaultSettings, getThemePreset, THEME_PRESETS } from '../src/shared/themes'

describe('CHIBA-inspired Luxury Brand & Zero-Emoticon Integrity', () => {
  it('defaults to Chiba Midnight Navy theme, vector emblem ID, and Be Vietnam Pro font', () => {
    const settings = createDefaultSettings('/tmp/videos', '/tmp/audio')
    expect(settings.themeId).toBe('chiba-navy')
    expect(settings.avatarGlyph).toBe('ray-prism')
    expect(settings.fontFamily).toBe('vietnam')
    expect(settings.brandTagline).toBe('Personal Media Studio')
  })

  it('migrates legacy v1 theme IDs cleanly without breaking saved profiles', () => {
    expect(getThemePreset('obsidian-aurora').id).toBe('chiba-navy')
    expect(getThemePreset('liquid-pearl').id).toBe('chiba-daylight')
    expect(getThemePreset('solar-sunset').id).toBe('amber-noir')
    expect(getThemePreset('emerald-abyss').id).toBe('emerald-vault')
    expect(getThemePreset('midnight-rose').id).toBe('obsidian-titanium')
    expect(THEME_PRESETS.length).toBe(6)
  })

  it('contains zero emoticons, unicode dingbats, or lucide-react icon imports in src/', () => {
    const srcDir = path.resolve(__dirname, '../src')
    const forbiddenRegex = /[✦◈♫◎❖✧⌘⚡✓🎉🔥✨🎵🎬📥🎨👍❤️😍😊]/u

    const walk = (dir: string): string[] => {
      const out: string[] = []
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...walk(full))
        else if (/\.(ts|tsx|css)$/.test(entry.name)) out.push(full)
      }
      return out
    }

    const files = walk(srcDir)
    expect(files.length).toBeGreaterThan(10)

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      expect(forbiddenRegex.test(content), `Found forbidden emoticon/dingbat in ${file}`).toBe(false)
      expect(content.includes('lucide-react'), `Found legacy lucide-react import in ${file}`).toBe(false)
    }
  })
})
