// Leaderboard service — Supabase integration
// Table: leaderboard (id, device_id, display_name, avatar_emoji, score, level, total_wins, language, updated_at)

import { Platform } from 'react-native';

let supabase = null;
try { supabase = require('./supabase').default; } catch (e) {}

let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

// Unique device identifier (persisted)
let _deviceId = null;
async function getDeviceId() {
  if (_deviceId) return _deviceId;
  try {
    _deviceId = await AsyncStorage?.getItem('@tilsim_device_id');
    if (!_deviceId) {
      _deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      await AsyncStorage?.setItem('@tilsim_device_id', _deviceId);
    }
  } catch (e) {
    _deviceId = 'dev_' + Date.now();
  }
  return _deviceId;
}

// Avatar emojis for random assignment
const AVATARS = ['🦊', '🦄', '🐼', '🦁', '🐰', '🐱', '🐶', '🦉', '🐬', '🐸', '🦅', '🐧', '🦋', '🐝', '🐨'];

// ── Submit/Update Score ──
export async function submitScore({ score, level, totalWins, displayName, language = 'tr' }) {
  if (!supabase) return { error: 'Supabase not configured' };
  try {
    const deviceId = await getDeviceId();
    
    // Check if user exists
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('id, score, avatar_emoji')
      .eq('device_id', deviceId)
      .single();

    if (existing) {
      // Update only if score improved
      const updates = {
        score: Math.max(existing.score || 0, score),
        level,
        total_wins: totalWins,
        language,
        updated_at: new Date().toISOString(),
      };
      if (displayName) updates.display_name = displayName;
      
      const { error } = await supabase
        .from('leaderboard')
        .update(updates)
        .eq('id', existing.id);
      
      return { error: error?.message };
    } else {
      // Create new entry
      const { error } = await supabase
        .from('leaderboard')
        .insert({
          device_id: deviceId,
          display_name: displayName || 'Player',
          avatar_emoji: AVATARS[Math.floor(Math.random() * AVATARS.length)],
          score,
          level,
          total_wins: totalWins,
          language,
        });
      
      return { error: error?.message };
    }
  } catch (e) {
    return { error: e.message };
  }
}

// ── Fetch Leaderboard ──
export async function fetchLeaderboard(period = 'all', limit = 20) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  try {
    let query = supabase
      .from('leaderboard')
      .select('id, display_name, avatar_emoji, score, level, total_wins')
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
    const deviceId = await getDeviceId();
    
    const { data: entry } = await supabase
      .from('leaderboard')
      .select('id, display_name, avatar_emoji, score, level')
      .eq('device_id', deviceId)
      .single();

    if (!entry) return { rank: null, entry: null };

    // Count how many have higher score
    const { count } = await supabase
      .from('leaderboard')
      .select('id', { count: 'exact', head: true })
      .gt('score', entry.score);

    return { rank: (count || 0) + 1, entry };
  } catch (e) {
    return { rank: null, entry: null };
  }
}

// ── Update Display Name ──
export async function updateDisplayName(name) {
  if (!supabase) return;
  try {
    const deviceId = await getDeviceId();
    await supabase
      .from('leaderboard')
      .update({ display_name: name })
      .eq('device_id', deviceId);
  } catch (e) {}
}
