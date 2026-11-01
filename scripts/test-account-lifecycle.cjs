const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),strip=s=>s.replace(/^import .*$/gm,'').replace(/export /g,'');
function storageFixture(initial={}) {
 const memory={...initial};let failRemove=false;
 const disk={getItem:async k=>memory[k]??null,setItem:async(k,v)=>{memory[k]=v;},removeItem:async k=>{if(failRemove)throw Error('disk error');delete memory[k];},getAllKeys:async()=>Object.keys(memory)};
 const load=()=>vm.runInNewContext(strip(read('src/utils/storage.js'))+'\n({loadProgress,updateProgress,resetAll,resetUserScopedData,recoverLocalCleanup,saveSavedGame,loadSavedGame,commitBoardAction,prepareAccountLocalData})',{require:()=>({default:disk})});
 return{memory,load,set failRemove(v){failRemove=v;},...load()};
}
test('A failed cleanup keeps a durable recovery marker and rejects further wallet writes',async()=>{
 const f=storageFixture({'@tilsim_progress':'{"coins":2353,"_cloudOwner":"a"}','tilsim_daily_login':'old'});f.failRemove=true;
 await assert.rejects(f.resetAll(),/disk error/);let p=await f.loadProgress();assert.equal(p.coins,2353);assert.equal(p._localCleanup.kind,'reset');await assert.rejects(f.updateProgress({coins:1}),e=>e.code==='CLEANUP_PENDING');
 f.failRemove=false;const restart=f.load();await restart.recoverLocalCleanup();p=await restart.loadProgress();assert.equal(p.coins,500);assert.equal(p._cloudOwner,'a');assert.ok(p._cloudResetIntent.id);assert.equal(f.memory.tilsim_daily_login,undefined);
});
test('Sign-out clears user data but preserves settings and the account-scoped recovery backup',async()=>{
 const f=storageFixture({'@tilsim_progress':'{"coins":900,"_cloudOwner":"a"}','@tilsim_settings':'{"language":"tr"}','@tilsim_cloud_v2:a':'backup','@tilsim_device_id':'device','@tilsim_daily_2026-11-01':'done'});
 await f.resetUserScopedData();const p=await f.loadProgress();assert.equal(p.coins,500);assert.equal(p._cloudOwner,undefined);assert.equal(f.memory['@tilsim_cloud_v2:a'],'backup');assert.equal(f.memory['@tilsim_settings'],'{"language":"tr"}');assert.equal(f.memory['@tilsim_device_id'],'device');assert.equal(f.memory['@tilsim_daily_2026-11-01'],undefined);
});
test('Confirmed deletion removes only the deleted account backup',async()=>{
 const f=storageFixture({'@tilsim_cloud_v2:a':'a','@tilsim_cloud_v2:b':'b'});await f.resetUserScopedData({deleteAccountId:'a'});assert.equal(f.memory['@tilsim_cloud_v2:a'],undefined);assert.equal(f.memory['@tilsim_cloud_v2:b'],'b');
});
test('An old board cannot overwrite or spend from a freshly reset game',async()=>{
 const f=storageFixture(),before={runId:'old',moves:10};await f.saveSavedGame(before);await f.resetAll();
 await assert.rejects(f.saveSavedGame(before),e=>e.code==='DATA_RESET');await assert.rejects(f.commitBoardAction({before,after:before}),e=>e.code==='DATA_RESET');assert.equal(await f.loadSavedGame(),null);
});
const cloud=vm.runInNewContext(strip(read('src/utils/cloudSync.js'))+'\n({createCloudSync})');
function cloudFixture(local,remote,journal={}) {
 const f={local,remote,journal,commits:0};f.sync=cloud.createCloudSync({getAccountId:()=> 'a',loadLocal:async()=>structuredClone(f.local),applyLocal:async fn=>f.local=fn(f.local),readJournal:async()=>f.journal,writeJournal:async(_,j)=>{f.journal=structuredClone(j);},readRemote:async()=>{await f.onRead?.();return{state:f.remote,revision:1};},createRequestId:()=> 'account-test-unique',commitRemote:async(_,id,revision,state)=>{f.commits++;f.remote=structuredClone(state);return{state,revision:revision+1};}});return f;
}
test('Reset intent never auto-restores an old cloud backup or its pending request',async()=>{
 const f=cloudFixture({coins:500,currentLevel:1,_cloudResetIntent:{id:'reset'},resetEpoch:'reset'},{coins:2353,currentLevel:14},{backup:{coins:2353,currentLevel:14},baseline:{coins:2353},pending:{id:'old',sent:{coins:2353},base:{coins:2353}}});
 await assert.rejects(f.sync('a'),e=>e.code==='BOOTSTRAP_CONFLICT');assert.equal(f.local.coins,500);assert.equal(f.commits,0);
 await f.sync('a','device');assert.equal(f.remote.coins,500);assert.equal(f.remote.resetEpoch,'reset');assert.equal(f.local._cloudResetIntent,null);assert.equal(f.remote._cloudResetIntent,undefined);
});
test('A deliberate cloud restore after reset requires the explicit choice and clears old boards',async()=>{
 const f=cloudFixture({coins:500,currentLevel:1,_cloudResetIntent:{id:'reset'},resetEpoch:'reset',_localBoards:{classic:{runId:'old'}}},{coins:900,currentLevel:7});await f.sync('a','cloud');assert.equal(f.local.coins,900);assert.equal(f.local.resetEpoch,null);assert.equal(f.local._localBoards.classic,null);assert.equal(f.local._cloudResetIntent,null);
});
test('A reset while a cloud read is pending cannot be overwritten by that older operation',async()=>{
 const f=cloudFixture({coins:500,currentLevel:1},{coins:900,currentLevel:7});f.onRead=()=>{f.local={coins:500,currentLevel:1,_cloudResetIntent:{id:'new'},resetEpoch:'new'};};
 await assert.rejects(f.sync('a'),e=>['DATA_RESET','BOOTSTRAP_CONFLICT'].includes(e.code));assert.equal(f.local.resetEpoch,'new');assert.equal(f.local.coins,500);
});
test('Another device detects a remote reset instead of merging its old balance back silently',async()=>{
 const f=cloudFixture({coins:2300,currentLevel:14},{coins:500,currentLevel:1,resetEpoch:'new'},{baseline:{coins:2353,currentLevel:14}});await assert.rejects(f.sync('a'),e=>e.code==='BOOTSTRAP_CONFLICT');assert.equal(f.commits,0);
});

test('A lost reset response retries the same receipt without asking to restore the old save',async()=>{
 let local={coins:500,currentLevel:1,resetEpoch:'new',_cloudResetIntent:{id:'new'}},remote={coins:900,currentLevel:7},journal,accepted,requests=0;
 const sync=cloud.createCloudSync({getAccountId:()=> 'a',loadLocal:async()=>structuredClone(local),applyLocal:async fn=>local=fn(local),readJournal:async()=>journal,writeJournal:async(_,j)=>{journal=structuredClone(j);},readRemote:async()=>({state:remote,revision:accepted?2:1}),createRequestId:()=> 'reset-request-once',commitRemote:async(_,id,revision,state)=>{
  if(accepted)return accepted;requests++;remote=structuredClone(state);accepted={state:remote,revision:2};throw Error('response lost');
 }});
 await assert.rejects(sync('a','device'),/response lost/);await sync('a');assert.equal(requests,1);assert.equal(local.coins,500);assert.equal(local._cloudResetIntent,null);
});
const {createDeleteAccountHandler}=vm.runInNewContext(strip(read('supabase/functions/_shared/deleteAccountHandler.js'))+'\n({createDeleteAccountHandler})',{Response});
const request=(token='valid',body={})=>new Request('https://example.invalid/delete-account',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify(body)});
test('Deletion ignores a supplied victim ID and deletes only the server-verified caller',async()=>{
 const removed=[];const handler=createDeleteAccountHandler({verifyUser:async token=>({data:{user:{id:'caller'}}}),deleteUser:async id=>{removed.push(id);return{data:{user:{id}}};}});
 const response=await handler(request('valid',{userId:'victim',device_id:'other'}));assert.equal(response.status,200);assert.deepEqual(removed,['caller']);assert.equal((await response.json()).deletedUserId,'caller');
});
test('Missing or invalid authentication never calls account deletion',async()=>{
 let removed=0;const handler=createDeleteAccountHandler({verifyUser:async()=>({error:Error('invalid')}),deleteUser:async()=>{removed++;}});
 assert.equal((await handler(request(null))).status,401);assert.equal((await handler(request('invalid'))).status,401);assert.equal(removed,0);
});
test('A server deletion error, wrong returned user or transport failure never claims success',async()=>{
 for(const remove of [async()=>({error:Error('database failed')}),async()=>({data:{user:{id:'wrong'}}}),async()=>{throw Error('network');}]){
  const handler=createDeleteAccountHandler({verifyUser:async()=>({data:{user:{id:'caller'}}}),deleteUser:remove});const response=await handler(request());assert.equal(response.status,503);assert.equal((await response.json()).success,false);
 }
});

test('Concurrent adoption of another account preserves one backup and cannot reset newly adopted data twice',async()=>{
 const f=storageFixture({'@tilsim_progress':'{"coins":2353,"_cloudOwner":"a"}'});await Promise.all([f.prepareAccountLocalData('b'),f.prepareAccountLocalData('b')]);
 assert.equal(JSON.parse(f.memory['@tilsim_cloud_v2:a']).backup.coins,2353);assert.equal((await f.loadProgress()).coins,500);assert.equal((await f.loadProgress())._cloudOwner,undefined);
 await f.updateProgress({coins:550});await f.prepareAccountLocalData('b');assert.equal((await f.loadProgress()).coins,550);
});
