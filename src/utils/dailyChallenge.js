// Daily Challenge — generates a unique level for each day
import { WORD_POOLS } from '../data/wordPools';

function seededRandom(seed) {
  let s = seed;
  // Warmup: skip first 10 values to avoid similar sequences from close seeds
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

export function getDailyChallenge(language = 'tr') {
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rand = seededRandom(dateSeed);

  const pools = WORD_POOLS[language] || WORD_POOLS.tr;
  const numCats = 5;
  const wordsPerCat = 5;

  const eligible = pools.filter((p) => p.words.length >= wordsPerCat);
  const shuffled = seededShuffle(eligible, rand);
  const picked = shuffled.slice(0, numCats);

  const categories = picked.map((pool) => ({
    name: pool.name,
    words: seededShuffle(pool.words, rand).slice(0, wordsPerCat),
  }));

  const totalCards = categories.reduce((sum, c) => sum + c.words.length, 0) + numCats;

  return {
    id: dateSeed,
    isDaily: true,
    moves: totalCards + 8,
    hints: 2,
    undos: 0,
    categories,
    totalSlots: numCats,
    lockedSlots: 1,
    columns: [
      { locked: true },
      { depth: 4 },
      { depth: 4 },
      { depth: 3 },
      { depth: 3 },
    ],
  };
}

export function getDailyDateString() {
  const d = new Date();
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

export function isDailyChallengeCompleted() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const today = new Date().toISOString().split('T')[0];
    return AsyncStorage.getItem('@tilsim_daily_' + today).then(v => v === 'done');
  } catch (e) { return Promise.resolve(false); }
}

export function markDailyChallengeCompleted() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const today = new Date().toISOString().split('T')[0];
    return AsyncStorage.setItem('@tilsim_daily_' + today, 'done');
  } catch (e) { return Promise.resolve(); }
}
