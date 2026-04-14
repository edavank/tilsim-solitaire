import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS , getThemeGradient } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { ACHIEVEMENTS, loadAchievements, ACHIEVEMENT_I18N } from '../src/utils/achievements';
import { loadProgress, updateProgress } from '../src/utils/storage';
import { getDailyCompletionMap } from '../src/utils/dailyChallenge';
import { useLang } from '../src/context/LanguageContext';

export default function AchievementsScreen() {
  const router = useRouter();
  const [activeTheme, setActiveTheme] = useState('cosmic');
  const { lang } = useLang();
  const ai = ACHIEVEMENT_I18N[lang] || ACHIEVEMENT_I18N.tr;
  const [unlocked, setUnlocked] = useState({});
  const [stats, setStats] = useState({});

  useFocusEffect(
    useCallback(() => {
      loadAchievements().then(setUnlocked);
      loadProgress().then(async (p) => {
        const dailyMap = await getDailyCompletionMap();
        setStats({ ...p, dailyCount: Object.keys(dailyMap).length });
        if (p.activeTheme) setActiveTheme(p.activeTheme);
        if (p.unseenAch > 0) await updateProgress({ unseenAch: 0 });
      });
    }, [])
  );

  const total = ACHIEVEMENTS.length;
  const done = Object.keys(unlocked).length;

  return (
    <View style={s.container}>
      <LinearGradient colors={getThemeGradient(activeTheme)} style={StyleSheet.absoluteFillObject} />
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{ai.pageTitle}</Text>
        <Text style={s.headerCount}>{done}/{total}</Text>
      </View>

      {/* Progress bar */}
      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(done / total) * 100}%` }]} />
        </View>
        <Text style={s.progressText}>{Math.round((done / total) * 100)}%</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = !!unlocked[ach.id];
          return (
            <View key={ach.id} style={[s.achCard, !isUnlocked && s.achLocked]}>
              <Text style={s.achIcon}>{isUnlocked ? ach.icon : '🔒'}</Text>
              <View style={s.achInfo}>
                <Text style={[s.achTitle, !isUnlocked && s.achTitleLocked]}>{ai[ach.id]?.[0] || ach.title}</Text>
                <Text style={s.achDesc}>{ai[ach.id]?.[1] || ach.desc}</Text>
              </View>
              {isUnlocked ? (
                <MaterialIcons name="check-circle" size={24} color={COLORS.success} />
              ) : ach.reward ? (
                <Text style={{ fontFamily: FONTS.headline, fontSize: 11, color: COLORS.coin }}>+{ach.reward} 🪙</Text>
              ) : null}
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav activeTab="achievements" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  headerCount: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.coin, backgroundColor: 'rgba(255,209,102,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  progressBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: COLORS.success, borderRadius: 4 },
  progressText: { fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.success, minWidth: 40, textAlign: 'right' },

  scroll: { paddingHorizontal: 16 },
  achCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  achLocked: { opacity: 0.45 },
  achIcon: { fontSize: 28, width: 40, textAlign: 'center' },
  achInfo: { flex: 1 },
  achTitle: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff', marginBottom: 2 },
  achTitleLocked: { color: 'rgba(255,255,255,0.5)' },
  achDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant },
});
