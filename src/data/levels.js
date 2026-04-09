// Tılsım Solitaire — Bölüm Verileri

export const LEVELS = [
  {
    id: 1,
    moves: 55,
    hints: 5,
    undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
      { name: 'Renkler', words: ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı'] },
    ],
    rows: 2,
    colsPerRow: 3,
    lockedColumns: [0],
    lockedCategories: [],
  },
  {
    id: 2,
    moves: 50,
    hints: 5,
    undos: 1,
    categories: [
      { name: 'Çiçekler', words: ['Gül', 'Lale', 'Papatya', 'Orkide'] },
      { name: 'Kuşlar', words: ['Serçe', 'Papağan', 'Kartal', 'Martı'] },
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme'] },
    ],
    rows: 2,
    colsPerRow: 3,
    lockedColumns: [0],
    lockedCategories: [],
  },
  // Bölüm 12 — demo level (Stitch tasarımındaki)
  {
    id: 12,
    moves: 91,
    hints: 5,
    undos: 1,
    categories: [
      { name: 'Meyveler', words: ['Elma', 'Armut', 'Kiraz', 'Portakal'] },
      { name: 'Hayvanlar', words: ['Kedi', 'Köpek', 'Kuş', 'Balık'] },
      { name: 'Kuşlar', words: ['Papağan', 'Serçe', 'Kartal', 'Martı'] },
      { name: 'Sporlar', words: ['Futbol', 'Basketbol', 'Tenis', 'Yüzme'] },
    ],
    rows: 2,
    colsPerRow: 4, // 1 locked + 3-4 active per row
    lockedColumns: [0, 5],
    lockedCategories: [],
  },
];

// SVG emojileri olmadığı için basit emoji mapping
export const WORD_EMOJIS = {
  // Meyveler
  'Elma': '🍎', 'Armut': '🍐', 'Kiraz': '🍒', 'Portakal': '🍊',
  'Çilek': '🍓', 'Muz': '🍌', 'Karpuz': '🍉', 'Üzüm': '🍇',
  // Hayvanlar
  'Kedi': '🐱', 'Köpek': '🐶', 'Kuş': '🐦', 'Balık': '🐟',
  // Çiçekler
  'Gül': '🌹', 'Lale': '🌷', 'Papatya': '🌼', 'Orkide': '🪻',
  'Ayçiçeği': '🌻',
  // Kuşlar
  'Papağan': '🦜', 'Serçe': '🐦', 'Kartal': '🦅', 'Martı': '🕊️',
  // Sporlar
  'Futbol': '⚽', 'Basketbol': '🏀', 'Tenis': '🎾', 'Yüzme': '🏊',
  // Renkler
  'Kırmızı': '🔴', 'Mavi': '🔵', 'Yeşil': '🟢', 'Sarı': '🟡',
};

// Bölüm verisinden oyun state'i oluştur
export function generateGameState(level) {
  const allWords = [];

  // Tüm kelimeleri kategorileriyle birlikte topla
  level.categories.forEach((cat, catIndex) => {
    cat.words.forEach((word) => {
      allWords.push({
        id: `${catIndex}-${word}`,
        word,
        categoryIndex: catIndex,
        categoryName: cat.name,
        emoji: WORD_EMOJIS[word] || '❓',
      });
    });
  });

  // Karıştır
  const shuffled = [...allWords].sort(() => Math.random() - 0.5);

  // Deste ve sütunlara dağıt
  // Toplam kart sayısı
  const totalCards = shuffled.length;
  // Sütun sayısı (kilitli sütunlar dahil)
  const totalColumns = level.rows * level.colsPerRow;
  const activeColumns = totalColumns - level.lockedColumns.length;

  // Her sütuna kaç kart? Yaklaşık yarısını sütunlara, kalanı desteye
  const cardsInColumns = Math.min(Math.floor(totalCards * 0.6), activeColumns * 4);
  const cardsInDeck = totalCards - cardsInColumns;

  // Sütunlara dağıt
  const columns = [];
  let cardIdx = 0;

  for (let i = 0; i < totalColumns; i++) {
    if (level.lockedColumns.includes(i)) {
      columns.push({ locked: true, cards: [] });
      continue;
    }

    const colCardCount = Math.ceil(cardsInColumns / activeColumns);
    const colCards = [];
    for (let j = 0; j < colCardCount && cardIdx < cardsInColumns; j++) {
      colCards.push({
        ...shuffled[cardIdx],
        faceUp: j === colCardCount - 1, // sadece en alttaki açık
      });
      cardIdx++;
    }
    columns.push({ locked: false, cards: colCards });
  }

  // Deste
  const deck = shuffled.slice(cardsInColumns).map((card) => ({
    ...card,
    faceUp: false,
  }));

  // Kategoriler
  const categories = level.categories.map((cat, i) => ({
    name: cat.name,
    totalWords: cat.words.length,
    placedCards: [],
    locked: level.lockedCategories.includes(i),
    colorIndex: i,
  }));

  return {
    levelId: level.id,
    moves: level.moves,
    maxMoves: level.moves,
    hints: level.hints,
    undos: level.undos,
    deck,
    drawnCards: [],
    columns,
    categories,
    coins: 226,
    score: 0,
    isComplete: false,
    isFailed: false,
  };
}
