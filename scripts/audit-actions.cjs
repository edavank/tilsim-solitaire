const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),strip=s=>s.replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'').replace(/export /g,'');
const source=strip(read('src/utils/dealSafety.js'))+'\n'+['wordPools','levelGenerator','levels'].map(n=>(n==='levels'?'const WORD_EMOJIS=EMOJI_MAP;\n':'')+strip(read('src/data/'+n+'.js'))).join('\n');
let seed=81917;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const math=Object.create(Math);math.random=random;
const data=vm.runInNewContext(source+'\n;({getLevel,generateGameState})',{Math:math});
const safety=vm.runInNewContext(strip(read('src/utils/cardSafety.js'))+'\n;({getMovableSource,prepareJokerPlacement})');const game=read('app/game.js');
const part=(name,next)=>game.slice(game.indexOf('  const '+name+' ='),game.indexOf('  const '+next+' ='));
const remove=game.slice(game.indexOf('  function removeFromSource('),game.indexOf('  const placeCard ='));
const noop=()=>{};let state,actions=0;
const box={saveReady:true,...safety,Math:math,useCallback:f=>f,toolActionRef:{current:false},setGs:f=>{state=f(state);box.gs=state;},setSelected:noop,setHistory:noop,setFeedback:noop,setSparkle:noop,setCombo:noop,playSound:noop,triggerShake:noop,showScorePopup:noop,markCategoryCompleted:async()=>{},setTimeout:noop,SW:390,SH:844,GAME_PAD:8,lang:'tr',gameLang:'tr',t:{},comboRef:{current:0},wrongMovesRef:{current:0},combo:0,gs:{},level:{categories:[]}};
const api=vm.runInNewContext(remove+part('placeCard','moveToColumn')+part('moveToColumn','moveStackToColumn')+part('moveStackToColumn','handleCardTap')+part('drawCard','handleDrawnTap')+'\n;({placeCard,moveToColumn,moveStackToColumn,drawCard})',box);
const cards=s=>[...s.deck,...s.drawnCards,...s.columns.flatMap(c=>c.cards),...s.slots.flatMap(sl=>[...(sl.category?[sl.category]:[]),...sl.placedCards])];
const allLanguages=['tr','en','de','fr','es','ar','ru'];const result={source:'working candidate after deep-audit fixes',layouts:0,actions:0,propertyViolations:[],scope:'Actual extracted game callbacks, mocked native effects; completed-slot animation timers not executed. Not a solver.'};
for(let n=0;n<500;n++){
 const language=allLanguages[n%7],id=1+Math.floor(random()*230),level=data.getLevel(id,language);state=data.generateGameState(level);box.gs=state;box.level=level;
 const allIds=cards(state).map(c=>c.id).sort().join();const remembered=cards(state).map(c=>({...c}));result.layouts++;
 for(let step=0;step<150;step++){
  const beforeMoves=state.moves;
  try{
   const k=Math.floor(random()*4);if(k===0)api.drawCard();else{
    const src=random()<.3?'drawn':'column',sourceIndex=Math.floor(random()*state.columns.length),selected=remembered[Math.floor(random()*remembered.length)];
    const target=Math.floor(random()*(k===1?state.slots.length:state.columns.length));
    if(k===1)api.placeCard(selected,src,src==='drawn'?null:sourceIndex,target);
    else if(k===2)api.moveToColumn(selected,src,sourceIndex,target);
    else{const actual=state.columns[sourceIndex].cards;const index=Math.max(0,Math.floor(random()*actual.length));const stack=actual.slice(index);if(stack.length)api.moveStackToColumn(stack,src,sourceIndex,target);}
   }
   actions++;assert.equal(cards(state).map(c=>c.id).sort().join(),allIds);assert.equal(new Set(cards(state).map(c=>c.id)).size,cards(state).length);assert.ok(state.moves>=0);assert.ok(beforeMoves-state.moves===0||beforeMoves-state.moves===1);
  }catch(e){result.propertyViolations.push({layout:n,level:id,language,step,error:e.message});break;}
 }
}
result.actions=actions;fs.mkdirSync(path.join(root,'audit'),{recursive:true});fs.writeFileSync(path.join(root,'audit/action-properties.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.propertyViolations.length)process.exitCode=1;
