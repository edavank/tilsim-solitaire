import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress } from '../src/utils/storage';

const { width: SW } = Dimensions.get('window');
const OWL_IMAGE = require('../assets/bilge-happy.png');

export default function HomeScreen() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [coins, setCoins] = useState(310);

  useEffect(() => {
    loadProgress().then((p) => { setCurrentLevel(p.currentLevel); setCoins(p.coins); });
  }, []);
  const owlBounce = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(owlBounce, { toValue: -15, duration: 2000, useNativeDriver: true }),
      Animated.timing(owlBounce, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(glowPulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);

  const glowOpacity = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Image source={OWL_IMAGE} style={s.headerAvatar} />
          <Text style={s.headerTitle}>Tılsım Solitaire</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.coinBadge} onPress={() => router.push('/store')}>
            <MaterialIcons name="monetization-on" size={18} color={COLORS.coin} />
            <Text style={s.coinText}>{coins.toLocaleString()}</Text>
            <Text style={s.coinPlus}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.settingsBtn} onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={22} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <Animated.View style={[s.main, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Language picker */}
        <TouchableOpacity style={s.langPicker}>
          <MaterialIcons name="language" size={16} color={COLORS.onSurface} />
          <Text style={s.langText}>TÜRKÇE</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={COLORS.onSurface} />
        </TouchableOpacity>

        {/* Logo */}
        <Text style={s.logoMain}>Tılsım</Text>
        <Text style={s.logoSub}>S O L İ T A İ R E</Text>

        {/* Speech bubble */}
        <View style={s.speechBubble}>
          <Text style={s.speechText}>Hoş geldin! Bugün harika bir gün.</Text>
          <View style={s.speechArrow} />
        </View>

        {/* Owl */}
        <Animated.View style={[s.owlWrap, { transform: [{ translateY: owlBounce }] }]}>
          <Image source={OWL_IMAGE} style={s.owlImage} />
        </Animated.View>

        {/* CTA Button */}
        <TouchableOpacity style={s.ctaOuter} activeOpacity={0.85} onPress={() => router.push({ pathname: '/game', params: { level: currentLevel } })}>
          <Animated.View style={[s.ctaGlow, { opacity: glowOpacity }]} />
          <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaBtn}>
            <Text style={s.ctaTitle}>BÖLÜM {currentLevel}</Text>
            <Text style={s.ctaSub}>MACERA DEVAM EDİYOR</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Watch ad button */}
        <TouchableOpacity style={s.adBtn} activeOpacity={0.7}>
          <View style={s.adLeft}>
            <MaterialIcons name="play-circle-filled" size={28} color={COLORS.secondary} />
            <Text style={s.adText}>Reklam İzle</Text>
          </View>
          <View style={s.adBadge}>
            <Text style={s.adBadgeText}>+50 Altın</Text>
          </View>
        </TouchableOpacity>

      </Animated.View>

      <BottomNav activeTab="home" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 8, zIndex: 50,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff', fontStyle: 'italic' },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },
  coinPlus: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },

  main: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100, paddingHorizontal: 24 },

  langPicker: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  langText: { fontFamily: FONTS.bodyBold, fontSize: 12, color: COLORS.onSurface, letterSpacing: 3 },

  logoMain: { fontFamily: FONTS.logo, fontSize: 60, color: '#fff', includeFontPadding: false },
  logoSub: { fontFamily: FONTS.headline, fontSize: 18, color: COLORS.primary, letterSpacing: 6, marginTop: -4, marginBottom: 8 },

  speechBubble: {
    backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 16, marginBottom: 4, alignSelf: 'center',
  },
  speechText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurface },
  speechArrow: {
    position: 'absolute', bottom: -8, left: '50%', marginLeft: -8,
    width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 8,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: 'rgba(255,255,255,0.1)',
  },

  owlWrap: { width: SW * 0.55, height: SW * 0.55, marginBottom: 16 },
  owlImage: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 16 },

  ctaOuter: { width: '100%', maxWidth: 340, marginBottom: 16 },
  ctaGlow: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.primary,
  },
  ctaBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 18,
    borderRadius: SIZES.radiusFull,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  ctaTitle: { fontFamily: FONTS.headlineBlack, fontSize: 26, color: '#fff', letterSpacing: 2 },
  ctaSub: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginTop: 2 },

  adBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: 340,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  adLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adText: { fontFamily: FONTS.headline, fontSize: 15, color: COLORS.onSurface },
  adBadge: { backgroundColor: COLORS.tertiary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  adBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#fff' },
});
