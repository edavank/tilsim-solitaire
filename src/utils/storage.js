let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

const KEYS = {
  PROGRESS: '@tilsim_progress',
  SETTINGS: '@tilsim_settings',
  SAVED_GAME: '@tilsim_saved_game',
};

const DEFAULT_PROGRESS = {
  currentLevel: 1, coins: 50, totalGames: 0, totalWins: 0, bestScore: 0, streak: 0, unlockedThemes: ['cosmic'],
};

const DEFAULT_SETTINGS = { sound: true, bgm: true, vibration: true, language: 'tr', difficulty: 'normal' };

// In-memory fallback when AsyncStorage is unavailable
let memStore = {};

async function getItem(key) {
  if (!AsyncStorage) return memStore[key] || null;
  try { return await AsyncStorage.getItem(key); } catch (e) { return memStore[key] || null; }
}

async function setItem(key, value) {
  memStore[key] = value;
  if (!AsyncStorage) return;
  try { await AsyncStorage.setItem(key, value); } catch (e) {}
}

async function removeItem(key) {
  delete memStore[key];
  if (!AsyncStorage) return;
  try { await AsyncStorage.removeItem(key); } catch (e) {}
}

export async function loadProgress() {
  try {
    const raw = await getItem(KEYS.PROGRESS);
    if (raw) return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_PROGRESS };
}

export async function saveProgress(progress) {
  try { await setItem(KEYS.PROGRESS, JSON.stringify(progress)); } catch (e) {}
}

export async function updateProgress(updates) {
  const current = await loadProgress();
  const next = { ...current, ...updates };
  await saveProgress(next);
  return next;
}

export async function loadSettings() {
  try {
    const raw = await getItem(KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings) {
  try { await setItem(KEYS.SETTINGS, JSON.stringify(settings)); } catch (e) {}
}

export async function loadSavedGame() {
  try {
    const raw = await getItem(KEYS.SAVED_GAME);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export async function saveSavedGame(gameState) {
  try { await setItem(KEYS.SAVED_GAME, JSON.stringify(gameState)); } catch (e) {}
}

export async function clearSavedGame() {
  try { await removeItem(KEYS.SAVED_GAME); } catch (e) {}
}

export async function resetAll() {
  try {
    await removeItem(KEYS.PROGRESS);
    await removeItem(KEYS.SETTINGS);
    await removeItem(KEYS.SAVED_GAME);
    memStore = {};
  } catch (e) {}
}
