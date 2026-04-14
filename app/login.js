// Login Screen — Optional sign-in before playing
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS } from '../src/constants/theme';
import { useAuth } from '../src/context/AuthContext';
import { useLang } from '../src/context/LanguageContext';
import { loadProgress, saveProgress } from '../src/utils/storage';

export default function LoginScreen() {
  const { handleGoogleLogin, handleAppleLogin, handleSkipLogin, syncToCloud, isAppleAvailable, loading } = useAuth();
  const { t } = useLang();
  const [busy, setBusy] = useState(false);

  const doLogin = async (method) => {
    setBusy(true);
    const result = method === 'google' ? await handleGoogleLogin() : await handleAppleLogin();
    if (result.error) {
      setBusy(false);
      if (result.error !== 'Giriş iptal edildi') {
        Alert.alert(t.loginError || 'Hata', result.error);
      }
      return;
    }
    // Sync local → cloud on first login
    try {
      const local = await loadProgress();
      const merged = await syncToCloud(local);
      if (merged) await saveProgress(merged);
    } catch (e) {}
    setBusy(false);
    router.replace('/');
  };

  const doSkip = async () => {
    await handleSkipLogin();
    router.replace('/');
  };

  const isLoading = loading || busy;

  return (
    <LinearGradient colors={['#150629', '#1a0a30', '#0d0418']} style={s.container}>
      {/* Top decorative glow */}
      <View style={s.glowCircle} />

      {/* Logo + welcome */}
      <View style={s.header}>
        <Image source={require('../assets/icon.png')} style={s.logo} resizeMode="contain" />
        <Text style={s.title}>{t.appName || 'Tılsım Solitaire'}</Text>
        <Text style={s.subtitle}>{t.loginSubtitle || 'Oyun kaydını buluta bağla'}</Text>
      </View>

      {/* Benefits */}
      <View style={s.benefits}>
        {[
          { icon: 'cloud-done', text: t.loginBenefit1 || 'İlerleme otomatik yedeklenir' },
          { icon: 'devices', text: t.loginBenefit2 || 'Cihaz değiştirsen de kaydın korunur' },
          { icon: 'emoji-events', text: t.loginBenefit3 || 'Lider tablosunda adın görünür' },
        ].map((b, i) => (
          <View key={i} style={s.benefitRow}>
            <MaterialIcons name={b.icon} size={20} color={COLORS.primary} />
            <Text style={s.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>

      {/* Buttons */}
      <View style={s.buttons}>
        {/* Google */}
        <TouchableOpacity
          style={[s.btn, s.googleBtn]}
          activeOpacity={0.8}
          disabled={isLoading}
          onPress={() => doLogin('google')}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialIcons name="mail-outline" size={22} color="#fff" />
              <Text style={s.btnText}>{t.signInGoogle || 'Google ile Giriş Yap'}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Apple (iOS only) */}
        {isAppleAvailable && (
          <TouchableOpacity
            style={[s.btn, s.appleBtn]}
            activeOpacity={0.8}
            disabled={isLoading}
            onPress={() => doLogin('apple')}
          >
            <MaterialIcons name="apple" size={22} color="#fff" />
            <Text style={s.btnText}>{t.signInApple || 'Apple ile Giriş Yap'}</Text>
          </TouchableOpacity>
        )}

        {/* Skip */}
        <TouchableOpacity
          style={s.skipBtn}
          activeOpacity={0.7}
          disabled={isLoading}
          onPress={doSkip}
        >
          <Text style={s.skipText}>{t.skipLogin || 'Giriş yapmadan devam et'}</Text>
          <MaterialIcons name="arrow-forward" size={16} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={s.footer}>{t.loginFooter || 'Hesap bilgilerin güvende. İstediğin zaman ayarlardan giriş yapabilirsin.'}</Text>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  glowCircle: {
    position: 'absolute', top: -120, width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(160, 100, 255, 0.08)',
  },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 88, height: 88, borderRadius: 22, marginBottom: 16 },
  title: {
    fontFamily: FONTS.headlineBlack || 'System',
    fontSize: 26, color: '#fff', textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.body || 'System',
    fontSize: 14, color: COLORS.onSurfaceVariant, marginTop: 6, textAlign: 'center',
  },
  benefits: { width: '100%', marginBottom: 36, gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: {
    fontFamily: FONTS.body || 'System',
    fontSize: 13, color: COLORS.onSurface, flex: 1,
  },
  buttons: { width: '100%', gap: 12 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 14, gap: 10,
  },
  googleBtn: { backgroundColor: '#4285F4' },
  appleBtn: { backgroundColor: '#000' },
  btnText: {
    fontFamily: FONTS.headlineBlack || 'System',
    fontSize: 15, color: '#fff',
  },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 44, gap: 6, marginTop: 4,
  },
  skipText: {
    fontFamily: FONTS.body || 'System',
    fontSize: 14, color: COLORS.onSurfaceVariant,
  },
  footer: {
    fontFamily: FONTS.body || 'System',
    fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center',
    marginTop: 32, paddingHorizontal: 16,
  },
});
