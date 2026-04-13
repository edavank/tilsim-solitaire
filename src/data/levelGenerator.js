import { WORD_POOLS } from './wordPools';

function seededRandom(seed) {
  let s = Math.abs(seed) || 1;
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

export function generateLevels(startId, count, language = 'tr') {
  const pools = WORD_POOLS[language] || WORD_POOLS.tr;
  const levels = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const rand = seededRandom(id * 7919 + 42);
    
    const diff = Math.min(Math.floor((id - 1) / 3), 15);
    const numCats = Math.min(3 + Math.floor(diff / 2), 6);
    const wordsPerCat = Math.min(4 + Math.floor(diff / 4), 6);
    const hints = Math.max(4 - Math.floor(diff / 2), 1);
    const undos = diff < 3 ? 1 : 0;
    const lockedSlots = diff >= 8 ? 2 : 1;
    const baseDepth = Math.min(3 + Math.floor(diff / 4), 5);
    const columns = [
      { locked: true },
      { depth: baseDepth },
      { depth: baseDepth },
      { depth: Math.max(baseDepth - 1, 2) },
      { depth: Math.max(baseDepth - 1, 2) },
    ];

    const eligible = pools.filter((p) => p.words.length >= wordsPerCat);
    const picked = seededShuffle(eligible, rand).slice(0, numCats);
    const categories = picked.map((pool) => ({
      name: pool.name,
      words: seededShuffle(pool.words, rand).slice(0, wordsPerCat),
    }));

    const totalCards = categories.reduce((sum, c) => sum + c.words.length, 0) + numCats;
    const colCards = columns.reduce((s, c) => c.locked ? s : s + (c.depth || 0), 0);
    const deckCards = Math.max(0, totalCards - colCards);
    const buffer = Math.max(8 - Math.floor(diff / 2), 2);
    const moves = deckCards + totalCards + buffer;

    levels.push({
      id, moves, hints, undos, categories,
      totalSlots: numCats, lockedSlots, columns,
    });
  }
  return levels;
}
