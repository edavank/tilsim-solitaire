// AdMob stub — works in Expo Go (no native modules)
// In production EAS Build: replace with real AdMob integration

export async function initAds() {
  // No-op in Expo Go
}

export async function showInterstitial() {
  return false;
}

export async function showRewarded() {
  // In Expo Go: always give reward (for testing)
  return { success: true, reward: { amount: 1 } };
}

export function isAdsAvailable() {
  return false;
}
