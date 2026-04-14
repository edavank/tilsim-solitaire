import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../src/constants/theme';
import { loadProgress } from '../src/utils/storage';

function getWeekNumber() {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d - start;
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000));
}

function getWeekEnd() {
  const d = new Date();
  const day = d.getDay();
  const diff = 7 - day;
  const end = new Date(d);
  end.setDate(end.getDate() + diff);
  end.setHours(23, 59, 59);
  return end;
}

function timeLeft() {
  const end = getWeekEnd();
  const now = new Date();
  const ms = end - now;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}s ${m}dk`;
}

// Simüle edilmiş turnuva katılımcıları
const FAKE_PLAYERS = [
  { name: 'Bilge Baykuş', score: 0, isYou: true },
  { name: 'Yıldız_42', score: 8500 },
  { name: 'SihirliKart', score: 7200 },
  { name: 'TılsımUstası', score: 6800 },
  { name: 'KartBüyücüsü', score: 5500 },
  { name: 'Gizemli_Oyuncu', score: 4200 },
  { name: 'AltınEl', score: 3800 },
  { name: 'MorBüyücü', score: 2900 },
  { name: 'KartSihirbazı', score: 2100 },
  { name: 'YeniOyuncu', score: 800 },
];

const REWARDS = ['🥇 500', '🥈 300', '🥉 200', '4. 100', '5. 50'];

export default function TournamentScreen() {
  const router = useRouter();
  const [myScore, setMyScore] = useState(0);

  useFocusEffect(useCallback(() => {
    loadProgress().then(p => setMyScore(p.bestScore || 0));
  }, []));

  const players = FAKE_PLAYERS.map(p => p.isYou ? { ...p, score: myScore } : p)
    .sort((a, b) => b.score - a.score);
  const myRank = players.findIndex(p => p.isYou) + 1;

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Haftalık Turnuva</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Week info */}
        <View style={s.weekCard}>
          <Text style={s.weekTitle}>Hafta {getWeekNumber()}</Text>
          <Text style={s.weekTimer}>Kalan: {timeLeft()}</Text>
        </View>

        {/* Rewards */}
        <View style={s.rewardsRow}>
          {REWARDS.map((r, i) => (
            <View key={i} style={s.rewardChip}>
              <Text style={s.rewardText}>{r} 🪙</Text>
            </View>
          ))}
        </View>

        {/* Your rank */}
        <View style={s.myRank}>
          <Text style={s.myRankLabel}>Sıralaman</Text>
          <Text style={s.myRankNum}>#{myRank}</Text>
          <Text style={s.myRankScore}>{myScore} puan</Text>
        </View>

        {/* Leaderboard */}
        {players.map((p, i) => (
          <View key={i} style={[s.row, p.isYou && s.rowYou]}>
            <Text style={s.rank}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}.`}</Text>
            <Text style={[s.name, p.isYou && { color: COLORS.primary }]}>{p.isYou ? 'Sen' : p.name}</Text>
            <Text style={s.score}>{p.score.toLocaleString()}</Text>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  scroll: { paddingHorizontal: 16 },
  weekCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,209,102,0.1)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,209,102,0.2)' },
  weekTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: COLORS.coin },
  weekTimer: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant },
  rewardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  rewardChip: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  rewardText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: COLORS.coin },
  myRank: { alignItems: 'center', backgroundColor: 'rgba(124,92,252,0.15)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(124,92,252,0.3)' },
  myRankLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant },
  myRankNum: { fontFamily: FONTS.headlineBlack, fontSize: 36, color: COLORS.primary },
  myRankScore: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.onSurfaceVariant },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.04)' },
  rowYou: { backgroundColor: 'rgba(124,92,252,0.1)', borderWidth: 1, borderColor: COLORS.primary },
  rank: { fontSize: 16, width: 36, fontFamily: FONTS.headlineBlack, color: COLORS.onSurfaceVariant },
  name: { flex: 1, fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff' },
  score: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.coin },
});
