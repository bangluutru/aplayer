import React from 'react'
import { getDictionary } from '@shared/i18n'
import { getThemePreset } from '@shared/themes'
import { useAppStore } from '../store/useAppStore'
import {
  BrandRaysAccent,
  IconEqualizer,
  IconMoon,
  IconOpenFile,
  IconSun,
  IconWaveform
} from './icons/APlayerIcons'

interface TitlebarProps {
  onOpenFiles: () => void
}

export const Titlebar: React.FC<TitlebarProps> = ({ onOpenFiles }) => {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const currentItem = useAppStore((s) => s.currentItem)
  const remoteStream = useAppStore((s) => s.remoteStream)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const setShowEqModal = useAppStore((s) => s.setShowEqModal)

  const t = getDictionary(settings.language)
  const theme = getThemePreset(settings.themeId)
  const isLight = theme.mode === 'light'

  const activeTitle = currentItem?.title || remoteStream?.title

  const handleToggleDayNight = (): void => {
    const nextThemeId = isLight ? 'chiba-navy' : 'chiba-daylight'
    const nextPreset = getThemePreset(nextThemeId)
    void updateSettings({
      themeId: nextPreset.id,
      customAccent: undefined,
      enableNativeVibrancy: nextPreset.defaultVibrancy,
      glassOpacity: nextPreset.defaultOpacity,
      glassBlurPx: nextPreset.defaultBlur
    })
  }

  return (
    <header className="app-drag h-[42px] shrink-0 flex items-center justify-between px-4 select-none relative z-20">
      {/* Left: 76px reserved cleanly for native macOS traffic lights (x:16, y:15) */}
      <div className="flex items-center gap-3 pl-[74px] min-w-0">
        <span className="h-3.5 w-px bg-[var(--glass-track-bg)]" />
        <div className="flex items-center gap-1">
          <span className="font-display text-[13.5px] font-extrabold tracking-tight text-[var(--text-primary)]">
            {settings.brandName || 'APlayer'}
          </span>
          <BrandRaysAccent size={12} className="-mt-2" />
        </div>
        <span className="hidden md:inline text-[11px] text-[var(--text-muted)] font-medium">
          /
        </span>
        <span className="hidden md:inline text-[11.5px] text-[var(--text-secondary)] font-medium truncate">
          {t.nav[activeTab]}
        </span>
      </div>

      {/* Center: Subtle Interactive Now Playing Indicator when browsing other tabs */}
      {activeTitle && activeTab !== 'player' && (
        <button
          onClick={() => setActiveTab('player')}
          className="app-no-drag hidden lg:flex items-center gap-2 px-3 py-1 rounded-full glass-btn text-[11.5px] max-w-xs"
        >
          <IconWaveform
            size={13}
            className={isPlaying ? 'text-[var(--accent)] animate-pulse' : 'text-[var(--text-muted)]'}
          />
          <span className="truncate font-medium text-[var(--text-secondary)]">{activeTitle}</span>
        </button>
      )}

      {/* Right: Crisp Architectural Quick Controls */}
      <div className="app-no-drag flex items-center gap-1.5">
        <button
          onClick={onOpenFiles}
          className="glass-btn px-2.5 py-1 rounded-lg text-[11.5px] font-medium flex items-center gap-1.5"
          title={t.nav.openFiles}
        >
          <IconOpenFile size={13} className="text-[var(--accent)]" />
          <span className="hidden sm:inline">{t.nav.openFiles}</span>
        </button>

        <button
          onClick={() => setShowEqModal(true)}
          className="glass-btn p-1.5 rounded-lg"
          title={t.player.equalizer}
        >
          <IconEqualizer size={14} />
        </button>

        <button
          onClick={handleToggleDayNight}
          className="glass-btn p-1.5 rounded-lg"
          title={isLight ? 'Chiba Midnight Navy' : 'Chiba Daylight Glass'}
        >
          {isLight ? <IconMoon size={14} /> : <IconSun size={14} className="text-[#FFC247]" />}
        </button>
      </div>
    </header>
  )
}
