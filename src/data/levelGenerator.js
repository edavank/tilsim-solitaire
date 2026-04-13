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
    
    // Sütunlar: sabit 4-5 (geçici depo alanı)
    // Referans oyundaki gibi: sınırlı alan, çok kart
    const playableCols = tier < 6 ? 4 : 5;
    const lockedCols = tier < 4 ? 0 : 1;
    
    // Hints
    const hints = Math.max(3 - Math.floor(tier / 3), 0);
    
    // Kilitli slotlar (foundation)
    const lockedSlots = tier < 3 ? 0 : tier < 8 ? 1 : 2;

    // Sütun derinlikleri: derin = çok kapalı kart
    const minDepth = Math.min(3 + Math.floor(tier / 4), 5);
    const maxDepth = Math.min(4 + Math.floor(tier / 3), 7);
    
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
    
    // Hamle bütçesi: kart sayısı + sütun taşıma payı + buffer
    // Referans oyun gibi: 150-250 hamle (çünkü sütun hamleleri de harcar)
    const columnMoveBudget = Math.floor(totalCards * 1.5); // sütun yönetimi için
    const buffer = Math.max(8 - Math.floor(tier / 3), 2);
    const moves = totalCards + columnMoveBudget + buffer;

    levels.push({
      id, moves, hints, undos: 0, categories,
      totalSlots: numCats + lockedSlots, lockedSlots, columns,
    });
  }
  return levels;
}
