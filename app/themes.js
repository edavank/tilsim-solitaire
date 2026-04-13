import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../src/constants/theme';
import { loadProgress, updateProgress } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');

const THEMES = [
  { id: 'cosmic', name: 'Kozmik Mor', price: 0, colors: ['#150629', '#1e0a38'], accent: '#9B7DFF', unlocked: true },
  { id: 'ocean', name: 'Okyanus', price: 1000, colors: ['#0a1628', '#0d2137'], accent: '#4FC3F7' },
  { id: 'forest', name: 'Orman', price: 1000, colors: ['#0a1f0a', '#0d2a12'], accent: '#66BB6A' },
  { id: 'sunset', name: 'Gün Batımı', price: 1500, colors: ['#2a0a0a', '#3a1010'], accent: '#FF7043' },
  { id: 'gold', name: 'Altın', price: 2000, colors: ['#1a1500', '#2a2000'], accent: '#FFD54F' },
  { id: 'sakura', name: 'Sakura', price: 2000, colors: ['#1f0a1a', '#2a0d22'], accent: '#F48FB1' },
  { id: 'arctic', name: 'Kutup', price: 2500, colors: ['#0a1a2a', '#0d2238'], accent: '#80DEEA' },
  { id: 'ruby', name: 'Yakut', price: 3000, colors: ['#2a0505', '#3a0808'], accent: '#EF5350' },
];

export default function ThemesScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState(0);
  const [unlockedThemes, setUnlockedThemes] = useState(['cosmic']);
  const [activeTheme, setActiveTheme] = useState('cosmic');

  useFocusEffect(useCallback(() => {
    loadProgress().then((p) => {
      setCoins(p.coins || 0);
      setUnlockedThemes(p.unlockedThemes || ['cosmic']);
      setActiveTheme(p.activeTheme || 'cosmic');
    });
  }, []));

  const buyTheme = async (theme) => {
    if (unlockedThemes.includes(theme.id)) {
      // Zaten sahip — aktif yap
      await updateProgress({ activeTheme: theme.id });
      setActiveTheme(theme.id);
      return;
    }
    if (coins < theme.price) {
      Alert.alert('Yetersiz Coin', `${theme.price} coin gerekli, ${coins} coin var.`);
      return;
    }
    const newCoins = coins - theme.price;
    const newUnlocked = [...unlockedThemes, theme.id];
    await updateProgress({ coins: newCoins, unlockedThemes: newUnlocked, activeTheme: theme.id });
    setCoins(newCoins);
    setUnlockedThemes(newUnlocked);
    setActiveTheme(theme.id);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tema Mağazası</Text>
        <Text style={s.coinBadge}>🪙 {coins}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {THEMES.map(theme => {
          const owned = unlockedThemes.includes(theme.id);
          const active = activeTheme === theme.id;
          return (
            <TouchableOpacity key={theme.id} style={[s.card, active && s.cardActive]} onPress={() => buyTheme(theme)} activeOpacity={0.7}>
              <LinearGradient colors={theme.colors} style={s.preview}>
                <View style={[s.dot, { backgroundColor: theme.accent }]} />
                <View style={[s.dot, { backgroundColor: theme.accent, opacity: 0.5 }]} />
                <View style={[s.dot, { backgroundColor: theme.accent, opacity: 0.3 }]} />
              </LinearGradient>
              <View style={s.cardInfo}>
                <Text style={s.cardName}>{theme.name}</Text>
                {active ? (
                  <View style={s.activeBadge}><Text style={s.activeBadgeText}>AKTİF</Text></View>
                ) : owned ? (
                  <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.success }}>Sahip</Text>
                ) : (
                  <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.coin }}>🪙 {theme.price}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
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
  coinBadge: { fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.coin, backgroundColor: 'rgba(255,209,102,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  scroll: { paddingHorizontal: 16, gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 12, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardActive: { borderColor: COLORS.primary, borderWidth: 2, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10 },
  preview: { width: 60, height: 44, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardName: { fontFamily: FONTS.headlineBlack, fontSize: 15, color: '#fff' },
  activeBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  activeBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff' },
});
