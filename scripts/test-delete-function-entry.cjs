const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const babel=process.env.BABEL_STANDALONE?require(process.env.BABEL_STANDALONE):require('@babel/core');
const {createDeleteAccountHandler}=vm.runInNewContext(read('supabase/functions/_shared/deleteAccountHandler.js').replace(/export /g,'')+'\n({createDeleteAccountHandler})',{Response});
function entry(configured=true) {
 let handler;const calls=[];
 const createClient=(url,key,options)=>({auth:{getUser:async token=>{calls.push(['verify',token]);return{data:{user:{id:'verified-user'}}};},admin:{deleteUser:async(id,soft)=>{calls.push(['delete',id,soft]);return{data:{user:{id}}};}}}});
 const source=read('supabase/functions/delete-account/index.ts');
 let code;try{code=process.env.BABEL_STANDALONE?babel.transform(source,{filename:'index.js',plugins:['transform-modules-commonjs']}).code:babel.transformSync(source,{filename:'index.js',configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code;}catch(e){throw Error(e.message);}
 const context={exports:{},Deno:{env:{get:key=>configured?(key==='SUPABASE_URL'?'https://test.example.invalid':'test-secret'):undefined},serve:fn=>{handler=fn;}},require:name=>name.startsWith('npm:')?{createClient}:{createDeleteAccountHandler}};
 vm.runInNewContext(code,context);return{calls,get handler(){return handler;}};
}
test('The deployed entry verifies the request token before hard-deleting exactly that user',async()=>{
 const h=entry();const response=await h.handler(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer test-token'},body:'{"userId":"victim"}'}));assert.equal(response.status,200);assert.deepEqual(h.calls,[['verify','test-token'],['delete','verified-user',false]]);
});
test('Missing server configuration fails closed rather than starting an unprotected deletion handler',()=>{assert.throws(()=>entry(false),/configuration missing/);});
test('Preflight and unsupported methods never perform verification or deletion',async()=>{
 const h=entry();assert.equal((await h.handler(new Request('https://example.invalid',{method:'OPTIONS'}))).status,204);assert.equal((await h.handler(new Request('https://example.invalid'))).status,405);assert.equal(h.calls.length,0);
});
