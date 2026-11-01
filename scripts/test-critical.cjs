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
  const storage=vm.runInNewContext(strip(read('src/utils/storage.js'))+'\n;({loadProgress,updateProgress,saveSavedGame,clearSavedGame,loadSavedGame,loadLevelStars,loadXP})',{require:()=>({default:asyncStore})});
  const achievements=vm.runInNewContext(strip(read('src/utils/achievements.js'))+'\n;({checkAchievements,claimAchievement,claimAchievements,loadAchievements})',{require:()=>({default:asyncStore}),updateProgress:storage.updateProgress,console:{warn:()=>{}}});
  return {memory,failures,storage,achievements,asyncStore};
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
  const box={setFeedback:()=>{},t:{},saveReady:true,gs:{moves:10,isComplete:false,isFailed:false},isDaily:false,levelId:27,gameLang:'tr',isTimed:true,timeRemaining:42,elapsedTime:20,latestSaveRef:{current:null},skipSaveRef:{current:false},saveTimerRef:{current:null},saveSavedGame:async s=>writes.push(s),useCallback:f=>f,useEffect:f=>effects.push(f),AppState:{addEventListener:()=>({remove:()=>{}})},setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:()=>{},console};
  const source='(()=>{'+game.slice(start,end)+'\nreturn flushGameSave;})()';
  vm.runInNewContext(source,box);box.gs={...box.gs,moves:8};box.timeRemaining=39;
  const flush=vm.runInNewContext(source,box);effects[0]();timers[0]();await Promise.resolve();
  assert.equal(writes[0].moves,8);assert.equal(writes[0].gameMode,'timed');assert.equal(writes[0].timeRemaining,39);
  box.skipSaveRef.current=true;await flush();assert.equal(writes.length,1);
  box.skipSaveRef.current=false;box.saveReady=false;vm.runInNewContext(source,box);await flush();assert.equal(writes.length,1);
});

function completionService(storage) {
  return vm.runInNewContext(strip(read('src/utils/completion.js'))+'\n;({settleCompletion,calculateCompletion})',storage);
}
const finish = (runId='run-one',extra={}) => ({game:{runId,isComplete:true,moves:8,score:100,...extra},level:{id:1,moves:10},elapsedTime:100});
test('One completion transaction pays displayed coins, XP, stars and unlock gifts exactly once',async()=>{
  const {storage:s}=services();const c=completionService(s);
  const results=await Promise.all([c.settleCompletion(finish()),c.settleCompletion(finish()),c.settleCompletion(finish())]);
  const p=await s.loadProgress();assert.equal(p.coins,546);assert.equal(p.totalWins,1);assert.equal(p.currentLevel,2);assert.equal(p.xp,150);assert.equal(p.levelStars[1],3);assert.equal(p.toolCredits.hint,3);
  assert.equal(results.filter(r=>r.firstSettlement).length,1);assert.equal(results[0].receipt.coins,c.calculateCompletion(finish()).coins);
});
test('A finished run survives reload and Retry/Home cannot pay it again',async()=>{
  const {storage:s,memory}=services();const c=completionService(s);await c.settleCompletion(finish());
  const persisted=JSON.parse(memory['@tilsim_progress']);assert(persisted.completionReceipts['run:run-one']);
  const r=await c.settleCompletion(finish());assert.equal(r.firstSettlement,false);assert.equal((await s.loadProgress()).coins,546);
});
test('Daily replay on another run and legacy daily completion do not pay twice',async()=>{
  const {storage:s}=services();const c=completionService(s);const input={...finish(),mode:'daily',date:'2026-11-01'};
  await c.settleCompletion(input);const first=(await s.loadProgress()).coins;
  const replay=await c.settleCompletion({...input,game:{...input.game,runId:'another-run'}});assert.equal(replay.receipt.coins,0);assert.equal((await s.loadProgress()).coins,first);
  const old=await c.settleCompletion({...input,date:'2026-10-31',dailyAlreadyCompleted:true});assert.equal(old.receipt.coins,0);assert.equal((await s.loadProgress()).coins,first);
});
test('Bonus moves cannot inflate stars and timed mode uses time rather than 9999 moves',()=>{
  const c=completionService({});const normal=c.calculateCompletion(finish('run',{moves:21,extraMovesGranted:20}));assert.equal(normal.stars,1);assert.equal(normal.moveBonus,0);
  const timed=c.calculateCompletion({...finish('run',{moves:9999}),mode:'timed',elapsedTime:160,timeLimit:180});assert.equal(timed.stars,1);
});
test('Completion disk failure leaves all rewards and unlocks unpaid until retry',async()=>{
  const {storage:s,failures}=services();const c=completionService(s);failures.add('@tilsim_progress');await assert.rejects(c.settleCompletion(finish()),/disk full/);
  assert.equal((await s.loadProgress()).coins,500);failures.clear();await c.settleCompletion(finish());assert.equal((await s.loadProgress()).coins,546);
});

const cloud=vm.runInNewContext(strip(read('src/utils/cloudSync.js'))+'\n;({mergeProgress,createCloudSync})');
const baseProgress=()=>({coins:500,xp:0,totalGames:0,totalWins:0,currentLevel:1,bestScore:0,streak:0,toolCredits:{},unlockedTools:[],completionReceipts:{},achievementPayouts:{}});
test('Cloud merge combines independent spending; it never restores the higher old balance',()=>{
  const b=baseProgress();const m=cloud.mergeProgress(b,{...b,coins:450,streak:0},{...b,coins:400,streak:5,currentLevel:20});assert.equal(m.coins,350);assert.equal(m.currentLevel,20);
  assert.throws(()=>cloud.mergeProgress(b,{...b,coins:0},{...b,coins:0}),e=>e.code==='BALANCE_CONFLICT');
});
test('Cloud merge does not pay shared completion/achievement receipts or unlock gifts twice',()=>{
  const b=baseProgress();const p={...b,coins:566,xp:150,totalGames:1,totalWins:1,toolCredits:{hint:3},unlockedTools:['hint'],completionReceipts:{r:{coins:46,xp:150}},achievementPayouts:{first_win:{coins:20}}};
  const m=cloud.mergeProgress(b,p,p);assert.equal(m.coins,566);assert.equal(m.xp,150);assert.equal(m.totalWins,1);assert.equal(m.toolCredits.hint,3);
});
function cloudFixture({local=baseProgress(),remote=baseProgress(),journal}={}) {
  let account='a',revision=remote?1:0,state=remote,record=journal,request=0;
  const receipts=new Map();const hooks={};
  const deps={getAccountId:()=>account,readJournal:async()=>record,writeJournal:async(_,j)=>{if(hooks.journal)await hooks.journal(j);record=JSON.parse(JSON.stringify(j));},loadLocal:async()=>local,applyLocal:async fn=>{local=fn(local);return local;},createRequestId:()=>`request-${++request}-unique`,readRemote:async()=>({revision,state}),commitRemote:async(_,id,expected,next)=>{
    if(receipts.has(id))return receipts.get(id);
    if(hooks.beforeCommit)await hooks.beforeCommit();
    if(expected!==revision)throw Object.assign(new Error('conflict'),{code:'SYNC_CONFLICT'});
    state=JSON.parse(JSON.stringify(next));revision++;const accepted={revision,state};receipts.set(id,accepted);if(hooks.afterCommit)await hooks.afterCommit();return accepted;
  }};
  return {sync:cloud.createCloudSync(deps),hooks,receipts,getLocal:()=>local,setLocal:p=>{local=p},getRemote:()=>state,getJournal:()=>record,setAccount:a=>{account=a},advanceRemote:p=>{state=p;revision++;}};
}
test('Lost cloud response is retried using the same receipt while preserving newer local changes',async()=>{
  const b=baseProgress();const f=cloudFixture({local:{...b,coins:550,_cloudOwner:'a'},remote:b,journal:{baseline:b}});let lose=true;
  f.hooks.afterCommit=async()=>{if(lose){lose=false;throw new Error('network disconnected');}};
  await assert.rejects(f.sync('a'),/network/);assert.equal(f.getRemote().coins,550);
  f.setLocal({...f.getLocal(),coins:555});await f.sync('a');assert.equal(f.getLocal().coins,555);assert.equal(f.receipts.size,1);
  await f.sync('a');assert.equal(f.getRemote().coins,555);assert.equal(f.receipts.size,2);
});
test('Concurrent remote revision is rebased instead of overwritten',async()=>{
  const b=baseProgress();const f=cloudFixture({local:{...b,coins:450,_cloudOwner:'a'},remote:b,journal:{baseline:b}});let race=true;
  f.hooks.beforeCommit=async()=>{if(race){race=false;f.advanceRemote({...b,coins:400});}};
  await f.sync('a');assert.equal(f.getRemote().coins,350);assert.equal(f.getLocal().coins,350);
});
test('Ambiguous legacy saves keep both copies until an explicit choice',async()=>{
  const b=baseProgress();const f=cloudFixture({local:{...b,coins:100,currentLevel:5},remote:{...b,coins:700,currentLevel:9}});
  await assert.rejects(f.sync('a'),e=>e.code==='BOOTSTRAP_CONFLICT');assert.equal(f.getRemote().coins,700);assert.equal(f.getLocal().coins,100);assert.equal(f.getJournal().bootstrapLocal.coins,100);
  await f.sync('a','cloud');assert.equal(f.getLocal().coins,700);assert.equal(f.getJournal().bootstrapLocal.coins,100);
});
test('Account switch during a cloud request never applies another account save',async()=>{
  const b=baseProgress();const f=cloudFixture({local:{...b,coins:450,_cloudOwner:'a'},remote:b,journal:{baseline:b}});
  f.hooks.afterCommit=async()=>f.setAccount('b');await assert.rejects(f.sync('a'),e=>e.code==='ACCOUNT_CHANGED');assert.equal(f.getLocal()._cloudOwner,'a');
});
test('Crash after local cloud application does not apply the same remote delta twice',async()=>{
  const b=baseProgress();const f=cloudFixture({local:{...b,coins:450,_cloudOwner:'a'},remote:{...b,coins:400},journal:{baseline:b}});let fail=true;
  f.hooks.journal=async j=>{if(j.pending===null&&fail){fail=false;throw new Error('journal write interrupted');}};
  await assert.rejects(f.sync('a'),/journal/);assert.equal(f.getLocal().coins,350);
  await f.sync('a');assert.equal(f.getLocal().coins,350);assert.equal(f.receipts.size,1);
});
test('Replay on the win screen settles the reward before resetting the game',async()=>{
  const {storage:s}=services();const c=completionService(s);const gameSource=read('app/game.js');const input=finish();let reset=false;
  const noop=()=>{};const box={...s,gs:input.game,level:input.level,isDaily:false,isTimed:false,gameLang:'tr',levelId:1,dailyDate:null,elapsedTime:100,timeRemaining:100,getTimedSeconds:()=>180,
    useCallback:f=>f,settleCompletion:c.settleCompletion,isDailyChallengeCompleted:async()=>false,getDailyCompletionMap:async()=>({}),checkAchievements:async()=>[],submitScore:()=>new Promise(()=>{}),
    completionPromiseRef:{current:null},navigationRef:{current:false},toolActionRef:{current:false},rewardActionRef:{current:false},pendingAdBoardRef:{current:null},skipSaveRef:{current:false},latestSaveRef:{current:null},wrongMovesRef:{current:0},maxComboRef:{current:0},
    setRewardStatus:noop,setCoins:noop,setToolCredits:noop,setUnlockedTools:noop,setCompletionReceipt:noop,setFeedback:noop,setAchievementPopup:noop,user:null,syncToCloud:noop,t:{},resetGame:()=>{reset=true},console};
  const a=gameSource.indexOf('  const ensureCompletion =');const b=gameSource.indexOf('\n  useEffect(() => {\n    if (gs.isComplete)',a);
  box.ensureCompletion=vm.runInNewContext('(()=>{'+gameSource.slice(a,b)+'\nreturn ensureCompletion;})()',box);
  const x=gameSource.indexOf('  const handleReplay =');const y=gameSource.indexOf('  const handleHome =',x);
  const replay=vm.runInNewContext('(()=>{'+gameSource.slice(x,y)+'\nreturn handleReplay;})()',box);
  await replay();assert(reset);assert.equal((await s.loadProgress()).coins,546);assert.equal((await s.loadProgress()).totalWins,1);assert.equal(await s.loadSavedGame(),null);
});
test('Wallet history starts at the real inherited balance, then records a reward once',async()=>{
  const {storage:s,memory}=services();memory['@tilsim_progress']=JSON.stringify({coins:2353,currentLevel:14});
  const c=completionService(s);await c.settleCompletion(finish());await c.settleCompletion(finish());
  const p=await s.loadProgress();assert.equal(p.coins,2399);assert.equal(p.walletHistory.length,2);assert.equal(p.walletHistory[0].amount,2353);assert.equal(p.walletHistory[1].amount,46);assert.equal(p.walletHistory[1].source,'level');
});
test('Daily visit reward and its receipt are atomic even under repeated tapping',async()=>{
  const {storage:s,asyncStore,memory}=services();const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const key=`${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;memory['tilsim_daily_login']=JSON.stringify({lastDate:key,streak:1});const daily=vm.runInNewContext(strip(read('src/utils/dailyLogin.js'))+'\n;({grantDailyLoginReward,checkDailyLogin})',{AsyncStorage:asyncStore,loadProgress:s.loadProgress,updateProgress:s.updateProgress});
  await Promise.all([daily.grantDailyLoginReward(2),daily.grantDailyLoginReward(2),daily.grantDailyLoginReward(2)]);
  const p=await s.loadProgress();assert.equal(p.coins,520);assert.equal(p.walletHistory.length,2);assert.equal((await daily.checkDailyLogin()).shouldShow,false);
});
test('Cloud merge deduplicates the same daily visit across devices',()=>{
  const b=baseProgress();const p={...b,coins:520,dailyLoginReceipts:{'2026-11-01':{coins:20,streak:2}}};assert.equal(cloud.mergeProgress(b,p,p).coins,520);
});
