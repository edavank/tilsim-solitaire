const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const handler=fs.readFileSync(path.join(root,'supabase/functions/_shared/deleteAccountHandler.js'),'utf8').replace('export function createDeleteAccountHandler','function createDeleteAccountHandler');
const entry=fs.readFileSync(path.join(root,'supabase/functions/delete-account/index.ts'),'utf8').replace("import {createDeleteAccountHandler} from '../_shared/deleteAccountHandler.js';",handler);
const destination=path.join(root,'audit/deploy-delete-account.ts');
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,entry);
console.log(destination);
