// Tılsım Solitaire — AdMob Gerçek Entegrasyon
// react-native-google-mobile-ads ile çalışır (EAS Build gerekli)
// Expo Go'da stub mod devreye girer (crash olmaz)

import { Platform } from 'react-native';

// ════════════════════════════════════════════
// AD UNIT ID'LERİ
// ════════════════════════════════════════════
// ⚠️ PRODUCTION'DA BUNLARI GERÇEK AD UNIT ID'LERİNLE DEĞİŞTİR
// AdMob Dashboard → Apps → Ad units → Create ad unit

const AD_IDS = {
  test: {
    banner: Platform.select({
      ios: 'ca-app-pub-3940256099942544/2435281174',
      android: 'ca-app-pub-3940256099942544/9214589741',
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
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/AAAAAAAAAA',
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB',
    }),
    interstitial: Platform.select({
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/CCCCCCCCCC',
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/DDDDDDDDDD',
    }),
    rewarded: Platform.select({
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/EEEEEEEEEE',
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/FFFFFFFFFF',
    }),
  },
};

const IDS = __DEV__ ? AD_IDS.test : AD_IDS.production;

// ════════════════════════════════════════════
// MODULE STATE
// ════════════════════════════════════════════
let mobileAds = null;
let InterstitialAd = null;
let RewardedAd = null;
let BannerAd = null;
let BannerAdSize = null;
let AdEventType = null;
let RewardedAdEventType = null;

let interstitialAd = null;
let rewardedAd = null;
let adsReady = false;
let adsInitialized = false;

let levelsSinceLastAd = 0;
const INTERSTITIAL_FREQUENCY = 3;

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
export async function initAds() {
  if (adsInitialized) return;
  adsInitialized = true;

  try {
    const mod = require('react-native-google-mobile-ads');
    mobileAds = mod.default;
    InterstitialAd = mod.InterstitialAd;
    RewardedAd = mod.RewardedAd;
    BannerAd = mod.BannerAd;
    BannerAdSize = mod.BannerAdSize;
    AdEventType = mod.AdEventType;
    RewardedAdEventType = mod.RewardedAdEventType;

    await mobileAds().initialize();

    // iOS ATT
    try {
      const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
      await requestTrackingPermissionsAsync();
    } catch (e) {}

    adsReady = true;
    console.log('✅ AdMob initialized');
    loadInterstitial();
    loadRewarded();
  } catch (e) {
    console.log('ℹ️ AdMob unavailable (Expo Go?) — stub mode');
    adsReady = false;
  }
}

// ════════════════════════════════════════════
// INTERSTITIAL
// ════════════════════════════════════════════
function loadInterstitial() {
  if (!adsReady || !InterstitialAd) return;
  try {
    interstitialAd = InterstitialAd.createForAdRequest(IDS.interstitial);
    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      console.log('📺 Interstitial loaded');
    });
    interstitialAd.addAdEventListener(AdEventType.ERROR, (err) => {
      setTimeout(loadInterstitial, 30000);
    });
    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      loadInterstitial();
    });
    interstitialAd.load();
  } catch (e) {}
}

export async function showInterstitial() {
  levelsSinceLastAd++;
  if (levelsSinceLastAd < INTERSTITIAL_FREQUENCY) return false;
  if (!adsReady || !interstitialAd) return false;
  try {
    if (interstitialAd.loaded) {
      await interstitialAd.show();
      levelsSinceLastAd = 0;
      return true;
    }
  } catch (e) {}
  return false;
}

// ════════════════════════════════════════════
// REWARDED
// ════════════════════════════════════════════
function loadRewarded() {
  if (!adsReady || !RewardedAd) return;
  try {
    rewardedAd = RewardedAd.createForAdRequest(IDS.rewarded);
    rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('🎁 Rewarded loaded');
    });
    rewardedAd.addAdEventListener(AdEventType.ERROR, (err) => {
      setTimeout(loadRewarded, 30000);
    });
    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      loadRewarded();
    });
    rewardedAd.load();
  } catch (e) {}
}

export function showRewarded() {
  return new Promise((resolve) => {
    if (!adsReady || !rewardedAd) {
      // Stub — Expo Go'da test için ödül ver
      resolve({ success: true, reward: { amount: 1 } });
      return;
    }
    try {
      if (!rewardedAd.loaded) {
        resolve({ success: false, error: 'Reklam henüz yüklenmedi' });
        return;
      }
      let rewarded = false;
      const rL = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { rewarded = true; });
      const cL = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        rL(); cL();
        resolve({ success: rewarded, reward: rewarded ? { amount: 1 } : null });
      });
      rewardedAd.show();
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}

// ════════════════════════════════════════════
// BANNER
// ════════════════════════════════════════════
export function getBannerComponent() {
  if (!adsReady || !BannerAd) return null;
  return { BannerAd, BannerAdSize, unitId: IDS.banner };
}

// ════════════════════════════════════════════
// STATUS
// ════════════════════════════════════════════
export function isAdsAvailable() {
  return adsReady;
}

export function getAdIds() {
  return IDS;
}

export function resetAdFrequency() {
  levelsSinceLastAd = 0;
}
