const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function harness(platform, options={}) {
 let now=100000,sequence=0;const timers=new Map(),ads=[],alerts=[],appListeners=[];
 const app={currentState:'active',addEventListener(_,fn){appListeners.push(fn);return{remove(){}};}};
 const events={LOADED:'loaded',CLOSED:'closed',ERROR:'error'};
 const rewards={LOADED:'rewarded_loaded',EARNED_REWARD:'earned_reward'};
 let initCount=0,createFailures=options.createFailures||0;
 const factory=kind=>({createForAdRequest(){
   if(kind==='rewarded' && createFailures-->0)throw Error('create failed');
   const listeners=new Map();
   const ad={kind,loads:0,shows:0,addAdEventListener(type,fn){
     if(kind==='rewarded'&&type==='loaded')throw Error('wrong event enum');
     if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);
     return()=>listeners.get(type).delete(fn);
   },load(){this.loads++;if(options.loadThrow&&kind==='rewarded')throw Error('load failed');},
   show(){this.shows++;return options.showReject?Promise.reject(Error('show failed')):Promise.resolve();},
   emit(type,arg){for(const fn of [...(listeners.get(type)||[])])fn(arg);}};
   ads.push(ad);return ad;
 }});
 const sdk={default:()=>({initialize:async()=>{initCount++;if(initCount<= (options.initFailures||0))throw Error('init failed');}}),
  InterstitialAd:factory('interstitial'),RewardedAd:factory('rewarded'),RewardedInterstitialAd:factory('ri'),AdEventType:events,RewardedAdEventType:rewards};
 class ClockDate extends Date{static now(){return now;}}
 const context=vm.createContext({__DEV__:false,Platform:{OS:platform,select:x=>x[platform]},AppState:app,
  Alert:{alert(...a){alerts.push(a);}},loadSettings:async()=>({language:'tr'}),console:{log(){}},Date:ClockDate,
  setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
  setInterval(){return 0;},clearInterval(){},
  require(name){if(name==='react-native-google-mobile-ads')return sdk;
   if(name==='expo-constants')return{default:{appOwnership:'standalone'}};
   if(name==='expo-tracking-transparency')return{requestTrackingPermissionsAsync:async()=>({status:'denied'})};
   if(name==='expo-updates')return{};throw Error(name);}});
 let source=fs.readFileSync(path.join(__dirname,'../src/utils/ads.js'),'utf8').replace(/^import .*;$/gm,'').replace(/export /g,'');
 vm.runInContext(source,context);
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
 return {context,ads,alerts,events,rewards,timers,flush,get initCount(){return initCount;},
  latest(){return ads.filter(x=>x.kind==='rewarded').at(-1);},
  state(s){app.currentState=s;for(const fn of appListeners)fn(s);},
  async tick(ms){const target=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}now=target;await flush();}};
}
for(const platform of ['android','ios']) {
 test(`${platform}: initialization failure recovers without restarting`,async()=>{
  const h=harness(platform,{initFailures:1});await h.context.initAds();assert.equal(h.initCount,1);await h.tick(10000);assert.equal(h.initCount,2);assert.equal(h.latest().loads,1);
 });
 test(`${platform}: a failed load retries within the same user request`,async()=>{
  const h=harness(platform);await h.context.initAds();const p=h.context.showRewarded();const old=h.latest();old.emit(h.events.ERROR,{code:'network',message:'offline'});await h.tick(5000);const ad=h.latest();assert.notEqual(ad,old);ad.emit(h.rewards.LOADED);assert.equal(ad.shows,1);ad.emit(h.rewards.EARNED_REWARD,{amount:1});ad.emit(h.events.CLOSED);assert.equal((await p).success,true);assert.equal(h.alerts.length,0);
 });
 test(`${platform}: stalled load resets, retries, and does not show an unsolicited ad`,async()=>{
  const h=harness(platform);await h.context.initAds();const old=h.latest();const p=h.context.showRewarded();await h.tick(15000);assert.equal(h.alerts.length,1);h.alerts[0][2][0].onPress();assert.equal((await p).handled,true);await h.tick(10000);const ad=h.latest();assert.notEqual(ad,old);old.emit(h.rewards.LOADED);assert.equal(old.shows,0);ad.emit(h.rewards.LOADED);assert.equal(ad.shows,0);assert.equal(h.context.isRewardedReady(),true);
 });
 test(`${platform}: explicit retry recovers without a second game action`,async()=>{
  const h=harness(platform);await h.context.initAds();const p=h.context.showRewarded();await h.tick(15000);h.alerts[0][2][1].onPress();await h.flush();await h.tick(10000);const ad=h.latest();ad.emit(h.rewards.LOADED);ad.emit(h.rewards.EARNED_REWARD,{amount:1});ad.emit(h.events.CLOSED);assert.equal((await p).success,true);
 });
 test(`${platform}: background cancels the wait, foreground prepares only`,async()=>{
  const h=harness(platform);await h.context.initAds();const p=h.context.showRewarded();h.state('background');assert.equal((await p).reason,'background');h.state('active');const ad=h.latest();ad.emit(h.rewards.LOADED);assert.equal(ad.shows,0);
 });
 test(`${platform}: duplicate taps cannot present twice or grant twice`,async()=>{
  const h=harness(platform);await h.context.initAds();const ad=h.latest();ad.emit(h.rewards.LOADED);const p=h.context.showRewarded();assert.equal((await h.context.showRewarded()).reason,'busy');ad.emit(h.rewards.EARNED_REWARD,{amount:1});ad.emit(h.events.CLOSED);ad.emit(h.events.CLOSED);assert.equal((await p).success,true);assert.equal(ad.shows,1);
 });
 test(`${platform}: factory exception and synchronous load exception recover`,async()=>{
  const h=harness(platform,{createFailures:1});await h.context.initAds();assert.equal(h.context.getAdDiagnostics().rewardedLoading,false);await h.tick(5000);assert.equal(h.latest().loads,1);
  const j=harness(platform,{loadThrow:true});await j.context.initAds();assert.equal(j.context.getAdDiagnostics().rewardedLoading,false);
 });
 test(`${platform}: rejected presentation offers retry, skipped ad gives no reward`,async()=>{
  const h=harness(platform,{showReject:true});await h.context.initAds();h.latest().emit(h.rewards.LOADED);const p=h.context.showRewarded();await h.flush();assert.equal(h.alerts.length,1);h.alerts[0][2][0].onPress();assert.equal((await p).success,false);
  const j=harness(platform);await j.context.initAds();j.latest().emit(j.rewards.LOADED);const q=j.context.showRewarded();j.latest().emit(j.events.CLOSED);assert.equal((await q).reason,'dismissed');assert.equal(j.alerts.length,0);
 });
 test(`${platform}: expired cached ad reloads without presenting old data`,async()=>{
  const h=harness(platform);await h.context.initAds();const old=h.latest();old.emit(h.rewards.LOADED);await h.tick(50*60*1000);assert.equal(h.context.isRewardedReady(),false);const p=h.context.showRewarded();const ad=h.latest();assert.notEqual(ad,old);ad.emit(h.rewards.LOADED);assert.equal(old.shows,0);ad.emit(h.events.CLOSED);await p;
 });
}
