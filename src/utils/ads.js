// AdMob integration — 100% safe for Expo Go
// All native imports are lazy (require inside try-catch)
// In Expo Go: ads simply don't show, no crashes

import { Platform } from 'react-native';

const AD_IDS = {
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
};

let adsAvailable = false;

export async function initAds() {
  // Skip in Expo Go — will work in EAS Build
  try {
    const admob = require('react-native-google-mobile-ads');
    if (admob && admob.default) {
      await admob.default().initialize();
      adsAvailable = true;
    }
  } catch (e) {
    adsAvailable = false;
  }
}

export async function showInterstitial() {
  if (!adsAvailable) return false;
  try {
    const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
    const ad = InterstitialAd.createForAdRequest(AD_IDS.interstitial);
    return new Promise((resolve) => {
      ad.addAdEventListener(AdEventType.LOADED, () => ad.show().catch(() => resolve(false)));
      ad.addAdEventListener(AdEventType.CLOSED, () => resolve(true));
      ad.addAdEventListener(AdEventType.ERROR, () => resolve(false));
      ad.load();
      setTimeout(() => resolve(false), 10000);
    });
  } catch (e) { return false; }
}

export async function showRewarded() {
  if (!adsAvailable) return { success: false, reward: null };
  try {
    const { RewardedAd, RewardedAdEventType, AdEventType } = require('react-native-google-mobile-ads');
    const ad = RewardedAd.createForAdRequest(AD_IDS.rewarded);
    return new Promise((resolve) => {
      let rewarded = false;
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => { rewarded = true; });
      ad.addAdEventListener(AdEventType.CLOSED, () => resolve({ success: rewarded, reward: rewarded ? { amount: 1 } : null }));
      ad.addAdEventListener(AdEventType.ERROR, () => resolve({ success: false, reward: null }));
      ad.addAdEventListener(AdEventType.LOADED, () => ad.show().catch(() => resolve({ success: false, reward: null })));
      ad.load();
      setTimeout(() => resolve({ success: false, reward: null }), 10000);
    });
  } catch (e) { return { success: false, reward: null }; }
}

export function isAdsAvailable() { return adsAvailable; }
export { AD_IDS };
