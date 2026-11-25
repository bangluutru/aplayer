import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { isSupportedMediaFile } from '../shared/formats'
import { createDefaultSettings, DEFAULT_EQUALIZER } from '../shared/themes'
import type {
  DownloadTask,
  MediaItem,
  PersonalizationSettings,
  Playlist,
  SupportedPlatform
} from '../shared/types'
import { probeMediaFile } from './mediaProbe'

interface PersistedDatabase {
  version: number
  settings: PersonalizationSettings
  items: MediaItem[]
  playlists: Playlist[]
  downloads: DownloadTask[]
}

export function getDefaultMediaDirs(): { videoDir: string; audioDir: string } {
  const home = os.homedir()
  return {
    videoDir: path.join(home, 'Movies', 'APlayer'),
    audioDir: path.join(home, 'Music', 'APlayer')
  }
}

function makeItemId(filePath: string): string {
  return crypto.createHash('sha1').update(path.resolve(filePath)).digest('hex').slice(0, 16)
}

export class LibraryStore {
  private dbPath: string
  private data: PersistedDatabase
  private saveTimer: NodeJS.Timeout | null = null

  constructor(userDataDir: string) {
    this.dbPath = path.join(userDataDir, 'aplayer-db.json')
    const { videoDir, audioDir } = getDefaultMediaDirs()
    const defaults = createDefaultSettings(videoDir, audioDir)

    this.data = {
      version: 1,
      settings: defaults,
      items: [],
      playlists: [],
      downloads: []
    }

    this.loadSync(defaults)
  }

  private loadSync(defaults: PersonalizationSettings): void {
    try {
      if (!fs.existsSync(this.dbPath)) {
        return
      }
      const raw = fs.readFileSync(this.dbPath, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<PersistedDatabase>
      const rawSettings = { ...(parsed.settings || {}) } as Partial<PersonalizationSettings>
      // Cleanly migrate legacy unicode glyph or deprecated font values from v1
      const validEmblems = new Set([
        'ray-prism',
        'chiba-spark',
        'vinyl-pulse',
        'sound-arch',
        'cinema-lens',
        'hex-core',
        'orbit-ring',
        'monogram-a'
      ])
      if (rawSettings.avatarGlyph && !validEmblems.has(rawSettings.avatarGlyph)) {
        rawSettings.avatarGlyph = 'ray-prism'
      }
      if (rawSettings.brandTagline === 'Personal Glass Media Studio') {
        rawSettings.brandTagline = 'Personal Media Studio'
      }
      if ((rawSettings.fontFamily as string) === 'jakarta') {
        rawSettings.fontFamily = 'vietnam'
      }
      this.data = {
        version: 1,
        settings: {
          ...defaults,
          ...rawSettings,
          equalizer: {
            ...DEFAULT_EQUALIZER,
            ...(parsed.settings?.equalizer || {}),
            bands:
              Array.isArray(parsed.settings?.equalizer?.bands) &&
              parsed.settings.equalizer.bands.length === 10
                ? parsed.settings.equalizer.bands
                : [...DEFAULT_EQUALIZER.bands]
          }
        },
        items: Array.isArray(parsed.items) ? parsed.items : [],
        playlists: Array.isArray(parsed.playlists) ? parsed.playlists : [],
        downloads: Array.isArray(parsed.downloads)
          ? parsed.downloads.map((d) =>
              d.status === 'downloading' || d.status === 'analyzing' || d.status === 'processing' || d.status === 'queued'
                ? { ...d, status: 'cancelled' as const }
                : d
            )
          : []
      }
    } catch {
      // start fresh on corrupt file
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.flushSync()
    }, 250)
  }

  flushSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    try {
      const dir = path.dirname(this.dbPath)
      fs.mkdirSync(dir, { recursive: true })
      const tmpPath = `${this.dbPath}.tmp`
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8')
      fs.renameSync(tmpPath, this.dbPath)
    } catch {
      // ignore write failure
    }
  }

  getSettings(): PersonalizationSettings {
    return this.data.settings
  }

  updateSettings(patch: Partial<PersonalizationSettings>): PersonalizationSettings {
    this.data.settings = {
      ...this.data.settings,
      ...patch,
      equalizer: patch.equalizer
        ? { ...this.data.settings.equalizer, ...patch.equalizer }
        : this.data.settings.equalizer
    }
    this.scheduleSave()
    return this.data.settings
  }

  resetSettings(): PersonalizationSettings {
    const { videoDir, audioDir } = getDefaultMediaDirs()
    this.data.settings = createDefaultSettings(videoDir, audioDir)
    this.scheduleSave()
    return this.data.settings
  }

  getItems(): MediaItem[] {
    return this.data.items
  }

  getPlaylists(): Playlist[] {
    return this.data.playlists
  }

  getDownloads(): DownloadTask[] {
    return this.data.downloads
  }

  setDownloads(tasks: DownloadTask[]): void {
    this.data.downloads = tasks.slice(0, 150)
    this.scheduleSave()
  }

  async addOrUpdateFile(
    filePath: string,
    extra?: { isDownloaded?: boolean; sourcePlatform?: SupportedPlatform; sourceUrl?: string }
  ): Promise<MediaItem | null> {
    const resolved = path.resolve(filePath)
    if (!isSupportedMediaFile(resolved)) return null
    try {
      const stat = await fs.promises.stat(resolved)
      if (!stat.isFile()) return null
    } catch {
      return null
    }

    const id = makeItemId(resolved)
    const existingIdx = this.data.items.findIndex((i) => i.id === id)
    const probe = await probeMediaFile(resolved)

    const existing = existingIdx >= 0 ? this.data.items[existingIdx] : undefined
    const item: MediaItem = {
      id,
      filePath: resolved,
      fileName: probe.fileName,
      ext: probe.ext,
      kind: probe.kind,
      title: probe.title,
      artist: probe.artist,
      album: probe.album,
      duration: probe.duration,
      sizeBytes: probe.sizeBytes,
      width: probe.width,
      height: probe.height,
      videoCodec: probe.videoCodec,
      audioCodec: probe.audioCodec,
      bitrate: probe.bitrate,
      sampleRate: probe.sampleRate,
      addedAt: existing?.addedAt || Date.now(),
      lastPlayedAt: existing?.lastPlayedAt,
      lastPosition: existing?.lastPosition,
      playCount: existing?.playCount || 0,
      favorite: existing?.favorite || false,
      isDownloaded: extra?.isDownloaded ?? existing?.isDownloaded ?? false,
      sourcePlatform: extra?.sourcePlatform ?? existing?.sourcePlatform,
      sourceUrl: extra?.sourceUrl ?? existing?.sourceUrl
    }

    if (existingIdx >= 0) {
      this.data.items[existingIdx] = item
    } else {
      this.data.items.unshift(item)
    }
    this.scheduleSave()
    return item
  }

  async importPaths(rawPaths: string[]): Promise<MediaItem[]> {
    const discoveredFiles: string[] = []
    const visitedDirs = new Set<string>()

    const walk = async (target: string, depth: number): Promise<void> => {
      if (depth > 5) return
      let stat: fs.Stats
      try {
        stat = await fs.promises.stat(target)
      } catch {
        return
      }
      if (stat.isFile()) {
        if (isSupportedMediaFile(target)) {
          discoveredFiles.push(path.resolve(target))
        }
        return
      }
      if (stat.isDirectory()) {
        const realDir = path.resolve(target)
        if (visitedDirs.has(realDir)) return
        visitedDirs.add(realDir)
        try {
          const entries = await fs.promises.readdir(realDir, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.name.startsWith('.')) continue
            const child = path.join(realDir, entry.name)
            if (entry.isDirectory()) {
              await walk(child, depth + 1)
            } else if (entry.isFile() && isSupportedMediaFile(child)) {
              discoveredFiles.push(child)
            }
          }
        } catch {
          // ignore unreadable dir
        }
      }
    }

    for (const p of rawPaths) {
      await walk(p, 0)
    }

    const uniqueFiles = Array.from(new Set(discoveredFiles))
    const imported: MediaItem[] = []
    const concurrency = 4

    for (let i = 0; i < uniqueFiles.length; i += concurrency) {
      const batch = uniqueFiles.slice(i, i + concurrency)
      const results = await Promise.all(batch.map((f) => this.addOrUpdateFile(f)))
      for (const r of results) {
        if (r) imported.push(r)
      }
    }

    return imported
  }

  pruneMissingFiles(): MediaItem[] {
    const before = this.data.items.length
    this.data.items = this.data.items.filter((item) => fs.existsSync(item.filePath))
    if (this.data.items.length !== before) {
      this.scheduleSave()
    }
    return this.data.items
  }

  removeItem(id: string): MediaItem[] {
    this.data.items = this.data.items.filter((i) => i.id !== id)
    for (const pl of this.data.playlists) {
      pl.itemIds = pl.itemIds.filter((itemId) => itemId !== id)
    }
    this.scheduleSave()
    return this.data.items
  }

  toggleFavorite(id: string): MediaItem | null {
    const item = this.data.items.find((i) => i.id === id)
    if (!item) return null
    item.favorite = !item.favorite
    this.scheduleSave()
    return item
  }

  recordPlayback(id: string, positionSeconds: number, incrementPlayCount = false): void {
    const item = this.data.items.find((i) => i.id === id)
    if (!item) return
    item.lastPosition = positionSeconds
    item.lastPlayedAt = Date.now()
    if (incrementPlayCount) {
      item.playCount = (item.playCount || 0) + 1
    }
    this.scheduleSave()
  }

  createPlaylist(name: string, description?: string): Playlist {
    const now = Date.now()
    const pl: Playlist = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Untitled Playlist',
      description,
      itemIds: [],
      createdAt: now,
      updatedAt: now
    }
    this.data.playlists.unshift(pl)
    this.scheduleSave()
    return pl
  }

  deletePlaylist(id: string): Playlist[] {
    this.data.playlists = this.data.playlists.filter((p) => p.id !== id)
    this.scheduleSave()
    return this.data.playlists
  }

  addToPlaylist(playlistId: string, itemId: string): Playlist | null {
    const pl = this.data.playlists.find((p) => p.id === playlistId)
    if (!pl) return null
    if (!pl.itemIds.includes(itemId)) {
      pl.itemIds.push(itemId)
      pl.updatedAt = Date.now()
      this.scheduleSave()
    }
    return pl
  }

  removeFromPlaylist(playlistId: string, itemId: string): Playlist | null {
    const pl = this.data.playlists.find((p) => p.id === playlistId)
    if (!pl) return null
    pl.itemIds = pl.itemIds.filter((id) => id !== itemId)
    pl.updatedAt = Date.now()
    this.scheduleSave()
    return pl
  }
}
