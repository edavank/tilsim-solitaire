// AdMob integration for Tılsım Solitaire
// Requires EAS Build (development/production) — won't work in Expo Go
// 
// Setup:
// 1. Create AdMob account: https://admob.google.com
// 2. Create app (iOS + Android)
// 3. Create ad units: banner, interstitial, rewarded
// 4. Replace TEST IDs below with real IDs before production build

import { Platform } from 'react-native';

// ── Ad Unit IDs ──
// Using Google's test ad IDs — REPLACE WITH REAL IDs FOR PRODUCTION
const AD_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',     // iOS test
    android: 'ca-app-pub-3940256099942544/6300978111',  // Android test
  }),
  interstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  }),
  rewarded: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  }),
};

let MobileAds, BannerAd, BannerAdSize, InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType;
let adsLoaded = false;
let interstitialAd = null;
let rewardedAd = null;

// ── Initialize ──
export async function initAds() {
  try {
    const admob = require('react-native-google-mobile-ads');
    MobileAds = admob.default;
    BannerAd = admob.BannerAd;
    BannerAdSize = admob.BannerAdSize;
    InterstitialAd = admob.InterstitialAd;
    RewardedAd = admob.RewardedAd;
    AdEventType = admob.AdEventType;
    RewardedAdEventType = admob.RewardedAdEventType;

    await MobileAds().initialize();
    adsLoaded = true;
    console.log('AdMob initialized');
    
    // Pre-load ads
    loadInterstitial();
    loadRewarded();
  } catch (e) {
    console.log('AdMob not available (Expo Go?):', e.message);
    adsLoaded = false;
  }
}

// ── Interstitial (between levels) ──
function loadInterstitial() {
  if (!adsLoaded || !InterstitialAd) return;
  interstitialAd = InterstitialAd.createForAdRequest(AD_IDS.interstitial);
  interstitialAd.load();
}

export async function showInterstitial() {
  if (!adsLoaded || !interstitialAd) return false;
  return new Promise((resolve) => {
    const unsubClose = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClose();
      loadInterstitial(); // pre-load next
      resolve(true);
    });
    const unsubError = interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      unsubError();
      loadInterstitial();
      resolve(false);
    });
    interstitialAd.show().catch(() => resolve(false));
  });
}

// ── Rewarded (watch ad for coins/moves) ──
function loadRewarded() {
  if (!adsLoaded || !RewardedAd) return;
  rewardedAd = RewardedAd.createForAdRequest(AD_IDS.rewarded);
  rewardedAd.load();
}

export async function showRewarded() {
  if (!adsLoaded || !rewardedAd) return { success: false, reward: null };
  return new Promise((resolve) => {
    const unsubReward = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      unsubReward();
      resolve({ success: true, reward });
    });
    const unsubClose = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClose();
      loadRewarded(); // pre-load next
    });
    const unsubError = rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
      unsubError();
      loadRewarded();
      resolve({ success: false, reward: null });
    });
    rewardedAd.show().catch(() => resolve({ success: false, reward: null }));
  });
}

// ── Banner component helper ──
export function getBannerComponent() {
  if (!adsLoaded || !BannerAd) return null;
  return { BannerAd, BannerAdSize, unitId: AD_IDS.banner };
}

// ── Check availability ──
export function isAdsAvailable() { return adsLoaded; }

export { AD_IDS };
