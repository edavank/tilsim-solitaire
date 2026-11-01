const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/utils/auth.js'),'utf8').replace(/^import .*$/gm,'').replace(/export /g,'');
const session={access_token:'access-test',refresh_token:'refresh-test',user:{id:'test-user',email:'test@example.invalid',app_metadata:{provider:'google'}}};
const url='tilsim-solitaire://#access_token=access-test&refresh_token=refresh-test';
function harness(options={}){
 const testSession={...session,user:{...session.user,email:options.qaEmail||session.user.email}};let saved=null,authCallback,readCount=0,deletedMarker=null;const urlListeners=new Set(),appListeners=[],calls={browser:0,oauth:0,set:0,exchange:0,start:0,stop:0,delete:0,cleanup:0,prepare:0,password:0};
 const auth={signInWithPassword:async()=>{calls.password++;saved=testSession;return{data:{session:saved}};},signOut:async()=>{if(options.signOutThrows)throw Error('offline');if(options.signOutError)return {error:{message:'offline'}};saved=null;return{error:null};},onAuthStateChange(fn){authCallback=fn;return{data:{subscription:{unsubscribe(){}}}};},getSession:async()=>{readCount++;if(options.initialRead&&readCount===1)return options.initialRead;return{data:{session:options.persistMissing&&calls.set?saved=null:saved},error:null};},signInWithOAuth:async()=>{calls.oauth++;return{data:{url:'https://accounts.example.invalid/oauth'}};},setSession:async()=>{calls.set++;if(options.setError)return{error:{message:options.setError}};saved=options.noSession?null:testSession;if(options.emitUnverified)authCallback('SIGNED_IN',saved);return{data:{session:saved}};},exchangeCodeForSession:async()=>{calls.exchange++;saved=testSession;return{data:{session:saved}};},startAutoRefresh(){calls.start++;},stopAutoRefresh(){calls.stop++;}};
 const emit=url=>{for(const fn of urlListeners)fn({url});};
 const web={maybeCompleteAuthSession(){},openAuthSessionAsync:async()=>{calls.browser++;if(options.browser)return options.browser({emit,calls});return{type:'success',url:options.url||url};}};
 const context=vm.createContext({URLSearchParams,process:{env:{EXPO_PUBLIC_AUDIT_QA:options.qa?'1':'0'}},console:{log(){}},setTimeout,clearTimeout,getPendingAccountDeletion:async()=>deletedMarker,rememberAccountDeletion:async accountId=>{deletedMarker={accountId};},clearPendingAccountDeletion:async()=>{deletedMarker=null;},resetUserScopedData:async()=>{calls.cleanup++;if(options.cleanupError)throw Error('disk failure');},prepareAccountLocalData:async()=>{calls.prepare++;if(options.prepareError)throw Error('cannot preserve old account');},createCloudSync:()=>()=>{},loadProgress:async()=>({coins:500}),loadCloudJournal:async()=>null,saveCloudJournal:async()=>{},loadXP:async()=>({xp:0}),loadLevelStars:async()=>({}),updateProgress:async()=>{},require(name){if(name==='./supabase')return{default:{auth,functions:{invoke:async()=>{calls.delete++;if(options.deleteError)return{error:Error('server unavailable')};return{data:{success:true,deletedUserId:options.wrongDeleteUser?'wrong':'test-user'}};}}}};if(name==='expo-auth-session')return{makeRedirectUri:()=> 'tilsim-solitaire://'};if(name==='expo-web-browser')return web;if(name==='expo-constants')return{default:{appOwnership:'standalone'}};if(name==='expo-linking')return{addEventListener(_,fn){urlListeners.add(fn);return{remove(){urlListeners.delete(fn);}};}};if(name==='react-native')return{Platform:{OS:'android'},AppState:{currentState:'active',addEventListener(_,fn){appListeners.push(fn);return{remove(){}};}}};throw Error(name);}});
 const api=vm.runInContext(source+'\n;({initAuth,signInWithGoogle,signInWithTestAccount,signOut,deleteAccount,getUser,getAuthDiagnostics})',context);
 return{api,calls,emit,get subscribed(){return !!authCallback;},get listenerCount(){return urlListeners.size;},authEvent(event,value){authCallback(event,value);},appEvent(state){appListeners.forEach(fn=>fn(state));}};
}
test('Google login initializes the account system before the first attempt',async()=>{const h=harness();const result=await h.api.signInWithGoogle();assert.equal(result.user.id,'test-user');assert.equal(h.calls.browser,1);assert.equal(h.api.getUser().id,'test-user');assert.equal(h.listenerCount,0);});
test('Concurrent Google taps share one browser and session save',async()=>{const h=harness();const results=await Promise.all([h.api.signInWithGoogle(),h.api.signInWithGoogle()]);assert.ok(results.every(r=>r.user.id==='test-user'));assert.equal(h.calls.browser,1);assert.equal(h.calls.set,1);});
test('A browser success without credentials never becomes a signed-in game',async()=>{const h=harness({url:'tilsim-solitaire://'});assert.equal((await h.api.signInWithGoogle()).code,'no_token');assert.equal(h.api.getUser(),null);});
test('A null session is not reported as a successful login',async()=>{const h=harness({noSession:true});const result=await h.api.signInWithGoogle();assert.equal(result.code,'no_session');assert.equal(h.api.getUser(),null);});
test('A saved session must be readable before reporting success',async()=>{const h=harness({persistMissing:true});assert.equal((await h.api.signInWithGoogle()).code,'session_not_persisted');assert.equal(h.api.getUser(),null);});
test('An Android dismiss followed by a delayed callback completes the same attempt',async()=>{const h=harness({browser:async({emit})=>{setTimeout(()=>emit(url),5);return{type:'dismiss'};}});const result=await h.api.signInWithGoogle();assert.equal(result.user.id,'test-user');assert.equal(h.calls.browser,1);assert.equal(h.listenerCount,0);});
test('Explicit cancellation does not open a new browser or invent a session',async()=>{const h=harness({browser:async()=>({type:'cancel'})});assert.equal((await h.api.signInWithGoogle()).code,'cancelled');assert.equal(h.calls.set,0);assert.equal(h.calls.browser,1);});
test('A code callback uses the PKCE exchange instead of requiring a hash token',async()=>{const h=harness({url:'tilsim-solitaire://?code=code-test'});assert.equal((await h.api.signInWithGoogle()).user.id,'test-user');assert.equal(h.calls.exchange,1);assert.equal(h.calls.set,0);});
test('An unrelated callback URL is rejected before saving credentials',async()=>{const h=harness({url:'other-app://#access_token=access-test&refresh_token=refresh-test'});assert.equal((await h.api.signInWithGoogle()).code,'wrong_redirect');assert.equal(h.calls.set,0);});
test('A late initial session read cannot overwrite a newer signed-in event',async()=>{let resolveRead;const initialRead=new Promise(resolve=>{resolveRead=resolve;});const h=harness({initialRead});const pending=h.api.initAuth();for(let i=0;i<10&&!h.subscribed;i++)await Promise.resolve();h.authEvent('SIGNED_IN',session);resolveRead({data:{session:null}});await pending;assert.equal(h.api.getUser().id,'test-user');});
test('Session refresh follows foreground state and installs its listener only once',async()=>{const h=harness();await h.api.initAuth();await h.api.initAuth();assert.equal(h.calls.start,1);h.appEvent('background');assert.equal(h.calls.stop,1);h.appEvent('active');assert.equal(h.calls.start,2);});
test('Support diagnostics redact callback tokens and email addresses',async()=>{const h=harness({setError:'failure user@example.invalid ?access_token=secret-value&refresh_token=other-secret'});await h.api.signInWithGoogle();const diagnostics=JSON.stringify(h.api.getAuthDiagnostics());assert.equal(diagnostics.includes('secret-value'),false);assert.equal(diagnostics.includes('other-secret'),false);assert.equal(diagnostics.includes('user@example.invalid'),false);assert.ok(diagnostics.includes('[redacted]'));});

test('An SDK sign-in event is not shown as Connected before session persistence is verified',async()=>{
 const h=harness({persistMissing:true,emitUnverified:true});assert.equal((await h.api.signInWithGoogle()).code,'session_not_persisted');assert.equal(h.api.getUser(),null);
});

for(const options of [{signOutError:true},{signOutThrows:true}]) test('Failed sign-out preserves the confirmed account: '+Object.keys(options)[0],async()=>{
 const h=harness(options);await h.api.signInWithGoogle();await assert.rejects(h.api.signOut());assert.equal(h.api.getUser().id,'test-user');
});
test('Successful sign-out clears the game account',async()=>{
 const h=harness();await h.api.signInWithGoogle();await h.api.signOut();assert.equal(h.api.getUser(),null);
});

test('An unconfirmed server deletion leaves the signed-in account and local progress untouched',async()=>{
 for(const options of [{deleteError:true},{wrongDeleteUser:true}]){const h=harness(options);await h.api.signInWithGoogle();const result=await h.api.deleteAccount();assert.equal(result.success,false);assert.equal(h.calls.cleanup,0);assert.equal(h.api.getUser().id,'test-user');}
});
test('A confirmed deletion clears local data only after the server confirms the same account',async()=>{
 const h=harness();await h.api.signInWithGoogle();assert.equal((await h.api.deleteAccount()).success,true);assert.equal(h.calls.delete,1);assert.equal(h.calls.cleanup,1);assert.equal(h.api.getUser(),null);
});
test('A failed local deletion cleanup is retried without deleting the server account twice',async()=>{
 const options={cleanupError:true},h=harness(options);await h.api.signInWithGoogle();assert.equal((await h.api.deleteAccount()).success,false);options.cleanupError=false;assert.equal((await h.api.deleteAccount()).success,true);assert.equal(h.calls.delete,1);assert.equal(h.calls.cleanup,2);
});
test('A new account is not shown as connected when the old account backup cannot be preserved',async()=>{
 const h=harness({prepareError:true});const result=await h.api.signInWithGoogle();assert.ok(result.error);assert.equal(h.api.getUser(),null);
});

test('Production builds cannot use the audit password login',async()=>{
 const h=harness();assert.equal((await h.api.signInWithTestAccount('tilsim.qa.test@example.invalid','test-only')).code,'qa_only');assert.equal(h.calls.password,0);
});
test('Audit password login accepts only disposable test addresses and verifies persistence',async()=>{
 const h=harness({qa:true,qaEmail:'tilsim.qa.test@example.invalid'});assert.equal((await h.api.signInWithTestAccount('real@example.com','test-only')).code,'qa_account_required');assert.equal(h.calls.password,0);assert.equal((await h.api.signInWithTestAccount('tilsim.qa.test@example.invalid','test-only')).user.id,'test-user');assert.equal(h.calls.password,1);
});
test('The audit build refuses to delete a normal signed-in profile',async()=>{
 const h=harness({qa:true});await h.api.signInWithGoogle();assert.equal((await h.api.deleteAccount()).code,'QA_ACCOUNT_REQUIRED');assert.equal(h.calls.delete,0);assert.equal(h.calls.cleanup,0);
});
test('The audit build can delete its designated disposable test profile',async()=>{
 const h=harness({qa:true,qaEmail:'tilsim.qa.test@example.invalid'});await h.api.signInWithTestAccount('tilsim.qa.test@example.invalid','test-only');assert.equal((await h.api.deleteAccount()).success,true);assert.equal(h.calls.delete,1);
});
