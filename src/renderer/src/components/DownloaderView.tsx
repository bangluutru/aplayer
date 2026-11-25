import React, { useEffect, useMemo, useState } from 'react'
import { detectPlatformFromUrl, formatDuration, PLATFORM_METADATA } from '@shared/formats'
import { getDictionary } from '@shared/i18n'
import type {
  AnalyzedMediaInfo,
  AudioOutputFormat,
  BrowserCookieSource,
  DownloadMode,
  DownloadTask,
  SupportedPlatform,
  VideoContainerFormat,
  VideoQualityPreset
} from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import {
  BrandRaysAccent,
  IconAlertCircle,
  IconCheckCircle,
  IconChevronDown,
  IconChevronUp,
  IconClose,
  IconDownloader,
  IconExternal,
  IconFolder,
  IconLink,
  IconMusic,
  IconPaste,
  IconPlay,
  IconRefresh,
  IconSearch,
  IconShield,
  IconSpinner,
  IconStream,
  IconTrash,
  IconVideo,
  PlatformIcon
} from './icons/APlayerIcons'

const SUPPORTED_PLATFORMS: SupportedPlatform[] = [
  'youtube',
  'facebook',
  'x',
  'tiktok',
  'instagram',
  'threads'
]

const VIDEO_QUALITIES: Array<{ id: VideoQualityPreset; label: string }> = [
  { id: 'best', label: 'Best Auto' },
  { id: '2160', label: '4K · 2160p' },
  { id: '1440', label: '2K · 1440p' },
  { id: '1080', label: '1080p HD' },
  { id: '720', label: '720p' },
  { id: '480', label: '480p' }
]

const VIDEO_CONTAINERS: VideoContainerFormat[] = ['mp4', 'mkv', 'webm']
const AUDIO_FORMATS: Array<{ id: AudioOutputFormat; label: string }> = [
  { id: 'mp3', label: 'MP3 · 320k' },
  { id: 'm4a', label: 'M4A · AAC' },
  { id: 'flac', label: 'FLAC · Lossless' },
  { id: 'wav', label: 'WAV · PCM' },
  { id: 'opus', label: 'OPUS' }
]

const COOKIE_BROWSERS: Array<{ id: BrowserCookieSource; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'chrome', label: 'Google Chrome' },
  { id: 'safari', label: 'Safari' },
  { id: 'firefox', label: 'Firefox' },
  { id: 'arc', label: 'Arc' },
  { id: 'brave', label: 'Brave' },
  { id: 'edge', label: 'Microsoft Edge' }
]

export const DownloaderView: React.FC = () => {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const downloads = useAppStore((s) => s.downloads)
  const setDownloads = useAppStore((s) => s.setDownloads)
  const importPathsAndPlay = useAppStore((s) => s.importPathsAndPlay)
  const playRemoteStream = useAppStore((s) => s.playRemoteStream)
  const pushToast = useAppStore((s) => s.pushToast)

  const [url, setUrl] = useState('')
  const [mode, setMode] = useState<DownloadMode>('video')
  const [videoQuality, setVideoQuality] = useState<VideoQualityPreset>('1080')
  const [videoContainer, setVideoContainer] = useState<VideoContainerFormat>('mp4')
  const [audioFormat, setAudioFormat] = useState<AudioOutputFormat>('mp3')
  const [customOutputDir, setCustomOutputDir] = useState<string>('')
  const [cookieBrowser, setCookieBrowser] = useState<BrowserCookieSource>(
    settings.defaultCookieBrowser || 'none'
  )
  const [embedSubtitles, setEmbedSubtitles] = useState(false)
  const [embedThumbnail, setEmbedThumbnail] = useState(true)
  const [allowPlaylist, setAllowPlaylist] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const [analyzing, setAnalyzing] = useState(false)
  const [streamingLoading, setStreamingLoading] = useState(false)
  const [analyzedInfo, setAnalyzedInfo] = useState<AnalyzedMediaInfo | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const t = getDictionary(settings.language)

  useEffect(() => {
    setCookieBrowser(settings.defaultCookieBrowser || 'none')
  }, [settings.defaultCookieBrowser])

  const detectedPlatform = useMemo(() => detectPlatformFromUrl(url), [url])
  const effectiveOutputDir =
    customOutputDir || (mode === 'audio' ? settings.audioDownloadDir : settings.videoDownloadDir)

  const handlePaste = async (): Promise<void> => {
    try {
      const clip = await window.aplayerAPI.readClipboardText()
      if (clip?.trim()) {
        setUrl(clip.trim())
        setAnalyzedInfo(null)
        setAnalyzeError(null)
      }
    } catch {
      // ignore
    }
  }

  const handleAnalyze = async (): Promise<void> => {
    const trimmed = url.trim()
    if (!trimmed) return
    setAnalyzing(true)
    setAnalyzeError(null)
    setAnalyzedInfo(null)
    try {
      const info = await window.aplayerAPI.analyzeUrl(trimmed, cookieBrowser)
      setAnalyzedInfo(info)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : String(err))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleStreamDirectly = async (): Promise<void> => {
    const trimmed = url.trim()
    if (!trimmed) return
    setStreamingLoading(true)
    try {
      if (analyzedInfo?.directVideoUrl) {
        playRemoteStream({
          streamUrl: analyzedInfo.directVideoUrl,
          sourceUrl: trimmed,
          title: analyzedInfo.title,
          uploader: analyzedInfo.uploader,
          thumbnail: analyzedInfo.thumbnail,
          platform: analyzedInfo.platform
        })
        return
      }
      const resolved = await window.aplayerAPI.resolveDirectStream(trimmed, cookieBrowser)
      playRemoteStream({
        streamUrl: resolved.streamUrl,
        sourceUrl: trimmed,
        title: analyzedInfo?.title || resolved.title,
        uploader: analyzedInfo?.uploader || resolved.uploader,
        thumbnail: analyzedInfo?.thumbnail || resolved.thumbnail,
        platform: resolved.platform
      })
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Unable to stream URL directly', 'error')
    } finally {
      setStreamingLoading(false)
    }
  }

  const handlePickFolder = async (): Promise<void> => {
    const picked = await window.aplayerAPI.openFolderDialog(effectiveOutputDir)
    if (!picked) return
    setCustomOutputDir(picked)
    if (mode === 'audio') {
      await updateSettings({ audioDownloadDir: picked })
    } else {
      await updateSettings({ videoDownloadDir: picked })
    }
    pushToast(
      settings.language === 'vi' ? `Đã đặt thư mục lưu: ${picked}` : `Save folder updated: ${picked}`,
      'success'
    )
  }

  const handleStartDownload = async (): Promise<void> => {
    const trimmed = url.trim()
    if (!trimmed) return
    if (!effectiveOutputDir) {
      pushToast(
        settings.language === 'vi' ? 'Vui lòng chọn thư mục lưu file' : 'Please pick a destination folder',
        'error'
      )
      return
    }

    try {
      await window.aplayerAPI.startDownload({
        url: trimmed,
        mode,
        videoQuality,
        videoContainer,
        audioFormat,
        outputDir: effectiveOutputDir,
        organizeByPlatform: settings.organizeDownloadsByPlatform,
        embedSubtitles,
        embedThumbnail,
        cookieBrowser,
        titleHint: analyzedInfo?.title,
        thumbnailHint: analyzedInfo?.thumbnail,
        uploaderHint: analyzedInfo?.uploader,
        directVideoUrl: analyzedInfo?.directVideoUrl,
        extractorEngine: analyzedInfo?.extractorEngine,
        allowPlaylist
      })
      pushToast(
        settings.language === 'vi' ? 'Đã bắt đầu tải xuống' : 'Download started',
        'success'
      )
      setUrl('')
      setAnalyzedInfo(null)
      setAnalyzeError(null)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Download error', 'error')
    }
  }

  const handleRetryTask = async (task: DownloadTask): Promise<void> => {
    await window.aplayerAPI.startDownload({
      url: task.url,
      mode: task.mode,
      videoQuality,
      videoContainer,
      audioFormat,
      outputDir: task.mode === 'audio' ? settings.audioDownloadDir : settings.videoDownloadDir,
      organizeByPlatform: settings.organizeDownloadsByPlatform,
      embedSubtitles,
      embedThumbnail,
      cookieBrowser,
      titleHint: task.title,
      thumbnailHint: task.thumbnail,
      uploaderHint: task.uploader
    })
  }

  const getStatusLabel = (status: DownloadTask['status']): string => {
    const map: Record<DownloadTask['status'], string> = {
      queued: t.downloader.statusQueued,
      analyzing: t.downloader.statusAnalyzing,
      downloading: t.downloader.statusDownloading,
      processing: t.downloader.statusProcessing,
      completed: t.downloader.statusCompleted,
      cancelled: t.downloader.statusCancelled,
      error: t.downloader.statusError
    }
    return map[status]
  }

  return (
    <div className="glass-panel flex-1 flex flex-col overflow-hidden p-5 md:p-6 gap-5">
      {/* Header + Bespoke Vector Platform Badges */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-xl font-extrabold tracking-tight">{t.downloader.title}</h1>
          <p className="text-xs text-[var(--text-muted)]">{t.downloader.subtitle}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {SUPPORTED_PLATFORMS.map((p) => {
            const meta = PLATFORM_METADATA[p]
            const active = url.trim().length > 0 && detectedPlatform === p
            return (
              <span
                key={p}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
                  active
                    ? `bg-gradient-to-r ${meta.gradient} text-white border-white/35 shadow-md`
                    : 'bg-[var(--glass-btn-bg)] border-[var(--glass-track-bg)] text-[var(--text-secondary)]'
                }`}
              >
                <PlatformIcon platform={p} size={12} />
                {meta.name}
              </span>
            )
          })}
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5">
        {/* Hero Download Composer Glass Card */}
        <div className="glass-card p-5 space-y-4">
          {/* URL Input Row */}
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--accent)]">
                {url.trim() ? <PlatformIcon platform={detectedPlatform} size={16} /> : <IconLink size={16} />}
              </span>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (analyzedInfo && e.target.value.trim() !== analyzedInfo.url) {
                    setAnalyzedInfo(null)
                  }
                  setAnalyzeError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) {
                    void handleAnalyze()
                  }
                }}
                placeholder={t.downloader.urlPlaceholder}
                className="glass-input w-full pl-10 pr-24 py-2.5 rounded-xl text-sm"
              />
              <button
                type="button"
                onClick={() => void handlePaste()}
                className="absolute right-2 top-1/2 -translate-y-1/2 glass-btn px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1"
              >
                <IconPaste size={13} />
                {t.downloader.paste}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!url.trim() || analyzing}
                onClick={() => void handleAnalyze()}
                className="glass-btn px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45"
              >
                {analyzing ? (
                  <IconSpinner size={15} className="text-[var(--accent)]" />
                ) : (
                  <IconSearch size={15} className="text-[var(--accent)]" />
                )}
                {analyzing ? t.downloader.analyzing : t.downloader.analyze}
              </button>

              <button
                type="button"
                disabled={!url.trim() || streamingLoading}
                onClick={() => void handleStreamDirectly()}
                className="glass-btn px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45"
                title={t.downloader.streamPreview}
              >
                {streamingLoading ? (
                  <IconSpinner size={15} />
                ) : (
                  <IconStream size={15} className="text-[#10B981]" />
                )}
                <span className="hidden lg:inline">{t.downloader.streamPreview}</span>
              </button>

              <button
                type="button"
                disabled={!url.trim()}
                onClick={() => void handleStartDownload()}
                className="glass-btn-accent px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-45"
              >
                <IconDownloader size={15} />
                {t.downloader.downloadNow}
              </button>
            </div>
          </div>

          {/* Detected Threads / Cookie Contextual Hint */}
          {url.trim() && detectedPlatform === 'threads' && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-primary)] bg-[var(--glass-btn-bg)] border border-[var(--glass-track-bg)] rounded-xl px-3.5 py-2">
              <BrandRaysAccent size={14} className="shrink-0" />
              <span>{t.downloader.threadsNotice}</span>
            </div>
          )}

          {url.trim() && PLATFORM_METADATA[detectedPlatform].oftenNeedsCookies && cookieBrowser === 'none' && (
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-primary)] bg-amber-500/12 border border-amber-400/30 rounded-xl px-3.5 py-2">
              <div className="flex items-center gap-2">
                <IconShield size={15} className="shrink-0 text-[#FFC247]" />
                <span>{t.downloader.cookieTip}</span>
              </div>
              <button
                onClick={() => setShowAdvanced(true)}
                className="text-[11px] underline shrink-0 font-semibold"
              >
                {t.downloader.advanced}
              </button>
            </div>
          )}

          {/* Analyze Error */}
          {analyzeError && (
            <div className="flex items-start gap-2.5 text-xs text-rose-300 bg-rose-500/12 border border-rose-400/25 rounded-xl p-3">
              <IconAlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <span className="whitespace-pre-line leading-relaxed">{analyzeError}</span>
            </div>
          )}

          {/* Analyzed Rich Preview Card */}
          {analyzedInfo && (
            <div className="glass-elevated p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {analyzedInfo.thumbnail && (
                <img
                  src={analyzedInfo.thumbnail}
                  alt={analyzedInfo.title}
                  className="w-36 aspect-video object-cover rounded-xl border border-white/15 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-gradient-to-r ${PLATFORM_METADATA[analyzedInfo.platform].gradient} inline-flex items-center gap-1`}
                  >
                    <PlatformIcon platform={analyzedInfo.platform} size={11} />
                    {PLATFORM_METADATA[analyzedInfo.platform].name}
                  </span>
                  {analyzedInfo.duration > 0 && (
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {formatDuration(analyzedInfo.duration)}
                    </span>
                  )}
                  {analyzedInfo.isPlaylist && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-[#FFC247]">
                      Playlist ({analyzedInfo.playlistCount} items)
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold line-clamp-2">{analyzedInfo.title}</div>
                <div className="text-xs text-[var(--text-muted)]">{analyzedInfo.uploader}</div>
              </div>
            </div>
          )}

          {/* Mode Toggle + Quality/Format + Destination Folder Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
            {/* Mode Switcher */}
            <div className="lg:col-span-3 space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Mode
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('video')
                    setCustomOutputDir('')
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                    mode === 'video' ? 'glass-btn-accent' : 'glass-btn'
                  }`}
                >
                  <IconVideo size={15} className="shrink-0" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('audio')
                    setCustomOutputDir('')
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition ${
                    mode === 'audio' ? 'glass-btn-accent' : 'glass-btn'
                  }`}
                >
                  <IconMusic size={15} className="shrink-0" />
                  <span>Audio</span>
                </button>
              </div>
            </div>

            {/* Quality & Format Chips */}
            <div className="lg:col-span-5 space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {mode === 'video' ? `${t.downloader.quality} & ${t.downloader.container}` : t.downloader.audioFormat}
              </div>

              {mode === 'video' ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {VIDEO_QUALITIES.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setVideoQuality(q.id)}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition ${
                          videoQuality === q.id ? 'glass-btn-accent' : 'glass-btn'
                        }`}
                      >
                        {q.id === 'best' ? t.downloader.bestQuality : q.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {VIDEO_CONTAINERS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setVideoContainer(c)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono uppercase transition ${
                          videoContainer === c
                            ? 'bg-[var(--glass-btn-hover)] text-[var(--accent)] border border-[var(--accent)]/60 font-semibold'
                            : 'glass-btn opacity-75'
                        }`}
                      >
                        .{c}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {AUDIO_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAudioFormat(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition ${
                        audioFormat === f.id ? 'glass-btn-accent' : 'glass-btn'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Folder Selector */}
            <div className="lg:col-span-4 space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {mode === 'audio' ? t.downloader.saveToAudio : t.downloader.saveToVideo}
              </div>
              <div className="glass-input rounded-xl px-3 py-2 flex items-center gap-2">
                <IconFolder size={15} className="text-[var(--accent)] shrink-0" />
                <span className="text-xs truncate flex-1 font-mono" title={effectiveOutputDir}>
                  {effectiveOutputDir || '—'}
                </span>
                <button
                  type="button"
                  onClick={() => void handlePickFolder()}
                  className="glass-btn px-2.5 py-1 rounded-lg text-[11px] font-medium shrink-0"
                >
                  {t.downloader.changeFolder}
                </button>
                <button
                  type="button"
                  onClick={() => void window.aplayerAPI.openFolderInFinder(effectiveOutputDir)}
                  className="p-1 rounded-lg hover:bg-[var(--glass-btn-bg)] shrink-0"
                  title={t.downloader.showFinder}
                >
                  <IconExternal size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Collapsible Advanced Options */}
          <div className="pt-2 border-t border-[var(--glass-track-bg)]">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {showAdvanced ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
              {t.downloader.advanced}
              {cookieBrowser !== 'none' && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-[#10B981]">
                  Cookies: {cookieBrowser}
                </span>
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-[var(--text-muted)] block">
                    {t.downloader.cookieBrowser}
                  </label>
                  <select
                    value={cookieBrowser}
                    onChange={(e) => {
                      const val = e.target.value as BrowserCookieSource
                      setCookieBrowser(val)
                      void updateSettings({ defaultCookieBrowser: val })
                    }}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  >
                    {COOKIE_BROWSERS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id === 'none' ? t.downloader.cookieNone : b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-center gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.organizeDownloadsByPlatform}
                      onChange={(e) =>
                        void updateSettings({ organizeDownloadsByPlatform: e.target.checked })
                      }
                      className="accent-[var(--accent)]"
                    />
                    <span>{t.downloader.organizePlatform}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={embedThumbnail}
                      onChange={(e) => setEmbedThumbnail(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span>{t.downloader.embedThumb}</span>
                  </label>
                  {mode === 'video' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={embedSubtitles}
                        onChange={(e) => setEmbedSubtitles(e.target.checked)}
                        className="accent-[var(--accent)]"
                      />
                      <span>{t.downloader.embedSubs}</span>
                    </label>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPlaylist}
                      onChange={(e) => setAllowPlaylist(e.target.checked)}
                      className="accent-[var(--accent)]"
                    />
                    <span>{t.downloader.allowPlaylist}</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Download Queue & History */}
        <div className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold">
              {t.downloader.queueTitle} ({downloads.length})
            </h2>
            {downloads.some((d) => d.status === 'completed' || d.status === 'cancelled' || d.status === 'error') && (
              <button
                onClick={async () => {
                  const remaining = await window.aplayerAPI.clearCompletedDownloads()
                  setDownloads(remaining)
                }}
                className="glass-btn px-3 py-1.5 rounded-xl text-[11px] font-medium"
              >
                {t.downloader.clearCompleted}
              </button>
            )}
          </div>

          {downloads.length === 0 ? (
            <div className="glass-card p-8 text-center text-xs text-[var(--text-muted)]">
              {t.downloader.emptyQueue}
            </div>
          ) : (
            <div className="space-y-2.5">
              {downloads.map((task) => {
                const pMeta = PLATFORM_METADATA[task.platform]
                const isActive =
                  task.status === 'downloading' ||
                  task.status === 'analyzing' ||
                  task.status === 'processing' ||
                  task.status === 'queued'

                return (
                  <div key={task.id} className="glass-card p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {task.thumbnail ? (
                          <img
                            src={task.thumbnail}
                            alt={task.title}
                            className="w-16 h-11 rounded-lg object-cover border border-white/15 shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${pMeta.gradient} flex items-center justify-center text-white shrink-0`}
                          >
                            <PlatformIcon platform={task.platform} size={18} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{task.title}</div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)] mt-0.5">
                            <span style={{ color: pMeta.color }} className="font-semibold">
                              {pMeta.name}
                            </span>
                            <span>·</span>
                            <span className="font-mono">{task.qualityLabel}</span>
                            <span>·</span>
                            <span className="truncate max-w-[220px]" title={task.outputDir}>
                              {task.outputDir}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {task.status === 'completed' && task.outputFilePath && (
                          <>
                            <button
                              onClick={() => void importPathsAndPlay([task.outputFilePath!], true)}
                              className="glass-btn-accent px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1"
                            >
                              <IconPlay size={12} />
                              {t.downloader.playFile}
                            </button>
                            <button
                              onClick={() => void window.aplayerAPI.showInFinder(task.outputFilePath!)}
                              className="glass-btn px-2.5 py-1.5 rounded-xl text-[11px] flex items-center gap-1"
                              title={t.downloader.showFinder}
                            >
                              <IconFolder size={13} />
                            </button>
                          </>
                        )}

                        {isActive && (
                          <button
                            onClick={async () => {
                              const next = await window.aplayerAPI.cancelDownload(task.id)
                              setDownloads(next)
                            }}
                            className="glass-btn px-2.5 py-1.5 rounded-xl text-[11px] text-rose-400 flex items-center gap-1"
                          >
                            <IconClose size={13} />
                            {t.downloader.cancel}
                          </button>
                        )}

                        {(task.status === 'error' || task.status === 'cancelled') && (
                          <button
                            onClick={() => void handleRetryTask(task)}
                            className="glass-btn px-2.5 py-1.5 rounded-xl text-[11px] flex items-center gap-1"
                          >
                            <IconRefresh size={13} />
                            {t.downloader.retry}
                          </button>
                        )}

                        <button
                          onClick={async () => {
                            const next = await window.aplayerAPI.removeDownload(task.id)
                            setDownloads(next)
                          }}
                          className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] text-[var(--text-muted)]"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium">
                          {task.status === 'completed' && (
                            <IconCheckCircle size={14} className="text-[#10B981]" />
                          )}
                          {task.status === 'error' && (
                            <IconAlertCircle size={14} className="text-rose-400" />
                          )}
                          {isActive && <IconSpinner size={14} className="text-[var(--accent)]" />}
                          {getStatusLabel(task.status)}
                        </span>
                        <span className="font-mono text-[var(--text-secondary)]">
                          {task.progress.toFixed(1)}%
                          {task.speed ? ` · ${task.speed}` : ''}
                          {task.totalSize ? ` · ${task.totalSize}` : ''}
                          {task.eta ? ` · ETA ${task.eta}` : ''}
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-[var(--glass-track-bg)] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${
                            task.status === 'error'
                              ? 'bg-rose-500'
                              : task.status === 'completed'
                                ? 'bg-[#10B981]'
                                : 'bg-gradient-to-r from-[var(--accent)] to-[#FFC247]'
                          }`}
                          style={{ width: `${Math.max(isActive ? 4 : 0, task.progress)}%` }}
                        />
                      </div>
                    </div>

                    {task.errorMessage && (
                      <div className="text-[11px] text-rose-300 bg-rose-500/12 border border-rose-400/20 rounded-xl p-2.5 space-y-1">
                        <div className="font-mono break-all">{task.errorMessage}</div>
                        {task.hintMessage && (
                          <div className="text-[#FFC247] font-sans">{task.hintMessage}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
