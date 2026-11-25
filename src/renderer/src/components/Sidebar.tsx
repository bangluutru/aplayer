import React from 'react'
import { getDictionary } from '@shared/i18n'
import { getThemePreset } from '@shared/themes'
import type { NavTab } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import {
  BrandEmblem,
  BrandRaysAccent,
  IconChevronLeft,
  IconChevronRight,
  IconDownloader,
  IconFolderAdd,
  IconLibrary,
  IconNowPlaying,
  IconOpenFile,
  IconPersonalize
} from './icons/APlayerIcons'

interface SidebarProps {
  onOpenFiles: () => void
  onOpenFolder: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenFiles, onOpenFolder }) => {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const libraryCount = useAppStore((s) => s.libraryItems.length)
  const activeDownloadCount = useAppStore(
    (s) =>
      s.downloads.filter(
        (d) => d.status === 'downloading' || d.status === 'analyzing' || d.status === 'processing'
      ).length
  )
  const isPlaying = useAppStore((s) => s.isPlaying)
  const currentItem = useAppStore((s) => s.currentItem)
  const remoteStream = useAppStore((s) => s.remoteStream)

  const t = getDictionary(settings.language)
  const theme = getThemePreset(settings.themeId)
  const compact = settings.compactSidebar

  const navItems: Array<{
    id: NavTab
    label: string
    icon: React.ReactNode
    badge?: string | number
    activeDot?: boolean
  }> = [
    {
      id: 'player',
      label: t.nav.player,
      icon: <IconNowPlaying size={18} />,
      activeDot: isPlaying && Boolean(currentItem || remoteStream)
    },
    {
      id: 'library',
      label: t.nav.library,
      icon: <IconLibrary size={18} />,
      badge: libraryCount > 0 ? libraryCount : undefined
    },
    {
      id: 'downloader',
      label: t.nav.downloader,
      icon: <IconDownloader size={18} />,
      badge: activeDownloadCount > 0 ? activeDownloadCount : undefined,
      activeDot: activeDownloadCount > 0
    },
    {
      id: 'personalize',
      label: t.nav.personalize,
      icon: <IconPersonalize size={18} />
    }
  ]

  return (
    <aside
      className={`glass-panel flex flex-col justify-between shrink-0 transition-[width] duration-250 ${
        compact ? 'w-[72px] p-2.5' : 'w-[232px] p-3.5'
      }`}
    >
      <div className="space-y-5">
        {/* Clean Personalized Studio Identity Card (sits cleanly inside sidebar below Titlebar!) */}
        <div
          className={`flex items-center gap-3 pb-3.5 border-b border-[var(--glass-track-bg)] ${
            compact ? 'justify-center' : 'px-1'
          }`}
        >
          <div
            className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center overflow-hidden border border-white/20 shadow-sm"
            style={{
              background: settings.avatarDataUrl
                ? 'transparent'
                : theme.mode === 'light'
                  ? '#0F2D6B'
                  : 'linear-gradient(135deg, var(--accent), var(--accent-secondary))'
            }}
          >
            {settings.avatarDataUrl ? (
              <img
                src={settings.avatarDataUrl}
                alt={settings.brandName}
                className="w-full h-full object-cover"
              />
            ) : (
              <BrandEmblem id={settings.avatarGlyph} size={22} className="text-white" rayColor="#FFC247" />
            )}
          </div>

          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-display text-[15px] font-extrabold tracking-tight truncate text-[var(--text-primary)]">
                  {settings.brandName || 'APlayer'}
                </span>
                <BrandRaysAccent size={11} className="shrink-0 -mt-2" />
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                {settings.brandTagline || 'Personal Media Studio'}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Rail */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={compact ? item.label : undefined}
                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-150 relative ${
                  compact ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                } ${
                  active
                    ? 'glass-btn-accent font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-btn-bg)] border border-transparent'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!compact && <span className="text-[13px] truncate">{item.label}</span>}

                {!compact && item.badge !== undefined && (
                  <span
                    className={`ml-auto text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--glass-btn-bg)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {item.activeDot && (
                  <span
                    className={`w-2 h-2 rounded-full bg-[#10B981] ${
                      compact ? 'absolute top-2 right-2' : item.badge !== undefined ? '' : 'ml-auto'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom Quick Actions & Collapse Control */}
      <div className="space-y-1.5 pt-3 border-t border-[var(--glass-track-bg)]">
        <button
          onClick={onOpenFiles}
          title={t.nav.openFiles}
          className={`w-full glass-btn rounded-xl flex items-center gap-2.5 text-xs font-medium ${
            compact ? 'justify-center p-2.5' : 'px-3 py-2'
          }`}
        >
          <IconOpenFile size={15} className="text-[var(--accent)] shrink-0" />
          {!compact && <span>{t.nav.openFiles}</span>}
        </button>

        <button
          onClick={onOpenFolder}
          title={t.nav.openFolder}
          className={`w-full glass-btn rounded-xl flex items-center gap-2.5 text-xs font-medium ${
            compact ? 'justify-center p-2.5' : 'px-3 py-2'
          }`}
        >
          <IconFolderAdd size={15} className="text-[var(--spark)] shrink-0" />
          {!compact && <span>{t.nav.openFolder}</span>}
        </button>

        <button
          onClick={() => void updateSettings({ compactSidebar: !compact })}
          title={compact ? t.nav.expand : t.nav.collapse}
          className={`w-full flex items-center gap-2 rounded-xl text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-btn-bg)] transition py-2 ${
            compact ? 'justify-center' : 'px-3'
          }`}
        >
          {compact ? (
            <IconChevronRight size={15} />
          ) : (
            <>
              <IconChevronLeft size={15} />
              <span>{t.nav.collapse}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
