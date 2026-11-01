// AdMob entegrasyonu — react-native-google-mobile-ads
// Expo Go'da güvenli: modül yoksa stub olarak çalışır

import { Platform, AppState, Alert } from 'react-native';
import { loadSettings } from './storage';

const AD_IDS = {
  test: {
    banner: Platform.select({
      ios: 'ca-app-pub-3940256099942544/2934735716',
      android: 'ca-app-pub-3940256099942544/6300978111',
    }),
    interstitial: Platform.select({
      ios: 'ca-app-pub-3940256099942544/4411468910',
      android: 'ca-app-pub-3940256099942544/1033173712',
    }),
    rewarded: Platform.select({
      ios: 'ca-app-pub-3940256099942544/1712485313',
      android: 'ca-app-pub-3940256099942544/5224354917',
    }),
    // Google official test rewarded interstitial IDs
    rewardedInterstitial: Platform.select({
      ios: 'ca-app-pub-3940256099942544/6978759866',
      android: 'ca-app-pub-3940256099942544/5354046379',
    }),
  },
  production: {
    banner: Platform.select({
      ios: 'ca-app-pub-9511518953640494/2822907409',
      android: 'ca-app-pub-9511518953640494/2017092190',
    }),
    interstitial: Platform.select({
      ios: 'ca-app-pub-9511518953640494/6215672138',
      android: 'ca-app-pub-9511518953640494/8390928854',
    }),
    rewarded: Platform.select({
      ios: 'ca-app-pub-9511518953640494/3002870807',
      android: 'ca-app-pub-9511518953640494/8526660229',
    }),
    // TODO: AdMob'da yeni Rewarded Interstitial ad unit oluştur ve ID'yi yapıştır
    // İkisi de production rewarded ID'sine düşürdük (geçici fallback)
    // YENİ AD UNIT İÇİN: https://apps.admob.com → Apps → Tılsım Solitaire iOS/Android
    //   → Reklam Birimleri → Reklam Birimi Ekleyin → Ödüllü Geçiş
    rewardedInterstitial: Platform.select({
      ios: 'ca-app-pub-9511518953640494/3002870807',     // FIXME: gerçek ID gerek
      android: 'ca-app-pub-9511518953640494/8526660229', // FIXME: gerçek ID gerek
    }),
  },
};

const ids = __DEV__ ? AD_IDS.test : AD_IDS.production;

let MobileAds = null;
let InterstitialAd = null;
let RewardedAd = null;
let RewardedInterstitialAd = null;
let BannerAd = null;
let BannerAdSize = null;
let AdEventType = null;
let RewardedAdEventType = null;

let adsReady = false;
let lastRewardedError = null;

function recordRewardedError(error) {
  lastRewardedError = {
    code: String(error?.code || 'unknown'),
    message: String(error?.message || error || 'Unknown error'),
  };
}

export function getAdDiagnostics() {
  let update = {};
  try {
    const Updates = require('expo-updates');
    update = {
      updateId: Updates.updateId,
      runtimeVersion: Updates.runtimeVersion,
      channel: Updates.channel,
      embedded: Updates.isEmbeddedLaunch,
    };
  } catch (e) {}
  return {
    revision: 'ads-20261101-r3',
    ...update,
    adsReady,
    rewardedLoaded,
    rewardedLoading,
    lastRewardedError,
  };
}

function isExpoGo() {
  try {
    const Constants = require('expo-constants').default;
    return Constants?.appOwnership === 'expo';
  } catch (e) {
    return false;
  }
}

function loadAdModules() {
  if (isExpoGo()) {
    console.log('[Ads] Expo Go — AdMob atlaniyor');
    return false;
  }
  try {
    const gma = require('react-native-google-mobile-ads');
    MobileAds = gma.default;
    InterstitialAd = gma.InterstitialAd;
    RewardedAd = gma.RewardedAd;
    RewardedInterstitialAd = gma.RewardedInterstitialAd;
    BannerAd = gma.BannerAd;
    BannerAdSize = gma.BannerAdSize;
    AdEventType = gma.AdEventType;
    RewardedAdEventType = gma.RewardedAdEventType;
    return true;
  } catch (e) {
    console.log('[Ads] react-native-google-mobile-ads yuklenmedi:', e.message);
    return false;
  }
}

async function requestTrackingPermission() {
  if (Platform.OS !== 'ios') return true;
  try {
    const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
    const { status } = await requestTrackingPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('[Ads] tracking-transparency yuklenmedi');
    return false;
  }
}

let initPromise = null;
let initRetryTimer = null;
let lifecycleSubscription = null;
let appState = AppState.currentState || 'active';
const isActive = () => appState === 'active';

function installAdLifecycle() {
  if (lifecycleSubscription) return;
  lifecycleSubscription = AppState.addEventListener('change', (state) => {
    const previous = appState;
    appState = state;
    // iOS briefly becomes inactive while opening native consent/advertising UI.
    if (state === 'background') {
      clearTimeout(rewardedRetryTimer);
      clearTimeout(initRetryTimer);
      if (rewardedLoading) resetRewarded();
      finishPending({ success: false, reward: null, reason: 'background', handled: true });
      cancelRetryPrompt?.();
    } else if (state === 'active' && previous !== 'active') {
      if (!adsReady) initAds();
      else { preloadRewarded(); drainPending(); }
    }
  });
}

export function initAds() {
  installAdLifecycle();
  if (adsReady) { preloadRewarded(); return Promise.resolve(); }
  if (initPromise) return initPromise;
  if (!loadAdModules()) return Promise.resolve();
  clearTimeout(initRetryTimer);
  initPromise = (async () => {
    let timer;
    try {
      await Promise.race([
        (async () => { await requestTrackingPermission(); await MobileAds().initialize(); })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Ad initialization timed out')), 20000);
        }),
      ]);
      adsReady = true;
      preloadInterstitial();
      preloadRewarded();
      preloadRewardedInterstitial();
    } catch (error) {
      recordRewardedError(error);
      if (isActive()) initRetryTimer = setTimeout(initAds, 10000);
    } finally {
      clearTimeout(timer);
      initPromise = null;
    }
  })();
  return initPromise;
}

let interstitialAd = null;
let interstitialLoaded = false;

function preloadInterstitial() {
  if (!adsReady || !InterstitialAd) return;
  try {
    interstitialAd = InterstitialAd.createForAdRequest(ids.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded = true;
    });
    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      setTimeout(preloadInterstitial, 1000);
    });
    interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('[Ads] interstitial yukleme hatasi:', error.message);
      interstitialLoaded = false;
      setTimeout(preloadInterstitial, 30000);
    });
    interstitialAd.load();
  } catch (e) {
    console.log('[Ads] preloadInterstitial hatasi:', e.message);
  }
}

export async function showInterstitial() {
  if (!adsReady || !interstitialLoaded || !interstitialAd) return false;
  try {
    await interstitialAd.show();
    return true;
  } catch (e) {
    console.log('[Ads] interstitial gosterme hatasi:', e.message);
    return false;
  }
}

let rewardedAd = null;
let rewardedLoaded = false;
let rewardedLoading = false;
let rewardedShowing = false;
let rewardedLoadedAt = 0;
let rewardedLoadAttempts = 0;
let rewardedRetryTimer = null;
let rewardedLoadTimer = null;
let preloadListenerUnsubs = [];
let pendingShowRequest = null;
let rewardFlowBusy = false;
let cancelRetryPrompt = null;
const REWARDED_TTL = 50 * 60 * 1000;

function cleanupPreloadListeners() {
  preloadListenerUnsubs.forEach((unsub) => { try { unsub?.(); } catch (e) {} });
  preloadListenerUnsubs = [];
  clearTimeout(rewardedLoadTimer);
}

function resetRewarded() {
  cleanupPreloadListeners();
  rewardedAd = null;
  rewardedLoaded = false;
  rewardedLoading = false;
}

function scheduleRewarded(delay) {
  clearTimeout(rewardedRetryTimer);
  if (isActive()) rewardedRetryTimer = setTimeout(preloadRewarded, delay);
}

function finishPending(result) {
  const request = pendingShowRequest;
  if (!request) return;
  pendingShowRequest = null;
  clearTimeout(request.timeoutId);
  try { request.onLoadingChange?.(false); } catch (e) {}
  request.resolve(result);
}

function attachShowListenersAndShow(resolve, onLoadingChange) {
  const ad = rewardedAd;
  if (!ad || rewardedShowing || !isActive()) {
    try { onLoadingChange?.(false); } catch (e) {}
    resolve({ success: false, reward: null, reason: 'unavailable' });
    return;
  }
  rewardedShowing = true;
  rewardedLoaded = false;
  let earned = false;
  let rewardData = { amount: 1 };
  let settled = false;
  const unsubs = [];
  const finish = (error) => {
    if (settled) return;
    settled = true;
    unsubs.forEach((unsub) => { try { unsub?.(); } catch (e) {} });
    rewardedShowing = false;
    resetRewarded();
    scheduleRewarded(1000);
    try { onLoadingChange?.(false); } catch (e) {}
    if (error) recordRewardedError(error);
    resolve({ success: earned, reward: earned ? rewardData : null,
      reason: earned ? 'earned' : error ? 'unavailable' : 'dismissed' });
  };
  try {
    unsubs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      earned = true;
      rewardData = { amount: reward.amount || 1 };
    }));
    unsubs.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish()));
    unsubs.push(ad.addAdEventListener(AdEventType.ERROR, finish));
    try { onLoadingChange?.(false); } catch (e) {}
    Promise.resolve(ad.show()).catch(finish);
  } catch (error) { finish(error); }
}

function drainPending() {
  if (!pendingShowRequest || !rewardedLoaded || !isActive()) return;
  const request = pendingShowRequest;
  pendingShowRequest = null;
  clearTimeout(request.timeoutId);
  attachShowListenersAndShow(request.resolve, request.onLoadingChange);
}

function preloadRewarded() {
  if (!adsReady || !RewardedAd || !isActive() || rewardedShowing) return;
  if (rewardedLoaded && Date.now() - rewardedLoadedAt >= REWARDED_TTL) resetRewarded();
  if (rewardedLoading || rewardedLoaded) return;
  clearTimeout(rewardedRetryTimer);
  resetRewarded();
  rewardedLoading = true;
  let ad = null;
  const fail = (error) => {
    // Ignore events/promises from a discarded load or from the presentation phase.
    if (rewardedAd !== ad || !rewardedLoading) return;
    recordRewardedError(error);
    resetRewarded();
    rewardedLoadAttempts++;
    scheduleRewarded([5000, 10000, 30000, 60000][Math.min(rewardedLoadAttempts - 1, 3)]);
    // A waiting user stays within the original 15s deadline while retrying.
  };
  try {
    ad = RewardedAd.createForAdRequest(ids.rewarded, { requestNonPersonalizedAdsOnly: false });
    rewardedAd = ad;
    preloadListenerUnsubs.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      if (rewardedAd !== ad || !rewardedLoading) return;
      cleanupPreloadListeners();
      rewardedLoaded = true;
      rewardedLoading = false;
      rewardedLoadedAt = Date.now();
      rewardedLoadAttempts = 0;
      lastRewardedError = null;
      drainPending();
    }));
    preloadListenerUnsubs.push(ad.addAdEventListener(AdEventType.ERROR, fail));
    rewardedLoadTimer = setTimeout(() => fail({ code: 'load-timeout', message: 'Ad load timed out' }), 20000);
    Promise.resolve(ad.load()).catch(fail);
  } catch (error) { fail(error); }
}

function requestRewarded(onLoadingChange) {
  return new Promise((resolve) => {
    if (__DEV__ && !RewardedAd) {
      resolve({ success: true, reward: { amount: 1 } });
      return;
    }
    if (!isActive()) {
      resolve({ success: false, reward: null, reason: 'background', handled: true });
      return;
    }
    if (rewardedLoaded && Date.now() - rewardedLoadedAt >= REWARDED_TTL) resetRewarded();
    if (rewardedLoaded && rewardedAd) {
      attachShowListenersAndShow(resolve, onLoadingChange);
      return;
    }
    try { onLoadingChange?.(true); } catch (e) {}
    pendingShowRequest = { resolve, onLoadingChange, timeoutId: setTimeout(() => {
      finishPending({ success: false, reward: null, reason: 'unavailable' });
    }, 15000) };
    if (!adsReady) initAds();
    else preloadRewarded();
  });
}

const RETRY_TEXT = {
  tr: ['Reklam şu an hazır değil', 'Reklam arka planda yeniden hazırlanıyor. Oyundan çıkmadan tekrar deneyebilirsin.', 'Tekrar dene', 'Vazgeç'],
  en: ['Ad not ready yet', 'We are preparing another ad. You can retry without leaving the game.', 'Try again', 'Cancel'],
  de: ['Werbung noch nicht bereit', 'Eine neue Werbung wird vorbereitet. Du kannst es erneut versuchen, ohne das Spiel zu verlassen.', 'Erneut versuchen', 'Abbrechen'],
  fr: ['Publicité pas encore prête', 'Une autre publicité est en préparation. Réessayez sans quitter le jeu.', 'Réessayer', 'Annuler'],
  es: ['Anuncio aún no disponible', 'Estamos preparando otro anuncio. Puedes reintentar sin salir del juego.', 'Reintentar', 'Cancelar'],
  ar: ['الإعلان غير جاهز بعد', 'نجهّز إعلانًا آخر. يمكنك المحاولة مجددًا دون مغادرة اللعبة.', 'حاول مجددًا', 'إلغاء'],
  ru: ['Реклама пока не готова', 'Готовим другую рекламу. Попробуйте ещё раз, не выходя из игры.', 'Повторить', 'Отмена'],
};

async function askRetry() {
  let lang = 'tr';
  try { lang = (await loadSettings()).language || 'tr'; } catch (e) {}
  if (!isActive()) return false;
  const text = RETRY_TEXT[lang] || RETRY_TEXT.en;
  return new Promise((resolve) => {
    let done = false;
    const finish = (retry) => {
      if (done) return;
      done = true;
      cancelRetryPrompt = null;
      resolve(retry && isActive());
    };
    cancelRetryPrompt = () => finish(false);
    Alert.alert(text[0], text[1], [
      { text: text[3], style: 'cancel', onPress: () => finish(false) },
      { text: text[2], onPress: () => finish(true) },
    ], { cancelable: true, onDismiss: () => finish(false) });
  });
}

export async function showRewarded(onLoadingChange) {
  // Covers native presentation, load waits and retry dialog, not just preloading.
  if (rewardFlowBusy) return { success: false, reward: null, reason: 'busy', handled: true };
  rewardFlowBusy = true;
  try {
    while (true) {
      const result = await requestRewarded(onLoadingChange);
      if (result.success || result.reason !== 'unavailable') return result;
      if (!await askRetry()) return { ...result, handled: true };
    }
  } finally {
    rewardFlowBusy = false;
    try { onLoadingChange?.(false); } catch (e) {}
  }
}

export function getBannerComponent() {
  if (!adsReady || !BannerAd || !BannerAdSize) return null;
  return { BannerAd, BannerAdSize, unitId: ids.banner };
}

export function isAdsAvailable() {
  return adsReady;
}

export function isAdFlowActive() {
  return rewardFlowBusy || rewardedShowing;
}

export function isRewardedReady() {
  return rewardedLoaded && Date.now() - rewardedLoadedAt < REWARDED_TTL;
}

export function resetAdFrequency() {
}

// ─── Rewarded Interstitial (FEAT-1) ──────────────────────────────
// Bölüm geçişinde otomatik gösterilir, izlerse +20 coin bonus, atlanabilir
let rewardedInterstitialAd = null;
let rewardedInterstitialLoaded = false;
let rewardedInterstitialLoading = false;

function preloadRewardedInterstitial() {
  if (!adsReady || !RewardedInterstitialAd) return;
  if (rewardedInterstitialLoading || rewardedInterstitialLoaded) return;
  try {
    rewardedInterstitialLoading = true;
    rewardedInterstitialAd = RewardedInterstitialAd.createForAdRequest(ids.rewardedInterstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    const loadUnsub = rewardedInterstitialAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedInterstitialLoaded = true;
      rewardedInterstitialLoading = false;
      console.log('[Ads] rewardedInterstitial preload OK');
      try { loadUnsub?.(); } catch (e) {}
    });
    const errUnsub = rewardedInterstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('[Ads] rewardedInterstitial yukleme hatasi:', error.message);
      rewardedInterstitialLoaded = false;
      rewardedInterstitialLoading = false;
      rewardedInterstitialAd = null;
      try { errUnsub?.(); } catch (e) {}
      // Tekrar dene 30sn sonra
      setTimeout(preloadRewardedInterstitial, 30000);
    });
    rewardedInterstitialAd.load();
  } catch (e) {
    console.log('[Ads] preloadRewardedInterstitial hatasi:', e.message);
    rewardedInterstitialLoading = false;
  }
}

/**
 * Rewarded Interstitial göster — bölüm geçişinde otomatik.
 * Resolve: { success: bool, reward: {amount} | null }
 *  - success: true → kullanıcı reklamı izledi → bonus coin verilebilir
 *  - success: false → reklam yüklenmedi VEYA kullanıcı atladı → bonus YOK ama oyun devam
 * Süre: kullanıcı bekliyorsa 5sn timeout (interstitial'e benzer hızlı), yoksa atlanır.
 */
export function showRewardedInterstitial() {
  return new Promise((resolve) => {
    if (!adsReady || !RewardedInterstitialAd) {
      if (__DEV__) {
        resolve({ success: true, reward: { amount: 1 } });
      } else {
        resolve({ success: false, reward: null });
      }
      return;
    }
    if (!rewardedInterstitialLoaded || !rewardedInterstitialAd) {
      // Hazır değil → gösterme, 5sn bekle (atlanır)
      const waitMs = 5000;
      const t0 = Date.now();
      const checkLoaded = setInterval(() => {
        if (rewardedInterstitialLoaded && rewardedInterstitialAd) {
          clearInterval(checkLoaded);
          attachRIShowAndResolve(resolve);
        } else if (Date.now() - t0 > waitMs) {
          clearInterval(checkLoaded);
          // Yüklenmedi, atla
          resolve({ success: false, reward: null });
        }
      }, 200);
      // Tetikle yükleme
      if (!rewardedInterstitialLoading) preloadRewardedInterstitial();
      return;
    }
    attachRIShowAndResolve(resolve);
  });
}

function attachRIShowAndResolve(resolve) {
  if (!rewardedInterstitialAd) {
    resolve({ success: false, reward: null });
    return;
  }
  let earned = false;
  let rewardData = { amount: 1 };
  let unsubs = [];
  const cleanup = () => { unsubs.forEach((u) => { try { u?.(); } catch (e) {} }); unsubs = []; };

  const earnUnsub = rewardedInterstitialAd.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    (reward) => { earned = true; rewardData = { amount: reward.amount || 1 }; }
  );
  unsubs.push(earnUnsub);

  const closeUnsub = rewardedInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
    cleanup();
    rewardedInterstitialLoaded = false;
    rewardedInterstitialAd = null;
    setTimeout(preloadRewardedInterstitial, 1000);
    resolve({ success: earned, reward: earned ? rewardData : null });
  });
  unsubs.push(closeUnsub);

  const errUnsub = rewardedInterstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
    console.log('[Ads] rewardedInterstitial show hatasi:', error.message);
    cleanup();
    rewardedInterstitialLoaded = false;
    rewardedInterstitialAd = null;
    setTimeout(preloadRewardedInterstitial, 1000);
    resolve({ success: false, reward: null });
  });
  unsubs.push(errUnsub);

  try {
    rewardedInterstitialAd.show();
  } catch (e) {
    cleanup();
    rewardedInterstitialLoaded = false;
    rewardedInterstitialAd = null;
    setTimeout(preloadRewardedInterstitial, 1000);
    resolve({ success: false, reward: null });
  }
}
