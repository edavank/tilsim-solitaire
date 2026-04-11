import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';

const OWL = require('../assets/bilge-happy.png');

const GOLD_PACKS = [
  { amount: 100, price: '₺24,99', desc: 'Küçük bir başlangıç', icon: 'monetization-on', popular: false },
  { amount: 500, price: '₺99,99', desc: 'En çok tercih edilen', icon: 'account-balance-wallet', popular: true },
  { amount: 2000, price: '₺299,99', desc: 'EN İYİ FİYAT AVANTAJI', icon: 'savings', popular: false },
];

const BOOSTERS = [
  { name: 'İpucu', desc: 'Tıkanınca yolunu bul', icon: 'lightbulb', price: 50, color: COLORS.secondary },
  { name: 'Geri Al', desc: 'Hatalı hamleyi düzelt', icon: 'undo', price: 30, color: COLORS.secondary },
];

export default function StoreScreen() {
  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Image source={OWL} style={s.headerAvatar} />
          <Text style={s.headerTitle}>Tılsım Solitaire</Text>
        </View>
        <View style={s.coinBadge}>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
          <Text style={s.coinText}>1,250</Text>
          <Text style={s.coinPlus}>+</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Premium Banner */}
        <View style={s.premiumCard}>
          <View style={s.premiumBadge}><Text style={s.premiumBadgeText}>PREMİUM</Text></View>
          <Text style={s.premiumTitle}>Reklamsız Deneyim</Text>
          <Text style={s.premiumDesc}>Kesintisiz bir solitaire keyfi için reklamları kaldırın.</Text>
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={s.premiumBtn}>
              <Text style={s.premiumBtnText}>₺89,99</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Gold Packs */}
        <Text style={s.sectionTitle}>Altın Paketleri</Text>
        {GOLD_PACKS.map((pack, i) => (
          <View key={i} style={[s.goldCard, pack.popular && s.goldCardPopular]}>
            {pack.popular && <View style={s.popularBadge}><Text style={s.popularText}>EN POPÜLER</Text></View>}
            <MaterialIcons name={pack.icon} size={36} color={COLORS.coin} style={{ marginBottom: 6 }} />
            <Text style={s.goldAmount}>{pack.amount} Altın</Text>
            <Text style={s.goldDesc}>{pack.desc}</Text>
            <TouchableOpacity activeOpacity={0.8} style={{ width: '100%', marginTop: 12 }}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={s.goldBtn}>
                <Text style={s.goldBtnText}>{pack.price}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}

        {/* Boosters */}
        <Text style={s.sectionTitle}>Güçlendiriciler</Text>
        <View style={s.boosterRow}>
          {BOOSTERS.map((b, i) => (
            <View key={i} style={s.boosterCard}>
              <View style={[s.boosterIcon, { backgroundColor: b.color + '22' }]}>
                <MaterialIcons name={b.icon} size={22} color={b.color} />
              </View>
              <Text style={s.boosterName}>{b.name}</Text>
              <Text style={s.boosterDesc}>{b.desc}</Text>
              <View style={s.boosterPrice}>
                <MaterialIcons name="monetization-on" size={14} color={COLORS.coin} />
                <Text style={s.boosterPriceText}>{b.price}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={s.footerText}>TILSIM SOLİTAİRE EFSANEVİ MAĞAZA</Text>
        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav activeTab="store" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff', fontStyle: 'italic' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },
  coinPlus: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  premiumCard: {
    backgroundColor: COLORS.panelBg, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 28,
  },
  premiumBadge: { backgroundColor: COLORS.tertiary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  premiumBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff', letterSpacing: 1 },
  premiumTitle: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface, marginBottom: 6 },
  premiumDesc: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 16, lineHeight: 18 },
  premiumBtn: { paddingVertical: 14, borderRadius: SIZES.radiusFull, alignItems: 'center' },
  premiumBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },

  sectionTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: COLORS.onSurface, marginBottom: 14 },

  goldCard: {
    backgroundColor: COLORS.panelBg, borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 14,
  },
  goldCardPopular: { borderColor: COLORS.primary, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: -12, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  popularText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff', letterSpacing: 1 },
  goldAmount: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface },
  goldDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 },
  goldBtn: { paddingVertical: 12, borderRadius: SIZES.radiusFull, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff' },

  boosterRow: { flexDirection: 'row', gap: 12 },
  boosterCard: {
    flex: 1, backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  boosterIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  boosterName: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.onSurface, marginBottom: 2 },
  boosterDesc: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 8 },
  boosterPrice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  boosterPriceText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.coin },

  footerText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.outlineVariant, textAlign: 'center', marginTop: 24, letterSpacing: 2 },
});
