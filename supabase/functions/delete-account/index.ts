import {createClient} from 'npm:@supabase/supabase-js@2.103.0';
import {createDeleteAccountHandler} from '../_shared/deleteAccountHandler.js';

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) throw new Error('Server configuration missing');
// The privileged key stays in the server environment and is never sent to the game.
const admin = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createDeleteAccountHandler({
  verifyUser:token=>admin.auth.getUser(token),
  deleteUser:id=>admin.auth.admin.deleteUser(id,false),
}));
