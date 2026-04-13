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
    
    // Difficulty tiers (every 2 levels gets harder)
    const tier = Math.min(Math.floor((id - 1) / 2), 20);

    // Categories: 3 → 4 → 5 → 6 → 7
    const numCats = Math.min(3 + Math.floor(tier / 3), 7);
    
    // Words per category: 3 → 4 → 5 → 6
    const wordsPerCat = Math.min(3 + Math.floor(tier / 4), 6);
    
    // Hints decrease
    const hints = Math.max(3 - Math.floor(tier / 3), 0);
    
    // Locked slots: 0 at start, then 1, then 2
    const lockedSlots = tier < 3 ? 0 : tier < 8 ? 1 : 2;
    
    // Columns = numCats + locked (categories need matching columns)
    // But also add some extra depth for difficulty
    const playableCols = numCats;
    const lockedCols = lockedSlots > 0 ? 1 : 0;
    
    // Column depths increase with difficulty
    const minDepth = Math.min(2 + Math.floor(tier / 5), 4);
    const maxDepth = Math.min(3 + Math.floor(tier / 3), 6);
    
    const columns = [];
    if (lockedCols > 0) columns.push({ locked: true });
    for (let c = 0; c < playableCols; c++) {
      // Alternate between min and max depth for variety
      const depth = c % 2 === 0 ? maxDepth : minDepth;
      columns.push({ depth });
    }

    // Pick categories ensuring variety
    const eligible = pools.filter((p) => p.words.length >= wordsPerCat);
    const picked = seededShuffle(eligible, rand).slice(0, numCats);
    const categories = picked.map((pool) => ({
      name: pool.name,
      words: seededShuffle(pool.words, rand).slice(0, wordsPerCat),
    }));

    // Total cards = word cards + category cards
    const totalCards = categories.reduce((sum, c) => sum + c.words.length, 0) + numCats;
    const colCards = columns.reduce((s, c) => c.locked ? s : s + (c.depth || 0), 0);
    const deckCards = Math.max(0, totalCards - colCards);
    
    // Moves: tight budget that gets tighter
    const buffer = Math.max(6 - Math.floor(tier / 3), 1);
    const moves = deckCards + totalCards + buffer;

    levels.push({
      id, moves, hints, undos: 0, categories,
      totalSlots: numCats + lockedSlots, lockedSlots, columns,
    });
  }
  return levels;
}
