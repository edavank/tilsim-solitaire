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
  // Bölüm 1-2: 3 kat × 3 kel = 12 kart. 3 sütun, kilitli yok
  {
    id: 1, moves: 20, hints: 3, undos: 0,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş'] },
      { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 3 }, { depth: 3 }, { depth: 2 }],
  },
  {
    id: 2, moves: 20, hints: 3, undos: 0,
    categories: [
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis'] },
      { name: 'İçecekler', words: ['Çay', 'Kahve', 'Su'] },
      { name: 'Mevsimler', words: ['İlkbahar', 'Yaz', 'Kış'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 3 }, { depth: 3 }, { depth: 3 }],
  },
  // Bölüm 3-4: 3 kat × 4 kel. 3 sütun, hala kolay
  {
    id: 3, moves: 24, hints: 2, undos: 0,
    categories: [
      { name: 'Sebzeler', words: ['Domates', 'Biber', 'Havuç', 'Patates'] },
      { name: 'Okul', words: ['Kalem', 'Defter', 'Silgi', 'Cetvel'] },
      { name: 'Duygular', words: ['Mutluluk', 'Üzüntü', 'Korku', 'Heyecan'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 4 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 4, moves: 24, hints: 2, undos: 0,
    categories: [
      { name: 'Müzik', words: ['Gitar', 'Piyano', 'Davul', 'Keman'] },
      { name: 'Giysiler', words: ['Gömlek', 'Pantolon', 'Şapka', 'Çorap'] },
      { name: 'Ağaçlar', words: ['Çam', 'Meşe', 'Kavak', 'Ceviz'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 4 }, { depth: 4 }, { depth: 3 }],
  },
  // Bölüm 5-6: 4 kat × 4 kel. 4 sütun, 1 kilitli slot
  {
    id: 5, moves: 30, hints: 2, undos: 0,
    categories: [
      { name: 'Ülkeler', words: ['Türkiye', 'Japonya', 'Brezilya', 'İtalya'] },
      { name: 'Yiyecekler', words: ['Pizza', 'Hamburger', 'Sushi', 'Makarna'] },
      { name: 'Ulaşım', words: ['Araba', 'Otobüs', 'Tren', 'Uçak'] },
      { name: 'Kuşlar', words: ['Papağan', 'Serçe', 'Kartal', 'Martı'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 3 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 6, moves: 28, hints: 2, undos: 0,
    categories: [
      { name: 'Gezegenler', words: ['Mars', 'Jüpiter', 'Satürn', 'Venüs'] },
      { name: 'Sporlar', words: ['Voleybol', 'Boks', 'Bisiklet', 'Koşu'] },
      { name: 'Kahvaltı', words: ['Peynir', 'Zeytin', 'Bal', 'Yumurta'] },
      { name: 'Çiçekler', words: ['Gül', 'Papatya', 'Lale', 'Menekşe'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 3 }, { depth: 3 }],
  },
  // Bölüm 7-8: 5 kat × 4 kel. 5 sütun + 1 kilitli
  {
    id: 7, moves: 34, hints: 1, undos: 0,
    categories: [
      { name: 'Hava durumu', words: ['Güneşli', 'Yağmurlu', 'Karlı', 'Bulutlu'] },
      { name: 'Türk Mutfağı', words: ['Kebap', 'Lahmacun', 'Pide', 'Mantı'] },
      { name: 'Duygular', words: ['Öfke', 'Heyecan', 'Mutluluk', 'Korku'] },
      { name: 'Mobilya', words: ['Masa', 'Sandalye', 'Dolap', 'Koltuk'] },
      { name: 'Tatlılar', words: ['Baklava', 'Künefe', 'Sütlaç', 'Lokum'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 8, moves: 32, hints: 1, undos: 0,
    categories: [
      { name: 'İçecekler', words: ['Limonata', 'Ayran', 'Smoothie', 'Kahve'] },
      { name: 'Deniz', words: ['Yunus', 'Köpekbalığı', 'Ahtapot', 'Yengeç'] },
      { name: 'Meyveler', words: ['Ananas', 'Nar', 'İncir', 'Şeftali'] },
      { name: 'Masal', words: ['Prenses', 'Ejderha', 'Büyücü', 'Hazine'] },
      { name: 'Baharat', words: ['Tuz', 'Kimyon', 'Kekik', 'Tarçın'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 4 }, { depth: 3 }],
  },
  // Bölüm 9-10: 5 kat × 5 kel. Daha derin sütunlar
  {
    id: 9, moves: 36, hints: 1, undos: 0,
    categories: [
      { name: 'Hayvanlar', words: ['Aslan', 'Fil', 'Zürafa', 'Penguen', 'Kedi'] },
      { name: 'Teknoloji', words: ['Telefon', 'Tablet', 'Laptop', 'Robot', 'Drone'] },
      { name: 'Doğa', words: ['Dağ', 'Orman', 'Nehir', 'Göl', 'Şelale'] },
      { name: 'Meslekler', words: ['Doktor', 'Öğretmen', 'Pilot', 'Aşçı', 'Polis'] },
      { name: 'Şehirler', words: ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 5 }, { depth: 4 }, { depth: 4 }, { depth: 4 }],
  },
  {
    id: 10, moves: 36, hints: 1, undos: 0,
    categories: [
      { name: 'Orman', words: ['Mantar', 'Yaprak', 'Sincap', 'Geyik', 'Tilki'] },
      { name: 'Oyunlar', words: ['Satranç', 'Dama', 'Tavla', 'Bilardo', 'Dart'] },
      { name: 'Market', words: ['Sepet', 'Kasa', 'Raf', 'Etiket', 'Poşet'] },
      { name: 'Simya', words: ['Altın', 'Gümüş', 'Bakır', 'Demir', 'Elmas'] },
      { name: 'Plaj', words: ['Kum', 'Dalga', 'Şemsiye', 'Kabuk', 'Palet'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 5 }, { depth: 5 }, { depth: 4 }, { depth: 4 }],
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
    coins: 500, score: 0, completedCats: 0, isComplete: false, isFailed: false,
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
