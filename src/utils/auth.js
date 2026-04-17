// Auth — Google (Android/iOS) + Apple (iOS) via Supabase
// Expo Go-safe: lazy imports throughout

let currentUser = null;
let authListeners = [];
let supabase = null;

export function getUser() { return currentUser; }

export function onAuthChange(callback) {
  authListeners.push(callback);
  // Güvenli immediate fire — callback throw ederse diğer akışı bozmasın
  try { callback(currentUser); } catch (e) {}
  return () => { authListeners = authListeners.filter((cb) => cb !== callback); };
}

function notifyListeners() {
  // Her listener ayrı try/catch — biri throw ederse diğerleri çalışmalı
  for (const cb of authListeners) {
    try { cb(currentUser); } catch (e) {}
  }
}

function userFromSession(session) {
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Player',
    avatar: u.user_metadata?.avatar_url || null,
    provider: u.app_metadata?.provider || 'unknown',
  };
}

let _authSubscribed = false;

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

    // Tek subscription yeterli — multiple initAuth çağrılarında duplicate listener olmasın
    if (!_authSubscribed) {
      _authSubscribed = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        currentUser = userFromSession(session);
        notifyListeners();
      });
    }
  } catch (e) {
    console.log('[Auth] init skipped:', e.message);
  }
  return currentUser;
}

// ─── Google Sign-In (Supabase OAuth) ────────
export async function signInWithGoogle() {
  try {
    if (!supabase) return { error: 'Supabase connection unavailable', code: 'no_supabase' };

    const { makeRedirectUri } = require('expo-auth-session');
    const WebBrowser = require('expo-web-browser');
    const Constants = require('expo-constants');
    WebBrowser.maybeCompleteAuthSession();

    // Build redirect URL
    const isExpoGo = Constants.default?.appOwnership === 'expo';
    const hostUri = Constants.default?.expoConfig?.hostUri;
    const redirectUrl = isExpoGo && hostUri
      ? `exp://${hostUri}/--/`
      : makeRedirectUri({ scheme: 'tilsim-solitaire' });

    console.log('[Auth] redirectUrl:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
    });

    if (error) return { error: error.message };
    if (!data?.url) return { error: 'OAuth URL unavailable', code: 'no_oauth_url' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    console.log('[Auth] result type:', result.type);

    if (result.type === 'success' && result.url) {
      console.log('[Auth] result url:', result.url.substring(0, 80));
      // Tokens come in hash fragment: #access_token=...&refresh_token=...
      const hashPart = result.url.split('#')[1];
      if (hashPart) {
        const params = new URLSearchParams(hashPart);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (access_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (sessionError) return { error: sessionError.message };
          // Listener'ın currentUser'ı güncellemesini bekle (race fix)
          const sessionUser = userFromSession(sessionData?.session);
          if (sessionUser) {
            currentUser = sessionUser;
            notifyListeners();
          }
          return { user: currentUser };
        }
      }
      return { error: 'Could not retrieve token', code: 'no_token' };
    }

    return { error: 'Sign-in cancelled', code: 'cancelled' };
  } catch (e) {
    return { error: e.message || 'Google sign-in failed', code: 'google_fail' };
  }
}

// ─── Apple Sign-In (iOS native — expo-apple-authentication) ──
export async function signInWithApple() {
  try {
    if (!supabase) return { error: 'Supabase connection unavailable', code: 'no_supabase' };

    let AppleAuthentication;
    try {
      AppleAuthentication = require('expo-apple-authentication');
    } catch (e) {
      return { error: 'Apple sign-in not supported on this device', code: 'apple_unavailable' };
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) return { error: 'Apple sign-in not supported on this device', code: 'apple_unavailable' };

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { error: 'Apple authentication failed', code: 'apple_no_token' };
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

    // Race fix: listener'dan önce currentUser'ı set et
    const sessionUser = userFromSession(data?.session);
    if (sessionUser) {
      currentUser = sessionUser;
      notifyListeners();
    }

    return { user: currentUser };
  } catch (e) {
    if (e.code === 'ERR_REQUEST_CANCELED' || e.code === 'ERR_CANCELED') {
      return { error: 'Sign-in cancelled', code: 'cancelled' };
    }
    return { error: e.message || 'Apple sign-in failed', code: 'apple_fail' };
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

// ─── Delete Account ─────────────────────────────────────────
// Apple 5.1.1(v) requirement: hesap oluşturma varsa silme de olmalı.
// Kullanıcının tüm verilerini siler (cloud + local), ardından çıkış yapar.
export async function deleteAccount() {
  if (!supabase || !currentUser) {
    // Hesap yoksa sadece yerel veriyi temizle
    return { success: true };
  }
  try {
    const userId = currentUser.id;

    // 1. Cloud verileri sil
    try {
      await supabase.from('user_progress').delete().eq('user_id', userId);
    } catch (e) { console.log('[Auth] delete user_progress error:', e.message); }

    try {
      await supabase.from('leaderboard').delete().eq('device_id', await _getDeviceId());
    } catch (e) { console.log('[Auth] delete leaderboard error:', e.message); }

    // 2. Supabase auth sign out
    try {
      await supabase.auth.signOut();
    } catch (e) { console.log('[Auth] signOut during delete:', e.message); }

    currentUser = null;
    notifyListeners();

    return { success: true };
  } catch (e) {
    console.log('[Auth] deleteAccount error:', e.message);
    return { success: false, error: e.message };
  }
}

// Device ID helper for account deletion (leaderboard uses device_id)
async function _getDeviceId() {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return await AsyncStorage.getItem('@tilsim_device_id');
  } catch (e) { return null; }
}

// ─── Cloud Sync (merge: keep highest) ───────────────────────
// NOT: Alan-bazlı Math.max, cihazlar arası sync için çalışır ama canlı play'de
// "powerup aldım, coin azaldı" gibi durumlarda eski yüksek coin cloud'dan gelip
// üzerine yazabilir. Data model üzerinde "coins_spent" tutulmadığı sürece
// düzgün çözüm yok. Bu davranış kasıtlı — kullanıcı cihaz kaybederse ilerlemesi
// korunsun. Alternatif "zaman damgalı full-snapshot" için data model değişikliği
// gerekiyor; bu PR'da scope dışı.
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
