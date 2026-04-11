// Auto-generate levels 11-50 from word pools
const WORD_POOLS = [
  { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal', 'Çilek', 'Muz', 'Karpuz', 'Üzüm', 'Şeftali', 'Ananas', 'Nar', 'İncir'] },
  { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Tavşan', 'At', 'Kaplumbağa', 'Kurbağa', 'Aslan', 'Fil', 'Zürafa', 'Penguen'] },
  { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Turuncu', 'Mor', 'Pembe', 'Beyaz'] },
  { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme', 'Voleybol', 'Boks', 'Bisiklet', 'Koşu'] },
  { name: 'İçecekler', words: ['Çay', 'Kahve', 'Su', 'Süt', 'Limonata', 'Ayran', 'Meyve suyu', 'Smoothie'] },
  { name: 'Ağaçlar', words: ['Çam', 'Meşe', 'Kavak', 'Ceviz', 'Zeytin', 'Palmiye'] },
  { name: 'Müzik', words: ['Gitar', 'Piyano', 'Davul', 'Keman', 'Flüt', 'Saz'] },
  { name: 'Sebzeler', words: ['Domates', 'Biber', 'Havuç', 'Patates', 'Soğan', 'Patlıcan', 'Brokoli', 'Mısır'] },
  { name: 'Ülkeler', words: ['Türkiye', 'Japonya', 'Brezilya', 'İtalya', 'Fransa'] },
  { name: 'Gezegenler', words: ['Mars', 'Jüpiter', 'Satürn', 'Venüs', 'Merkür', 'Neptün'] },
  { name: 'Mevsimler', words: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'] },
  { name: 'Duygular', words: ['Mutluluk', 'Üzüntü', 'Şaşkınlık', 'Korku', 'Öfke', 'Heyecan'] },
  { name: 'Okul', words: ['Kalem', 'Defter', 'Silgi', 'Cetvel', 'Kitap', 'Sırt çantası'] },
  { name: 'Yiyecekler', words: ['Pizza', 'Hamburger', 'Sushi', 'Makarna', 'Dondurma', 'Kek'] },
  { name: 'Hava durumu', words: ['Güneşli', 'Yağmurlu', 'Karlı', 'Bulutlu', 'Fırtınalı', 'Sisli'] },
  { name: 'Ulaşım', words: ['Araba', 'Otobüs', 'Tren', 'Uçak', 'Gemi'] },
  { name: 'Giysiler', words: ['Gömlek', 'Pantolon', 'Şapka', 'Ayakkabı', 'Elbise', 'Çorap'] },
  { name: 'Kuşlar', words: ['Papağan', 'Serçe', 'Kartal', 'Martı', 'Baykuş', 'Flamingo'] },
];

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function pickCategories(numCats, wordsPerCat, usedPools) {
  const available = WORD_POOLS.filter((_, i) => !usedPools.has(i));
  const eligible = available.filter((p) => p.words.length >= wordsPerCat);
  const picked = pickRandom(eligible.length >= numCats ? eligible : WORD_POOLS.filter((p) => p.words.length >= wordsPerCat), numCats);
  return picked.map((pool) => ({
    name: pool.name,
    words: pickRandom(pool.words, Math.min(wordsPerCat, pool.words.length)),
  }));
}

export function generateLevels(startId, count) {
  const levels = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;
    const difficulty = Math.min(Math.floor(id / 5), 9); // 0-9

    const numCats = Math.min(3 + Math.floor(difficulty / 2), 6);
    const wordsPerCat = Math.min(4 + Math.floor(difficulty / 3), 6);
    const moves = Math.max(60 - difficulty * 3, 28);
    const hints = Math.max(5 - Math.floor(difficulty / 2), 1);
    const undos = difficulty < 4 ? 1 : 0;
    const lockedSlots = difficulty >= 2 ? Math.min(Math.floor(difficulty / 3), 2) : 0;
    const hasLockedCol = difficulty >= 3;
    const colDepths = [];

    if (hasLockedCol) colDepths.push({ locked: true });
    const activeCols = hasLockedCol ? 4 : 5;
    const baseDepth = Math.min(2 + Math.floor(difficulty / 2), 6);
    for (let c = 0; c < activeCols; c++) {
      colDepths.push({ depth: baseDepth + (c < 2 ? 1 : 0) });
    }

    const categories = pickCategories(numCats, wordsPerCat, new Set());

    levels.push({
      id,
      moves,
      hints,
      undos,
      categories,
      totalSlots: numCats + 1 + lockedSlots,
      lockedSlots,
      columns: colDepths,
    });
  }
  return levels;
}
