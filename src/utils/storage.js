let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

const KEYS = {
  PROGRESS: '@tilsim_progress',
  SETTINGS: '@tilsim_settings',
  SAVED_GAME: '@tilsim_saved_game',
};

const DEFAULT_PROGRESS = {
  currentLevel: 1, coins: 500, totalGames: 0, totalWins: 0, bestScore: 0, streak: 0, unlockedThemes: ['cosmic'],
};

const DEFAULT_SETTINGS = { sound: true, bgm: true, vibration: true, language: 'tr', difficulty: 'normal' };

// In-memory fallback when AsyncStorage is unavailable
let memStore = {};

// Per-key serial lock — her key için read-modify-write işlemlerini sıraya dizer.
// Race condition fix: iki ödülü aynı anda eklerken birinin kaybolmamasını garanti eder.
const _locks = new Map();
async function withLock(key, fn) {
  const prev = _locks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((r) => { release = r; });
  _locks.set(key, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    // Son kilidi temizle ki Map büyümesin
    if (_locks.get(key) === next) _locks.delete(key);
  }
}

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
    if (raw) {
      const parsed = JSON.parse(raw);
      // Deep-copy arrays so callers can't mutate DEFAULT_PROGRESS via shared ref
      return {
        ...DEFAULT_PROGRESS,
        ...parsed,
        unlockedThemes: Array.isArray(parsed.unlockedThemes)
          ? [...parsed.unlockedThemes]
          : [...DEFAULT_PROGRESS.unlockedThemes],
      };
    }
  } catch (e) {}
  return { ...DEFAULT_PROGRESS, unlockedThemes: [...DEFAULT_PROGRESS.unlockedThemes] };
}

export async function saveProgress(progress) {
  try { await setItem(KEYS.PROGRESS, JSON.stringify(progress)); } catch (e) {}
}

export async function updateProgress(updates) {
  // Atomik: eşzamanlı çağrılar sıralanır, her biri en güncel değeri okur.
  // `updates` obje veya fonksiyon olabilir. Fonksiyon pattern coin/xp gibi
  // increment'lerde lost-update önler: updateProgress(cur => ({coins: cur.coins+50}))
  return withLock(KEYS.PROGRESS, async () => {
    const current = await loadProgress();
    const patch = typeof updates === 'function' ? updates(current) : updates;
    const next = { ...current, ...patch };
    await saveProgress(next);
    return next;
  });
}

export async function loadSettings() {
  try {
    const raw = await getItem(KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings) {
  return withLock(KEYS.SETTINGS, async () => {
    try {
      const current = await loadSettings();
      const merged = { ...current, ...settings };
      await setItem(KEYS.SETTINGS, JSON.stringify(merged));
    } catch (e) {}
  });
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

// "Tüm ilerleme silinecek" prompt'una uyumlu: progress + saved_game + stars +
// xp + achievements + collection + daily + daily_login hepsi temizlenir.
// Settings (dil/ses) ve device_id korunur — bunlar oyun içi ilerleme değil.
export async function resetAll() {
  try {
    const keysToClear = [
      KEYS.PROGRESS,
      KEYS.SAVED_GAME,
      '@tilsim_stars',
      '@tilsim_xp',
      '@tilsim_achievements',
      '@tilsim_collection',
      '@tilsim_daily_login',
    ];
    for (const k of keysToClear) await removeItem(k);
    // Günlük görev tamamlama kayıtlarını da sil (@tilsim_daily_YYYY-MM-DD)
    if (AsyncStorage) {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const dailyKeys = allKeys.filter((k) => k.startsWith('@tilsim_daily_') && k !== '@tilsim_daily_login');
        if (dailyKeys.length) await AsyncStorage.multiRemove(dailyKeys);
      } catch (e) {}
    }
    memStore = {};
    // Force default progress (coins=500, level=1)
    await saveProgress(DEFAULT_PROGRESS);
  } catch (e) {}
}

// Hesap değişikliğinde (sign-out / sign-in başka hesaba) çağrılır.
// Yerel progress'i varsayılana döndürür ki bir kullanıcının coin/level'i
// syncToCloud Math.max merge yoluyla diğerine sızmasın.
// Ayarlar, tema tercihi, device_id korunur.
export async function resetUserScopedData() {
  try {
    const keysToClear = [
      KEYS.PROGRESS,
      KEYS.SAVED_GAME,
      '@tilsim_stars',
      '@tilsim_xp',
      '@tilsim_achievements',
      '@tilsim_collection',
      '@tilsim_daily_login',
    ];
    for (const k of keysToClear) await removeItem(k);
    if (AsyncStorage) {
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const dailyKeys = allKeys.filter((k) => k.startsWith('@tilsim_daily_') && k !== '@tilsim_daily_login');
        if (dailyKeys.length) await AsyncStorage.multiRemove(dailyKeys);
      } catch (e) {}
    }
    memStore = {};
    await saveProgress(DEFAULT_PROGRESS);
  } catch (e) {}
}

// Yıldız sistemi — atomik read-modify-write
export async function saveLevelStars(levelId, stars) {
  return withLock('@tilsim_stars', async () => {
    try {
      const raw = await getItem('@tilsim_stars');
      const map = raw ? JSON.parse(raw) : {};
      const prev = map[levelId] || 0;
      if (stars > prev) map[levelId] = stars;
      await setItem('@tilsim_stars', JSON.stringify(map));
    } catch (e) {}
  });
}

export async function loadLevelStars() {
  try {
    const raw = await getItem('@tilsim_stars');
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

// XP sistemi — atomik
export async function addXP(amount) {
  return withLock('@tilsim_xp', async () => {
    try {
      const raw = await getItem('@tilsim_xp');
      const data = raw ? JSON.parse(raw) : { xp: 0, level: 1 };
      data.xp += amount;
      data.level = Math.floor(data.xp / 500) + 1;
      await setItem('@tilsim_xp', JSON.stringify(data));
      return data;
    } catch (e) { return { xp: 0, level: 1 }; }
  });
}

export async function loadXP() {
  try {
    const raw = await getItem('@tilsim_xp');
    return raw ? JSON.parse(raw) : { xp: 0, level: 1 };
  } catch (e) { return { xp: 0, level: 1 }; }
}

// ── Avatar Sistemi (v1.0.5) ──
const AVATAR_KEY = '@tilsim_avatar';

// 12 avatar — her belirli levelde 1 unlock
export const AVATARS = [
  { id: 'wizard',  image: require('../../assets/avatars/wizard.png'),  unlockLevel: 1   },
  { id: 'fox',     image: require('../../assets/avatars/fox.png'),     unlockLevel: 5   },
  { id: 'cat',     image: require('../../assets/avatars/cat.png'),     unlockLevel: 10  },
  { id: 'unicorn', image: require('../../assets/avatars/unicorn.png'), unlockLevel: 15  },
  { id: 'panda',   image: require('../../assets/avatars/panda.png'),   unlockLevel: 20  },
  { id: 'lion',    image: require('../../assets/avatars/lion.png'),    unlockLevel: 25  },
  { id: 'owl',     image: require('../../assets/avatars/owl.png'),     unlockLevel: 30  },
  { id: 'dragon',  image: require('../../assets/avatars/dragon.png'),  unlockLevel: 40  },
  { id: 'fairy',   image: require('../../assets/avatars/fairy.png'),   unlockLevel: 50  },
  { id: 'eagle',   image: require('../../assets/avatars/eagle.png'),   unlockLevel: 70  },
  { id: 'star',    image: require('../../assets/avatars/star.png'),    unlockLevel: 90  },
  { id: 'crown',   image: require('../../assets/avatars/crown.png'),   unlockLevel: 110 },
];

export async function loadSelectedAvatar() {
  // Wrapper getItem kullan: memStore fallback ile tutarlı (diğer keylerle uyumlu)
  try {
    const raw = await getItem(AVATAR_KEY);
    return raw || 'wizard';
  } catch (e) { return 'wizard'; }
}

export async function saveSelectedAvatar(avatarId) {
  try {
    await setItem(AVATAR_KEY, avatarId);
  } catch (e) {}
}

export function getAvatarEmoji(avatarId) {
  const a = AVATARS.find(av => av.id === avatarId);
  return a ? a.image : AVATARS[0].image;
}

export function isAvatarUnlocked(avatarId, currentLevel) {
  const a = AVATARS.find(av => av.id === avatarId);
  return a ? currentLevel >= a.unlockLevel : false;
}
