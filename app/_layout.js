import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated, Image, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  Fondamento_400Regular,
  Fondamento_400Regular_Italic,
} from '@expo-google-fonts/fondamento';
import { COLORS } from '../src/constants/theme';
import { initAds } from '../src/utils/ads';
import ConsentDialog from '../src/components/ConsentDialog';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { setVibrationEnabled, setSoundEnabled, loadSounds } from '../src/utils/sounds';
import { loadSettings } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');

function AnimatedSplash({ onFinish }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.timing(textFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(800),
      Animated.timing(fadeIn, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[sp.container, { opacity: fadeIn }]}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
      <Animated.Image source={OWL} style={[sp.owl, { transform: [{ scale }] }]} />
      <Animated.View style={{ opacity: textFade, alignItems: 'center' }}>
        <Text style={sp.title}>Tılsım</Text>
        <Text style={sp.sub}>S O L İ T A İ R E</Text>
      </Animated.View>
    </Animated.View>
  );
}

const sp = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  owl: { width: 120, height: 120, borderRadius: 24, marginBottom: 16 },
  title: { fontFamily: 'Fondamento_400Regular_Italic', fontSize: 48, color: '#fff' },
  sub: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: COLORS.primary, letterSpacing: 6, marginTop: -2 },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
    BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_700Bold,
    Fondamento_400Regular, Fondamento_400Regular_Italic,
  });

  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    initAds();
    try { require('../src/utils/auth').initAuth(); } catch (e) {}
    loadSounds();
    loadSettings().then((s) => {
      setVibrationEnabled(s.vibration !== false);
      setSoundEnabled(s.sound !== false);
    });
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.surface }, animation: 'fade' }} />
      {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
      <ConsentDialog />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
});
