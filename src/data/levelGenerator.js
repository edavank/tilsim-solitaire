import { WORD_POOLS } from './wordPools';

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function generateLevels(startId, count, language = 'tr') {
  const pools = WORD_POOLS[language] || WORD_POOLS.tr;
  const levels = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const diff = Math.min(Math.floor((id - 1) / 5), 9);
    const numCats = Math.min(3 + Math.floor(diff / 2), 6);
    const wordsPerCat = Math.min(4 + Math.floor(diff / 3), 5);
    const hints = Math.max(5 - Math.floor(diff / 2), 1);
    const undos = diff < 4 ? 1 : 0;
    const lockedSlots = diff >= 6 ? 2 : 1;

    const baseDepth = Math.min(3 + Math.floor(diff / 3), 4);
    const columns = [
      { locked: true },
      { depth: baseDepth },
      { depth: baseDepth },
      { depth: Math.max(baseDepth - 1, 2) },
      { depth: Math.max(baseDepth - 1, 2) },
    ];

    const eligible = pools.filter((p) => p.words.length >= wordsPerCat);
    const picked = pickRandom(eligible, numCats);
    const categories = picked.map((pool) => ({
      name: pool.name,
      words: pickRandom(pool.words, Math.min(wordsPerCat, pool.words.length)),
    }));

    const totalCards = categories.reduce((sum, c) => sum + c.words.length, 0) + numCats;
    const colCards = columns.reduce((s, c) => c.locked ? s : s + (c.depth || 0), 0);
    const deckCards = Math.max(0, totalCards - colCards);
    const moves = Math.max(deckCards + totalCards + 5 - diff, 22);

    levels.push({
      id, moves, hints, undos, categories,
      totalSlots: numCats, lockedSlots, columns,
    });
  }
  return levels;
}
