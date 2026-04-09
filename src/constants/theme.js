// Tılsım Solitaire — Luminous Arboretum Design System
// Renk paleti, fontlar, spacing

export const COLORS = {
  // Arka plan gradient
  gradientTop: '#6FA2BA',
  gradientBottom: '#4A7A92',

  // Surface hierarchy
  surface: '#001019',
  surfaceDim: '#001019',
  surfaceContainer: '#001c29',
  surfaceContainerLow: '#001620',
  surfaceContainerHigh: '#002331',
  surfaceContainerHighest: '#00293a',

  // Primary (turuncu — büyülü kıvılcım)
  primary: '#ff914d',
  primaryContainer: '#f38239',
  primaryFixed: '#f9873e',
  onPrimary: '#502100',

  // Secondary (yeşil)
  secondary: '#95f8a1',
  secondaryContainer: '#006e2c',

  // Tertiary (altın)
  tertiaryFixed: '#f9cc61',
  tertiary: '#ffdb8f',

  // Error
  error: '#ff7351',
  errorContainer: '#b92902',

  // On surface
  onSurface: '#c9eaff',
  onSurfaceVariant: '#80b1ce',

  // Outline
  outlineVariant: '#154d66',
  outline: '#4a7b96',

  // Kart renkleri
  cardFace: '#FFFFFF',
  cardBorder: '#E8DDCC',
  cardBackTop: '#FF8C42',
  cardBackBottom: '#E67530',
  cardBackBorder: '#FFB074',

  // Coin
  coin: '#FFD166',

  // Başarı / Hata
  success: '#5DBE6E',
  fail: '#EF5350',

  // Butonlar
  buttonBlue: '#3D8BD4',

  // Kategori tag renkleri
  tagOrange: '#FF8C42',
  tagGreen: '#5DBE6E',
  tagPink: '#FF6B8A',
  tagBlue: '#4AAFEF',
  tagPurple: '#8B6FC0',
  tagYellow: '#FFD166',

  // Nav
  navBg: 'rgba(15, 23, 42, 0.8)',
  navInactive: '#94a3b8',
  navActive: '#ff914d',

  // Header
  headerBg: 'rgba(15, 23, 42, 0.4)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export const CATEGORY_COLORS = [
  COLORS.tagOrange,
  COLORS.tagGreen,
  COLORS.tagPink,
  COLORS.tagBlue,
  COLORS.tagPurple,
  COLORS.tagYellow,
];

export const FONTS = {
  headline: 'PlusJakartaSans_700Bold',
  headlineBlack: 'PlusJakartaSans_800ExtraBold',
  logo: 'Fondamento_400Regular_Italic',
  logoRegular: 'Fondamento_400Regular',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodyBold: 'BeVietnamPro_700Bold',
};

export const SIZES = {
  // Border radius
  radiusSm: 8,
  radius: 16,
  radiusLg: 24,
  radiusXl: 32,
  radiusFull: 9999,

  // Spacing
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  // Bottom nav
  navHeight: 88,
  navPaddingBottom: 32,

  // Header
  headerHeight: 64,
};
