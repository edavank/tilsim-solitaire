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
    
    // Difficulty ramps faster: every 3 levels instead of 5
    const diff = Math.min(Math.floor((id - 1) / 3), 15);

    // Categories: 3 at start → 6 by level 20+
    const numCats = Math.min(3 + Math.floor(diff / 2), 6);
    
    // Words per category: 4 → 5 → 6 as difficulty rises
    const wordsPerCat = Math.min(4 + Math.floor(diff / 4), 6);
    
    // Hints decrease, undos removed early
    const hints = Math.max(4 - Math.floor(diff / 2), 1);
    const undos = diff < 3 ? 1 : 0;
    
    // Locked slots increase
    const lockedSlots = diff >= 8 ? 2 : 1;

    // Column depth: 3 → 4 → 5 with difficulty
    const baseDepth = Math.min(3 + Math.floor(diff / 4), 5);
    const columns = [
      { locked: true },
      { depth: baseDepth },
      { depth: baseDepth },
      { depth: Math.max(baseDepth - 1, 2) },
      { depth: Math.max(baseDepth - 1, 2) },
    ];

    // Pick random categories ensuring variety
    const eligible = pools.filter((p) => p.words.length >= wordsPerCat);
    const picked = pickRandom(eligible, numCats);
    const categories = picked.map((pool) => ({
      name: pool.name,
      words: pickRandom(pool.words, Math.min(wordsPerCat, pool.words.length)),
    }));

    // Moves: enough for deck draws + placements, but tight at higher levels
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
