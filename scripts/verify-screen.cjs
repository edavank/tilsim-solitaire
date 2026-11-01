// JS render smoke test. Native UI, network and effects are mocked, not a device test.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let transform;
if(process.env.BABEL_STANDALONE){const babel=require(process.env.BABEL_STANDALONE);transform=s=>babel.transform(s,{presets:['react'],plugins:['transform-modules-commonjs']}).code;}
else {const babel=require('@babel/core');transform=s=>babel.transformSync(s,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-react-jsx','@babel/plugin-transform-modules-commonjs']}).code;}
const noop=()=>{};
const react={useState:x=>[typeof x==='function'?x():x,noop],useCallback:f=>f,useEffect:noop,useRef:x=>({current:x}),memo:f=>f,createElement:()=>({}),Fragment:'Fragment'};react.default=react;
const constants=new Proxy({},{get:()=> 'x'});
const level={id:27,moves:100,hints:1,undos:1,categories:[{name:'Meyve',words:['Elma']}],totalSlots:3,lockedSlots:0,columns:[{depth:1},{depth:1}]};
const gs={runId:'smoke-test',levelId:27,moves:100,slots:Array.from({length:3},()=>({locked:false,category:null,placedCards:[]})),columns:Array.from({length:5},()=>({locked:false,cards:[]})),deck:[],drawnCards:[],isComplete:false,isFailed:false};
class Value{interpolate(){return 0;}setValue(){}}
const completion=vm.runInNewContext(fs.readFileSync(path.join(root,'src/utils/completion.js'),'utf8').replace(/^import .*$/gm,'').replace(/export /g,'')+'\n;({calculateCompletion})');
const mods={react,'react-native':{Dimensions:{get:()=>({width:390,height:844})},StyleSheet:{create:x=>x,absoluteFillObject:{}},Animated:{Value},Platform:{OS:'ios'}},'expo-router':{useLocalSearchParams:()=>({level:'27'}),router:{}},
  '../src/constants/theme':{COLORS:constants,FONTS:constants,SIZES:constants,CATEGORY_COLORS:['blue'],TOOL_COLORS:constants},
  '../src/data/levels':{getLevel:()=>level,generateGameState:()=>gs},'../src/utils/completion':completion,
  '../src/utils/responsive':{fs:x=>x,getGameLayout:()=>({sw:390,sh:844,cardW:60,cardH:80,colGap:4,padding:8,overlap:-60})},
  '../src/context/LanguageContext':{useLang:()=>({lang:'tr',t:{}})},'../src/context/AuthContext':{useAuth:()=>({user:null})}};
const moduleObject={exports:{}};
vm.runInNewContext(transform(fs.readFileSync(path.join(root,'app/game.js'),'utf8')),{module:moduleObject,exports:moduleObject.exports,require:n=>mods[n]||{},console,setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop});
moduleObject.exports.default();console.log('GameScreen initial JS render passed (native modules mocked).');
