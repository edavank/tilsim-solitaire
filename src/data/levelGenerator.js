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
    
    const tier = Math.min(Math.floor((id - 1) / 2), 20);

    // Kategoriler: 3 → 4 → 5 → 6 → 7
    const numCats = Math.min(3 + Math.floor(tier / 3), 7);
    
    // Kelimeler: 3 → 4 → 5 → 6
    const wordsPerCat = Math.min(3 + Math.floor(tier / 4), 6);
    
    // Sütunlar: KATEGORİDEN AZ (zorluk burada!)
    // 3 kat → 3 sütun (kolay başlangıç)
    // 4 kat → 4 sütun
    // 5 kat → 4 sütun (1 eksik = zor)
    // 6 kat → 4-5 sütun (2 eksik = çok zor)
    // 7 kat → 5 sütun (2 eksik = cehennem)
    const playableCols = numCats <= 4 ? numCats : Math.max(4, numCats - Math.floor(tier / 6) - 1);
    
    // Kilitli sütunlar
    const lockedCols = tier < 4 ? 0 : 1;
    
    // Hints
    const hints = Math.max(3 - Math.floor(tier / 3), 0);
    
    // Kilitli slotlar (kategori slotları)
    const lockedSlots = tier < 3 ? 0 : tier < 8 ? 1 : 2;

    // Sütun derinlikleri: artan zorlukla derinleşir
    const minDepth = Math.min(2 + Math.floor(tier / 5), 4);
    const maxDepth = Math.min(3 + Math.floor(tier / 3), 6);
    
    const columns = [];
    if (lockedCols > 0) columns.push({ locked: true });
    for (let c = 0; c < playableCols; c++) {
      const depth = c % 2 === 0 ? maxDepth : minDepth;
      columns.push({ depth });
    }

    const eligible = pools.filter((p) => p.words.length >= wordsPerCat);
    const picked = seededShuffle(eligible, rand).slice(0, numCats);
    const categories = picked.map((pool) => ({
      name: pool.name,
      words: seededShuffle(pool.words, rand).slice(0, wordsPerCat),
    }));

    const totalCards = categories.reduce((sum, c) => sum + c.words.length, 0) + numCats;
    const colCards = columns.reduce((s, c) => c.locked ? s : s + (c.depth || 0), 0);
    const deckCards = Math.max(0, totalCards - colCards);
    const buffer = Math.max(6 - Math.floor(tier / 3), 1);
    const moves = deckCards + totalCards + buffer;

    levels.push({
      id, moves, hints, undos: 0, categories,
      totalSlots: numCats + lockedSlots, lockedSlots, columns,
    });
  }
  return levels;
}
