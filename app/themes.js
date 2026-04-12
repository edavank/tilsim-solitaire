import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');

const TABS = ['ARKAPLAN', 'KART'];

const THEMES = [
  { id: 'cosmic', name: 'Kozmik', unlocked: true, active: true, price: 0, colors: ['#6B5B8A', '#3D3560'] },
  { id: 'forest', name: 'Orman', unlocked: true, active: false, price: 0, colors: ['#1a3a2a', '#0d1f17'] },
  { id: 'desert', name: 'Çöl', unlocked: false, active: false, price: 200, colors: ['#5c4a3a', '#3d2f22'] },
  { id: 'ocean', name: 'Okyanus', unlocked: false, active: false, price: 500, colors: ['#1a2a4a', '#0d1530'] },
  { id: 'aurora', name: 'Aurora', unlocked: false, active: false, price: 500, colors: ['#1a4a3a', '#0d2a20'] },
  { id: 'cyber', name: 'Siber', unlocked: false, active: false, price: 1000, colors: ['#2a1a3a', '#150d20'] },
];

export default function ThemesScreen() {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState('cosmic');
  const [coins, setCoins] = useState(0);

  useEffect(() => { loadProgress().then((p) => setCoins(p.coins || 0)); }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Görünüm Seçici</Text>
        <View style={s.coinBadge}>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
          <Text style={s.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={i} style={[s.tab, activeTabIdx === i && s.tabActive]} onPress={() => setActiveTabIdx(i)} activeOpacity={0.7}>
            <Text style={[s.tabText, activeTabIdx === i && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Grid */}
        <View style={s.grid}>
          {THEMES.map((theme) => (
            <TouchableOpacity
              key={theme.id}
              style={[s.themeCard, selectedTheme === theme.id && s.themeCardActive]}
              onPress={() => theme.unlocked && setSelectedTheme(theme.id)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={theme.colors} style={s.themePreview}>
                {theme.active && (
                  <View style={s.checkmark}>
                    <MaterialIcons name="check" size={18} color="#fff" />
                  </View>
                )}
                {!theme.unlocked && (
                  <View style={s.lockOverlay}>
                    <MaterialIcons name="lock" size={22} color="rgba(255,255,255,0.5)" />
                    <View style={s.priceBadge}>
                      <MaterialIcons name="monetization-on" size={12} color={COLORS.coin} />
                      <Text style={s.priceText}>{theme.price}</Text>
                    </View>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bilge tip */}
        <View style={s.tipCard}>
          <Image source={OWL} style={s.tipOwl} />
          <View style={s.tipContent}>
            <Text style={s.tipLabel}>BİLGE İPUCU</Text>
            <Text style={s.tipText}>Yeni temalar topladığın altınlarla açılabilir. En nadir 'Kozmik' temasını denedin mi?</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav activeTab="home" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: COLORS.onSurface },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 13, color: COLORS.onSurface },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 4,
    backgroundColor: COLORS.panelBg, borderRadius: SIZES.radiusFull, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: SIZES.radiusFull },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.headlineBlack, fontSize: 12, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  tabTextActive: { color: '#fff' },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeCard: {
    width: '31%', aspectRatio: 0.85, borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  themeCardActive: { borderColor: COLORS.secondary, borderWidth: 3 },
  themePreview: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  checkmark: {
    position: 'absolute', bottom: 10, left: 10,
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  lockOverlay: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  priceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: SIZES.radiusFull,
  },
  priceText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: COLORS.coin },

  tipCard: {
    flexDirection: 'row', backgroundColor: COLORS.panelBg, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.panelBorder, padding: 14, marginTop: 24, gap: 12,
  },
  tipOwl: { width: 56, height: 56, borderRadius: 12 },
  tipContent: { flex: 1 },
  tipLabel: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: COLORS.coin, letterSpacing: 1, marginBottom: 4 },
  tipText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant, lineHeight: 17 },
});
