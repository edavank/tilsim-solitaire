import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { getTotalLevels, getLevel } from '../src/data/levels';
import { loadProgress, loadLevelStars, loadXP } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';


export default function LevelsScreen() {
  const { lang, t } = useLang();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalLevels, setTotalLevels] = useState(200);
  const [starMap, setStarMap] = useState({});
  const [xpData, setXpData] = useState({ xp: 0, level: 1 });
  const chapters = t.chapters || [];

  useEffect(() => {
    loadProgress().then((p) => setCurrentLevel(p.currentLevel || 1));
    loadLevelStars().then(setStarMap);
    loadXP().then(setXpData);
    setTotalLevels(getTotalLevels(lang));
  }, [lang]);

  useFocusEffect(
    useCallback(() => {
      loadProgress().then((p) => setCurrentLevel(p.currentLevel || 1));
      loadLevelStars().then(setStarMap);
      loadXP().then(setXpData);
    }, [])
  );

  // Show levels in chapters of 10
  const maxVisible = Math.min(Math.max(currentLevel + 20, 30), totalLevels);

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.onSurface} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.levels}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.progressCard}>
          <View style={s.progressInfo}>
            <Text style={s.progressLabel}>{t.progress}</Text>
            <Text style={s.progressValue}>{Math.max(currentLevel - 1, 0)} / {totalLevels}</Text>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: (Math.max(currentLevel - 1, 0) / totalLevels * 100) + '%' }]} />
            </View>
          </View>
        </View>

        {/* XP Bar */}
        <View style={s.xpCard}>
          <Text style={s.xpLevel}>Lv.{xpData.level}</Text>
          <View style={{ flex: 1 }}>
            <View style={s.xpBar}>
              <View style={[s.xpFill, { width: ((xpData.xp % 500) / 500 * 100) + '%' }]} />
            </View>
          </View>
          <Text style={s.xpText}>{xpData.xp % 500}/500 XP</Text>
        </View>

        <View style={s.grid}>
          {Array.from({ length: maxVisible }, (_, i) => i + 1).map((id) => {
            const isUnlocked = id <= currentLevel;
            const isCompleted = id < currentLevel;
            const isCurrent = id === currentLevel;
            const chapterIdx = Math.floor((id - 1) / 10);
            const chapterName = (id - 1) % 10 === 0 ? (chapters[chapterIdx] || t.level + ' ' + (chapterIdx + 1)) : null;

            return (
              <React.Fragment key={id}>
                {chapterName && (
                  <View style={s.chapterHeader}>
                    <Text style={s.chapterHeaderText}>{chapterName}</Text>
                    <View style={s.chapterLine} />
                  </View>
                )}
                <TouchableOpacity
                  style={[s.levelCard, isCurrent && s.levelCurrent, isCompleted && s.levelCompleted, !isUnlocked && s.levelLocked, id % 10 === 0 && isUnlocked && s.levelBoss]}
                  onPress={() => { if (isUnlocked) router.push({ pathname: '/game', params: { level: id } }); }}
                  activeOpacity={isUnlocked ? 0.7 : 1}
                >
                  {isCompleted && (
                    <View style={s.stars}>
                      {[1, 2, 3].map(si => (
                        <MaterialIcons key={si} name="star" size={10} color={si <= (starMap[id] || 1) ? COLORS.coin : 'rgba(255,255,255,0.15)'} />
                      ))}
                    </View>
                  )}
                  {id % 10 === 0 && <Text style={{ fontSize: 7, color: '#FFD166', fontFamily: FONTS.headlineBlack, position: 'absolute', bottom: 2, letterSpacing: 1 }}>BOSS</Text>}
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
  levelCurrent: { borderColor: COLORS.primary, borderWidth: 2.5, backgroundColor: 'rgba(255,138,167,0.1)', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 8 },
  levelCompleted: { borderColor: COLORS.success, backgroundColor: 'rgba(93,190,110,0.08)', shadowColor: COLORS.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 6 },
  levelLocked: { opacity: 0.4 },
  levelBoss: { borderColor: '#FFD166', borderWidth: 2, shadowColor: '#FFD166', shadowOpacity: 0.5, shadowRadius: 8 },

  xpCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.panelBg, borderRadius: 14, padding: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 20,
  },
  xpLevel: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.primary, minWidth: 40 },
  xpBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.secondary },
  xpText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.onSurfaceVariant, minWidth: 65, textAlign: 'right' },

  stars: { flexDirection: 'row', gap: 1, position: 'absolute', top: 4 },
  levelNum: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface },
  levelNumLocked: { color: 'rgba(255,255,255,0.15)', fontSize: 0 },
  currentBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
});
