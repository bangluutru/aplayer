import React, { useState } from 'react'
import { formatDuration } from '@shared/formats'
import { getThemePreset } from '@shared/themes'
import { mediaController } from '../engine/mediaController'
import { useAppStore } from '../store/useAppStore'
import {
  IconEqualizer,
  IconFullscreen,
  IconMusic,
  IconNext,
  IconPause,
  IconPlay,
  IconPrev,
  IconVideo,
  IconVolume,
  IconVolumeMute
} from './icons/APlayerIcons'

export const MiniPlayerBar: React.FC = () => {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const currentItem = useAppStore((s) => s.currentItem)
  const remoteStream = useAppStore((s) => s.remoteStream)
  const isPlaying = useAppStore((s) => s.isPlaying)
  const currentTime = useAppStore((s) => s.currentTime)
  const duration = useAppStore((s) => s.duration)
  const volume = useAppStore((s) => s.volume)
  const muted = useAppStore((s) => s.muted)
  const setVolume = useAppStore((s) => s.setVolume)
  const setMuted = useAppStore((s) => s.setMuted)
  const playNext = useAppStore((s) => s.playNext)
  const playPrevious = useAppStore((s) => s.playPrevious)
  const setShowEqModal = useAppStore((s) => s.setShowEqModal)
  const getArtworkUrl = useAppStore((s) => s.getArtworkUrl)
  const settings = useAppStore((s) => s.settings)

  const [imgErr, setImgErr] = useState(false)

  if (activeTab === 'player' || (!currentItem && !remoteStream)) {
    return null
  }

  const theme = getThemePreset(settings.themeId)
  const accent = settings.customAccent || theme.accent
  const art = remoteStream?.thumbnail || getArtworkUrl(currentItem)
  const title = currentItem?.title || remoteStream?.title || ''
  const subtitle = currentItem?.artist || remoteStream?.uploader || ''
  const ratio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  return (
    <div className="glass-elevated px-4 py-2.5 flex items-center gap-4 shrink-0">
      {/* Track Info -> Click to expand */}
      <button
        onClick={() => setActiveTab('player')}
        className="flex items-center gap-3 min-w-0 w-60 text-left group"
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--glass-btn-bg)] flex items-center justify-center shrink-0 border border-[var(--glass-track-bg)]">
          {art && !imgErr ? (
            <img
              src={art}
              alt={title}
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover"
            />
          ) : currentItem?.kind === 'video' || remoteStream ? (
            <IconVideo size={18} className="text-[var(--accent)]" />
          ) : (
            <IconMusic size={18} className="text-[var(--accent)]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate group-hover:text-[var(--accent)] transition">
            {title}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] truncate">{subtitle}</div>
        </div>
      </button>

      {/* Center Transport + Progress */}
      <div className="flex-1 flex flex-col items-center gap-1.5 max-w-xl mx-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void playPrevious()}
            className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition"
          >
            <IconPrev size={15} />
          </button>
          <button
            onClick={() => mediaController.togglePlay()}
            className="glass-btn-accent w-8 h-8 rounded-full flex items-center justify-center"
          >
            {isPlaying ? <IconPause size={14} /> : <IconPlay size={14} className="translate-x-0.5" />}
          </button>
          <button
            onClick={() => void playNext()}
            className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition"
          >
            <IconNext size={15} />
          </button>
        </div>

        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] font-mono text-[var(--text-muted)] w-9 text-right">
            {formatDuration(currentTime)}
          </span>
          <div
            className="flex-1 h-1.5 rounded-full bg-[var(--glass-track-bg)] cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const r = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
              mediaController.seekTo(duration * r)
            }}
          >
            <div
              className="w-full h-full rounded-full origin-left"
              style={{
                transform: `scaleX(${ratio})`,
                background: `linear-gradient(90deg, ${accent}, #FFC247)`
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)] w-9">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Right Volume & Expand */}
      <div className="flex items-center gap-2 w-48 justify-end">
        <button
          onClick={() => setMuted(!muted)}
          className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition"
        >
          {muted || volume === 0 ? (
            <IconVolumeMute size={15} className="text-rose-400" />
          ) : (
            <IconVolume size={15} />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={muted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="glass-range w-20"
        />
        <button
          onClick={() => setShowEqModal(true)}
          className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition"
          title="Equalizer"
        >
          <IconEqualizer size={15} />
        </button>
        <button
          onClick={() => setActiveTab('player')}
          className="p-1.5 rounded-lg hover:bg-[var(--glass-btn-bg)] transition"
          title="Now Playing"
        >
          <IconFullscreen size={15} />
        </button>
      </div>
    </div>
  )
}
