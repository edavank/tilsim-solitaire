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
    cardFace: '#FFFFFF', cardText: '#1a1a2e', cardBorder: 'rgba(155,125,255,0.15)',
    cardBack: '#6B5B8A', slotBorder: 'rgba(183,148,246,0.3)', slotBg: 'rgba(124,92,252,0.05)',
    toolbarBtn: '#4A6CF7', panelBg: 'rgba(255,255,255,0.06)', panelBorder: 'rgba(255,255,255,0.08)',
  },
  ocean: {
    gradientTop: '#0a1628', gradientBottom: '#071222', accent: '#4FC3F7',
    cardFace: '#E8F4FD', cardText: '#0D2137', cardBorder: 'rgba(79,195,247,0.2)',
    cardBack: '#1565C0', slotBorder: 'rgba(79,195,247,0.3)', slotBg: 'rgba(21,101,192,0.08)',
    toolbarBtn: '#0277BD', panelBg: 'rgba(79,195,247,0.06)', panelBorder: 'rgba(79,195,247,0.1)',
  },
  forest: {
    gradientTop: '#0a1a0a', gradientBottom: '#071407', accent: '#81C784',
    cardFace: '#F5ECD7', cardText: '#1B3B2A', cardBorder: 'rgba(129,199,132,0.2)',
    cardBack: '#2E7D32', slotBorder: 'rgba(129,199,132,0.3)', slotBg: 'rgba(46,125,50,0.08)',
    toolbarBtn: '#388E3C', panelBg: 'rgba(129,199,132,0.06)', panelBorder: 'rgba(129,199,132,0.1)',
  },
  sunset: {
    gradientTop: '#1A0A0A', gradientBottom: '#2A1018', accent: '#FF8C42',
    cardFace: '#FFF8F0', cardText: '#3E2723', cardBorder: 'rgba(255,140,66,0.2)',
    cardBack: '#D84315', slotBorder: 'rgba(255,140,66,0.3)', slotBg: 'rgba(216,67,21,0.08)',
    toolbarBtn: '#E64A19', panelBg: 'rgba(255,140,66,0.06)', panelBorder: 'rgba(255,140,66,0.1)',
  },
  gold: {
    gradientTop: '#0D0D0D', gradientBottom: '#1A1500', accent: '#FFD54F',
    cardFace: '#FFF8E7', cardText: '#3E2723', cardBorder: 'rgba(255,213,79,0.25)',
    cardBack: '#F9A825', slotBorder: 'rgba(255,213,79,0.35)', slotBg: 'rgba(249,168,37,0.08)',
    toolbarBtn: '#F57F17', panelBg: 'rgba(255,213,79,0.06)', panelBorder: 'rgba(255,213,79,0.12)',
  },
  sakura: {
    gradientTop: '#1A0A14', gradientBottom: '#2A0D22', accent: '#FFB7C5',
    cardFace: '#FFF0F5', cardText: '#4A1942', cardBorder: 'rgba(255,183,197,0.2)',
    cardBack: '#C2185B', slotBorder: 'rgba(255,183,197,0.3)', slotBg: 'rgba(194,24,91,0.08)',
    toolbarBtn: '#AD1457', panelBg: 'rgba(255,183,197,0.06)', panelBorder: 'rgba(255,183,197,0.1)',
  },
  arctic: {
    gradientTop: '#0A1A2A', gradientBottom: '#0D2238', accent: '#B0C4DE',
    cardFace: '#F0F8FF', cardText: '#1B3050', cardBorder: 'rgba(176,196,222,0.2)',
    cardBack: '#00838F', slotBorder: 'rgba(176,196,222,0.35)', slotBg: 'rgba(0,131,143,0.08)',
    toolbarBtn: '#00695C', panelBg: 'rgba(176,196,222,0.06)', panelBorder: 'rgba(176,196,222,0.12)',
  },
  ruby: {
    gradientTop: '#2a0505', gradientBottom: '#1A0303', accent: '#EF5350',
    cardFace: '#FFF5F5', cardText: '#3E1A1A', cardBorder: 'rgba(239,83,80,0.2)',
    cardBack: '#C62828', slotBorder: 'rgba(239,83,80,0.3)', slotBg: 'rgba(198,40,40,0.08)',
    toolbarBtn: '#D32F2F', panelBg: 'rgba(239,83,80,0.06)', panelBorder: 'rgba(239,83,80,0.1)',
  },
  neon: {
    gradientTop: '#050510', gradientBottom: '#0A0A1A', accent: '#00FF87',
    cardFace: '#1A1A2E', cardText: '#E0E0E0', cardBorder: 'rgba(0,255,135,0.25)',
    cardBack: '#1B5E20', slotBorder: 'rgba(0,255,135,0.35)', slotBg: 'rgba(0,255,135,0.05)',
    toolbarBtn: '#00C853', panelBg: 'rgba(0,255,135,0.06)', panelBorder: 'rgba(0,255,135,0.15)',
  },
  midnight: {
    gradientTop: '#05050f', gradientBottom: '#0a0a1a', accent: '#B388FF',
    cardFace: '#1E1E2E', cardText: '#D0D0E0', cardBorder: 'rgba(179,136,255,0.2)',
    cardBack: '#4527A0', slotBorder: 'rgba(179,136,255,0.3)', slotBg: 'rgba(69,39,160,0.08)',
    toolbarBtn: '#5E35B1', panelBg: 'rgba(179,136,255,0.06)', panelBorder: 'rgba(179,136,255,0.1)',
  },
  desert: {
    gradientTop: '#1a1008', gradientBottom: '#120A04', accent: '#FFAB40',
    cardFace: '#FFF3E0', cardText: '#4E342E', cardBorder: 'rgba(255,171,64,0.2)',
    cardBack: '#E65100', slotBorder: 'rgba(255,171,64,0.3)', slotBg: 'rgba(230,81,0,0.08)',
    toolbarBtn: '#EF6C00', panelBg: 'rgba(255,171,64,0.06)', panelBorder: 'rgba(255,171,64,0.1)',
  },
};

export function getThemeGradient(themeId) {
  const t = THEME_COLORS[themeId] || THEME_COLORS.cosmic;
  return [t.gradientTop, t.gradientBottom];
}

export function getThemeColors(themeId) {
  return THEME_COLORS[themeId] || THEME_COLORS.cosmic;
}
