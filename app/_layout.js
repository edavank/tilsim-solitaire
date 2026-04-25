import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated, Image, Text, TouchableOpacity } from 'react-native';
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
// ConsentDialog kaldırıldı — Apple'ın ATT sistemi zaten izin alıyor
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { setVibrationEnabled, setSoundEnabled, setBgmEnabled, loadSounds, startBgm, initSoundSettings } from '../src/utils/sounds';
import { loadSettings, saveSettings } from '../src/utils/storage';
import { LanguageProvider, useLang } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import UpdatePrompt from '../src/components/UpdatePrompt';

const OWL = require('../assets/bilge-happy.png');

const LANGUAGES = [
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe', available: true },
  { code: 'en', flag: '🇬🇧', name: 'English', available: true },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch', available: true },
  { code: 'fr', flag: '🇫🇷', name: 'Français', available: true },
  { code: 'es', flag: '🇪🇸', name: 'Español', available: true },
  { code: 'ar', flag: '🇸🇦', name: 'العربية', available: true },
  { code: 'ru', flag: '🇷🇺', name: 'Русский', available: true },
];

function LanguageSelector({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const timeoutRef = useRef(null);
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);
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
            onPress={() => {
              setSelected(l.code);
              // Stale-closure fix: önceki timer'ı iptal et ki hızlı çift tıklamada
              // yanlış (eski) dil seçilmesin.
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              timeoutRef.current = setTimeout(() => onSelect(l.code), 300);
            }}
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
  owl: { width: 120, height: 70, resizeMode: 'contain', marginBottom: 12 },
  title: { fontFamily: 'Fondamento_400Regular_Italic', fontSize: 36, color: '#fff', marginBottom: 4 },
  subtitle: { fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 24 },
  list: { width: '100%', gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  flag: { fontSize: 28 },
  name: { flex: 1, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: '#fff' },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
});

function AnimatedSplash({ onFinish }) {
  const fadeIn = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(textFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(1000),
      Animated.timing(fadeIn, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[sp.container, { opacity: fadeIn }]}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
      <Animated.Image source={OWL} style={[sp.owl, { transform: [{ scale }] }]} />
      <Animated.View style={{ opacity: textFade, alignItems: 'center' }}>
        <Text style={sp.title}>Tılsım</Text>
        <Text style={sp.sub}>S O L I T A I R E</Text>
      </Animated.View>
    </Animated.View>
  );
}

const sp = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  owl: { width: 160, height: 90, resizeMode: 'contain', marginBottom: 16 },
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
    loadSounds().then(() => {
      loadSettings().then((s) => {
        setVibrationEnabled(s.vibration !== false);
        setSoundEnabled(s.sound !== false);
        setBgmEnabled(s.bgm !== false);
        if (s.bgm !== false) startBgm();
        if (!s.languageSelected) setShowLangPicker(true);
      }).catch(() => {});
    }).catch(() => {});
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
    <LanguageProvider>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.surface }, animation: 'fade' }} />
          {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
          {splashDone && showLangPicker && (
            <LanguageSelectorWithContext onDone={() => setShowLangPicker(false)} />
          )}
          {/* ConsentDialog kaldırıldı — ATT yeterli */}
          {/* OTA Update prompt — en üst katmanda, splash ve dil seçici kapandıktan sonra görünür */}
          {splashDone && !showLangPicker && <UpdatePrompt />}
        </GestureHandlerRootView>
      </AuthProvider>
    </LanguageProvider>
  );
}

// LanguageContext'i kullanabilen dil seçici — Provider içinde render edildiği için erişebilir.
// Bu sayede dil seçildiğinde context gerçek zamanlı güncellenir, uygulama yeniden başlatılmaz.
function LanguageSelectorWithContext({ onDone }) {
  const { setLang } = useLang();
  const handleSelect = async (code) => {
    await setLang(code); // hem context güncellenir hem AsyncStorage'a yazılır
    onDone();
  };
  return <LanguageSelector onSelect={handleSelect} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
});
