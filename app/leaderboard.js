import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES  } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';
import { router } from 'expo-router';
import { fetchLeaderboard, getUserRank } from '../src/utils/leaderboardService';


const LB_TEXT = {
  tr: { tabs: ['Haftalık', 'Aylık', 'Tüm Zamanlar'], games: 'Oyun', wins: 'Kazanma', success: 'Başarı', you: 'Sen', level: 'Bölüm', noData: 'Henüz veri yok' },
  en: { tabs: ['Weekly', 'Monthly', 'All Time'], games: 'Games', wins: 'Wins', success: 'Success', you: 'You', level: 'Level', noData: 'No data yet' },
  de: { tabs: ['Wöchentlich', 'Monatlich', 'Alle Zeiten'], games: 'Spiele', wins: 'Siege', success: 'Erfolg', you: 'Du', level: 'Level', noData: 'Noch keine Daten' },
  fr: { tabs: ['Semaine', 'Mois', 'Tout temps'], games: 'Parties', wins: 'Victoires', success: 'Succès', you: 'Vous', level: 'Niveau', noData: 'Pas encore de données' },
  es: { tabs: ['Semanal', 'Mensual', 'Todo'], games: 'Juegos', wins: 'Victorias', success: 'Éxito', you: 'Tú', level: 'Nivel', noData: 'Sin datos aún' },
  ar: { tabs: ['أسبوعي', 'شهري', 'كل الوقت'], games: 'ألعاب', wins: 'فوز', success: 'نجاح', you: 'أنت', level: 'مستوى', noData: 'لا توجد بيانات' },
};

const PERIODS = ['weekly', 'monthly', 'all'];

// Placeholder data when Supabase not configured
const PLACEHOLDER = [
  { display_name: 'Efsun', avatar_emoji: '🦄', score: 12850, level: 45 },
  { display_name: 'Volkan', avatar_emoji: '🦊', score: 9420, level: 32 },
  { display_name: 'Beren', avatar_emoji: '🐼', score: 8100, level: 28 },
  { display_name: 'Aslan', avatar_emoji: '🦁', score: 7950, level: 25 },
  { display_name: 'Luna', avatar_emoji: '🐰', score: 7210, level: 22 },
  { display_name: 'Meow', avatar_emoji: '🐱', score: 6840, level: 20 },
];

export default function LeaderboardScreen() {
  const { lang } = useLang();
  const lb = LB_TEXT[lang] || LB_TEXT.tr;
  const [activeTab, setActiveTab] = useState(2); // default: all time
  const [userScore, setUserScore] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [leaders, setLeaders] = useState(PLACEHOLDER);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(false);

  // useEffect mount/unmount + tab switch: cancelled flag ile async race önlenir.
  // Önceden setState unmounted'da cagrilabiliyordu; tab hizli degisince
  // eski fetch'in sonucu yeni tab'in uzerine yazabiliyordu.
  const _loadTokenRef = React.useRef(0);

  const loadData = async (tabIdx) => {
    const token = ++_loadTokenRef.current;
    setLoading(true);
    const prog = await loadProgress();
    if (token !== _loadTokenRef.current) return;
    setUserScore(prog.bestScore || 0);
    setUserLevel(prog.currentLevel || 1);
    setCoins(prog.coins || 0);
    setTotalWins(prog.totalWins || 0);
    setTotalGames(prog.totalGames || 0);

    const { data } = await fetchLeaderboard(PERIODS[tabIdx], 20);
    if (token !== _loadTokenRef.current) return;
    if (data && data.length > 0) setLeaders(data);
    else setLeaders(PLACEHOLDER);

    const { rank } = await getUserRank();
    if (token !== _loadTokenRef.current) return;
    setUserRank(rank);
    setLoading(false);
  };

  useEffect(() => {
    loadData(activeTab);
    return () => { _loadTokenRef.current++; };
  }, []);

  const changeTab = (idx) => {
    setActiveTab(idx);
    loadData(idx);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={s.coinBadge}>
          <Text style={s.coinText}>{coins.toLocaleString()}</Text>
          <Text style={s.coinPlus}>+</Text>
          <Text style={{ fontSize: 14 }}>🪙</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {lb.tabs.map((tab, i) => (
          <TouchableOpacity key={i} style={[s.tab, activeTab === i && s.tabActive]} onPress={() => changeTab(i)} activeOpacity={0.7}>
            <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />}

        {/* Podium - top 3 */}
        {leaders.length >= 3 && (
        <View style={s.podium}>
          {/* 2nd place */}
          <View style={[s.podiumItem, { marginTop: 40 }]}>
            <View style={[s.podiumAvatar, { borderColor: COLORS.onSurfaceVariant }]}>
              <Text style={{ fontSize: 28 }}>{leaders[1]?.avatar_emoji || '🦊'}</Text>
              <View style={[s.rankBadge, { backgroundColor: COLORS.onSurfaceVariant }]}><Text style={s.rankText}>2</Text></View>
            </View>
            <View style={[s.podiumBase, { height: 80 }]}>
              <Text style={s.podiumName}>{leaders[1]?.display_name}</Text>
              <Text style={[s.podiumScore, { color: COLORS.primary }]}>{(leaders[1]?.score || 0).toLocaleString()}</Text>
            </View>
          </View>

          {/* 1st place */}
          <View style={s.podiumItem}>
            <MaterialIcons name="star" size={24} color={COLORS.coin} style={{ marginBottom: 4 }} />
            <View style={[s.podiumAvatar, s.podiumAvatarFirst, { borderColor: COLORS.coin, shadowColor: COLORS.coin, shadowOpacity: 0.6, shadowRadius: 12 }]}>
              <Text style={{ fontSize: 36 }}>{leaders[0]?.avatar_emoji || '🦄'}</Text>
              <View style={[s.rankBadge, { backgroundColor: COLORS.coin }]}><Text style={[s.rankText, { color: '#000' }]}>1</Text></View>
            </View>
            <View style={[s.podiumBase, { height: 100 }]}>
              <Text style={[s.podiumName, { fontSize: 16 }]}>{leaders[0]?.display_name}</Text>
              <Text style={[s.podiumScore, { color: COLORS.primary, fontSize: 18 }]}>{(leaders[0]?.score || 0).toLocaleString()}</Text>
            </View>
          </View>

          {/* 3rd place */}
          <View style={[s.podiumItem, { marginTop: 50 }]}>
            <View style={[s.podiumAvatar, { borderColor: '#CD7F32' }]}>
              <Text style={{ fontSize: 24 }}>{leaders[2]?.avatar_emoji || '🐼'}</Text>
              <View style={[s.rankBadge, { backgroundColor: '#CD7F32' }]}><Text style={s.rankText}>3</Text></View>
            </View>
            <View style={[s.podiumBase, { height: 65 }]}>
              <Text style={s.podiumName}>{leaders[2]?.display_name}</Text>
              <Text style={[s.podiumScore, { color: COLORS.secondary }]}>{(leaders[2]?.score || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>
        )}

        {/* List - 4th+ */}
        {leaders.slice(3).map((player, i) => (
          <View key={i} style={s.listRow}>
            <Text style={s.listRank}>{i + 4}</Text>
            <View style={s.listAvatar}><Text style={{ fontSize: 22 }}>{player.avatar_emoji || '👤'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.listName}>{player.display_name}</Text>
              <Text style={s.listTier}>{lb.level} {player.level || 1}</Text>
            </View>
            <Text style={s.listScore}>{(player.score || 0).toLocaleString()}</Text>
          </View>
        ))}

        {leaders.length === 0 && !loading && (
          <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', marginVertical: 30 }}>{lb.noData}</Text>
        )}

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{totalGames}</Text>
            <Text style={s.statLabel}>{lb.games}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{totalWins}</Text>
            <Text style={s.statLabel}>{lb.wins}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{totalGames > 0 ? Math.round(totalWins / totalGames * 100) : 0}%</Text>
            <Text style={s.statLabel}>{lb.success}</Text>
          </View>
        </View>

        {/* User card */}
        <View style={s.userCard}>
          <Text style={s.userRank}>{userRank || '—'}</Text>
          <View style={s.userAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{lb.you}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.userScore}>{userScore.toLocaleString()}</Text>
            <Text style={s.userHint}>{lb.level} {userLevel}</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav activeTab="leaderboard" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff', fontStyle: 'italic' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },
  coinPlus: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 20, marginTop: 8,
    backgroundColor: COLORS.panelBg, borderRadius: SIZES.radiusFull, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: SIZES.radiusFull },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontFamily: FONTS.bodyMedium, fontSize: 12, color: COLORS.onSurfaceVariant },
  tabTextActive: { color: '#fff', fontFamily: FONTS.headlineBlack },

  scroll: { paddingHorizontal: 20, paddingTop: 12 },

  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 20, gap: 8 },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumAvatar: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3,
    backgroundColor: COLORS.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginBottom: -8, zIndex: 2,
  },
  podiumAvatarFirst: { width: 80, height: 80, borderRadius: 40, borderWidth: 4 },
  rankBadge: {
    position: 'absolute', bottom: -6, width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.surface,
  },
  rankText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff' },
  podiumBase: {
    width: '100%', backgroundColor: COLORS.surfaceContainerHigh, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    alignItems: 'center', justifyContent: 'center', paddingTop: 14,
  },
  podiumName: { fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.onSurface },
  podiumScore: { fontFamily: FONTS.headlineBlack, fontSize: 14, marginTop: 2 },

  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 8,
  },
  listRank: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.onSurfaceVariant, width: 24 },
  listAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  listName: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.onSurface },
  listTier: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 1 },
  listScore: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.primary },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.outlineVariant },
  dotActive: { backgroundColor: COLORS.onSurfaceVariant },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: COLORS.panelBg, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },
  statValue: { fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.onSurface },
  statLabel: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.onSurfaceVariant, marginTop: 2 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  userRank: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.onSurfaceVariant, width: 24 },
  userAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primaryContainer + '33', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary },
  userName: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.onSurface },
  userProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  userProgressBar: { width: 60, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  userProgressLabel: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: COLORS.primary, letterSpacing: 1 },
  userScore: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.primary },
  userHint: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.onSurfaceVariant, marginTop: 1 },
});
