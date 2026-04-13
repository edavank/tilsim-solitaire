// Günlük Meydan Okuma — her gün benzersiz, ZOR bir bölüm
import { WORD_POOLS } from '../data/wordPools';

function seededRandom(seed) {
  let s = Math.abs(seed) || 1;
  for (let i = 0; i < 10; i++) s = (s * 16807 + 0) % 2147483647;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function seededShuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getDailyChallenge(language = 'tr', customSeed) {
  const today = new Date();
  const dateSeed = customSeed || (today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate());
  const rand = seededRandom(dateSeed);

  const pools = WORD_POOLS[language] || WORD_POOLS.tr;

  // ZOR: 6 kategori × 5 kelime
  const numCats = 6;
  const wordsPerCat = 5;

  const eligible = pools.filter((p) => p.words.length >= wordsPerCat);
  const picked = seededShuffle(eligible, rand).slice(0, numCats);

  const categories = picked.map((pool) => ({
    name: pool.name,
    words: seededShuffle(pool.words, rand).slice(0, wordsPerCat),
  }));

  const totalCards = categories.reduce((sum, c) => sum + c.words.length, 0) + numCats;
  // Sıkı hamle bütçesi — kolay değil
  const moves = totalCards + Math.floor(totalCards * 1.2) + 5;

  return {
    id: dateSeed,
    isDaily: true,
    moves,
    hints: 1,
    undos: 0,
    categories,
    totalSlots: numCats + 2,
    lockedSlots: 2,
    // 5 sütun, 2 kilitli — alan dar
    columns: [
      { locked: true },
      { locked: true },
      { depth: 4 },
      { depth: 3 },
      { depth: 3 },
      { depth: 3 },
    ],
  };
}

export function getDailyDateString() {
  const d = new Date();
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

export function getDailySeedForDate(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export async function isDailyChallengeCompleted(dateStr) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const key = dateStr || new Date().toISOString().split('T')[0];
    return (await AsyncStorage.getItem('@tilsim_daily_' + key)) === 'done';
  } catch (e) { return false; }
}

export async function markDailyChallengeCompleted(dateStr) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const key = dateStr || new Date().toISOString().split('T')[0];
    return AsyncStorage.setItem('@tilsim_daily_' + key, 'done');
  } catch (e) {}
}

export async function getDailyCompletionMap() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const keys = await AsyncStorage.getAllKeys();
    const dailyKeys = keys.filter(k => k.startsWith('@tilsim_daily_'));
    const map = {};
    for (const k of dailyKeys) {
      const val = await AsyncStorage.getItem(k);
      if (val === 'done') {
        const dateStr = k.replace('@tilsim_daily_', '');
        map[dateStr] = true;
      }
    }
    return map;
  } catch (e) { return {}; }
}

export async function getDailyStreak() {
  const map = await getDailyCompletionMap();
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toISOString().split('T')[0];
    if (map[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
