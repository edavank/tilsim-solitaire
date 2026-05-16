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
  const trPools = WORD_POOLS.tr;
  // Canonical TR index lookup — used to translate TR-named conflict groups and
  // TR-named initialBlockedCats into canonical indices.
  const trIdxByName = new Map(trPools.map((p, i) => [p.name, i]));
  const levels = [];
  let lastUsedIdx = new Set(initialBlockedCats.map((n) => trIdxByName.get(n)).filter((x) => x !== undefined));
  let prevPrevIdx = new Set();
  let prevPrevPrevIdx = new Set();

  // Conflict groups by canonical TR index — works across all 6 languages because
  // WORD_POOLS entries share index positions for the first ~20 common categories.
  // Previously this was TR-name-based and silently no-op'd in EN/DE/FR/ES/AR.
  const CONFLICT_GROUPS_TR = [
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
  const CONFLICT_GROUPS = CONFLICT_GROUPS_TR.map((g) =>
    new Set(g.map((n) => trIdxByName.get(n)).filter((x) => x !== undefined))
  );

  function getConflictIndices(canonicalIdx) {
    const conflicts = new Set();
    for (const group of CONFLICT_GROUPS) {
      if (group.has(canonicalIdx)) {
        group.forEach((c) => conflicts.add(c));
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
    const numCats = Math.min(Math.max((isBoss ? baseNumCats + 2 : baseNumCats + variation), 3), 6);
    
    // Kelime/kategori BASE (varyasyon categories map'te uygulanır)
    const wordsPerCat = Math.min((isBoss ? 4 : 3) + Math.floor(tier / 3), 6);
    
    // v1.0.6 (test sonucu sonrası): Slot deficit kaldırıldı
    // Solver 214 bölümde 3-5x recycle gerekti, bu çok zor
    // Yeni kural: slot >= numCats (her kategori için 1 slot, max 6)
    // Boss seviyelerde 1 deficit (challenge için)
    const slotDeficit = isBoss ? 1 : 0;
    const totalSlots = Math.min(Math.max(numCats - slotDeficit, 3), 6);
    // Kilitli slotlar — HER ZAMAN en az 2 açık slot kalmalı
    const rawLocked = isBoss ? 2 : (tier < 5 ? 0 : tier < 10 ? 1 : 2);
    const lockedSlots = Math.min(rawLocked, totalSlots - 2);
    
    // Sütunlar: 4-5 oynanabilir + kilitli
    const playableCols = tier < 8 ? 4 : 5;
    const lockedCols = isBoss ? 1 : (tier < 4 ? 0 : 1);
    
    // Hints: azalan (boss: 0)
    const hints = isBoss ? 0 : Math.max(3 - Math.floor(tier / 3), 0);

    // Kategori seçimi — ÖNCEKİ 3 BÖLÜM + ÇAKIŞAN KATEGORİLER ENGELLENİR
    const blocked = new Set([...lastUsedIdx, ...prevPrevIdx, ...prevPrevPrevIdx]);
    // Position-based canonical index: WORD_POOLS entries are aligned across
    // languages for the first ~20 categories (Fruits=0, Animals=1, ...). Using
    // the native-pool index as canonical lets conflict groups work everywhere.
    const allEligible = pools
      .map((p, i) => ({ ...p, _idx: i }))
      .filter((p) => p.words.length >= 3);
    const shuffled = seededShuffle(allEligible, rand);

    const picked = [];
    const usedConflicts = new Set();

    for (const pool of shuffled) {
      if (picked.length >= numCats) break;
      if (blocked.has(pool._idx)) continue;
      if (usedConflicts.has(pool._idx)) continue;
      picked.push(pool);
      const conflicts = getConflictIndices(pool._idx);
      conflicts.forEach((c) => usedConflicts.add(c));
    }
    // Yeterli bulunamadıysa kısıtlamaları gevşet
    if (picked.length < numCats) {
      for (const pool of shuffled) {
        if (picked.length >= numCats) break;
        if (picked.find((pp) => pp.name === pool.name)) continue;
        picked.push(pool);
      }
    }

    // Bu bölümün kategorilerini kaydet (sonraki bölümler için)
    prevPrevPrevIdx = new Set(prevPrevIdx);
    prevPrevIdx = new Set(lastUsedIdx);
    lastUsedIdx = new Set(picked.map((p) => p._idx).filter((x) => x !== undefined));

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
    // v1.0.6: bütçe %17 artırıldı, buffer 2 katına çıktı (testçi geri bildirimi)
    const slotRecycleOverhead = Math.max(0, numCats - totalSlots) * wordsPerCat;
    const columnMoveBudget = Math.floor(totalCards * 1.4);
    const buffer = Math.max(12 - Math.floor(tier / 5), 4);
    const moves = totalCards + columnMoveBudget + slotRecycleOverhead + buffer;

    levels.push({
      id, moves, 
      // v1.0.6: Boss'a da 1 hint + 1 undo (recycle gerekiyor, yardım lazım)
      hints: isBoss ? 1 : Math.max(hints, 1),
      undos: 1,
      categories,
      totalSlots: Math.max(totalSlots, 2), lockedSlots: Math.min(lockedSlots, totalSlots - 1),
      columns,
    });
  }
  return levels;
}
