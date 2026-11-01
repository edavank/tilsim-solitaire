const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),strip=s=>s.replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'').replace(/export /g,'');
function services(initial={},fail={}){
 const memory={...initial};const disk={getItem:async k=>{if(fail.read)throw Error('read failed');return memory[k]??null;},setItem:async(k,v)=>{if(fail.write)throw Error('disk full');memory[k]=v;},removeItem:async k=>{if(fail.remove)throw Error('remove failed');delete memory[k];},getAllKeys:async()=>Object.keys(memory),multiRemove:async keys=>keys.forEach(k=>delete memory[k])};
 const storage=vm.runInNewContext(strip(read('src/utils/storage.js'))+'\n;({loadProgress,updateProgress,loadSavedGame,saveSavedGame,clearSavedGame,commitBoardAction,resetUserScopedData})',{require:()=>({default:disk})});
 const tools=vm.runInNewContext(strip(read('src/utils/toolEconomy.js'))+'\n;({purchaseToolCredit,grantToolCredit,consumeToolCredit})',{updateProgress:storage.updateProgress});
 return{memory,disk,storage,tools,fail};
}
const safety=vm.runInNewContext(strip(read('src/utils/cardSafety.js'))+'\n;({getMovableSource,findSlotHint,isSavedBoardValid})');
const deals=vm.runInNewContext(strip(read('src/utils/dealSafety.js'))+'\n;({hasInitialCategoryLock,repairInitialCategoryLock})');
const card=(id,ci,type='word')=>({id,word:id,type,categoryIndex:ci,faceUp:true,totalWords:1});
const board=()=>({runId:'r',moves:10,isComplete:false,isFailed:false,deck:[],drawnCards:[],columns:[{locked:false,cards:[]},{locked:false,cards:[]}],slots:[{locked:false,category:null,placedCards:[]}]});
function undoHandler(consume) {
 const source=read('app/game.js'),start=source.indexOf('  const commitToolBoard ='),end=source.indexOf('  const executeUndo =',start);
 const effects=[],lock={current:false};
 const run=vm.runInNewContext(source.slice(start,source.indexOf('  boardActionRef.current =',start))+source.slice(source.indexOf('  const useUndo =',start),end)+'\nuseUndo',{
  useCallback:f=>f,saveReady:true,toolActionRef:lock,isToolUnlocked:()=>true,history:[{...board(),moves:9}],toolCredits:{undo:1},t:{undoDone:'done'},gs:board(),navigationRef:{current:false},isDaily:false,isTimed:false,level:{id:1},levelId:1,gameLang:'tr',timeRemaining:0,elapsedTime:0,latestSaveRef:{current:null},saveSavedGame:async()=>{},setCoins:()=>{},
  commitBoardAction:async ({after})=>{const r=await consume();return {...r,board:after};},setToolCredits:p=>effects.push(['credits',p]),setGs:p=>effects.push(['board',p]),
  setHistory:()=>effects.push(['history']),setSelected:()=>{},setFeedback:x=>effects.push(['feedback',x]),setToolModal:x=>effects.push(['modal',x]),
 });return{run,effects,lock};
}
test('Rapid repeated Undo presses perform one inventory debit and one board change',async()=>{
 let finish,calls=0;const h=undoHandler(()=>{calls++;return new Promise(r=>{finish=r;});});
 const first=h.run();await h.run();assert.equal(calls,1);assert.equal(h.lock.current,true);
 finish({success:true,progress:{toolCredits:{undo:0,joker:3}}});await first;
 assert.equal(h.effects.filter(e=>e[0]==='board').length,1);assert.equal(h.effects.find(e=>e[0]==='credits')[1].joker,3);assert.equal(h.lock.current,false);
});
test('Undo write failure preserves the board and history and permits retry',async()=>{
 const h=undoHandler(async()=>{throw Error('disk full');});await h.run();
 assert.equal(h.effects.some(e=>['board','history','credits'].includes(e[0])),false);assert.equal(h.lock.current,false);
 await h.run();assert.equal(h.effects.filter(e=>e[0]==='feedback').length,2);
});
test('Stale Undo inventory cannot grant a free board change',async()=>{
 const h=undoHandler(async()=>({success:false,progress:{toolCredits:{undo:0}}}));await h.run();
 assert.equal(h.effects.some(e=>['board','history'].includes(e[0])),false);assert.equal(h.effects.find(e=>e[0]==='modal')[1],'undo');
});
test('Read failure preserves existing 900 coins and blocks the write',async()=>{const s=services({'@tilsim_progress':'{"coins":900}'},{read:true});await assert.rejects(s.storage.updateProgress(p=>({coins:p.coins+50})),/read failed/);assert.equal(s.memory['@tilsim_progress'],'{"coins":900}');});
test('Corrupt saved JSON is preserved instead of reset to 500 coins',async()=>{const s=services({'@tilsim_progress':'{broken'});await assert.rejects(s.storage.updateProgress(p=>({coins:p.coins+50})),e=>e.code==='SAVE_CORRUPT');assert.equal(s.memory['@tilsim_progress'],'{broken');});
test('Negative and fractional coin writes are rejected',async()=>{const s=services();await assert.rejects(s.storage.updateProgress({coins:-1}),e=>e.code==='INVALID_BALANCE');await assert.rejects(s.storage.updateProgress({coins:1.5}));assert.equal((await s.storage.loadProgress()).coins,500);});
test('Failed clear write preserves the recoverable legacy saved game',async()=>{const s=services({'@tilsim_saved_game':'{"moves":4}'},{write:true});await assert.rejects(s.storage.clearSavedGame(),/disk full/);assert.equal((await s.storage.loadSavedGame()).moves,4);});
test('Two concurrent tool purchases cannot overspend a 500-coin balance',async()=>{const s=services();const results=await Promise.all([s.tools.purchaseToolCredit('undo'),s.tools.purchaseToolCredit('undo')]);const p=await s.storage.loadProgress();assert.equal(results.filter(x=>x.success).length,1);assert.equal(p.coins,50);assert.equal(p.toolCredits.undo,1);});
test('Two affordable purchases grant two credits; inventory updates do not overwrite each other',async()=>{const s=services({'@tilsim_progress':'{"coins":2000,"toolCredits":{"undo":2,"joker":4}}'});await Promise.all([s.tools.purchaseToolCredit('undo'),s.tools.purchaseToolCredit('undo'),s.tools.grantToolCredit('joker')]);const p=await s.storage.loadProgress();assert.equal(p.coins,1100);assert.equal(p.toolCredits.undo,4);assert.equal(p.toolCredits.joker,5);});
test('A disk failure leaves both price and purchased tool unmodified',async()=>{const s=services({'@tilsim_progress':'{"coins":900,"toolCredits":{"hint":1}}'},{write:true});await assert.rejects(s.tools.purchaseToolCredit('hint'),/disk full/);assert.equal(JSON.parse(s.memory['@tilsim_progress']).coins,900);assert.equal(JSON.parse(s.memory['@tilsim_progress']).toolCredits.hint,1);});
test('Two concurrent uses of the last credit consume exactly once',async()=>{const s=services({'@tilsim_progress':'{"coins":500,"toolCredits":{"hint":1}}'});const results=await Promise.all([s.tools.consumeToolCredit('hint'),s.tools.consumeToolCredit('hint')]);assert.equal(results.filter(x=>x.success).length,1);assert.equal((await s.storage.loadProgress()).toolCredits.hint,0);});
test('Changing accounts clears the daily-login key actually used by the game',async()=>{const s=services({'tilsim_daily_login':'{"streak":7}','@tilsim_daily_login':'legacy'});await s.storage.resetUserScopedData();assert.equal(s.memory.tilsim_daily_login,undefined);assert.equal(s.memory['@tilsim_daily_login'],undefined);});
test('Stale, hidden, covered and mixed-stack source selections cannot move',()=>{const b=board();b.columns[0].cards=[card('a',0),card('b',1)];assert.equal(safety.getMovableSource(b,'column',0,'ghost'),null);assert.equal(safety.getMovableSource(b,'column',0,'a',true),null);b.columns[0].cards[1].faceUp=false;assert.equal(safety.getMovableSource(b,'column',0,'b'),null);});
test('Legal homogeneous exposed stacks remain movable; terminal boards reject them',()=>{const b=board();b.columns[0].cards=[card('a',0),card('b',0)];assert.equal(safety.getMovableSource(b,'column',0,'a',true).length,2);assert.equal(safety.getMovableSource({...b,isFailed:true},'column',0,'a',true),null);assert.equal(safety.getMovableSource({...b,moves:0},'column',0,'a',true),null);});
test('Hints reject a covered word and a locked matching slot',()=>{const b=board();b.columns[0].cards=[card('a',0),card('b',1)];b.slots[0].category=card('cat',0,'category');assert.equal(safety.findSlotHint(b),null);b.drawnCards=[card('a2',0)];b.slots[0].locked=true;assert.equal(safety.findSlotHint(b),null);b.slots[0].locked=false;assert.equal(safety.findSlotHint(b).cardId,'a2');});
test('Proven initial lock is repaired without changing any card identity or budget',()=>{const b=board();b.columns[0].cards=[{...card('cat0',0,'category'),faceUp:false},card('w1',1)];b.columns[1].cards=[{...card('cat1',1,'category'),faceUp:false},card('w0',0)];b.deck=[card('w2',0)];assert.equal(deals.hasInitialCategoryLock(b),true);const before=JSON.stringify(b),fixed=deals.repairInitialCategoryLock(b);assert.equal(deals.hasInitialCategoryLock(fixed),false);assert.equal(fixed.moves,b.moves);assert.equal(fixed.deck.at(-1).type,'category');const ids=x=>[...x.deck,...x.columns.flatMap(c=>c.cards)].map(c=>c.id).sort().join();assert.equal(ids(fixed),ids(b));assert.equal(JSON.stringify(b),before);});
test('A no-deck initial lock reveals one category while preserving every card',()=>{const b=board();b.columns[0].cards=[{...card('c0',0,'category'),faceUp:false},card('w1',1)];b.columns[1].cards=[{...card('c1',1,'category'),faceUp:false},card('w0',0)];const fixed=deals.repairInitialCategoryLock(b);assert.equal(deals.hasInitialCategoryLock(fixed),false);assert.equal(fixed.columns[0].cards.at(-1).type,'category');});
const cloud=vm.runInNewContext(strip(read('src/utils/cloudSync.js'))+'\n;({createCloudSync})');
function cloudFixture(local,remote,onRead=()=>{}){let state=local,journal;return{get state(){return state;},sync:cloud.createCloudSync({getAccountId:()=> 'a',loadLocal:async()=>structuredClone(state),applyLocal:async fn=>state={...state,...fn(state)},readJournal:async()=>journal,writeJournal:async(_,j)=>{journal=structuredClone(j);},readRemote:async()=>{onRead(state);return{state:remote,revision:1};},createRequestId:()=> 'audit-test',commitRemote:async(_,id,revision,data)=>({state:data,revision:revision+1})})};}
test('Cloud bootstrap preserves a reward earned during its network read',async()=>{const c=cloudFixture({coins:500,currentLevel:1},{coins:1000,currentLevel:10},s=>{s.coins+=50;});await assert.rejects(c.sync('a'),e=>e.code==='BOOTSTRAP_CONFLICT');assert.equal(c.state.coins,550);});
test('Inventory-only and XP-only progress require a choice before cloud replacement',async()=>{for(const extra of [{toolCredits:{hint:2}},{xp:20},{levelStars:{1:3}}]){const c=cloudFixture({coins:500,currentLevel:1,...extra},{coins:500,currentLevel:1});await assert.rejects(c.sync('a'),e=>e.code==='BOOTSTRAP_CONFLICT');}});
function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function dailyService(s){return vm.runInNewContext(strip(read('src/utils/dailyLogin.js'))+'\n;({checkDailyLogin,grantDailyLoginReward})',{AsyncStorage:s.disk,loadProgress:s.storage.loadProgress,updateProgress:s.storage.updateProgress});}
test('A stale UI streak cannot award seven days of coins to a new visit',async()=>{const s=services();await dailyService(s).grantDailyLoginReward(7);assert.equal((await s.storage.loadProgress()).coins,510);});
test('Canonical yesterday receipt maintains the visit streak after a secondary write failure',async()=>{const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const s=services({'@tilsim_progress':JSON.stringify({coins:500,dailyLoginReceipts:{[dateKey(yesterday)]:{coins:20,streak:2}}})});const d=dailyService(s);assert.equal((await d.checkDailyLogin()).streak,3);await d.grantDailyLoginReward(1);assert.equal((await s.storage.loadProgress()).coins,530);});

test('Random concurrent economy operations conserve coins and every tool credit under disk failures',async()=>{
 const s=services({'@tilsim_progress':'{"coins":5000,"toolCredits":{"hint":2,"undo":2,"joker":2,"shuffle":2,"delete":2}}'});let writes=0;
 const original=s.disk.setItem;s.disk.setItem=async(k,v)=>{if(++writes%23===0)throw Error('injected disk error');return original(k,v);};
 let seed=717;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const names=['hint','undo','joker','shuffle','delete'],prices={hint:500,undo:450,joker:750,shuffle:500,delete:500};
 let coins=5000;const credits=Object.fromEntries(names.map(x=>[x,2]));
 for(let batch=0;batch<150;batch++){
  const actions=Array.from({length:7},()=>({kind:Math.floor(random()*4),tool:names[Math.floor(random()*names.length)]}));
  const results=await Promise.allSettled(actions.map(a=>a.kind===0?s.tools.purchaseToolCredit(a.tool):a.kind===1?s.tools.grantToolCredit(a.tool):a.kind===2?s.tools.consumeToolCredit(a.tool):s.storage.updateProgress(p=>({coins:p.coins+50}))));
  for(let i=0;i<actions.length;i++){
   const a=actions[i],res=results[i];if(res.status==='rejected')continue;
   if(a.kind===0&&res.value.success){coins-=prices[a.tool];credits[a.tool]++;}
   if(a.kind===1)credits[a.tool]++;if(a.kind===2&&res.value.success)credits[a.tool]--;if(a.kind===3)coins+=50;
  }
  const p=await s.storage.loadProgress();assert.equal(p.coins,coins);assert.ok(p.coins>=0);for(const t of names)assert.equal(p.toolCredits[t],credits[t]);
 }
});


test('Classic, daily and timed saves remain independent when another mode finishes',async()=>{
 const s=services();await s.storage.saveSavedGame({moves:8,runId:'classic',gameMode:'classic'});await s.storage.saveSavedGame({moves:6,runId:'daily',gameMode:'daily'});await s.storage.saveSavedGame({moves:9999,runId:'timed',gameMode:'timed'});
 await s.storage.clearSavedGame('daily');assert.equal((await s.storage.loadSavedGame('classic')).runId,'classic');assert.equal((await s.storage.loadSavedGame('timed')).runId,'timed');assert.equal(await s.storage.loadSavedGame('daily'),null);
});
test('A migrated legacy timed game does not return after replay/clear',async()=>{
 const s=services({'@tilsim_saved_game':'{"moves":9999,"gameMode":"timed","runId":"legacy"}'});assert.equal((await s.storage.loadSavedGame('timed')).runId,'legacy');await s.storage.clearSavedGame('timed');assert.equal(await s.storage.loadSavedGame('timed'),null);
});
test('Opening classic mode preserves a legacy timed save before replacing its shared key',async()=>{
 const s=services({'@tilsim_saved_game':'{"moves":9999,"gameMode":"timed","runId":"legacy"}'});assert.equal(await s.storage.loadSavedGame('classic'),null);await s.storage.saveSavedGame({moves:8,runId:'new-classic'});assert.equal((await s.storage.loadSavedGame('timed')).runId,'legacy');
});
test('A failed save read is reported instead of starting a new board',async()=>{
 const s=services({'@tilsim_saved_game':'{"moves":8}'},{read:true});await assert.rejects(s.storage.loadSavedGame(),/read failed/);assert.equal(s.memory['@tilsim_saved_game'],'{"moves":8}');
});


test('Nested save validation rejects malformed columns, duplicate cards and missing result data',()=>{
 const b={...board(),levelId:1,score:0,completedCats:0};b.drawnCards=[card('a',0)];assert.equal(safety.isSavedBoardValid(b),true);
 assert.equal(safety.isSavedBoardValid({...b,columns:[null]}),false);assert.equal(safety.isSavedBoardValid({...b,score:undefined}),false);assert.equal(safety.isSavedBoardValid({...b,deck:[card('a',0)]}),false);
});
test('Manual save flush reports a write failure so Home can keep the current board open',async()=>{
 const source=read('app/game.js'),a=source.indexOf('  const flushGameSave ='),b=source.indexOf('\n  useEffect(',a);
 const flush=vm.runInNewContext(source.slice(a,b)+'\nflushGameSave',{useCallback:f=>f,saveTimerRef:{current:null},skipSaveRef:{current:false},latestSaveRef:{current:{moves:8}},clearTimeout(){},saveSavedGame:async()=>{throw Error('disk full');}});
 await assert.rejects(flush(),/disk full/);
});

test('Daily screen translations contain Russian and Arabic as independent languages',()=>{
 const s=read('app/daily.js'),a=s.indexOf('const DAILY_I18N ='),b=s.indexOf('\nfunction getMonthDays');const map=vm.runInNewContext(s.slice(a,b)+'\nDAILY_I18N');assert.ok(map.ru.title);assert.ok(map.ar.title);assert.equal(map.ar.ru,undefined);
});

test('Timed continuation handlers never debit coins or request an ineffective moves ad',async()=>{
 const source=read('app/game.js');for(const [name,next]of [['addMovesAd','addMovesCoin'],['addMovesCoin','ensureCompletion']]){
  const a=source.indexOf('  const '+name+' ='),b=source.indexOf('  const '+next+' =',a);const end=source.indexOf('\n  // A finished run',a);const snippet=source.slice(a,name==='addMovesCoin'?end:b);
  const fn=vm.runInNewContext(snippet+'\n'+name,{useCallback:f=>f,saveReady:true,isTimed:true,gs:{},applyAdBoardReward(){throw Error('must not show');},commitToolBoard(){throw Error('must not charge');},adLoadingTool:null,t:{},setFeedback(){},updateProgress(){throw Error('must not charge');},showGameRewarded(){throw Error('must not show');}});await fn();
 }
});
