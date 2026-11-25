import React, { useState } from 'react'
import { getDictionary } from '@shared/i18n'
import {
  ACCENT_SWATCHES,
  DEFAULT_EQUALIZER,
  EQ_LABELS,
  EQ_PRESETS,
  getThemePreset,
  THEME_PRESETS
} from '@shared/themes'
import type { VisualizerStyle } from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import {
  BRAND_EMBLEM_LIST,
  BrandEmblem,
  BrandRaysAccent,
  IconAlertCircle,
  IconCheckCircle,
  IconDownloader,
  IconEqualizer,
  IconFolder,
  IconFolderAdd,
  IconImage,
  IconKeyboard,
  IconPersonalize,
  IconRefresh,
  IconReset,
  IconTrash,
  IconUpload,
  normalizeEmblemId
} from './icons/APlayerIcons'

type PersonalizeTab = 'glass' | 'audio' | 'storage' | 'shortcuts'

const VISUALIZER_OPTIONS: Array<{ id: VisualizerStyle; label: string; desc: string }> = [
  { id: 'aurora-bars', label: 'Aurora Bars', desc: 'Cột phổ cực quang mềm mượt' },
  { id: 'liquid-wave', label: 'Liquid Wave', desc: 'Dải lụa sóng âm uyển chuyển' },
  { id: 'orbital-halo', label: 'Orbital Halo', desc: 'Vòng hào quang xoay đồng tâm' },
  { id: 'glass-mirror', label: 'Glass Mirror', desc: 'Phản chiếu gương kính đối xứng' },
  { id: 'minimal-pulse', label: 'Minimal Pulse', desc: 'Vòng xung tối giản theo nhịp bass' }
]

export const PersonalizeView: React.FC = () => {
  const settings = useAppStore((s) => s.settings)
  const capabilities = useAppStore((s) => s.capabilities)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const updateEqualizer = useAppStore((s) => s.updateEqualizer)
  const resetSettings = useAppStore((s) => s.resetSettings)
  const scanWatchedFolders = useAppStore((s) => s.scanWatchedFolders)
  const pushToast = useAppStore((s) => s.pushToast)

  const [tab, setTab] = useState<PersonalizeTab>('glass')
  const t = getDictionary(settings.language)
  const eq = settings.equalizer
  const activeTheme = getThemePreset(settings.themeId)
  const activeEmblem = normalizeEmblemId(settings.avatarGlyph)

  const handlePickAvatar = async (): Promise<void> => {
    const file = await window.aplayerAPI.openImageDialog()
    if (!file) return
    const dataUrl = await window.aplayerAPI.readImageAsDataUrl(file)
    await updateSettings({ avatarDataUrl: dataUrl })
  }

  const handlePickWallpaper = async (): Promise<void> => {
    const file = await window.aplayerAPI.openImageDialog()
    if (!file) return
    await updateSettings({ wallpaperPath: file, enableNativeVibrancy: false })
    pushToast(
      settings.language === 'vi' ? 'Đã áp dụng ảnh nền tuỳ chỉnh' : 'Custom wallpaper applied',
      'success'
    )
  }

  const handleExportTheme = async (): Promise<void> => {
    const res = await window.aplayerAPI.exportSettings()
    if (res.saved) {
      pushToast(
        settings.language === 'vi' ? 'Đã xuất cấu hình cá nhân hoá (.json)' : 'Theme profile exported',
        'success'
      )
    }
  }

  const handleImportTheme = async (): Promise<void> => {
    try {
      const updated = await window.aplayerAPI.importSettings()
      if (updated) {
        useAppStore.setState({ settings: updated })
        pushToast(
          settings.language === 'vi' ? 'Đã nhập cấu hình cá nhân hoá' : 'Theme profile imported',
          'success'
        )
      }
    } catch {
      pushToast('Invalid theme JSON file', 'error')
    }
  }

  const handlePickDir = async (kind: 'video' | 'audio' | 'watched'): Promise<void> => {
    const defaultPath =
      kind === 'video'
        ? settings.videoDownloadDir
        : kind === 'audio'
          ? settings.audioDownloadDir
          : undefined
    const picked = await window.aplayerAPI.openFolderDialog(defaultPath)
    if (!picked) return
    if (kind === 'video') {
      await updateSettings({ videoDownloadDir: picked })
    } else if (kind === 'audio') {
      await updateSettings({ audioDownloadDir: picked })
    } else if (!settings.watchedFolders.includes(picked)) {
      await updateSettings({ watchedFolders: [...settings.watchedFolders, picked] })
      await scanWatchedFolders()
    }
  }

  const tabs: Array<{ id: PersonalizeTab; label: string; icon: React.ReactNode }> = [
    { id: 'glass', label: t.personalize.tabGlass, icon: <IconPersonalize size={15} /> },
    { id: 'audio', label: t.personalize.tabAudio, icon: <IconEqualizer size={15} /> },
    { id: 'storage', label: t.personalize.tabStorage, icon: <IconFolder size={15} /> },
    { id: 'shortcuts', label: t.personalize.tabShortcuts, icon: <IconKeyboard size={15} /> }
  ]

  return (
    <div className="glass-panel flex-1 flex flex-col overflow-hidden p-5 md:p-6 gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight">{t.personalize.title}</h1>
          <p className="text-xs text-[var(--text-muted)]">{t.personalize.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleExportTheme()}
            className="glass-btn px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
          >
            <IconDownloader size={14} />
            {t.personalize.exportTheme}
          </button>
          <button
            onClick={() => void handleImportTheme()}
            className="glass-btn px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5"
          >
            <IconUpload size={14} />
            {t.personalize.importTheme}
          </button>
          <button
            onClick={() => void resetSettings()}
            className="glass-btn px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 text-rose-500"
          >
            <IconReset size={14} />
            {t.personalize.resetAll}
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              tab === tb.id ? 'glass-btn-accent' : 'glass-btn text-[var(--text-secondary)]'
            }`}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-5 pb-4">
        {tab === 'glass' && (
          <>
            {/* Personal Identity Card (Bespoke Vector Emblems — ZERO Emoticons!) */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold flex items-center gap-2">
                  <BrandRaysAccent size={15} />
                  {t.personalize.identityTitle}
                </h2>
                <div className="flex items-center gap-1 glass-card p-1 rounded-full">
                  {(['vi', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => void updateSettings({ language: lang })}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                        settings.language === lang ? 'glass-btn-accent' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {lang === 'vi' ? 'Tiếng Việt' : 'English'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-muted)]">{t.personalize.brandName}</label>
                  <input
                    type="text"
                    value={settings.brandName}
                    onChange={(e) => void updateSettings({ brandName: e.target.value })}
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-sm font-semibold"
                    maxLength={28}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-muted)]">{t.personalize.brandTagline}</label>
                  <input
                    type="text"
                    value={settings.brandTagline}
                    onChange={(e) => void updateSettings({ brandTagline: e.target.value })}
                    className="glass-input w-full px-3.5 py-2 rounded-xl text-xs"
                    maxLength={40}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-muted)]">{t.personalize.avatar}</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => void handlePickAvatar()}
                      className="glass-btn px-3 py-1.5 rounded-xl text-xs font-medium"
                    >
                      {t.personalize.uploadAvatar}
                    </button>
                    {settings.avatarDataUrl && (
                      <button
                        onClick={() => void updateSettings({ avatarDataUrl: undefined })}
                        className="glass-btn px-2.5 py-1.5 rounded-xl text-xs"
                      >
                        {t.personalize.resetAvatar}
                      </button>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      {BRAND_EMBLEM_LIST.map((em) => {
                        const isPicked = !settings.avatarDataUrl && activeEmblem === em.id
                        return (
                          <button
                            key={em.id}
                            title={em.label}
                            onClick={() =>
                              void updateSettings({ avatarGlyph: em.id, avatarDataUrl: undefined })
                            }
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                              isPicked ? 'glass-btn-accent' : 'glass-btn'
                            }`}
                          >
                            <BrandEmblem
                              id={em.id}
                              size={17}
                              className={isPicked ? 'text-white' : 'text-[var(--text-primary)]'}
                              rayColor="#FFC247"
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Presets Grid */}
            <div className="glass-card p-5 space-y-3.5">
              <h2 className="font-display text-sm font-bold">{t.personalize.themesTitle}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {THEME_PRESETS.map((preset) => {
                  const selected = activeTheme.id === preset.id
                  return (
                    <button
                      key={preset.id}
                      onClick={() =>
                        void updateSettings({
                          themeId: preset.id,
                          customAccent: undefined,
                          enableNativeVibrancy: preset.defaultVibrancy,
                          glassOpacity: preset.defaultOpacity,
                          glassBlurPx: preset.defaultBlur
                        })
                      }
                      className={`text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden ${
                        selected
                          ? 'border-white/50 scale-[1.01]'
                          : 'border-white/15 hover:border-white/30'
                      }`}
                      style={{
                        background: preset.bgGradient,
                        boxShadow: selected
                          ? '0 0 0 2.5px var(--accent), 0 10px 24px -10px rgba(0, 0, 0, 0.35)'
                          : undefined
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                            style={{ background: preset.accent }}
                          />
                          <span
                            className="w-4 h-4 rounded-full border border-white/40 shadow-sm -ml-2"
                            style={{ background: preset.sparkColor }}
                          />
                        </div>
                        <span
                          className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full"
                          style={{
                            color: preset.textPrimary,
                            background: 'rgba(128,128,128,0.22)'
                          }}
                        >
                          {preset.mode}
                        </span>
                      </div>
                      <div className="font-display text-xs font-bold" style={{ color: preset.textPrimary }}>
                        {settings.language === 'vi' ? preset.nameVi : preset.name}
                      </div>
                      <div
                        className="text-[11px] mt-0.5 line-clamp-2 opacity-80"
                        style={{ color: preset.textSecondary }}
                      >
                        {settings.language === 'vi' ? preset.descriptionVi : preset.description}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Glass Physics & Color Sliders */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-5 space-y-4">
                <h2 className="font-display text-sm font-bold">{t.personalize.glassPhysicsTitle}</h2>

                <div className="space-y-2">
                  <div className="text-xs text-[var(--text-muted)]">{t.personalize.accentColor}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {ACCENT_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => void updateSettings({ customAccent: hex })}
                        className={`w-7 h-7 rounded-full border-2 transition ${
                          settings.customAccent === hex
                            ? 'border-white scale-110 shadow-md'
                            : 'border-white/25 hover:scale-105'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <label className="glass-btn px-2.5 py-1 rounded-full text-[11px] cursor-pointer flex items-center gap-1.5">
                      <span>HEX</span>
                      <input
                        type="color"
                        value={settings.customAccent || activeTheme.accent}
                        onChange={(e) => void updateSettings({ customAccent: e.target.value })}
                        className="w-4 h-4 bg-transparent border-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t.personalize.glassBlur}</span>
                      <span className="font-mono text-[var(--accent)]">{settings.glassBlurPx}px</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={40}
                      step={1}
                      value={settings.glassBlurPx}
                      onChange={(e) =>
                        void updateSettings({ glassBlurPx: parseInt(e.target.value, 10) })
                      }
                      className="glass-range w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t.personalize.glassOpacity}</span>
                      <span className="font-mono text-[var(--accent)]">
                        {Math.round(settings.glassOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.14}
                      max={0.85}
                      step={0.02}
                      value={settings.glassOpacity}
                      onChange={(e) =>
                        void updateSettings({ glassOpacity: parseFloat(e.target.value) })
                      }
                      className="glass-range w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t.personalize.borderShine}</span>
                      <span className="font-mono text-[var(--accent)]">
                        {Math.round(settings.glassBorderShine * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.06}
                      max={0.42}
                      step={0.02}
                      value={settings.glassBorderShine}
                      onChange={(e) =>
                        void updateSettings({ glassBorderShine: parseFloat(e.target.value) })
                      }
                      className="glass-range w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t.personalize.cornerRadius}</span>
                      <span className="font-mono text-[var(--accent)]">{settings.cornerRadiusPx}px</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={26}
                      step={2}
                      value={settings.cornerRadiusPx}
                      onChange={(e) =>
                        void updateSettings({ cornerRadiusPx: parseInt(e.target.value, 10) })
                      }
                      className="glass-range w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--glass-track-bg)] text-xs">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableNativeVibrancy}
                      onChange={(e) =>
                        void updateSettings({ enableNativeVibrancy: e.target.checked })
                      }
                      className="accent-[var(--accent)]"
                    />
                    <span>{t.personalize.nativeVibrancy}</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableAmbientGlow}
                      onChange={(e) =>
                        void updateSettings({ enableAmbientGlow: e.target.checked })
                      }
                      className="accent-[var(--accent)]"
                    />
                    <span>{t.personalize.ambientGlow}</span>
                  </label>
                </div>
              </div>

              {/* Custom Wallpaper & Typography */}
              <div className="glass-card p-5 space-y-4">
                <h2 className="font-display text-sm font-bold flex items-center gap-2">
                  <IconImage size={16} className="text-[var(--accent)]" />
                  {t.personalize.wallpaperTitle}
                </h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handlePickWallpaper()}
                    className="glass-btn-accent px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    {t.personalize.pickWallpaper}
                  </button>
                  {settings.wallpaperPath && (
                    <button
                      onClick={() => void updateSettings({ wallpaperPath: undefined })}
                      className="glass-btn px-3 py-2 rounded-xl text-xs"
                    >
                      {t.personalize.clearWallpaper}
                    </button>
                  )}
                </div>

                {settings.wallpaperPath && (
                  <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                    {settings.wallpaperPath}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t.personalize.wallpaperBlur}</span>
                      <span className="font-mono text-[var(--accent)]">{settings.wallpaperBlurPx}px</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={32}
                      step={1}
                      value={settings.wallpaperBlurPx}
                      onChange={(e) =>
                        void updateSettings({ wallpaperBlurPx: parseInt(e.target.value, 10) })
                      }
                      className="glass-range w-full"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{t.personalize.wallpaperDim}</span>
                      <span className="font-mono text-[var(--accent)]">
                        {Math.round(settings.wallpaperDim * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.85}
                      step={0.05}
                      value={settings.wallpaperDim}
                      onChange={(e) =>
                        void updateSettings({ wallpaperDim: parseFloat(e.target.value) })
                      }
                      className="glass-range w-full"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--glass-track-bg)] space-y-2">
                  <div className="text-xs text-[var(--text-muted)]">{t.personalize.fontFamily}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['vietnam', 'Be Vietnam Pro (Chuẩn)'],
                        ['system', 'SF Pro / macOS'],
                        ['inter', 'Inter Studio'],
                        ['mono', 'Studio Mono']
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => void updateSettings({ fontFamily: id })}
                        className={`py-2 px-3 rounded-xl text-xs font-medium transition ${
                          settings.fontFamily === id ? 'glass-btn-accent' : 'glass-btn'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'audio' && (
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display text-sm font-bold">{t.personalize.eqTitle}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void updateEqualizer({ enabled: !eq.enabled })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      eq.enabled ? 'glass-btn-accent' : 'glass-btn opacity-70'
                    }`}
                  >
                    {t.personalize.eqEnable}: {eq.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    onClick={() =>
                      void updateEqualizer({
                        ...DEFAULT_EQUALIZER,
                        bands: [...DEFAULT_EQUALIZER.bands]
                      })
                    }
                    className="glass-btn px-3 py-1 rounded-full text-xs"
                  >
                    Flat Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {EQ_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      void updateEqualizer({ presetId: p.id, bands: [...p.bands], enabled: true })
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      eq.presetId === p.id ? 'glass-btn-accent' : 'glass-btn'
                    }`}
                  >
                    {settings.language === 'vi' ? p.nameVi : p.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-10 gap-2 items-end h-44 pt-2">
                {eq.bands.map((val, idx) => (
                  <div key={EQ_LABELS[idx]} className="flex flex-col items-center justify-between h-full">
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {val > 0 ? `+${val}` : val}
                    </span>
                    <div className="relative h-28 flex items-center justify-center">
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={val}
                        disabled={!eq.enabled}
                        onChange={(e) => {
                          const next = [...eq.bands]
                          next[idx] = parseFloat(e.target.value)
                          void updateEqualizer({ bands: next, presetId: 'custom', enabled: true })
                        }}
                        className="glass-range w-24 -rotate-90 origin-center"
                      />
                    </div>
                    <span className="text-[11px] font-medium">{EQ_LABELS[idx]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card p-5 space-y-3">
                <h2 className="font-display text-sm font-bold">{t.personalize.visualizerTitle}</h2>
                <div className="space-y-2">
                  {VISUALIZER_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => void updateSettings({ visualizerStyle: v.id })}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition ${
                        settings.visualizerStyle === v.id ? 'glass-btn-accent' : 'glass-btn'
                      }`}
                    >
                      <span className="text-xs font-semibold">{v.label}</span>
                      <span className="text-[11px] opacity-80">{v.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-card p-5 space-y-4">
                <h2 className="font-display text-sm font-bold">{t.personalize.subtitleStyleTitle}</h2>
                <div className="rounded-xl bg-[#061024]/80 p-4 flex items-center justify-center min-h-[82px]">
                  <span
                    className="px-3 py-1 rounded-lg transition-all"
                    style={{
                      fontSize: `${settings.subtitleSizePx}px`,
                      color: settings.subtitleColor,
                      backgroundColor: `rgba(8, 16, 32, ${settings.subtitleBgOpacity})`
                    }}
                  >
                    APlayer Subtitle Preview · Phụ đề mẫu
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{t.personalize.subtitleSize}</span>
                    <span className="font-mono text-[var(--accent)]">{settings.subtitleSizePx}px</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={36}
                    step={1}
                    value={settings.subtitleSizePx}
                    onChange={(e) =>
                      void updateSettings({ subtitleSizePx: parseInt(e.target.value, 10) })
                    }
                    className="glass-range w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{t.personalize.subtitleBg}</span>
                    <span className="font-mono text-[var(--accent)]">
                      {Math.round(settings.subtitleBgOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.95}
                    step={0.05}
                    value={settings.subtitleBgOpacity}
                    onChange={(e) =>
                      void updateSettings({ subtitleBgOpacity: parseFloat(e.target.value) })
                    }
                    className="glass-range w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'storage' && (
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <h2 className="font-display text-sm font-bold">{t.personalize.storageTitle}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-muted)]">{t.personalize.videoDir}</label>
                  <div className="glass-input rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="text-xs font-mono truncate flex-1">{settings.videoDownloadDir}</span>
                    <button
                      onClick={() => void handlePickDir('video')}
                      className="glass-btn px-2.5 py-1 rounded-lg text-[11px]"
                    >
                      {t.downloader.changeFolder}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-muted)]">{t.personalize.audioDir}</label>
                  <div className="glass-input rounded-xl px-3 py-2 flex items-center gap-2">
                    <span className="text-xs font-mono truncate flex-1">{settings.audioDownloadDir}</span>
                    <button
                      onClick={() => void handlePickDir('audio')}
                      className="glass-btn px-2.5 py-1 rounded-lg text-[11px]"
                    >
                      {t.downloader.changeFolder}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoImportDownloads}
                    onChange={(e) =>
                      void updateSettings({ autoImportDownloads: e.target.checked })
                    }
                    className="accent-[var(--accent)]"
                  />
                  <span>{t.personalize.autoImport}</span>
                </label>
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
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold">{t.personalize.watchedFolders}</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void handlePickDir('watched')}
                    className="glass-btn px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                  >
                    <IconFolderAdd size={14} className="text-[var(--accent)]" />
                    {t.personalize.addWatchedFolder}
                  </button>
                  <button
                    onClick={() => void scanWatchedFolders()}
                    className="glass-btn px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5"
                  >
                    <IconRefresh size={14} />
                    {t.library.rescan}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {settings.watchedFolders.map((dir) => (
                  <div
                    key={dir}
                    className="glass-input rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-mono truncate">{dir}</span>
                    <button
                      onClick={() =>
                        void updateSettings({
                          watchedFolders: settings.watchedFolders.filter((d) => d !== dir)
                        })
                      }
                      className="p-1 rounded-lg hover:bg-rose-500/15 hover:text-rose-400"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-5 space-y-3">
              <h2 className="font-display text-sm font-bold">{t.personalize.systemHealthTitle}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  {
                    name: 'FFmpeg (Universal Playback & Conversion)',
                    ok: Boolean(capabilities?.ffmpegPath),
                    detail: capabilities?.ffmpegVersion
                      ? `v${capabilities.ffmpegVersion} · ${capabilities.ffmpegPath}`
                      : 'Not found'
                  },
                  {
                    name: 'FFprobe (Deep Codec & Track Inspector)',
                    ok: Boolean(capabilities?.ffprobePath),
                    detail: capabilities?.ffprobePath || 'Not found'
                  },
                  {
                    name: 'yt-dlp (YouTube, FB, X, TikTok, IG, 1000+)',
                    ok: Boolean(capabilities?.ytDlpPath),
                    detail: capabilities?.ytDlpVersion
                      ? `v${capabilities.ytDlpVersion} · ${capabilities.ytDlpPath}`
                      : 'Not found'
                  },
                  {
                    name: 'Deno JS Runtime & Native Threads Extractor',
                    ok: Boolean(capabilities?.denoPath),
                    detail: capabilities?.denoPath || 'Built-in active'
                  }
                ].map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl bg-[var(--glass-btn-bg)] border border-[var(--glass-track-bg)] p-3 flex items-start gap-2.5"
                  >
                    {item.ok ? (
                      <IconCheckCircle size={15} className="text-[#10B981] shrink-0 mt-0.5" />
                    ) : (
                      <IconAlertCircle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-[11px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'shortcuts' && (
          <div className="glass-card p-5 space-y-2">
            {t.shortcuts.map(([keyCombo, desc]) => (
              <div
                key={keyCombo}
                className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-[var(--glass-btn-bg)] border border-[var(--glass-track-bg)]"
              >
                <span className="text-xs text-[var(--text-secondary)]">{desc}</span>
                <kbd className="px-2.5 py-1 rounded-lg bg-[var(--glass-input-bg)] border border-[var(--glass-track-bg)] text-xs font-mono font-semibold">
                  {keyCombo}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
