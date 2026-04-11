import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { LEVELS } from '../src/data/levels';
import { loadProgress } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');

const CHAPTER_NAMES = [
  'Başlangıç', 'Keşif', 'Uyanış', 'Yolculuk', 'Gökyüzü',
  'Fırtına', 'Denge', 'Gizem', 'Takımyıldız', 'Efsane',
  'Yıldız', 'Bulut', 'Rüzgâr', 'Dalga', 'Ateş',
  'Toprak', 'Kristal', 'Şafak', 'Gölge', 'Işık',
  'Yağmur', 'Gökkuşağı', 'Okyanus', 'Volkan', 'Buzul',
  'Orman', 'Çöl', 'Nehir', 'Dağ', 'Vadi',
  'Ay', 'Güneş', 'Yıldızlar', 'Galaksi', 'Nebula',
  'Kuark', 'Foton', 'Plazma', 'Kuantum', 'Sonsuzluk',
  'Zaman', 'Uzay', 'Boyut', 'Evren', 'Kaos',
  'Düzen', 'Dönüşüm', 'Aşkın', 'Tılsım', 'Nirvana',
];

export default function LevelsScreen() {
  const [currentLevel, setCurrentLevel] = useState(1);

  useEffect(() => {
    loadProgress().then((p) => setCurrentLevel(p.currentLevel));
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bölümler</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Owl & progress */}
        <View style={s.progressCard}>
          <Image source={OWL} style={s.owl} />
          <View style={s.progressInfo}>
            <Text style={s.progressLabel}>İLERLEME</Text>
            <Text style={s.progressValue}>{Math.min(currentLevel - 1, LEVELS.length)} / {LEVELS.length}</Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: (Math.min(currentLevel - 1, LEVELS.length) / LEVELS.length * 100) + '%' }]} />
            </View>
          </View>
        </View>

        {/* Level grid */}
        <View style={s.grid}>
          {LEVELS.map((level, i) => {
            const isUnlocked = level.id <= currentLevel;
            const isCompleted = level.id < currentLevel;
            const isCurrent = level.id === currentLevel;
            const chapterName = CHAPTER_NAMES[i] || 'Bölüm ' + level.id;

            return (
              <TouchableOpacity
                key={level.id}
                style={[s.levelCard, isCurrent && s.levelCurrent, isCompleted && s.levelCompleted, !isUnlocked && s.levelLocked]}
                onPress={() => {
                  if (isUnlocked) router.push({ pathname: '/game', params: { level: level.id } });
                }}
                activeOpacity={isUnlocked ? 0.7 : 1}
              >
                {/* Stars */}
                {isCompleted && (
                  <View style={s.stars}>
                    <MaterialIcons name="star" size={12} color={COLORS.coin} />
                    <MaterialIcons name="star" size={12} color={COLORS.coin} />
                    <MaterialIcons name="star" size={12} color={COLORS.coin} />
                  </View>
                )}

                {/* Level number */}
                <Text style={[s.levelNum, !isUnlocked && s.levelNumLocked]}>
                  {isUnlocked ? level.id : ''}
                </Text>

                {!isUnlocked && <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.2)" />}

                {isCurrent && (
                  <View style={s.currentBadge}>
                    <MaterialIcons name="play-arrow" size={12} color="#fff" />
                  </View>
                )}

                {/* Chapter name */}
                <Text style={[s.chapterName, !isUnlocked && { color: 'rgba(255,255,255,0.15)' }]} numberOfLines={1}>
                  {chapterName}
                </Text>

                {/* Difficulty indicator */}
                {isUnlocked && (
                  <View style={s.diffDots}>
                    {[...Array(Math.min(Math.ceil(level.id / 2), 5))].map((_, j) => (
                      <View key={j} style={[s.diffDot, { backgroundColor: j < 2 ? COLORS.success : j < 4 ? COLORS.coin : COLORS.fail }]} />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.onSurface },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  progressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: COLORS.panelBg, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 24,
  },
  owl: { width: 56, height: 56, borderRadius: 14 },
  progressInfo: { flex: 1 },
  progressLabel: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: COLORS.onSurfaceVariant, letterSpacing: 2 },
  progressValue: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface, marginVertical: 4 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  levelCard: {
    width: '30%', aspectRatio: 0.9, borderRadius: 16,
    backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.panelBorder,
    alignItems: 'center', justifyContent: 'center', padding: 8,
  },
  levelCurrent: { borderColor: COLORS.primary, borderWidth: 2.5, backgroundColor: 'rgba(255,138,167,0.1)' },
  levelCompleted: { borderColor: COLORS.success, backgroundColor: 'rgba(93,190,110,0.08)' },
  levelLocked: { opacity: 0.5 },

  stars: { flexDirection: 'row', gap: 2, position: 'absolute', top: 6 },
  levelNum: { fontFamily: FONTS.headlineBlack, fontSize: 28, color: COLORS.onSurface },
  levelNumLocked: { color: 'rgba(255,255,255,0.15)', fontSize: 0 },
  currentBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  chapterName: { fontFamily: FONTS.body, fontSize: 9, color: COLORS.onSurfaceVariant, marginTop: 4, textAlign: 'center' },
  diffDots: { flexDirection: 'row', gap: 3, marginTop: 4 },
  diffDot: { width: 5, height: 5, borderRadius: 2.5 },
});
