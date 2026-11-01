// No caller-supplied user/device ID is accepted as authority.
export function createDeleteAccountHandler({verifyUser, deleteUser}) {
  const headers = {'Content-Type':'application/json','Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
  const reply = (status,body) => new Response(JSON.stringify(body),{status,headers});
  return async request => {
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return reply(405,{success:false,code:'METHOD_NOT_ALLOWED'});
    const match = /^Bearer\s+([^\s]+)$/i.exec(request.headers.get('Authorization') || '');
    if (!match) return reply(401,{success:false,code:'AUTH_REQUIRED'});
    try {
      // getUser validates the token with Supabase Auth, not an unverified JWT decode.
      const {data,error} = await verifyUser(match[1]);
      if (error || !data?.user?.id) return reply(401,{success:false,code:'AUTH_REQUIRED'});
      const id = data.user.id;
      const removed = await deleteUser(id);
      if (removed.error || removed.data?.user?.id !== id) return reply(503,{success:false,code:'DELETE_NOT_CONFIRMED'});
      return reply(200,{success:true,deletedUserId:id});
    } catch (error) { return reply(503,{success:false,code:'DELETE_UNAVAILABLE'}); }
  };
}
