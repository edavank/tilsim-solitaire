import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { getTotalLevels, getLevel } from '../src/data/levels';
import { loadProgress, loadSettings } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');

const CHAPTER_NAMES = [
  'Başlangıç', 'Keşif', 'Uyanış', 'Yolculuk', 'Gökyüzü',
  'Fırtına', 'Denge', 'Gizem', 'Takımyıldız', 'Efsane',
  'Yıldız', 'Bulut', 'Rüzgâr', 'Dalga', 'Ateş',
  'Toprak', 'Kristal', 'Şafak', 'Gölge', 'Işık',
];

export default function LevelsScreen() {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalLevels, setTotalLevels] = useState(200);

  useEffect(() => {
    loadProgress().then((p) => setCurrentLevel(p.currentLevel || 1));
    loadSettings().then((s) => setTotalLevels(getTotalLevels(s.language || 'tr')));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress().then((p) => setCurrentLevel(p.currentLevel || 1));
    }, [])
  );

  // Show levels in chapters of 10
  const maxVisible = Math.min(Math.max(currentLevel + 20, 30), totalLevels);

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bölümler</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.progressCard}>
          <Image source={OWL} style={s.owl} />
          <View style={s.progressInfo}>
            <Text style={s.progressLabel}>İLERLEME</Text>
            <Text style={s.progressValue}>{Math.max(currentLevel - 1, 0)} / {totalLevels}</Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: (Math.max(currentLevel - 1, 0) / totalLevels * 100) + '%' }]} />
            </View>
          </View>
        </View>

        <View style={s.grid}>
          {Array.from({ length: maxVisible }, (_, i) => i + 1).map((id) => {
            const isUnlocked = id <= currentLevel;
            const isCompleted = id < currentLevel;
            const isCurrent = id === currentLevel;
            const chapterIdx = Math.floor((id - 1) / 10);
            const chapterName = (id - 1) % 10 === 0 ? (CHAPTER_NAMES[chapterIdx] || 'Bölüm ' + (chapterIdx + 1)) : null;

            return (
              <React.Fragment key={id}>
                {chapterName && (
                  <View style={s.chapterHeader}>
                    <Text style={s.chapterHeaderText}>{chapterName}</Text>
                    <View style={s.chapterLine} />
                  </View>
                )}
                <TouchableOpacity
                  style={[s.levelCard, isCurrent && s.levelCurrent, isCompleted && s.levelCompleted, !isUnlocked && s.levelLocked]}
                  onPress={() => { if (isUnlocked) router.push({ pathname: '/game', params: { level: id } }); }}
                  activeOpacity={isUnlocked ? 0.7 : 1}
                >
                  {isCompleted && (
                    <View style={s.stars}>
                      <MaterialIcons name="star" size={10} color={COLORS.coin} />
                      <MaterialIcons name="star" size={10} color={COLORS.coin} />
                      <MaterialIcons name="star" size={10} color={COLORS.coin} />
                    </View>
                  )}
                  <Text style={[s.levelNum, !isUnlocked && s.levelNumLocked]}>
                    {isUnlocked ? id : ''}
                  </Text>
                  {!isUnlocked && <MaterialIcons name="lock" size={18} color="rgba(255,255,255,0.2)" />}
                  {isCurrent && (
                    <View style={s.currentBadge}>
                      <MaterialIcons name="play-arrow" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </React.Fragment>
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
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 20,
  },
  owl: { width: 56, height: 56, borderRadius: 14 },
  progressInfo: { flex: 1 },
  progressLabel: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: COLORS.onSurfaceVariant, letterSpacing: 2 },
  progressValue: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface, marginVertical: 4 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chapterHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 },
  chapterHeaderText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.primary },
  chapterLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  levelCard: {
    width: 60, height: 60, borderRadius: 14,
    backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.panelBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  levelCurrent: { borderColor: COLORS.primary, borderWidth: 2.5, backgroundColor: 'rgba(255,138,167,0.1)' },
  levelCompleted: { borderColor: COLORS.success, backgroundColor: 'rgba(93,190,110,0.08)' },
  levelLocked: { opacity: 0.4 },

  stars: { flexDirection: 'row', gap: 1, position: 'absolute', top: 4 },
  levelNum: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface },
  levelNumLocked: { color: 'rgba(255,255,255,0.15)', fontSize: 0 },
  currentBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
