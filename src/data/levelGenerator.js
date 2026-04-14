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

export function generateLevels(startId, count, language = 'tr', initialBlockedCats = []) {
  const pools = WORD_POOLS[language] || WORD_POOLS.tr;
  const levels = [];
  let lastUsedCats = new Set(initialBlockedCats); // Önceki bölümün kategorileri
  let prevPrevCats = new Set(); // 2 önceki bölüm
  let prevPrevPrevCats = new Set(); // 3 önceki bölüm
  
  // Benzer kategoriler — aynı bölümde ASLA bir arada olamaz
  const CONFLICT_GROUPS = [
    ['Doğa', 'Orman', 'Bahçe', 'Çiçekler'],
    ['Müzik', 'Enstrüman', 'Partisyon', 'Müzik Türleri'],
    ['Deniz', 'Plaj', 'Deniz Araçları', 'Balık', 'Gemi'],
    ['Uzay', 'Uzay Araçları', 'Gezegenler', 'Astroloji'],
    ['Sporlar', 'Kış Sporları', 'Dövüş Sanatları', 'Fitness'],
    ['İçecekler', 'Meşrubat', 'Çay'],
    ['Yiyecekler', 'Tatlılar', 'Pasta', 'Kahvaltı', 'Ekmek', 'Dondurma', 'Atıştırmalık'],
    ['Giysiler', 'Kumaş'],
    ['Teknoloji', 'Bilgisayar', 'Yazılım'],
    ['Sinema', 'Film Türleri'],
    ['Tatil', 'Plaj'],
    ['Şehirler', 'İstanbul'],
    ['Renkler', 'Renk Tonları'],
    ['Hayvanlar', 'Kuşlar', 'Böcekler', 'Balık'],
    ['Mutfak', 'Türk Mutfağı'],
  ];
  
  function getConflicts(catName) {
    const conflicts = new Set();
    for (const group of CONFLICT_GROUPS) {
      if (group.includes(catName)) {
        group.forEach(c => conflicts.add(c));
      }
    }
    return conflicts;
  }
  
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const rand = seededRandom(id * 7919 + 42);
    const tier = Math.min(Math.floor((id - 1) / 2), 25);

    // === ZORLUK PROGRESYONu ===
    const isBoss = id % 10 === 0;
    
    // Kategoriler: 3-8 arası, bölüme göre değişen çeşitlilik
    const baseNumCats = 3 + Math.floor(tier / 3);
    const variation = [0, 1, -1, 2, 0, -1, 1, 0, 2, 1][id % 10]; // Her bölüm farklı
    const numCats = Math.min(Math.max((isBoss ? baseNumCats + 2 : baseNumCats + variation), 3), 8);
    
    // Kelime/kategori BASE (varyasyon categories map'te uygulanır)
    const wordsPerCat = Math.min((isBoss ? 4 : 3) + Math.floor(tier / 3), 6);
    
    // KRİTİK: Slot sayısı < kategori sayısı (zorluk burada!)
    // Boss: slot farkı daha büyük (numCats - 2 veya - 3)
    const slotDeficit = isBoss ? 3 : 1;
    const totalSlots = Math.max(Math.min(numCats - slotDeficit, 6) + Math.floor(tier / 8), 2);
    const lockedSlots = isBoss ? Math.min(2, totalSlots - 1) : (tier < 3 ? 0 : tier < 6 ? 1 : tier < 12 ? 2 : 3);
    
    // Sütunlar: 4-5 oynanabilir + kilitli
    const playableCols = tier < 8 ? 4 : 5;
    const lockedCols = isBoss ? 1 : (tier < 4 ? 0 : 1);
    
    // Hints: azalan (boss: 0)
    const hints = isBoss ? 0 : Math.max(3 - Math.floor(tier / 3), 0);

    // Kategori seçimi — ÖNCEKİ 3 BÖLÜM + ÇAKIŞAN KATEGORİLER ENGELLENİR
    const blocked = new Set([...lastUsedCats, ...prevPrevCats, ...prevPrevPrevCats]);
    const allEligible = pools.filter((p) => p.words.length >= 3);
    const shuffled = seededShuffle(allEligible, rand);
    
    const picked = [];
    const usedConflicts = new Set();
    
    for (const pool of shuffled) {
      if (picked.length >= numCats) break;
      if (blocked.has(pool.name)) continue;
      if (usedConflicts.has(pool.name)) continue;
      picked.push(pool);
      const conflicts = getConflicts(pool.name);
      conflicts.forEach(c => usedConflicts.add(c));
    }
    // Yeterli bulunamadıysa kısıtlamaları gevşet
    if (picked.length < numCats) {
      for (const pool of shuffled) {
        if (picked.length >= numCats) break;
        if (picked.find(pp => pp.name === pool.name)) continue;
        picked.push(pool);
      }
    }
    
    // Bu bölümün kategorilerini kaydet (sonraki bölümler için)
    prevPrevPrevCats = new Set(prevPrevCats);
    prevPrevCats = new Set(lastUsedCats);
    lastUsedCats = new Set(picked.map(p => p.name));

    // Kelime/kategori: BASE + varyasyon (her kategori farklı sayıda)
    const baseWords = Math.min((isBoss ? 4 : 3) + Math.floor(tier / 3), 6);
    const wordVariations = [0, 1, -1, 2, 0, 1, -1, 2, 0, 1]; // 10 elemanlı dizi

    const categories = picked.map((p, ci) => {
      const variation = wordVariations[(id + ci) % wordVariations.length];
      const wpc = Math.min(Math.max(baseWords + variation, 3), Math.min(p.words.length, 8));
      return {
        name: p.name,
        words: seededShuffle(p.words, rand).slice(0, wpc),
      };
    });

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
