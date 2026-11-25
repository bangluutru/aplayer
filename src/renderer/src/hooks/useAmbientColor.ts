import { useEffect, useState } from 'react'

export interface AmbientPalette {
  orb1: string
  orb2: string
  orb3: string
}

export function useAmbientColor(imageUrl: string | null, enabled: boolean): AmbientPalette | null {
  const [palette, setPalette] = useState<AmbientPalette | null>(null)

  useEffect(() => {
    if (!enabled || !imageUrl) {
      setPalette(null)
      return
    }

    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 24
        canvas.height = 24
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0, 24, 24)
        const data = ctx.getImageData(0, 0, 24, 24).data

        // Sample 3 regions: top-left, center, bottom-right for lush tri-tone ambient aurora
        const sampleRegion = (x0: number, y0: number, x1: number, y1: number): [number, number, number] => {
          let r = 0
          let g = 0
          let b = 0
          let count = 0
          for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              const i = (y * 24 + x) * 4
              const pr = data[i]
              const pg = data[i + 1]
              const pb = data[i + 2]
              // Skip near-black pixels to avoid muddy ambient orbs
              if (pr + pg + pb < 45) continue
              r += pr
              g += pg
              b += pb
              count++
            }
          }
          if (count === 0) return [56, 189, 248]
          // Boost vibrancy slightly for glass lighting
          const avgR = Math.min(255, Math.round((r / count) * 1.15))
          const avgG = Math.min(255, Math.round((g / count) * 1.15))
          const avgB = Math.min(255, Math.round((b / count) * 1.15))
          return [avgR, avgG, avgB]
        }

        const c1 = sampleRegion(0, 0, 12, 12)
        const c2 = sampleRegion(6, 6, 18, 18)
        const c3 = sampleRegion(12, 12, 24, 24)

        setPalette({
          orb1: `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0.42)`,
          orb2: `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, 0.36)`,
          orb3: `rgba(${c3[0]}, ${c3[1]}, ${c3[2]}, 0.28)`
        })
      } catch {
        setPalette(null)
      }
    }

    img.onerror = () => {
      if (!cancelled) setPalette(null)
    }

    img.src = imageUrl
    return () => {
      cancelled = true
    }
  }, [imageUrl, enabled])

  return palette
}
