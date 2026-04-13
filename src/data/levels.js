import { generateLevels } from './levelGenerator';
import { EMOJI_MAP as WORD_EMOJIS, CATEGORY_EMOJIS } from './wordPools';

export { WORD_EMOJIS, CATEGORY_EMOJIS };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const LEVELS = [
  // Bölüm 1-3: 3 kat × 4 kel = 15 kart. Kısa sütunlar, deste büyük
  {
    id: 1, moves: 25, hints: 3, undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
      { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'] },
    ],
    totalSlots: 3, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 2 }, { depth: 2 }],
  },
  {
    id: 2, moves: 24, hints: 3, undos: 1,
    categories: [
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme'] },
      { name: 'İçecekler', words: ['Çay', 'Kahve', 'Su', 'Süt'] },
      { name: 'Mevsimler', words: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'] },
    ],
    totalSlots: 3, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 3 }, { depth: 2 }],
  },
  {
    id: 3, moves: 24, hints: 2, undos: 1,
    categories: [
      { name: 'Sebzeler', words: ['Domates', 'Biber', 'Havuç', 'Patates'] },
      { name: 'Okul', words: ['Kalem', 'Defter', 'Silgi', 'Cetvel'] },
      { name: 'Duygular', words: ['Mutluluk', 'Üzüntü', 'Şaşkınlık', 'Korku'] },
    ],
    totalSlots: 3, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 3 }, { depth: 3 }],
  },
  // Bölüm 4-6: 4 kat. Sütun max 4, fazlası desteye
  {
    id: 4, moves: 32, hints: 2, undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Çilek', 'Muz', 'Karpuz', 'Üzüm', 'Şeftali'] },
      { name: 'Hayvanlar', words: ['Tavşan', 'At', 'Kaplumbağa', 'Kurbağa'] },
      { name: 'Müzik', words: ['Gitar', 'Piyano', 'Davul', 'Keman'] },
      { name: 'Renkler', words: ['Turuncu', 'Mor', 'Pembe', 'Beyaz'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 3 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 5, moves: 30, hints: 2, undos: 1,
    categories: [
      { name: 'Ülkeler', words: ['Türkiye', 'Japonya', 'Brezilya', 'İtalya'] },
      { name: 'Yiyecekler', words: ['Pizza', 'Hamburger', 'Sushi', 'Makarna'] },
      { name: 'Ulaşım', words: ['Araba', 'Otobüs', 'Tren', 'Uçak'] },
      { name: 'Kuşlar', words: ['Papağan', 'Serçe', 'Kartal', 'Martı'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 6, moves: 30, hints: 2, undos: 0,
    categories: [
      { name: 'Ağaçlar', words: ['Çam', 'Meşe', 'Kavak', 'Ceviz', 'Zeytin'] },
      { name: 'Giysiler', words: ['Gömlek', 'Pantolon', 'Şapka', 'Ayakkabı'] },
      { name: 'Gezegenler', words: ['Mars', 'Jüpiter', 'Satürn', 'Venüs'] },
      { name: 'Sporlar', words: ['Voleybol', 'Boks', 'Bisiklet', 'Koşu'] },
    ],
    totalSlots: 4, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 3 }, { depth: 3 }],
  },
  // Bölüm 7-8: 5 kat. Sütun max 4, bol deste
  {
    id: 7, moves: 36, hints: 2, undos: 0,
    categories: [
      { name: 'Hava durumu', words: ['Güneşli', 'Yağmurlu', 'Karlı', 'Bulutlu', 'Fırtınalı'] },
      { name: 'Sebzeler', words: ['Soğan', 'Patlıcan', 'Brokoli', 'Mısır'] },
      { name: 'Duygular', words: ['Öfke', 'Heyecan', 'Mutluluk', 'Korku'] },
      { name: 'Müzik', words: ['Flüt', 'Saz', 'Gitar', 'Davul'] },
      { name: 'Mevsimler', words: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 4 }, { depth: 4 }],
  },
  {
    id: 8, moves: 34, hints: 1, undos: 0,
    categories: [
      { name: 'İçecekler', words: ['Limonata', 'Ayran', 'Meyve suyu', 'Smoothie'] },
      { name: 'Yiyecekler', words: ['Dondurma', 'Kek', 'Pizza', 'Sushi'] },
      { name: 'Meyveler', words: ['Ananas', 'Nar', 'İncir', 'Şeftali'] },
      { name: 'Okul', words: ['Kitap', 'Sırt çantası', 'Kalem', 'Defter'] },
      { name: 'Kuşlar', words: ['Baykuş', 'Flamingo', 'Kartal', 'Martı'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 4 }, { depth: 4 }],
  },
  // Bölüm 9-10: 5 kat × 4-5 kel. Deste ağırlıklı
  {
    id: 9, moves: 34, hints: 1, undos: 0,
    categories: [
      { name: 'Hayvanlar', words: ['Aslan', 'Fil', 'Zürafa', 'Penguen', 'Kedi'] },
      { name: 'Ağaçlar', words: ['Palmiye', 'Çam', 'Meşe', 'Kavak', 'Ceviz'] },
      { name: 'Giysiler', words: ['Elbise', 'Çorap', 'Gömlek', 'Şapka'] },
      { name: 'Ulaşım', words: ['Gemi', 'Uçak', 'Tren', 'Araba'] },
      { name: 'Gezegenler', words: ['Merkür', 'Neptün', 'Mars', 'Venüs'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 4 }, { depth: 4 }],
  },
  {
    id: 10, moves: 34, hints: 1, undos: 0,
    categories: [
      { name: 'Hava durumu', words: ['Sisli', 'Güneşli', 'Yağmurlu', 'Karlı', 'Bulutlu'] },
      { name: 'Duygular', words: ['Şaşkınlık', 'Korku', 'Öfke', 'Heyecan', 'Üzüntü'] },
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme', 'Koşu'] },
      { name: 'Mevsimler', words: ['İlkbahar', 'Yaz', 'Sonbahar', 'Kış'] },
      { name: 'Sebzeler', words: ['Domates', 'Biber', 'Havuç', 'Patates', 'Soğan'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 5 }, { depth: 4 }, { depth: 4 }, { depth: 4 }],
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
    totalWords: cat.words.length, emoji: CATEGORY_EMOJIS[cat.name] || '📂', faceUp: false,
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
    coins: 50, score: 0, completedCats: 0, isComplete: false, isFailed: false,
  };
}

// Auto-generate levels 11+ for Turkish (default)
const GENERATED_TR = generateLevels(11, 190, 'tr');
LEVELS.push(...GENERATED_TR);

// Language-aware level cache
const langCache = {};

export function getLevel(id, language = 'tr') {
  if (language === 'tr') return LEVELS.find((l) => l.id === id) || generateLevels(id, 1, 'tr')[0];
  const key = language;
  if (!langCache[key]) {
    langCache[key] = generateLevels(1, 200, language);
  }
  return langCache[key].find((l) => l.id === id) || generateLevels(id, 1, language)[0];
}

export function getTotalLevels(language = 'tr') {
  if (language === 'tr') return LEVELS.length;
  return 200;
}
