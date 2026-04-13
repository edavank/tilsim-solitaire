// Responsive utility — tablet + landscape support
import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');
const isLandscape = width > height;
const shortSide = Math.min(width, height);
const longSide = Math.max(width, height);

// Device detection
export const IS_TABLET = shortSide >= 600;
export const IS_SMALL = shortSide < 375;
export const IS_LANDSCAPE = isLandscape;

// Base scale factor (iPhone SE = 1.0, iPad = ~1.5)
const BASE_WIDTH = 375;
const scale = shortSide / BASE_WIDTH;

// Scale function — responsive sizing
export function rs(size) {
  return Math.round(size * Math.min(scale, 1.8));
}

// Font scale (more conservative than layout scale)
export function fs(size) {
  return Math.round(size * Math.min(scale, 1.4));
}

// Get responsive dimensions for game
export function getGameLayout() {
  const sw = Dimensions.get('window').width;
  const sh = Dimensions.get('window').height;
  const landscape = sw > sh;
  
  const colCount = 5;
  const colGap = IS_TABLET ? 6 : 4;
  const padding = IS_TABLET ? 24 : 8;
  
  // In landscape, leave space for toolbar on side
  const gameWidth = landscape ? sw * 0.75 : sw;
  
  const cardW = Math.floor((gameWidth - padding * 2 - (colCount - 1) * colGap) / colCount);
  const cardH = Math.floor(cardW * 1.3);
  const overlap = -Math.floor(cardH * 0.75);
  
  // Deck card slightly smaller
  const deckW = Math.floor(cardW * 0.88);
  const deckH = Math.floor(cardH * 0.78);
  
  return {
    sw, sh, landscape,
    colCount, colGap, padding,
    cardW, cardH, overlap,
    deckW, deckH,
    gameWidth,
  };
}

// Listen for dimension changes (rotation)
export function onDimensionChange(callback) {
  const sub = Dimensions.addEventListener('change', ({ window }) => {
    callback(window);
  });
  return () => sub?.remove?.();
}
