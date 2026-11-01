const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const babel=process.env.BABEL_STANDALONE?require(process.env.BABEL_STANDALONE):require('@babel/core');
function compile(source){try{return process.env.BABEL_STANDALONE?babel.transform(source,{presets:['react'],plugins:['transform-modules-commonjs']}).code:babel.transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']}).code;}catch(e){throw Error(e.message);}}
function harness(file,modules){
 const hooks=[],pending=[],effectHooks=[];let cursor=0,dirty=false,tree;
 const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={createElement:(type,props,...children)=>({type,props:props||{},children}),createContext:()=>({Provider:'Provider'}),useContext:()=>({}),useState(initial){const i=cursor++;hooks[i]??={value:typeof initial==='function'?initial():initial};return[hooks[i].value,v=>{const next=typeof v==='function'?v(hooks[i].value):v;if(!Object.is(next,hooks[i].value)){hooks[i].value=next;dirty=true;}}];},useRef(v){const i=cursor++;return hooks[i]||(hooks[i]={current:v});},useCallback(fn,deps){const i=cursor++;if(!hooks[i]||!equal(hooks[i].deps,deps))hooks[i]={deps,fn};return hooks[i].fn;},useEffect(fn,deps){const i=cursor++;if(!hooks[i]||!equal(hooks[i].deps,deps)){const prev=hooks[i];const entry={deps,fn,cleanup:prev?.cleanup};hooks[i]=entry;effectHooks.push(entry);pending.push(()=>{prev?.cleanup?.();entry.cleanup=fn();});}}};react.default=react;
 const module={exports:{}};const natives={View:'View',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x,absoluteFillObject:{}},Platform:{OS:'ios'}};
 const defaults={react,'react-native':natives,'expo-av':{},'expo-router':{Stack:'Stack'},'expo-font':{useFonts:()=>[true]},'../src/constants/theme':{COLORS:{},FONTS:{},SIZES:{}},'../src/context/AuthContext':{AuthProvider:'AuthProvider'},'../src/context/LanguageContext':{LanguageProvider:'LanguageProvider'},'react-native-gesture-handler':{GestureHandlerRootView:'GestureRoot'},'../src/components/UpdatePrompt':{__esModule:true,default:'UpdatePrompt'}};
 const code=compile(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
 vm.runInNewContext(code,{module,exports:module.exports,console,setTimeout,clearTimeout,require:n=>n in modules?modules[n]:n in defaults?defaults[n]:n.startsWith('@expo-google-fonts')?{}:1});
 const component=typeof module.exports.default==='function'?module.exports.default:module.exports.AuthProvider||module.exports.LanguageProvider;
 function render(){let count=0;do{if(++count>20)throw Error('render loop');dirty=false;cursor=0;tree=component({children:'child'});while(pending.length)pending.shift()();}while(dirty);return tree;}
 const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();render();};
 render();return{render,flush,get tree(){return tree;},replayEffects(){for(const e of effectHooks){e.cleanup?.();e.cleanup=e.fn();}}};
}
const contains=(node,type)=>!!node&&typeof node==='object'&&(node.type===type||node.children?.flat(Infinity).some(c=>contains(c,type)));
test('Startup mounts UpdatePrompt even when sound initialization fails',async()=>{
 const h=harness('app/_layout.js',{'../src/utils/ads':{initAds(){}},'../src/utils/storage':{loadSettings:async()=>({languageSelected:true,bgm:false})},'../src/utils/sounds':{loadSounds:async()=>{throw Error('audio unavailable');},setVibrationEnabled(){},setSoundEnabled(){},setBgmEnabled(){}},'../src/utils/notifications':{initNotifications:async()=>false}});
 assert.equal(contains(h.tree,'UpdatePrompt'),false);await h.flush();assert.equal(contains(h.tree,'UpdatePrompt'),true);
});
test('StrictMode effect replay still finishes auth initialization',async()=>{
 let resolveInit,initializations=0;const init=new Promise(resolve=>{resolveInit=resolve;});
 const auth={initAuth:async()=>{initializations++;await init;},onAuthChange:fn=>{fn(null);return()=>{};}};
 const h=harness('src/context/AuthContext.js',{'../utils/auth':auth,'@react-native-async-storage/async-storage':{default:{getItem:async()=> 'true'}}});
 h.replayEffects();resolveInit();await h.flush();assert.equal(initializations,1);assert.equal(h.tree.props.value.authReady,true);assert.equal(h.tree.props.value.shouldShowLogin,false);
});

test('Saved language is loaded before mounting the game and auth tree',async()=>{
 let resolveSettings;const settings=new Promise(resolve=>{resolveSettings=resolve;});
 const h=harness('src/context/LanguageContext.js',{'../utils/storage':{loadSettings:()=>settings},'../i18n/translations':{getT:lang=>({lang})}});
 assert.equal(h.tree.children[0],null);resolveSettings({language:'en'});await h.flush();assert.equal(h.tree.props.value.lang,'en');assert.equal(h.tree.children[0],'child');
});

test('A Google login updates the game account even before a delayed auth notification',async()=>{
 const auth={initAuth:async()=>null,onAuthChange:fn=>{fn(null);return()=>{};},signInWithGoogle:async()=>({user:{id:'test-user'}})};
 const h=harness('src/context/AuthContext.js',{'../utils/auth':auth,'@react-native-async-storage/async-storage':{default:{getItem:async()=> 'true',setItem:async()=>{}}}});
 await h.flush();await h.tree.props.value.handleGoogleLogin();await h.flush();assert.equal(h.tree.props.value.user.id,'test-user');assert.equal(h.tree.props.value.loading,false);
});
test('An unexpected synchronous login error clears the busy state and permits a new attempt',async()=>{
 let calls=0;const auth={initAuth:async()=>null,onAuthChange:fn=>{fn(null);return()=>{};},signInWithGoogle:()=>{if(++calls===1)throw Error('temporary');return Promise.resolve({user:{id:'test-user'}});}};
 const h=harness('src/context/AuthContext.js',{'../utils/auth':auth,'@react-native-async-storage/async-storage':{default:{getItem:async()=> 'true',setItem:async()=>{}}}});
 await h.flush();const first=await h.tree.props.value.handleGoogleLogin();assert.equal(first.code,'login_failed');const second=await h.tree.props.value.handleGoogleLogin();assert.equal(second.user.id,'test-user');await h.flush();assert.equal(h.tree.props.value.loading,false);
});

test('A failed account sign-out never clears local progress or reports success',async()=>{
 let resets=0;const auth={initAuth:async()=>null,onAuthChange:fn=>{fn(null);return()=>{};},signOut:async()=>{throw Error('offline');}};
 const h=harness('src/context/AuthContext.js',{'../utils/auth':auth,'../utils/storage':{resetUserScopedData:async()=>{resets++;}},'@react-native-async-storage/async-storage':{default:{getItem:async()=> 'true'}}});
 await h.flush();const result=await h.tree.props.value.handleSignOut();assert.equal(result.success,false);assert.equal(resets,0);
});

test('Sign-out and login cannot race or change accounts during cleanup',async()=>{
 let finish,logins=0;const auth={initAuth:async()=>null,onAuthChange:fn=>{fn(null);return()=>{};},syncProgressToCloud:async()=>null,signOut:()=>new Promise(r=>{finish=r;}),signInWithGoogle:async()=>{logins++;return{user:{id:'b'}};}};
 const h=harness('src/context/AuthContext.js',{'../utils/auth':auth,'../utils/storage':{resetUserScopedData:async()=>{}},'@react-native-async-storage/async-storage':{default:{getItem:async()=> 'true'}}});
 await h.flush();const signingOut=h.tree.props.value.handleSignOut();await h.flush();const login=await h.tree.props.value.handleGoogleLogin();assert.equal(login.code,'busy');assert.equal(logins,0);finish();assert.equal((await signingOut).success,true);
});

test('Duplicate account deletion taps start only one deletion request',async()=>{
 let finish,deletions=0;const auth={initAuth:async()=>null,onAuthChange:fn=>{fn(null);return()=>{};},deleteAccount:()=>{deletions++;return new Promise(r=>{finish=r;});}};
 const h=harness('src/context/AuthContext.js',{'../utils/auth':auth,'@react-native-async-storage/async-storage':{default:{getItem:async()=> 'true'}}});
 await h.flush();const first=h.tree.props.value.handleDeleteAccount();await h.flush();assert.equal((await h.tree.props.value.handleDeleteAccount()).success,false);assert.equal(deletions,1);finish({success:true});assert.equal((await first).success,true);
});

test('A banner connects when ad initialization finishes late without remounting the screen',async()=>{
 let available=null,listener;const h=harness('src/components/AdBanner.js',{'../utils/ads':{getBannerComponent:()=>available,subscribeAdAvailability:fn=>{listener=fn;fn(false);return()=>{};}},'react-native':{View:'View',AppState:{currentState:'active',addEventListener:()=>({remove(){}})}}});
 assert.equal(contains(h.tree,'BannerAd'),false);available={BannerAd:'BannerAd',BannerAdSize:{ANCHORED_ADAPTIVE_BANNER:'adaptive'},unitId:'test'};listener(true);h.render();assert.equal(contains(h.tree,'BannerAd'),true);
});

test('An unavailable leaderboard shows an empty state rather than invented player scores',async()=>{
 const h=harness('app/leaderboard.js',{'../src/utils/storage':{loadProgress:async()=>({coins:500})},'../src/context/LanguageContext':{useLang:()=>({lang:'tr'})},'../src/utils/leaderboardService':{fetchLeaderboard:async()=>({data:null,error:'offline'}),getUserRank:async()=>({rank:null})}});
 await h.flush();const text=JSON.stringify(h.tree);assert.ok(text.includes('Henüz veri yok'));assert.equal(text.includes('Efsun'),false);assert.equal(text.includes('12850'),false);
});

test('Timed loss screen never offers ineffective move/coin purchases',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../app/game.js'),'utf8');const a=source.indexOf('function LevelFailedOverlay('),b=source.indexOf('/* ── Main Game Screen',a);
 const module={exports:{}};const React={createElement:(type,props,...children)=>({type,props:props||{},children})};
 vm.runInNewContext(compile(source.slice(a,b)+'\nmodule.exports=LevelFailedOverlay;'),{module,exports:module.exports,React,View:'View',Text:'Text',Image:'Image',TouchableOpacity:'Button',LinearGradient:'Gradient',MaterialIcons:'Icon',OWL_HAPPY:1,ov:{},StyleSheet:{absoluteFillObject:{}},COLORS:{},FONTS:{}});
 const fn=()=>{},props={t:{},onAddMovesAd:fn,onAddMovesCoin:fn,onShuffle:fn,onReplay:fn,onHome:fn};
 const buttons=node=>!node||typeof node!=='object'?0:(node.type==='Button'?1:0)+(node.children||[]).flat(Infinity).reduce((n,x)=>n+buttons(x),0);
 assert.equal(buttons(module.exports({...props,isTimed:true})),2);assert.equal(buttons(module.exports({...props,isTimed:false})),5);
});
