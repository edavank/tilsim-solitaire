// AuthContext — manages auth state + cloud sync across the app
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

let authModule;
try {
  authModule = require('../utils/auth');
} catch (e) {
  authModule = {
    getUser: () => null,
    onAuthChange: () => () => {},
    initAuth: async () => null,
    signInWithGoogle: async () => ({ error: 'Auth kullanılamıyor' }),
    signInWithApple: async () => ({ error: 'Auth kullanılamıyor' }),
    signOut: async () => {},
    deleteAccount: async () => ({ success: true }),
    syncProgressToCloud: async () => null,
    preserveLocalAccountBackup: async () => {},
    loadProgressFromCloud: async () => null,
  };
}

let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

const AuthContext = createContext(null);
const HAS_SEEN_LOGIN_KEY = '@tilsim_has_seen_login';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [hasSeenLogin, setHasSeenLogin] = useState(true); // default true to avoid flash
  const [cloudStatus, setCloudStatus] = useState('idle');
  const [cloudError, setCloudError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const initDone = useRef(false);

  // Init auth + check if login screen was seen before
  // StrictMode / hot-reload safe: initDone guard'ı only init işini tekilleştirir,
  // listener her mount'ta yeniden bağlanır ve cleanup'ta temizlenir.
  useEffect(() => {
    let cancelled = false;

    const runInit = async () => {
      if (initDone.current) return;
      initDone.current = true;
      try {
        const seen = await AsyncStorage?.getItem(HAS_SEEN_LOGIN_KEY);
        if (!cancelled) setHasSeenLogin(seen === 'true');
      } catch (e) {
        if (!cancelled) setHasSeenLogin(false);
      }
      await authModule.initAuth();
      if (!cancelled) setAuthReady(true);
    };
    runInit();

    // Listener her mount'ta yenilenir — initDone guard'ının dışında
    const unsub = authModule.onAuthChange((u) => { if (!cancelled) setUser(u); });
    return () => { cancelled = true; unsub && unsub(); };
  }, []);

  const markLoginSeen = useCallback(async () => {
    setHasSeenLogin(true);
    try { await AsyncStorage?.setItem(HAS_SEEN_LOGIN_KEY, 'true'); } catch (e) {}
  }, []);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    const result = await authModule.signInWithGoogle();
    setLoading(false);
    if (result.error) return { error: result.error, code: result.code };
    await markLoginSeen();
    return { user: result.user };
  }, [markLoginSeen]);

  const handleAppleLogin = useCallback(async () => {
    setLoading(true);
    const result = await authModule.signInWithApple();
    setLoading(false);
    if (result.error) return { error: result.error, code: result.code };
    await markLoginSeen();
    return { user: result.user };
  }, [markLoginSeen]);

  const handleSkipLogin = useCallback(async () => {
    await markLoginSeen();
  }, [markLoginSeen]);

  const syncToCloud = useCallback(async (_legacySnapshot, choice) => {
    setCloudStatus('syncing');
    try {
      const result = await authModule.syncProgressToCloud(undefined, choice);
      if (result) { setCloudStatus('saved'); setCloudError(null); setLastSyncedAt(Date.now()); }
      else setCloudStatus('idle');
      return result;
    } catch (error) {
      setCloudStatus(error.code === 'BOOTSTRAP_CONFLICT' ? 'conflict' : 'error');
      setCloudError(error);
      throw error;
    }
  }, []);

  useEffect(() => {
    if (authReady && user?.id) syncToCloud().catch(() => {});
    else { setCloudStatus('idle'); setCloudError(null); setLastSyncedAt(null); }
  }, [authReady, user?.id, syncToCloud]);

  const handleSignOut = useCallback(async () => {
    // Sign-out öncesi son bir kez yerel -> cloud sync ki kullanıcı ilerlemesini
    // kaybetmesin. Sonra supabase'den çıkış + yerel veri temizliği.
    try { await syncToCloud(); }
    catch (e) {
      // An offline user may sign out only after a durable account-scoped backup.
      try { await authModule.preserveLocalAccountBackup(); }
      catch (backupError) { return { success:false, error:'Yerel kayıt korunamadı. Lütfen yeniden dene.' }; }
    }
    await authModule.signOut();
    // Hesaplar arası veri sızıntısını önle: Kullanıcı A çıkış yapıp B'ye
    // girerse, A'nın local coin/level'i Math.max merge ile B'nin cloud'una
    // geçerdi. Local ilerlemeyi varsayılana döndür (settings/device_id korunur).
    try {
      const { resetUserScopedData } = require('../utils/storage');
      await resetUserScopedData();
    } catch (e) {}
    return { success:true };
  }, [syncToCloud]);

  // Apple 5.1.1(v): Hesap silme — cloud + local tüm verileri siler
  const handleDeleteAccount = useCallback(async () => {
    const result = await authModule.deleteAccount();
    if (result.success) {
      try {
        const { resetUserScopedData } = require('../utils/storage');
        await resetUserScopedData();
      } catch (e) {}
    }
    return result;
  }, []);

  // Cloud sync helpers
  const loadFromCloud = useCallback(async () => {
    return await authModule.loadProgressFromCloud();
  }, []);

  // Show login screen?
  const shouldShowLogin = authReady && !hasSeenLogin && !user;

  const value = {
    user,
    loading,
    authReady,
    shouldShowLogin,
    isAppleAvailable: Platform.OS === 'ios',
    handleGoogleLogin,
    handleAppleLogin,
    handleSkipLogin,
    handleSignOut,
    handleDeleteAccount,
    syncToCloud,
    loadFromCloud,
    cloudStatus, cloudError, lastSyncedAt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;

