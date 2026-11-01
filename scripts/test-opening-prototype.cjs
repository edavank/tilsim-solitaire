const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),strip=s=>s.replace(/^import .*$/gm,'').replace(/export /g,'');
test('The proposed two-slot opening can be won in 13 ordinary moves without ads or helpers',()=>{
 const p=JSON.parse(read('prototypes/opening-level.json')),cards=new Map();p.level.categories.forEach((category,index)=>{cards.set(`cat-${index}`,{id:`cat-${index}`,type:'category',word:category.name,categoryIndex:index,totalWords:category.words.length,faceUp:true});category.words.forEach(word=>cards.set(`w-${index}-${word}`,{id:`w-${index}-${word}`,type:'word',word,categoryIndex:index,faceUp:true}));});
 let state={runId:'opening-prototype',levelId:1,moves:p.level.moves,score:0,completedCats:0,isComplete:false,isFailed:false,slots:Array.from({length:2},()=>({locked:false,category:null,placedCards:[]})),columns:p.columns.map(ids=>({locked:false,cards:ids.map(id=>({...cards.get(id)}))})),drawnCards:[],deck:p.deckBottomToTop.map(id=>({...cards.get(id),faceUp:false}))};
 const safety=vm.runInNewContext(strip(read('src/utils/cardSafety.js'))+'\n;({getMovableSource,prepareJokerPlacement})');
 const game=read('app/game.js'),part=(name,next)=>game.slice(game.indexOf('  const '+name+' ='),game.indexOf('  const '+next+' ='));
 const common=game.slice(game.indexOf('  function removeFromSource('),game.indexOf('  const placeCard =')),noop=()=>{};
 const box={...safety,saveReady:true,toolActionRef:{current:false},useCallback:f=>f,gs:state,level:p.level,gameLang:'tr',lang:'tr',t:{},setGs:fn=>{state=fn(state);box.gs=state;},setHistory:noop,setCombo:noop,setSelected:noop,setFeedback:noop,showScorePopup:noop,playSound:noop,setSparkle:noop,triggerShake:noop,markCategoryCompleted:async()=>{},setTimeout:noop,comboRef:{current:0},wrongMovesRef:{current:0},combo:0,SW:390,SH:844,GAME_PAD:8};
 const api=vm.runInNewContext(common+part('placeCard','moveToColumn')+part('drawCard','handleDrawnTap')+'\n;({placeCard,drawCard})',box);
 for(const action of p.solution){if(action.type==='draw')api.drawCard();else api.placeCard(cards.get(action.card),action.source,action.column??null,action.slot);}
 assert.equal(state.isComplete,true);assert.equal(state.isFailed,false);assert.equal(state.completedCats,2);assert.equal(state.moves,5);assert.equal(p.level.advertising,false);
});
