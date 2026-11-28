import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  VoiceEngineId,
  VoiceHubCatalog,
  VoiceHubHealth,
  VoiceHubJob,
  VoiceHubOutputSlot,
  VoiceHubSynthesizeRequest,
  VoiceHubTokenInfo,
  VoiceHubVoice,
  VoiceLangCode,
  VoiceQualityProfile
} from '@shared/types'
import { useAppStore } from '../store/useAppStore'
import {
  IconCheckCircle,
  IconCopy,
  IconExternalLink,
  IconMicrophone,
  IconOpenFile,
  IconPause,
  IconPlay,
  IconRotateCcw,
  IconServer,
  IconWaveform
} from './icons/APlayerIcons'

const EMOTION_DIRECTIONS = [
  { id: 'joyful', label: 'Vui tươi', angle: 270, instruct: 'bright, cheerful and warm tone' },
  { id: 'energetic', label: 'Sôi nổi', angle: 315, instruct: 'energetic, enthusiastic delivery' },
  { id: 'news', label: 'Tin tức', angle: 0, instruct: 'clear, crisp professional broadcast anchor' },
  { id: 'dramatic', label: 'Kịch tính', angle: 45, instruct: 'dramatic, expressive cinematic pacing' },
  { id: 'calm', label: 'Trầm lắng', angle: 90, instruct: 'calm, deep and contemplative narration' },
  { id: 'sad', label: 'U buồn', angle: 135, instruct: 'gentle, melancholic and soft voice' },
  { id: 'story', label: 'Kể chuyện', angle: 180, instruct: 'warm, natural audiobook storyteller' },
  { id: 'gentle', label: 'Dịu dàng', angle: 225, instruct: 'soft, tender and reassuring tone' }
] as const

const FALLBACK_PRESETS: Record<VoiceLangCode, Record<'word' | 'compound' | 'short' | 'long' | 'paragraph', string>> = {
  vi: {
    word: 'Nắng.',
    compound: 'Hạnh phúc.',
    short: 'Sáng nay trời trong xanh và mát mẻ lắm.',
    long: 'Khi những tia nắng đầu tiên xuyên qua tán lá xanh mướt bên hiên nhà, cả khu phố nhỏ dường như bừng tỉnh với tiếng chim hót ríu rít.',
    paragraph:
      'Mỗi buổi chiều muộn, tôi thường đi dạo dọc theo con đường ven sông để ngắm nhìn ánh đèn thành phố dần thắp sáng trên mặt nước lăn tăn.'
  },
  en: {
    word: 'Serendipity.',
    compound: 'Thunderstorm.',
    short: 'The morning coffee smells wonderful today.',
    long: 'Although the forecast promised clear skies all afternoon, a sudden gust of wind carried dark silver clouds across the harbor.',
    paragraph:
      'Every autumn, the quiet coastal town transforms as warm amber light settles over the old wooden rooftops. Visitors often pause at the overlook to watch the tide roll in.'
  },
  ja: {
    word: '桜。',
    compound: '青空。',
    short: '今朝は風がとても涼しくて気持ちいいですね。',
    long: '長い冬のあいだ静かに眠っていた公園の並木道も、あたたかな春の日差しが差し込むようになると、街全体が明るい雰囲気に包まれます。',
    paragraph:
      '夕暮れ時になると、川沿いの遊歩道にはオレンジ色の光がやわらかく広がります。忙しい毎日の中でも、季節の移ろいに目を向けるひとときがあると、心にすっと余裕が生まれます。'
  }
}

const ENGINES_FOR_LANG: Record<VoiceLangCode, VoiceEngineId[]> = {
  vi: ['vieneu', 'voxcpm2'],
  en: ['voxcpm2', 'qwen3', 'kokoro'],
  ja: ['voxcpm2', 'qwen3', 'kokoro']
}

const ENGINE_SHORT_LABEL: Record<VoiceEngineId, string> = {
  vieneu: 'VieNeu 48kHz',
  voxcpm2: 'VoxCPM2 48kHz',
  qwen3: 'Qwen3-TTS 1.7B',
  kokoro: 'Kokoro (Nhanh)'
}

export const VoiceStudioView: React.FC = () => {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const libraryItems = useAppStore((s) => s.libraryItems)
  const playMediaItem = useAppStore((s) => s.playMediaItem)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const getLocalFileUrl = useAppStore((s) => s.getLocalFileUrl)
  const pushToast = useAppStore((s) => s.pushToast)

  const hubSettings = settings.voiceHub

  // Hub state
  const [health, setHealth] = useState<VoiceHubHealth | null>(null)
  const [catalog, setCatalog] = useState<VoiceHubCatalog | null>(null)
  const [history, setHistory] = useState<VoiceHubJob[]>([])
  const [connecting, setConnecting] = useState(false)
  const [hubError, setHubError] = useState('')

  // LAN / Remote configuration drawer
  const [showLanConfig, setShowLanConfig] = useState(false)
  const [lanUrlDraft, setLanUrlDraft] = useState(hubSettings.remoteUrl || 'http://imac-m4.local:8765')
  const [lanTokenDraft, setLanTokenDraft] = useState(hubSettings.remoteToken || '')
  const [showTokenText, setShowTokenText] = useState(false)
  const [testingLan, setTestingLan] = useState(false)
  const [localTokenInfo, setLocalTokenInfo] = useState<VoiceHubTokenInfo | null>(null)

  // Selection state
  const [lang, setLang] = useState<VoiceLangCode>('ja')
  const [engine, setEngine] = useState<VoiceEngineId>('voxcpm2')
  const [compareMode, setCompareMode] = useState(false)
  const [compareEngine, setCompareEngine] = useState<VoiceEngineId>('qwen3')
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [showSA, setShowSA] = useState(false)
  const [voiceId, setVoiceId] = useState<string>('ja_amitaro_f')
  const [cloneRefPath, setCloneRefPath] = useState<string>('')
  const [showLibPicker, setShowLibPicker] = useState(false)

  // Emotion wheel & engine tuning
  const [wheelKnob, setWheelKnob] = useState({ x: 110, y: 110, radiusPct: 0, label: 'Tự nhiên' })
  const [instruct, setInstruct] = useState('')
  const [quality, setQuality] = useState<VoiceQualityProfile>('studio')
  const [speed, setSpeed] = useState(1.0)
  const wheelRef = useRef<HTMLDivElement>(null)
  const wheelDragging = useRef(false)

  // Script & synthesis job
  const [scriptByLang, setScriptByLang] = useState<Record<VoiceLangCode, string>>({
    vi: FALLBACK_PRESETS.vi.short,
    en: FALLBACK_PRESETS.en.short,
    ja: FALLBACK_PRESETS.ja.short
  })
  const [activeJob, setActiveJob] = useState<VoiceHubJob | null>(null)
  const [lastDoneJob, setLastDoneJob] = useState<VoiceHubJob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingSlot, setSavingSlot] = useState<string | null>(null)

  // Instant audition preview audio player
  const previewAudioRef = useRef<HTMLAudioElement>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null)
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const scriptText = scriptByLang[lang] || ''
  const isBusy = submitting || activeJob?.state === 'queued' || activeJob?.state === 'running'

  const loadHub = useCallback(async () => {
    if (!window.aplayerAPI) return
    setConnecting(true)
    setHubError('')
    try {
      const h = await window.aplayerAPI.voiceHubHealth()
      setHealth(h)
      if (!h.ready && h.error) {
        setHubError(h.error)
        return
      }
      const [cat, hist] = await Promise.all([
        window.aplayerAPI.voiceHubCatalog(),
        window.aplayerAPI.voiceHubHistory().catch(() => [] as VoiceHubJob[])
      ])
      setCatalog(cat)
      setHistory(hist)
      if (hist.length > 0 && !lastDoneJob) {
        setLastDoneJob(hist[0])
      }
    } catch (err) {
      setHubError(err instanceof Error ? err.message : 'Không kết nối được Voice Hub.')
    } finally {
      setConnecting(false)
    }
  }, [lastDoneJob])

  useEffect(() => {
    void loadHub()
  }, [hubSettings.mode, hubSettings.remoteUrl, hubSettings.localPort])

  useEffect(() => {
    setLanUrlDraft(hubSettings.remoteUrl || 'http://imac-m4.local:8765')
    setLanTokenDraft(hubSettings.remoteToken || '')
  }, [hubSettings.remoteUrl, hubSettings.remoteToken])

  // Sync valid engine when switching language
  useEffect(() => {
    const allowed = ENGINES_FOR_LANG[lang]
    if (!allowed.includes(engine)) {
      setEngine(allowed[0])
    }
    const other = allowed.find((e) => e !== engine) || allowed[0]
    if (compareEngine === engine || !allowed.includes(compareEngine)) {
      setCompareEngine(other)
    }
  }, [lang, engine, compareEngine])

  // Filtered voices
  const filteredVoices = useMemo<VoiceHubVoice[]>(() => {
    const all = catalog?.voices || []
    return all.filter((v) => {
      if (v.lang !== lang) return false
      if (v.sa_notice && !showSA) return false
      if (genderFilter !== 'all' && v.gender !== genderFilter) return false
      if (lang === 'vi' && regionFilter !== 'all' && v.region !== regionFilter) return false
      // Show voices compatible with the selected engine (or all for A/B compare)
      if (!compareMode && !v.compatible_engines.includes(engine)) return false
      return true
    })
  }, [catalog, lang, showSA, genderFilter, regionFilter, engine, compareMode])

  useEffect(() => {
    if (filteredVoices.length > 0 && !filteredVoices.some((v) => v.id === voiceId)) {
      setVoiceId(filteredVoices[0].id)
    }
  }, [filteredVoices, voiceId])

  const selectedVoice = useMemo(
    () => (catalog?.voices || []).find((v) => v.id === voiceId) || filteredVoices[0] || null,
    [catalog, voiceId, filteredVoices]
  )

  const engineInfoMap = useMemo(() => {
    const map: Record<string, { ready: boolean; name: string; precision: string; sample_rate: number }> = {}
    for (const e of health?.engines || []) {
      map[e.id] = e
    }
    return map
  }, [health])

  // Build live AIWF CLI command preview
  const liveCliCommand = useMemo(() => {
    const parts = [
      'python3 .agents/skills/_shared/media/tts.py',
      `--lang ${lang}`,
      `--engine ${engine}`
    ]
    if (cloneRefPath) {
      parts.push(`--ref-audio "${cloneRefPath}"`)
    } else if (selectedVoice) {
      parts.push(`--voice "${selectedVoice.id}"`)
    }
    if (engine === 'voxcpm2') parts.push(`--quality ${quality}`)
    if (instruct.trim()) parts.push(`--instruct "${instruct.trim().replace(/"/g, '\\"')}"`)
    if (selectedVoice?.sa_notice) parts.push('--allow-sa')
    if (Math.abs(speed - 1.0) > 0.005) parts.push(`--speed ${speed.toFixed(2)}`)
    const clipped = scriptText.trim().slice(0, 60)
    parts.push(`--text "${clipped.replace(/"/g, '\\"')}${scriptText.trim().length > 60 ? '...' : ''}"`)
    parts.push('--output output.wav')
    return parts.join(' \\\n  ')
  }, [lang, engine, cloneRefPath, selectedVoice, quality, instruct, speed, scriptText])

  // Job polling loop
  useEffect(() => {
    if (!activeJob || !['queued', 'running'].includes(activeJob.state)) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async (): Promise<void> => {
      try {
        const next = await window.aplayerAPI.voiceHubJob(activeJob.id)
        if (stopped) return
        setActiveJob(next)
        if (next.state === 'succeeded') {
          setLastDoneJob(next)
          setHistory((prev) => [next, ...prev.filter((j) => j.id !== next.id)].slice(0, 50))
          pushToast('Đã sinh giọng đọc 48 kHz thành công', 'success')
          if (hubSettings.autoImportGenerated && next.primary) {
            void handleSaveAndPlaySlot(next.primary, next.request.lang, false)
          }
        } else if (next.state === 'failed') {
          pushToast(next.message || 'Sinh giọng thất bại', 'error')
        } else if (next.state === 'queued' || next.state === 'running') {
          timer = setTimeout(() => void poll(), 900)
        }
      } catch (err) {
        if (!stopped) {
          pushToast(err instanceof Error ? err.message : 'Mất kết nối Voice Hub', 'error')
          setActiveJob((prev) => (prev ? { ...prev, state: 'failed' } : null))
        }
      }
    }

    timer = setTimeout(() => void poll(), 600)
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [activeJob?.id, activeJob?.state])

  // Switch Local vs Remote LAN host
  const switchHostMode = async (mode: 'local' | 'remote'): Promise<void> => {
    if (mode === 'remote' && !hubSettings.remoteUrl.trim()) {
      setShowLanConfig(true)
    }
    await updateSettings({ voiceHub: { ...hubSettings, mode } })
  }

  const handleTestAndSaveLan = async (): Promise<void> => {
    if (!window.aplayerAPI) return
    setTestingLan(true)
    try {
      const candidate = {
        ...hubSettings,
        mode: 'remote' as const,
        remoteUrl: lanUrlDraft.trim(),
        remoteToken: lanTokenDraft.trim()
      }
      const res = await window.aplayerAPI.voiceHubHealth(candidate, true)
      if (!res.ready && res.error) {
        pushToast(`Kết nối LAN lỗi: ${res.error}`, 'error')
        return
      }
      await updateSettings({ voiceHub: candidate })
      setHealth(res)
      const [cat, hist] = await Promise.all([
        window.aplayerAPI.voiceHubCatalog(candidate),
        window.aplayerAPI.voiceHubHistory().catch(() => [] as VoiceHubJob[])
      ])
      setCatalog(cat)
      setHistory(hist)
      setHubError('')
      setShowLanConfig(false)
      pushToast(
        `Đã kết nối LAN tới ${res.machine?.hostname || 'Remote Mac'} (${res.machine?.ram_gb || '?'} GB · ${res.machine?.hq_precision || 'MLX'})`,
        'success'
      )
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không kết nối được máy chủ LAN', 'error')
    } finally {
      setTestingLan(false)
    }
  }

  const handleRevealLocalToken = async (): Promise<void> => {
    if (!window.aplayerAPI) return
    try {
      const info = await window.aplayerAPI.voiceHubLocalToken()
      setLocalTokenInfo(info)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không lấy được token cục bộ', 'error')
    }
  }

  // Instant 0ms audition playback
  const handlePlayPreview = async (voice: VoiceHubVoice): Promise<void> => {
    if (!window.aplayerAPI) return
    if (playingPreviewId === voice.id && previewAudioRef.current) {
      previewAudioRef.current.pause()
      setPlayingPreviewId(null)
      return
    }
    setPreviewLoadingId(voice.id)
    try {
      const { filePath } = await window.aplayerAPI.voiceHubPreview(voice.id, voice.lang, voice.engine)
      const mediaUrl = getLocalFileUrl(filePath)
      if (!mediaUrl) throw new Error('Media server nội bộ chưa sẵn sàng.')
      setPreviewUrl(mediaUrl)
      setPlayingPreviewId(voice.id)
      requestAnimationFrame(() => {
        if (previewAudioRef.current) {
          previewAudioRef.current.currentTime = 0
          void previewAudioRef.current.play().catch(() => {
            setPlayingPreviewId(null)
          })
        }
      })
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không phát được mẫu giọng', 'error')
    } finally {
      setPreviewLoadingId(null)
    }
  }

  // Emotion wheel pointer interaction
  const updateWheelFromEvent = (clientX: number, clientY: number): void => {
    if (!wheelRef.current) return
    const rect = wheelRef.current.getBoundingClientRect()
    const dx = ((clientX - rect.left) / rect.width) * 220 - 110
    const dy = ((clientY - rect.top) / rect.height) * 220 - 110
    const dist = Math.min(76, Math.hypot(dx, dy))
    const ang = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360
    const radPct = dist < 11 ? 0 : Math.round((dist / 76) * 100)
    const kx = dist < 11 ? 110 : 110 + Math.cos((ang * Math.PI) / 180) * dist
    const ky = dist < 11 ? 110 : 110 + Math.sin((ang * Math.PI) / 180) * dist

    if (radPct === 0) {
      setWheelKnob({ x: 110, y: 110, radiusPct: 0, label: 'Tự nhiên' })
      setInstruct('')
      return
    }

    let best: (typeof EMOTION_DIRECTIONS)[number] = EMOTION_DIRECTIONS[0]
    let bestDiff = 999
    for (const item of EMOTION_DIRECTIONS) {
      const diff = Math.min(Math.abs(ang - item.angle), 360 - Math.abs(ang - item.angle))
      if (diff < bestDiff) {
        bestDiff = diff
        best = item
      }
    }
    const levelLabel = radPct <= 38 ? 'Nhẹ' : radPct <= 75 ? 'Vừa' : 'Mạnh'
    const levelEn = radPct <= 38 ? 'subtle' : radPct <= 75 ? 'moderate' : 'expressive'
    setWheelKnob({ x: kx, y: ky, radiusPct: radPct, label: `${best.label} (${levelLabel})` })
    setInstruct(`${levelEn} ${best.instruct}`)
  }

  const resetWheel = (): void => {
    setWheelKnob({ x: 110, y: 110, radiusPct: 0, label: 'Tự nhiên' })
    setInstruct('')
  }

  // Synthesize request dispatch
  const handleSynthesize = async (): Promise<void> => {
    if (!window.aplayerAPI || !scriptText.trim() || isBusy) return
    setSubmitting(true)
    try {
      const req: VoiceHubSynthesizeRequest = {
        lang,
        engine,
        voice_id: cloneRefPath ? null : selectedVoice?.id || null,
        text: scriptText.trim(),
        quality,
        speed,
        instruct: instruct.trim() || null,
        allow_sa: Boolean(selectedVoice?.sa_notice || showSA),
        compare_engine: compareMode && compareEngine !== engine ? compareEngine : null,
        ref_audio_path: cloneRefPath || null
      }
      const created = await window.aplayerAPI.voiceHubSynthesize(req)
      setActiveJob(created)
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không gửi được yêu cầu sinh giọng', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelJob = async (): Promise<void> => {
    if (!activeJob || !window.aplayerAPI) return
    try {
      await window.aplayerAPI.voiceHubCancel(activeJob.id)
      setActiveJob({ ...activeJob, state: 'cancelled', message: 'Đã huỷ yêu cầu.' })
    } catch {
      // ignore
    }
  }

  const handleSaveAndPlaySlot = async (
    slot: VoiceHubOutputSlot,
    slotLang: string,
    openPlayer = true
  ): Promise<void> => {
    if (!window.aplayerAPI) return
    setSavingSlot(slot.filename)
    try {
      const suggested = `${slotLang}_${slot.engine_key}_${slot.voice}`
      const saved = await window.aplayerAPI.voiceHubSaveToLibrary(slot.audio_url, suggested, true)
      if (saved.item && openPlayer) {
        await playMediaItem(saved.item)
        setActiveTab('player')
      } else if (openPlayer) {
        pushToast(`Đã lưu: ${saved.filePath}`, 'success')
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Không lưu được file vào Thư viện', 'error')
    } finally {
      setSavingSlot(null)
    }
  }

  const handleCopyText = async (content: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content)
      pushToast(`Đã sao chép ${label}`, 'success')
    } catch {
      pushToast('Không truy cập được Clipboard', 'error')
    }
  }

  const handlePickRefFile = async (): Promise<void> => {
    if (!window.aplayerAPI) return
    const files = await window.aplayerAPI.openMediaFilesDialog()
    if (files.length > 0) {
      setCloneRefPath(files[0])
      setShowLibPicker(false)
      pushToast('Đã gắn file giọng mẫu cho chế độ Clone', 'info')
    }
  }

  const audioLibraryChoices = useMemo(
    () => libraryItems.filter((item) => item.kind === 'audio').slice(0, 24),
    [libraryItems]
  )

  const presetsForLang = catalog?.presets?.[lang] || FALLBACK_PRESETS[lang]

  return (
    <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0 overflow-hidden">
      {/* Hidden inline audio element for 0ms audition playback */}
      <audio
        ref={previewAudioRef}
        src={previewUrl || undefined}
        onEnded={() => setPlayingPreviewId(null)}
        onError={() => setPlayingPreviewId(null)}
      />

      {/* TOP STATUS & HOST CONNECTION BAR */}
      <section className="glass-panel px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/15"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            <IconMicrophone size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-sm font-bold truncate">Voice Studio · AIWF Hub</h1>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  health?.ready
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                }`}
              >
                {connecting
                  ? 'Đang kết nối...'
                  : health?.ready
                    ? `${health.machine?.hostname || 'Local'} · ${health.machine?.ram_gb || 16}GB · ${health.machine?.hq_precision || 'MLX'}`
                    : 'Chưa kết nối'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              4 Engine Offline miễn phí (VieNeu · VoxCPM2 48kHz · Qwen3-TTS · Kokoro) ·{' '}
              {health?.voice_bank_count || 0} giọng mẫu Voice Bank
            </p>
          </div>
        </div>

        {/* Host Switcher + LAN Config + Full VOXA + Opt-in Gemini */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[var(--glass-input-bg)] border border-[var(--glass-track-bg)]">
            <button
              onClick={() => void switchHostMode('local')}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition cursor-pointer ${
                hubSettings.mode === 'local'
                  ? 'glass-btn-accent font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Local (Máy này)
            </button>
            <button
              onClick={() => void switchHostMode('remote')}
              className={`px-2.5 py-1 rounded-lg text-[11.5px] font-medium transition flex items-center gap-1.5 cursor-pointer ${
                hubSettings.mode === 'remote'
                  ? 'glass-btn-accent font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <IconServer size={12} />
              <span>Remote LAN (iMac M4)</span>
            </button>
          </div>

          <button
            onClick={() => setShowLanConfig((v) => !v)}
            className="glass-btn px-2.5 py-1.5 rounded-xl text-[11.5px] font-medium cursor-pointer"
          >
            {showLanConfig ? 'Đóng cài đặt LAN' : 'Cấu hình LAN'}
          </button>

          <button
            onClick={() => void window.aplayerAPI?.voiceHubOpenVoxa(false)}
            className="glass-btn px-2.5 py-1.5 rounded-xl text-[11.5px] font-medium flex items-center gap-1.5 cursor-pointer"
            title="Mở giao diện VOXA đầy đủ trên trình duyệt (soạn hội thoại nhiều nhân vật)"
          >
            <IconExternalLink size={13} />
            <span>VOXA đầy đủ</span>
          </button>

          {/* Gemini Cloud Toggle — OFF by default as requested */}
          <label
            className="glass-btn px-2.5 py-1.5 rounded-xl text-[11.5px] flex items-center gap-1.5 cursor-pointer"
            title="Gemini 3.8 Flash TTS (Cloud có phí) — mặc định tắt"
          >
            <input
              type="checkbox"
              checked={Boolean(hubSettings.enableGeminiCloud)}
              onChange={(e) =>
                void updateSettings({
                  voiceHub: { ...hubSettings, enableGeminiCloud: e.target.checked }
                })
              }
              className="accent-[var(--accent)] cursor-pointer"
            />
            <span>Gemini Cloud</span>
          </label>

          {hubSettings.enableGeminiCloud && (
            <button
              onClick={() => void window.aplayerAPI?.voiceHubOpenVoxa(true)}
              className="px-2.5 py-1.5 rounded-xl text-[11.5px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 transition flex items-center gap-1 cursor-pointer"
            >
              <IconExternalLink size={12} />
              <span>Mở Gemini TTS (Có phí)</span>
            </button>
          )}
        </div>
      </section>

      {/* COLLAPSIBLE LAN / REMOTE IMAC M4 CONFIG DRAWER */}
      {showLanConfig && (
        <section className="glass-elevated p-3.5 space-y-3 shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Client side (MacBook M1 -> iMac M4) */}
            <div className="lg:col-span-7 glass-card p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold">Kết nối tới máy chủ Voice Hub qua mạng LAN (ví dụ iMac M4 24 GB)</h3>
                <span className="text-[11px] text-[var(--text-muted)]">Token gửi qua Header bảo mật</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="space-y-1 text-[11px]">
                  <span className="text-[var(--text-muted)]">URL máy chủ LAN</span>
                  <input
                    type="text"
                    value={lanUrlDraft}
                    onChange={(e) => setLanUrlDraft(e.target.value)}
                    placeholder="http://imac-m4.local:8765"
                    className="glass-input w-full px-2.5 py-1.5 rounded-lg text-xs font-mono"
                  />
                </label>
                <label className="space-y-1 text-[11px]">
                  <span className="text-[var(--text-muted)]">Mã bảo mật (X-Voice-Hub-Token)</span>
                  <div className="flex gap-1">
                    <input
                      type={showTokenText ? 'text' : 'password'}
                      value={lanTokenDraft}
                      onChange={(e) => setLanTokenDraft(e.target.value)}
                      placeholder="Dán token từ lệnh start_lan.sh"
                      className="glass-input flex-1 px-2.5 py-1.5 rounded-lg text-xs font-mono"
                    />
                    <button
                      onClick={() => setShowTokenText((s) => !s)}
                      className="glass-btn px-2 rounded-lg text-[11px] cursor-pointer"
                    >
                      {showTokenText ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleTestAndSaveLan()}
                  disabled={testingLan}
                  className="glass-btn-accent px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {testingLan ? 'Đang kiểm tra...' : 'Kiểm tra kết nối & Dùng LAN'}
                </button>
                <button
                  onClick={() => void loadHub()}
                  className="glass-btn px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Tải lại trạng thái
                </button>
              </div>
            </div>

            {/* Host side info (show this machine's LAN token for sharing) */}
            <div className="lg:col-span-5 glass-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold">Chia sẻ máy này làm Server LAN</h3>
                <button
                  onClick={() => void handleRevealLocalToken()}
                  className="glass-btn px-2.5 py-1 rounded-lg text-[11px] cursor-pointer"
                >
                  Lấy Token máy này
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Trên <strong>iMac M4 24 GB</strong>, chạy <code className="font-mono">sh scripts/start_lan.sh</code> trong
                thư mục <code className="font-mono">voice-selector</code> để mở cổng LAN với bản <strong>bf16</strong>.
              </p>
              {localTokenInfo && (
                <div className="p-2 rounded-lg bg-[var(--glass-input-bg)] text-[11px] font-mono space-y-1">
                  <div className="truncate">URL: http://{localTokenInfo.mdns_host}:{hubSettings.localPort}</div>
                  <div className="truncate">IP: http://{localTokenInfo.local_ip}:{hubSettings.localPort}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">Token: {localTokenInfo.token}</span>
                    <button
                      onClick={() => void handleCopyText(localTokenInfo.token, 'LAN Token')}
                      className="text-[var(--spark)] font-sans font-semibold shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CONNECTION ERROR NOTICE */}
      {hubError && (
        <div className="glass-card px-4 py-2.5 border border-rose-400/40 bg-rose-500/10 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-rose-200">{hubError}</span>
          <button
            onClick={() => void loadHub()}
            className="glass-btn px-3 py-1 rounded-lg text-xs font-medium cursor-pointer shrink-0"
          >
            Thử kết nối lại
          </button>
        </div>
      )}

      {/* LANGUAGE, ENGINE & MODE BAR */}
      <section className="glass-panel px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          {([
            ['vi', 'Tiếng Việt · VI'],
            ['en', 'English · EN'],
            ['ja', '日本語 · JA']
          ] as const).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                lang === code ? 'glass-btn-accent' : 'glass-btn'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Engine Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ENGINES_FOR_LANG[lang].map((eid) => {
            const info = engineInfoMap[eid]
            const active = engine === eid
            return (
              <button
                key={eid}
                onClick={() => setEngine(eid)}
                className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  active ? 'glass-btn-accent font-semibold' : 'glass-btn'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    info?.ready ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span>{ENGINE_SHORT_LABEL[eid]}</span>
              </button>
            )
          })}
        </div>

        {/* Single vs A/B Compare */}
        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-[var(--glass-input-bg)] border border-[var(--glass-track-bg)]">
          <button
            onClick={() => setCompareMode(false)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
              !compareMode ? 'glass-btn-accent font-semibold' : 'text-[var(--text-secondary)]'
            }`}
          >
            Đơn giọng
          </button>
          <button
            onClick={() => setCompareMode(true)}
            disabled={ENGINES_FOR_LANG[lang].length < 2}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-40 ${
              compareMode ? 'glass-btn-accent font-semibold' : 'text-[var(--text-secondary)]'
            }`}
          >
            So sánh A/B
          </button>
        </div>
      </section>

      {/* MAIN 3-COLUMN STUDIO CONSOLE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* COL 1: VOICE BANK & 0ms PREVIEW */}
        <section className="glass-panel lg:col-span-4 p-3.5 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--glass-btn-bg)] text-[var(--spark)]">
                01
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider">Kho Giọng & Nghe Mẫu</h2>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--glass-btn-bg)] text-[var(--text-secondary)]">
              {filteredVoices.length} giọng
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              {([
                ['all', 'Tất cả'],
                ['female', 'Nữ'],
                ['male', 'Nam']
              ] as const).map(([gid, label]) => (
                <button
                  key={gid}
                  onClick={() => setGenderFilter(gid)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer ${
                    genderFilter === gid ? 'glass-btn-accent font-semibold' : 'glass-btn'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {lang === 'vi' && (
              <div className="flex items-center gap-1">
                {['all', 'Bắc', 'Trung', 'Nam'].map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setRegionFilter(reg)}
                    className={`px-2 py-1 rounded-lg text-[11px] cursor-pointer ${
                      regionFilter === reg ? 'glass-btn-accent font-semibold' : 'glass-btn'
                    }`}
                  >
                    {reg === 'all' ? '3 miền' : reg}
                  </button>
                ))}
              </div>
            )}

            {lang === 'ja' && (
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSA}
                  onChange={(e) => setShowSA(e.target.checked)}
                  className="accent-[var(--accent)] cursor-pointer"
                />
                <span>Ưu tiên 2 (SA)</span>
              </label>
            )}
          </div>

          {/* Active Clone Ref Indicator */}
          {cloneRefPath && (
            <div className="glass-card glass-card-selected p-2.5 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--spark)]">
                  <IconCheckCircle size={13} />
                  <span>Đang chọn file giọng mẫu Clone</span>
                </div>
                <div className="text-[11px] font-mono truncate text-[var(--text-primary)]">
                  {cloneRefPath.split('/').pop()}
                </div>
              </div>
              <button
                onClick={() => setCloneRefPath('')}
                className="glass-btn px-2 py-1 rounded-lg text-[11px] shrink-0 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          )}

          {/* Voice Cards Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0" role="radiogroup" aria-label="Danh sách giọng mẫu">
            {filteredVoices.map((v) => {
              const selected = !cloneRefPath && selectedVoice?.id === v.id
              const isPlayingThis = playingPreviewId === v.id
              const isLoadingThis = previewLoadingId === v.id
              return (
                <div
                  key={v.id}
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  onClick={() => {
                    setCloneRefPath('')
                    setVoiceId(v.id)
                    if (!v.compatible_engines.includes(engine)) {
                      setEngine(v.engine)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setCloneRefPath('')
                      setVoiceId(v.id)
                      if (!v.compatible_engines.includes(engine)) {
                        setEngine(v.engine)
                      }
                    }
                  }}
                  className={`glass-card relative p-2.5 flex items-center gap-2.5 cursor-pointer transition-all ${
                    selected
                      ? 'glass-card-selected'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Solid Left Selection Indicator Bar */}
                  {selected && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
                      style={{ background: 'linear-gradient(180deg, var(--spark), var(--accent))' }}
                    />
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setCloneRefPath('')
                      setVoiceId(v.id)
                      if (!v.compatible_engines.includes(engine)) {
                        setEngine(v.engine)
                      }
                      void handlePlayPreview(v)
                    }}
                    disabled={isLoadingThis}
                    className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center cursor-pointer ${
                      isPlayingThis || selected ? 'glass-btn-accent' : 'glass-btn'
                    }`}
                    title={v.instant_preview ? 'Nghe mẫu 0ms có sẵn' : 'Tạo và nghe mẫu giọng'}
                  >
                    {isPlayingThis ? <IconPause size={13} /> : <IconPlay size={13} className="translate-x-0.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs truncate ${selected ? 'font-extrabold text-[var(--text-primary)]' : 'font-semibold'}`}>
                        {v.name}
                      </span>
                      {v.sa_notice && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-semibold">
                          Ưu tiên 2 · SA
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] truncate ${selected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>
                      {v.gender === 'female' ? 'Nữ' : 'Nam'} · {v.license}
                      {v.region ? ` · ${v.region}` : ''}
                      {v.duration_s ? ` · ${v.duration_s.toFixed(1)}s` : ''}
                    </div>
                  </div>

                  {selected && (
                    <span className="glass-btn-accent px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0">
                      <IconCheckCircle size={12} />
                      <span>Đang chọn</span>
                    </span>
                  )}
                </div>
              )
            })}

            {filteredVoices.length === 0 && (
              <div className="text-xs text-[var(--text-muted)] text-center py-8">
                {connecting ? 'Đang nạp danh mục giọng AIWF...' : 'Không có giọng phù hợp bộ lọc này.'}
              </div>
            )}
          </div>

          {/* Clone from APlayer Library / Local file */}
          <div className="pt-1 space-y-1.5 shrink-0">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setShowLibPicker((s) => !s)}
                className="glass-btn py-1.5 px-2.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <IconWaveform size={13} />
                <span>Clone từ Thư viện</span>
              </button>
              <button
                onClick={() => void handlePickRefFile()}
                className="glass-btn py-1.5 px-2.5 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <IconOpenFile size={13} />
                <span>Chọn file WAV/MP3</span>
              </button>
            </div>

            {showLibPicker && (
              <div className="glass-card p-2 max-h-32 overflow-y-auto space-y-1">
                {audioLibraryChoices.length === 0 ? (
                  <div className="text-[11px] text-[var(--text-muted)] text-center py-2">
                    Thư viện APlayer chưa có file âm thanh nào.
                  </div>
                ) : (
                  audioLibraryChoices.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCloneRefPath(item.filePath)
                        setShowLibPicker(false)
                      }}
                      className="w-full text-left px-2 py-1 rounded-lg text-[11px] hover:bg-[var(--glass-btn-bg)] truncate cursor-pointer"
                    >
                      {item.title || item.fileName}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </section>

        {/* COL 2: EMOTION WHEEL & ENGINE PARAMETERS */}
        <section className="glass-panel lg:col-span-4 p-3.5 flex flex-col gap-3 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--glass-btn-bg)] text-[var(--spark)]">
                02
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider">Đạo Diễn & Thông Số</h2>
            </div>
            <button
              onClick={resetWheel}
              className="glass-btn px-2 py-1 rounded-lg text-[11px] flex items-center gap-1 cursor-pointer"
              title="Đưa về Tự nhiên"
            >
              <IconRotateCcw size={12} />
              <span>Đặt lại</span>
            </button>
          </div>

          {/* Interactive Emotion Wheel */}
          <div className="glass-card p-3 flex flex-col items-center gap-2">
            <div
              ref={wheelRef}
              role="slider"
              tabIndex={0}
              aria-label="Bánh xe cảm xúc"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={wheelKnob.radiusPct}
              onPointerDown={(e) => {
                wheelDragging.current = true
                wheelRef.current?.setPointerCapture(e.pointerId)
                updateWheelFromEvent(e.clientX, e.clientY)
              }}
              onPointerMove={(e) => {
                if (wheelDragging.current) updateWheelFromEvent(e.clientX, e.clientY)
              }}
              onPointerUp={() => {
                wheelDragging.current = false
              }}
              className="w-[184px] h-[184px] cursor-crosshair touch-none"
            >
              <svg viewBox="0 0 220 220" className="w-full h-full">
                <circle
                  cx="110"
                  cy="110"
                  r="76"
                  fill="var(--accent)"
                  fillOpacity="0.09"
                  stroke="var(--glass-track-bg)"
                  strokeWidth="1"
                />
                <circle cx="110" cy="110" r="50" fill="none" stroke="var(--glass-track-bg)" strokeDasharray="3 3" />
                <circle cx="110" cy="110" r="25" fill="none" stroke="var(--glass-track-bg)" strokeDasharray="2 3" />
                <text x="110" y="18" textAnchor="middle" fill="var(--text-secondary)" fontSize="10.5" fontWeight="600">
                  Vui tươi
                </text>
                <text x="174" y="48" textAnchor="start" fill="var(--text-secondary)" fontSize="9.5">
                  Sôi nổi
                </text>
                <text x="192" y="113" textAnchor="start" fill="var(--text-secondary)" fontSize="9.5">
                  Tin tức
                </text>
                <text x="172" y="175" textAnchor="start" fill="var(--text-secondary)" fontSize="9.5">
                  Kịch tính
                </text>
                <text x="110" y="209" textAnchor="middle" fill="var(--text-secondary)" fontSize="10.5" fontWeight="600">
                  Trầm lắng
                </text>
                <text x="46" y="175" textAnchor="end" fill="var(--text-secondary)" fontSize="9.5">
                  U buồn
                </text>
                <text x="27" y="113" textAnchor="end" fill="var(--text-secondary)" fontSize="9.5">
                  Kể chuyện
                </text>
                <text x="46" y="48" textAnchor="end" fill="var(--text-secondary)" fontSize="9.5">
                  Dịu dàng
                </text>
                <line
                  x1="110"
                  y1="110"
                  x2={wheelKnob.x}
                  y2={wheelKnob.y}
                  stroke="var(--spark)"
                  strokeWidth="2"
                  strokeOpacity="0.85"
                />
                <circle cx={wheelKnob.x} cy={wheelKnob.y} r="13" fill="var(--accent)" fillOpacity="0.22" />
                <circle
                  cx={wheelKnob.x}
                  cy={wheelKnob.y}
                  r="6.5"
                  fill="#ffffff"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                />
              </svg>
            </div>

            <div className="w-full flex items-center justify-between text-xs px-1">
              <span className="font-semibold">
                {wheelKnob.label} · {wheelKnob.radiusPct}%
              </span>
              <span className="text-[11px] font-mono text-[var(--spark)]">
                {instruct.trim()
                  ? engine === 'voxcpm2'
                    ? 'Controllable Clone'
                    : engine === 'qwen3'
                      ? 'Qwen3 Instruct'
                      : 'Chỉ áp dụng VoxCPM2/Qwen3'
                  : 'Clone tự nhiên'}
              </span>
            </div>

            <input
              type="text"
              value={instruct}
              onChange={(e) => setInstruct(e.target.value)}
              placeholder="Chỉ dẫn --instruct (để trống = clone tự nhiên chuẩn nhất)"
              className="glass-input w-full px-2.5 py-1.5 rounded-lg text-xs"
            />
          </div>

          {/* Engine Quality & Speed Controls */}
          <div className="glass-card p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-secondary)]">Hồ sơ VoxCPM2 48 kHz</span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                {engineInfoMap[engine]?.precision || '48 kHz'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['studio', 'Studio (20)'],
                ['balanced', 'Balanced (15)'],
                ['fast', 'Fast (10)']
              ] as const).map(([qid, label]) => (
                <button
                  key={qid}
                  onClick={() => setQuality(qid)}
                  disabled={engine !== 'voxcpm2' && (!compareMode || compareEngine !== 'voxcpm2')}
                  className={`py-1.5 rounded-lg text-[11px] cursor-pointer disabled:opacity-40 ${
                    quality === qid ? 'glass-btn-accent font-semibold' : 'glass-btn'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {compareMode && (
              <div className="pt-1 space-y-1">
                <span className="text-[11px] text-[var(--text-muted)]">Engine B đối chiếu song song</span>
                <div className="flex flex-wrap gap-1.5">
                  {ENGINES_FOR_LANG[lang]
                    .filter((eid) => eid !== engine)
                    .map((eid) => (
                      <button
                        key={eid}
                        onClick={() => setCompareEngine(eid)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer ${
                          compareEngine === eid ? 'glass-btn-accent font-semibold' : 'glass-btn'
                        }`}
                      >
                        {ENGINE_SHORT_LABEL[eid]}
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--text-muted)]">Tốc độ</span>
                  <span className="font-mono">{speed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.3}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="glass-range w-full"
                />
              </label>

              <label className="flex items-center gap-1.5 pt-3 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hubSettings.autoImportGenerated}
                  onChange={(e) =>
                    void updateSettings({
                      voiceHub: { ...hubSettings, autoImportGenerated: e.target.checked }
                    })
                  }
                  className="accent-[var(--accent)] cursor-pointer"
                />
                <span>Tự thêm Thư viện</span>
              </label>
            </div>
          </div>
        </section>

        {/* COL 3: SCRIPT, A/B RESULTS & AIWF DISPATCH */}
        <section className="glass-panel lg:col-span-4 p-3.5 flex flex-col gap-2.5 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--glass-btn-bg)] text-[var(--spark)]">
                03
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider">Kịch Bản & Gửi Engine</h2>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {scriptText.length.toLocaleString('vi')} / 3.000
            </span>
          </div>

          {/* Persistent Active Target Voice Summary Banner — 100% clear which reference voice will be cloned */}
          <div className="glass-card glass-card-selected px-3 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider font-bold text-[var(--spark)]">
                <IconCheckCircle size={12} />
                <span>Giọng sẽ sinh theo mẫu này</span>
              </div>
              <div className="text-xs font-extrabold truncate text-[var(--text-primary)]">
                {cloneRefPath
                  ? `File Clone: ${cloneRefPath.split('/').pop()}`
                  : selectedVoice
                    ? `${selectedVoice.name}`
                    : 'Chưa chọn giọng mẫu'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] truncate">
                {ENGINE_SHORT_LABEL[engine]}
                {!cloneRefPath && selectedVoice
                  ? ` · ${selectedVoice.gender === 'female' ? 'Nữ' : 'Nam'} · ${selectedVoice.id}`
                  : ''}
                {compareMode ? ` + A/B ${ENGINE_SHORT_LABEL[compareEngine]}` : ''}
              </div>
            </div>
            {!cloneRefPath && selectedVoice && (
              <button
                onClick={() => void handlePlayPreview(selectedVoice)}
                disabled={previewLoadingId === selectedVoice.id}
                className="glass-btn-accent px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                title="Nghe lại giọng mẫu đang chọn trước khi sinh"
              >
                {playingPreviewId === selectedVoice.id ? <IconPause size={12} /> : <IconPlay size={12} />}
                <span>{playingPreviewId === selectedVoice.id ? 'Dừng' : 'Nghe mẫu'}</span>
              </button>
            )}
          </div>

          {/* 5-level evaluation presets */}
          <div className="flex flex-wrap gap-1 shrink-0">
            {([
              ['word', 'Từ đơn'],
              ['compound', 'Từ ghép'],
              ['short', 'Câu ngắn'],
              ['long', 'Câu dài'],
              ['paragraph', 'Đoạn văn']
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() =>
                  setScriptByLang((prev) => ({
                    ...prev,
                    [lang]: presetsForLang[key]
                  }))
                }
                className="glass-btn px-2 py-0.5 rounded-md text-[11px] cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            maxLength={3000}
            value={scriptText}
            onChange={(e) => setScriptByLang((prev) => ({ ...prev, [lang]: e.target.value }))}
            placeholder="Nhập câu chữ cần thử giọng hoặc gửi cho engine..."
            className="glass-input w-full rounded-xl p-2.5 text-xs leading-relaxed resize-none shrink-0"
          />

          {/* Primary Dispatch CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => void handleSynthesize()}
              disabled={isBusy || !scriptText.trim() || !health?.ready}
              className="glass-btn-accent flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
            >
              <IconPlay size={14} />
              <span className="truncate">
                {isBusy
                  ? activeJob?.message || 'Đang sinh audio...'
                  : compareMode
                    ? `Sinh A/B (${cloneRefPath ? 'Clone' : selectedVoice?.id || engine})`
                    : `Sinh theo giọng: ${cloneRefPath ? cloneRefPath.split('/').pop() : selectedVoice?.name?.split('(')[0].trim() || engine} (${hubSettings.mode === 'remote' ? 'LAN' : 'Local'})`}
              </span>
            </button>
            {isBusy && (
              <button
                onClick={() => void handleCancelJob()}
                className="glass-btn px-3 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                Huỷ
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {isBusy && activeJob && (
            <div className="glass-card p-2.5 space-y-1.5 shrink-0">
              <div className="flex justify-between text-[11px]">
                <span className="truncate">{activeJob.message}</span>
                <span className="font-mono font-semibold">{activeJob.progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[var(--glass-track-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${activeJob.progress}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--spark))'
                  }}
                />
              </div>
            </div>
          )}

          {/* Generated Result / A-B Output Cards */}
          {lastDoneJob && lastDoneJob.outputs.length > 0 && (
            <div className="space-y-2 shrink-0">
              <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Kết quả mới nhất ({lastDoneJob.outputs.length === 2 ? 'So sánh A/B' : '48 kHz WAV'})
              </div>
              <div className={`grid gap-2 ${lastDoneJob.outputs.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {lastDoneJob.outputs.map((slot) => (
                  <div key={slot.filename} className="glass-card p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-bold truncate text-[var(--spark)]">
                        {slot.slot === 'compare' ? 'B · ' : lastDoneJob.outputs.length > 1 ? 'A · ' : ''}
                        {ENGINE_SHORT_LABEL[slot.engine_key]}
                      </span>
                      <span className="font-mono text-[var(--text-muted)] shrink-0">
                        {slot.duration.toFixed(1)}s · {slot.sample_rate / 1000}k
                      </span>
                    </div>
                    <div className="h-6 flex items-end gap-[2px]">
                      {(slot.waveform || []).slice(0, 32).map((v, idx) => (
                        <span
                          key={idx}
                          className="flex-1 rounded-full"
                          style={{
                            height: `${Math.max(18, Math.round(v * 100))}%`,
                            background: slot.slot === 'compare' ? '#10B981' : 'var(--accent)',
                            opacity: 0.85
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => void handleSaveAndPlaySlot(slot, lastDoneJob.request.lang, true)}
                      disabled={savingSlot === slot.filename}
                      className="glass-btn w-full py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <IconPlay size={12} />
                      <span>
                        {savingSlot === slot.filename ? 'Đang nạp...' : 'Lưu & Phát Hi-Fi Player'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live AIWF CLI & JSON Recipe Box */}
          <div className="glass-card p-2.5 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[var(--text-secondary)]">Lệnh gửi AI Workforce</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void handleCopyText(liveCliCommand, 'lệnh AIWF CLI')}
                  className="text-[var(--spark)] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <IconCopy size={12} />
                  <span>Copy CLI</span>
                </button>
                <button
                  onClick={() =>
                    void handleCopyText(
                      JSON.stringify(
                        {
                          lang,
                          engine,
                          voice: cloneRefPath ? null : selectedVoice?.id || null,
                          quality: engine === 'voxcpm2' ? quality : null,
                          speed,
                          instruct: instruct.trim() || null,
                          allow_sa: Boolean(selectedVoice?.sa_notice || showSA),
                          ref_audio: cloneRefPath || null
                        },
                        null,
                        2
                      ),
                      'Voice Recipe JSON'
                    )
                  }
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium cursor-pointer"
                >
                  JSON
                </button>
              </div>
            </div>
            <pre className="font-mono text-[10.5px] text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap break-all max-h-20 leading-snug">
              {liveCliCommand}
            </pre>
          </div>

          {/* Compact Recent Hub History */}
          {history.length > 1 && (
            <div className="space-y-1 shrink-0">
              <div className="text-[11px] font-semibold text-[var(--text-muted)]">Lịch sử gần đây</div>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {history.slice(1, 5).map((h) =>
                  h.primary ? (
                    <button
                      key={h.id}
                      onClick={() => setLastDoneJob(h)}
                      className="w-full glass-card px-2.5 py-1.5 flex items-center justify-between text-left text-[11px] cursor-pointer"
                    >
                      <span className="truncate">
                        <strong>{h.primary.voice}</strong> · {ENGINE_SHORT_LABEL[h.primary.engine_key]}
                      </span>
                      <span className="font-mono text-[var(--text-muted)] shrink-0 ml-2">
                        {h.primary.duration.toFixed(1)}s
                      </span>
                    </button>
                  ) : null
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
