const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
function config(qa) {const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'app.config.js'),'utf8'),{module,process:{env:{EXPO_PUBLIC_AUDIT_QA:qa?'1':'0'}},require:()=>({expo:base})});return module.exports();}
test('Production configuration keeps the existing app identity, scheme and runtime policy',()=>{
 const c=config(false);assert.equal(c.name,base.name);assert.equal(c.android.package,base.android.package);assert.equal(c.ios.bundleIdentifier,base.ios.bundleIdentifier);assert.equal(c.scheme,base.scheme);assert.equal(c.runtimeVersion.policy,'appVersion');assert.equal(c.extra.auditQa,undefined);
});
test('Android audit builds install beside production and cannot consume its updates or OAuth callback',()=>{
 const c=config(true);assert.notEqual(c.android.package,base.android.package);assert.notEqual(c.scheme,base.scheme);assert.notEqual(c.runtimeVersion,base.version);assert.equal(c.extra.auditQa,true);assert.equal(c.extra.eas.projectId,base.extra.eas.projectId);
});
test('Audit builds use a separate update channel; Android produces an installable APK',()=>{
 const profiles=JSON.parse(fs.readFileSync(path.join(root,'eas.json'),'utf8')).build;
 assert.equal(profiles.audit_android.channel,'audit-qa');assert.equal(profiles.audit_android.extends,'preview');assert.equal(profiles.preview.android.buildType,'apk');assert.equal(profiles.audit_ios.channel,'audit-qa');assert.equal(profiles.audit_ios.env.EXPO_PUBLIC_AUDIT_QA,'1');assert.equal(profiles.production.channel,'production');assert.equal(profiles.production.env?.EXPO_PUBLIC_AUDIT_QA,undefined);
});
