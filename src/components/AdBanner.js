// AdBanner — kendi kendine render olur, ads hazır değilse hiç bir şey göstermez
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { getBannerComponent, isAdsAvailable } from '../utils/ads';

export default function AdBanner({ style }) {
  const [ready, setReady] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let mounted = true;
    // Ads hazır değilse 1 sn aralıklarla poll et (max 5 sn)
    let attempts = 0;
    const check = () => {
      if (!mounted) return;
      if (isAdsAvailable()) {
        const b = getBannerComponent();
        if (b) {
          setBanner(b);
          setReady(true);
          return;
        }
      }
      attempts++;
      if (attempts < 5) setTimeout(check, 1000);
    };
    check();
    return () => { mounted = false; };
  }, []);

  if (!ready || !banner) {
    // Fallback: boş alan, banner yüklenince doldurur
    return <View style={[{ height: 60 }, style]} />;
  }

  const { BannerAd, BannerAdSize, unitId } = banner;
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={(e) => console.log('[Banner] fail:', e?.message)}
      />
    </View>
  );
}
