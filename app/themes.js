import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import { loadProgress, updateProgress } from '../src/utils/storage';
import { showRewarded } from '../src/utils/ads';
import { useLang } from '../src/context/LanguageContext';

const SW = Dimensions.get('window').width;
const CARD_W = (SW - 48 - 12) / 2;

const THEMES = [
  // Ücretsiz — baştan açık
  { id: 'cosmic', name: 'Kozmik Mor', price: 0, unlockLevel: 0, colors: ['#150629', '#1e0a38'], accent: '#9B7DFF', cardBack: '#6B5B8A', category: 'free' },
  // Bölüm bazlı açılma (her 10 bölümde 1)
  { id: 'ocean', name: 'Okyanus', price: 0, unlockLevel: 10, colors: ['#0a1628', '#0d2137'], accent: '#4FC3F7', cardBack: '#1565C0', category: 'level' },
  { id: 'forest', name: 'Orman', price: 0, unlockLevel: 20, colors: ['#0a1f0a', '#0d2a12'], accent: '#66BB6A', cardBack: '#2E7D32', category: 'level' },
  { id: 'sunset', name: 'Gün Batımı', price: 0, unlockLevel: 30, colors: ['#2a0a0a', '#3a1010'], accent: '#FF7043', cardBack: '#D84315', category: 'level' },
  { id: 'sakura', name: 'Sakura', price: 0, unlockLevel: 40, colors: ['#1f0a1a', '#2a0d22'], accent: '#F48FB1', cardBack: '#C2185B', category: 'level' },
  // Premium — coin ile
  { id: 'gold', name: 'Altın', price: 2000, unlockLevel: 0, colors: ['#1a1500', '#2a2000'], accent: '#FFD54F', cardBack: '#F9A825', category: 'premium' },
  { id: 'arctic', name: 'Kutup', price: 2500, unlockLevel: 0, colors: ['#0a1a2a', '#0d2238'], accent: '#80DEEA', cardBack: '#00838F', category: 'premium' },
  { id: 'ruby', name: 'Yakut', price: 3000, unlockLevel: 0, colors: ['#2a0505', '#3a0808'], accent: '#EF5350', cardBack: '#C62828', category: 'premium' },
  { id: 'neon', name: 'Neon', price: 3500, unlockLevel: 0, colors: ['#0a0a1a', '#0d0d22'], accent: '#76FF03', cardBack: '#1B5E20', category: 'premium' },
  // Reklam ile açılabilir
  { id: 'midnight', name: 'Gece Yarısı', price: 0, unlockLevel: 0, colors: ['#05050f', '#0a0a1a'], accent: '#B388FF', cardBack: '#4527A0', category: 'ad', adCount: 3 },
  { id: 'desert', name: 'Çöl', price: 0, unlockLevel: 0, colors: ['#1a1008', '#2a1a0d'], accent: '#FFAB40', cardBack: '#E65100', category: 'ad', adCount: 5 },
];

function ThemePreview({ theme, small }) {
  const w = small ? 60 : CARD_W - 24;
  const h = small ? 90 : 120;
  return (
    <LinearGradient colors={theme.colors} style={{ width: w, height: h, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {/* Mini kart arkası */}
      <View style={{ width: w * 0.35, height: w * 0.5, backgroundColor: theme.cardBack, borderRadius: 4, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }} />
      {/* Accent bar */}
      <View style={{ width: w * 0.6, height: 4, backgroundColor: theme.accent, borderRadius: 2, marginBottom: 3 }} />
      <View style={{ width: w * 0.4, height: 4, backgroundColor: theme.accent, borderRadius: 2, opacity: 0.5 }} />
      {/* Parçacıklar */}
      <View style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: theme.accent, opacity: 0.6 }} />
      <View style={{ position: 'absolute', bottom: 12, left: 10, width: 4, height: 4, borderRadius: 2, backgroundColor: theme.accent, opacity: 0.4 }} />
    </LinearGradient>
  );
}

export default function ThemesScreen() {
  const router = useRouter();
  const { t } = useLang();
  const [coins, setCoins] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [unlockedThemes, setUnlockedThemes] = useState(['cosmic']);
  const [activeTheme, setActiveTheme] = useState('cosmic');
  const [adProgress, setAdProgress] = useState({});

  useFocusEffect(useCallback(() => {
    loadProgress().then((p) => {
      setCoins(p.coins || 0);
      setCurrentLevel(p.currentLevel || 1);
      setUnlockedThemes(p.unlockedThemes || ['cosmic']);
      setActiveTheme(p.activeTheme || 'cosmic');
      setAdProgress(p.themeAdProgress || {});
    });
  }, []));

  const isUnlocked = (theme) => {
    if (unlockedThemes.includes(theme.id)) return true;
    if (theme.category === 'level' && currentLevel >= theme.unlockLevel) return true;
    return false;
  };

  const selectTheme = async (theme) => {
    if (isUnlocked(theme)) {
      const newUnlocked = unlockedThemes.includes(theme.id) ? unlockedThemes : [...unlockedThemes, theme.id];
      await updateProgress({ activeTheme: theme.id, unlockedThemes: newUnlocked });
      setActiveTheme(theme.id);
      setUnlockedThemes(newUnlocked);
      return;
    }

    if (theme.category === 'level') {
      Alert.alert('Kilitli', `Bu temayı açmak için Bölüm ${theme.unlockLevel} tamamla.`);
      return;
    }

    if (theme.category === 'premium') {
      if (coins < theme.price) {
        Alert.alert('Yetersiz Coin', `${theme.price} coin gerekli, ${coins} coin var.`);
        return;
      }
      Alert.alert('Satın Al', `${theme.name} temasını ${theme.price} coin'e almak ister misin?`, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Satın Al', onPress: async () => {
          const newCoins = coins - theme.price;
          const newUnlocked = [...unlockedThemes, theme.id];
          await updateProgress({ coins: newCoins, unlockedThemes: newUnlocked, activeTheme: theme.id });
          setCoins(newCoins);
          setUnlockedThemes(newUnlocked);
          setActiveTheme(theme.id);
        }},
      ]);
      return;
    }

    if (theme.category === 'ad') {
      const watched = adProgress[theme.id] || 0;
      const remaining = theme.adCount - watched;
      if (remaining <= 0) {
        const newUnlocked = [...unlockedThemes, theme.id];
        await updateProgress({ unlockedThemes: newUnlocked, activeTheme: theme.id });
        setUnlockedThemes(newUnlocked);
        setActiveTheme(theme.id);
        return;
      }
      const result = await showRewarded();
      if (result.success) {
        const newWatched = watched + 1;
        const newAdProgress = { ...adProgress, [theme.id]: newWatched };
        if (newWatched >= theme.adCount) {
          const newUnlocked = [...unlockedThemes, theme.id];
          await updateProgress({ themeAdProgress: newAdProgress, unlockedThemes: newUnlocked, activeTheme: theme.id });
          setUnlockedThemes(newUnlocked);
          setActiveTheme(theme.id);
          Alert.alert('Tema Açıldı!', `${theme.name} artık senin!`);
        } else {
          await updateProgress({ themeAdProgress: newAdProgress });
          Alert.alert('Devam Et', `${theme.adCount - newWatched} reklam daha izle.`);
        }
        setAdProgress(newAdProgress);
      }
    }
  };

  const getStatusBadge = (theme) => {
    if (activeTheme === theme.id) return { text: 'Aktif', color: COLORS.success, icon: 'check-circle' };
    if (isUnlocked(theme)) return { text: 'Sahip', color: COLORS.primary, icon: 'check' };
    if (theme.category === 'level') return { text: `Bölüm ${theme.unlockLevel}`, color: COLORS.onSurfaceVariant, icon: 'lock' };
    if (theme.category === 'premium') return { text: `🪙 ${theme.price}`, color: COLORS.coin, icon: 'shopping-cart' };
    if (theme.category === 'ad') {
      const watched = adProgress[theme.id] || 0;
      return { text: `📺 ${watched}/${theme.adCount}`, color: COLORS.tertiary, icon: 'play-circle-filled' };
    }
    return { text: '', color: '#fff', icon: 'lock' };
  };

  const levelThemes = THEMES.filter(t => t.category === 'level');
  const premiumThemes = THEMES.filter(t => t.category === 'premium');
  const adThemes = THEMES.filter(t => t.category === 'ad');
  const freeThemes = THEMES.filter(t => t.category === 'free');

  const renderThemeCard = (theme) => {
    const unlocked = isUnlocked(theme);
    const active = activeTheme === theme.id;
    const badge = getStatusBadge(theme);
    return (
      <TouchableOpacity key={theme.id} style={[s.card, active && s.cardActive, !unlocked && s.cardLocked]} onPress={() => selectTheme(theme)} activeOpacity={0.7}>
        <ThemePreview theme={theme} />
        <Text style={s.cardName}>{theme.name}</Text>
        <View style={[s.badge, { backgroundColor: badge.color + '22' }]}>
          <MaterialIcons name={badge.icon} size={12} color={badge.color} />
          <Text style={[s.badgeText, { color: badge.color }]}>{badge.text}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tema Mağazası</Text>
        <Text style={s.coinBadge}>🪙 {coins.toLocaleString()}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Varsayılan */}
        <Text style={s.sectionTitle}>Varsayılan</Text>
        <View style={s.grid}>{freeThemes.map(renderThemeCard)}</View>

        {/* Bölüm ödülleri */}
        <Text style={s.sectionTitle}>Bölüm Ödülleri</Text>
        <Text style={s.sectionSub}>Her 10 bölümde yeni tema açılır</Text>
        <View style={s.grid}>{levelThemes.map(renderThemeCard)}</View>

        {/* Premium */}
        <Text style={s.sectionTitle}>Premium</Text>
        <Text style={s.sectionSub}>Coin ile satın al</Text>
        <View style={s.grid}>{premiumThemes.map(renderThemeCard)}</View>

        {/* Reklam ile */}
        <Text style={s.sectionTitle}>Ücretsiz</Text>
        <Text style={s.sectionSub}>Reklam izleyerek aç</Text>
        <View style={s.grid}>{adThemes.map(renderThemeCard)}</View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  coinBadge: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin, backgroundColor: 'rgba(255,209,102,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  scroll: { paddingHorizontal: 16 },
  sectionTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff', marginTop: 20, marginBottom: 4 },
  sectionSub: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: CARD_W, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 12,
    alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 4,
  },
  cardActive: { borderColor: COLORS.success, backgroundColor: 'rgba(76,175,80,0.08)' },
  cardLocked: { opacity: 0.7 },
  cardName: { fontFamily: FONTS.headline, fontSize: 13, color: '#fff', marginTop: 10, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: FONTS.headlineBlack, fontSize: 10 },
});
