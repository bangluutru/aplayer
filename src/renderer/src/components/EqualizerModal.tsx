import React from 'react'
import { getDictionary } from '@shared/i18n'
import { DEFAULT_EQUALIZER, EQ_LABELS, EQ_PRESETS } from '@shared/themes'
import { useAppStore } from '../store/useAppStore'
import { IconClose, IconEqualizer, IconReset, IconVolume } from './icons/APlayerIcons'

export const EqualizerModal: React.FC = () => {
  const showEqModal = useAppStore((s) => s.showEqModal)
  const setShowEqModal = useAppStore((s) => s.setShowEqModal)
  const settings = useAppStore((s) => s.settings)
  const updateEqualizer = useAppStore((s) => s.updateEqualizer)

  if (!showEqModal) return null

  const t = getDictionary(settings.language)
  const eq = settings.equalizer

  const handleBandChange = (idx: number, val: number): void => {
    const next = [...eq.bands]
    next[idx] = val
    void updateEqualizer({ bands: next, presetId: 'custom', enabled: true })
  }

  const handlePreset = (presetId: string): void => {
    const found = EQ_PRESETS.find((p) => p.id === presetId)
    if (!found) return
    void updateEqualizer({ presetId: found.id, bands: [...found.bands], enabled: true })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-6"
      onClick={() => setShowEqModal(false)}
    >
      <div
        className="glass-elevated w-full max-w-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center glass-btn-accent">
              <IconEqualizer size={19} />
            </div>
            <div>
              <h3 className="font-display text-base font-bold tracking-tight">{t.personalize.eqTitle}</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Web Audio DSP · 10-Band Parametric · Preamp & 200% Boost
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void updateEqualizer({ enabled: !eq.enabled })}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                eq.enabled ? 'glass-btn-accent' : 'glass-btn opacity-70'
              }`}
            >
              {eq.enabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() =>
                void updateEqualizer({ ...DEFAULT_EQUALIZER, bands: [...DEFAULT_EQUALIZER.bands] })
              }
              className="glass-btn p-2 rounded-xl"
              title="Reset"
            >
              <IconReset size={15} />
            </button>
            <button onClick={() => setShowEqModal(false)} className="glass-btn p-2 rounded-xl">
              <IconClose size={15} />
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {EQ_PRESETS.map((preset) => {
            const active = eq.presetId === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => handlePreset(preset.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  active ? 'glass-btn-accent' : 'glass-btn text-[var(--text-secondary)]'
                }`}
              >
                {settings.language === 'vi' ? preset.nameVi : preset.name}
              </button>
            )
          })}
        </div>

        {/* 10-Band Vertical Sliders */}
        <div className="glass-card p-5">
          <div className="grid grid-cols-10 gap-2 items-end h-44">
            {eq.bands.map((val, idx) => (
              <div key={EQ_LABELS[idx]} className="flex flex-col items-center justify-between h-full">
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  {val > 0 ? `+${val.toFixed(0)}` : val.toFixed(0)}
                </span>
                <div className="relative h-28 flex items-center justify-center">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={val}
                    disabled={!eq.enabled}
                    onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                    className="glass-range w-24 -rotate-90 origin-center"
                  />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  {EQ_LABELS[idx]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Preamp, Volume Boost, Balance */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)] truncate">{t.personalize.preamp}</span>
              <span className="font-mono text-[var(--accent)] whitespace-nowrap shrink-0">
                {eq.preampDb > 0 ? `+${eq.preampDb.toFixed(1)}` : eq.preampDb.toFixed(1)} dB
              </span>
            </div>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={eq.preampDb}
              onChange={(e) => void updateEqualizer({ preampDb: parseFloat(e.target.value) })}
              className="glass-range w-full"
            />
          </div>

          <div className="glass-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5 truncate">
                <IconVolume size={13} className="shrink-0" /> {t.player.volumeBoost}
              </span>
              <span className="font-mono text-[var(--accent)] whitespace-nowrap shrink-0">
                {Math.round((eq.volumeBoost || 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.05}
              value={eq.volumeBoost || 1}
              onChange={(e) => void updateEqualizer({ volumeBoost: parseFloat(e.target.value) })}
              className="glass-range w-full"
            />
          </div>

          <div className="glass-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)] truncate">{t.personalize.stereoBalance}</span>
              <span className="font-mono text-[var(--accent)] whitespace-nowrap shrink-0">
                {eq.stereoBalance === 0
                  ? 'Center'
                  : eq.stereoBalance < 0
                    ? `L ${Math.round(Math.abs(eq.stereoBalance) * 100)}%`
                    : `R ${Math.round(eq.stereoBalance * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={eq.stereoBalance || 0}
              onChange={(e) => void updateEqualizer({ stereoBalance: parseFloat(e.target.value) })}
              className="glass-range w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
