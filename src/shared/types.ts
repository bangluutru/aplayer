export type MediaKind = 'video' | 'audio'

export type NavTab = 'player' | 'library' | 'downloader' | 'personalize'

export type SupportedPlatform =
  | 'youtube'
  | 'facebook'
  | 'x'
  | 'tiktok'
  | 'instagram'
  | 'threads'
  | 'other'

export type BrowserCookieSource =
  | 'none'
  | 'chrome'
  | 'safari'
  | 'firefox'
  | 'brave'
  | 'edge'
  | 'arc'

export type VisualizerStyle =
  | 'aurora-bars'
  | 'liquid-wave'
  | 'orbital-halo'
  | 'glass-mirror'
  | 'minimal-pulse'

export type RepeatMode = 'off' | 'all' | 'one'

export type LanguageCode = 'vi' | 'en'

export interface AudioTrackInfo {
  streamIndex: number
  audioIndex: number
  codec: string
  channels: number
  sampleRate?: number
  language?: string
  title?: string
}

export interface SubtitleTrackInfo {
  streamIndex?: number
  externalPath?: string
  codec?: string
  language?: string
  title: string
  isExternal: boolean
}

export interface ChapterInfo {
  title: string
  startTime: number
  endTime: number
}

export interface MediaProbeResult {
  filePath: string
  fileName: string
  ext: string
  kind: MediaKind
  sizeBytes: number
  duration: number
  bitrate?: number
  containerFormat: string
  videoCodec?: string
  audioCodec?: string
  width?: number
  height?: number
  fps?: number
  sampleRate?: number
  bitDepth?: number
  channels?: number
  title: string
  artist: string
  album: string
  year?: string
  genre?: string
  hasEmbeddedArtwork: boolean
  canDirectPlay: boolean
  needsVideoTranscode: boolean
  needsAudioTranscode: boolean
  audioTracks: AudioTrackInfo[]
  subtitleTracks: SubtitleTrackInfo[]
  chapters: ChapterInfo[]
  lrcPath?: string
}

export interface MediaItem {
  id: string
  filePath: string
  fileName: string
  ext: string
  kind: MediaKind
  title: string
  artist: string
  album: string
  duration: number
  sizeBytes: number
  width?: number
  height?: number
  videoCodec?: string
  audioCodec?: string
  bitrate?: number
  sampleRate?: number
  addedAt: number
  lastPlayedAt?: number
  lastPosition?: number
  playCount: number
  favorite: boolean
  sourcePlatform?: SupportedPlatform
  sourceUrl?: string
  isDownloaded?: boolean
}

export interface Playlist {
  id: string
  name: string
  description?: string
  itemIds: string[]
  createdAt: number
  updatedAt: number
}

export interface DownloadFormatOption {
  id: string
  label: string
  ext: string
  resolution?: string
  fps?: number
  filesizeApprox?: number
  vcodec?: string
  acodec?: string
  isAudioOnly: boolean
}

export interface AnalyzedMediaInfo {
  url: string
  platform: SupportedPlatform
  title: string
  uploader: string
  duration: number
  thumbnail?: string
  viewCount?: number
  description?: string
  isPlaylist: boolean
  playlistCount?: number
  extractorEngine: 'yt-dlp' | 'threads-native'
  directVideoUrl?: string
  formats: DownloadFormatOption[]
}

export type DownloadMode = 'video' | 'audio'
export type VideoQualityPreset = 'best' | '2160' | '1440' | '1080' | '720' | '480'
export type VideoContainerFormat = 'mp4' | 'mkv' | 'webm'
export type AudioOutputFormat = 'mp3' | 'm4a' | 'flac' | 'wav' | 'opus'

export type DownloadStatus =
  | 'queued'
  | 'analyzing'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'error'

export interface DownloadRequest {
  url: string
  mode: DownloadMode
  videoQuality: VideoQualityPreset
  videoContainer: VideoContainerFormat
  audioFormat: AudioOutputFormat
  outputDir: string
  organizeByPlatform: boolean
  embedSubtitles: boolean
  embedThumbnail: boolean
  cookieBrowser: BrowserCookieSource
  titleHint?: string
  thumbnailHint?: string
  uploaderHint?: string
  directVideoUrl?: string
  extractorEngine?: 'yt-dlp' | 'threads-native'
  allowPlaylist?: boolean
}

export interface DownloadTask {
  id: string
  url: string
  platform: SupportedPlatform
  title: string
  uploader?: string
  thumbnail?: string
  mode: DownloadMode
  qualityLabel: string
  outputDir: string
  outputFilePath?: string
  status: DownloadStatus
  progress: number
  speed?: string
  eta?: string
  totalSize?: string
  errorMessage?: string
  hintMessage?: string
  createdAt: number
  completedAt?: number
}

export interface EqualizerSettings {
  enabled: boolean
  presetId: string
  preampDb: number
  bands: number[] // 10 bands: 32, 64, 125, 250, 500, 1k, 2k, 4k, 8k, 16k Hz (-12 to +12 dB)
  volumeBoost: number // 1.0 to 2.0
  stereoBalance: number // -1.0 to 1.0
}

export interface VideoAdjustments {
  brightness: number // 0.5 - 1.5
  contrast: number // 0.5 - 1.5
  saturate: number // 0 - 2.0
}

export interface PersonalizationSettings {
  language: LanguageCode
  brandName: string
  brandTagline: string
  avatarDataUrl?: string
  avatarGlyph: string
  themeId: string
  customAccent?: string
  glassBlurPx: number // 8 - 40
  glassOpacity: number // 0.14 - 0.85
  glassBorderShine: number // 0.06 - 0.45
  cornerRadiusPx: number // 12 - 26
  enableNativeVibrancy: boolean
  enableAmbientGlow: boolean
  wallpaperPath?: string
  wallpaperBlurPx: number // 0 - 30
  wallpaperDim: number // 0 - 0.85
  fontFamily: 'vietnam' | 'system' | 'inter' | 'mono'
  visualizerStyle: VisualizerStyle
  compactSidebar: boolean
  videoDownloadDir: string
  audioDownloadDir: string
  organizeDownloadsByPlatform: boolean
  autoImportDownloads: boolean
  defaultCookieBrowser: BrowserCookieSource
  watchedFolders: string[]
  equalizer: EqualizerSettings
  subtitleSizePx: number
  subtitleColor: string
  subtitleBgOpacity: number
  rememberPlaybackPosition: boolean
}

export interface SystemCapabilities {
  platform: string
  arch: string
  ffmpegPath: string | null
  ffmpegVersion: string | null
  ffprobePath: string | null
  ytDlpPath: string | null
  ytDlpVersion: string | null
  denoPath: string | null
  mediaServerBaseUrl: string
  mediaServerToken: string
  defaultVideoDir: string
  defaultAudioDir: string
}

export interface LrcLine {
  time: number
  text: string
}
