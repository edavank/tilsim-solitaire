// Compute once before persistence; never draw random numbers inside a state updater.
export function shuffleBoard(state, random = Math.random) {
  const cards = [...state.columns.filter(c=>!c.locked).flatMap(c=>c.cards),...state.drawnCards].map(c=>({...c}));
  if (!cards.length || state.isComplete) return null;
  for (let i=cards.length-1;i>0;i--) {
    const j=Math.floor(random()*(i+1));
    [cards[i],cards[j]]=[cards[j],cards[i]];
  }
  let offset=0;
  const columns=state.columns.map(col=>{
    if (col.locked) return col;
    const next=cards.slice(offset,offset+col.cards.length).map((c,i)=>({...c,faceUp:i===col.cards.length-1}));
    offset+=col.cards.length;
    return {...col,cards:next};
  });
  return {...state,columns,drawnCards:cards.slice(offset).map(c=>({...c,faceUp:true}))};
}
