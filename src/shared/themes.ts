import type { EqualizerSettings, PersonalizationSettings } from './types'

export interface ThemePreset {
  id: string
  name: string
  nameVi: string
  description: string
  descriptionVi: string
  mode: 'dark' | 'light'
  accent: string
  accentSecondary: string
  sparkColor: string
  bgGradient: string
  orb1: string
  orb2: string
  orb3: string
  glassBase: string
  glassElevated: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  borderTint: string
  defaultVibrancy: boolean
  defaultOpacity: number
  defaultBlur: number
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'chiba-navy',
    name: 'Chiba Midnight Navy',
    nameVi: 'Chiba Navy Đêm',
    description: 'Signature deep architectural navy #0F2D6B with cobalt blue & warm gold rays',
    descriptionVi: 'Xanh Navy chuẩn nhận diện #0F2D6B kết hợp kính mờ thanh lịch & điểm nhấn vàng ánh kim',
    mode: 'dark',
    accent: '#3B82F6',
    accentSecondary: '#1D5FD6',
    sparkColor: '#FFC247',
    bgGradient: 'linear-gradient(145deg, #061024 0%, #0B1E45 50%, #071530 100%)',
    orb1: 'rgba(59, 130, 246, 0.22)',
    orb2: 'rgba(15, 45, 107, 0.42)',
    orb3: 'rgba(255, 194, 71, 0.09)',
    glassBase: 'rgba(12, 26, 56, VAR_OPACITY)',
    glassElevated: 'rgba(16, 34, 72, VAR_OPACITY_HI)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#7E94B8',
    borderTint: '215, 232, 255',
    defaultVibrancy: false,
    defaultOpacity: 0.54,
    defaultBlur: 22
  },
  {
    id: 'chiba-daylight',
    name: 'Chiba Daylight Glass',
    nameVi: 'Chiba Kính Sáng',
    description: 'Luminous ice-blue #E6F2FF & warm cream #FFF7E6 glass with crisp #0F2D6B navy ink',
    descriptionVi: 'Kính sáng thanh khiết pha xanh băng #E6F2FF & kem ấm #FFF7E6 cùng chữ Navy sắc nét',
    mode: 'light',
    accent: '#2563EB',
    accentSecondary: '#0F2D6B',
    sparkColor: '#FFC247',
    bgGradient: 'linear-gradient(140deg, #E6F2FF 0%, #F4F8FF 52%, #FFF7E6 100%)',
    orb1: 'rgba(59, 130, 246, 0.18)',
    orb2: 'rgba(255, 194, 71, 0.16)',
    orb3: 'rgba(16, 185, 129, 0.12)',
    glassBase: 'rgba(255, 255, 255, VAR_OPACITY)',
    glassElevated: 'rgba(255, 255, 255, VAR_OPACITY_HI)',
    textPrimary: '#0F2D6B',
    textSecondary: '#334155',
    textMuted: '#64748B',
    borderTint: '15, 45, 107',
    defaultVibrancy: false,
    defaultOpacity: 0.72,
    defaultBlur: 24
  },
  {
    id: 'obsidian-titanium',
    name: 'Obsidian Titanium',
    nameVi: 'Titan Obsidian',
    description: 'Minimal dark titanium studio surface inspired by Pro Display & mastering consoles',
    descriptionVi: 'Mặt kính titan tối tối giản chuẩn phòng dựng chuyên nghiệp, tương phản cao và dịu mắt',
    mode: 'dark',
    accent: '#4F8CFF',
    accentSecondary: '#3B82F6',
    sparkColor: '#FFC247',
    bgGradient: 'linear-gradient(145deg, #090C12 0%, #101520 52%, #0B0F17 100%)',
    orb1: 'rgba(79, 140, 255, 0.18)',
    orb2: 'rgba(148, 163, 184, 0.14)',
    orb3: 'rgba(56, 189, 248, 0.10)',
    glassBase: 'rgba(20, 25, 36, VAR_OPACITY)',
    glassElevated: 'rgba(28, 34, 48, VAR_OPACITY_HI)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#8894AA',
    borderTint: '255, 255, 255',
    defaultVibrancy: false,
    defaultOpacity: 0.56,
    defaultBlur: 22
  },
  {
    id: 'amber-noir',
    name: 'Amber Cinema Noir',
    nameVi: 'Hổ Phách Điện Ảnh',
    description: 'Refined espresso walnut glass paired with warm champagne gold accents',
    descriptionVi: 'Kính rạp phim nâu trầm sang trọng kết hợp ánh vàng champagne ấm áp, không chói gắt',
    mode: 'dark',
    accent: '#D97706',
    accentSecondary: '#B45309',
    sparkColor: '#FFC247',
    bgGradient: 'linear-gradient(145deg, #120D0A 0%, #1D1510 52%, #130F0C 100%)',
    orb1: 'rgba(217, 119, 6, 0.18)',
    orb2: 'rgba(255, 194, 71, 0.12)',
    orb3: 'rgba(180, 83, 9, 0.14)',
    glassBase: 'rgba(30, 22, 17, VAR_OPACITY)',
    glassElevated: 'rgba(42, 31, 24, VAR_OPACITY_HI)',
    textPrimary: '#FAF5EF',
    textSecondary: '#DDD0C4',
    textMuted: '#9E8C7D',
    borderTint: '255, 236, 214',
    defaultVibrancy: false,
    defaultOpacity: 0.56,
    defaultBlur: 22
  },
  {
    id: 'emerald-vault',
    name: 'Emerald Studio',
    nameVi: 'Lục Bảo Studio',
    description: 'Deep botanical dark jade glass accented with signature emerald #10B981',
    descriptionVi: 'Kính ngọc lục bảo sâu thẳm kết hợp sắc xanh ngọc chuẩn #10B981 tinh tế',
    mode: 'dark',
    accent: '#10B981',
    accentSecondary: '#059669',
    sparkColor: '#FFC247',
    bgGradient: 'linear-gradient(145deg, #061310 0%, #0B221C 52%, #071916 100%)',
    orb1: 'rgba(16, 185, 129, 0.20)',
    orb2: 'rgba(6, 182, 212, 0.14)',
    orb3: 'rgba(255, 194, 71, 0.08)',
    glassBase: 'rgba(11, 31, 26, VAR_OPACITY)',
    glassElevated: 'rgba(16, 44, 37, VAR_OPACITY_HI)',
    textPrimary: '#ECFDF5',
    textSecondary: '#C4E3D7',
    textMuted: '#7EA398',
    borderTint: '215, 255, 240',
    defaultVibrancy: false,
    defaultOpacity: 0.56,
    defaultBlur: 22
  },
  {
    id: 'macos-native',
    name: 'Pure macOS Vibrancy',
    nameVi: 'Kính Xuyên Thấu macOS',
    description: 'True native macOS translucent glass letting your desktop wallpaper breathe through',
    descriptionVi: 'Hiệu ứng kính trong suốt thực của macOS nhìn xuyên màn hình nền mờ tinh tế',
    mode: 'dark',
    accent: '#3B82F6',
    accentSecondary: '#1D5FD6',
    sparkColor: '#FFC247',
    bgGradient: 'linear-gradient(145deg, rgba(10,18,34,0.44) 0%, rgba(14,24,46,0.38) 100%)',
    orb1: 'rgba(59, 130, 246, 0.14)',
    orb2: 'rgba(15, 45, 107, 0.18)',
    orb3: 'rgba(255, 194, 71, 0.06)',
    glassBase: 'rgba(16, 24, 42, VAR_OPACITY)',
    glassElevated: 'rgba(24, 34, 58, VAR_OPACITY_HI)',
    textPrimary: '#F8FAFC',
    textSecondary: '#D1D9E6',
    textMuted: '#94A3B8',
    borderTint: '255, 255, 255',
    defaultVibrancy: true,
    defaultOpacity: 0.34,
    defaultBlur: 26
  }
]

const LEGACY_THEME_MAP: Record<string, string> = {
  'obsidian-aurora': 'chiba-navy',
  'liquid-pearl': 'chiba-daylight',
  'solar-sunset': 'amber-noir',
  'emerald-abyss': 'emerald-vault',
  'midnight-rose': 'obsidian-titanium'
}

export const ACCENT_SWATCHES = [
  '#3B82F6',
  '#1D5FD6',
  '#0F2D6B',
  '#FFC247',
  '#10B981',
  '#06B6D4',
  '#AB55F7',
  '#D97706',
  '#F87171',
  '#84CC16'
]

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
export const EQ_LABELS = ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K']

export interface EqPreset {
  id: string
  name: string
  nameVi: string
  bands: number[]
}

export const EQ_PRESETS: EqPreset[] = [
  { id: 'flat', name: 'Flat', nameVi: 'Mặc định (Flat)', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'bass-boost', name: 'Deep Bass', nameVi: 'Tăng Bass Sâu', bands: [6, 5.5, 4, 2, 0, 0, 1, 1.5, 2, 2] },
  { id: 'vocal', name: 'Vocal Clarity', nameVi: 'Giọng Hát Trong', bands: [-2, -1, 0, 2, 4, 4.5, 3, 1.5, 0, -1] },
  { id: 'studio', name: 'Studio Reference', nameVi: 'Phòng Thu Studio', bands: [1.5, 1, 0.5, 0, 0, 0.5, 1.5, 2, 2.5, 2] },
  { id: 'electronic', name: 'Electronic / EDM', nameVi: 'Nhạc Điện Tử', bands: [5, 4, 1.5, 0, -1.5, 1, 2.5, 4, 4.5, 3.5] },
  { id: 'acoustic', name: 'Acoustic Warmth', nameVi: 'Acoustic Ấm Áp', bands: [2.5, 2, 1.5, 1, 2, 1.5, 2.5, 3, 2, 1] },
  { id: 'cinema', name: 'Cinema Surround', nameVi: 'Rạp Chiếu Phim', bands: [4.5, 3.5, 2, 0.5, 1, 2.5, 3, 2, 3, 2.5] },
  { id: 'late-night', name: 'Late Night', nameVi: 'Nghe Đêm Khuya', bands: [2, 1, 0, 1.5, 2, 1.5, 0, -1.5, -2.5, -3] }
]

export const DEFAULT_EQUALIZER: EqualizerSettings = {
  enabled: true,
  presetId: 'flat',
  preampDb: 0,
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  volumeBoost: 1,
  stereoBalance: 0
}

export function createDefaultSettings(defaultVideoDir: string, defaultAudioDir: string): PersonalizationSettings {
  return {
    language: 'vi',
    brandName: 'APlayer',
    brandTagline: 'Personal Media Studio',
    avatarGlyph: 'ray-prism',
    themeId: 'chiba-navy',
    glassBlurPx: 22,
    glassOpacity: 0.54,
    glassBorderShine: 0.14,
    cornerRadiusPx: 18,
    enableNativeVibrancy: false,
    enableAmbientGlow: true,
    wallpaperBlurPx: 14,
    wallpaperDim: 0.48,
    fontFamily: 'vietnam',
    visualizerStyle: 'aurora-bars',
    compactSidebar: false,
    videoDownloadDir: defaultVideoDir,
    audioDownloadDir: defaultAudioDir,
    organizeDownloadsByPlatform: true,
    autoImportDownloads: true,
    defaultCookieBrowser: 'none',
    watchedFolders: [defaultVideoDir, defaultAudioDir],
    equalizer: { ...DEFAULT_EQUALIZER, bands: [...DEFAULT_EQUALIZER.bands] },
    subtitleSizePx: 22,
    subtitleColor: '#FFFFFF',
    subtitleBgOpacity: 0.65,
    rememberPlaybackPosition: true
  }
}

export function getThemePreset(themeId: string): ThemePreset {
  const mappedId = LEGACY_THEME_MAP[themeId] || themeId
  return THEME_PRESETS.find((t) => t.id === mappedId) || THEME_PRESETS[0]
}
