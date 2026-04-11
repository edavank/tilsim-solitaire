import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadSettings, saveSettings, loadProgress, resetAll } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');

export default function SettingsScreen() {
  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [vibration, setVibration] = useState(false);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    loadSettings().then((s) => { setSound(s.sound); setMusic(s.music); setVibration(s.vibration); });
    loadProgress().then((p) => setCoins(p.coins));
  }, []);

  const toggleSound = (v) => { setSound(v); saveSettings({ sound: v, music, vibration }); };
  const toggleMusic = (v) => { setMusic(v); saveSettings({ sound, music: v, vibration }); };
  const toggleVibration = (v) => { setVibration(v); saveSettings({ sound, music, vibration: v }); };

  const handleReset = () => {
    Alert.alert('İlerlemeyi Sıfırla', 'Tüm ilerleme ve kayıtlı veriler silinecek. Emin misin?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: async () => { await resetAll(); router.replace('/'); } },
    ]);
  };

  const trackColor = { false: COLORS.outlineVariant, true: COLORS.primary };

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ayarlar</Text>
        <View style={s.coinBadge}>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
          <Text style={s.coinText}>1,250</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Oyun Tercihleri */}
        <View style={s.sectionHeader}>
          <MaterialIcons name="tune" size={18} color={COLORS.primary} />
          <Text style={s.sectionTitle}>Oyun Tercihleri</Text>
        </View>
        <View style={s.card}>
          <SettingRow icon="volume-up" iconColor={COLORS.primary} label="Ses" right={<Switch value={sound} onValueChange={toggleSound} trackColor={trackColor} thumbColor="#fff" />} />
          <View style={s.divider} />
          <SettingRow icon="music-note" iconColor={COLORS.primary} label="Müzik" right={<Switch value={music} onValueChange={toggleMusic} trackColor={trackColor} thumbColor="#fff" />} />
          <View style={s.divider} />
          <SettingRow icon="vibration" iconColor={COLORS.primary} label="Titreşim" right={<Switch value={vibration} onValueChange={toggleVibration} trackColor={trackColor} thumbColor="#fff" />} />
        </View>

        {/* Genel */}
        <View style={s.sectionHeader}>
          <MaterialIcons name="language" size={18} color={COLORS.coin} />
          <Text style={s.sectionTitle}>Genel</Text>
        </View>
        <View style={s.card}>
          <SettingRow icon="translate" iconColor={COLORS.secondary} label="Dil" right={<ChevronValue value="Türkçe" />} />
          <View style={s.divider} />
          <SettingRow icon="star" iconColor={COLORS.secondary} label="Zorluk" right={<ChevronValue value="Normal" />} />
        </View>

        {/* Buttons */}
        <TouchableOpacity style={s.googleBtn} activeOpacity={0.8}>
          <MaterialIcons name="public" size={20} color="#fff" />
          <Text style={s.googleText}>Google ile Bağla</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.resetBtn} activeOpacity={0.8} onPress={handleReset}>
          <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
          <Text style={s.resetText}>İlerlemeyi Sıfırla</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerLinks}>
            <Text style={s.footerLink}>Gizlilik Politikası</Text>
            <Text style={s.footerLink}>Kullanım Şartları</Text>
          </View>
          <View style={s.footerBrand}>
            <Image source={OWL} style={s.footerOwl} />
            <Text style={s.footerName}>TILSIM</Text>
          </View>
          <Text style={s.footerVersion}>VERSİON V1.0.0</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav activeTab="home" />
    </View>
  );
}

function SettingRow({ icon, iconColor, label, right }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <View style={[s.iconCircle, { backgroundColor: iconColor + '22' }]}>
          <MaterialIcons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      {right}
    </View>
  );
}

function ChevronValue({ value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={s.chevronValue}>{value}</Text>
      <MaterialIcons name="chevron-right" size={20} color={COLORS.onSurfaceVariant} />
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
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.primary },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 13, color: COLORS.coin },

  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 16 },
  sectionTitle: { fontFamily: FONTS.headlineBlack, fontSize: 15, color: COLORS.onSurface },

  card: {
    backgroundColor: COLORS.panelBg, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.panelBorder, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: FONTS.bodyMedium, fontSize: 15, color: COLORS.onSurface },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },
  chevronValue: { fontFamily: FONTS.bodyMedium, fontSize: 13, color: COLORS.secondary },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16, marginTop: 28,
  },
  googleText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 14, borderRadius: 16, marginTop: 12,
  },
  resetText: { fontFamily: FONTS.headlineBlack, fontSize: 15, color: COLORS.primary },

  footer: { alignItems: 'center', marginTop: 32 },
  footerLinks: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  footerLink: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  footerOwl: { width: 30, height: 30, borderRadius: 15 },
  footerName: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.primary, letterSpacing: 4 },
  footerVersion: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.outlineVariant, letterSpacing: 2 },
});
