import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated , ImageBackground} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS  } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { ACHIEVEMENTS, loadAchievements, ACHIEVEMENT_I18N, claimAchievement, countUnclaimed, totalUnclaimedReward } from '../src/utils/achievements';
import { loadProgress, updateProgress } from '../src/utils/storage';
import { getDailyCompletionMap } from '../src/utils/dailyChallenge';
import { useLang } from '../src/context/LanguageContext';

const BG_STARS = require('../assets/bg-stars.webp');

export default function AchievementsScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const ai = ACHIEVEMENT_I18N[lang] || ACHIEVEMENT_I18N.tr;
  const [unlocked, setUnlocked] = useState({});
  const [stats, setStats] = useState({});
  const [coins, setCoins] = useState(0);
  const [claiming, setClaiming] = useState(null); // şu an claim ediliyor olan id

  const refresh = useCallback(async () => {
    try {
      const u = await loadAchievements();
      setUnlocked(u);
      const p = await loadProgress();
      setCoins(p.coins || 0);
      const dailyMap = await getDailyCompletionMap();
      setStats({ ...p, dailyCount: Object.keys(dailyMap).length });
      if (p.unseenAch > 0) await updateProgress({ unseenAch: 0 });
    } catch (e) {}
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onClaim = async (achId) => {
    if (claiming) return; // çift tıklama önleyici
    setClaiming(achId);
    try {
      const result = await claimAchievement(achId);
      if (result.success && result.reward > 0) {
        const p = await loadProgress();
        const newCoins = (p.coins || 0) + result.reward;
        await updateProgress({ coins: newCoins });
        setCoins(newCoins);
        // playSound kaldırıldı
        // unlocked map'i güncelle
        await refresh();
      }
    } catch (e) {}
    setClaiming(null);
  };

  const onClaimAll = async () => {
    if (claiming) return;
    setClaiming('all');
    try {
      let totalGained = 0;
      for (const id in unlocked) {
        if (unlocked[id] && unlocked[id].claimed === false) {
          const result = await claimAchievement(id);
          if (result.success) totalGained += result.reward;
        }
      }
      if (totalGained > 0) {
        const p = await loadProgress();
        const newCoins = (p.coins || 0) + totalGained;
        await updateProgress({ coins: newCoins });
        setCoins(newCoins);
        // playSound kaldırıldı
        await refresh();
      }
    } catch (e) {}
    setClaiming(null);
  };

  const total = ACHIEVEMENTS.length;
  const done = Object.keys(unlocked).length;
  const unclaimedCount = countUnclaimed(unlocked);
  const unclaimedTotal = totalUnclaimedReward(unlocked);

  return (
    <View style={s.container}>
      <ImageBackground source={BG_STARS} style={StyleSheet.absoluteFillObject} resizeMode="cover">
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21, 6, 41, 0.78)' }} />
      </ImageBackground>
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.backBtn}>
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

      {/* Tümünü Topla butonu — sadece toplanmamış başarım varsa */}
      {unclaimedCount > 0 && (
        <View style={s.claimAllWrap}>
          <TouchableOpacity 
            style={[s.claimAllBtn, claiming === 'all' && s.claimAllBtnDisabled]}
            onPress={onClaimAll}
            disabled={claiming !== null}
            activeOpacity={0.8}
          >
            <MaterialIcons name="card-giftcard" size={20} color="#000" />
            <Text style={s.claimAllText}>{ai.claimAll || 'Tümünü Topla'} ({unclaimedCount})</Text>
            <Text style={s.claimAllReward}>+{unclaimedTotal} 🪙</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scroll}>
        {ACHIEVEMENTS.map((ach) => {
          const entry = unlocked[ach.id];
          const isUnlocked = !!entry;
          const isClaimed = isUnlocked && entry.claimed === true;
          const canClaim = isUnlocked && entry.claimed === false;
          const isClaimingThis = claiming === ach.id;

          return (
            <View key={ach.id} style={[s.achCard, !isUnlocked && s.achLocked, canClaim && s.achClaimable]}>
              <Text style={s.achIcon}>{isUnlocked ? ach.icon : '🔒'}</Text>
              <View style={s.achInfo}>
                <Text style={[s.achTitle, !isUnlocked && s.achTitleLocked]}>{ai[ach.id]?.[0] || ach.title}</Text>
                <Text style={s.achDesc}>{ai[ach.id]?.[1] || ach.desc}</Text>
              </View>
              {/* Sağ taraf — duruma göre 3 farklı görünüm */}
              {canClaim ? (
                <TouchableOpacity 
                  style={[s.claimBtn, isClaimingThis && s.claimBtnDisabled]}
                  onPress={() => onClaim(ach.id)}
                  disabled={claiming !== null}
                  activeOpacity={0.7}
                >
                  <Text style={s.claimBtnText}>{ai.claim || 'TOPLA'}</Text>
                  <Text style={s.claimBtnReward}>+{ach.reward} 🪙</Text>
                </TouchableOpacity>
              ) : isClaimed ? (
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

  // Tümünü Topla butonu
  claimAllWrap: { paddingHorizontal: 16, marginBottom: 12 },
  claimAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD700', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 8, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  claimAllBtnDisabled: { opacity: 0.5 },
  claimAllText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#000', flex: 1, textAlign: 'center' },
  claimAllReward: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#000' },

  scroll: { paddingHorizontal: 16 },
  achCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12 },
  achLocked: { opacity: 0.45 },
  achClaimable: { borderColor: '#FFD700', borderWidth: 2, backgroundColor: 'rgba(255,215,0,0.08)' },
  achIcon: { fontSize: 28, width: 40, textAlign: 'center' },
  achInfo: { flex: 1 },
  achTitle: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff', marginBottom: 2 },
  achTitleLocked: { color: 'rgba(255,255,255,0.5)' },
  achDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant },

  // TOPLA butonu (her başarım için)
  claimBtn: { backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 70 },
  claimBtnDisabled: { opacity: 0.5 },
  claimBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#000', letterSpacing: 0.5 },
  claimBtnReward: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#000', marginTop: 1 },
});
