import { EQ_FREQUENCIES } from '@shared/themes'
import type { EqualizerSettings } from '@shared/types'

class WebAudioDspEngine {
  private ctx: AudioContext | null = null
  private sourceMap = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>()
  private activeSource: MediaElementAudioSourceNode | null = null
  private preampNode: GainNode | null = null
  private filters: BiquadFilterNode[] = []
  private boostNode: GainNode | null = null
  private pannerNode: StereoPannerNode | null = null
  private analyser: AnalyserNode | null = null
  private freqBuffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(128))
  private timeBuffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(256))
  private lastSettings: EqualizerSettings | null = null

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (this.ctx) return this.ctx

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null

    const ctx = new AudioCtx()
    this.ctx = ctx

    this.preampNode = ctx.createGain()
    this.filters = EQ_FREQUENCIES.map((freq, idx) => {
      const f = ctx.createBiquadFilter()
      f.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking'
      f.frequency.value = freq
      f.Q.value = 1.4
      f.gain.value = 0
      return f
    })

    this.boostNode = ctx.createGain()
    this.pannerNode = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.82
    this.freqBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount))
    this.timeBuffer = new Uint8Array(new ArrayBuffer(this.analyser.fftSize))

    // Wire graph: preamp -> filters[0..9] -> boost -> panner -> analyser -> destination
    let current: AudioNode = this.preampNode
    for (const filter of this.filters) {
      current.connect(filter)
      current = filter
    }
    current.connect(this.boostNode)
    current = this.boostNode
    if (this.pannerNode) {
      current.connect(this.pannerNode)
      current = this.pannerNode
    }
    current.connect(this.analyser)
    this.analyser.connect(ctx.destination)

    if (this.lastSettings) {
      this.applyEqualizer(this.lastSettings)
    }

    return ctx
  }

  attachMediaElement(el: HTMLMediaElement): void {
    const ctx = this.ensureContext()
    if (!ctx || !this.preampNode) return

    try {
      let source = this.sourceMap.get(el)
      if (!source) {
        source = ctx.createMediaElementSource(el)
        this.sourceMap.set(el, source)
      }
      if (this.activeSource && this.activeSource !== source) {
        try {
          this.activeSource.disconnect()
        } catch {
          // ignore
        }
      }
      if (this.activeSource !== source) {
        source.connect(this.preampNode)
        this.activeSource = source
      }
    } catch {
      // If cross-origin remote stream refuses WebAudio routing, playback still works natively
    }
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume()
      } catch {
        // ignore
      }
    }
  }

  applyEqualizer(eq: EqualizerSettings): void {
    this.lastSettings = eq
    if (!this.ctx || !this.preampNode || !this.boostNode) return

    const now = this.ctx.currentTime
    const preampLinear = eq.enabled ? Math.pow(10, eq.preampDb / 20) : 1
    this.preampNode.gain.setTargetAtTime(preampLinear, now, 0.025)

    for (let i = 0; i < this.filters.length; i++) {
      const gainVal = eq.enabled ? eq.bands[i] ?? 0 : 0
      this.filters[i].gain.setTargetAtTime(gainVal, now, 0.025)
    }

    const boost = Math.max(0.2, Math.min(2.0, eq.volumeBoost || 1))
    this.boostNode.gain.setTargetAtTime(boost, now, 0.025)

    if (this.pannerNode) {
      const pan = Math.max(-1, Math.min(1, eq.stereoBalance || 0))
      this.pannerNode.pan.setTargetAtTime(pan, now, 0.025)
    }
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return this.freqBuffer
    this.analyser.getByteFrequencyData(this.freqBuffer)
    return this.freqBuffer
  }

  getTimeDomainData(): Uint8Array {
    if (!this.analyser) return this.timeBuffer
    this.analyser.getByteTimeDomainData(this.timeBuffer)
    return this.timeBuffer
  }

  getBassEnergy(): number {
    const freq = this.getFrequencyData()
    if (freq.length < 8) return 0
    let sum = 0
    for (let i = 0; i < 8; i++) sum += freq[i]
    return sum / (8 * 255)
  }
}

export const audioDspEngine = new WebAudioDspEngine()
