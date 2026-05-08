// AdMob entegrasyonu — react-native-google-mobile-ads
// Expo Go'da güvenli: modül yoksa stub olarak çalışır

import { Platform } from 'react-native';

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

export async function initAds() {
  if (!loadAdModules()) return;
  try {
    await requestTrackingPermission();
    await MobileAds().initialize();
    adsReady = true;
    console.log('[Ads] AdMob hazir');
    preloadInterstitial();
    preloadRewarded();
    preloadRewardedInterstitial();
  } catch (e) {
    console.log('[Ads] init hatasi:', e.message);
  }
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
let rewardedLoadAttempts = 0;
const REWARDED_MAX_RETRIES = 3;
let preloadListenerUnsubs = [];

let pendingShowRequest = null;

function cleanupPreloadListeners() {
  preloadListenerUnsubs.forEach((unsub) => {
    try { unsub?.(); } catch (e) {}
  });
  preloadListenerUnsubs = [];
}

function attachShowListenersAndShow(resolve, onLoadingChange) {
  if (!rewardedAd) {
    try { onLoadingChange?.(false); } catch (e) {}
    resolve({ success: false, reward: null });
    return;
  }

  let earned = false;
  let rewardData = { amount: 1 };
  let unsubs = [];

  const cleanup = () => {
    unsubs.forEach((u) => { try { u?.(); } catch (e) {} });
    unsubs = [];
  };

  const earnUnsub = rewardedAd.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    (reward) => {
      earned = true;
      rewardData = { amount: reward.amount || 1 };
    }
  );
  unsubs.push(earnUnsub);

  const closeUnsub = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
    cleanup();
    rewardedLoaded = false;
    rewardedAd = null;
    setTimeout(preloadRewarded, 1000);
    try { onLoadingChange?.(false); } catch (e) {}
    resolve({ success: earned, reward: earned ? rewardData : null });
  });
  unsubs.push(closeUnsub);

  const errUnsub = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
    console.log('[Ads] rewarded show hatasi:', error.message);
    cleanup();
    rewardedLoaded = false;
    rewardedAd = null;
    setTimeout(preloadRewarded, 1000);
    try { onLoadingChange?.(false); } catch (e) {}
    resolve({ success: false, reward: null });
  });
  unsubs.push(errUnsub);

  try {
    try { onLoadingChange?.(false); } catch (e) {}
    rewardedAd.show();
  } catch (e) {
    console.log('[Ads] rewarded show cagri hatasi:', e.message);
    cleanup();
    rewardedLoaded = false;
    rewardedAd = null;
    setTimeout(preloadRewarded, 1000);
    try { onLoadingChange?.(false); } catch (err) {}  // BUG-2 FIX: show patlarsa overlay kapansın
    resolve({ success: false, reward: null });
  }
}

function preloadRewarded() {
  if (!adsReady || !RewardedAd) return;
  if (rewardedLoading || rewardedLoaded) return;

  try {
    rewardedLoading = true;
    cleanupPreloadListeners();

    rewardedAd = RewardedAd.createForAdRequest(ids.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });

    const loadUnsub = rewardedAd.addAdEventListener(AdEventType.LOADED, () => {
      rewardedLoaded = true;
      rewardedLoading = false;
      rewardedLoadAttempts = 0;
      console.log('[Ads] rewarded preload OK');
      cleanupPreloadListeners();

      if (pendingShowRequest) {
        const req = pendingShowRequest;
        pendingShowRequest = null;
        if (req.timeoutId) clearTimeout(req.timeoutId);
        attachShowListenersAndShow(req.resolve, req.onLoadingChange);
      }
    });
    preloadListenerUnsubs.push(loadUnsub);

    const errorUnsub = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('[Ads] rewarded yukleme hatasi:', error.message);
      rewardedLoaded = false;
      rewardedLoading = false;
      rewardedLoadAttempts++;
      cleanupPreloadListeners();
      rewardedAd = null;

      if (pendingShowRequest) {
        const req = pendingShowRequest;
        pendingShowRequest = null;
        if (req.timeoutId) clearTimeout(req.timeoutId);
        try { req.onLoadingChange?.(false); } catch (e) {}
        req.resolve({ success: false, reward: null });
      }

      if (rewardedLoadAttempts < REWARDED_MAX_RETRIES) {
        setTimeout(preloadRewarded, 5000 * rewardedLoadAttempts);
      } else {
        setTimeout(() => { rewardedLoadAttempts = 0; preloadRewarded(); }, 60000);
      }
    });
    preloadListenerUnsubs.push(errorUnsub);

    rewardedAd.load();
  } catch (e) {
    console.log('[Ads] preloadRewarded hatasi:', e.message);
    rewardedLoading = false;
  }
}

export function showRewarded(onLoadingChange) {
  return new Promise((resolve) => {
    if (!adsReady || !RewardedAd) {
      if (__DEV__) {
        try { onLoadingChange?.(false); } catch (e) {}
        resolve({ success: true, reward: { amount: 1 } });
      } else {
        try { onLoadingChange?.(false); } catch (e) {}
        resolve({ success: false, reward: null });
      }
      return;
    }

    if (pendingShowRequest) {
      console.log('[Ads] baska bir reklam istegi zaten bekliyor');
      try { onLoadingChange?.(false); } catch (e) {}
      resolve({ success: false, reward: null });
      return;
    }

    if (rewardedLoaded && rewardedAd) {
      attachShowListenersAndShow(resolve, onLoadingChange);
      return;
    }

    try { onLoadingChange?.(true); } catch (e) {}

    const timeoutId = setTimeout(() => {
      console.log('[Ads] rewarded timeout — 15s boyunca yuklenmedi');
      pendingShowRequest = null;
      try { onLoadingChange?.(false); } catch (e) {}
      resolve({ success: false, reward: null });
    }, 15000);

    pendingShowRequest = { resolve, onLoadingChange, timeoutId };

    if (!rewardedLoading) {
      preloadRewarded();
    }
  });
}

export function getBannerComponent() {
  if (!adsReady || !BannerAd || !BannerAdSize) return null;
  return { BannerAd, BannerAdSize, unitId: ids.banner };
}

export function isAdsAvailable() {
  return adsReady;
}

export function isRewardedReady() {
  return rewardedLoaded;
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
    const loadUnsub = rewardedInterstitialAd.addAdEventListener(AdEventType.LOADED, () => {
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
