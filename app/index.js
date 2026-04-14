import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SIZES, getThemeGradient } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';
import { isDailyChallengeCompleted } from '../src/utils/dailyChallenge';
// seasonalEvents kaldırıldı

const { width: SW } = Dimensions.get('window');
const OWL_IMAGE = require('../assets/bilge-happy.png');

/* ── Floating Particles Background ── */
function FloatingParticles() {
  const particles = useRef([...Array(12)].map(() => ({
    anim: new Animated.Value(0),
    x: Math.random() * SW,
    y: 100 + Math.random() * 500,
    size: 6 + Math.random() * 10,
    duration: 3000 + Math.random() * 4000,
    color: ['rgba(155,125,255,0.5)', 'rgba(255,138,167,0.4)', 'rgba(255,209,102,0.45)'][Math.floor(Math.random() * 3)],
  }))).current;

  useEffect(() => {
    particles.forEach((p) => {
      Animated.loop(Animated.sequence([
        Animated.timing(p.anim, { toValue: 1, duration: p.duration, useNativeDriver: true }),
        Animated.timing(p.anim, { toValue: 0, duration: p.duration, useNativeDriver: true }),
      ])).start();
    });
  }, []);

  return (
    <View style={{ ...StyleSheet.absoluteFillObject }} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: p.size,
          backgroundColor: p.color,
          opacity: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }),
          transform: [{ translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -50] }) }],
        }} />
      ))}
    </View>
  );
}

const LANG_FLAGS = { tr: '🇹🇷 TÜRKÇE', en: '🇬🇧 ENGLISH', de: '🇩🇪 DEUTSCH', fr: '🇫🇷 FRANÇAIS', es: '🇪🇸 ESPAÑOL', ar: '🇸🇦 العربية' };

export default function HomeScreen() {
  const { lang, t } = useLang();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [dailyDone, setDailyDone] = useState(false);
  const [activeTheme, setActiveTheme] = useState('cosmic');
  const [unseenAch, setUnseenAch] = useState(0);
  const [bilgeMsg] = useState(() => {
    const msgs = t.bilgeMessages || [];
    return msgs[Math.floor(Math.random() * msgs.length)] || '';
  });

  // Refresh on screen focus (coming back from game)
  useFocusEffect(
    useCallback(() => {
      loadProgress().then((p) => { setCurrentLevel(p.currentLevel); setCoins(p.coins); setActiveTheme(p.activeTheme || 'cosmic'); setUnseenAch(p.unseenAch || 0); });
      isDailyChallengeCompleted().then(setDailyDone);
    }, [])
  );
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
      <LinearGradient colors={getThemeGradient(activeTheme)} style={StyleSheet.absoluteFillObject} />
      <FloatingParticles />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity style={s.coinBadge} onPress={() => router.push('/store')}>
            <Text style={{ fontSize: 14 }}>🪙</Text>
            <Text style={s.coinText}>{coins.toLocaleString()}</Text>
            <Text style={s.coinPlus}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.settingsBtn} onPress={() => router.push('/settings')}>
            <MaterialIcons name="settings" size={22} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main content */}
      <Animated.View style={[s.main, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Logo */}
        <Text style={s.logoMain}>Tılsım</Text>
        <Text style={s.logoSub}>{t.solitaire}</Text>

        {/* Owl */}
        <Animated.View style={[s.owlWrap, { transform: [{ translateY: owlBounce }] }]}>
          <Image source={OWL_IMAGE} style={s.owlImage} />
        </Animated.View>

        {/* CTA Button — Klasik Mod */}
        <TouchableOpacity style={s.ctaOuter} activeOpacity={0.85} onPress={() => router.push({ pathname: '/game', params: { level: currentLevel } })}>
          <Animated.View style={[s.ctaGlow, { opacity: glowOpacity }]} />
          <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaBtn}>
            <Text style={s.ctaTitle}>{t.level} {currentLevel}</Text>
            <Text style={s.ctaSub}>{t.adventure}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Zamanlı Mod — Seviye 5'ten sonra açılır */}
        {currentLevel >= 5 ? (
          <TouchableOpacity style={[s.levelSelectBtn, { borderColor: '#FF7043', borderWidth: 1.5 }]} activeOpacity={0.7}
            onPress={() => router.push({ pathname: '/game', params: { level: currentLevel, timed: '1' } })}>
            <MaterialIcons name="timer" size={20} color="#FF7043" />
            <Text style={s.levelSelectText}>{t.timedMode}</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        ) : (
          <View style={[s.levelSelectBtn, { opacity: 0.4 }]}>
            <MaterialIcons name="timer" size={20} color="#FF7043" />
            <Text style={s.levelSelectText}>{t.timedMode}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.onSurfaceVariant }}>Lv.5</Text>
          </View>
        )}

        {/* Günlük Meydan Okuma — Seviye 10'dan sonra açılır */}
        {currentLevel >= 10 ? (
          <TouchableOpacity 
            style={[s.levelSelectBtn, { borderColor: COLORS.coin, borderWidth: 1.5, shadowColor: COLORS.coin, shadowOpacity: 0.3 }, dailyDone && { opacity: 0.6 }]} 
            activeOpacity={0.7} 
            onPress={() => router.push('/daily')}
          >
            <Text style={{ fontSize: 18 }}>📅</Text>
            <Text style={s.levelSelectText}>{t.dailyChallengeHome} {dailyDone ? '✅' : ''}</Text>
            <MaterialIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        ) : (
          <View style={[s.levelSelectBtn, { opacity: 0.4 }]}>
            <Text style={{ fontSize: 18 }}>🔒</Text>
            <Text style={s.levelSelectText}>{t.dailyChallengeHome}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 10, color: COLORS.onSurfaceVariant }}>Lv.10</Text>
          </View>
        )}

        {/* Level select button */}
        <TouchableOpacity style={s.levelSelectBtn} activeOpacity={0.7} onPress={() => router.push('/levels')}>
          <MaterialIcons name="grid-view" size={20} color={COLORS.secondary} />
          <Text style={s.levelSelectText}>{t.selectLevel}</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Collection album */}
        <TouchableOpacity style={s.levelSelectBtn} activeOpacity={0.7} onPress={() => router.push('/collection')}>
          <MaterialIcons name="collections-bookmark" size={20} color={COLORS.primary} />
          <Text style={s.levelSelectText}>{t.collectionAlbum}</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Weekly Tournament */}
        <TouchableOpacity style={[s.levelSelectBtn, { borderColor: COLORS.coin, borderWidth: 1 }]} activeOpacity={0.7} onPress={() => router.push('/tournament')}>
          <MaterialIcons name="emoji-events" size={20} color={COLORS.coin} />
          <Text style={s.levelSelectText}>{t.weeklyTournament}</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Theme shop */}
        <TouchableOpacity style={s.levelSelectBtn} activeOpacity={0.7} onPress={() => router.push('/themes')}>
          <MaterialIcons name="palette" size={20} color={COLORS.secondary} />
          <Text style={s.levelSelectText}>{t.themeStore}</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

      </Animated.View>

      <BottomNav activeTab="home" achievementBadge={unseenAch} />
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

  owlWrap: { width: SW * 0.6, height: SW * 0.35, marginBottom: 16 },
  owlImage: { width: '100%', height: '100%', resizeMode: 'contain' },

  ctaOuter: { width: '100%', maxWidth: 340, marginBottom: 16 },
  ctaGlow: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: SIZES.radiusFull, backgroundColor: COLORS.primary,
  },
  ctaBtn: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 18,
    borderRadius: SIZES.radiusFull,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20, elevation: 12,
  },
  ctaTitle: { fontFamily: FONTS.headlineBlack, fontSize: 26, color: '#fff', letterSpacing: 2 },
  ctaSub: { fontFamily: FONTS.bodyMedium, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginTop: 2 },

  adBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: 340,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#9B7DFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  levelSelectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', maxWidth: 340, paddingVertical: 12, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#9B7DFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 10,
  },
  levelSelectText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.onSurface },
  adLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adText: { fontFamily: FONTS.headline, fontSize: 15, color: COLORS.onSurface },
  adBadge: { backgroundColor: COLORS.tertiary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  adBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#fff' },

  dailyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', maxWidth: 340, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    borderWidth: 1.5, borderColor: COLORS.coin,
    shadowColor: COLORS.coin, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  dailyLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dailyTitle: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.onSurface },
  dailyDate: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant },
  dailyDoneBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  dailyRewardBadge: { backgroundColor: COLORS.coin, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dailyRewardText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#000' },
});
