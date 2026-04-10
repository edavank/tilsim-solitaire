// Tılsım Solitaire — Cosmic Dawn Design System
// Stitch mor gradient paleti + oyun renkleri

export const COLORS = {
  // Arka plan gradient (mor — alacakaranlık)
  gradientTop: '#6B5B8A',
  gradientBottom: '#3D3560',

  // Surface (koyu mor tonları)
  surface: '#150629',
  surfaceDim: '#150629',
  surfaceContainer: '#22103A',
  surfaceContainerLow: '#1B0A31',
  surfaceContainerHigh: '#291543',
  surfaceContainerHighest: '#301A4D',

  // Primary (pembe-turuncu — Stitch cosmic)
  primary: '#FF8AA7',
  primaryContainer: '#FF7199',
  primaryDim: '#E3096A',
  onPrimary: '#620029',

  // Secondary (cyan)
  secondary: '#00D2FD',
  secondaryContainer: '#00677E',

  // Tertiary (turuncu — kart arkası, butonlar)
  tertiary: '#FF9F4A',
  tertiaryFixed: '#FF9734',
  tertiaryContainer: '#FD8B00',

  // Error
  error: '#FF716C',
  errorContainer: '#9F0519',

  // On surface
  onSurface: '#EFDFFF',
  onSurfaceVariant: '#B7A3CF',

  // Outline
  outlineVariant: '#514166',
  outline: '#806E96',

  // Kart renkleri (bunlar sabit kalıyor)
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

  // Nav (koyu mor)
  navBg: 'rgba(21, 6, 41, 0.85)',
  navInactive: '#B7A3CF',
  navActive: '#FF8AA7',

  // Header
  headerBg: 'rgba(0, 0, 0, 0.06)',

  // Glassmorphic panel
  panelBg: 'rgba(255, 255, 255, 0.08)',
  panelBorder: 'rgba(255, 255, 255, 0.12)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
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
  radiusSm: 8,
  radius: 16,
  radiusLg: 24,
  radiusXl: 32,
  radiusFull: 9999,
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
  navHeight: 88,
  navPaddingBottom: 32,
  headerHeight: 64,
};
