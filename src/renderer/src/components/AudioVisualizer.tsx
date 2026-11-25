import React, { useEffect, useRef } from 'react'
import type { VisualizerStyle } from '@shared/types'
import { audioDspEngine } from '../engine/audioEngine'

interface AudioVisualizerProps {
  style: VisualizerStyle
  accent: string
  accentSecondary: string
  isPlaying: boolean
  className?: string
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  style,
  accent,
  accentSecondary,
  isPlaying,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    let phase = 0
    const smoothBars = new Float32Array(64)

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width * dpr)
        canvas.height = Math.round(rect.height * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const draw = (): void => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      if (w <= 0 || h <= 0) {
        rafId = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, w, h)
      const freq = audioDspEngine.getFrequencyData()
      const timeData = audioDspEngine.getTimeDomainData()
      phase += isPlaying ? 0.032 : 0.009

      // Logarithmic, symmetrically balanced musical frequency mapping across the entire stage
      const barCount = 56
      const half = barCount / 2
      let peakEnergy = 0
      for (let b = 0; b < Math.min(48, freq.length); b++) {
        if (freq[b] > peakEnergy) peakEnergy = freq[b]
      }
      const normEnergy = peakEnergy / 255

      for (let i = 0; i < barCount; i++) {
        // Mirror from center outward for balanced studio symmetry + log frequency curve
        const distFromCenter = Math.abs(i - (half - 0.5)) / half
        const logBin = Math.min(
          freq.length - 1,
          Math.floor(Math.pow(distFromCenter, 1.85) * (freq.length * 0.55))
        )
        const neighborBin = Math.min(freq.length - 1, logBin + 1)
        const liveVal = (freq[logBin] * 0.65 + freq[neighborBin] * 0.35) / 255

        // Gentle organic harmonic ribbon driven by live audio energy so tonal music dances fluidly
        const musicalRipple = isPlaying
          ? (0.14 + normEnergy * 0.42) *
            (0.55 + 0.45 * Math.sin(phase * 1.9 + i * 0.32)) *
            (1 - distFromCenter * 0.45)
          : 0.04 + Math.sin(phase + i * 0.22) * 0.025

        const target = Math.min(1, Math.max(liveVal, musicalRipple))
        smoothBars[i] += (target - smoothBars[i]) * 0.22
      }

      const grad = ctx.createLinearGradient(0, 0, w, h)
      grad.addColorStop(0, accent)
      grad.addColorStop(1, accentSecondary)

      if (style === 'aurora-bars') {
        const gap = 5
        const barW = Math.max(3, (w - gap * (barCount - 1)) / barCount)
        for (let i = 0; i < barCount; i++) {
          const val = smoothBars[i]
          const bh = Math.max(6, val * (h * 0.84))
          const x = i * (barW + gap)
          const y = h - bh
          const barGrad = ctx.createLinearGradient(x, y, x, h)
          barGrad.addColorStop(0, accent)
          barGrad.addColorStop(0.65, accentSecondary)
          barGrad.addColorStop(1, 'rgba(255,255,255,0.12)')
          ctx.fillStyle = barGrad
          ctx.beginPath()
          ctx.roundRect(x, y, barW, bh, [barW / 2, barW / 2, 2, 2])
          ctx.fill()
        }
      } else if (style === 'glass-mirror') {
        const gap = 5
        const barW = Math.max(3, (w - gap * (barCount - 1)) / barCount)
        const midY = h * 0.54
        for (let i = 0; i < barCount; i++) {
          const val = smoothBars[i]
          const bh = Math.max(4, val * (h * 0.44))
          const x = i * (barW + gap)

          ctx.fillStyle = grad
          ctx.globalAlpha = 0.9
          ctx.beginPath()
          ctx.roundRect(x, midY - bh, barW, bh, [barW / 2, barW / 2, 0, 0])
          ctx.fill()

          ctx.globalAlpha = 0.28
          ctx.beginPath()
          ctx.roundRect(x, midY + 3, barW, bh * 0.58, [0, 0, barW / 2, barW / 2])
          ctx.fill()
        }
        ctx.globalAlpha = 1
      } else if (style === 'liquid-wave') {
        const drawRibbon = (ampScale: number, alpha: number, phaseShift: number): void => {
          ctx.beginPath()
          const midY = h * 0.55
          ctx.moveTo(0, midY)
          for (let x = 0; x <= w; x += 6) {
            const norm = x / w
            const sampleIdx = Math.floor(norm * (timeData.length - 1))
            const waveOffset = ((timeData[sampleIdx] - 128) / 128) * (h * 0.42) * ampScale
            const barIdx = Math.floor(norm * (barCount - 1))
            const energy = smoothBars[barIdx] * (h * 0.28) * ampScale
            const sine = Math.sin(norm * Math.PI * 4 + phase + phaseShift) * energy
            const envelope = Math.sin(norm * Math.PI)
            const y = midY + (waveOffset + sine) * envelope
            ctx.lineTo(x, y)
          }
          ctx.strokeStyle = grad
          ctx.globalAlpha = alpha
          ctx.lineWidth = 2.6
          ctx.stroke()

          ctx.lineTo(w, h)
          ctx.lineTo(0, h)
          ctx.closePath()
          const fillGrad = ctx.createLinearGradient(0, midY - 40, 0, h)
          fillGrad.addColorStop(0, accent)
          fillGrad.addColorStop(1, 'transparent')
          ctx.fillStyle = fillGrad
          ctx.globalAlpha = alpha * 0.22
          ctx.fill()
          ctx.globalAlpha = 1
        }

        drawRibbon(1.0, 0.95, 0)
        drawRibbon(0.68, 0.55, 1.8)
      } else if (style === 'orbital-halo') {
        const cx = w / 2
        const cy = h / 2
        const baseR = Math.min(w, h) * 0.28
        const spokes = 64

        ctx.save()
        for (let i = 0; i < spokes; i++) {
          const angle = (i / spokes) * Math.PI * 2 - Math.PI / 2 + phase * 0.25
          const val = smoothBars[i % barCount]
          const innerR = baseR
          const outerR = baseR + 8 + val * (Math.min(w, h) * 0.22)
          ctx.strokeStyle = i % 2 === 0 ? accent : accentSecondary
          ctx.globalAlpha = 0.45 + val * 0.55
          ctx.lineWidth = 3
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR)
          ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR)
          ctx.stroke()
        }
        ctx.restore()
      } else {
        // minimal-pulse
        const cx = w / 2
        const cy = h / 2
        let avg = 0
        for (let i = 0; i < 16; i++) avg += smoothBars[i]
        avg /= 16

        for (let ring = 0; ring < 3; ring++) {
          const r = 24 + ring * 22 + avg * (48 + ring * 18)
          ctx.beginPath()
          ctx.arc(cx, cy, Math.min(r, Math.min(w, h) * 0.46), 0, Math.PI * 2)
          ctx.strokeStyle = ring % 2 === 0 ? accent : accentSecondary
          ctx.globalAlpha = 0.5 - ring * 0.13
          ctx.lineWidth = 2.2
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [style, accent, accentSecondary, isPlaying])

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} />
}
