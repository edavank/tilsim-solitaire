import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress } from '../src/utils/storage';

const OWL = require('../assets/bilge-happy.png');

const TABS = ['Weekly', 'Monthly', 'All Time'];
const TABS_TR = ['Haftalık', 'Aylık', 'Tüm Zamanlar'];

const PODIUM = [
  { rank: 2, name: 'Volkan', score: 9420, color: COLORS.onSurfaceVariant },
  { rank: 1, name: 'Efsun', score: 12850, color: COLORS.coin },
  { rank: 3, name: 'Beren', score: 8100, color: '#CD7F32' },
];

const OTHERS = [
  { rank: 4, name: 'Aslan Kral', tier: 'Legendary League', score: 7950 },
  { rank: 5, name: 'ZıpZıp', tier: 'Diamond Tier', score: 7210 },
  { rank: 6, name: 'MeowMaster', tier: 'Gold Tier', score: 6840 },
];

export default function LeaderboardScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [coins, setCoins] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    loadProgress().then((p) => {
      setUserScore(p.bestScore || 0);
      setUserLevel(p.currentLevel || 1);
      setCoins(p.coins || 0);
      setTotalWins(p.totalWins || 0);
      setTotalGames(p.totalGames || 0);
    });
  }, []);

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Image source={OWL} style={s.headerAvatar} />
          <Text style={s.headerTitle}>Tılsım Solitaire</Text>
        </View>
        <View style={s.coinBadge}>
          <Text style={s.coinText}>{coins.toLocaleString()}</Text>
          <Text style={s.coinPlus}>+</Text>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS_TR.map((tab, i) => (
          <TouchableOpacity key={i} style={[s.tab, activeTab === i && s.tabActive]} onPress={() => setActiveTab(i)} activeOpacity={0.7}>
            <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Podium */}
        <View style={s.podium}>
          {/* 2nd place - left */}
          <View style={[s.podiumItem, { marginTop: 40 }]}>
            <View style={[s.podiumAvatar, { borderColor: COLORS.onSurfaceVariant }]}>
              <Text style={{ fontSize: 28 }}>🦊</Text>
              <View style={[s.rankBadge, { backgroundColor: COLORS.onSurfaceVariant }]}><Text style={s.rankText}>2</Text></View>
            </View>
            <View style={[s.podiumBase, { height: 80 }]}>
              <Text style={s.podiumName}>{PODIUM[0].name}</Text>
              <Text style={[s.podiumScore, { color: COLORS.primary }]}>{PODIUM[0].score.toLocaleString()}</Text>
            </View>
          </View>

          {/* 1st place - center */}
          <View style={s.podiumItem}>
            <MaterialIcons name="star" size={24} color={COLORS.coin} style={{ marginBottom: 4 }} />
            <View style={[s.podiumAvatar, s.podiumAvatarFirst, { borderColor: COLORS.coin }]}>
              <Text style={{ fontSize: 36 }}>🦄</Text>
              <View style={[s.rankBadge, { backgroundColor: COLORS.coin }]}><Text style={[s.rankText, { color: '#000' }]}>1</Text></View>
            </View>
            <View style={[s.podiumBase, { height: 100 }]}>
              <Text style={[s.podiumName, { fontSize: 16 }]}>{PODIUM[1].name}</Text>
              <Text style={[s.podiumScore, { color: COLORS.primary, fontSize: 18 }]}>{PODIUM[1].score.toLocaleString()}</Text>
            </View>
          </View>

          {/* 3rd place - right */}
          <View style={[s.podiumItem, { marginTop: 50 }]}>
            <View style={[s.podiumAvatar, { borderColor: '#CD7F32' }]}>
              <Text style={{ fontSize: 24 }}>🐼</Text>
              <View style={[s.rankBadge, { backgroundColor: '#CD7F32' }]}><Text style={s.rankText}>3</Text></View>
            </View>
            <View style={[s.podiumBase, { height: 65 }]}>
              <Text style={s.podiumName}>{PODIUM[2].name}</Text>
              <Text style={[s.podiumScore, { color: COLORS.secondary }]}>{PODIUM[2].score.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* List */}
        {OTHERS.map((player, i) => (
          <View key={i} style={s.listRow}>
            <Text style={s.listRank}>{player.rank}</Text>
            <View style={s.listAvatar}><Text style={{ fontSize: 22 }}>{['🦁', '🐰', '🐱'][i]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.listName}>{player.name}</Text>
              <Text style={s.listTier}>{player.tier}</Text>
            </View>
            <Text style={s.listScore}>{player.score.toLocaleString()}</Text>
          </View>
        ))}

        {/* Dots */}
        <View style={s.dots}>
          <View style={[s.dot, s.dotActive]} /><View style={s.dot} /><View style={s.dot} />
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{totalGames}</Text>
            <Text style={s.statLabel}>Oyun</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{totalWins}</Text>
            <Text style={s.statLabel}>Kazanma</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{totalGames > 0 ? Math.round(totalWins / totalGames * 100) : 0}%</Text>
            <Text style={s.statLabel}>Başarı</Text>
          </View>
        </View>

        {/* User card */}
        <View style={s.userCard}>
          <Text style={s.userRank}>42</Text>
          <View style={s.userAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>Siz (You)</Text>
            <View style={s.userProgress}>
              <View style={s.userProgressBar} />
              <Text style={s.userProgressLabel}>RISING</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.userScore}>{userScore.toLocaleString()}</Text>
            <Text style={s.userHint}>Bölüm {userLevel}</Text>
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
