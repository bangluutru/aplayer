import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatDuration, formatFileSize, parseLrc } from '@shared/formats'
import { getDictionary } from '@shared/i18n'
import { getThemePreset } from '@shared/themes'
import type { LrcLine, VisualizerStyle } from '@shared/types'
import { audioDspEngine } from '../engine/audioEngine'
import { mediaController } from '../engine/mediaController'
import { useAppStore } from '../store/useAppStore'
import { AudioVisualizer } from './AudioVisualizer'
import {
  BrandEmblem,
  IconCamera,
  IconClock,
  IconClose,
  IconColorAdjust,
  IconDownloader,
  IconEqualizer,
  IconExitFullscreen,
  IconFolder,
  IconFullscreen,
  IconHeart,
  IconInfo,
  IconLibrary,
  IconMusic,
  IconNext,
  IconPause,
  IconPip,
  IconPlay,
  IconPrev,
  IconQueue,
  IconRepeat,
  IconRepeatOne,
  IconReset,
  IconShuffle,
  IconSpeed,
  IconSubtitles,
  IconUpload,
  IconVideo,
  IconVolume,
  IconVolumeMute,
  IconWaveform
} from './icons/APlayerIcons'

interface NowPlayingViewProps {
  visible: boolean
  onOpenFiles: () => void
}

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]
const VISUALIZER_STYLES: Array<{ id: VisualizerStyle; label: string }> = [
  { id: 'aurora-bars', label: 'Aurora Bars' },
  { id: 'liquid-wave', label: 'Liquid Wave' },
  { id: 'orbital-halo', label: 'Orbital Halo' },
  { id: 'glass-mirror', label: 'Glass Mirror' },
  { id: 'minimal-pulse', label: 'Pulse Rings' }
]

export const NowPlayingView: React.FC<NowPlayingViewProps> = ({ visible, onOpenFiles }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const hideControlsTimer = useRef<number | null>(null)
  const isHoveringControlsRef = useRef<boolean>(false)
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: -1, y: -1 })
  const lastSavedPosRef = useRef<number>(0)
  const lastUiTimeUpdateRef = useRef<number>(0)

  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const currentItem = useAppStore((s) => s.currentItem)
  const currentProbe = useAppStore((s) => s.currentProbe)
  const remoteStream = useAppStore((s) => s.remoteStream)
  const queue = useAppStore((s) => s.queue)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const currentTime = useAppStore((s) => s.currentTime)
  const duration = useAppStore((s) => s.duration)
  const seekOffset = useAppStore((s) => s.seekOffset)
  const isTranscodingStream = useAppStore((s) => s.isTranscodingStream)
  const streamSessionId = useAppStore((s) => s.streamSessionId)
  const volume = useAppStore((s) => s.volume)
  const muted = useAppStore((s) => s.muted)
  const playbackRate = useAppStore((s) => s.playbackRate)
  const repeatMode = useAppStore((s) => s.repeatMode)
  const shuffle = useAppStore((s) => s.shuffle)
  const activeAudioTrack = useAppStore((s) => s.activeAudioTrack)
  const activeSubtitleKey = useAppStore((s) => s.activeSubtitleKey)
  const customSubtitlePaths = useAppStore((s) => s.customSubtitlePaths)
  const abLoop = useAppStore((s) => s.abLoop)
  const videoFilters = useAppStore((s) => s.videoFilters)
  const sleepTimerEndAt = useAppStore((s) => s.sleepTimerEndAt)
  const showQueueDrawer = useAppStore((s) => s.showQueueDrawer)

  const setIsPlaying = useAppStore((s) => s.setIsPlaying)
  const setCurrentTime = useAppStore((s) => s.setCurrentTime)
  const setDuration = useAppStore((s) => s.setDuration)
  const setSeekOffset = useAppStore((s) => s.setSeekOffset)
  const setVolume = useAppStore((s) => s.setVolume)
  const setMuted = useAppStore((s) => s.setMuted)
  const setPlaybackRate = useAppStore((s) => s.setPlaybackRate)
  const cycleRepeatMode = useAppStore((s) => s.cycleRepeatMode)
  const toggleShuffle = useAppStore((s) => s.toggleShuffle)
  const setActiveAudioTrack = useAppStore((s) => s.setActiveAudioTrack)
  const setActiveSubtitleKey = useAppStore((s) => s.setActiveSubtitleKey)
  const addCustomSubtitle = useAppStore((s) => s.addCustomSubtitle)
  const setAbLoopPoint = useAppStore((s) => s.setAbLoopPoint)
  const setVideoFilters = useAppStore((s) => s.setVideoFilters)
  const resetVideoFilters = useAppStore((s) => s.resetVideoFilters)
  const setSleepTimerMinutes = useAppStore((s) => s.setSleepTimerMinutes)
  const setShowEqModal = useAppStore((s) => s.setShowEqModal)
  const setShowQueueDrawer = useAppStore((s) => s.setShowQueueDrawer)
  const playMediaItem = useAppStore((s) => s.playMediaItem)
  const playNext = useAppStore((s) => s.playNext)
  const playPrevious = useAppStore((s) => s.playPrevious)
  const clearQueue = useAppStore((s) => s.clearQueue)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const pushToast = useAppStore((s) => s.pushToast)
  const getMediaPlaybackUrl = useAppStore((s) => s.getMediaPlaybackUrl)
  const getArtworkUrl = useAppStore((s) => s.getArtworkUrl)
  const getSubtitleUrl = useAppStore((s) => s.getSubtitleUrl)
  const capabilities = useAppStore((s) => s.capabilities)

  const [controlsVisible, setControlsVisible] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [openPopover, setOpenPopover] = useState<
    null | 'tracks' | 'subs' | 'speed' | 'filters' | 'info' | 'sleep'
  >(null)
  const [artworkBroken, setArtworkBroken] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [lrcLines, setLrcLines] = useState<LrcLine[]>([])
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null)
  const [hoverSeekPct, setHoverSeekPct] = useState<number>(0)
  const [isBuffering, setIsBuffering] = useState(false)
  const [activeSubtitleText, setActiveSubtitleText] = useState<string>('')

  const t = getDictionary(settings.language)
  const theme = getThemePreset(settings.themeId)
  const accent = settings.customAccent || theme.accent

  const playbackUrl = useMemo(
    () => getMediaPlaybackUrl(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentItem, remoteStream, isTranscodingStream, seekOffset, activeAudioTrack, streamSessionId, capabilities]
  )

  const artworkUrl = useMemo(
    () => (remoteStream?.thumbnail ? remoteStream.thumbnail : getArtworkUrl(currentItem)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentItem, remoteStream, capabilities]
  )

  const subtitleUrl = useMemo(
    () => getSubtitleUrl(activeSubtitleKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSubtitleKey, currentItem, capabilities]
  )

  const isVideoMode = Boolean(remoteStream) || currentItem?.kind === 'video'
  const hasMedia = Boolean(currentItem || remoteStream)

  useEffect(() => {
    setArtworkBroken(false)
  }, [currentItem?.id, remoteStream?.id])

  // Load .lrc synced lyrics if probe detected one
  useEffect(() => {
    setLrcLines([])
    if (!currentProbe?.lrcPath || !capabilities) return
    const url = `${capabilities.mediaServerBaseUrl}/media/lrc?token=${encodeURIComponent(capabilities.mediaServerToken)}&path=${encodeURIComponent(currentProbe.lrcPath)}`
    fetch(url)
      .then((r) => (r.ok ? r.text() : ''))
      .then((txt) => {
        if (txt) setLrcLines(parseLrc(txt))
      })
      .catch(() => {})
  }, [currentProbe?.lrcPath, capabilities])

  // Attach Web Audio DSP engine once to <video>
  useEffect(() => {
    const el = videoRef.current
    if (!el || !playbackUrl) return
    if (!remoteStream) {
      audioDspEngine.attachMediaElement(el)
      audioDspEngine.applyEqualizer(settings.equalizer)
    }
  }, [playbackUrl, remoteStream, settings.equalizer])

  // Sync volume, mute, playbackRate
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.volume = muted ? 0 : volume
    el.muted = muted
  }, [volume, muted])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.playbackRate = playbackRate
  }, [playbackRate, playbackUrl])

  // Auto-play when source changes
  useEffect(() => {
    const el = videoRef.current
    if (!el || !playbackUrl) return
    setIsBuffering(true)
    const resumeTarget = !isTranscodingStream && currentTime > 1 && seekOffset === 0 ? currentTime : 0

    const onCanPlay = (): void => {
      setIsBuffering(false)
      if (resumeTarget > 0 && Math.abs(el.currentTime - resumeTarget) > 1.5 && el.duration > resumeTarget + 2) {
        try {
          el.currentTime = resumeTarget
        } catch {
          // ignore
        }
      }
      if (useAppStore.getState().isPlaying) {
        void audioDspEngine.resume()
        void el.play().catch(() => {
          setIsPlaying(false)
        })
      }
    }

    el.addEventListener('canplay', onCanPlay, { once: true })
    el.load()
    return () => {
      el.removeEventListener('canplay', onCanPlay)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackUrl])

  // Sync play/pause state
  useEffect(() => {
    const el = videoRef.current
    if (!el || !playbackUrl) return
    if (isPlaying) {
      void audioDspEngine.resume()
      if (el.paused) {
        void el.play().catch(() => {})
      }
    } else if (!el.paused) {
      el.pause()
    }
  }, [isPlaying, playbackUrl])

  // Sleep timer monitor
  useEffect(() => {
    if (!sleepTimerEndAt) return
    const timer = window.setInterval(() => {
      if (Date.now() >= sleepTimerEndAt) {
        setIsPlaying(false)
        setSleepTimerMinutes(null)
        pushToast(
          settings.language === 'vi' ? 'Đã dừng phát theo hẹn giờ ngủ' : 'Paused by Sleep Timer',
          'info'
        )
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [sleepTimerEndAt, setIsPlaying, setSleepTimerMinutes, pushToast, settings.language])

  // macOS Now Playing / Media Session integration
  useEffect(() => {
    if (!('mediaSession' in navigator) || !hasMedia) return
    const title = currentItem?.title || remoteStream?.title || 'APlayer'
    const artist = currentItem?.artist || remoteStream?.uploader || 'APlayer'
    const album = currentItem?.album || ''

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: artworkUrl && !artworkBroken ? [{ src: artworkUrl, sizes: '512x512', type: 'image/jpeg' }] : []
    })
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [currentItem, remoteStream, artworkUrl, artworkBroken, isPlaying, hasMedia])

  const seekTo = useCallback(
    (targetSeconds: number) => {
      const el = videoRef.current
      const state = useAppStore.getState()
      const maxDur = state.duration || el?.duration || 0
      const clamped = Math.max(0, maxDur > 0 ? Math.min(targetSeconds, maxDur) : Math.max(0, targetSeconds))

      if (state.isTranscodingStream) {
        setSeekOffset(clamped, true)
      } else if (el) {
        try {
          el.currentTime = clamped
          setCurrentTime(clamped)
        } catch {
          // ignore
        }
      }
    },
    [setCurrentTime, setSeekOffset]
  )

  const togglePlay = useCallback(() => {
    if (!useAppStore.getState().currentItem && !useAppStore.getState().remoteStream) return
    setIsPlaying(!useAppStore.getState().isPlaying)
  }, [setIsPlaying])

  const seekRelative = useCallback(
    (delta: number) => {
      seekTo(useAppStore.getState().currentTime + delta)
    },
    [seekTo]
  )

  const toggleFullscreen = useCallback(() => {
    const target = stageRef.current
    if (!target) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void target.requestFullscreen().catch(() => {})
    }
  }, [])

  const togglePiP = useCallback(() => {
    const el = videoRef.current
    if (!el || !isVideoMode) return
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture()
    } else if (document.pictureInPictureEnabled) {
      void el.requestPictureInPicture().catch(() => {})
    }
  }, [isVideoMode])

  const captureScreenshot = useCallback(async () => {
    const el = videoRef.current
    if (!el || !isVideoMode || el.videoWidth === 0) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = el.videoWidth
      canvas.height = el.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/png')
      const baseTitle = (currentItem?.title || remoteStream?.title || 'frame')
        .replace(/[^a-zA-Z0-9_-]+/g, '_')
        .slice(0, 40)
      const saved = await window.aplayerAPI.saveScreenshot(
        dataUrl,
        `${baseTitle}_${Math.floor(currentTime)}s`
      )
      if (saved) {
        pushToast(
          settings.language === 'vi' ? 'Đã lưu ảnh chụp khung hình' : 'Frame screenshot saved',
          'success'
        )
      }
    } catch {
      pushToast(
        settings.language === 'vi' ? 'Không thể chụp khung hình này' : 'Could not capture frame',
        'error'
      )
    }
  }, [isVideoMode, currentItem, remoteStream, currentTime, pushToast, settings.language])

  useEffect(() => {
    mediaController.register({
      togglePlay,
      seekTo,
      seekRelative,
      toggleFullscreen,
      togglePiP,
      captureScreenshot
    })
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true))
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false))
      navigator.mediaSession.setActionHandler('previoustrack', () => void playPrevious())
      navigator.mediaSession.setActionHandler('nexttrack', () => void playNext())
    }
    return () => mediaController.unregister()
  }, [togglePlay, seekTo, seekRelative, toggleFullscreen, togglePiP, captureScreenshot, setIsPlaying, playNext, playPrevious])

  useEffect(() => {
    const onFsChange = (): void => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // =========================================================================
  // ZERO-FLICKER CINEMA OSD VISIBILITY CONTROLLER
  // 1) Ignores synthetic mousemove at identical pixel coordinates
  // 2) Locks controls visible while hovering top bar, bottom dock, or popover
  // 3) Cleanly clears pending timers on unmount / state change
  // =========================================================================
  const scheduleHideControls = useCallback(() => {
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current)
      hideControlsTimer.current = null
    }
    if (isVideoMode && isPlaying && !openPopover && !showQueueDrawer && !isHoveringControlsRef.current) {
      hideControlsTimer.current = window.setTimeout(() => {
        if (!isHoveringControlsRef.current) {
          setControlsVisible(false)
        }
      }, 3000)
    }
  }, [isVideoMode, isPlaying, openPopover, showQueueDrawer])

  const handleStageMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isVideoMode) return
      const dx = Math.abs(e.clientX - lastMousePosRef.current.x)
      const dy = Math.abs(e.clientY - lastMousePosRef.current.y)
      // Ignore synthetic sub-3px mousemove events triggered by fade-out / layout changes
      if (dx < 3 && dy < 3) return
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }

      setControlsVisible((prev) => (prev ? prev : true))
      scheduleHideControls()
    },
    [isVideoMode, scheduleHideControls]
  )

  const handleStageMouseLeave = useCallback(() => {
    isHoveringControlsRef.current = false
    scheduleHideControls()
  }, [scheduleHideControls])

  const handleControlsMouseEnter = useCallback(() => {
    isHoveringControlsRef.current = true
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current)
      hideControlsTimer.current = null
    }
    setControlsVisible(true)
  }, [])

  const handleControlsMouseLeave = useCallback(() => {
    isHoveringControlsRef.current = false
    scheduleHideControls()
  }, [scheduleHideControls])

  useEffect(() => {
    if (!isPlaying || !isVideoMode || openPopover || showQueueDrawer) {
      setControlsVisible(true)
      if (hideControlsTimer.current) {
        window.clearTimeout(hideControlsTimer.current)
        hideControlsTimer.current = null
      }
    } else {
      scheduleHideControls()
    }
    return () => {
      if (hideControlsTimer.current) {
        window.clearTimeout(hideControlsTimer.current)
        hideControlsTimer.current = null
      }
    }
  }, [isPlaying, isVideoMode, openPopover, showQueueDrawer, scheduleHideControls])

  const handleTimeUpdate = (): void => {
    const el = videoRef.current
    if (!el) return
    const trueTime = isTranscodingStream ? seekOffset + el.currentTime : el.currentTime

    // Enforce A-B Loop immediately
    if (abLoop.a !== null && abLoop.b !== null && trueTime >= abLoop.b) {
      seekTo(abLoop.a)
      return
    }

    // Throttle store state updates to ~5Hz so OSD never re-render-storms over hardware video
    const now = performance.now()
    if (now - lastUiTimeUpdateRef.current >= 180 || Math.abs(trueTime - currentTime) >= 0.4) {
      lastUiTimeUpdateRef.current = now
      setCurrentTime(trueTime)
    }

    if (currentItem && Math.abs(trueTime - lastSavedPosRef.current) >= 5) {
      lastSavedPosRef.current = trueTime
      void window.aplayerAPI?.recordPlayback(currentItem.id, trueTime, false)
    }
  }

  // Keep custom glass subtitle overlay synced with active WebVTT cues
  useEffect(() => {
    setActiveSubtitleText('')
    const el = videoRef.current
    if (!el || !subtitleUrl) return

    const syncTrack = (): void => {
      const track = el.textTracks[0]
      if (!track) return
      track.mode = 'hidden'
      const updateCue = (): void => {
        const cues = track.activeCues
        if (!cues || cues.length === 0) {
          setActiveSubtitleText('')
          return
        }
        const texts: string[] = []
        for (let i = 0; i < cues.length; i++) {
          const cue = cues[i] as VTTCue
          if (cue.text) texts.push(cue.text.replace(/<[^>]+>/g, ''))
        }
        setActiveSubtitleText(texts.join('\n'))
      }
      track.oncuechange = updateCue
      updateCue()
    }

    const timer = window.setTimeout(syncTrack, 250)
    el.addEventListener('loadedmetadata', syncTrack)
    return () => {
      window.clearTimeout(timer)
      el.removeEventListener('loadedmetadata', syncTrack)
      if (el.textTracks[0]) {
        el.textTracks[0].oncuechange = null
      }
    }
  }, [subtitleUrl, playbackUrl])

  const handleLoadedMetadata = (): void => {
    const el = videoRef.current
    if (!el) return
    if (Number.isFinite(el.duration) && el.duration > 0 && !isTranscodingStream) {
      setDuration(el.duration)
    }
    if (el.textTracks.length > 0) {
      for (let i = 0; i < el.textTracks.length; i++) {
        el.textTracks[i].mode = 'hidden'
      }
    }
  }

  const handleEnded = (): void => {
    if (repeatMode === 'one') {
      seekTo(0)
      setIsPlaying(true)
      return
    }
    void playNext()
  }

  const handleLoadExternalSubtitle = async (): Promise<void> => {
    const file = await window.aplayerAPI.openSubtitleDialog()
    if (file) {
      addCustomSubtitle(file)
      setOpenPopover(null)
      pushToast(
        settings.language === 'vi' ? 'Đã nạp file phụ đề ngoài' : 'External subtitle loaded',
        'success'
      )
    }
  }

  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const progressPct = progressRatio * 100

  const activeLyricIdx = useMemo(() => {
    if (lrcLines.length === 0) return -1
    let idx = -1
    for (let i = 0; i < lrcLines.length; i++) {
      if (currentTime >= lrcLines[i].time) idx = i
      else break
    }
    return idx
  }, [lrcLines, currentTime])

  const allSubOptions = useMemo(() => {
    const probed = (currentProbe?.subtitleTracks || []).map((st) => ({
      key:
        st.isExternal && st.externalPath
          ? `external:${st.externalPath}`
          : `embedded:${st.streamIndex}`,
      title: st.title,
      badge: st.isExternal ? 'EXT' : (st.codec || 'SUB').toUpperCase()
    }))
    const custom = customSubtitlePaths
      .filter((p) => !probed.some((s) => s.key === `external:${p}`))
      .map((p) => ({
        key: `external:${p}`,
        title: p.split('/').pop() || 'External Sub',
        badge: 'EXT'
      }))
    return [...probed, ...custom]
  }, [currentProbe, customSubtitlePaths])

  const mediaTitle = currentItem?.title || remoteStream?.title || ''
  const mediaSubtitle = currentItem
    ? [currentItem.artist, currentItem.album].filter(Boolean).join(' · ')
    : remoteStream?.uploader || ''

  const codecBadge = useMemo(() => {
    if (remoteStream) return `${remoteStream.platform.toUpperCase()} STREAM`
    if (!currentItem) return ''
    const extUpper = currentItem.ext.toUpperCase()
    const parts: string[] = [extUpper]
    if (currentProbe?.height) parts.push(`${currentProbe.height}p`)
    if (currentProbe?.fps && currentProbe.fps >= 45) parts.push(`${Math.round(currentProbe.fps)}fps`)
    if (currentProbe?.videoCodec) {
      const vc = currentProbe.videoCodec.toUpperCase()
      if (vc !== extUpper) parts.push(vc)
    }
    if (currentProbe?.audioCodec) {
      const ac = currentProbe.audioCodec.toUpperCase()
      if (ac !== extUpper) parts.push(ac)
    }
    if (currentItem.kind === 'audio' && currentProbe?.sampleRate) {
      parts.push(`${(currentProbe.sampleRate / 1000).toFixed(1)}kHz`)
    }
    if (currentItem.kind === 'audio' && currentProbe?.bitDepth) {
      parts.push(`${currentProbe.bitDepth}-bit`)
    } else if (currentItem.kind === 'audio' && currentProbe?.bitrate) {
      parts.push(`${Math.round(currentProbe.bitrate / 1000)} kbps`)
    }
    return parts.join(' · ')
  }, [currentItem, currentProbe, remoteStream])

  // Only apply CSS filter to <video> when user modifies color sliders away from neutral (1,1,1)
  const hasCustomVideoFilters =
    videoFilters.brightness !== 1 || videoFilters.contrast !== 1 || videoFilters.saturate !== 1
  const videoFilterCss = hasCustomVideoFilters
    ? `brightness(${videoFilters.brightness}) contrast(${videoFilters.contrast}) saturate(${videoFilters.saturate})`
    : undefined

  return (
    <div
      ref={stageRef}
      onMouseMove={handleStageMouseMove}
      onMouseLeave={handleStageMouseLeave}
      className={`relative w-full h-full flex flex-col overflow-hidden ${
        visible ? 'flex' : 'hidden'
      } ${isFullscreen ? 'bg-black' : isVideoMode && hasMedia ? 'cinema-video-surface rounded-[var(--glass-radius)] bg-black' : ''}`}
    >
      {/* Hardware-accelerated <video> Element (persists seamlessly across tabs) */}
      <video
        ref={videoRef}
        src={playbackUrl || undefined}
        crossOrigin={remoteStream ? undefined : 'anonymous'}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onDoubleClick={isVideoMode ? toggleFullscreen : undefined}
        onClick={isVideoMode ? togglePlay : undefined}
        style={videoFilterCss ? { filter: videoFilterCss } : undefined}
        className={
          hasMedia && isVideoMode
            ? `w-full h-full object-contain bg-black ${isFullscreen ? '' : 'rounded-[var(--glass-radius)]'}`
            : 'hidden'
        }
      >
        {subtitleUrl && (
          <track
            key={subtitleUrl}
            kind="subtitles"
            src={subtitleUrl}
            label="Subtitles"
            default
          />
        )}
      </video>

      {/* EMPTY HERO WELCOME STAGE */}
      {!hasMedia && (
        <div className="flex-1 glass-panel flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none opacity-35">
            <AudioVisualizer
              style={settings.visualizerStyle}
              accent={accent}
              accentSecondary={theme.sparkColor || '#FFC247'}
              isPlaying={false}
            />
          </div>

          <div className="relative z-10 max-w-xl space-y-6">
            <div
              className="w-20 h-20 mx-auto rounded-[22px] flex items-center justify-center border border-white/20 shadow-lg"
              style={{
                background:
                  theme.mode === 'light'
                    ? '#0F2D6B'
                    : `linear-gradient(140deg, ${accent}, ${theme.accentSecondary})`
              }}
            >
              <BrandEmblem id={settings.avatarGlyph} size={42} className="text-white" rayColor="#FFC247" />
            </div>

            <div className="space-y-2.5">
              <h1 className="font-display text-3xl font-extrabold tracking-tight">
                {t.player.emptyTitle}
              </h1>
              <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                {t.player.emptySubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                onClick={onOpenFiles}
                className="glass-btn-accent px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <IconFolder size={16} />
                {t.player.browseFiles}
              </button>
              <button
                onClick={() => setActiveTab('downloader')}
                className="glass-btn px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <IconDownloader size={16} className="text-[var(--accent)]" />
                {t.player.goDownloader}
              </button>
              <button
                onClick={() => setActiveTab('library')}
                className="glass-btn px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"
              >
                <IconLibrary size={16} className="text-[var(--spark)]" />
                {t.player.goLibrary}
              </button>
            </div>

            {/* Supported Formats Showcase Pills */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5 opacity-80">
              {['MP4', 'MKV', 'MOV', 'AVI', 'WebM', 'FLV', 'WMV', 'FLAC', 'MP3', 'ALAC', 'WAV', 'OPUS', 'SRT / ASS'].map(
                (fmt) => (
                  <span
                    key={fmt}
                    className="text-[10.5px] font-mono px-2.5 py-1 rounded-full bg-[var(--glass-btn-bg)] border border-[var(--glass-track-bg)] text-[var(--text-secondary)]"
                  >
                    {fmt}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* HI-FI AUDIO STUDIO GLASS STAGE */}
      {hasMedia && !isVideoMode && (
        <div className="flex-1 glass-panel relative overflow-hidden flex flex-col justify-between p-6 md:p-8">
          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="glass-btn px-3 py-1 rounded-full text-[11px] font-mono text-[var(--accent)] flex items-center gap-1.5">
                <IconMusic size={13} />
                {codecBadge || 'AUDIO'}
              </span>
              <span className="glass-btn px-2.5 py-1 rounded-full text-[11px] text-[var(--text-secondary)]">
                {isTranscodingStream ? t.player.smartTranscode : t.player.directPlay}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1 glass-card p-1 rounded-full">
                {VISUALIZER_STYLES.map((vs) => (
                  <button
                    key={vs.id}
                    onClick={() => void updateSettings({ visualizerStyle: vs.id })}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                      settings.visualizerStyle === vs.id
                        ? 'glass-btn-accent'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {vs.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowLyrics((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                  showLyrics ? 'glass-btn-accent' : 'glass-btn'
                }`}
              >
                <IconWaveform size={14} />
                {t.player.lyrics}
              </button>

              {currentItem && (
                <button
                  onClick={() => void toggleFavorite(currentItem.id)}
                  className="glass-btn p-2 rounded-xl"
                  title={t.player.favorite}
                >
                  <IconHeart
                    size={16}
                    filled={currentItem.favorite}
                    className={currentItem.favorite ? 'text-rose-500' : ''}
                  />
                </button>
              )}

              <button
                onClick={() => setShowQueueDrawer(!showQueueDrawer)}
                className={`glass-btn p-2 rounded-xl ${showQueueDrawer ? 'border-[var(--accent)]' : ''}`}
                title={t.player.upNext}
              >
                <IconQueue size={16} />
              </button>
            </div>
          </div>

          {/* Center Artwork / Visualizer / Lyrics */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4 min-h-0">
            {showLyrics ? (
              <div className="w-full max-w-2xl h-full max-h-[340px] glass-card p-6 overflow-y-auto text-center space-y-3">
                {lrcLines.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)] py-16">{t.player.noLyrics}</p>
                ) : (
                  lrcLines.map((line, idx) => (
                    <button
                      key={`${line.time}-${idx}`}
                      onClick={() => seekTo(line.time)}
                      className={`block w-full transition-all duration-300 ${
                        idx === activeLyricIdx
                          ? 'text-xl font-bold text-[var(--text-primary)] scale-105'
                          : 'text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {line.text}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-center gap-5">
                {/* Floating Circular Glass Artwork Disc */}
                <div className="relative">
                  <div
                    className="absolute -inset-6 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${accent}66, ${theme.sparkColor}33, transparent 72%)`,
                      opacity: isPlaying ? 0.55 : 0.22
                    }}
                  />
                  <div
                    style={{ borderRadius: '9999px' }}
                    className={`relative w-52 h-52 md:w-56 md:h-56 rounded-full p-2.5 glass-elevated flex items-center justify-center overflow-hidden ${
                      isPlaying ? 'animate-vinyl-spin' : 'animate-vinyl-paused'
                    }`}
                  >
                    {artworkUrl && !artworkBroken ? (
                      <img
                        src={artworkUrl}
                        alt={mediaTitle}
                        onError={() => setArtworkBroken(true)}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div
                        className="w-full h-full rounded-full flex items-center justify-center relative"
                        style={{
                          background: `conic-gradient(from 45deg, #0F2D6B, ${accent}, #0B1E45, #0F2D6B)`
                        }}
                      >
                        <BrandEmblem id="vinyl-pulse" size={64} className="text-white/90" rayColor="#FFC247" />
                      </div>
                    )}
                    <div className="absolute w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/25 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white/85" />
                    </div>
                  </div>
                </div>

                {/* Track Info */}
                <div className="text-center max-w-xl px-4 space-y-1">
                  <h2 className="font-display text-2xl font-extrabold tracking-tight truncate">
                    {mediaTitle}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] truncate">{mediaSubtitle}</p>
                </div>

                {/* Live 60fps Audio Visualizer */}
                <div className="w-full max-w-3xl h-28 md:h-32">
                  <AudioVisualizer
                    style={settings.visualizerStyle}
                    accent={accent}
                    accentSecondary={theme.sparkColor || '#FFC247'}
                    isPlaying={isPlaying}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Transport Deck */}
          <div className="relative z-20">{renderTransportBar(false)}</div>
        </div>
      )}

      {/* VIDEO CINEMA ZERO-FLICKER FLOATING OSD OVERLAYS */}
      {hasMedia && isVideoMode && (
        <>
          {/* Top Cinema Floating Bar (pure opacity transition + hover-lock!) */}
          <div
            onMouseEnter={handleControlsMouseEnter}
            onMouseLeave={handleControlsMouseLeave}
            className={`cinema-osd-layer absolute top-0 left-0 right-0 z-20 px-4 py-3.5 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <IconVideo size={17} className="text-[#FFC247]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{mediaTitle}</div>
                <div className="flex items-center gap-2 text-[11px] text-white/75 font-mono">
                  <span>{codecBadge}</span>
                  <span>·</span>
                  <span className="text-[#60A5FA]">
                    {isTranscodingStream ? t.player.smartTranscode : t.player.directPlay}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {currentItem && (
                <button
                  onClick={() => void toggleFavorite(currentItem.id)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/18 border border-white/12 text-white transition"
                  title={t.player.favorite}
                >
                  <IconHeart
                    size={16}
                    filled={currentItem.favorite}
                    className={currentItem.favorite ? 'text-rose-400' : ''}
                  />
                </button>
              )}
              <button
                onClick={captureScreenshot}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/18 border border-white/12 text-white transition"
                title={t.player.screenshot}
              >
                <IconCamera size={16} />
              </button>
              <button
                onClick={() => setOpenPopover(openPopover === 'filters' ? null : 'filters')}
                className={`p-2 rounded-xl bg-white/10 hover:bg-white/18 border text-white transition ${
                  openPopover === 'filters' ? 'border-[#FFC247]' : 'border-white/12'
                }`}
                title={t.player.videoFilters}
              >
                <IconColorAdjust size={16} />
              </button>
              <button
                onClick={() => setOpenPopover(openPopover === 'info' ? null : 'info')}
                className={`p-2 rounded-xl bg-white/10 hover:bg-white/18 border text-white transition ${
                  openPopover === 'info' ? 'border-[#FFC247]' : 'border-white/12'
                }`}
                title={t.player.info}
              >
                <IconInfo size={16} />
              </button>
              <button
                onClick={() => setShowQueueDrawer(!showQueueDrawer)}
                className={`p-2 rounded-xl bg-white/10 hover:bg-white/18 border text-white transition ${
                  showQueueDrawer ? 'border-[#FFC247]' : 'border-white/12'
                }`}
                title={t.player.upNext}
              >
                <IconQueue size={16} />
              </button>
            </div>
          </div>

          {/* Center Buffering Indicator */}
          {isBuffering && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="cinema-osd-dock px-5 py-2.5 rounded-full flex items-center gap-3 text-white text-xs font-medium">
                <div className="w-4 h-4 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" />
                {isTranscodingStream ? 'FFmpeg Live Remuxing...' : 'Buffering...'}
              </div>
            </div>
          )}

          {/* Custom Frosted Glass Subtitle Overlay Pill (floats cleanly above OSD!) */}
          {activeSubtitleKey && activeSubtitleText && (
            <div
              className={`absolute left-8 right-8 z-20 flex justify-center pointer-events-none transition-[bottom] duration-250 ${
                controlsVisible ? 'bottom-32' : 'bottom-8'
              }`}
            >
              <div
                className="px-4 py-1.5 rounded-2xl border border-white/14 shadow-2xl text-center whitespace-pre-line max-w-4xl leading-snug"
                style={{
                  fontSize: `${settings.subtitleSizePx}px`,
                  color: settings.subtitleColor,
                  backgroundColor: `rgba(8, 16, 32, ${settings.subtitleBgOpacity})`,
                  textShadow: '0 1px 6px rgba(0,0,0,0.85)'
                }}
              >
                {activeSubtitleText}
              </div>
            </div>
          )}

          {/* Bottom Cinema Zero-Flicker Control Dock (pure opacity transition, hover-locked!) */}
          <div
            onMouseEnter={handleControlsMouseEnter}
            onMouseLeave={handleControlsMouseLeave}
            className={`cinema-osd-layer absolute bottom-4 left-4 right-4 z-20 ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {renderTransportBar(true)}
          </div>
        </>
      )}

      {/* POPOVER MENUS */}
      {openPopover && hasMedia && (
        <div
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
          className="absolute bottom-28 right-6 z-30 glass-elevated p-4 w-72 space-y-3 shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {openPopover === 'subs' && t.player.subtitles}
              {openPopover === 'tracks' && t.player.audioTracks}
              {openPopover === 'speed' && t.player.speed}
              {openPopover === 'filters' && t.player.videoFilters}
              {openPopover === 'info' && t.player.info}
              {openPopover === 'sleep' && t.player.sleepTimer}
            </span>
            <button onClick={() => setOpenPopover(null)} className="p-1 hover:bg-white/10 rounded-lg">
              <IconClose size={14} />
            </button>
          </div>

          {openPopover === 'subs' && (
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setActiveSubtitleKey(null)
                  setOpenPopover(null)
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition ${
                  activeSubtitleKey === null ? 'glass-btn-accent' : 'hover:bg-white/10'
                }`}
              >
                {t.player.subtitleOff}
              </button>
              {allSubOptions.map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => {
                    setActiveSubtitleKey(sub.key)
                    setOpenPopover(null)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                    activeSubtitleKey === sub.key ? 'glass-btn-accent' : 'hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{sub.title}</span>
                  <span className="text-[10px] font-mono opacity-80 ml-2">{sub.badge}</span>
                </button>
              ))}
              <button
                onClick={() => void handleLoadExternalSubtitle()}
                className="w-full glass-btn px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 mt-2"
              >
                <IconUpload size={14} className="text-[var(--accent)]" />
                {t.player.loadExternalSub}
              </button>
            </div>
          )}

          {openPopover === 'tracks' && (
            <div className="space-y-1.5">
              {(currentProbe?.audioTracks || []).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Default Audio Track</p>
              ) : (
                currentProbe!.audioTracks.map((tr) => (
                  <button
                    key={tr.streamIndex}
                    onClick={() => {
                      setActiveAudioTrack(tr.audioIndex)
                      setOpenPopover(null)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
                      activeAudioTrack === tr.audioIndex ? 'glass-btn-accent' : 'hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate">{tr.title}</span>
                    <span className="text-[10px] font-mono opacity-80">
                      {tr.codec.toUpperCase()} · {tr.channels}ch
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {openPopover === 'speed' && (
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-1.5">
                {SPEED_OPTIONS.map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setPlaybackRate(sp)}
                    className={`py-1.5 rounded-lg text-xs font-mono transition ${
                      playbackRate === sp ? 'glass-btn-accent' : 'glass-btn'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                  {t.player.abLoop}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setAbLoopPoint('a')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] ${
                      abLoop.a !== null ? 'glass-btn-accent' : 'glass-btn'
                    }`}
                  >
                    A {abLoop.a !== null ? formatDuration(abLoop.a) : ''}
                  </button>
                  <button
                    onClick={() => setAbLoopPoint('b')}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] ${
                      abLoop.b !== null ? 'glass-btn-accent' : 'glass-btn'
                    }`}
                  >
                    B {abLoop.b !== null ? formatDuration(abLoop.b) : ''}
                  </button>
                  <button
                    onClick={() => setAbLoopPoint('clear')}
                    className="glass-btn px-2 py-1.5 rounded-lg text-[11px]"
                    title={t.player.abClear}
                  >
                    <IconReset size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {openPopover === 'filters' && (
            <div className="space-y-3">
              {(
                [
                  ['brightness', t.player.brightness, 0.5, 1.5],
                  ['contrast', t.player.contrast, 0.5, 1.5],
                  ['saturate', t.player.saturation, 0, 2]
                ] as const
              ).map(([key, label, min, max]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{label}</span>
                    <span className="font-mono text-[var(--accent)]">
                      {Math.round(videoFilters[key] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={0.05}
                    value={videoFilters[key]}
                    onChange={(e) => setVideoFilters({ [key]: parseFloat(e.target.value) })}
                    className="glass-range w-full"
                  />
                </div>
              ))}
              <button
                onClick={resetVideoFilters}
                className="w-full glass-btn py-1.5 rounded-xl text-xs font-medium"
              >
                {t.player.resetFilters}
              </button>
            </div>
          )}

          {openPopover === 'sleep' && (
            <div className="grid grid-cols-3 gap-1.5">
              {[0, 15, 30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setSleepTimerMinutes(m === 0 ? null : m)
                    setOpenPopover(null)
                    pushToast(m === 0 ? t.player.sleepOff : `${t.player.sleepTimer}: ${m}m`, 'info')
                  }}
                  className="glass-btn py-2 rounded-xl text-xs font-medium"
                >
                  {m === 0 ? t.player.sleepOff : `${m}m`}
                </button>
              ))}
            </div>
          )}

          {openPopover === 'info' && currentProbe && (
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Container</span>
                <span className="font-mono">{currentProbe.ext.toUpperCase()}</span>
              </div>
              {currentProbe.width && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Resolution</span>
                  <span className="font-mono">
                    {currentProbe.width}×{currentProbe.height}
                    {currentProbe.fps ? ` @ ${currentProbe.fps}fps` : ''}
                  </span>
                </div>
              )}
              {currentProbe.videoCodec && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Video</span>
                  <span className="font-mono uppercase">{currentProbe.videoCodec}</span>
                </div>
              )}
              {currentProbe.audioCodec && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Audio</span>
                  <span className="font-mono uppercase">
                    {currentProbe.audioCodec} · {currentProbe.channels || 2}ch
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Size</span>
                <span className="font-mono">{formatFileSize(currentProbe.sizeBytes)}</span>
              </div>
              {currentProbe.bitrate && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Bitrate</span>
                  <span className="font-mono">{Math.round(currentProbe.bitrate / 1000)} kbps</span>
                </div>
              )}
              <button
                onClick={() => void window.aplayerAPI.showInFinder(currentProbe.filePath)}
                className="w-full glass-btn py-1.5 rounded-xl text-xs font-medium mt-2 flex items-center justify-center gap-1.5"
              >
                <IconFolder size={14} />
                {t.player.revealFinder}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SLIDE-OVER UP NEXT QUEUE DRAWER */}
      {showQueueDrawer && hasMedia && (
        <div
          onMouseEnter={handleControlsMouseEnter}
          onMouseLeave={handleControlsMouseLeave}
          className="absolute top-4 right-4 bottom-28 w-80 z-30 glass-elevated p-4 flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-track-bg)]">
            <span className="text-sm font-semibold">
              {t.player.upNext} ({queue.length})
            </span>
            <div className="flex items-center gap-1.5">
              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 rounded-lg hover:bg-white/10"
                >
                  {t.player.clearQueue}
                </button>
              )}
              <button
                onClick={() => setShowQueueDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-white/10"
              >
                <IconClose size={15} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-2 space-y-1 pr-1">
            {queue.map((item) => {
              const active = currentItem?.id === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => void playMediaItem(item, queue)}
                  className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition ${
                    active ? 'glass-btn-accent' : 'hover:bg-[var(--glass-btn-bg)]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    {item.kind === 'video' ? <IconVideo size={15} /> : <IconMusic size={15} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">{item.title}</div>
                    <div className="text-[10.5px] opacity-75 truncate">
                      {item.ext.toUpperCase()} · {formatDuration(item.duration)}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  function renderTransportBar(isCinemaOverlay: boolean): React.ReactNode {
    return (
      <div
        className={`${
          isCinemaOverlay ? 'cinema-osd-dock text-white' : 'glass-card'
        } px-4 py-3 space-y-2.5`}
      >
        {/* GPU-Composited Timeline Scrub Bar (scaleX avoids layout thrash & video OSD flicker!) */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono opacity-80 w-11 text-right tabular-nums">
            {formatDuration(currentTime)}
          </span>

          <div
            className="relative flex-1 h-5 flex items-center cursor-pointer group"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              setHoverSeekPct(pct * 100)
              setHoverSeekTime(duration * pct)
            }}
            onMouseLeave={() => setHoverSeekTime(null)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              seekTo(duration * pct)
            }}
          >
            {hoverSeekTime !== null && duration > 0 && (
              <div
                className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-[#081020]/90 text-white text-[10.5px] font-mono pointer-events-none shadow-lg border border-white/15"
                style={{ left: `${hoverSeekPct}%` }}
              >
                {formatDuration(hoverSeekTime)}
              </div>
            )}

            <div className="w-full h-1.5 group-hover:h-2 transition-[height] duration-150 rounded-full bg-white/20 overflow-hidden relative">
              {abLoop.a !== null && abLoop.b !== null && duration > 0 && (
                <div
                  className="absolute top-0 bottom-0 bg-[#FFC247]/55"
                  style={{
                    left: `${(abLoop.a / duration) * 100}%`,
                    width: `${((abLoop.b - abLoop.a) / duration) * 100}%`
                  }}
                />
              )}
              <div
                className="w-full h-full rounded-full origin-left"
                style={{
                  transform: `scaleX(${progressRatio})`,
                  background: `linear-gradient(90deg, ${accent}, #FFC247)`
                }}
              />
            </div>

            <div
              className="w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-[var(--accent)] absolute -translate-x-1/2 scale-75 group-hover:scale-105 transition-transform pointer-events-none"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          <span className="text-[11px] font-mono opacity-80 w-11 tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Volume */}
          <div className="flex items-center gap-2 w-40">
            <button
              onClick={() => setMuted(!muted)}
              className="p-1.5 rounded-xl hover:bg-white/12 transition"
            >
              {muted || volume === 0 ? (
                <IconVolumeMute size={16} className="text-rose-400" />
              ) : (
                <IconVolume size={16} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="glass-range w-24"
            />
          </div>

          {/* Center: Core Transport */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-xl transition ${
                shuffle ? 'text-[var(--accent)] bg-white/12' : 'opacity-70 hover:opacity-100 hover:bg-white/10'
              }`}
              title="Shuffle"
            >
              <IconShuffle size={16} />
            </button>

            <button
              onClick={() => void playPrevious()}
              className="p-2 rounded-xl hover:bg-white/12 transition"
              title="Previous"
            >
              <IconPrev size={18} />
            </button>

            <button
              onClick={togglePlay}
              className="glass-btn-accent w-10 h-10 rounded-full flex items-center justify-center"
              title="Play / Pause (Space)"
            >
              {isPlaying ? <IconPause size={18} /> : <IconPlay size={18} className="translate-x-0.5" />}
            </button>

            <button
              onClick={() => void playNext()}
              className="p-2 rounded-xl hover:bg-white/12 transition"
              title="Next"
            >
              <IconNext size={18} />
            </button>

            <button
              onClick={cycleRepeatMode}
              className={`p-2 rounded-xl transition ${
                repeatMode !== 'off'
                  ? 'text-[var(--accent)] bg-white/12'
                  : 'opacity-70 hover:opacity-100 hover:bg-white/10'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <IconRepeatOne size={16} /> : <IconRepeat size={16} />}
            </button>
          </div>

          {/* Right: Pro Tools */}
          <div className="flex items-center justify-end gap-1 w-auto min-w-[160px]">
            <button
              onClick={() => setOpenPopover(openPopover === 'speed' ? null : 'speed')}
              className={`px-2 py-1.5 rounded-xl text-[11px] font-mono hover:bg-white/12 transition flex items-center gap-1 ${
                playbackRate !== 1 || abLoop.a !== null ? 'text-[#FFC247] bg-white/10' : ''
              }`}
              title={t.player.speed}
            >
              <IconSpeed size={14} />
              {playbackRate}x
            </button>

            <button
              onClick={() => setShowEqModal(true)}
              className={`p-2 rounded-xl hover:bg-white/12 transition ${
                settings.equalizer.enabled && settings.equalizer.presetId !== 'flat'
                  ? 'text-[#FFC247]'
                  : ''
              }`}
              title={t.player.equalizer}
            >
              <IconEqualizer size={16} />
            </button>

            <button
              onClick={() => setOpenPopover(openPopover === 'sleep' ? null : 'sleep')}
              className={`p-2 rounded-xl hover:bg-white/12 transition ${
                sleepTimerEndAt ? 'text-[#FFC247]' : ''
              }`}
              title={t.player.sleepTimer}
            >
              <IconClock size={16} />
            </button>

            {isVideoMode && (
              <>
                {(currentProbe?.audioTracks.length || 0) > 1 && (
                  <button
                    onClick={() => setOpenPopover(openPopover === 'tracks' ? null : 'tracks')}
                    className="p-2 rounded-xl hover:bg-white/12 transition"
                    title={t.player.audioTracks}
                  >
                    <IconWaveform size={16} />
                  </button>
                )}

                <button
                  onClick={() => setOpenPopover(openPopover === 'subs' ? null : 'subs')}
                  className={`p-2 rounded-xl hover:bg-white/12 transition ${
                    activeSubtitleKey ? 'text-[#FFC247]' : ''
                  }`}
                  title={t.player.subtitles}
                >
                  <IconSubtitles size={16} />
                </button>

                <button
                  onClick={togglePiP}
                  className="p-2 rounded-xl hover:bg-white/12 transition"
                  title={t.player.pip}
                >
                  <IconPip size={16} />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl hover:bg-white/12 transition"
                  title={t.player.fullscreen}
                >
                  {isFullscreen ? <IconExitFullscreen size={16} /> : <IconFullscreen size={16} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }
}
