import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { getDailyCompletionMap, getDailyStreak } from '../src/utils/dailyChallenge';
import { useLang } from '../src/context/LanguageContext';

const SW = Dimensions.get('window').width;
const CELL = Math.floor((SW - 48) / 7);

// Pzt-Paz (Monday first) - 6 languages
const DAY_ABBR = {
  tr: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  de: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
  es: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  ar: ['اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت', 'أحد'],
};

const MONTHS = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

const DAILY_I18N = {
  tr: { title: 'Günlük Meydan Okuma', streak: '🔥 Seri', totalLabel: '✅ Toplam', reward: '🪙 Ödül',
    info: '📅 Her gün benzersiz bir bölüm\n🏆 6 kategori × 5 kelime — zor!\n🪙 Tamamla → 100 coin kazan\n⏪ Geçmiş günleri de oynayabilirsin' },
  en: { title: 'Daily Challenge', streak: '🔥 Streak', totalLabel: '✅ Total', reward: '🪙 Reward',
    info: '📅 A unique level every day\n🏆 6 categories × 5 words — hard!\n🪙 Complete → earn 100 coins\n⏪ You can play past days too' },
  de: { title: 'Tägliche Herausforderung', streak: '🔥 Serie', totalLabel: '✅ Gesamt', reward: '🪙 Belohnung',
    info: '📅 Ein einzigartiges Level pro Tag\n🏆 6 Kategorien × 5 Wörter — schwer!\n🪙 Abschließen → 100 Münzen verdienen\n⏪ Vergangene Tage können auch gespielt werden' },
  fr: { title: 'Défi quotidien', streak: '🔥 Série', totalLabel: '✅ Total', reward: '🪙 Récompense',
    info: '📅 Un niveau unique chaque jour\n🏆 6 catégories × 5 mots — difficile !\n🪙 Terminer → gagner 100 pièces\n⏪ Vous pouvez jouer les jours passés' },
  es: { title: 'Desafío diario', streak: '🔥 Racha', totalLabel: '✅ Total', reward: '🪙 Recompensa',
    info: '📅 Un nivel único cada día\n🏆 6 categorías × 5 palabras — ¡difícil!\n🪙 Completa → gana 100 monedas\n⏪ También puedes jugar días pasados' },
  ar: { title: 'التحدي اليومي', streak: '🔥 سلسلة', totalLabel: '✅ المجموع', reward: '🪙 مكافأة',
    info: '📅 مستوى فريد كل يوم\n🏆 6 فئات × 5 كلمات — صعب!\n🪙 أكمل → اربح 100 عملة\n⏪ يمكنك أيضاً لعب الأيام الماضية' },
};

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Monday=0 based start day
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  return { daysInMonth, startDay };
}

function dateToKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function DailyScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const txt = DAILY_I18N[lang] || DAILY_I18N.tr;
  const dayAbbr = DAY_ABBR[lang] || DAY_ABBR.tr;
  const monthNames = MONTHS[lang] || MONTHS.tr;
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [completionMap, setCompletionMap] = useState({});
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getDailyCompletionMap().then(setCompletionMap).catch(() => {});
      getDailyStreak().then(setStreak).catch(() => {});
    }, [])
  );

  const { daysInMonth, startDay } = getMonthDays(viewYear, viewMonth);
  const todayKey = dateToKey(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  // Gelecek aya gitme
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const isFutureMonth = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const playDay = (day) => {
    const dateKey = dateToKey(viewYear, viewMonth, day);
    const targetDate = new Date(viewYear, viewMonth, day);
    const seed = targetDate.getFullYear() * 10000 + (targetDate.getMonth() + 1) * 100 + targetDate.getDate();
    
    // Gelecek günler oynanamaz
    if (targetDate > today) return;
    // Zaten tamamlanmış — tekrar oynayabilir
    router.push({ pathname: '/game', params: { daily: 'true', dailySeed: seed.toString(), dailyDate: dateKey } });
  };

  const cells = [];
  // Boş hücreler (ayın başı)
  for (let i = 0; i < startDay; i++) {
    cells.push(<View key={'e' + i} style={st.cell} />);
  }
  // Gün hücreleri
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateToKey(viewYear, viewMonth, d);
    const isToday = key === todayKey;
    const isDone = completionMap[key];
    const targetDate = new Date(viewYear, viewMonth, d);
    const isFuture = targetDate > today;

    cells.push(
      <TouchableOpacity
        key={d}
        style={[st.cell, isToday && st.cellToday, isDone && st.cellDone, isFuture && st.cellFuture]}
        activeOpacity={isFuture ? 1 : 0.6}
        onPress={() => !isFuture && playDay(d)}
      >
        <Text style={[st.cellText, isToday && st.cellTextToday, isDone && st.cellTextDone, isFuture && st.cellTextFuture]}>
          {d}
        </Text>
        {isDone && <Text style={st.cellCheck}>✓</Text>}
        {isToday && !isDone && <View style={st.todayDot} />}
      </TouchableOpacity>
    );
  }

  // Tamamlanan gün sayısı
  const doneCount = Object.keys(completionMap).length;

  return (
    <View style={st.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={st.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>{txt.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scroll}>
        {/* Streak + Stats */}
        <View style={st.statsRow}>
          <View style={st.statBox}>
            <Text style={st.statNum}>{streak}</Text>
            <Text style={st.statLabel}>{txt.streak}</Text>
          </View>
          <View style={st.statBox}>
            <Text style={st.statNum}>{doneCount}</Text>
            <Text style={st.statLabel}>{txt.totalLabel}</Text>
          </View>
          <View style={st.statBox}>
            <Text style={st.statNum}>100</Text>
            <Text style={st.statLabel}>{txt.reward}</Text>
          </View>
        </View>

        {/* Month navigation */}
        <View style={st.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={st.monthBtn}>
            <MaterialIcons name="chevron-left" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={st.monthTitle}>{monthNames[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={st.monthBtn} disabled={isFutureMonth}>
            <MaterialIcons name="chevron-right" size={28} color={isFutureMonth ? 'rgba(255,255,255,0.2)' : '#fff'} />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={st.dayHeaders}>
          {dayAbbr.map((d) => (
            <View key={d} style={st.dayHeaderCell}>
              <Text style={st.dayHeaderText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={st.grid}>
          {cells}
        </View>

        {/* Info */}
        <View style={st.infoBox}>
          <Text style={st.infoText}>{txt.info}</Text>
        </View>
      </ScrollView>

      <BottomNav activeTab="daily" />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  scroll: { paddingHorizontal: 16, paddingBottom: 100 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, marginTop: 8 },
  statBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minWidth: 90 },
  statNum: { fontFamily: FONTS.headlineBlack, fontSize: 24, color: '#fff' },
  statLabel: { fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },

  dayHeaders: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  dayHeaderCell: { width: CELL, alignItems: 'center' },
  dayHeaderText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: COLORS.onSurfaceVariant },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 4 },
  
  cell: { width: CELL, height: CELL, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cellToday: { backgroundColor: 'rgba(124,92,252,0.3)', borderColor: COLORS.primary, borderWidth: 2 },
  cellDone: { backgroundColor: 'rgba(76,175,80,0.2)', borderColor: COLORS.success, borderWidth: 1.5 },
  cellFuture: { opacity: 0.25 },

  cellText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff' },
  cellTextToday: { color: COLORS.primary },
  cellTextDone: { color: COLORS.success },
  cellTextFuture: { color: 'rgba(255,255,255,0.3)' },

  cellCheck: { fontSize: 10, color: COLORS.success, position: 'absolute', bottom: 2 },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, position: 'absolute', bottom: 4 },

  infoBox: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  infoText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 22 },
});
