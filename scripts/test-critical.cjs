const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const strip = s => s.replace(/^import .*$/gm, '').replace(/^export \{.*$/gm, '').replace(/export /g, '');
const safety = vm.runInNewContext(strip(read('src/utils/cardSafety.js')) + '\n;({resolveDrawnWord,prepareJokerPlacement})');
const word = (i, name) => ({id:`w-${i}-${name}`,word:name,type:'word',categoryIndex:i,faceUp:true,emoji:'x'});
const category = (i,n=1) => ({id:`cat-${i}`,word:`Cat${i}`,type:'category',categoryIndex:i,totalWords:n});
const board = () => ({deck:[],drawnCards:[],columns:[],slots:[{locked:false,category:null,placedCards:[]}],moves:10,score:0,completedCats:0});
const ids = s => [...s.deck,...s.drawnCards,...s.columns.flatMap(c=>c.cards),...s.slots.flatMap(c=>[...(c.category?[c.category]:[]),...c.placedCards])].map(c=>c.id).sort().join(',');

test('Delete resolves the last word and wins on the last move without failure',()=>{
  const s={...board(),moves:1,deck:[category(0)],drawnCards:[word(0,'Elma')]};
  const before=JSON.stringify(s);const r=safety.resolveDrawnWord(s,1);
  assert(r.state.isComplete);assert.equal(r.state.isFailed,false);assert.equal(r.state.completedCats,1);assert.equal(r.state.drawnCards.length,0);assert.equal(r.state.deck.length,0);assert.equal(JSON.stringify(s),before);
});
test('Delete never removes category/Joker cards or charges an unavailable target',()=>{
  assert.equal(safety.resolveDrawnWord({...board(),drawnCards:[category(0)]},1),null);
  assert.equal(safety.resolveDrawnWord({...board(),drawnCards:[{...word(0,'Elma'),isJoker:true}]},1),null);
  assert.equal(safety.resolveDrawnWord({...board(),slots:[{locked:true,category:null,placedCards:[]}],deck:[category(0)],drawnCards:[word(0,'Elma')]},1),null);
});
test('Delete preserves all cards until a category completes and reveals source column',()=>{
  const s={...board(),columns:[{cards:[{...word(1,'Armut'),faceUp:false},category(0,2)],locked:false}],drawnCards:[word(0,'Elma')]};
  const r=safety.resolveDrawnWord(s,2);assert.equal(ids(r.state),ids(s));assert.equal(r.state.slots[0].placedCards.length,1);assert.equal(r.state.columns[0].cards[0].faceUp,true);
});
test('Joker swaps real words and preserves IDs, source-category word and hidden visibility',()=>{
  const original=word(0,'Elma');const joker={...original,isJoker:true,word:'',jokerOriginal:original};
  const replacement={...word(1,'Armut'),faceUp:false};const s={...board(),drawnCards:[joker],deck:[replacement]};
  const before=JSON.stringify(s);const r=safety.prepareJokerPlacement(s,joker,category(1),[{words:['Elma']},{words:['Armut']}]);
  assert.equal(ids(r.state),ids(s));assert.equal(r.card.word,'Armut');assert.equal(r.card.isJoker,undefined);assert.equal(r.state.deck[0].word,'Elma');assert.equal(r.state.deck[0].faceUp,false);assert.equal(JSON.stringify(s),before);
});
test('Old saved Jokers recover original words; unavailable replacements leave state intact',()=>{
  const joker={...word(0,'Elma'),word:'',isJoker:true};const s={...board(),drawnCards:[joker]};
  assert.equal(safety.prepareJokerPlacement(s,joker,category(1),[{words:['Elma']}]),null);
  assert.equal(safety.prepareJokerPlacement(s,joker,category(0),[{words:['Elma']}]).card.word,'Elma');
});
function services() {
  const memory={};const failures=new Set();
  const asyncStore={getItem:async k=>memory[k]??null,setItem:async(k,v)=>{if(failures.has(k))throw new Error('disk full');memory[k]=v;},removeItem:async k=>{delete memory[k];}};
  const storage=vm.runInNewContext(strip(read('src/utils/storage.js'))+'\n;({loadProgress,updateProgress,saveSavedGame,clearSavedGame,loadSavedGame})',{require:()=>({default:asyncStore})});
  const achievements=vm.runInNewContext(strip(read('src/utils/achievements.js'))+'\n;({checkAchievements,claimAchievement,claimAchievements,loadAchievements})',{require:()=>({default:asyncStore}),updateProgress:storage.updateProgress,console:{warn:()=>{}}});
  return {memory,failures,storage,achievements};
}
test('Concurrent popup/page claims pay each achievement exactly once',async()=>{
  const {storage:s,achievements:a}=services();await a.checkAchievements({totalWins:1});
  const results=await Promise.all([a.claimAchievement('first_win'),a.claimAchievements(['first_win','first_win']),s.updateProgress(p=>({coins:p.coins+15}))]);
  assert.equal((await s.loadProgress()).coins,535);assert.equal(results[0].reward+results[1].reward,20);assert.equal((await a.loadAchievements()).first_win.claimed,true);
});
test('Interrupted secondary claim flag write is repaired without a second payment',async()=>{
  const {storage:s,achievements:a,failures}=services();await a.checkAchievements({totalWins:1});failures.add('@tilsim_achievements');
  assert.equal((await a.claimAchievement('first_win')).reward,20);failures.clear();
  assert.equal((await a.claimAchievement('first_win')).reward,0);assert.equal((await s.loadProgress()).coins,520);assert.equal((await a.loadAchievements()).first_win.claimed,true);
});
test('Failed payment persistence never marks an achievement paid',async()=>{
  const {storage:s,achievements:a,failures}=services();await a.checkAchievements({totalWins:1});failures.add('@tilsim_progress');
  await assert.rejects(a.claimAchievement('first_win'),/disk full/);assert.equal((await a.loadAchievements()).first_win.claimed,false);assert.equal((await s.loadProgress()).coins,500);
});
test('Saved game writes and clearing are serialized',async()=>{
  const {storage:s}=services();await Promise.all([s.saveSavedGame({moves:10}),s.saveSavedGame({moves:8}),s.clearSavedGame()]);assert.equal(await s.loadSavedGame(),null);
});
test('Autosave flush uses the latest move, preserves mode/time, and cannot resurrect an exited game',async()=>{
  const game=read('app/game.js');const start=game.indexOf('  latestSaveRef.current = saveReady');const end=game.indexOf('\n  useEffect(() => { if (feedback.msg)',start);
  const writes=[],effects=[],timers=[];
  const box={saveReady:true,gs:{moves:10,isComplete:false,isFailed:false},isDaily:false,levelId:27,gameLang:'tr',isTimed:true,timeRemaining:42,latestSaveRef:{current:null},skipSaveRef:{current:false},saveTimerRef:{current:null},saveSavedGame:async s=>writes.push(s),useCallback:f=>f,useEffect:f=>effects.push(f),AppState:{addEventListener:()=>({remove:()=>{}})},setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:()=>{},console};
  const source='(()=>{'+game.slice(start,end)+'\nreturn flushGameSave;})()';
  vm.runInNewContext(source,box);box.gs={...box.gs,moves:8};box.timeRemaining=39;
  const flush=vm.runInNewContext(source,box);effects[0]();timers[0]();await Promise.resolve();
  assert.equal(writes[0].moves,8);assert.equal(writes[0].gameMode,'timed');assert.equal(writes[0].timeRemaining,39);
  box.skipSaveRef.current=true;await flush();assert.equal(writes.length,1);
  box.skipSaveRef.current=false;box.saveReady=false;vm.runInNewContext(source,box);await flush();assert.equal(writes.length,1);
});
