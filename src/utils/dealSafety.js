export function hasInitialCategoryLock(state) {
  const columns = state.columns.filter(column => !column.locked);
  if (!columns.length || state.slots.some(slot => slot.category)) return false;
  const topCards = columns.map(column => column.cards[column.cards.length - 1]);
  return topCards.every(card => card?.type === 'word' && !card.isJoker)
    && new Set(topCards.map(card => card.categoryIndex)).size === columns.length
    && state.deck.every(card => card.type === 'word')
    && state.drawnCards.length === 0
    && state.columns.some(column => column.cards.some(card => card.type === 'category' && !card.faceUp));
}

// Preserve card identities/counts, slots, difficulty and move budget. Make a
// buried category reachable by normal play; never require an ad to start.
export function repairInitialCategoryLock(state) {
  if (!hasInitialCategoryLock(state)) return state;
  const columns = state.columns.map(column => ({ ...column, cards: column.cards.map(card => ({ ...card })) }));
  const deck = state.deck.map(card => ({ ...card }));
  const columnIndex = columns.findIndex(column => column.cards.some(card => card.type === 'category' && !card.faceUp));
  const cardIndex = columns[columnIndex].cards.findIndex(card => card.type === 'category' && !card.faceUp);
  const category = columns[columnIndex].cards[cardIndex];
  if (deck.length) {
    const index = deck.length - 1;
    columns[columnIndex].cards[cardIndex] = { ...deck[index], faceUp: false };
    deck[index] = { ...category, faceUp: false };
  } else {
    const index = columns[columnIndex].cards.length - 1;
    columns[columnIndex].cards[cardIndex] = { ...columns[columnIndex].cards[index], faceUp: false };
    columns[columnIndex].cards[index] = { ...category, faceUp: true };
  }
  return { ...state, columns, deck };
}
