import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import supabase from './supabase';

WebBrowser.maybeCompleteAuthSession();

// Auth state
let currentUser = null;
let authListeners = [];

export function getUser() { return currentUser; }

export function onAuthChange(callback) {
  authListeners.push(callback);
  return () => { authListeners = authListeners.filter((cb) => cb !== callback); };
}

function notifyListeners() {
  authListeners.forEach((cb) => cb(currentUser));
}

// Initialize auth — check existing session
export async function initAuth() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      currentUser = {
        id: data.session.user.id,
        email: data.session.user.email,
        name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0],
        avatar: data.session.user.user_metadata?.avatar_url,
      };
      notifyListeners();
    }

    // Listen to auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        currentUser = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar_url,
        };
      } else {
        currentUser = null;
      }
      notifyListeners();
    });
  } catch (e) {
    // Auth not available
  }
  return currentUser;
}

// Google Sign-In
export async function signInWithGoogle() {
  if (!supabase) {
    return { error: 'Supabase henüz yapılandırılmadı' };
  }
  try {
    const redirectUrl = makeRedirectUri({ scheme: 'tilsim-solitaire' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) return { error: error.message };
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        // Extract tokens from URL
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) return { error: sessionError.message };
          return { user: currentUser };
        }
      }
      return { error: 'Giriş iptal edildi' };
    }
    return { error: 'OAuth URL alınamadı' };
  } catch (e) {
    return { error: e.message };
  }
}

// Sign Out
export async function signOut() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
    currentUser = null;
    notifyListeners();
  } catch (e) {}
}

// Cloud Sync — save progress to Supabase
export async function syncProgressToCloud(progress) {
  if (!supabase || !currentUser) return;
  try {
    await supabase.from('user_progress').upsert({
      user_id: currentUser.id,
      current_level: progress.currentLevel,
      coins: progress.coins,
      total_games: progress.totalGames,
      total_wins: progress.totalWins,
      best_score: progress.bestScore,
      streak: progress.streak,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (e) {}
}

// Cloud Sync — load progress from Supabase
export async function loadProgressFromCloud() {
  if (!supabase || !currentUser) return null;
  try {
    const { data } = await supabase.from('user_progress').select('*').eq('user_id', currentUser.id).maybeSingle();
    if (data) {
      return {
        currentLevel: data.current_level,
        coins: data.coins,
        totalGames: data.total_games,
        totalWins: data.total_wins,
        bestScore: data.best_score,
        streak: data.streak,
      };
    }
  } catch (e) {}
  return null;
}
