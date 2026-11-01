// Pure transitions: helpers must never destroy a required category or word.
function replaceCards(state, replace) {
  return {
    ...state,
    deck: state.deck.map(replace),
    drawnCards: state.drawnCards.map(replace),
    columns: state.columns.map(col => ({ ...col, cards: col.cards.map(replace) })),
  };
}

function remainingCards(state) {
  return [...state.deck, ...state.drawnCards, ...state.columns.flatMap(col => col.cards)];
}

function removeCard(state, id) {
  return {
    ...state,
    deck: state.deck.filter(c => c.id !== id),
    drawnCards: state.drawnCards.filter(c => c.id !== id),
    columns: state.columns.map(col => {
      if (!col.cards.some(c => c.id === id)) return col;
      const cards = col.cards.filter(c => c.id !== id).map(c => ({ ...c }));
      if (cards.length) cards[cards.length - 1].faceUp = true;
      return { ...col, cards };
    }),
  };
}

// The old Delete removed a word forever. Resolve that word into its own
// category instead. If there is no available target, do not charge a credit.
export function resolveDrawnWord(state, categoryCount) {
  const card = state.drawnCards[state.drawnCards.length - 1];
  if (!card || card.type !== 'word' || card.isJoker || state.isComplete || state.isFailed) return null;
  let slotIndex = state.slots.findIndex(s => !s.locked && s.category?.categoryIndex === card.categoryIndex && s.placedCards.length < s.category.totalWords);
  let next = state;
  let category;
  if (slotIndex < 0) {
    slotIndex = state.slots.findIndex(s => !s.locked && !s.category);
    if (slotIndex < 0) return null;
    category = remainingCards(state).find(c => c.type === 'category' && c.categoryIndex === card.categoryIndex);
    if (!category) return null;
    next = removeCard(next, category.id);
  } else category = state.slots[slotIndex].category;
  next = removeCard(next, card.id);
  const oldSlot = state.slots[slotIndex];
  const placedCards = [...oldSlot.placedCards, { ...card, faceUp: true }];
  const completed = placedCards.length === category.totalWords;
  const slots = state.slots.map((s, i) => i !== slotIndex ? s : completed
    ? { ...s, category: null, placedCards: [] }
    : { ...s, category: { ...category, faceUp: true }, placedCards });
  const completedCats = (state.completedCats || 0) + (completed ? 1 : 0);
  const isComplete = completedCats >= categoryCount;
  return {
    state: { ...next, slots, completedCats, isComplete, moves: state.moves - 1, isFailed: state.moves - 1 <= 0 && !isComplete, score: state.score + 10 + (completed ? 25 : 0) },
    completedCategoryName: completed ? category.word : null,
  };
}

// Joker changes the position of two real words rather than using a word from
// one category to pay another category's requirement. Counts stay conserved.
export function prepareJokerPlacement(state, joker, targetCategory, categories) {
  const source = remainingCards(state).find(c => c.id === joker.id);
  if (!source?.isJoker || source.type !== 'word') return null;
  const original = source.jokerOriginal || (() => {
    const name = categories[source.categoryIndex]?.words.find(w => source.id === `w-${source.categoryIndex}-${w}`);
    return name ? { ...source, word: name, emoji: '✨', isJoker: false } : null;
  })();
  if (!original) return null;
  const cleanOriginal = { ...original, isJoker: false };
  delete cleanOriginal.jokerOriginal;
  if (original.categoryIndex === targetCategory.categoryIndex) {
    const restored = { ...cleanOriginal, faceUp: true };
    return { state: replaceCards(state, c => c.id === joker.id ? restored : c), card: restored };
  }
  const replacement = remainingCards(state).find(c => c.type === 'word' && !c.isJoker && c.categoryIndex === targetCategory.categoryIndex);
  if (!replacement) return null;
  const card = { ...replacement, faceUp: true };
  return {
    state: replaceCards(state, c => c.id === joker.id ? card : c.id === replacement.id ? { ...cleanOriginal, faceUp: c.faceUp } : c),
    card,
  };
}
