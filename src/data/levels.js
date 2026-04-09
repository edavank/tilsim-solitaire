export const WORD_EMOJIS = {
  'Elma': '🍎', 'Armut': '🍐', 'Kiraz': '🍒', 'Portakal': '🍊',
  'Çilek': '🍓', 'Muz': '🍌', 'Karpuz': '🍉', 'Üzüm': '🍇',
  'Kedi': '🐱', 'Köpek': '🐶', 'Kuş': '🐦', 'Balık': '🐟',
  'Gül': '🌹', 'Lale': '🌷', 'Papatya': '🌼', 'Orkide': '🪻',
  'Papağan': '🦜', 'Serçe': '🐦', 'Kartal': '🦅', 'Martı': '🕊️',
  'Futbol': '⚽', 'Basketbol': '🏀', 'Tenis': '🎾', 'Yüzme': '🏊',
  'Kırmızı': '🔴', 'Mavi': '🔵', 'Yeşil': '🟢', 'Sarı': '🟡',
  'Buzlu americano': '🧊', 'Limonata': '🍋', 'Ayran': '🥛',
  'Milkshake': '🥤', 'Frappe': '☕', 'Smoothie': '🫐',
  'Banyan ağacı': '🌳', 'Çam': '🌲', 'Meşe': '🌳', 'Kavak': '🌿',
  'Orta ses': '🎵', 'Bas': '🎸', 'Tiz': '🎶', 'Alto': '🎼',
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
  {
    id: 1, moves: 55, hints: 5, undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
      { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'] },
    ],
    totalSlots: 5,
    lockedSlots: 1,
    // Tek satır sütun: 1 kilitli + 4 aktif
    columns: [
      { locked: true },
      { depth: 3 },
      { depth: 3 },
      { depth: 3 },
      { depth: 2 },
    ],
  },
  {
    id: 12, moves: 91, hints: 5, undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
      { name: 'Kuşlar', words: ['Papağan', 'Serçe', 'Kartal', 'Martı'] },
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme'] },
    ],
    totalSlots: 6,
    lockedSlots: 1,
    columns: [
      { locked: true },
      { depth: 4 },
      { depth: 4 },
      { depth: 3 },
      { depth: 3 },
    ],
  },
  {
    id: 23, moves: 128, hints: 4, undos: 0,
    categories: [
      { name: 'Soğuk içecekler', words: ['Buzlu americano', 'Limonata', 'Ayran', 'Milkshake', 'Frappe', 'Smoothie'] },
      { name: 'Ağaçlar', words: ['Banyan ağacı', 'Çam', 'Meşe', 'Kavak'] },
      { name: 'Müzik', words: ['Orta ses', 'Bas', 'Tiz', 'Alto'] },
      { name: 'Noktalama', words: ['Soru işareti', 'Ünlem', 'Virgül', 'Nokta'] },
    ],
    totalSlots: 6,
    lockedSlots: 1,
    columns: [
      { locked: true },
      { depth: 6 },
      { depth: 5 },
      { depth: 5 },
      { depth: 4 },
    ],
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

  // Tek satır sütun
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
