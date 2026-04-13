import { WORD_POOLS } from './wordPools';

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

export function generateLevels(startId, count, language = 'tr') {
  const pools = WORD_POOLS[language] || WORD_POOLS.tr;
  const levels = [];
  let lastUsedCats = new Set(); // Önceki bölümün kategorileri — tekrar engeli
  
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const rand = seededRandom(id * 7919 + 42);
    const tier = Math.min(Math.floor((id - 1) / 2), 25);

    // === ZORLUK PROGRESYONu ===
    
    // Kategoriler: 3 → 4 → 5 → 6 → 7 → 8
    const numCats = Math.min(3 + Math.floor(tier / 2), 8);
    
    // Kelime/kategori: 3 → 4 → 5 → 6 → 7 → 8
    const wordsPerCat = Math.min(3 + Math.floor(tier / 3), 8);
    
    // KRİTİK: Slot sayısı < kategori sayısı (zorluk burada!)
    // Slotlar sınırlı → strateji gerekli → beyin çalışır
    const totalSlots = Math.min(numCats - 1, 6) + Math.floor(tier / 8);
    const lockedSlots = tier < 3 ? 0 : tier < 6 ? 1 : tier < 12 ? 2 : 3;
    
    // Sütunlar: 4-5 oynanabilir + kilitli
    const playableCols = tier < 8 ? 4 : 5;
    const lockedCols = tier < 4 ? 0 : 1;
    
    // Hints: azalan
    const hints = Math.max(3 - Math.floor(tier / 3), 0);

    // Kategori seçimi — ÖNCEKİ BÖLÜMLE AYNI KATEGORİ OLMAMALI
    const eligible = pools.filter((p) => p.words.length >= wordsPerCat && !lastUsedCats.has(p.name));
    // Yeterli kategori yoksa kısıtlamayı gevşet
    const pool = eligible.length >= numCats ? eligible : pools.filter((p) => p.words.length >= wordsPerCat);
    const picked = seededShuffle(pool, rand).slice(0, numCats);
    
    // Bu bölümün kategorilerini kaydet (sonraki bölüm için)
    lastUsedCats = new Set(picked.map(p => p.name));

    const categories = picked.map((p) => ({
      name: p.name,
      words: seededShuffle(p.words, rand).slice(0, wordsPerCat),
    }));

    const totalCards = categories.reduce((sum, c) => sum + c.words.length, 0) + numCats;

    // Sütun derinlikleri
    const minDepth = Math.min(2 + Math.floor(tier / 6), 4);
    const maxDepth = Math.min(3 + Math.floor(tier / 4), 6);
    
    const columns = [];
    if (lockedCols > 0) columns.push({ locked: true });
    for (let c = 0; c < playableCols; c++) {
      const depth = c % 2 === 0 ? maxDepth : minDepth;
      columns.push({ depth });
    }

    // Sütun kapasitesini kontrol — max %55 sütunlarda (zor: daha az)
    const totalColCapacity = columns.reduce((s, c) => s + (c.depth || 0), 0);
    const maxInCols = Math.floor(totalCards * 0.55);
    if (totalColCapacity > maxInCols) {
      let excess = totalColCapacity - maxInCols;
      for (let c = columns.length - 1; c >= 0 && excess > 0; c--) {
        if (columns[c].depth && columns[c].depth > 2) {
          const reduce = Math.min(columns[c].depth - 2, excess);
          columns[c] = { depth: columns[c].depth - reduce };
          excess -= reduce;
        }
      }
    }

    // Hamle bütçesi: kategori > slot olduğu için daha fazla hamle gerekli
    // Ama çok fazla vermemeliyiz — sıkı ama adil
    const slotRecycleOverhead = Math.max(0, numCats - totalSlots) * wordsPerCat;
    const columnMoveBudget = Math.floor(totalCards * 1.2);
    const buffer = Math.max(6 - Math.floor(tier / 4), 1);
    const moves = totalCards + columnMoveBudget + slotRecycleOverhead + buffer;

    levels.push({
      id, moves, hints, undos: 0, categories,
      totalSlots: Math.max(totalSlots, 2), lockedSlots: Math.min(lockedSlots, totalSlots - 1),
      columns,
    });
  }
  return levels;
}
