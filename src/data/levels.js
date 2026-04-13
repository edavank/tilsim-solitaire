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
  // Bölüm 1: Kolay giriş
  {
    id: 1, moves: 35, hints: 3, undos: 0,
    categories: [
      { name: 'Kahvaltı', words: ['Peynir', 'Zeytin', 'Bal'] },
      { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil'] },
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 2 }, { depth: 2 }, { depth: 2 }, { depth: 2 }],
  },
  {
    id: 2, moves: 35, hints: 3, undos: 0,
    categories: [
      { name: 'Masal', words: ['Prenses', 'Ejderha', 'Hazine'] },
      { name: 'Doğa', words: ['Dağ', 'Orman', 'Nehir'] },
      { name: 'Teknoloji', words: ['Telefon', 'Tablet', 'Laptop'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 2 }, { depth: 2 }, { depth: 2 }, { depth: 2 }],
  },
  {
    id: 3, moves: 40, hints: 2, undos: 0,
    categories: [
      { name: 'Simya', words: ['Altın', 'Gümüş', 'Bakır', 'Elmas'] },
      { name: 'Oyunlar', words: ['Satranç', 'Dama', 'Tavla', 'Dart'] },
      { name: 'Tatlılar', words: ['Baklava', 'Künefe', 'Sütlaç', 'Lokum'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 3 }, { depth: 2 }, { depth: 2 }, { depth: 2 }],
  },
  {
    id: 4, moves: 40, hints: 2, undos: 0,
    categories: [
      { name: 'Deniz Araçları', words: ['Tekne', 'Yat', 'Kayık', 'Yelkenli'] },
      { name: 'Müzik Türleri', words: ['Pop', 'Rock', 'Caz', 'Rap'] },
      { name: 'Fitness', words: ['Koşu', 'Plank', 'Squat', 'Kardiyo'] },
    ],
    totalSlots: 3, lockedSlots: 0,
    columns: [{ depth: 3 }, { depth: 3 }, { depth: 2 }, { depth: 2 }],
  },
  // Bölüm 5-6: 4 kategori
  {
    id: 5, moves: 55, hints: 2, undos: 0,
    categories: [
      { name: 'Türk Mutfağı', words: ['Kebap', 'Lahmacun', 'Pide', 'Mantı'] },
      { name: 'Uzay', words: ['Ay', 'Güneş', 'Yıldız', 'Galaksi'] },
      { name: 'Kuşlar', words: ['Papağan', 'Kartal', 'Baykuş', 'Flamingo'] },
      { name: 'Hastane', words: ['Hemşire', 'İlaç', 'Ameliyat', 'Ambulans'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 2 }, { depth: 2 }],
  },
  {
    id: 6, moves: 55, hints: 2, undos: 0,
    categories: [
      { name: 'Plaj', words: ['Kum', 'Dalga', 'Şemsiye', 'Kabuk'] },
      { name: 'Gemi', words: ['Kaptan', 'Dümen', 'Çapa', 'Pusula'] },
      { name: 'Sabah', words: ['Alarm', 'Kahve', 'Duş', 'Gazete'] },
      { name: 'Trafik', words: ['Işık', 'Tabela', 'Köprü', 'Tünel'] },
    ],
    totalSlots: 5, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 3 }, { depth: 3 }, { depth: 3 }, { depth: 2 }],
  },
  // Bölüm 7-8: 5 kategori
  {
    id: 7, moves: 70, hints: 1, undos: 0,
    categories: [
      { name: 'Orman', words: ['Mantar', 'Sincap', 'Geyik', 'Kurt'] },
      { name: 'Market', words: ['Sepet', 'Kasa', 'Raf', 'Poşet'] },
      { name: 'Sinema', words: ['Film', 'Yönetmen', 'Sahne', 'Kamera'] },
      { name: 'Bina', words: ['Kapı', 'Pencere', 'Çatı', 'Balkon'] },
      { name: 'Kış Sporları', words: ['Kayak', 'Hokey', 'Snowboard', 'Kızak'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 3 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 8, moves: 70, hints: 1, undos: 0,
    categories: [
      { name: 'Süt Ürünleri', words: ['Yoğurt', 'Peynir', 'Kaymak', 'Kefir'] },
      { name: 'Partisyon', words: ['Nota', 'Akor', 'Ritim', 'Melodi'] },
      { name: 'Meslekler', words: ['Doktor', 'Pilot', 'Aşçı', 'Polis'] },
      { name: 'Deniz', words: ['Yunus', 'Ahtapot', 'Yengeç', 'İstakoz'] },
      { name: 'Baharat', words: ['Kimyon', 'Kekik', 'Tarçın', 'Safran'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 3 }, { depth: 3 }],
  },
  // Bölüm 9-10: 5 kat × 5 kel
  {
    id: 9, moves: 85, hints: 1, undos: 0,
    categories: [
      { name: 'Mobilya', words: ['Masa', 'Sandalye', 'Dolap', 'Koltuk', 'Ayna'] },
      { name: 'Şehirler', words: ['İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa'] },
      { name: 'Çiçekler', words: ['Gül', 'Papatya', 'Lale', 'Menekşe', 'Orkide'] },
      { name: 'Tatil', words: ['Plaj', 'Otel', 'Bavul', 'Pasaport', 'Harita'] },
      { name: 'Sanat', words: ['Resim', 'Heykel', 'Fırça', 'Tuval', 'Müze'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 4 }, { depth: 4 }, { depth: 3 }, { depth: 3 }],
  },
  {
    id: 10, moves: 85, hints: 1, undos: 0,
    categories: [
      { name: 'Ağırlık Birimleri', words: ['Gram', 'Kilogram', 'Ton', 'Ons', 'Libre'] },
      { name: 'Hayvanlar', words: ['Aslan', 'Fil', 'Zürafa', 'Penguen', 'Kedi'] },
      { name: 'Mutfak', words: ['Tencere', 'Tava', 'Bıçak', 'Tabak', 'Kaşık'] },
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme', 'Koşu'] },
      { name: 'Takılar', words: ['Yüzük', 'Kolye', 'Bilezik', 'Küpe', 'Saat'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    columns: [{ locked: true }, { depth: 5 }, { depth: 4 }, { depth: 4 }, { depth: 3 }],
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
