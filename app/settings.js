import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Image, Alert, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES  } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadSettings, saveSettings, loadProgress, resetAll } from '../src/utils/storage';
import { setVibrationEnabled, setSoundEnabled, setBgmEnabled, getBgmEnabled } from '../src/utils/sounds';
import { useLang } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import Constants from 'expo-constants';

const APP_VERSION = Constants?.expoConfig?.version || '1.0.0';

const LANG_OPTIONS = [
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
];

export default function SettingsScreen() {
  const { lang, t, setLang } = useLang();
  const { user, loading, handleGoogleLogin, handleAppleLogin, handleSignOut, handleDeleteAccount, isAppleAvailable, syncToCloud } = useAuth();
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [coins, setCoins] = useState(0);
  const [busy, setBusy] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setVibration(s.vibration !== false);
      setSound(s.sound !== false);
      setBgm(s.bgm !== false);
    }).catch(() => {});
    loadProgress().then((p) => setCoins(p.coins)).catch(() => {});
  }, []);

  const toggleSound = (v) => {
    setSound(v);
    setSoundEnabled(v);
    saveSettings({ sound: v, vibration, bgm });
  };

  const toggleVibration = (v) => {
    setVibration(v);
    setVibrationEnabled(v);
    saveSettings({ sound, vibration: v, bgm });
  };

  const toggleBgm = (v) => {
    setBgm(v);
    setBgmEnabled(v);
    saveSettings({ sound, vibration, bgm: v });
  };

  const selectLanguage = (code) => {
    setLang(code);
    setShowLangPicker(false);
    Alert.alert(t.langChanged, t.langChangeMsg);
  };

  const handleReset = () => {
    Alert.alert(t.resetProgress, t.resetConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.reset, style: 'destructive', onPress: async () => { await resetAll(); router.replace('/'); } },
    ]);
  };

  const trackColor = { false: COLORS.outlineVariant, true: COLORS.primary };

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.settings}</Text>
        <View style={s.coinBadge}>
          <Text style={{ fontSize: 14 }}>🪙</Text>
          <Text style={s.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Oyun Tercihleri */}
        <View style={s.sectionHeader}>
          <MaterialIcons name="tune" size={18} color={COLORS.primary} />
          <Text style={s.sectionTitle}>{t.gamePrefs}</Text>
        </View>
        <View style={s.card}>
          <SettingRow icon="volume-up" iconColor={COLORS.primary} label={t.soundEffects} right={<Switch value={sound} onValueChange={toggleSound} trackColor={trackColor} thumbColor="#fff" />} />
          <View style={s.divider} />
          <SettingRow icon="music-note" iconColor={COLORS.secondary} label={t.bgMusic} right={<Switch value={bgm} onValueChange={toggleBgm} trackColor={trackColor} thumbColor="#fff" />} />
          <View style={s.divider} />
          <SettingRow icon="vibration" iconColor={COLORS.primary} label={t.vibration} right={<Switch value={vibration} onValueChange={toggleVibration} trackColor={trackColor} thumbColor="#fff" />} />
        </View>

        {/* Genel */}
        <View style={s.sectionHeader}>
          <MaterialIcons name="language" size={18} color={COLORS.coin} />
          <Text style={s.sectionTitle}>{t.general}</Text>
        </View>
        <TouchableOpacity style={s.card} onPress={() => setShowLangPicker(true)} activeOpacity={0.7}>
          <SettingRow icon="translate" iconColor={COLORS.secondary} label={t.language} right={<ChevronValue value={LANG_OPTIONS.find(l => l.code === lang)?.flag + ' ' + LANG_OPTIONS.find(l => l.code === lang)?.name || 'Türkçe'} />} />
        </TouchableOpacity>

        {/* Hesap */}
        <View style={s.sectionHeader}>
          <MaterialIcons name="person" size={18} color={COLORS.coin} />
          <Text style={s.sectionTitle}>{t.account}</Text>
        </View>
        {user ? (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
              <MaterialIcons name="account-circle" size={40} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 15, color: COLORS.onSurface }}>{user.name}</Text>
                <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant }}>{user.email}</Text>
              </View>
              {user.provider === 'google' && <MaterialIcons name="mail-outline" size={18} color={COLORS.onSurfaceVariant} />}
              {user.provider === 'apple' && <MaterialIcons name="apple" size={18} color={COLORS.onSurfaceVariant} />}
            </View>
            <View style={s.divider} />
            <TouchableOpacity style={{ padding: 14, alignItems: 'center' }} onPress={async () => {
              await handleSignOut();
              Alert.alert(t.signedOut || 'Çıkış yapıldı');
              router.replace('/');
            }}>
              <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.primary }}>{t.signOut}</Text>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={{ padding: 14, alignItems: 'center' }} onPress={() => {
              Alert.alert(
                t.deleteAccount || 'Delete Account',
                t.deleteAccountConfirm || 'Your account and all associated data will be permanently deleted. This cannot be undone. Are you sure?',
                [
                  { text: t.cancel, style: 'cancel' },
                  { text: t.deleteAccountBtn || 'Delete', style: 'destructive', onPress: async () => {
                    setBusy(true);
                    const result = await handleDeleteAccount();
                    setBusy(false);
                    if (result.success) {
                      Alert.alert(t.deleteAccountDone || 'Account Deleted', t.deleteAccountDoneMsg || 'Your account and data have been deleted.');
                      router.replace('/');
                    } else {
                      Alert.alert('Error', result.error || 'Failed to delete account');
                    }
                  }},
                ]
              );
            }}>
              <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.error }}>
                {t.deleteAccount || 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <TouchableOpacity style={s.googleBtn} activeOpacity={0.8} disabled={busy || loading} onPress={async () => {
              setBusy(true);
              const result = await handleGoogleLogin();
              setBusy(false);
              if (result.error && result.code !== 'cancelled') Alert.alert(t.loginError || 'Error', result.error);
              else if (!result.error) {
                try { const local = await loadProgress(); await syncToCloud(local); } catch (e) {}
              }
            }}>
              <MaterialIcons name="mail-outline" size={20} color="#fff" />
              <Text style={s.googleText}>{busy || loading ? t.connecting : t.connectGoogle}</Text>
            </TouchableOpacity>
            {isAppleAvailable && (
              <TouchableOpacity style={s.appleBtn} activeOpacity={0.8} disabled={busy || loading} onPress={async () => {
                setBusy(true);
                const result = await handleAppleLogin();
                setBusy(false);
                if (result.error && result.code !== 'cancelled') Alert.alert(t.loginError || 'Error', result.error);
                else if (!result.error) {
                  try { const local = await loadProgress(); await syncToCloud(local); } catch (e) {}
                }
              }}>
                <MaterialIcons name="apple" size={20} color="#fff" />
                <Text style={s.appleText}>{busy || loading ? t.connecting : (t.connectApple || 'Apple ile Bağla')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Buttons */}
        <TouchableOpacity style={s.resetBtn} activeOpacity={0.8} onPress={handleReset}>
          <MaterialIcons name="refresh" size={20} color={COLORS.primary} />
          <Text style={s.resetText}>{t.resetProgress}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.footerLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://tilsim-solitaire-legal.vercel.app/privacy')}>
              <Text style={s.footerLink}>{t.privacyPolicy}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('https://tilsim-solitaire-legal.vercel.app/terms')}>
              <Text style={s.footerLink}>{t.termsOfUse}</Text>
            </TouchableOpacity>
          </View>
          <View style={s.footerBrand}>
            <Text style={s.footerName}>TILSIM SOLITAIRE</Text>
          </View>
          <Text style={s.footerVersion}>VERSION V{APP_VERSION}</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav activeTab="home" />

      {/* Language Picker Modal */}
      {showLangPicker && (
        <View style={s.langOverlay}>
          <LinearGradient colors={['rgba(21,6,41,0.95)', 'rgba(61,53,96,0.95)']} style={StyleSheet.absoluteFillObject} />
          <View style={s.langCard}>
            <Text style={s.langTitle}>{t.chooseLang}</Text>
            <Text style={s.langSub}>Choose Language</Text>
            {LANG_OPTIONS.map((l) => (
              <TouchableOpacity key={l.code} style={[s.langItem, lang === l.code && s.langItemActive]} onPress={() => selectLanguage(l.code)} activeOpacity={0.7}>
                <Text style={{ fontSize: 24 }}>{l.flag}</Text>
                <Text style={s.langName}>{l.name}</Text>
                {lang === l.code && <View style={s.langCheck}><Text style={{ color: '#fff', fontSize: 12 }}>✓</Text></View>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.langClose} onPress={() => setShowLangPicker(false)} activeOpacity={0.7}>
              <Text style={s.langCloseText}>{t.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    backgroundColor: '#4285F4', paddingVertical: 16, borderRadius: 16,
  },
  googleText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },
  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#000', paddingVertical: 16, borderRadius: 16,
  },
  appleText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.primary, paddingVertical: 14, borderRadius: 16, marginTop: 28,
  },
  resetText: { fontFamily: FONTS.headlineBlack, fontSize: 15, color: COLORS.primary },

  footer: { alignItems: 'center', marginTop: 32 },
  footerLinks: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  footerLink: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  footerOwl: { width: 30, height: 30, borderRadius: 15 },
  footerName: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.primary, letterSpacing: 4 },
  footerVersion: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.outlineVariant, letterSpacing: 2 },

  langOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  langCard: { width: '85%', backgroundColor: COLORS.surfaceContainerHigh, borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },
  langTitle: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface, marginBottom: 2 },
  langSub: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant, marginBottom: 16 },
  langItem: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  langItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  langName: { flex: 1, fontFamily: FONTS.headline, fontSize: 15, color: COLORS.onSurface },
  langCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  langClose: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary },
  langCloseText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.primary },
});
