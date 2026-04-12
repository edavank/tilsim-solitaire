const WORD_POOLS = [
  { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal', 'Çilek', 'Muz', 'Karpuz', 'Üzüm', 'Şeftali', 'Ananas', 'Nar', 'İncir'] },
  { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Tavşan', 'At', 'Kaplumbağa', 'Kurbağa', 'Aslan', 'Fil', 'Zürafa', 'Penguen'] },
  { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Turuncu', 'Mor', 'Pembe', 'Beyaz'] },
  { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme', 'Voleybol', 'Boks', 'Bisiklet', 'Koşu'] },
  { name: 'İçecekler', words: ['Çay', 'Kahve', 'Su', 'Süt', 'Limonata', 'Ayran', 'Meyve suyu', 'Smoothie'] },
  { name: 'Ağaçlar', words: ['Çam', 'Meşe', 'Kavak', 'Ceviz', 'Zeytin', 'Palmiye'] },
  { name: 'Müzik', words: ['Gitar', 'Piyano', 'Davul', 'Keman', 'Flüt', 'Saz'] },
  { name: 'Sebzeler', words: ['Domates', 'Biber', 'Havuç', 'Patates', 'Soğan', 'Patlıcan', 'Brokoli', 'Mısır'] },
  { name: 'Ülkeler', words: ['Türkiye', 'Japonya', 'Brezilya', 'İtalya', 'Fransa', 'Almanya'] },
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

export function generateLevels(startId, count) {
  const levels = [];
  for (let i = 0; i < count; i++) {
    const id = startId + i;

    // Difficulty scales with level: 0-9
    const diff = Math.min(Math.floor((id - 1) / 5), 9);

    // Categories: 3 → 6 (more categories = harder)
    const numCats = Math.min(3 + Math.floor(diff / 2), 6);
    
    // Words per category: 4 → 6 (more words = harder)
    const wordsPerCat = Math.min(4 + Math.floor(diff / 3), 6);
    
    // Moves: fewer moves = harder. Draw costs 1 move so this matters more now
    const moves = Math.max(40 - diff * 2, 20);
    
    // Hints: fewer hints = harder
    const hints = Math.max(5 - Math.floor(diff / 2), 1);
    
    // Undos: removed at higher difficulty
    const undos = diff < 4 ? 1 : 0;
    
    // Locked slots: always at least 1 (monetization + strategy)
    const lockedSlots = diff >= 6 ? 2 : 1;
    
    // Columns: always 1 locked + 4 active, depth increases with difficulty
    const baseDepth = Math.min(3 + Math.floor(diff / 2), 6);
    const columns = [
      { locked: true },
      { depth: baseDepth + 1 },
      { depth: baseDepth },
      { depth: baseDepth },
      { depth: Math.max(baseDepth - 1, 2) },
    ];

    // Pick random categories
    const eligible = WORD_POOLS.filter((p) => p.words.length >= wordsPerCat);
    const picked = pickRandom(eligible, numCats);
    const categories = picked.map((pool) => ({
      name: pool.name,
      words: pickRandom(pool.words, Math.min(wordsPerCat, pool.words.length)),
    }));

    levels.push({
      id, moves, hints, undos, categories,
      totalSlots: numCats,  // Exactly enough for all categories
      lockedSlots,          // Some start locked (must unlock via ad)
      columns,
    });
  }
  return levels;
}
