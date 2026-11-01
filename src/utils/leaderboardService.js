// Leaderboard service — Supabase integration
// Table: leaderboard (id, device_id, display_name, avatar_emoji, score, level, total_wins, language, updated_at)

let supabase = null;
try { supabase = require('./supabase').default; } catch (e) {}

// The authenticated owner, not a persisted device identifier, owns the row.
async function getOwnerId() {
  const {data,error} = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user?.id || null;
}

// ── Submit/Update Score ──
export async function submitScore({displayName, language='tr', userAvatar} = {}) {
  if (!supabase) return {error:'Supabase not configured'};
  try {
    if (!await getOwnerId()) return {error:'Sıralamaya katılmak için hesabını bağla.',code:'AUTH_REQUIRED'};
    const {error} = await supabase.rpc('submit_score_v2',{
      p_display_name:displayName || 'Oyuncu',p_avatar_emoji:userAvatar || '👤',p_language:language,
    });
    return {error:error?.message};
  } catch (error) { return {error:error.message}; }
}

// ── Fetch Leaderboard ──
export async function fetchLeaderboard(period = 'all', limit = 20) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  try {
    let query = supabase
      .from('leaderboard')
      .select('id, display_name, avatar_emoji, score, level, total_wins')
      .not('owner_id','is',null)
      .order('score', { ascending: false })
      .limit(limit);

    // Filter by time period
    if (period === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('updated_at', weekAgo);
    } else if (period === 'monthly') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('updated_at', monthAgo);
    }

    const { data, error } = await query;
    return { data, error: error?.message };
  } catch (e) {
    return { data: null, error: e.message };
  }
}

// ── Get User's Rank ──
export async function getUserRank() {
  if (!supabase) return { rank: null, entry: null };
  try {
    const ownerId = await getOwnerId();
    if (!ownerId) return {rank:null,entry:null};
    
    const { data: entry } = await supabase
      .from('leaderboard')
      .select('id, display_name, avatar_emoji, score, level')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (!entry) return { rank: null, entry: null };

    // Count how many have higher score
    const { count } = await supabase
      .from('leaderboard')
      .select('id', { count: 'exact', head: true })
      .not('owner_id','is',null)
      .gt('score', entry.score);

    return { rank: (count || 0) + 1, entry };
  } catch (e) {
    return { rank: null, entry: null };
  }
}

// ── Update Display Name ──
export async function updateDisplayName(name) {
  if (!supabase) return {error:'Supabase not configured'};
  try {
    const ownerId = await getOwnerId();
    if (!ownerId) return {error:'AUTH_REQUIRED'};
    const {error} = await supabase.from('leaderboard').update({display_name:String(name).trim().slice(0,50)}).eq('owner_id',ownerId);
    return {error:error?.message};
  } catch (error) { return {error:error.message}; }
}
