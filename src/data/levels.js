import { generateLevels } from './levelGenerator';

export const WORD_EMOJIS = {
  // Meyveler
  'Elma': '🍎', 'Armut': '🍐', 'Kiraz': '🍒', 'Portakal': '🍊',
  'Çilek': '🍓', 'Muz': '🍌', 'Karpuz': '🍉', 'Üzüm': '🍇',
  'Şeftali': '🍑', 'Ananas': '🍍', 'Nar': '🫐', 'İncir': '🫐',
  // Hayvanlar
  'Kedi': '🐱', 'Köpek': '🐶', 'Kuş': '🐦', 'Balık': '🐟',
  'Tavşan': '🐰', 'At': '🐴', 'Kaplumbağa': '🐢', 'Kurbağa': '🐸',
  'Aslan': '🦁', 'Fil': '🐘', 'Zürafa': '🦒', 'Penguen': '🐧',
  // Renkler
  'Kırmızı': '🔴', 'Mavi': '🔵', 'Yeşil': '🟢', 'Sarı': '🟡',
  'Turuncu': '🟠', 'Mor': '🟣', 'Pembe': '💗', 'Beyaz': '⚪',
  // Kuşlar
  'Papağan': '🦜', 'Serçe': '🐦', 'Kartal': '🦅', 'Martı': '🕊️',
  'Baykuş': '🦉', 'Flamingo': '🦩',
  // Sporlar
  'Futbol': '⚽', 'Basketbol': '🏀', 'Tenis': '🎾', 'Yüzme': '🏊',
  'Voleybol': '🏐', 'Boks': '🥊', 'Bisiklet': '🚴', 'Koşu': '🏃',
  // İçecekler
  'Çay': '🍵', 'Kahve': '☕', 'Su': '💧', 'Süt': '🥛',
  'Limonata': '🍋', 'Ayran': '🥛', 'Meyve suyu': '🧃', 'Smoothie': '🫐',
  // Ağaçlar
  'Çam': '🌲', 'Meşe': '🌳', 'Kavak': '🌿', 'Ceviz': '🌳',
  'Zeytin': '🫒', 'Palmiye': '🌴',
  // Müzik
  'Gitar': '🎸', 'Piyano': '🎹', 'Davul': '🥁', 'Keman': '🎻',
  'Flüt': '🪈', 'Saz': '🪕',
  // Sebzeler
  'Domates': '🍅', 'Biber': '🌶️', 'Havuç': '🥕', 'Patates': '🥔',
  'Soğan': '🧅', 'Patlıcan': '🍆', 'Brokoli': '🥦', 'Mısır': '🌽',
  // Ülkeler
  'Türkiye': '🇹🇷', 'Japonya': '🇯🇵', 'Brezilya': '🇧🇷', 'İtalya': '🇮🇹',
  'Fransa': '🇫🇷', 'Almanya': '🇩🇪',
  // Gezegenler
  'Mars': '🔴', 'Jüpiter': '🟤', 'Satürn': '💫', 'Venüs': '🌟',
  'Merkür': '⚫', 'Neptün': '🔵',
  // Mevsimler
  'İlkbahar': '🌸', 'Yaz': '☀️', 'Sonbahar': '🍂', 'Kış': '❄️',
  // Duygular
  'Mutluluk': '😊', 'Üzüntü': '😢', 'Şaşkınlık': '😲', 'Korku': '😨', 'Öfke': '😡', 'Heyecan': '🤩',
  // Okul
  'Kalem': '✏️', 'Defter': '📓', 'Silgi': '🧽', 'Cetvel': '📏',
  'Kitap': '📖', 'Sırt çantası': '🎒',
  // Yiyecekler
  'Pizza': '🍕', 'Hamburger': '🍔', 'Sushi': '🍣', 'Makarna': '🍝',
  'Dondurma': '🍦', 'Kek': '🎂',
  // Hava durumu
  'Güneşli': '☀️', 'Yağmurlu': '🌧️', 'Karlı': '🌨️', 'Bulutlu': '☁️', 'Fırtınalı': '⛈️', 'Sisli': '🌫️',
  // Ulaşım
  'Araba': '🚗', 'Otobüs': '🚌', 'Tren': '🚆', 'Uçak': '✈️',
  'Gemi': '🚢', 'Bisiklet2': '🚲',
  // Giysiler
  'Gömlek': '👔', 'Pantolon': '👖', 'Şapka': '🧢', 'Ayakkabı': '👟',
  'Elbise': '👗', 'Çorap': '🧦',
  // Noktalama
  'Soru işareti': '❓', 'Ünlem': '❗', 'Virgül': '✏️', 'Nokta': '⏺️',
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const LEVELS = [
  // ── Bölüm 1-3: Kolay (3 kategori, 4 kelime) ──
  {
    id: 1, moves: 55, hints: 5, undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
      { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 3 }, { depth: 2 }],
  },
  {
    id: 2, moves: 55, hints: 5, undos: 1,
    categories: [
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme'] },
      { name: 'İçecekler', words: ['Çay', 'Kahve', 'Su', 'Süt'] },
      { name: 'Mevsimler', words: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 3 }, { depth: 2 }],
  },
  {
    id: 3, moves: 50, hints: 4, undos: 1,
    categories: [
      { name: 'Sebzeler', words: ['Domates', 'Biber', 'Havuç', 'Patates'] },
      { name: 'Okul', words: ['Kalem', 'Defter', 'Silgi', 'Cetvel'] },
      { name: 'Duygular', words: ['Mutluluk', 'Üzüntü', 'Şaşkınlık', 'Korku'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 3 }, { depth: 3 }],
  },

  // ── Bölüm 4-6: Orta (3-4 kategori, 4-5 kelime) ──
  {
    id: 4, moves: 50, hints: 4, undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Çilek', 'Muz', 'Karpuz', 'Üzüm', 'Şeftali'] },
      { name: 'Hayvanlar', words: ['Tavşan', 'At', 'Kaplumbağa', 'Kurbağa'] },
      { name: 'Müzik', words: ['Gitar', 'Piyano', 'Davul', 'Keman'] },
    ],
    totalSlots: 3, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 3 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 5, moves: 48, hints: 4, undos: 1,
    categories: [
      { name: 'Ülkeler', words: ['Türkiye', 'Japonya', 'Brezilya', 'İtalya'] },
      { name: 'Yiyecekler', words: ['Pizza', 'Hamburger', 'Sushi', 'Makarna'] },
      { name: 'Ulaşım', words: ['Araba', 'Otobüs', 'Tren', 'Uçak'] },
      { name: 'Renkler', words: ['Turuncu', 'Mor', 'Pembe', 'Beyaz'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 4 }, { depth: 4 }],
  },
  {
    id: 6, moves: 45, hints: 3, undos: 1,
    categories: [
      { name: 'Kuşlar', words: ['Papağan', 'Serçe', 'Kartal', 'Martı', 'Baykuş'] },
      { name: 'Ağaçlar', words: ['Çam', 'Meşe', 'Kavak', 'Ceviz'] },
      { name: 'Giysiler', words: ['Gömlek', 'Pantolon', 'Şapka', 'Ayakkabı'] },
    ],
    totalSlots: 3, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 3 }, { depth: 3 }],
  },

  // ── Bölüm 7-8: Zor (4 kategori, 4-5 kelime) ──
  {
    id: 7, moves: 42, hints: 3, undos: 0,
    categories: [
      { name: 'Gezegenler', words: ['Mars', 'Jüpiter', 'Satürn', 'Venüs'] },
      { name: 'Hava durumu', words: ['Güneşli', 'Yağmurlu', 'Karlı', 'Bulutlu'] },
      { name: 'Sebzeler', words: ['Soğan', 'Patlıcan', 'Brokoli', 'Mısır'] },
      { name: 'Sporlar', words: ['Voleybol', 'Boks', 'Bisiklet', 'Koşu'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 5 }, { depth: 4 }, { depth: 4 }, { depth: 4 }],
  },
  {
    id: 8, moves: 40, hints: 3, undos: 0,
    categories: [
      { name: 'Duygular', words: ['Öfke', 'Heyecan', 'Mutluluk', 'Korku', 'Üzüntü'] },
      { name: 'İçecekler', words: ['Limonata', 'Ayran', 'Meyve suyu', 'Smoothie'] },
      { name: 'Yiyecekler', words: ['Dondurma', 'Kek', 'Pizza', 'Sushi'] },
      { name: 'Meyveler', words: ['Ananas', 'Nar', 'İncir', 'Şeftali'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 5 }, { depth: 5 }, { depth: 4 }, { depth: 4 }],
  },

  // ── Bölüm 9-10: Çok Zor (4-5 kategori, 5-6 kelime) ──
  {
    id: 9, moves: 38, hints: 2, undos: 0,
    categories: [
      { name: 'Hayvanlar', words: ['Aslan', 'Fil', 'Zürafa', 'Penguen', 'Kedi'] },
      { name: 'Ağaçlar', words: ['Zeytin', 'Palmiye', 'Çam', 'Meşe', 'Kavak'] },
      { name: 'Müzik', words: ['Flüt', 'Saz', 'Gitar', 'Davul', 'Keman'] },
      { name: 'Okul', words: ['Kitap', 'Sırt çantası', 'Kalem', 'Defter'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 5 }, { depth: 5 }, { depth: 5 }, { depth: 5 }],
  },
  {
    id: 10, moves: 35, hints: 2, undos: 0,
    categories: [
      { name: 'Hava durumu', words: ['Fırtınalı', 'Sisli', 'Güneşli', 'Yağmurlu', 'Karlı', 'Bulutlu'] },
      { name: 'Giysiler', words: ['Elbise', 'Çorap', 'Gömlek', 'Şapka', 'Ayakkabı'] },
      { name: 'Ulaşım', words: ['Gemi', 'Uçak', 'Tren', 'Araba', 'Otobüs'] },
      { name: 'Gezegenler', words: ['Merkür', 'Neptün', 'Mars', 'Satürn', 'Venüs'] },
      { name: 'Kuşlar', words: ['Flamingo', 'Baykuş', 'Kartal', 'Papağan'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 6 }, { depth: 6 }, { depth: 5 }, { depth: 5 }],
  },
];

export function generateGameState(level) {
  const wordCards = [];
  level.categories.forEach((cat, ci) => {
    cat.words.forEach((w) => {
      wordCards.push({
        id: 'w-' + ci + '-' + w,
        type: 'word', word: w, categoryIndex: ci,
        categoryName: cat.name, emoji: WORD_EMOJIS[w] || '❓', faceUp: false,
      });
    });
  });

  const catCards = level.categories.map((cat, ci) => ({
    id: 'cat-' + ci,
    type: 'category', word: cat.name, categoryIndex: ci,
    totalWords: cat.words.length, emoji: '🃏', faceUp: false,
  }));

  const pool = shuffle([...wordCards, ...catCards]);
  let idx = 0;

  const columns = level.columns.map((colDef) => {
    if (colDef.locked) return { locked: true, cards: [] };
    const cards = [];
    for (let j = 0; j < colDef.depth && idx < pool.length; j++) {
      const c = { ...pool[idx++] };
      c.faceUp = (j === colDef.depth - 1);
      cards.push(c);
    }
    return { locked: false, cards };
  });

  const deck = pool.slice(idx).map((c) => ({ ...c, faceUp: false }));

  const slots = [];
  for (let i = 0; i < level.totalSlots; i++) {
    slots.push({ locked: i < level.lockedSlots, category: null, placedCards: [] });
  }

  return {
    levelId: level.id, moves: level.moves, hints: level.hints, undos: level.undos,
    deck, drawnCards: [], columns, slots,
    coins: 310, score: 0, isComplete: false, isFailed: false,
  };
}

// Auto-generate levels 11-50
const GENERATED = generateLevels(11, 40);
LEVELS.push(...GENERATED);
