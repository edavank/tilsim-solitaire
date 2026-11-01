import { createCloudSync } from './cloudSync';
import { loadProgress, updateProgress, loadCloudJournal, saveCloudJournal, loadXP, loadLevelStars } from './storage';

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
let authInitPromise = null;
let googleLoginPromise = null;
let sessionRevision = 0;
let lastAuthEvent = null;
let authPhase = 'idle';
let lastAuthError = null;
let refreshSubscription = null;

function authFailure(code, error) {
  const message = String(error?.message || error || code)
    .replace(/([?&#](?:access_token|refresh_token|code)=)[^&\s]+/gi,'$1[redacted]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]');
  lastAuthError = {code,message};
  return {error:message,code};
}

export function getAuthDiagnostics() {
  return {revision:'auth-20261101-audit',phase:authPhase,lastEvent:lastAuthEvent,
    hasSession:!!currentUser,lastError:lastAuthError};
}

function installRefreshLifecycle() {
  if (refreshSubscription) return;
  try {
    const { AppState, Platform } = require('react-native');
    if (Platform.OS === 'web' || !supabase.auth.startAutoRefresh) return;
    const refresh = state => {
      const action = state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh();
      Promise.resolve(action).catch(() => {});
    };
    refreshSubscription = AppState.addEventListener('change',refresh);
    refresh(AppState.currentState || 'active');
  } catch (error) {}
}

// Subscribe before the initial read. A late cached read cannot replace a newer login.
export function initAuth() {
  if (authInitPromise) return authInitPromise;
  authInitPromise = (async () => {
    try {
      supabase = require('./supabase').default;
      if (!supabase) return null;
      if (!_authSubscribed) {
        supabase.auth.onAuthStateChange((event, session) => {
          sessionRevision++;
          lastAuthEvent = event;
          // Do not show Connected for an OAuth session that has not passed persistence checks.
          if (googleLoginPromise && authPhase === 'saving_session' && event !== 'SIGNED_OUT') return;
          currentUser = userFromSession(session);
          notifyListeners();
        });
        _authSubscribed = true;
      }
      installRefreshLifecycle();
      const revision = sessionRevision;
      const {data,error} = await cloudRequest(supabase.auth.getSession());
      if (error) throw error;
      if (revision === sessionRevision) { currentUser = userFromSession(data?.session); notifyListeners(); }
    } catch (error) { authFailure('init_failed',error); }
    return currentUser;
  })().finally(() => { authInitPromise = null; });
  return authInitPromise;
}

function matchesRedirect(url, expected) {
  const base = value => String(value || '').split(/[?#]/)[0].replace(/\/+$/,'');
  return !!url && base(url) === base(expected);
}

async function sessionFromCallback(url, redirectUrl) {
  if (!matchesRedirect(url,redirectUrl)) return authFailure('wrong_redirect','Google dönüş adresi doğrulanamadı.');
  const query = new URLSearchParams((url.split('?')[1] || '').split('#')[0]);
  const fragment = new URLSearchParams(url.split('#')[1] || '');
  const value = key => fragment.get(key) || query.get(key);
  if (value('error') || value('error_code')) return authFailure(value('error_code') || value('error'),value('error_description') || 'Google girişi tamamlanamadı.');
  authPhase = 'saving_session';
  let response;
  if (value('code')) response = await cloudRequest(supabase.auth.exchangeCodeForSession(value('code')));
  else if (value('access_token') && value('refresh_token')) {
    response = await cloudRequest(supabase.auth.setSession({access_token:value('access_token'),refresh_token:value('refresh_token')}));
  } else return authFailure('no_token','Google oturum bilgisi oyuna ulaşmadı. Lütfen tekrar dene.');
  if (response.error) return authFailure('session_save_failed',response.error);
  const sessionUser = userFromSession(response.data?.session);
  if (!sessionUser) return authFailure('no_session','Google oturumu doğrulanamadı. Lütfen tekrar dene.');
  // A successful browser return alone is not a successful game login.
  const persisted = await cloudRequest(supabase.auth.getSession());
  if (persisted.error || persisted.data?.session?.user?.id !== sessionUser.id) {
    return authFailure('session_not_persisted',persisted.error || 'Oturum kaydedilemedi. Lütfen tekrar dene.');
  }
  sessionRevision++;
  currentUser = sessionUser;
  notifyListeners();
  lastAuthError = null;
  authPhase = 'signed_in';
  return {user:sessionUser};
}

async function runGoogleLogin() {
  let sub, timer;
  try {
    authPhase = 'initializing';
    await initAuth();
    if (!supabase) return authFailure('no_supabase','Hesap bağlantısı hazırlanamadı. Lütfen tekrar dene.');
    const {makeRedirectUri} = require('expo-auth-session');
    const WebBrowser = require('expo-web-browser');
    const Constants = require('expo-constants').default;
    WebBrowser.maybeCompleteAuthSession();
    const redirectUrl = Constants?.appOwnership === 'expo' && Constants?.expoConfig?.hostUri
      ? `exp://${Constants.expoConfig.hostUri}/--/` : makeRedirectUri({scheme:'tilsim-solitaire'});
    authPhase = 'requesting_google';
    const {data,error} = await cloudRequest(supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectUrl,skipBrowserRedirect:true}}));
    if (error) return authFailure('oauth_failed',error);
    if (!data?.url) return authFailure('no_oauth_url','Google giriş sayfası hazırlanamadı.');
    let callbackUrl = null, resolveCallback;
    const callback = new Promise(resolve => { resolveCallback = resolve; });
    try {
      sub = require('expo-linking').addEventListener('url',({url}) => {
        if (matchesRedirect(url,redirectUrl)) { callbackUrl = url; resolveCallback(url); }
      });
    } catch (error) {}
    authPhase = 'browser';
    const result = await WebBrowser.openAuthSessionAsync(data.url,redirectUrl);
    let url = result.type === 'success' ? result.url : callbackUrl;
    // Android can report dismissal just before delivering the return link.
    // This bounded grace period never opens a new browser or retries cancellation.
    if (!url && result.type === 'dismiss' && sub) {
      url = await Promise.race([callback,new Promise(resolve => { timer=setTimeout(()=>resolve(null),1000); })]);
    }
    if (!url) { authPhase='cancelled'; return {error:'Sign-in cancelled',code:'cancelled'}; }
    return await sessionFromCallback(url,redirectUrl);
  } catch (error) { authPhase='error'; return authFailure(error.code || 'google_fail',error); }
  finally { sub?.remove(); clearTimeout(timer); }
}

export function signInWithGoogle() {
  if (!googleLoginPromise) googleLoginPromise = runGoogleLogin().finally(() => { googleLoginPromise = null; });
  return googleLoginPromise;
}

// ─── Apple Sign-In (iOS native — expo-apple-authentication) ──
export async function signInWithApple() {
  try {
    await initAuth();
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
  if (supabase) {
    const result = await supabase.auth.signOut();
    if (result?.error) throw result.error;
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

// Versioned, receipt-backed sync. Never fall back to max(balance).
async function cloudRequest(request) {
  let timer;
  try {
    return await Promise.race([request,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(Object.assign(new Error('Cloud request timed out'),{code:'CLOUD_TIMEOUT'})),15000);
    })]);
  } finally { clearTimeout(timer); }
}

function cloudError(error) {
  const message = String(error?.message || error || 'Cloud unavailable');
  const code = error?.code === '40001' || message.includes('SYNC_CONFLICT') ? 'SYNC_CONFLICT'
    : ['PGRST202','PGRST204','42703','42883'].includes(error?.code) ? 'SETUP_REQUIRED' : (error?.code || 'CLOUD_UNAVAILABLE');
  return Object.assign(new Error(message), { code });
}

async function readCloudRecord(accountId) {
  const { data, error } = await cloudRequest(supabase.from('user_progress').select('*').eq('user_id', accountId).maybeSingle());
  if (error) throw cloudError(error);
  if (!data) return { revision:0, state:null };
  if (!Object.prototype.hasOwnProperty.call(data,'revision')) throw Object.assign(new Error('Cloud migration required'), {code:'SETUP_REQUIRED'});
  return { revision:data.revision, state:data.state_v2 || {
    currentLevel:data.current_level, coins:data.coins, totalGames:data.total_games,
    totalWins:data.total_wins,bestScore:data.best_score,streak:data.streak,xp:data.xp || 0,
  }};
}

const syncEngine = createCloudSync({
  getAccountId: () => currentUser?.id,
  readJournal: loadCloudJournal,
  writeJournal: saveCloudJournal,
  loadLocal: async () => {
    const current = await loadProgress();
    if (Number.isFinite(current.xp) && current.levelStars) return current;
    const [xp,stars] = await Promise.all([loadXP(),loadLevelStars()]);
    // Reading must not write a migration into a different account after an await.
    return { ...current, xp:Number.isFinite(current.xp) ? current.xp : xp.xp, levelStars:current.levelStars || stars };
  },
  applyLocal: patch => updateProgress(patch,{kind:'sync',source:'cloud',description:'Bulut kaydıyla eşitleme'}),
  createRequestId: () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
  readRemote: readCloudRecord,
  commitRemote: async (accountId,requestId,revision,state) => {
    if (currentUser?.id !== accountId) throw Object.assign(new Error('Account changed'),{code:'ACCOUNT_CHANGED'});
    const { data,error } = await cloudRequest(supabase.rpc('sync_progress_v2', {
      p_request_id:requestId,p_expected_revision:revision,p_state:state,
    }));
    if (error) throw cloudError(error);
    if (!data?.state || !Number.isFinite(data.revision)) throw new Error('Invalid cloud response');
    return data;
  },
});

export async function syncProgressToCloud(_legacySnapshot, choice) {
  if (!supabase || !currentUser) return null;
  return syncEngine(currentUser.id,choice);
}

export async function preserveLocalAccountBackup() {
  if (!currentUser) return;
  const accountId = currentUser.id;
  const journal = await loadCloudJournal(accountId) || {};
  const backup = await loadProgress();
  await saveCloudJournal(accountId,{ ...journal,backup });
}

export async function loadProgressFromCloud() {
  if (!supabase || !currentUser) return null;
  return (await readCloudRecord(currentUser.id)).state;
}
