import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity , ImageBackground} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, FONTS } from '../src/constants/theme';
import { loadCollection } from '../src/utils/collection';
import { WORD_POOLS, CATEGORY_EMOJIS } from '../src/data/wordPools';
import { useLang } from '../src/context/LanguageContext';

const BG_STARS = require('../assets/bg-stars.webp');

const COLLECTION_TITLE = {
  tr: 'Koleksiyon', en: 'Collection', de: 'Sammlung',
  fr: 'Collection', es: 'Colección', ar: 'المجموعة', ru: 'Коллекция',
};

export default function CollectionScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const [collection, setCollection] = useState({});

  useFocusEffect(useCallback(() => { loadCollection(lang).then(setCollection).catch(() => {}); }, [lang]));

  const allCats = (WORD_POOLS[lang] || WORD_POOLS.tr || []).map(p => p.name);
  const discovered = Object.keys(collection).length;
  const total = allCats.length;

  return (
    <View style={s.container}>
      <ImageBackground source={BG_STARS} style={StyleSheet.absoluteFillObject} resizeMode="cover">
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21, 6, 41, 0.78)' }} />
      </ImageBackground>
      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{COLLECTION_TITLE[lang] || COLLECTION_TITLE.tr}</Text>
        <Text style={s.headerCount}>{discovered}/{total}</Text>
      </View>

      <View style={s.progressWrap}>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${(discovered / total) * 100}%` }]} />
        </View>
        <Text style={s.progressText}>{Math.round((discovered / total) * 100)}%</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.grid}>
          {allCats.map((cat) => {
            const data = collection[cat];
            const emoji = CATEGORY_EMOJIS[cat] || '❓';
            const isDiscovered = !!data;
            return (
              <View key={cat} style={[s.card, !isDiscovered && s.cardLocked]}>
                <Text style={s.cardEmoji}>{isDiscovered ? emoji : '❓'}</Text>
                <Text style={[s.cardName, !isDiscovered && { color: 'rgba(255,255,255,0.3)' }]} numberOfLines={1}>{isDiscovered ? cat : '???'}</Text>
                {isDiscovered && (
                  <Text style={s.cardStat}>{data.completed}x</Text>
                )}
              </View>
            );
          })}
        </View>
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
  headerCount: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.primary, backgroundColor: 'rgba(124,92,252,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
  progressBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  progressText: { fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.primary, minWidth: 40, textAlign: 'right' },
  scroll: { paddingHorizontal: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '30%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardLocked: { opacity: 0.3 },
  cardEmoji: { fontSize: 28, marginBottom: 4 },
  cardName: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff', textAlign: 'center' },
  cardStat: { fontFamily: FONTS.body, fontSize: 9, color: COLORS.onSurfaceVariant, marginTop: 2 },
});
