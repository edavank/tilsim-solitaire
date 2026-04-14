// Tılsım Solitaire — Cosmic Dawn Design System
// Stitch mor gradient paleti + oyun renkleri

export const COLORS = {
  // Arka plan gradient (mor — alacakaranlık)
  gradientTop: '#1e0a38',
  gradientBottom: '#150629',

  // Surface (koyu mor tonları)
  surface: '#150629',
  surfaceDim: '#150629',
  surfaceContainer: '#22103A',
  surfaceContainerLow: '#1B0A31',
  surfaceContainerHigh: '#291543',
  surfaceContainerHighest: '#301A4D',

  // Primary (pembe — ana aksiyon rengi)
  primary: '#FF8AA7',
  primaryContainer: '#FF7199',
  primaryDim: '#E3096A',
  onPrimary: '#620029',

  // Secondary (lavanta — yumuşak mor)
  secondary: '#B794F6',
  secondaryContainer: '#7C5CFC',

  // Tertiary (altın — vurgu)
  tertiary: '#FFD166',
  tertiaryFixed: '#FFC940',
  tertiaryContainer: '#E6B000',

  // Error
  error: '#FF716C',
  errorContainer: '#9F0519',

  // On surface
  onSurface: '#EFDFFF',
  onSurfaceVariant: '#B7A3CF',

  // Outline
  outlineVariant: '#514166',
  outline: '#806E96',

  // Kart renkleri
  cardFace: '#FFFFFF',
  cardBorder: '#E8DDCC',
  cardBackTop: '#9B7DFF',
  cardBackBottom: '#7C5CFC',
  cardBackBorder: '#B794F6',

  // Coin
  coin: '#FFD166',

  // Başarı / Hata
  success: '#6ECB8B',
  fail: '#FF6B6B',

  // Butonlar (mor tonu — uyumlu)
  buttonBlue: '#7C5CFC',

  // Kategori tag renkleri (harmonik)
  tagOrange: '#FFB074',
  tagGreen: '#6ECB8B',
  tagPink: '#FF8AA7',
  tagBlue: '#B794F6',
  tagPurple: '#9B7DFF',
  tagYellow: '#FFD166',

  // Nav (koyu mor)
  navBg: 'rgba(21, 6, 41, 0.92)',
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

// Dinamik tema renkleri
export const THEME_COLORS = {
  cosmic: {
    gradientTop: '#1e0a38', gradientBottom: '#150629', accent: '#9B7DFF',
    cardFace: '#FFFFFF', cardText: '#1a1a2e', cardBorder: 'rgba(155,125,255,0.2)',
    cardBack: '#6B5B8A', slotBorder: 'rgba(183,148,246,0.35)', slotBg: 'rgba(124,92,252,0.06)',
    toolbarBtn: '#4A6CF7', panelBg: 'rgba(255,255,255,0.06)', panelBorder: 'rgba(255,255,255,0.08)',
  },
  ocean: {
    gradientTop: '#061828', gradientBottom: '#040E1A', accent: '#00BCD4',
    cardFace: '#D4F1F9', cardText: '#0A2540', cardBorder: 'rgba(0,188,212,0.35)',
    cardBack: '#0D47A1', slotBorder: 'rgba(0,188,212,0.4)', slotBg: 'rgba(0,188,212,0.1)',
    toolbarBtn: '#0097A7', panelBg: 'rgba(0,188,212,0.08)', panelBorder: 'rgba(0,188,212,0.15)',
  },
  forest: {
    gradientTop: '#0A1A0A', gradientBottom: '#051005', accent: '#8BC34A',
    cardFace: '#F0E8D0', cardText: '#2E4A1E', cardBorder: 'rgba(139,195,74,0.3)',
    cardBack: '#33691E', slotBorder: 'rgba(139,195,74,0.4)', slotBg: 'rgba(139,195,74,0.08)',
    toolbarBtn: '#558B2F', panelBg: 'rgba(139,195,74,0.08)', panelBorder: 'rgba(139,195,74,0.15)',
  },
  sunset: {
    gradientTop: '#1A0808', gradientBottom: '#2A1018', accent: '#FF6D00',
    cardFace: '#FFF0E0', cardText: '#4E2A00', cardBorder: 'rgba(255,109,0,0.3)',
    cardBack: '#BF360C', slotBorder: 'rgba(255,109,0,0.4)', slotBg: 'rgba(255,109,0,0.08)',
    toolbarBtn: '#E65100', panelBg: 'rgba(255,109,0,0.08)', panelBorder: 'rgba(255,109,0,0.15)',
  },
  gold: {
    gradientTop: '#0A0800', gradientBottom: '#1A1400', accent: '#FFD700',
    cardFace: '#FFF8DC', cardText: '#4A3800', cardBorder: 'rgba(255,215,0,0.4)',
    cardBack: '#B8860B', slotBorder: 'rgba(255,215,0,0.5)', slotBg: 'rgba(255,215,0,0.08)',
    toolbarBtn: '#DAA520', panelBg: 'rgba(255,215,0,0.08)', panelBorder: 'rgba(255,215,0,0.2)',
  },
  sakura: {
    gradientTop: '#1A0810', gradientBottom: '#2A0D1A', accent: '#FF69B4',
    cardFace: '#FFE4EC', cardText: '#5E1A3A', cardBorder: 'rgba(255,105,180,0.35)',
    cardBack: '#AD1457', slotBorder: 'rgba(255,105,180,0.4)', slotBg: 'rgba(255,105,180,0.08)',
    toolbarBtn: '#C2185B', panelBg: 'rgba(255,105,180,0.08)', panelBorder: 'rgba(255,105,180,0.15)',
  },
  arctic: {
    gradientTop: '#081828', gradientBottom: '#0A2035', accent: '#87CEEB',
    cardFace: '#E8F4FF', cardText: '#1A3A5C', cardBorder: 'rgba(135,206,235,0.35)',
    cardBack: '#1565C0', slotBorder: 'rgba(135,206,235,0.45)', slotBg: 'rgba(135,206,235,0.08)',
    toolbarBtn: '#1976D2', panelBg: 'rgba(135,206,235,0.08)', panelBorder: 'rgba(135,206,235,0.15)',
  },
  ruby: {
    gradientTop: '#1A0505', gradientBottom: '#280808', accent: '#FF1744',
    cardFace: '#FFE0E0', cardText: '#4A0A0A', cardBorder: 'rgba(255,23,68,0.35)',
    cardBack: '#B71C1C', slotBorder: 'rgba(255,23,68,0.4)', slotBg: 'rgba(255,23,68,0.08)',
    toolbarBtn: '#D50000', panelBg: 'rgba(255,23,68,0.08)', panelBorder: 'rgba(255,23,68,0.15)',
  },
  neon: {
    gradientTop: '#020208', gradientBottom: '#050510', accent: '#39FF14',
    cardFace: '#0A1A0A', cardText: '#39FF14', cardBorder: 'rgba(57,255,20,0.4)',
    cardBack: '#003300', slotBorder: 'rgba(57,255,20,0.5)', slotBg: 'rgba(57,255,20,0.06)',
    toolbarBtn: '#00C853', panelBg: 'rgba(57,255,20,0.06)', panelBorder: 'rgba(57,255,20,0.2)',
  },
  midnight: {
    gradientTop: '#030308', gradientBottom: '#08081A', accent: '#7C4DFF',
    cardFace: '#1A1A2E', cardText: '#C8C8E8', cardBorder: 'rgba(124,77,255,0.35)',
    cardBack: '#311B92', slotBorder: 'rgba(124,77,255,0.4)', slotBg: 'rgba(124,77,255,0.08)',
    toolbarBtn: '#651FFF', panelBg: 'rgba(124,77,255,0.08)', panelBorder: 'rgba(124,77,255,0.15)',
  },
  desert: {
    gradientTop: '#1A0E04', gradientBottom: '#0E0802', accent: '#FF9100',
    cardFace: '#FFF3E0', cardText: '#4E3418', cardBorder: 'rgba(255,145,0,0.35)',
    cardBack: '#D84315', slotBorder: 'rgba(255,145,0,0.4)', slotBg: 'rgba(255,145,0,0.08)',
    toolbarBtn: '#EF6C00', panelBg: 'rgba(255,145,0,0.08)', panelBorder: 'rgba(255,145,0,0.15)',
  },
};

export function getThemeGradient(themeId) {
  const t = THEME_COLORS[themeId] || THEME_COLORS.cosmic;
  return [t.gradientTop, t.gradientBottom];
}

export function getThemeColors(themeId) {
  return THEME_COLORS[themeId] || THEME_COLORS.cosmic;
}
