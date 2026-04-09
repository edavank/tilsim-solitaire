// Tılsım Solitaire — Bölüm Verileri
// KATEGORİLER sütunlarda özel kart olarak başlar, yukarı çekilince aktifleşir

export const WORD_EMOJIS = {
  'Elma': '🍎', 'Armut': '🍐', 'Kiraz': '🍒', 'Portakal': '🍊',
  'Çilek': '🍓', 'Muz': '🍌', 'Karpuz': '🍉', 'Üzüm': '🍇',
  'Kedi': '🐱', 'Köpek': '🐶', 'Kuş': '🐦', 'Balık': '🐟',
  'Tavşan': '🐰', 'At': '🐴',
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
    totalSlots: 5, lockedSlots: 1,
    tableauCols: 5, tableauRows: 1, lockedColumns: [0],
    cardsPerColumn: [3, 3, 3, 2],
  },
  {
    id: 12, moves: 91, hints: 5, undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
      { name: 'Kuşlar', words: ['Papağan', 'Serçe', 'Kartal', 'Martı'] },
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    tableauCols: 5, tableauRows: 2, lockedColumns: [0, 5],
    cardsPerColumn: [4, 4, 3, 3, 4, 4, 3, 3],
  },
  {
    id: 23, moves: 128, hints: 4, undos: 0,
    categories: [
      { name: 'Soğuk içecekler', words: ['Buzlu americano', 'Limonata', 'Ayran', 'Milkshake', 'Frappe', 'Smoothie'] },
      { name: 'Ağaçlar', words: ['Banyan ağacı', 'Çam', 'Meşe', 'Kavak'] },
      { name: 'Müzik', words: ['Orta ses', 'Bas', 'Tiz', 'Alto'] },
      { name: 'Noktalama', words: ['Soru işareti', 'Ünlem', 'Virgül', 'Nokta'] },
    ],
    totalSlots: 6, lockedSlots: 1,
    tableauCols: 5, tableauRows: 2, lockedColumns: [0, 5],
    cardsPerColumn: [6, 5, 5, 4, 6, 5, 5, 4],
  },
];

export function generateGameState(level) {
  // 1) Kelime kartları
  const wordCards = [];
  level.categories.forEach((cat, ci) => {
    cat.words.forEach((w) => {
      wordCards.push({
        id: `w-${ci}-${w}`,
        type: 'word',
        word: w,
        categoryIndex: ci,
        categoryName: cat.name,
        emoji: WORD_EMOJIS[w] || '❓',
        faceUp: false,
      });
    });
  });

  // 2) Kategori kartları (sütunlara karışacak)
  const catCards = level.categories.map((cat, ci) => ({
    id: `cat-${ci}`,
    type: 'category',
    word: cat.name,
    categoryIndex: ci,
    totalWords: cat.words.length,
    emoji: '🃏',
    faceUp: false,
  }));

  // 3) Karıştır
  const allCards = shuffle([...wordCards, ...catCards]);

  // 4) Sütunlara dağıt
  const columns = [];
  let pool = [...allCards];
  let activeIdx = 0;
  const totalCols = level.tableauCols * level.tableauRows;

  for (let i = 0; i < totalCols; i++) {
    if (level.lockedColumns.includes(i)) {
      columns.push({ locked: true, cards: [] });
      continue;
    }
    const depth = level.cardsPerColumn?.[activeIdx] || 3;
    const cards = [];
    for (let j = 0; j < depth && pool.length > 0; j++) {
      const c = { ...pool.shift() };
      c.faceUp = (j === depth - 1);
      cards.push(c);
    }
    columns.push({ locked: false, cards });
    activeIdx++;
  }

  // 5) Kalan → deste
  const deck = pool.map((c) => ({ ...c, faceUp: false }));

  // 6) Foundation slotları (üstte, boş başlar)
  const slots = [];
  for (let i = 0; i < level.totalSlots; i++) {
    slots.push({
      locked: i < level.lockedSlots,
      category: null,
      placedCards: [],
    });
  }

  return {
    levelId: level.id,
    moves: level.moves,
    hints: level.hints,
    undos: level.undos,
    deck,
    drawnCards: [],
    columns,
    slots,
    coins: 310,
    score: 0,
    isComplete: false,
    isFailed: false,
  };
}
