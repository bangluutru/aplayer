import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getDictionary } from '@shared/i18n'
import { getThemePreset } from '@shared/themes'
import { mediaController } from './engine/mediaController'
import { useAmbientColor } from './hooks/useAmbientColor'
import { useAppStore } from './store/useAppStore'
import { DownloaderView } from './components/DownloaderView'
import { EqualizerModal } from './components/EqualizerModal'
import { LibraryView } from './components/LibraryView'
import { MiniPlayerBar } from './components/MiniPlayerBar'
import { NowPlayingView } from './components/NowPlayingView'
import { PersonalizeView } from './components/PersonalizeView'
import { Sidebar } from './components/Sidebar'
import { Titlebar } from './components/Titlebar'
import { ToastContainer } from './components/ToastContainer'
import { VoiceStudioView } from './components/VoiceStudioView'
import { IconUpload } from './components/icons/APlayerIcons'

const FONT_STACKS: Record<string, string> = {
  vietnam: '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
  system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
  inter: '"Inter", "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"SF Mono", "JetBrains Mono", ui-monospace, Menlo, monospace'
}

export const App: React.FC = () => {
  const bootstrap = useAppStore((s) => s.bootstrap)
  const settings = useAppStore((s) => s.settings)
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const currentItem = useAppStore((s) => s.currentItem)
  const remoteStream = useAppStore((s) => s.remoteStream)
  const importPathsAndPlay = useAppStore((s) => s.importPathsAndPlay)
  const upsertDownloadTask = useAppStore((s) => s.upsertDownloadTask)
  const upsertLibraryItem = useAppStore((s) => s.upsertLibraryItem)
  const getArtworkUrl = useAppStore((s) => s.getArtworkUrl)
  const getLocalFileUrl = useAppStore((s) => s.getLocalFileUrl)
  const setVolume = useAppStore((s) => s.setVolume)
  const setMuted = useAppStore((s) => s.setMuted)
  const setPlaybackRate = useAppStore((s) => s.setPlaybackRate)
  const playNext = useAppStore((s) => s.playNext)
  const playPrevious = useAppStore((s) => s.playPrevious)
  const setShowEqModal = useAppStore((s) => s.setShowEqModal)
  const pushToast = useAppStore((s) => s.pushToast)

  const [isDraggingFiles, setIsDraggingFiles] = useState(false)

  const theme = useMemo(() => getThemePreset(settings.themeId), [settings.themeId])
  const t = useMemo(() => getDictionary(settings.language), [settings.language])

  const currentArtUrl = useMemo(
    () => (remoteStream?.thumbnail ? remoteStream.thumbnail : getArtworkUrl(currentItem)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentItem, remoteStream, settings.enableAmbientGlow]
  )

  const ambientPalette = useAmbientColor(currentArtUrl, settings.enableAmbientGlow)
  const wallpaperUrl = getLocalFileUrl(settings.wallpaperPath)

  const handleOpenFiles = useCallback(async () => {
    if (!window.aplayerAPI) return
    const files = await window.aplayerAPI.openMediaFilesDialog()
    if (files.length > 0) {
      await importPathsAndPlay(files, true)
    }
  }, [importPathsAndPlay])

  const handleOpenFolder = useCallback(async () => {
    if (!window.aplayerAPI) return
    const folder = await window.aplayerAPI.openFolderDialog()
    if (folder) {
      await importPathsAndPlay([folder], false)
      setActiveTab('library')
    }
  }, [importPathsAndPlay, setActiveTab])

  // Initial bootstrap + IPC subscriptions
  useEffect(() => {
    void bootstrap()
    if (!window.aplayerAPI) return

    const unsubs = [
      window.aplayerAPI.onDownloadTaskUpdated((task) => {
        upsertDownloadTask(task)
        if (task.status === 'completed') {
          pushToast(task.title, 'success')
        }
      }),
      window.aplayerAPI.onLibraryItemAdded((item) => {
        upsertLibraryItem(item)
      }),
      window.aplayerAPI.onExternalFiles((paths) => {
        void importPathsAndPlay(paths, true)
      }),
      window.aplayerAPI.onNavigate((tab) => {
        setActiveTab(tab)
      }),
      window.aplayerAPI.onTriggerOpenFiles(() => {
        void handleOpenFiles()
      }),
      window.aplayerAPI.onTriggerOpenFolder(() => {
        void handleOpenFolder()
      })
    ]

    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [
    bootstrap,
    upsertDownloadTask,
    upsertLibraryItem,
    importPathsAndPlay,
    setActiveTab,
    handleOpenFiles,
    handleOpenFolder,
    pushToast
  ])

  // Apply Live Glassmorphism CSS Variables
  useEffect(() => {
    const root = document.documentElement
    const accent = settings.customAccent || theme.accent
    const isLight = theme.mode === 'light'
    const opacity = settings.glassOpacity
    const hiOpacity = Math.min(0.94, opacity + 0.18)

    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-secondary', theme.accentSecondary)
    root.style.setProperty('--spark', theme.sparkColor || '#FFC247')
    root.style.setProperty('--glass-bg', theme.glassBase.replace('VAR_OPACITY', opacity.toFixed(2)))
    root.style.setProperty(
      '--glass-elevated',
      theme.glassElevated.replace('VAR_OPACITY_HI', hiOpacity.toFixed(2))
    )
    root.style.setProperty(
      '--glass-card-bg',
      isLight ? 'rgba(255, 255, 255, 0.64)' : 'rgba(255, 255, 255, 0.045)'
    )
    root.style.setProperty(
      '--glass-card-hover',
      isLight ? 'rgba(255, 255, 255, 0.86)' : 'rgba(255, 255, 255, 0.085)'
    )
    root.style.setProperty(
      '--glass-btn-bg',
      isLight ? 'rgba(15, 45, 107, 0.055)' : 'rgba(255, 255, 255, 0.07)'
    )
    root.style.setProperty(
      '--glass-btn-hover',
      isLight ? 'rgba(15, 45, 107, 0.105)' : 'rgba(255, 255, 255, 0.13)'
    )
    root.style.setProperty(
      '--glass-input-bg',
      isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.06)'
    )
    root.style.setProperty(
      '--glass-input-focus',
      isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.11)'
    )
    root.style.setProperty(
      '--glass-track-bg',
      isLight ? 'rgba(15, 45, 107, 0.14)' : 'rgba(255, 255, 255, 0.15)'
    )
    root.style.setProperty(
      '--glass-shadow',
      isLight ? 'rgba(15, 45, 107, 0.12)' : 'rgba(2, 8, 23, 0.48)'
    )
    root.style.setProperty(
      '--glass-specular',
      isLight ? 'rgba(255, 255, 255, 0.88)' : 'rgba(255, 255, 255, 0.14)'
    )
    root.style.setProperty('--glass-blur', `${settings.glassBlurPx}px`)
    root.style.setProperty('--glass-border-rgb', theme.borderTint)
    root.style.setProperty(
      '--glass-border-alpha',
      (isLight ? Math.min(0.18, settings.glassBorderShine * 0.8) : settings.glassBorderShine).toFixed(2)
    )
    root.style.setProperty('--glass-radius', `${settings.cornerRadiusPx}px`)
    root.style.setProperty('--text-primary', theme.textPrimary)
    root.style.setProperty('--text-secondary', theme.textSecondary)
    root.style.setProperty('--text-muted', theme.textMuted)
    root.style.setProperty('--bg-gradient', theme.bgGradient)
    root.style.setProperty('--orb-1', isLight ? theme.orb1 : ambientPalette?.orb1 || theme.orb1)
    root.style.setProperty('--orb-2', isLight ? theme.orb2 : ambientPalette?.orb2 || theme.orb2)
    root.style.setProperty('--orb-3', isLight ? theme.orb3 : ambientPalette?.orb3 || theme.orb3)
    root.style.setProperty('--font-ui', FONT_STACKS[settings.fontFamily] || FONT_STACKS.vietnam)
    root.style.setProperty('--sub-size', `${settings.subtitleSizePx}px`)
    root.style.setProperty('--sub-color', settings.subtitleColor)
    root.style.setProperty('--sub-bg-opacity', String(settings.subtitleBgOpacity))
  }, [settings, theme, ambientPalette])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.metaKey || e.ctrlKey) return

      const state = useAppStore.getState()
      switch (e.key) {
        case ' ':
          e.preventDefault()
          mediaController.togglePlay()
          break
        case 'ArrowRight':
          e.preventDefault()
          mediaController.seekRelative(e.shiftKey ? 30 : 5)
          break
        case 'ArrowLeft':
          e.preventDefault()
          mediaController.seekRelative(e.shiftKey ? -30 : -5)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(state.volume + 0.05)
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(state.volume - 0.05)
          break
        case 'm':
        case 'M':
          setMuted(!state.muted)
          break
        case 'f':
        case 'F':
          mediaController.toggleFullscreen()
          break
        case 'n':
        case 'N':
          void playNext()
          break
        case 'p':
        case 'P':
          void playPrevious()
          break
        case '[':
          setPlaybackRate(Math.round((state.playbackRate - 0.25) * 100) / 100)
          break
        case ']':
          setPlaybackRate(Math.round((state.playbackRate + 0.25) * 100) / 100)
          break
        case 'e':
        case 'E':
          setShowEqModal(!state.showEqModal)
          break
        case '1':
          setActiveTab('player')
          break
        case '2':
          setActiveTab('library')
          break
        case '3':
          setActiveTab('downloader')
          break
        case '4':
          setActiveTab('voice')
          break
        case '5':
          setActiveTab('personalize')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setVolume, setMuted, setPlaybackRate, playNext, playPrevious, setShowEqModal, setActiveTab])

  // Full-Window Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    if (!isDraggingFiles) setIsDraggingFiles(true)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    if (e.currentTarget === e.target) {
      setIsDraggingFiles(false)
    }
  }

  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setIsDraggingFiles(false)
    if (!window.aplayerAPI) return

    const droppedPaths: string[] = []
    for (const file of Array.from(e.dataTransfer.files)) {
      const p = window.aplayerAPI.getPathForDroppedFile(file)
      if (p) droppedPaths.push(p)
    }

    if (droppedPaths.length > 0) {
      await importPathsAndPlay(droppedPaths, true)
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => void handleDrop(e)}
      className="relative w-screen h-screen overflow-hidden flex flex-col"
      style={{
        background: settings.enableNativeVibrancy ? 'transparent' : 'var(--bg-gradient)'
      }}
    >
      {/* Optional User Custom Wallpaper Layer */}
      {wallpaperUrl && !settings.enableNativeVibrancy && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={wallpaperUrl}
            alt=""
            className="w-full h-full object-cover scale-105"
            style={{ filter: `blur(${settings.wallpaperBlurPx}px)` }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(6, 16, 36, ${settings.wallpaperDim})` }}
          />
        </div>
      )}

      {/* Calm Architectural Ambient Light Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aurora-orb-1 absolute -top-36 -left-24 w-[560px] h-[560px] rounded-full blur-3xl" />
        <div className="aurora-orb-2 absolute -bottom-40 -right-24 w-[600px] h-[600px] rounded-full blur-3xl" />
        <div className="aurora-orb-3 absolute top-1/4 right-1/4 w-[380px] h-[380px] rounded-full blur-3xl" />
      </div>

      {/* Dedicated 42px Native macOS Integrated Titlebar (traffic lights centered at x:16, y:15!) */}
      <Titlebar onOpenFiles={() => void handleOpenFiles()} />

      {/* Main Layout Shell cleanly positioned below Titlebar */}
      <div className="relative z-10 flex-1 flex gap-3.5 px-3.5 pb-3.5 pt-0.5 min-h-0 overflow-hidden">
        <Sidebar onOpenFiles={() => void handleOpenFiles()} onOpenFolder={() => void handleOpenFolder()} />

        <main className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden">
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            {/* Keep NowPlayingView mounted so audio/video playback never interrupts when switching tabs */}
            <NowPlayingView
              visible={activeTab === 'player'}
              onOpenFiles={() => void handleOpenFiles()}
            />

            {activeTab === 'library' && (
              <LibraryView
                onOpenFiles={() => void handleOpenFiles()}
                onOpenFolder={() => void handleOpenFolder()}
              />
            )}

            {activeTab === 'downloader' && <DownloaderView />}

            {activeTab === 'voice' && <VoiceStudioView />}

            {activeTab === 'personalize' && <PersonalizeView />}
          </div>

          <MiniPlayerBar />
        </main>
      </div>

      {/* Modals & Toasts */}
      <EqualizerModal />
      <ToastContainer />

      {/* Drag & Drop Frosted Glass Overlay */}
      {isDraggingFiles && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-lg flex items-center justify-center p-8 pointer-events-none">
          <div className="glass-elevated px-12 py-10 text-center space-y-3 border-2 border-dashed border-[var(--accent)]">
            <IconUpload size={42} className="mx-auto text-[var(--accent)]" />
            <h2 className="font-display text-xl font-bold">{t.dropOverlay.title}</h2>
            <p className="text-xs text-[var(--text-secondary)] max-w-md">{t.dropOverlay.subtitle}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
