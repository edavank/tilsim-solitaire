const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');const root=path.resolve(__dirname,'..');const strip=s=>s.replace(/^import .*$/gm,'').replace(/^export \{.*$/gm,'').replace(/export /g,'');
const source=strip(fs.readFileSync(path.join(root,'src/utils/dealSafety.js'),'utf8'))+'\n'+['wordPools','levelGenerator','levels'].map(n=>(n==='levels'?'const WORD_EMOJIS = EMOJI_MAP;\n':'')+strip(fs.readFileSync(path.join(root,'src/data/'+n+'.js'),'utf8'))).join('\n');
let seed=1;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};const math=Object.create(Math);math.random=random;
const api=vm.runInNewContext(source+'\n;({getLevel,generateGameState,WORD_POOLS,getTotalLevels})',{Math:math});
const result={sourceCommit:'working candidate based on 9d71bdaec4b65888242d0389ce061782c7824aa1',deals:0,invalidCardCounts:0,duplicateIds:0,provenInitialLocks:0,examples:[],overlaps:[],languageStats:[]};
for(const lang of Object.keys(api.WORD_POOLS)){
 let locks=0,overlaps=0;
 for(let id=1;id<=230;id++){
  const level=api.getLevel(id,lang);const words=new Map();
  for(const cat of level.categories)for(const w of cat.words){if(words.has(w)){overlaps++;result.overlaps.push({lang,level:id,word:w,categories:[words.get(w),cat.name]});}words.set(w,cat.name);}
  for(let attempt=Number(process.argv[3]||1);attempt<Number(process.argv[3]||1)+Number(process.argv[4]||100);attempt++){
   const rngSeed=(id*100003+attempt*7919+lang.charCodeAt(0)*97)>>>0;seed=rngSeed;const g=api.generateGameState(level);result.deals++;
   const cards=[...g.deck,...g.drawnCards,...g.columns.flatMap(c=>c.cards)];
   if(cards.length!==level.categories.reduce((s,c)=>s+c.words.length+1,0))result.invalidCardCounts++;
   if(new Set(cards.map(c=>c.id)).size!==cards.length)result.duplicateIds++;
   const cols=g.columns.filter(c=>!c.locked),tops=cols.map(c=>c.cards.at(-1));
   const locked=cols.length>0&&tops.every(c=>c?.type==='word'&&!c.isJoker)&&new Set(tops.map(c=>c.categoryIndex)).size===cols.length&&g.deck.every(c=>c.type==='word')&&g.slots.every(s=>!s.category)&&g.columns.flatMap(c=>c.cards).filter(c=>c.type==='category'&&!c.faceUp).length===level.categories.length;
   if(locked){locks++;result.provenInitialLocks++;if(result.examples.length<10)result.examples.push({lang,level:id,rngSeed,game:JSON.parse(JSON.stringify(g)),reason:'All category cards buried; every playable column topped by a distinct word category; no empty column; deck contains only words. Normal draws/recycles/column moves cannot expose any category.'});}
  }
 }
 result.languageStats.push({lang,levels:230,deals:230*Number(process.argv[4]||100),provenInitialLocks:locks,overlappingWords:overlaps});
}
fs.mkdirSync(path.join(root,'audit'),{recursive:true});fs.writeFileSync(path.join(root,'audit/'+(process.argv[2]||'deal-properties-after')+'.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,examples:result.examples.map(({game,...x})=>({...x,topCards:game.columns.filter(c=>!c.locked).map(c=>c.cards.at(-1).word)})),overlaps:result.overlaps.slice(0,10)},null,2));
