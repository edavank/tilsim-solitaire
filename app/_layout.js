import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated, Image, Text, TouchableOpacity, Dimensions } from 'react-native';
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
import { COLORS, FONTS } from '../src/constants/theme';
import { initAds } from '../src/utils/ads';
import ConsentDialog from '../src/components/ConsentDialog';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { setVibrationEnabled, setSoundEnabled, setBgmEnabled, loadSounds, startBgm } from '../src/utils/sounds';
import { loadSettings, saveSettings } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');
const { width: SW } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe', available: true },
  { code: 'en', flag: '🇬🇧', name: 'English', available: true },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch', available: true },
  { code: 'fr', flag: '🇫🇷', name: 'Français', available: true },
  { code: 'es', flag: '🇪🇸', name: 'Español', available: true },
  { code: 'ar', flag: '🇸🇦', name: 'العربية', available: true },
];

function LanguageSelector({ onSelect }) {
  const [selected, setSelected] = useState(null);
  return (
    <View style={lang.overlay}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
      <Image source={OWL} style={lang.owl} />
      <Text style={lang.title}>Tılsım Solitaire</Text>
      <Text style={lang.subtitle}>Dil Seçin / Choose Language</Text>
      <View style={lang.list}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[lang.item, selected === l.code && { borderColor: COLORS.primary, borderWidth: 2 }]}
            onPress={() => { setSelected(l.code); setTimeout(() => onSelect(l.code), 300); }}
            activeOpacity={0.7}
          >
            <Text style={lang.flag}>{l.flag}</Text>
            <Text style={lang.name}>{l.name}</Text>
            {selected === l.code && <View style={lang.check}><Text style={{ color: '#fff', fontSize: 12 }}>✓</Text></View>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const lang = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 10000, alignItems: 'center', justifyContent: 'center', padding: 24 },
  owl: { width: 100, height: 100, borderRadius: 20, marginBottom: 12 },
  title: { fontFamily: 'Fondamento_400Regular_Italic', fontSize: 36, color: '#fff', marginBottom: 4 },
  subtitle: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  list: { width: '100%', gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  itemDisabled: { opacity: 0.4 },
  flag: { fontSize: 28 },
  name: { flex: 1, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#fff' },
  soon: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
});

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
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    initAds();
    try { require('../src/utils/auth').initAuth(); } catch (e) {}
    loadSounds().then(() => {
      loadSettings().then((s) => {
        setVibrationEnabled(s.vibration !== false);
        setSoundEnabled(s.sound !== false);
        setBgmEnabled(s.bgm !== false);
        if (s.bgm !== false) startBgm();
        // İlk açılışta dil seçimi göster
        if (!s.languageSelected) setShowLangPicker(true);
      });
    });
  }, []);

  const handleLanguageSelect = async (code) => {
    await saveSettings({ language: code, languageSelected: true });
    setShowLangPicker(false);
  };

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
      {splashDone && showLangPicker && <LanguageSelector onSelect={handleLanguageSelect} />}
      <ConsentDialog />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
});
