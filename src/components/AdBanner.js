import React, { useEffect, useState, useRef } from 'react';
import { View, AppState } from 'react-native';
import { getBannerComponent, subscribeAdAvailability } from '../utils/ads';

export default function AdBanner({ style }) {
  const [banner, setBanner] = useState(() => getBannerComponent());
  const [revision, setRevision] = useState(0);
  const retryTimer = useRef(null);
  const failures = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeAdAvailability(() => {
      if (mounted.current) setBanner(getBannerComponent());
    });
    const foreground = AppState.addEventListener('change',state => {
      if (state !== 'active') {clearTimeout(retryTimer.current); return;}
      if (mounted.current) {
        setBanner(getBannerComponent());
        if (failures.current) setRevision(value=>value+1);
      }
    });
    return () => { mounted.current=false; unsubscribe(); foreground.remove(); clearTimeout(retryTimer.current); };
  }, []);

  const retry = () => {
    if (!mounted.current) return;
    failures.current++;
    clearTimeout(retryTimer.current);
    if (AppState.currentState !== 'active') return;
    retryTimer.current = setTimeout(() => {
      if (mounted.current) setRevision(value=>value+1);
    }, Math.min(10000*failures.current,60000));
  };
  if (!banner) return <View style={[{height:60},style]} />;
  const {BannerAd,BannerAdSize,unitId} = banner;
  return <View style={[{alignItems:'center',justifyContent:'center'},style]}>
    <BannerAd key={revision} unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{requestNonPersonalizedAdsOnly:false}}
      onAdLoaded={() => {failures.current=0;clearTimeout(retryTimer.current);}}
      onAdFailedToLoad={retry} />
  </View>;
}
