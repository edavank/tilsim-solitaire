import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { usePathname } from 'expo-router';
import { isAdFlowActive } from '../utils/ads';
import { COLORS, FONTS } from '../constants/theme';
import { useLang } from '../context/LanguageContext';

const I18N = {
  tr: { title: 'Yeni Güncelleme Hazır!', body: 'İyileştirmeler indirildi ve hazır. Uygulamayı kapatmadan şimdi uygulayabilirsin.', update: 'Güncellemeyi Uygula', later: 'Sonra', updating: 'Güncelleniyor...' },
  en: { title: 'Update Available!', body: 'New features have been added to Tılsım Solitaire.', update: 'Update Now', later: 'Later', updating: 'Updating...' },
  de: { title: 'Update verfügbar!', body: 'Neue Funktionen wurden zu Tılsım Solitaire hinzugefügt.', update: 'Jetzt aktualisieren', later: 'Später', updating: 'Aktualisiert...' },
  fr: { title: 'Mise à jour disponible !', body: 'De nouvelles fonctionnalités ont été ajoutées à Tılsım Solitaire.', update: 'Mettre à jour', later: 'Plus tard', updating: 'Mise à jour...' },
  es: { title: '¡Actualización disponible!', body: 'Se han añadido nuevas funciones a Tılsım Solitaire.', update: 'Actualizar ahora', later: 'Más tarde', updating: 'Actualizando...' },
  ar: { title: 'تحديث متاح!', body: 'تمت إضافة ميزات جديدة إلى Tılsım Solitaire.', update: 'تحديث الآن', later: 'لاحقا', updating: 'جار التحديث...' },
  ru: { title: 'Доступно обновление!', body: 'В Tılsım Solitaire добавлены новые функции.', update: 'Обновить сейчас', later: 'Позже', updating: 'Обновление...' },
};

export default function UpdatePrompt() {
  const { lang } = useLang();
  const t = I18N[lang] || I18N.tr;

  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const pathname = usePathname();
  const { isUpdatePending } = Updates.useUpdates();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reloadError, setReloadError] = useState(false);
  const mountedRef = useRef(false);
  const checkingRef = useRef(false);
  const lastCheckRef = useRef(0);
  const canApplyHere = pathname === '/' || pathname === '/index';

  const checkForUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checkingRef.current) return;
    if (lastCheckRef.current && Date.now() - lastCheckRef.current < 60000) return;
    checkingRef.current = true;
    lastCheckRef.current = Date.now();
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        const fetched = await Updates.fetchUpdateAsync();
        if (mountedRef.current && fetched.isNew) setReady(true);
      }
    } catch (e) {
      // Keep the current game usable offline. Retry on a later foreground/home visit.
    } finally { checkingRef.current = false; }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(checkForUpdate, 3000);
    const sub = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state === 'active') checkForUpdate();
    });
    return () => { mountedRef.current = false; clearTimeout(timer); sub.remove(); };
  }, [checkForUpdate]);

  useEffect(() => {
    // Expo may have downloaded an update during native startup already.
    if (isUpdatePending) setReady(true);
  }, [isUpdatePending]);

  useEffect(() => {
    if (canApplyHere && active) checkForUpdate();
  }, [canApplyHere, active, checkForUpdate]);

  useEffect(() => {
    // Never interrupt a board, reward settlement, sign-in or an advertising flow.
    setVisible(ready && !dismissed && canApplyHere && active && !isAdFlowActive());
  }, [ready, dismissed, canApplyHere, active]);

  // Görünür olunca animasyon
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const onUpdate = async () => {
    if (!canApplyHere || !active || isAdFlowActive()) return;
    setReloadError(false);
    setUpdating(true);
    try {
      await Updates.reloadAsync();
    } catch (e) {
      setUpdating(false);
      setReloadError(true);
    }
  };

  const onLater = () => {
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setDismissed(true);
      setVisible(false);
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[s.overlay, { opacity: fade }]} pointerEvents="auto">
      <View style={s.backdrop} />
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        <LinearGradient colors={['#FFD700', '#FFA500']} style={s.iconCircle}>
          <MaterialIcons name="card-giftcard" size={32} color="#000" />
        </LinearGradient>
        <Text style={s.title}>{t.title}</Text>
        <Text style={s.body}>{reloadError ? (lang === 'tr' ? 'Güncelleme uygulanamadı. Tekrar deneyebilir veya oynamaya devam edebilirsin.' : 'Could not apply the update. Try again or keep playing.') : message || t.body}</Text>
        {updating ? (
          <View style={s.updatingBox}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={s.updatingText}>{t.updating}</Text>
          </View>
        ) : (
          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnLater} onPress={onLater} activeOpacity={0.7}>
              <Text style={s.btnLaterText}>{t.later}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnUpdate} onPress={onUpdate} activeOpacity={0.8}>
              <Text style={s.btnUpdateText}>{t.update}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 11000, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#1a1a2e', borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontFamily: FONTS.headlineBlack, fontSize: 20, color: '#fff', textAlign: 'center', marginBottom: 8 },
  body: { fontFamily: FONTS.body, fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  btnLater: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  btnLaterText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  btnUpdate: { flex: 1.4, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FFD700', alignItems: 'center' },
  btnUpdateText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#000' },
  updatingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  updatingText: { fontFamily: FONTS.headline, fontSize: 14, color: '#fff' },
});


