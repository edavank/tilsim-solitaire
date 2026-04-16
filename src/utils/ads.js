// AdMob entegrasyonu — react-native-google-mobile-ads
// Expo Go'da güvenli: modül yoksa stub olarak çalışır
// Kurulum: npm install react-native-google-mobile-ads --legacy-peer-deps
// + app.json plugins'e AdMob config ekle (docs/LAUNCH_TODO.md)

import { Platform } from 'react-native';

// ─── Ad Unit ID'leri ────────────────────────────────────
// ⚠️ YAYINDAN ÖNCE: production ID'leri gerçek AdMob ID'lerinle değiştir
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
  },
  production: {
    banner: Platform.select({
      ios: 'ca-app-pub-6957067642370440/1277929434',
      android: 'ca-app-pub-6957067642370440/4650198232',
    }),
    interstitial: Platform.select({
      ios: 'ca-app-pub-6957067642370440/8964847764',
      android: 'ca-app-pub-6957067642370440/7620585313',
    }),
    rewarded: Platform.select({
      ios: 'ca-app-pub-6957067642370440/4182248190',
      android: 'ca-app-pub-6957067642370440/6307503647',
    }),
  },
};

// __DEV__ = Expo dev mode, production build'de false olur
const ids = __DEV__ ? AD_IDS.test : AD_IDS.production;

// ─── Lazy imports (Expo Go güvenli) ─────────────────────
let MobileAds = null;
let InterstitialAd = null;
let RewardedAd = null;
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
  // Expo Go'da native modül yok — yüklemeye çalışma
  if (isExpoGo()) {
    console.log('[Ads] Expo Go — AdMob atlanıyor');
    return false;
  }
  try {
    const gma = require('react-native-google-mobile-ads');
    MobileAds = gma.default;
    InterstitialAd = gma.InterstitialAd;
    RewardedAd = gma.RewardedAd;
    BannerAd = gma.BannerAd;
    BannerAdSize = gma.BannerAdSize;
    AdEventType = gma.AdEventType;
    RewardedAdEventType = gma.RewardedAdEventType;
    return true;
  } catch (e) {
    console.log('[Ads] react-native-google-mobile-ads yüklenmedi:', e.message);
    return false;
  }
}

// ─── Tracking Transparency (iOS ATT) ───────────────────
async function requestTrackingPermission() {
  if (Platform.OS !== 'ios') return true;
  try {
    const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
    const { status } = await requestTrackingPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    console.log('[Ads] tracking-transparency yüklenmedi');
    return false;
  }
}

// ─── Init ───────────────────────────────────────────────
export async function initAds() {
  if (!loadAdModules()) return;
  try {
    await requestTrackingPermission();
    await MobileAds().initialize();
    adsReady = true;
    console.log('[Ads] AdMob hazır');
    preloadInterstitial();
  } catch (e) {
    console.log('[Ads] init hatası:', e.message);
  }
}

// ─── Interstitial ───────────────────────────────────────
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
      console.log('[Ads] interstitial yükleme hatası:', error.message);
      interstitialLoaded = false;
      setTimeout(preloadInterstitial, 30000);
    });

    interstitialAd.load();
  } catch (e) {
    console.log('[Ads] preloadInterstitial hatası:', e.message);
  }
}

export async function showInterstitial() {
  if (!adsReady || !interstitialLoaded || !interstitialAd) return false;
  try {
    await interstitialAd.show();
    return true;
  } catch (e) {
    console.log('[Ads] interstitial gösterme hatası:', e.message);
    return false;
  }
}

// ─── Rewarded ───────────────────────────────────────────
export function showRewarded() {
  return new Promise((resolve) => {
    if (!adsReady || !RewardedAd) {
      // AdMob yoksa yine ödül ver (geliştirme modu)
      resolve({ success: true, reward: { amount: 1 } });
      return;
    }

    let resolved = false;
    const safeResolve = (result) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };

    // 30 saniye timeout — reklam hiç yüklenmezse sonsuza kadar beklemesin
    const timeoutId = setTimeout(() => {
      console.log('[Ads] rewarded timeout — 30s boyunca yanıt gelmedi');
      safeResolve({ success: false, reward: null });
    }, 30000);

    try {
      const rewarded = RewardedAd.createForAdRequest(ids.rewarded, {
        requestNonPersonalizedAdsOnly: false,
      });

      let earned = false;
      let rewardData = { amount: 1 };

      const loadUnsub = rewarded.addAdEventListener(AdEventType.LOADED, () => {
        rewarded.show();
      });

      const earnUnsub = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          earned = true;
          rewardData = { amount: reward.amount || 1 };
        }
      );

      const closeUnsub = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        clearTimeout(timeoutId);
        cleanup();
        safeResolve({ success: earned, reward: earned ? rewardData : null });
      });

      const errorUnsub = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('[Ads] rewarded hatası:', error.message);
        clearTimeout(timeoutId);
        cleanup();
        safeResolve({ success: false, reward: null });
      });

      function cleanup() {
        loadUnsub();
        earnUnsub();
        closeUnsub();
        errorUnsub();
      }

      rewarded.load();
    } catch (e) {
      console.log('[Ads] showRewarded hatası:', e.message);
      clearTimeout(timeoutId);
      safeResolve({ success: false, reward: null });
    }
  });
}

// ─── Banner ─────────────────────────────────────────────
export function getBannerComponent() {
  if (!adsReady || !BannerAd || !BannerAdSize) return null;
  return { BannerAd, BannerAdSize, unitId: ids.banner };
}

// ─── Helpers ────────────────────────────────────────────
export function isAdsAvailable() {
  return adsReady;
}

export function resetAdFrequency() {
  // Frekans kontrolü game.js'de (her 3 bölümde bir)
}
