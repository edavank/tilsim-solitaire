const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const strip=s=>s.replace(/^import .*$/gm,'').replace(/export /g,'');
function fixture(initial={}) {
 const disk={...initial};let reject=false,writes=0;
 const api={getItem:async k=>disk[k]??null,setItem:async(k,v)=>{writes++;if(reject)throw Error('disk full');disk[k]=v;},removeItem:async k=>{delete disk[k];}};
 const load=()=>vm.runInNewContext(strip(read('src/utils/storage.js'))+'\n({loadProgress,updateProgress,loadSavedGame,saveSavedGame,clearSavedGame,commitBoardAction})',{require:()=>({default:api})});
 return{disk,load,get writes(){return writes;},set reject(v){reject=v;},...load()};
}
const board=(mode='classic')=>({runId:'run-'+mode,gameMode:mode,levelId:1,gameLanguage:'tr',moves:10,isFailed:false,isComplete:false,score:0,completedCats:0,slots:[],columns:[],drawnCards:[],deck:[]});
for (const mode of ['classic','daily','timed']) test(mode+': a crash after a tool write restores BOTH the debit and the changed board',async()=>{
 const f=fixture({'@tilsim_progress':JSON.stringify({coins:900,toolCredits:{joker:2,undo:4}})}),before=board(mode);
 await f.saveSavedGame(before);const start=f.writes;
 await f.commitBoardAction({before,after:{...before,moves:9,score:10},tool:'joker'});
 assert.equal(f.writes-start,1);
 const restarted=f.load();assert.equal((await restarted.loadProgress()).toolCredits.joker,1);assert.equal((await restarted.loadProgress()).toolCredits.undo,4);
 const restored=await restarted.loadSavedGame(mode);assert.equal(restored.moves,9);assert.equal(restored.score,10);assert.equal(restored._toolRevision,1);
});
test('A failed atomic write changes neither inventory, coins nor board after restart',async()=>{
 const f=fixture({'@tilsim_progress':JSON.stringify({coins:900,toolCredits:{undo:1}})}),before=board();await f.saveSavedGame(before);f.reject=true;
 await assert.rejects(f.commitBoardAction({before,after:{...before,moves:11},tool:'undo',coinCost:100}),/disk full/);
 const restart=f.load();assert.equal((await restart.loadSavedGame()).moves,10);const p=await restart.loadProgress();assert.equal(p.coins,900);assert.equal(p.toolCredits.undo,1);
});
test('Two simultaneous actions from the same board cannot spend twice',async()=>{
 const f=fixture({'@tilsim_progress':JSON.stringify({coins:900,toolCredits:{undo:2}})}),before=board();await f.saveSavedGame(before);
 const results=await Promise.allSettled([1,2].map(()=>f.commitBoardAction({before,after:{...before,moves:11},tool:'undo'})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'BOARD_CONFLICT');assert.equal((await f.loadProgress()).toolCredits.undo,1);
});
test('A queued stale autosave cannot overwrite a successful tool result',async()=>{
 const f=fixture({'@tilsim_progress':JSON.stringify({coins:900,toolCredits:{hint:1}})}),before=board();await f.saveSavedGame(before);
 await f.commitBoardAction({before,after:{...before,hintsUsed:1},tool:'hint'});await f.saveSavedGame(before);
 assert.equal((await f.loadSavedGame()).hintsUsed,1);assert.equal((await f.loadProgress()).toolCredits.hint,0);
});
test('Paid extra moves are available immediately after restart and charged once',async()=>{
 const f=fixture({'@tilsim_progress':'{"coins":900}'}),before={...board(),moves:0,isFailed:true};await f.saveSavedGame(before);
 await f.commitBoardAction({before,after:{...before,moves:20,isFailed:false,extraMovesGranted:20},coinCost:500});
 const restarted=f.load();assert.equal((await restarted.loadProgress()).coins,400);assert.equal((await restarted.loadSavedGame()).moves,20);
});
test('Missing inventory or insufficient coins preserve the full board',async()=>{
 for(const payment of [{tool:'undo'},{coinCost:1000}]){
  const f=fixture(),before=board();await f.saveSavedGame(before);
  const r=await f.commitBoardAction({before,after:{...before,moves:99},...payment});assert.equal(r.success,false);assert.equal((await f.loadSavedGame()).moves,10);assert.equal((await f.loadProgress()).coins,500);
 }
});
test('Clearing a run rejects delayed paid actions and prevents autosave resurrection',async()=>{
 const f=fixture(),before=board();await f.saveSavedGame(before);await f.clearSavedGame();await f.saveSavedGame(before);
 assert.equal(await f.loadSavedGame(),null);await assert.rejects(f.commitBoardAction({before,after:before}),e=>e.code==='BOARD_CONFLICT');
});
test('A new run cannot accidentally pay for a previously open run',async()=>{
 const f=fixture(),before=board();await f.saveSavedGame({...before,runId:'new'});
 await assert.rejects(f.commitBoardAction({before,after:before}),e=>e.code==='BOARD_CONFLICT');assert.equal((await f.loadSavedGame()).runId,'new');
});
test('Local board transaction data is excluded from cloud payloads and remote restores',async()=>{
 const cloud=vm.runInNewContext(strip(read('src/utils/cloudSync.js'))+'\n({cleanSnapshot,createCloudSync})');
 const result=cloud.cleanSnapshot({coins:500,_localBoards:{classic:board()},_localClosedRuns:['x']});assert.equal(result._localBoards,undefined);assert.equal(result._localClosedRuns,undefined);
 let local={coins:500,currentLevel:1,_localBoards:{classic:board()}},journal;
 const sync=cloud.createCloudSync({getAccountId:()=> 'a',loadLocal:async()=>local,applyLocal:async fn=>local=fn(local),readJournal:async()=>journal,writeJournal:async(_,j)=>{journal=j;},readRemote:async()=>({revision:1,state:{coins:1000,currentLevel:5,_localBoards:{classic:{runId:'foreign'}}}})});
 await sync('a','cloud');assert.equal(local._localBoards.classic.runId,'run-classic');assert.equal(local.coins,1000);
});
test('Shuffling preserves locked cards, every identity and the source board',()=>{
 const {shuffleBoard}=vm.runInNewContext(strip(read('src/utils/boardActions.js'))+'\n({shuffleBoard})');
 const b={...board(),columns:[{locked:true,cards:[{id:'locked'}]},{locked:false,cards:[{id:'a'},{id:'b'}]}],drawnCards:[{id:'c'}]};
 const original=JSON.stringify(b),next=shuffleBoard(b,()=>0);assert.equal(JSON.stringify(b),original);assert.equal(next.columns[0],b.columns[0]);
 assert.equal([...next.columns.flatMap(c=>c.cards),...next.drawnCards].map(c=>c.id).sort().join(),'a,b,c,locked');assert.equal(next.columns[1].cards[0].faceUp,false);assert.equal(next.columns[1].cards[1].faceUp,true);
});

test('Entering without a level parameter builds the saved current level, not level one',async()=>{
 const source=read('app/game.js'),a=source.indexOf('  // Load progress'),b=source.indexOf('  // Shake animation',a);
 let generated,levelId,state,ready=false,error;
 const noop=()=>{};
 vm.runInNewContext(source.slice(a,b),{useEffect:f=>f(),loadAttempt:0,loadProgress:async()=>({coins:900,currentLevel:14}),params:{},isDaily:false,isTimed:false,gameLang:'tr',level:{id:1},
  getLevel:id=>({id}),generateGameState:level=>{generated=level.id;return{...board(),levelId:level.id};},
  setCoins:noop,setLevelId:id=>{levelId=id;},setShowTutorial:noop,updateProgress:noop,setUnlockedTools:noop,setToolCredits:noop,
  require:()=>({loadSavedGame:async()=>null}),isSavedBoardValid:()=>true,setGs:s=>{state=s;},setHistory:noop,setElapsedTime:noop,startTimeRef:{current:0},clockPauseStartedRef:{current:null},
  setSaveLoadError:e=>{error=e;},setSaveReady:v=>{ready=v;},setTimeRemaining:noop,timedEndRef:{current:null},pauseRemainRef:{current:null},getTimedSeconds:()=>180,
 });
 for(let i=0;i<15;i++)await Promise.resolve();assert.equal(error,null);assert.equal(ready,true);assert.equal(levelId,14);assert.equal(generated,14);assert.equal(state.levelId,14);
});

test('Undo preserves purchased extra moves and permanent unlocks',async()=>{
 const source=read('app/game.js'),a=source.indexOf('  const useUndo ='),b=source.indexOf('  const executeUndo =',a);
 let target,historyPopped=false;const previous={...board(),moves:8,slots:[{locked:true}],columns:[{locked:true,cards:[]}],extraMovesGranted:0,hintsUsed:0};
 const gs={...previous,moves:27,slots:[{locked:false}],columns:[{locked:false,cards:[]}],extraMovesGranted:20,hintsUsed:2,_toolRevision:3};
 const fn=vm.runInNewContext(source.slice(a,b)+'\nuseUndo',{useCallback:f=>f,saveReady:true,toolActionRef:{current:false},isToolUnlocked:()=>true,history:[previous],gs,t:{},setFeedback(){},setHistory(){historyPopped=true;},commitToolBoard:async(_,next)=>{target=next;return next;}});
 await fn();assert.equal(target.moves,28);assert.equal(target.extraMovesGranted,20);assert.equal(target.slots[0].locked,false);assert.equal(target.columns[0].locked,false);assert.equal(target.hintsUsed,2);assert.equal(historyPopped,true);
});

function adAction(ad,commit) {
 const source=read('app/game.js'),a=source.indexOf('  const applyAdBoardReward ='),b=source.indexOf('  const useUndo =',a);
 const pending={current:null},busy={current:false};
 const fn=vm.runInNewContext(source.slice(a,b)+'\napplyAdBoardReward',{useCallback:f=>f,saveReady:true,gs:{runId:'r'},rewardActionRef:busy,toolActionRef:{current:false},navigationRef:{current:false},pendingAdBoardRef:pending,boardActionRef:{current:commit},showGameRewarded:ad,t:{},setFeedback(){},setAdLoadingTool(){}});
 return{fn,pending,busy};
}
test('An earned ad can retry a failed board write without showing a second ad',async()=>{
 let ads=0,writes=0;const h=adAction(async()=>{ads++;return{success:true};},async()=>++writes===1?null:{runId:'r'});
 assert.equal(await h.fn('moves',x=>x),false);assert.ok(h.pending.current);assert.equal(await h.fn('moves',x=>x),true);assert.equal(ads,1);assert.equal(writes,2);assert.equal(h.pending.current,null);
});
test('Duplicate ad-reward taps cannot open a second ad or apply twice',async()=>{
 let resolve,ads=0,writes=0;const h=adAction(()=>{ads++;return new Promise(r=>{resolve=r;});},async()=>{writes++;return{runId:'r'};});
 const first=h.fn('moves',x=>x);assert.equal(await h.fn('moves',x=>x),false);resolve({success:true});await first;assert.equal(ads,1);assert.equal(writes,1);assert.equal(h.busy.current,false);
});
test('An incomplete ad grants no board change; unexpected ad errors clear the lock',async()=>{
 let writes=0;for(const ad of [async()=>({success:false,reason:'dismissed'}),async()=>{throw Error('SDK error');}]){
  const h=adAction(ad,async()=>{writes++;});assert.equal(await h.fn('moves',x=>x),false);assert.equal(h.busy.current,false);assert.equal(h.pending.current,null);
 }assert.equal(writes,0);
});
