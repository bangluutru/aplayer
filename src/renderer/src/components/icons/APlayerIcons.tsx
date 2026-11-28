import React from 'react'
import type { SupportedPlatform } from '@shared/types'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
  strokeWidth?: number
}

const baseProps = (size = 18, strokeWidth = 1.9, className = ''): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className,
  'aria-hidden': true
})

/* ============================================================================
 * BESPOKE APLAYER BRAND & AVATAR EMBLEMS
 * Inspired by CHIBA & CHIBO Brand Identity v2.0 (24x24 rounded 2px geometry +
 * signature 3 golden rays #FFC247, ZERO emojis or unicode dingbats).
 * ========================================================================== */

export type BrandEmblemId =
  | 'ray-prism'
  | 'chiba-spark'
  | 'vinyl-pulse'
  | 'sound-arch'
  | 'cinema-lens'
  | 'hex-core'
  | 'orbit-ring'
  | 'monogram-a'

export const BRAND_EMBLEM_LIST: Array<{ id: BrandEmblemId; label: string }> = [
  { id: 'ray-prism', label: 'Ray Prism' },
  { id: 'chiba-spark', label: 'Chiba Spark' },
  { id: 'vinyl-pulse', label: 'Hi-Fi Vinyl' },
  { id: 'sound-arch', label: 'Sound Arch' },
  { id: 'cinema-lens', label: 'Cinema Lens' },
  { id: 'hex-core', label: 'Hex Core' },
  { id: 'orbit-ring', label: 'Orbit Ring' },
  { id: 'monogram-a', label: 'Monogram A' }
]

export function normalizeEmblemId(raw?: string): BrandEmblemId {
  const valid = new Set<string>(BRAND_EMBLEM_LIST.map((e) => e.id))
  if (raw && valid.has(raw)) return raw as BrandEmblemId
  return 'ray-prism'
}

export const BrandEmblem: React.FC<{
  id?: string
  size?: number
  className?: string
  rayColor?: string
}> = ({ id, size = 22, className = '', rayColor = '#FFC247' }) => {
  const emblem = normalizeEmblemId(id)

  switch (emblem) {
    case 'chiba-spark':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M7.5 21L12.6 8.6C13.1 7.4 14.9 7.4 15.4 8.6L20.5 21"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M10.2 16.5H17.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          {/* Signature 3 rounded golden rays */}
          <path d="M19.8 6.4L21.6 4.4" stroke={rayColor} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M22.2 9.4L24.7 8.5" stroke={rayColor} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M22.4 12.9L24.8 13.4" stroke={rayColor} strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      )

    case 'vinyl-pulse':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <circle cx="14" cy="14" r="9.5" stroke="currentColor" strokeWidth="2.1" />
          <path d="M9.2 14A4.8 4.8 0 0 1 14 9.2" stroke={rayColor} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M18.8 14A4.8 4.8 0 0 1 14 18.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" opacity="0.65" />
          <circle cx="14" cy="14" r="2.2" fill="currentColor" />
        </svg>
      )

    case 'sound-arch':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <line x1="6" y1="12" x2="6" y2="16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="10" y1="8.5" x2="10" y2="19.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="14" y1="6" x2="14" y2="22" stroke={rayColor} strokeWidth="2.6" strokeLinecap="round" />
          <line x1="18" y1="9" x2="18" y2="19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="22" y1="12" x2="22" y2="16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )

    case 'cinema-lens':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <rect x="4.5" y="6.5" width="19" height="15" rx="4" stroke="currentColor" strokeWidth="2.1" />
          <path
            d="M12.2 11.1L17.4 14L12.2 16.9V11.1Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="20.2" cy="10" r="1.2" fill={rayColor} />
        </svg>
      )

    case 'hex-core':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M14 4.5L22 9.1V18.9L14 23.5L6 18.9V9.1L14 4.5Z"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <path d="M12 10.8L17.5 14L12 17.2V10.8Z" fill={rayColor} />
        </svg>
      )

    case 'orbit-ring':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <circle cx="14" cy="14" r="4.2" stroke="currentColor" strokeWidth="2.1" />
          <ellipse
            cx="14"
            cy="14"
            rx="10.5"
            ry="4.8"
            transform="rotate(-28 14 14)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="21.5" cy="9.5" r="2" fill={rayColor} />
        </svg>
      )

    case 'monogram-a':
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <rect x="4.5" y="4.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="2.1" />
          <path
            d="M10.2 19L14 9.5L17.8 19M11.6 16H16.4"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="19.5" cy="8.5" r="1.4" fill={rayColor} />
        </svg>
      )

    case 'ray-prism':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} aria-hidden="true">
          <path
            d="M9.5 8.8C9.5 7.6 10.8 6.9 11.8 7.5L20.1 12.7C21 13.3 21 14.7 20.1 15.3L11.8 20.5C10.8 21.1 9.5 20.4 9.5 19.2V8.8Z"
            fill="currentColor"
          />
          {/* Signature CHIBA 3-ray geometric accent */}
          <path d="M20.2 6.8L22.1 4.9" stroke={rayColor} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M22.4 10.1L25 9.4" stroke={rayColor} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M22.5 13.8L24.9 14.3" stroke={rayColor} strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      )
  }
}

/** Signature compact 3-ray accent glyph (CHIBA & CHIBO identity motif) */
export const BrandRaysAccent: React.FC<{ size?: number; className?: string }> = ({
  size = 14,
  className = ''
}) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
    <path d="M3.5 7L6.5 2.5" stroke="#FFC247" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M6.5 9.5L12 6.2" stroke="#FFC247" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M7.2 12.8L12.8 12.4" stroke="#FFC247" strokeWidth="2.1" strokeLinecap="round" />
  </svg>
)

/* ============================================================================
 * CUSTOM PLATFORM LOGOS (YouTube, Facebook, X, TikTok, Instagram, Threads, Web)
 * ========================================================================== */

export const PlatformIcon: React.FC<{ platform: SupportedPlatform; size?: number; className?: string }> = ({
  platform,
  size = 15,
  className = ''
}) => {
  switch (platform) {
    case 'youtube':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="2.5" y="5" width="19" height="14" rx="4.5" stroke="currentColor" strokeWidth="1.9" />
          <path d="M10.2 9.2L15.4 12L10.2 14.8V9.2Z" fill="currentColor" />
        </svg>
      )
    case 'facebook':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.9" />
          <path d="M13.5 21V13.2H16L16.4 10.2H13.5V8.4C13.5 7.5 13.8 6.9 15 6.9H16.5V4.3C16 4.2 15 4.1 14 4.1C11.7 4.1 10.3 5.5 10.3 8V10.2H8V13.2H10.3V21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'x':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4.5 4.5L19.5 19.5M19.5 4.5L4.5 19.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M14 4V14.8A3.7 3.7 0 1 1 11 11.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 4C14.7 6.8 16.8 8.7 19.5 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'instagram':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
        </svg>
      )
    case 'threads':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M16.8 11.4C16.3 8.9 14.5 7.4 11.9 7.4C9.5 7.4 8 8.8 7.8 10.6M16.5 12.2C16.5 15.1 14.4 16.8 11.9 16.8C9.8 16.8 8.3 15.6 8.3 13.8C8.3 12 9.9 11 12.2 11C14.3 11 15.8 11.7 16.7 12.7C17.8 13.9 18 16.6 15.5 18.6C13.5 20.2 9.6 20.5 6.8 18.3C4.4 16.4 3.5 13.2 4.3 9.8C5.2 6.2 8.4 3.8 12.2 3.8C16.2 3.8 19.3 6.3 19.8 10.2"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.9" />
          <ellipse cx="12" cy="12" rx="3.8" ry="8.5" stroke="currentColor" strokeWidth="1.7" />
          <path d="M4 12H20" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      )
  }
}

/* ============================================================================
 * COHESIVE 24x24 SYSTEM ICON SET (2px rounded strokes — CHIBA & CHIBO Page 8)
 * ========================================================================== */

export const IconNowPlaying: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10.4 9.1L15.4 12L10.4 14.9V9.1Z" fill="currentColor" stroke="none" />
  </svg>
)

export const IconLibrary: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3.5" y="4" width="4" height="16" rx="1.4" />
    <rect x="10" y="4" width="4" height="16" rx="1.4" />
    <path d="M16.5 5.2L20.3 18.8" />
  </svg>
)

export const IconDownloader: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M12 4V14.5" />
    <path d="M8.2 11L12 14.8L15.8 11" />
    <path d="M4.5 16.5V18C4.5 19.1 5.4 20 6.5 20H17.5C18.6 20 19.5 19.1 19.5 18V16.5" />
  </svg>
)

export const IconPersonalize: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
    <circle cx="17" cy="17" r="3.5" />
  </svg>
)

export const IconOpenFile: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M12 5V19M5 12H19" />
  </svg>
)

export const IconFolderAdd: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M3.5 7C3.5 5.9 4.4 5 5.5 5H9.5L11.5 7.5H18.5C19.6 7.5 20.5 8.4 20.5 9.5V17C20.5 18.1 19.6 19 18.5 19H5.5C4.4 19 3.5 18.1 3.5 17V7Z" />
    <path d="M12 11V15.5M9.75 13.25H14.25" />
  </svg>
)

export const IconFolder: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M3.5 7C3.5 5.9 4.4 5 5.5 5H9.5L11.5 7.5H18.5C19.6 7.5 20.5 8.4 20.5 9.5V17C20.5 18.1 19.6 19 18.5 19H5.5C4.4 19 3.5 18.1 3.5 17V7Z" />
  </svg>
)

export const IconPlay: React.FC<IconProps> = ({ size = 18, className = '', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...rest}>
    <path d="M7.5 5.6C7.5 4.7 8.5 4.2 9.3 4.7L18.8 10.9C19.5 11.4 19.5 12.6 18.8 13.1L9.3 19.3C8.5 19.8 7.5 19.3 7.5 18.4V5.6Z" />
  </svg>
)

export const IconPause: React.FC<IconProps> = ({ size = 18, className = '', ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...rest}>
    <rect x="6.5" y="5" width="4" height="14" rx="1.6" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.6" />
  </svg>
)

export const IconPrev: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M6 6V18" />
    <path d="M18 6.5L10 12L18 17.5V6.5Z" fill="currentColor" />
  </svg>
)

export const IconNext: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M18 6V18" />
    <path d="M6 6.5L14 12L6 17.5V6.5Z" fill="currentColor" />
  </svg>
)

export const IconShuffle: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M16 4H20V8" />
    <path d="M4 19L20 4" />
    <path d="M20 16V20H16" />
    <path d="M14.5 14.5L20 20" />
    <path d="M4 5L9.5 10.5" />
  </svg>
)

export const IconRepeat: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M17 3L20 6L17 9" />
    <path d="M4 11V9C4 7.3 5.3 6 7 6H20" />
    <path d="M7 21L4 18L7 15" />
    <path d="M20 13V15C20 16.7 18.7 18 17 18H4" />
  </svg>
)

export const IconRepeatOne: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M17 3L20 6L17 9" />
    <path d="M4 11V9C4 7.3 5.3 6 7 6H20" />
    <path d="M7 21L4 18L7 15" />
    <path d="M20 13V15C20 16.7 18.7 18 17 18H4" />
    <path d="M12.2 10V14.5M11 11L12.2 10" strokeWidth="1.8" />
  </svg>
)

export const IconVolume: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M11 6L6.8 9.2H4C3.4 9.2 3 9.6 3 10.2V13.8C3 14.4 3.4 14.8 4 14.8H6.8L11 18V6Z" />
    <path d="M15 9.2C16.4 10.6 16.4 13.4 15 14.8" />
    <path d="M17.8 6.8C20.4 9.6 20.4 14.4 17.8 17.2" />
  </svg>
)

export const IconVolumeMute: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M11 6L6.8 9.2H4C3.4 9.2 3 9.6 3 10.2V13.8C3 14.4 3.4 14.8 4 14.8H6.8L11 18V6Z" />
    <path d="M15.5 9.5L20.5 14.5M20.5 9.5L15.5 14.5" />
  </svg>
)

export const IconEqualizer: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <line x1="6" y1="4" x2="6" y2="20" />
    <circle cx="6" cy="9" r="2" fill="currentColor" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <circle cx="12" cy="15" r="2" fill="currentColor" />
    <line x1="18" y1="4" x2="18" y2="20" />
    <circle cx="18" cy="10.5" r="2" fill="currentColor" />
  </svg>
)

export const IconSubtitles: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3" y="5.5" width="18" height="13" rx="3" />
    <path d="M7 13H11M14 13H17M7 16H14" />
  </svg>
)

export const IconWaveform: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4 10V14M8 7V17M12 4V20M16 7.5V16.5M20 10V14" />
  </svg>
)

export const IconQueue: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4 7H14M4 12H14M4 17H10" />
    <path d="M17.5 10V17.2A1.8 1.8 0 1 1 15.8 15.4" />
    <path d="M17.5 10L20.5 11" />
  </svg>
)

export const IconHeart: React.FC<IconProps & { filled?: boolean }> = ({
  size = 16,
  strokeWidth = 1.9,
  filled = false,
  className = '',
  ...rest
}) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path
      d="M12 20C12 20 4.2 14.9 4.2 9.3C4.2 6.7 6.2 4.8 8.7 4.8C10.2 4.8 11.4 5.6 12 6.7C12.6 5.6 13.8 4.8 15.3 4.8C17.8 4.8 19.8 6.7 19.8 9.3C19.8 14.9 12 20 12 20Z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </svg>
)

export const IconCamera: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4 8.5C4 7.4 4.9 6.5 6 6.5H8L9.4 4.5H14.6L16 6.5H18C19.1 6.5 20 7.4 20 8.5V17C20 18.1 19.1 19 18 19H6C4.9 19 4 18.1 4 17V8.5Z" />
    <circle cx="12" cy="12.8" r="3" />
  </svg>
)

export const IconPip: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <rect x="11.5" y="11" width="7" height="5.5" rx="1.2" fill="currentColor" stroke="none" />
  </svg>
)

export const IconFullscreen: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4 9V5.5C4 4.7 4.7 4 5.5 4H9M15 4H18.5C19.3 4 20 4.7 20 5.5V9M20 15V18.5C20 19.3 19.3 20 18.5 20H15M9 20H5.5C4.7 20 4 19.3 4 18.5V15" />
  </svg>
)

export const IconExitFullscreen: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M9 4V7.5C9 8.3 8.3 9 7.5 9H4M20 9H16.5C15.7 9 15 8.3 15 7.5V4M15 20V16.5C15 15.7 15.7 15 16.5 15H20M4 15H7.5C8.3 15 9 15.7 9 16.5V20" />
  </svg>
)

export const IconSpeed: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4.5 17A8.5 8.5 0 1 1 19.5 17" />
    <path d="M12 14L15.8 9.2" />
    <circle cx="12" cy="14" r="1.4" fill="currentColor" />
  </svg>
)

export const IconClock: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12L15 14" />
  </svg>
)

export const IconColorAdjust: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3V5M12 19V21M3 12H5M19 12H21M5.6 5.6L7.1 7.1M16.9 16.9L18.4 18.4M18.4 5.6L16.9 7.1M7.1 16.9L5.6 18.4" />
  </svg>
)

export const IconInfo: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11V16" />
    <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
  </svg>
)

export const IconVideo: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3" y="5.5" width="18" height="13" rx="3" />
    <path d="M10.2 9.4L15 12L10.2 14.6V9.4Z" fill="currentColor" stroke="none" />
  </svg>
)

export const IconMusic: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M9 17.5V6.8L19 5V15.5" />
    <circle cx="6.8" cy="17.5" r="2.2" />
    <circle cx="16.8" cy="15.5" r="2.2" />
  </svg>
)

export const IconSearch: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="10.8" cy="10.8" r="6.5" />
    <path d="M15.8 15.8L20 20" />
  </svg>
)

export const IconGrid: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
  </svg>
)

export const IconList: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20" />
    <circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export const IconTrash: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4.5 7H19.5" />
    <path d="M9.5 4H14.5" />
    <path d="M6.5 7L7.3 18.2C7.4 19.2 8.2 20 9.2 20H14.8C15.8 20 16.6 19.2 16.7 18.2L17.5 7" />
    <path d="M10 11V16M14 11V16" />
  </svg>
)

export const IconRefresh: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M19.5 12A7.5 7.5 0 1 1 17.2 6.6" />
    <path d="M19.5 4V8.5H15" />
  </svg>
)

export const IconReset: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4.5 12A7.5 7.5 0 1 0 6.8 6.6" />
    <path d="M4.5 4V8.5H9" />
  </svg>
)

export const IconClose: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M6 6L18 18M18 6L6 18" />
  </svg>
)

export const IconCheckCircle: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 12.3L10.8 14.6L15.8 9.6" />
  </svg>
)

export const IconAlertCircle: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8V12.5" />
    <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
  </svg>
)

export const IconSpinner: React.FC<IconProps> = ({ size = 16, strokeWidth = 2.1, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, `animate-spin ${className}`)} {...rest}>
    <circle cx="12" cy="12" r="8.5" opacity="0.22" />
    <path d="M12 3.5A8.5 8.5 0 0 1 20.5 12" />
  </svg>
)

export const IconPaste: React.FC<IconProps> = ({ size = 14, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="8" y="3.5" width="8" height="3.5" rx="1.2" />
    <path d="M8 5.2H6.5C5.4 5.2 4.5 6.1 4.5 7.2V18.5C4.5 19.6 5.4 20.5 6.5 20.5H17.5C18.6 20.5 19.5 19.6 19.5 18.5V7.2C19.5 6.1 18.6 5.2 17.5 5.2H16" />
  </svg>
)

export const IconStream: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    <path d="M8.5 8.5A5 5 0 0 0 8.5 15.5M15.5 8.5A5 5 0 0 1 15.5 15.5" />
    <path d="M5.7 5.7A9 9 0 0 0 5.7 18.3M18.3 5.7A9 9 0 0 1 18.3 18.3" />
  </svg>
)

export const IconUpload: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M12 15.5V5" />
    <path d="M8.2 8.8L12 5L15.8 8.8" />
    <path d="M4.5 16.5V18C4.5 19.1 5.4 20 6.5 20H17.5C18.6 20 19.5 19.1 19.5 18V16.5" />
  </svg>
)

export const IconExternal: React.FC<IconProps> = ({ size = 14, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M14 4.5H19.5V10" />
    <path d="M10.5 13.5L19.5 4.5" />
    <path d="M18.5 14V18C18.5 19.1 17.6 20 16.5 20H6C4.9 20 4 19.1 4 18V7.5C4 6.4 4.9 5.5 6 5.5H10" />
  </svg>
)

export const IconShield: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M12 3.5L19 6.5V12C19 16.2 16 19.3 12 20.8C8 19.3 5 16.2 5 12V6.5L12 3.5Z" />
    <path d="M9.2 12.2L11.1 14.1L15 10.2" />
  </svg>
)

export const IconKeyboard: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3" y="6" width="18" height="12" rx="2.8" />
    <path d="M7 10H7.01M10.3 10H10.31M13.7 10H13.71M17 10H17.01M8.5 14H15.5" />
  </svg>
)

export const IconImage: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
    <circle cx="9" cy="9.5" r="1.5" />
    <path d="M5 17.5L10.5 12.5L14 15.8L16.5 13.5L19.5 17" />
  </svg>
)

export const IconLink: React.FC<IconProps> = ({ size = 16, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M10.2 13.8L13.8 10.2" />
    <path d="M14.5 13L16.8 10.7A3.2 3.2 0 0 0 12.3 6.2L10 8.5" />
    <path d="M9.5 11L7.2 13.3A3.2 3.2 0 0 0 11.7 17.8L14 15.5" />
  </svg>
)

export const IconChevronLeft: React.FC<IconProps> = ({ size = 15, strokeWidth = 2, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M14.5 6.5L9 12L14.5 17.5" />
  </svg>
)

export const IconChevronRight: React.FC<IconProps> = ({ size = 15, strokeWidth = 2, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M9.5 6.5L15 12L9.5 17.5" />
  </svg>
)

export const IconChevronDown: React.FC<IconProps> = ({ size = 15, strokeWidth = 2, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M6.5 9.5L12 15L17.5 9.5" />
  </svg>
)

export const IconChevronUp: React.FC<IconProps> = ({ size = 15, strokeWidth = 2, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M6.5 14.5L12 9L17.5 14.5" />
  </svg>
)

export const IconListPlus: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4 7H14M4 12H12M4 17H10" />
    <path d="M17 12.5V18.5M14 15.5H20" />
  </svg>
)

export const IconMoon: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M18.8 14.8A7.5 7.5 0 0 1 9.2 5.2A7.5 7.5 0 1 0 18.8 14.8Z" />
  </svg>
)

export const IconSun: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3V5M12 19V21M3 12H5M19 12H21M5.6 5.6L7.1 7.1M16.9 16.9L18.4 18.4M18.4 5.6L16.9 7.1M7.1 16.9L5.6 18.4" />
  </svg>
)

export const IconMicrophone: React.FC<IconProps> = ({ size = 18, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="9" y="3" width="6" height="10" rx="3" />
    <path d="M5.5 10.5A6.5 6.5 0 0 0 18.5 10.5" />
    <path d="M12 17V21M8.5 21H15.5" />
  </svg>
)

export const IconServer: React.FC<IconProps> = ({ size = 15, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="3.5" y="4" width="17" height="6.5" rx="2" />
    <rect x="3.5" y="13.5" width="17" height="6.5" rx="2" />
    <path d="M7.5 7.25H7.51M7.5 16.75H7.51M11 7.25H16.5M11 16.75H16.5" />
  </svg>
)

export const IconExternalLink: React.FC<IconProps> = ({ size = 14, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M15 4H20V9" />
    <path d="M10.5 13.5L20 4" />
    <path d="M18.5 13.5V18A2 2 0 0 1 16.5 20H6A2 2 0 0 1 4 18V7.5A2 2 0 0 1 6 5.5H10.5" />
  </svg>
)

export const IconCopy: React.FC<IconProps> = ({ size = 14, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <rect x="9" y="9" width="11" height="11" rx="2.2" />
    <path d="M5.5 15H5A2 2 0 0 1 3 13V5A2 2 0 0 1 5 3H13A2 2 0 0 1 15 5V5.5" />
  </svg>
)

export const IconRotateCcw: React.FC<IconProps> = ({ size = 14, strokeWidth = 1.9, className = '', ...rest }) => (
  <svg {...baseProps(size, strokeWidth, className)} {...rest}>
    <path d="M4.5 10A7.5 7.5 0 1 1 6.7 17.3" />
    <path d="M4.5 5V10H9.5" />
  </svg>
)
