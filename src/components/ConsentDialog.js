import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';

let AsyncStorage;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) {}

const CONSENT_KEY = '@tilsim_ad_consent';

export default function ConsentDialog({ onComplete }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!AsyncStorage) return;
    AsyncStorage.getItem(CONSENT_KEY).then((val) => {
      if (!val) setVisible(true);
    }).catch(() => {});
  }, []);

  const respond = async (accepted) => {
    try { if (AsyncStorage) await AsyncStorage.setItem(CONSENT_KEY, accepted ? 'accepted' : 'declined'); } catch (e) {}
    setVisible(false);
    onComplete?.(accepted);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={s.overlay}>
        <View style={s.card}>
          <MaterialIcons name="privacy-tip" size={36} color={COLORS.secondary} style={{ marginBottom: 12 }} />
          <Text style={s.title}>Reklam Tercihleri</Text>
          <Text style={s.body}>
            Tılsım Solitaire, ücretsiz içerik sunmak için reklam göstermektedir. Size daha uygun reklamlar göstermek için izninizi istiyoruz.
          </Text>
          <Text style={s.sub}>İzin vermezseniz yine de uygulamamızı kullanabilirsiniz.</Text>
          <TouchableOpacity onPress={() => respond(true)} activeOpacity={0.85} style={{ width: '100%', marginTop: 16 }}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={s.acceptBtn}>
              <Text style={s.acceptText}>Kabul Et</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={s.declineBtn} onPress={() => respond(false)} activeOpacity={0.7}>
            <Text style={s.declineText}>Kişiselleştirme Olmadan Devam Et</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: COLORS.surfaceContainerHigh, borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: COLORS.panelBorder },
  title: { fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.onSurface, marginBottom: 12 },
  body: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurface, lineHeight: 19, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant, lineHeight: 16, textAlign: 'center' },
  acceptBtn: { paddingVertical: 14, borderRadius: SIZES.radiusFull, alignItems: 'center' },
  acceptText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },
  declineBtn: { paddingVertical: 12, marginTop: 8 },
  declineText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, textDecorationLine: 'underline' },
});
