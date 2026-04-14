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

// ─── Google Sign-In (ID Token flow — bypasses redirect issues) ────
export async function signInWithGoogle() {
  try {
    if (!supabase) return { error: 'Supabase bağlantısı yok' };

    const { makeRedirectUri } = require('expo-auth-session');
    const WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession();

    const GOOGLE_CLIENT_ID = '1018253953395-r7ltflc82uchh219dk45tc14qe77tnv8.apps.googleusercontent.com';

    // makeRedirectUri() returns http://localhost in Expo Go — Google allows this
    const redirectUri = makeRedirectUri();
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);

    console.log('[Auth] Google redirectUri:', redirectUri);

    // Go directly to Google (not through Supabase OAuth)
    const authUrl =
      'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + GOOGLE_CLIENT_ID +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=id_token' +
      '&scope=openid%20email%20profile' +
      '&nonce=' + nonce;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success' && result.url) {
      // Token is in the hash fragment: #id_token=...
      const hashParams = new URLSearchParams(result.url.split('#')[1] || '');
      const idToken = hashParams.get('id_token');

      if (idToken) {
        // Pass ID token directly to Supabase
        const { data, error: signInError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          nonce: nonce,
        });
        if (signInError) return { error: signInError.message };
        return { user: currentUser };
      }
      return { error: 'Token alınamadı' };
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
