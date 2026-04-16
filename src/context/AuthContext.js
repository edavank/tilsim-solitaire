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
    syncProgressToCloud: async () => null,
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
  const initDone = useRef(false);

  // Init auth + check if login screen was seen before
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    (async () => {
      // Check if user has seen login screen before
      try {
        const seen = await AsyncStorage?.getItem(HAS_SEEN_LOGIN_KEY);
        setHasSeenLogin(seen === 'true');
      } catch (e) {
        setHasSeenLogin(false);
      }

      // Init auth (restores session if exists)
      await authModule.initAuth();
      setAuthReady(true);
    })();

    // Listen for auth changes
    const unsub = authModule.onAuthChange((u) => setUser(u));
    return unsub;
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

  const handleSignOut = useCallback(async () => {
    await authModule.signOut();
  }, []);

  // Cloud sync helpers
  const syncToCloud = useCallback(async (localProgress) => {
    return await authModule.syncProgressToCloud(localProgress);
  }, []);

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
    syncToCloud,
    loadFromCloud,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
