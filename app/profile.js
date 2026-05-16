import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import { AVATARS, loadSelectedAvatar, saveSelectedAvatar, isAvatarUnlocked, loadProgress } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';

const BG_STARS = require('../assets/bg-stars.webp');

const PROFILE_TEXT = {
  tr: { title: 'Avatar Seç', selected: 'Seçildi', unlock: 'Bölüm', current: 'Şu an', locked: 'Kilitli' },
  en: { title: 'Choose Avatar', selected: 'Selected', unlock: 'Level', current: 'Current', locked: 'Locked' },
  de: { title: 'Avatar wählen', selected: 'Ausgewählt', unlock: 'Level', current: 'Aktuell', locked: 'Gesperrt' },
  fr: { title: 'Choisir Avatar', selected: 'Sélectionné', unlock: 'Niveau', current: 'Actuel', locked: 'Verrouillé' },
  es: { title: 'Elegir Avatar', selected: 'Seleccionado', unlock: 'Nivel', current: 'Actual', locked: 'Bloqueado' },
  ar: { title: 'اختر الرمز', selected: 'محدد', unlock: 'المستوى', current: 'الحالي', locked: 'مقفل' },
  ru: { title: 'Выбор аватара', selected: 'Выбрано', unlock: 'Уровень', current: 'Текущий', locked: 'Заблокировано' },
};

export default function ProfileScreen() {
  const { lang } = useLang();
  const txt = PROFILE_TEXT[lang] || PROFILE_TEXT.tr;
  const [selectedId, setSelectedId] = useState('wizard');
  const [currentLevel, setCurrentLevel] = useState(1);

  useEffect(() => {
    loadSelectedAvatar().then(setSelectedId).catch(() => {});
    loadProgress().then(p => setCurrentLevel(p.currentLevel || 1)).catch(() => {});
  }, []);

  const handleSelect = async (avatarId) => {
    if (!isAvatarUnlocked(avatarId, currentLevel)) return;
    setSelectedId(avatarId);
    await saveSelectedAvatar(avatarId);
  };

  return (
    <View style={s.container}>
      <ImageBackground source={BG_STARS} style={StyleSheet.absoluteFillObject} resizeMode="cover">
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21, 6, 41, 0.78)' }} />
      </ImageBackground>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{txt.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.grid}>
          {AVATARS.map((av) => {
            const unlocked = isAvatarUnlocked(av.id, currentLevel);
            const isSelected = av.id === selectedId;
            return (
              <TouchableOpacity
                key={av.id}
                style={[s.card, !unlocked && s.cardLocked, isSelected && s.cardSelected]}
                onPress={() => handleSelect(av.id)}
                activeOpacity={unlocked ? 0.7 : 1}
              >
                <Image source={av.image} style={[{ width: 64, height: 64, borderRadius: 32 }, !unlocked && { opacity: 0.3 }]} />
                {unlocked ? (
                  isSelected ? (
                    <View style={s.checkBadge}>
                      <MaterialIcons name="check" size={12} color="#fff" />
                    </View>
                  ) : null
                ) : (
                  <View style={s.lockBadge}>
                    <MaterialIcons name="lock" size={10} color="#fff" />
                    <Text style={s.lockText}>Lv.{av.unlockLevel}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 20, color: '#fff' },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: {
    width: '30%', aspectRatio: 1, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#9B7DFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  cardLocked: { opacity: 0.5 },
  cardSelected: {
    borderColor: COLORS.primary, borderWidth: 2.5,
    shadowColor: COLORS.primary, shadowOpacity: 0.7, shadowRadius: 16,
    backgroundColor: 'rgba(255,138,167,0.1)',
  },
  emoji: { fontSize: 48 },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },
  lockBadge: {
    position: 'absolute', bottom: 6, alignItems: 'center', gap: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    flexDirection: 'row',
  },
  lockText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff', marginLeft: 2 },
});
