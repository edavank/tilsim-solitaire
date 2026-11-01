let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

const KEYS = {
  PROGRESS: '@tilsim_progress',
  SETTINGS: '@tilsim_settings',
  SAVED_GAME: '@tilsim_saved_game',
  SAVED_TIMED: '@tilsim_saved_game_timed',
  SAVED_DAILY: '@tilsim_saved_game_daily',
  SAVED_MODES: '@tilsim_saved_modes_v1',
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
let dataEpoch = 0;
async function withLock(key, fn) {
  const prev = _locks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((r) => { release = r; });
  const queued = prev.then(() => next);
  _locks.set(key, queued);
  try {
    await prev;
    return await fn();
  } finally {
    release();
    // Son kilidi temizle ki Map büyümesin
    if (_locks.get(key) === queued) _locks.delete(key);
  }
}

async function getItem(key) {
  if (!AsyncStorage) return memStore[key] || null;
  return AsyncStorage.getItem(key);
}

async function setItem(key, value) {
  // Do not acknowledge a financial/progress write that was not persisted.
  if (AsyncStorage) await AsyncStorage.setItem(key, value);
  memStore[key] = value;
}

async function removeItem(key) {
  if (AsyncStorage) await AsyncStorage.removeItem(key);
  delete memStore[key];
}

export async function loadProgress() {
  const raw = await getItem(KEYS.PROGRESS);
  if (!raw) return { ...DEFAULT_PROGRESS, unlockedThemes: [...DEFAULT_PROGRESS.unlockedThemes] };
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (error) { throw Object.assign(new Error('Kayıt okunamadı; mevcut veriler korunuyor.'), {code:'SAVE_CORRUPT'}); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw Object.assign(new Error('Geçersiz kayıt; mevcut veriler korunuyor.'), {code:'SAVE_CORRUPT'});
  }
  const progress = { ...DEFAULT_PROGRESS, ...parsed,
    unlockedThemes: Array.isArray(parsed.unlockedThemes) ? [...parsed.unlockedThemes] : [...DEFAULT_PROGRESS.unlockedThemes] };
  validateProgressBalance(progress);
  return progress;
}

function validateProgressBalance(progress) {
  if (!Number.isSafeInteger(progress.coins) || progress.coins < 0) {
    throw Object.assign(new Error('Bakiye geçersiz; işlem kaydedilmedi.'), {code:'INVALID_BALANCE'});
  }
}

export async function saveProgress(progress) {
  validateProgressBalance(progress);
  await setItem(KEYS.PROGRESS, JSON.stringify(progress));
}

export async function updateProgress(updates, walletEvent = {}) {
  // Atomik: eşzamanlı çağrılar sıralanır, her biri en güncel değeri okur.
  // `updates` obje veya fonksiyon olabilir. Fonksiyon pattern coin/xp gibi
  // increment'lerde lost-update önler: updateProgress(cur => ({coins: cur.coins+50}))
  const epoch = dataEpoch;
  return withLock(KEYS.PROGRESS, async () => {
    if (epoch !== dataEpoch) throw Object.assign(new Error('Kayıt sıfırlama sırasında değişti.'),{code:'DATA_RESET'});
    const current = await loadProgress();
    if (current._localCleanup) throw Object.assign(new Error('Yerel kayıt temizliği tamamlanmalı.'),{code:'CLEANUP_PENDING'});
    const patch = typeof updates === 'function' ? updates(current) : updates;
    const next = { ...current, ...patch };
    if (Number.isFinite(next.coins) && next.coins !== current.coins) {
      const restoredHistory = walletEvent.source === 'cloud' && Array.isArray(patch.walletHistory)
        && patch.walletHistory[patch.walletHistory.length-1]?.balanceAfter === next.coins ? patch.walletHistory : null;
      const history = Array.isArray(current.walletHistory) ? current.walletHistory : [{
        id:'opening',createdAt:Date.now(),kind:'opening',description:'İlk kayıtlı bakiye',amount:current.coins,balanceAfter:current.coins,
      }];
      next.walletHistory = restoredHistory || [...history, { id:walletEvent.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt:Date.now(),kind:walletEvent.kind || (next.coins > current.coins ? 'credit':'spend'),
        description:walletEvent.description || 'Oyun içi bakiye değişimi',
        amount:next.coins-current.coins,balanceAfter:next.coins,runId:walletEvent.runId,
        source:walletEvent.source,levelId:walletEvent.levelId,toolKey:walletEvent.toolKey }].slice(-200);
    }
    await saveProgress(next);
    return next;
  });
}

export async function loadCloudJournal(accountId) {
  const raw = await getItem(`@tilsim_cloud_v2:${accountId}`);
  return raw ? JSON.parse(raw) : null;
}
export async function saveCloudJournal(accountId, journal) {
  return withLock(`@tilsim_cloud_v2:${accountId}`, () => setItem(`@tilsim_cloud_v2:${accountId}`, JSON.stringify(journal)));
}

export async function getPendingAccountDeletion() {
  const raw = await getItem('@tilsim_deleted_account');
  return raw ? JSON.parse(raw) : null;
}
export async function rememberAccountDeletion(accountId) {
  await setItem('@tilsim_deleted_account',JSON.stringify({accountId}));
}
export async function clearPendingAccountDeletion() { await removeItem('@tilsim_deleted_account'); }

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

function savedGameKey(mode = 'classic') {
  if (mode === 'timed') return KEYS.SAVED_TIMED;
  if (mode === 'daily') return KEYS.SAVED_DAILY;
  return KEYS.SAVED_GAME;
}

async function markSaveModeMigrated(mode) {
  if (mode === 'classic') return;
  return withLock(KEYS.SAVED_MODES, async () => {
    const raw = await getItem(KEYS.SAVED_MODES);
    const modes = raw ? JSON.parse(raw) : {};
    if (!modes[mode]) await setItem(KEYS.SAVED_MODES,JSON.stringify({...modes,[mode]:true}));
  });
}

export async function loadSavedGame(mode = 'classic') {
  const progress = await loadProgress();
  if (Object.prototype.hasOwnProperty.call(progress._localBoards || {}, mode)) {
    return progress._localBoards[mode];
  }
  const key = savedGameKey(mode);
  return withLock(key, async () => {
    const raw = await getItem(key);
    if (raw) {
      const saved = JSON.parse(raw);
      if (mode !== 'classic') await markSaveModeMigrated(mode);
      else if (['timed','daily'].includes(saved.gameMode)) {
        // Preserve a legacy mode save before classic play can replace its key.
        await saveSavedGame(saved);
        return null;
      }
      return saved;
    }
    if (key !== KEYS.SAVED_GAME) {
      const modeRaw = await getItem(KEYS.SAVED_MODES);
      if (modeRaw && JSON.parse(modeRaw)[mode]) return null;
      const legacyRaw = await getItem(KEYS.SAVED_GAME);
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy.gameMode === mode) {
          await setItem(key,legacyRaw);
          await markSaveModeMigrated(mode);
          return legacy;
        }
      }
    }
    return null;
  });
}

export async function saveSavedGame(gameState) {
  const mode = gameState.gameMode || 'classic';
  return updateProgress(current => {
    if ((gameState.resetEpoch || null) !== (current.resetEpoch || null)) throw Object.assign(new Error('Bu oyun sıfırlama öncesine ait.'),{code:'DATA_RESET'});
    const previous = current._localBoards?.[mode];
    if (current._localClosedRuns?.includes(gameState.runId)) return {};
    // A queued autosave from before a paid action cannot undo that action.
    if (previous && previous.runId === gameState.runId && (previous._toolRevision || 0) > (gameState._toolRevision || 0)) return {};
    return {_localBoards:{...current._localBoards,[mode]:gameState}};
  });
}

export async function clearSavedGame(mode = 'classic') {
  // Load a legacy run before installing the tombstone; keep old disk data intact.
  const previous = await loadSavedGame(mode);
  return updateProgress(current => {
    const runId = current._localBoards?.[mode]?.runId || previous?.runId;
    return {_localBoards:{...current._localBoards,[mode]:null},
      _localClosedRuns:[...new Set([...(current._localClosedRuns || []),...(runId ? [runId] : [])])].slice(-64)};
  });
}

// Inventory/coins and the resulting board live in ONE durable JSON write.
// A crash sees either the old pair or the new pair, never a debit without its board.
export async function commitBoardAction({before, after, tool, coinCost = 0}) {
  if (!before?.runId || after?.runId !== before.runId || !Number.isSafeInteger(coinCost) || coinCost < 0) throw new Error('Invalid board transaction');
  const mode = before.gameMode || 'classic';
  if (!['classic','daily','timed'].includes(mode) || (after.gameMode || 'classic') !== mode) throw new Error('Invalid game mode');
  if (tool && !['hint','undo','joker','shuffle','delete'].includes(tool)) throw new Error('Invalid tool');
  let success = false, board = null;
  const progress = await updateProgress(current => {
    if ((before.resetEpoch || null) !== (current.resetEpoch || null)) throw Object.assign(new Error('Bu oyun sıfırlama öncesine ait.'),{code:'DATA_RESET'});
    const saved = current._localBoards?.[mode];
    if (current._localClosedRuns?.includes(before.runId)
      || (saved && saved.runId !== before.runId)
      || (saved?.runId === before.runId && (saved._toolRevision || 0) !== (before._toolRevision || 0))) {
      throw Object.assign(new Error('Oyun kaydı değişti. Yeniden açarak devam et.'),{code:'BOARD_CONFLICT'});
    }
    const count = tool ? current.toolCredits?.[tool] ?? 0 : 0;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid tool inventory');
    if (current.coins < coinCost || (tool && count < 1)) return {};
    board = {...after,_toolRevision:(before._toolRevision || 0)+1};
    success = true;
    return {coins:current.coins-coinCost,
      ...(tool ? {toolCredits:{...current.toolCredits,[tool]:count-1}} : {}),
      _localBoards:{...current._localBoards,[mode]:board}};
  },{kind:'purchase',source:'board-action',toolKey:tool || 'moves',description:'Oyun içi yardımcı işlemi'});
  return {success,progress,board};
}

// "Tüm ilerleme silinecek" prompt'una uyumlu: progress + saved_game + stars +
// xp + achievements + collection + daily + daily_login hepsi temizlenir.
// Settings (dil/ses) ve device_id korunur — bunlar oyun içi ilerleme değil.
const USER_DATA_KEYS = [KEYS.SAVED_GAME,KEYS.SAVED_TIMED,KEYS.SAVED_DAILY,KEYS.SAVED_MODES,
  '@tilsim_stars','@tilsim_xp','@tilsim_achievements','@tilsim_collection','@tilsim_daily_login','tilsim_daily_login'];

async function finishLocalCleanup(current) {
  const operation = current._localCleanup;
  if (!operation) return current;
  // The marker remains durable if ANY deletion fails. Never pretend cleanup succeeded.
  for (const key of USER_DATA_KEYS) await removeItem(key);
  const keys = AsyncStorage ? await AsyncStorage.getAllKeys() : Object.keys(memStore);
  const dailyKeys = keys.filter(key=>key.startsWith('@tilsim_daily_'));
  for (const key of dailyKeys) await removeItem(key);
  if (operation.deleteAccountId) await removeItem(`@tilsim_cloud_v2:${operation.deleteAccountId}`);
  await saveProgress(operation.target);
  return operation.target;
}

export async function recoverLocalCleanup() {
  return withLock(KEYS.PROGRESS, async()=>finishLocalCleanup(await loadProgress()));
}

async function resetUserData(kind, deleteAccountId) {
  dataEpoch++;
  return withLock(KEYS.PROGRESS,async()=>{
    let current = await loadProgress();
    if (current._localCleanup) current = await finishLocalCleanup(current);
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    const target = {...DEFAULT_PROGRESS,unlockedThemes:[...DEFAULT_PROGRESS.unlockedThemes],
      resetEpoch:id,_localBoards:{classic:null,timed:null,daily:null}};
    if (kind === 'reset') {
      target.resetEpoch = id;
      if (current._cloudOwner) target._cloudOwner = current._cloudOwner;
      target._cloudResetIntent = {id,createdAt:Date.now()};
    }
    const marked = {...current,_localCleanup:{kind,target,deleteAccountId}};
    await saveProgress(marked);
    return finishLocalCleanup(marked);
  });
}

export async function resetAll() { return resetUserData('reset'); }
export async function resetUserScopedData(options = {}) { return resetUserData('signout',options.deleteAccountId); }

let accountPreparationQueue = Promise.resolve();
export function prepareAccountLocalData(accountId) {
  const next = accountPreparationQueue.then(async()=>{
    await recoverLocalCleanup();
    const progress = await loadProgress();
    if (!progress._cloudOwner || progress._cloudOwner === accountId) return;
    const previousId = progress._cloudOwner;
    const journal = await loadCloudJournal(previousId) || {};
    await saveCloudJournal(previousId,{...journal,backup:progress});
    await resetUserScopedData();
  });
  accountPreparationQueue=next.catch(()=>{});
  return next;
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
    const progress = await loadProgress();
    if (progress.levelStars) return progress.levelStars;
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
    const progress = await loadProgress();
    if (Number.isFinite(progress.xp)) return { xp: progress.xp, level: Math.floor(progress.xp / 500) + 1 };
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

