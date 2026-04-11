import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  PROGRESS: '@tilsim_progress',
  SETTINGS: '@tilsim_settings',
  SAVED_GAME: '@tilsim_saved_game',
};

const DEFAULT_PROGRESS = {
  currentLevel: 1,
  coins: 310,
  totalGames: 0,
  totalWins: 0,
  bestScore: 0,
  streak: 0,
  unlockedThemes: ['cosmic'],
};

const DEFAULT_SETTINGS = {
  sound: true,
  music: true,
  vibration: true,
  language: 'tr',
  difficulty: 'normal',
};

// ── Progress ──
export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.PROGRESS);
    if (raw) return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch (e) { console.warn('loadProgress error:', e); }
  return { ...DEFAULT_PROGRESS };
}

export async function saveProgress(progress) {
  try {
    await AsyncStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) { console.warn('saveProgress error:', e); }
}

export async function updateProgress(updates) {
  const current = await loadProgress();
  const next = { ...current, ...updates };
  await saveProgress(next);
  return next;
}

// ── Settings ──
export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) { console.warn('loadSettings error:', e); }
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) { console.warn('saveSettings error:', e); }
}

// ── Saved Game (resume interrupted game) ──
export async function loadSavedGame() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SAVED_GAME);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('loadSavedGame error:', e); }
  return null;
}

export async function saveSavedGame(gameState) {
  try {
    await AsyncStorage.setItem(KEYS.SAVED_GAME, JSON.stringify(gameState));
  } catch (e) { console.warn('saveSavedGame error:', e); }
}

export async function clearSavedGame() {
  try {
    await AsyncStorage.removeItem(KEYS.SAVED_GAME);
  } catch (e) { console.warn('clearSavedGame error:', e); }
}

// ── Reset all ──
export async function resetAll() {
  try {
    await AsyncStorage.multiRemove([KEYS.PROGRESS, KEYS.SETTINGS, KEYS.SAVED_GAME]);
  } catch (e) { console.warn('resetAll error:', e); }
}
