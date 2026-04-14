// Auth — Google (Android/iOS) + Apple (iOS) via Supabase
// Expo Go-safe: lazy imports throughout

let currentUser = null;
let authListeners = [];
let supabase = null;

export function getUser() { return currentUser; }

export function onAuthChange(callback) {
  authListeners.push(callback);
  callback(currentUser); // immediate fire
  return () => { authListeners = authListeners.filter((cb) => cb !== callback); };
}

function notifyListeners() {
  authListeners.forEach((cb) => cb(currentUser));
}

function userFromSession(session) {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Oyuncu',
    avatar: u.user_metadata?.avatar_url || null,
    provider: u.app_metadata?.provider || 'unknown',
  };
}

// ─── Init ────────────────────────────────────────────────────
export async function initAuth() {
  try {
    supabase = require('./supabase').default;
    if (!supabase) return null;

    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      currentUser = userFromSession(data.session);
      notifyListeners();
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      currentUser = userFromSession(session);
      notifyListeners();
    });
  } catch (e) {
    console.log('[Auth] init skipped:', e.message);
  }
  return currentUser;
}

// ─── Google Sign-In (OAuth — works on both platforms) ────────
export async function signInWithGoogle() {
  try {
    if (!supabase) return { error: 'Supabase bağlantısı yok' };

    const { makeRedirectUri } = require('expo-auth-session');
    const WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession();

    const redirectUrl = makeRedirectUri({ scheme: 'tilsim-solitaire' });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error) return { error: error.message };
    if (!data?.url) return { error: 'OAuth URL alınamadı' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const params = new URLSearchParams(url.hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) return { error: sessionError.message };
        return { user: currentUser };
      }
    }

    return { error: 'Giriş iptal edildi' };
  } catch (e) {
    return { error: e.message || 'Google girişi başarısız' };
  }
}

// ─── Apple Sign-In (iOS native — expo-apple-authentication) ──
export async function signInWithApple() {
  try {
    if (!supabase) return { error: 'Supabase bağlantısı yok' };

    let AppleAuthentication;
    try {
      AppleAuthentication = require('expo-apple-authentication');
    } catch (e) {
      return { error: 'Apple girişi bu cihazda desteklenmiyor' };
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) return { error: 'Apple girişi bu cihazda desteklenmiyor' };

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { error: 'Apple kimlik doğrulama başarısız' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) return { error: error.message };

    // Apple sadece ilk girişte isim verir
    if (credential.fullName?.givenName && data?.user) {
      const fullName = [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(' ');
      if (fullName) {
        await supabase.auth.updateUser({ data: { full_name: fullName } });
      }
    }

    return { user: currentUser };
  } catch (e) {
    if (e.code === 'ERR_REQUEST_CANCELED' || e.code === 'ERR_CANCELED') {
      return { error: 'Giriş iptal edildi' };
    }
    return { error: e.message || 'Apple girişi başarısız' };
  }
}

// ─── Sign Out ────────────────────────────────────────────────
export async function signOut() {
  try {
    if (supabase) await supabase.auth.signOut();
  } catch (e) {
    console.log('[Auth] signOut error:', e.message);
  }
  currentUser = null;
  notifyListeners();
}

// ─── Cloud Sync (merge: keep highest) ───────────────────────
export async function syncProgressToCloud(localProgress) {
  if (!supabase || !currentUser) return null;
  try {
    const { data: cloud } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    const merged = {
      user_id: currentUser.id,
      current_level: Math.max(localProgress.currentLevel || 1, cloud?.current_level || 1),
      coins: Math.max(localProgress.coins || 0, cloud?.coins || 0),
      total_games: Math.max(localProgress.totalGames || 0, cloud?.total_games || 0),
      total_wins: Math.max(localProgress.totalWins || 0, cloud?.total_wins || 0),
      best_score: Math.max(localProgress.bestScore || 0, cloud?.best_score || 0),
      streak: Math.max(localProgress.streak || 0, cloud?.streak || 0),
      xp: Math.max(localProgress.xp || 0, cloud?.xp || 0),
      updated_at: new Date().toISOString(),
    };

    await supabase.from('user_progress').upsert(merged, { onConflict: 'user_id' });

    return {
      currentLevel: merged.current_level,
      coins: merged.coins,
      totalGames: merged.total_games,
      totalWins: merged.total_wins,
      bestScore: merged.best_score,
      streak: merged.streak,
      xp: merged.xp,
    };
  } catch (e) {
    console.log('[Auth] syncToCloud error:', e.message);
    return null;
  }
}

export async function loadProgressFromCloud() {
  if (!supabase || !currentUser) return null;
  try {
    const { data } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (!data) return null;
    return {
      currentLevel: data.current_level,
      coins: data.coins,
      totalGames: data.total_games,
      totalWins: data.total_wins,
      bestScore: data.best_score,
      streak: data.streak,
      xp: data.xp || 0,
    };
  } catch (e) {
    console.log('[Auth] loadFromCloud error:', e.message);
    return null;
  }
}
