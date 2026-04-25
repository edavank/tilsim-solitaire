import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { COLORS, FONTS } from '../constants/theme';
import { useLang } from '../context/LanguageContext';

const I18N = {
  tr: { title: 'Yeni Güncelleme Hazır!', body: 'Tılsım Solitaire için yeni özellikler eklendi.', update: 'Şimdi Güncelle', later: 'Sonra', updating: 'Güncelleniyor...' },
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
  const checkedRef = useRef(false);

  // Update kontrolü
  const checkForUpdate = async () => {
    try {
      // Dev mode ve Expo Go'da çalışmaz, sessizce çık
      if (__DEV__ || !Updates.isEnabled) return;

      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) {
          // Manifest'teki mesajı al (eas update --message ... ile yazılan)
          try {
            const manifest = fetched.manifest;
            const msg = manifest?.extra?.expoClient?.extra?.updateMessage 
                     || manifest?.metadata?.updateMessage 
                     || manifest?.message 
                     || '';
            if (msg) setMessage(msg);
          } catch (e) {}
          setVisible(true);
        }
      }
    } catch (e) {
      // Sessiz hata — kullanıcıya hiçbir şey gösterme
    }
  };

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    // İlk açılışta 3 saniye sonra kontrol et (uygulama açılış UX'ini bozmasın)
    const timer = setTimeout(checkForUpdate, 3000);

    // Uygulama foreground'a geri dönerse de kontrol et
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkForUpdate();
      }
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

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
    setUpdating(true);
    try {
      await Updates.reloadAsync();
    } catch (e) {
      setUpdating(false);
    }
  };

  const onLater = () => {
    Animated.timing(fade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[s.overlay, { opacity: fade }]} pointerEvents={updating ? 'none' : 'auto'}>
      <View style={s.backdrop} />
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        <LinearGradient colors={['#FFD700', '#FFA500']} style={s.iconCircle}>
          <MaterialIcons name="card-giftcard" size={32} color="#000" />
        </LinearGradient>
        <Text style={s.title}>{t.title}</Text>
        <Text style={s.body}>{message || t.body}</Text>
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
