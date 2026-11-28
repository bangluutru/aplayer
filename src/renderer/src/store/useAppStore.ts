import { create } from 'zustand'
import { createDefaultSettings } from '@shared/themes'
import type {
  DownloadTask,
  EqualizerSettings,
  MediaItem,
  MediaProbeResult,
  NavTab,
  PersonalizationSettings,
  Playlist,
  RepeatMode,
  SupportedPlatform,
  SystemCapabilities,
  VideoAdjustments
} from '@shared/types'
import { audioDspEngine } from '../engine/audioEngine'

export interface RemoteStreamItem {
  id: string
  streamUrl: string
  sourceUrl: string
  title: string
  uploader: string
  thumbnail?: string
  platform: SupportedPlatform
}

export interface ToastMessage {
  id: string
  text: string
  tone: 'info' | 'success' | 'error'
}

interface AppState {
  initialized: boolean
  capabilities: SystemCapabilities | null
  settings: PersonalizationSettings
  activeTab: NavTab

  // Library
  libraryItems: MediaItem[]
  playlists: Playlist[]
  isScanning: boolean

  // Downloads
  downloads: DownloadTask[]

  // Playback
  currentItem: MediaItem | null
  currentProbe: MediaProbeResult | null
  remoteStream: RemoteStreamItem | null
  queue: MediaItem[]
  queueIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  seekOffset: number // Used when FFmpeg transcode starts at a non-zero seek time
  isTranscodingStream: boolean
  streamSessionId: number
  volume: number
  muted: boolean
  playbackRate: number
  repeatMode: RepeatMode
  shuffle: boolean
  activeAudioTrack: number
  activeSubtitleKey: string | null // 'embedded:<streamIndex>' | 'external:<path>' | null
  customSubtitlePaths: string[]
  abLoop: { a: number | null; b: number | null }
  videoFilters: VideoAdjustments
  sleepTimerEndAt: number | null

  // UI Overlays
  showEqModal: boolean
  showQueueDrawer: boolean
  toasts: ToastMessage[]

  // Actions
  bootstrap: () => Promise<void>
  setActiveTab: (tab: NavTab) => void
  updateSettings: (patch: Partial<PersonalizationSettings>) => Promise<void>
  updateEqualizer: (patch: Partial<EqualizerSettings>) => Promise<void>
  resetSettings: () => Promise<void>
  importPathsAndPlay: (paths: string[], autoPlay?: boolean) => Promise<void>
  scanWatchedFolders: () => Promise<void>
  playMediaItem: (item: MediaItem, queueOverride?: MediaItem[]) => Promise<void>
  playRemoteStream: (stream: Omit<RemoteStreamItem, 'id'>) => void
  playNext: () => Promise<void>
  playPrevious: () => Promise<void>
  addToQueue: (item: MediaItem) => void
  clearQueue: () => void
  toggleFavorite: (id: string) => Promise<void>
  removeLibraryItem: (id: string) => Promise<void>
  createPlaylist: (name: string) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  addItemToPlaylist: (playlistId: string, itemId: string) => Promise<void>
  removeItemFromPlaylist: (playlistId: string, itemId: string) => Promise<void>

  // Playback setters
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void
  setSeekOffset: (offset: number, bumpSession?: boolean) => void
  setVolume: (v: number) => void
  setMuted: (m: boolean) => void
  setPlaybackRate: (r: number) => void
  cycleRepeatMode: () => void
  toggleShuffle: () => void
  setActiveAudioTrack: (audioIdx: number) => void
  setActiveSubtitleKey: (key: string | null) => void
  addCustomSubtitle: (filePath: string) => void
  setAbLoopPoint: (point: 'a' | 'b' | 'clear', time?: number) => void
  setVideoFilters: (patch: Partial<VideoAdjustments>) => void
  resetVideoFilters: () => void
  setSleepTimerMinutes: (minutes: number | null) => void
  setShowEqModal: (open: boolean) => void
  setShowQueueDrawer: (open: boolean) => void

  // Downloader sync
  upsertDownloadTask: (task: DownloadTask) => void
  setDownloads: (tasks: DownloadTask[]) => void
  upsertLibraryItem: (item: MediaItem) => void

  // Notifications
  pushToast: (text: string, tone?: 'info' | 'success' | 'error') => void
  dismissToast: (id: string) => void

  // URL helpers
  getMediaPlaybackUrl: () => string | null
  getArtworkUrl: (item: Pick<MediaItem, 'filePath' | 'kind'> | null) => string | null
  getLocalFileUrl: (filePath?: string) => string | null
  getSubtitleUrl: (key: string | null) => string | null
}

const DEFAULT_VIDEO_FILTERS: VideoAdjustments = {
  brightness: 1,
  contrast: 1,
  saturate: 1
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  capabilities: null,
  settings: createDefaultSettings('', ''),
  activeTab: 'player',

  libraryItems: [],
  playlists: [],
  isScanning: false,

  downloads: [],

  currentItem: null,
  currentProbe: null,
  remoteStream: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  seekOffset: 0,
  isTranscodingStream: false,
  streamSessionId: 1,
  volume: 0.85,
  muted: false,
  playbackRate: 1,
  repeatMode: 'off',
  shuffle: false,
  activeAudioTrack: 0,
  activeSubtitleKey: null,
  customSubtitlePaths: [],
  abLoop: { a: null, b: null },
  videoFilters: { ...DEFAULT_VIDEO_FILTERS },
  sleepTimerEndAt: null,

  showEqModal: false,
  showQueueDrawer: false,
  toasts: [],

  bootstrap: async () => {
    if (!window.aplayerAPI) return
    const [capabilities, settings, library, downloads] = await Promise.all([
      window.aplayerAPI.getCapabilities(),
      window.aplayerAPI.getSettings(),
      window.aplayerAPI.getLibrary(),
      window.aplayerAPI.getDownloads()
    ])

    audioDspEngine.applyEqualizer(settings.equalizer)

    set({
      initialized: true,
      capabilities,
      settings,
      libraryItems: library.items,
      playlists: library.playlists,
      downloads
    })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  updateSettings: async (patch) => {
    const prev = get().settings
    const optimistic: PersonalizationSettings = {
      ...prev,
      ...patch,
      equalizer: patch.equalizer ? { ...prev.equalizer, ...patch.equalizer } : prev.equalizer,
      voiceHub: patch.voiceHub ? { ...prev.voiceHub, ...patch.voiceHub } : prev.voiceHub
    }
    set({ settings: optimistic })
    if (patch.equalizer) {
      audioDspEngine.applyEqualizer(optimistic.equalizer)
    }
    if (window.aplayerAPI) {
      const saved = await window.aplayerAPI.updateSettings(patch)
      set({ settings: saved })
    }
  },

  updateEqualizer: async (patch) => {
    const nextEq = { ...get().settings.equalizer, ...patch }
    audioDspEngine.applyEqualizer(nextEq)
    await get().updateSettings({ equalizer: nextEq })
  },

  resetSettings: async () => {
    if (!window.aplayerAPI) return
    const reset = await window.aplayerAPI.resetSettings()
    audioDspEngine.applyEqualizer(reset.equalizer)
    set({ settings: reset })
    get().pushToast(
      reset.language === 'vi' ? 'Đã khôi phục cài đặt mặc định' : 'Default settings restored',
      'info'
    )
  },

  importPathsAndPlay: async (paths, autoPlay = true) => {
    if (!paths.length || !window.aplayerAPI) return
    set({ isScanning: true })
    try {
      const { imported, items } = await window.aplayerAPI.importPaths(paths)
      set({ libraryItems: items, isScanning: false })
      if (imported.length === 0) {
        get().pushToast(
          get().settings.language === 'vi'
            ? 'Không tìm thấy file media được hỗ trợ'
            : 'No supported media files found',
          'error'
        )
        return
      }
      if (autoPlay) {
        await get().playMediaItem(imported[0], imported)
        set({ activeTab: 'player' })
      } else {
        get().pushToast(
          get().settings.language === 'vi'
            ? `Đã thêm ${imported.length} tệp vào Thư viện`
            : `Imported ${imported.length} items to Library`,
          'success'
        )
      }
    } catch {
      set({ isScanning: false })
    }
  },

  scanWatchedFolders: async () => {
    if (!window.aplayerAPI) return
    set({ isScanning: true })
    try {
      const items = await window.aplayerAPI.scanWatchedFolders()
      set({ libraryItems: items, isScanning: false })
      get().pushToast(
        get().settings.language === 'vi'
          ? `Đã đồng bộ ${items.length} mục trong Thư viện`
          : `Synced ${items.length} media items`,
        'success'
      )
    } catch {
      set({ isScanning: false })
    }
  },

  playMediaItem: async (item, queueOverride) => {
    const state = get()
    const nextQueue = queueOverride && queueOverride.length > 0
      ? queueOverride
      : state.queue.some((q) => q.id === item.id)
        ? state.queue
        : state.libraryItems.length > 0
          ? state.libraryItems
          : [item]
    const nextIdx = Math.max(0, nextQueue.findIndex((q) => q.id === item.id))

    let probe: MediaProbeResult | null = null
    if (window.aplayerAPI) {
      try {
        probe = await window.aplayerAPI.probeMedia(item.filePath)
      } catch {
        probe = null
      }
      void window.aplayerAPI.recordPlayback(item.id, item.lastPosition || 0, true)
    }

    const canDirect = probe ? probe.canDirectPlay : true
    const firstSub = probe?.subtitleTracks[0]
    const autoSubKey = firstSub
      ? firstSub.isExternal && firstSub.externalPath
        ? `external:${firstSub.externalPath}`
        : firstSub.streamIndex !== undefined
          ? `embedded:${firstSub.streamIndex}`
          : null
      : null

    const resumePos =
      state.settings.rememberPlaybackPosition &&
      item.lastPosition &&
      item.duration > 30 &&
      item.lastPosition > 3 &&
      item.lastPosition < item.duration - 8
        ? item.lastPosition
        : 0

    set({
      currentItem: item,
      currentProbe: probe,
      remoteStream: null,
      queue: nextQueue,
      queueIndex: nextIdx,
      isPlaying: true,
      currentTime: resumePos,
      duration: probe?.duration || item.duration || 0,
      seekOffset: !canDirect ? resumePos : 0,
      isTranscodingStream: !canDirect,
      streamSessionId: state.streamSessionId + 1,
      activeAudioTrack: 0,
      activeSubtitleKey: autoSubKey,
      customSubtitlePaths: [],
      abLoop: { a: null, b: null }
    })
  },

  playRemoteStream: (stream) => {
    set((s) => ({
      currentItem: null,
      currentProbe: null,
      remoteStream: { ...stream, id: `remote-${Date.now()}` },
      isPlaying: true,
      currentTime: 0,
      duration: 0,
      seekOffset: 0,
      isTranscodingStream: false,
      streamSessionId: s.streamSessionId + 1,
      activeSubtitleKey: null,
      abLoop: { a: null, b: null },
      activeTab: 'player'
    }))
  },

  playNext: async () => {
    const { queue, queueIndex, shuffle, repeatMode } = get()
    if (queue.length === 0) return

    let nextIdx = queueIndex + 1
    if (shuffle && queue.length > 1) {
      do {
        nextIdx = Math.floor(Math.random() * queue.length)
      } while (nextIdx === queueIndex)
    } else if (nextIdx >= queue.length) {
      if (repeatMode === 'all') {
        nextIdx = 0
      } else {
        set({ isPlaying: false })
        return
      }
    }

    const nextItem = queue[nextIdx]
    if (nextItem) {
      await get().playMediaItem(nextItem, queue)
    }
  },

  playPrevious: async () => {
    const { queue, queueIndex, currentTime } = get()
    if (queue.length === 0) return
    if (currentTime > 4 && queue[queueIndex]) {
      set((s) => ({
        currentTime: 0,
        seekOffset: 0,
        streamSessionId: s.isTranscodingStream ? s.streamSessionId + 1 : s.streamSessionId
      }))
      return
    }
    const prevIdx = queueIndex > 0 ? queueIndex - 1 : queue.length - 1
    const prevItem = queue[prevIdx]
    if (prevItem) {
      await get().playMediaItem(prevItem, queue)
    }
  },

  addToQueue: (item) => {
    set((s) => {
      if (s.queue.some((q) => q.id === item.id)) return s
      return { queue: [...s.queue, item] }
    })
    get().pushToast(
      get().settings.language === 'vi'
        ? `Đã thêm "${item.title}" vào hàng đợi`
        : `Added "${item.title}" to queue`,
      'info'
    )
  },

  clearQueue: () => {
    const cur = get().currentItem
    set({ queue: cur ? [cur] : [], queueIndex: cur ? 0 : -1 })
  },

  toggleFavorite: async (id) => {
    if (!window.aplayerAPI) return
    const updated = await window.aplayerAPI.toggleFavorite(id)
    if (!updated) return
    set((s) => ({
      libraryItems: s.libraryItems.map((i) => (i.id === id ? updated : i)),
      currentItem: s.currentItem?.id === id ? updated : s.currentItem,
      queue: s.queue.map((i) => (i.id === id ? updated : i))
    }))
  },

  removeLibraryItem: async (id) => {
    if (!window.aplayerAPI) return
    const items = await window.aplayerAPI.removeLibraryItem(id)
    set((s) => ({
      libraryItems: items,
      queue: s.queue.filter((q) => q.id !== id)
    }))
  },

  createPlaylist: async (name) => {
    if (!window.aplayerAPI || !name.trim()) return
    const pl = await window.aplayerAPI.createPlaylist(name.trim())
    set((s) => ({ playlists: [pl, ...s.playlists] }))
  },

  deletePlaylist: async (id) => {
    if (!window.aplayerAPI) return
    const playlists = await window.aplayerAPI.deletePlaylist(id)
    set({ playlists })
  },

  addItemToPlaylist: async (playlistId, itemId) => {
    if (!window.aplayerAPI) return
    const updated = await window.aplayerAPI.addToPlaylist(playlistId, itemId)
    if (!updated) return
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p))
    }))
    get().pushToast(
      get().settings.language === 'vi'
        ? `Đã thêm vào playlist "${updated.name}"`
        : `Added to "${updated.name}"`,
      'success'
    )
  },

  removeItemFromPlaylist: async (playlistId, itemId) => {
    if (!window.aplayerAPI) return
    const updated = await window.aplayerAPI.removeFromPlaylist(playlistId, itemId)
    if (!updated) return
    set((s) => ({
      playlists: s.playlists.map((p) => (p.id === playlistId ? updated : p))
    }))
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setSeekOffset: (offset, bumpSession = true) =>
    set((s) => ({
      seekOffset: offset,
      currentTime: offset,
      streamSessionId: bumpSession ? s.streamSessionId + 1 : s.streamSessionId
    })),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)), muted: volume === 0 }),
  setMuted: (muted) => set({ muted }),
  setPlaybackRate: (playbackRate) => set({ playbackRate: Math.max(0.25, Math.min(4, playbackRate)) }),

  cycleRepeatMode: () =>
    set((s) => ({
      repeatMode: s.repeatMode === 'off' ? 'all' : s.repeatMode === 'all' ? 'one' : 'off'
    })),

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

  setActiveAudioTrack: (audioIdx) => {
    const s = get()
    const needsSwitch = audioIdx !== 0 || !(s.currentProbe?.canDirectPlay ?? true)
    set({
      activeAudioTrack: audioIdx,
      isTranscodingStream: needsSwitch,
      seekOffset: needsSwitch ? s.currentTime : 0,
      streamSessionId: s.streamSessionId + 1
    })
  },

  setActiveSubtitleKey: (activeSubtitleKey) => set({ activeSubtitleKey }),

  addCustomSubtitle: (filePath) => {
    const key = `external:${filePath}`
    set((s) => ({
      customSubtitlePaths: s.customSubtitlePaths.includes(filePath)
        ? s.customSubtitlePaths
        : [...s.customSubtitlePaths, filePath],
      activeSubtitleKey: key
    }))
  },

  setAbLoopPoint: (point, time) => {
    if (point === 'clear') {
      set({ abLoop: { a: null, b: null } })
      return
    }
    const t = time ?? get().currentTime
    set((s) => {
      if (point === 'a') {
        return { abLoop: { a: t, b: s.abLoop.b && s.abLoop.b > t ? s.abLoop.b : null } }
      }
      if (s.abLoop.a !== null && t > s.abLoop.a + 0.5) {
        return { abLoop: { a: s.abLoop.a, b: t } }
      }
      return s
    })
  },

  setVideoFilters: (patch) =>
    set((s) => ({ videoFilters: { ...s.videoFilters, ...patch } })),

  resetVideoFilters: () => set({ videoFilters: { ...DEFAULT_VIDEO_FILTERS } }),

  setSleepTimerMinutes: (minutes) => {
    if (!minutes || minutes <= 0) {
      set({ sleepTimerEndAt: null })
    } else {
      set({ sleepTimerEndAt: Date.now() + minutes * 60_000 })
    }
  },

  setShowEqModal: (showEqModal) => set({ showEqModal }),
  setShowQueueDrawer: (showQueueDrawer) => set({ showQueueDrawer }),

  upsertDownloadTask: (task) =>
    set((s) => {
      const exists = s.downloads.some((d) => d.id === task.id)
      return {
        downloads: exists
          ? s.downloads.map((d) => (d.id === task.id ? task : d))
          : [task, ...s.downloads]
      }
    }),

  setDownloads: (downloads) => set({ downloads }),

  upsertLibraryItem: (item) =>
    set((s) => {
      const exists = s.libraryItems.some((i) => i.id === item.id)
      return {
        libraryItems: exists
          ? s.libraryItems.map((i) => (i.id === item.id ? item : i))
          : [item, ...s.libraryItems]
      }
    }),

  pushToast: (text, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }))
    setTimeout(() => {
      get().dismissToast(id)
    }, 3600)
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  getMediaPlaybackUrl: () => {
    const { currentItem, remoteStream, capabilities, isTranscodingStream, seekOffset, activeAudioTrack, streamSessionId } = get()
    if (remoteStream) return remoteStream.streamUrl
    if (!currentItem || !capabilities) return null

    const encodedPath = encodeURIComponent(currentItem.filePath)
    const token = encodeURIComponent(capabilities.mediaServerToken)

    if (!isTranscodingStream) {
      return `${capabilities.mediaServerBaseUrl}/media/direct?token=${token}&path=${encodedPath}`
    }
    return `${capabilities.mediaServerBaseUrl}/media/stream?token=${token}&path=${encodedPath}&start=${seekOffset.toFixed(2)}&audioTrack=${activeAudioTrack}&sid=${streamSessionId}`
  },

  getArtworkUrl: (item) => {
    const { capabilities } = get()
    if (!item || !capabilities) return null
    return `${capabilities.mediaServerBaseUrl}/media/artwork?token=${encodeURIComponent(capabilities.mediaServerToken)}&path=${encodeURIComponent(item.filePath)}&kind=${item.kind}`
  },

  getLocalFileUrl: (filePath) => {
    const { capabilities } = get()
    if (!filePath || !capabilities) return null
    return `${capabilities.mediaServerBaseUrl}/media/file?token=${encodeURIComponent(capabilities.mediaServerToken)}&path=${encodeURIComponent(filePath)}`
  },

  getSubtitleUrl: (key) => {
    const { currentItem, capabilities } = get()
    if (!key || !capabilities) return null
    const token = encodeURIComponent(capabilities.mediaServerToken)
    if (key.startsWith('embedded:') && currentItem) {
      const streamIdx = key.slice('embedded:'.length)
      return `${capabilities.mediaServerBaseUrl}/media/subtitle?token=${token}&path=${encodeURIComponent(currentItem.filePath)}&stream=${streamIdx}`
    }
    if (key.startsWith('external:')) {
      const subPath = key.slice('external:'.length)
      return `${capabilities.mediaServerBaseUrl}/media/ext-subtitle?token=${token}&path=${encodeURIComponent(subPath)}`
    }
    return null
  }
}))
