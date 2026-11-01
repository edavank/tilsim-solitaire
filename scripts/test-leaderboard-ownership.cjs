const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/utils/leaderboardService.js'),'utf8').replace(/^import .*$/gm,'').replace(/export /g,'');
function service(owner='a') {
 const calls=[];const query={select(...v){calls.push(['select',...v]);return query;},eq(...v){calls.push(['eq',...v]);return query;},update(...v){calls.push(['update',...v]);return query;},not(...v){calls.push(['not',...v]);return query;},gt(...v){calls.push(['gt',...v]);return Promise.resolve({count:2});},maybeSingle:async()=>({data:{id:'entry',score:17}})};
 const supabase={auth:{getSession:async()=>({data:{session:owner?{user:{id:owner}}:null}})},rpc:async(name,params)=>{calls.push(['rpc',name,params]);return{};},from:name=>{calls.push(['table',name]);return query;}};
 return{calls,api:vm.runInNewContext(source+'\n({submitScore,getUserRank,updateDisplayName})',{require:()=>({default:supabase})})};
}
test('Score submission never sends caller-supplied score, level or device ID as authority',async()=>{
 const s=service();await s.api.submitScore({score:999999,level:230,totalWins:900,deviceId:'victim',displayName:'Test'});
 const call=s.calls.find(x=>x[0]==='rpc');assert.equal(call[1],'submit_score_v2');assert.deepEqual(Object.keys(call[2]).sort(),['p_avatar_emoji','p_display_name','p_language']);assert.equal(s.calls.some(x=>x[0]==='table'),false);
});
test('Guest score submission never makes an unauthenticated write',async()=>{
 const s=service(null);assert.equal((await s.api.submitScore({score:50})).code,'AUTH_REQUIRED');assert.equal(s.calls.length,0);
});
test('Rank and profile changes filter by authenticated owner, never device ID',async()=>{
 const s=service();await s.api.getUserRank();await s.api.updateDisplayName('  Test  ');assert.equal(s.calls.filter(x=>x[0]==='eq'&&x[1]==='owner_id'&&x[2]==='a').length,2);assert.equal(s.calls.some(x=>x.includes('device_id')),false);assert.equal(s.calls.find(x=>x[0]==='update')[1].display_name,'Test');
});
