const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app/game.js'),'utf8');
const start=source.indexOf('  useEffect(() => {',source.indexOf('  // Timer')),end=source.indexOf('  // Play win/lose sounds',start);
function clock(isTimed=true) {
 let now=1000,interval,cleanup;const result={elapsed:0,time:60,failed:false};
 const box={saveReady:true,gs:{isComplete:false,isFailed:false},clockSuspended:false,isTimed,timeRemaining:60,
  clockPauseStartedRef:{current:null},startTimeRef:{current:1000},timedEndRef:{current:null},pauseRemainRef:{current:null},toolActionRef:{current:false},
  Date:{now:()=>now},useEffect:f=>{cleanup=f();},setInterval:fn=>{interval=fn;return 1;},clearInterval:()=>{interval=null;},
  setElapsedTime:v=>{result.elapsed=v;},setTimeRemaining:v=>{result.time=v;},setGs:fn=>{result.failed=fn({}).isFailed;},
 };
 const render=()=>{cleanup?.();vm.runInNewContext(source.slice(start,end),box);};
 render();return{box,result,render,advance(ms){now+=ms;interval?.();}};
}
test('A rewarded-ad or tutorial pause consumes neither timed seconds nor elapsed-play time',()=>{
 const c=clock();c.advance(10000);assert.equal(c.result.time,50);assert.equal(c.result.elapsed,10);
 c.box.clockSuspended=true;c.render();c.advance(90000);assert.equal(c.result.failed,false);assert.equal(c.result.time,50);
 c.box.clockSuspended=false;c.render();c.advance(1000);assert.equal(c.result.time,49);assert.equal(c.result.elapsed,11);
});
test('Repeated pause renders do not count overlapping pause time twice',()=>{
 const c=clock();c.advance(5000);c.box.clockSuspended=true;c.render();c.advance(20000);c.render();c.advance(30000);
 c.box.clockSuspended=false;c.render();c.advance(1000);assert.equal(c.result.elapsed,6);assert.equal(c.result.time,54);
});
test('Classic elapsed time also excludes the pause duration',()=>{
 const c=clock(false);c.advance(5000);c.box.clockSuspended=true;c.render();c.advance(40000);c.box.clockSuspended=false;c.render();c.advance(1000);assert.equal(c.result.elapsed,6);
});
test('Unpaused timed games still expire according to wall time',()=>{
 const c=clock();c.advance(61000);assert.equal(c.result.failed,true);assert.equal(c.result.time,0);
});
test('Reward presentation stays paused even when the SDK hides its loading indicator',async()=>{
 const a=source.indexOf('  const showGameRewarded ='),b=source.indexOf('  const acquireTool =',a);
 let finish;const flags=[];const fn=vm.runInNewContext(source.slice(a,b)+'\nshowGameRewarded',{useCallback:f=>f,setAdInProgress:v=>flags.push(v),showRewarded:cb=>{cb(false);return new Promise(r=>{finish=r;});}});
 const pending=fn(()=>{});assert.deepEqual(flags,[true]);finish({success:true});await pending;assert.deepEqual(flags,[true,false]);
});
