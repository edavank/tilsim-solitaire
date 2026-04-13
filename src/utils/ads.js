// AdMob stub — Expo Go ve şu anki build için
// Firebase + AdMob kurulduktan sonra gerçek entegrasyon yapılacak
// Rehber: docs/FIREBASE_SETUP.md

export async function initAds() {
  // No-op
}

export async function showInterstitial() {
  return false;
}

export async function showRewarded() {
  // Test modunda her zaman ödül ver
  return { success: true, reward: { amount: 1 } };
}

export function isAdsAvailable() {
  return false;
}

export function getBannerComponent() {
  return null;
}

export function resetAdFrequency() {}
