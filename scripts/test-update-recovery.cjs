const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const babel=process.env.BABEL_STANDALONE?require(process.env.BABEL_STANDALONE):require('@babel/core');
const source=fs.readFileSync(path.join(__dirname,'../src/components/UpdatePrompt.js'),'utf8');
const code=process.env.BABEL_STANDALONE?babel.transform(source,{presets:['react'],plugins:['transform-modules-commonjs']}).code:babel.transformSync(source,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']}).code;
function harness(){
 const hooks=[],timers=[],listeners=new Set();let cursor=0,queued=[],dirty=false,tree,checks=0,reloads=0,pending=false,route='/game',reloadFail=false;
 const depsEqual=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={createElement(type,props,...children){return{type,props:props||{},children};},useState(initial){const i=cursor++;if(!hooks[i])hooks[i]={value:typeof initial==='function'?initial():initial};return[hooks[i].value,v=>{const next=typeof v==='function'?v(hooks[i].value):v;if(!Object.is(next,hooks[i].value)){hooks[i].value=next;dirty=true;}}];},useRef(initial){const i=cursor++;return hooks[i]||(hooks[i]={current:initial});},useCallback(fn,deps){const i=cursor++;if(!hooks[i]||!depsEqual(hooks[i].deps,deps))hooks[i]={deps,fn};return hooks[i].fn;},useEffect(fn,deps){const i=cursor++;if(!hooks[i]||!depsEqual(hooks[i].deps,deps)){const old=hooks[i];hooks[i]={deps,cleanup:old?.cleanup};queued.push(()=>{old?.cleanup?.();hooks[i].cleanup=fn();});}}};react.default=react;
 class Value{constructor(){} }
 const anim={start(cb){cb?.();}};
 const rn={View:'View',Text:'Text',TouchableOpacity:'Button',ActivityIndicator:'Spinner',StyleSheet:{create:x=>x},Animated:{Value,View:'AnimatedView',parallel:()=>anim,timing:()=>anim,spring:()=>anim},AppState:{currentState:'active',addEventListener(_,fn){listeners.add(fn);return{remove(){listeners.delete(fn);}};}}};
 const updates={isEnabled:true,useUpdates:()=>({isUpdatePending:pending}),checkForUpdateAsync:async()=>{checks++;return{isAvailable:true};},fetchUpdateAsync:async()=>({isNew:true}),reloadAsync:async()=>{reloads++;if(reloadFail)throw Error('reload failed');}};
 const module={exports:{}};
 vm.runInNewContext(code,{module,exports:module.exports,__DEV__:false,setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},Date,require(n){return{react,'react-native':rn,'expo-linear-gradient':{LinearGradient:'Gradient'},'@expo/vector-icons':{MaterialIcons:'Icon'},'expo-updates':updates,'expo-router':{usePathname:()=>route},'../utils/ads':{isAdFlowActive:()=>false},'../constants/theme':{COLORS:{},FONTS:{}},'../context/LanguageContext':{useLang:()=>({lang:'tr'})}}[n]||{};}});
 function render(){let n=0;do{if(++n>30)throw Error('render loop');dirty=false;cursor=0;queued=[];tree=module.exports.default();for(const fn of queued)fn();}while(dirty);return tree;}
 const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();render();};
 const find=(n,type)=>!n||typeof n!=='object'?null:n.type===type?n:n.children?.flat(Infinity).map(x=>find(x,type)).find(Boolean);
 const buttons=()=>{const result=[];const walk=n=>{if(!n||typeof n!=='object')return;if(n.type==='Button')result.push(n);n.children?.flat(Infinity).forEach(walk);};walk(tree);return result;};
 render();return{render,flush,buttons,find,get tree(){return tree;},get checks(){return checks;},get reloads(){return reloads;},set route(v){route=v;},set pending(v){pending=v;},set reloadFail(v){reloadFail=v;},timers};
}
test('downloaded update waits until home; never reloads an active board',async()=>{const h=harness();for(const fn of h.timers)fn();await h.flush();assert.equal(h.tree,null);assert.equal(h.reloads,0);h.route='/';h.render();assert.ok(h.tree);assert.equal(h.buttons().length,2);assert.equal(h.checks,1);await h.buttons()[1].props.onPress();assert.equal(h.reloads,1);});
test('native startup download is offered at home even without a new fetch',async()=>{const h=harness();h.pending=true;h.route='/';h.render();assert.ok(h.tree);assert.equal(h.reloads,0);});
test('Later keeps the game usable and does not reopen on a route change',async()=>{const h=harness();h.pending=true;h.route='/';h.render();h.buttons()[0].props.onPress();h.render();assert.equal(h.tree,null);h.route='/game';h.render();h.route='/';h.render();assert.equal(h.tree,null);});
test('failed reload restores actionable buttons instead of blocking the game',async()=>{const h=harness();h.pending=true;h.route='/';h.render();h.reloadFail=true;await h.buttons()[1].props.onPress();h.render();assert.equal(h.buttons().length,2);assert.ok(JSON.stringify(h.tree).includes('Güncelleme uygulanamadı'));});
