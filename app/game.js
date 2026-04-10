import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Animated, Alert, Vibration, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES, CATEGORY_COLORS } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { LEVELS, generateGameState } from '../src/data/levels';

const { width: SW } = Dimensions.get('window');
const COL_COUNT = 5; // max columns visible
const COL_GAP = 5;
const CARD_W = Math.floor((SW - 20 - (COL_COUNT - 1) * COL_GAP) / COL_COUNT);
const CARD_H = Math.floor(CARD_W * 1.35);
const OVERLAP = -Math.floor(CARD_H * 0.72); // kapalı kartlar %72 örtüşür

// ═══ FACE DOWN CARD ═══
function FaceDownCard() {
  return (
    <LinearGradient
      colors={[COLORS.cardBackTop, COLORS.cardBackBottom]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[s.faceDown, { width: CARD_W, height: CARD_H }]}
    >
      <View style={s.innerFrame}>
        <View style={s.innerFrameInner} />
      </View>
    </LinearGradient>
  );
}

// ═══ FACE UP CARD ═══
function FaceUpCard({ card, selected }) {
  const isCat = card.type === 'category';
  return (
    <View style={[
      s.faceUp, { width: CARD_W, height: CARD_H },
      selected && s.cardSelected,
      isCat && s.catCardBorder,
    ]}>
      {isCat ? (
        <>
          <View style={s.catBadge}>
            <Text style={s.catBadgeText}>0/{card.totalWords}</Text>
          </View>
          <MaterialIcons name="style" size={18} color={COLORS.cardBackTop} style={{ marginBottom: 2 }} />
          <Text style={s.catName} numberOfLines={2}>{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={[s.emoji, { fontSize: Math.max(18, CARD_W * 0.35) }]}>{card.emoji}</Text>
          <Text style={s.word} numberOfLines={2}>{card.word}</Text>
        </>
      )}
    </View>
  );
}

// ═══ FOUNDATION SLOT ═══
function FoundationSlot({ slot, onPress }) {
  if (slot.locked) {
    return (
      <View style={[s.slotLocked, { height: CARD_H * 0.85 }]}>
        <Text style={s.lockedText}>KİLİDİ AÇ</Text>
        <MaterialIcons name="style" size={20} color="rgba(255,255,255,0.15)" />
        <TouchableOpacity style={s.adBadge}><Text style={s.adText}>▶ AD</Text></TouchableOpacity>
      </View>
    );
  }
  if (slot.category) {
    const clr = CATEGORY_COLORS[slot.category.categoryIndex % CATEGORY_COLORS.length];
    const p = slot.placedCards.length;
    const t = slot.category.totalWords;
    return (
      <TouchableOpacity style={[s.slotActive, { height: CARD_H * 0.85, borderColor: clr }]} onPress={onPress} activeOpacity={0.8}>
        <View style={[s.slotTag, { backgroundColor: clr }]}>
          <Text style={s.slotTagText}>{p}/{t}</Text>
        </View>
        <MaterialIcons name="style" size={14} color={clr} style={{ marginTop: 8 }} />
        <Text style={s.slotCatName} numberOfLines={2}>{slot.category.word}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[s.slotEmpty, { height: CARD_H * 0.85 }]} onPress={onPress} activeOpacity={0.8}>
      <MaterialIcons name="style" size={22} color="rgba(255,255,255,0.12)" />
      <Text style={s.slotCounter}>0/6</Text>
    </TouchableOpacity>
  );
}

// ═══ TABLEAU COLUMN ═══
function TableauColumn({ column, colIndex, selectedId, onCardTap }) {
  if (column.locked) {
    return (
      <View style={[s.colLocked, { height: CARD_H }]}>
        <Text style={s.lockedText}>KİLİDİ AÇ</Text>
        <MaterialIcons name="add" size={16} color="rgba(255,255,255,0.2)" />
        <TouchableOpacity style={s.adBadge}><Text style={s.adText}>▶ AD</Text></TouchableOpacity>
      </View>
    );
  }
  if (column.cards.length === 0) return <View style={[s.colEmpty, { height: CARD_H }]} />;

  return (
    <View>
      {column.cards.map((card, ci) => {
        const isLast = ci === column.cards.length - 1;
        return (
          <View key={card.id} style={{ marginTop: ci === 0 ? 0 : OVERLAP, zIndex: ci }}>
            {card.faceUp ? (
              <TouchableOpacity activeOpacity={0.8} onPress={() => isLast && onCardTap(card, 'column', colIndex)}>
                <FaceUpCard card={card} selected={selectedId === card.id} />
              </TouchableOpacity>
            ) : (
              <FaceDownCard />
            )}
          </View>
        );
      })}
    </View>
  );
}

// ═══ GAME SCREEN ═══
export default function GameScreen() {
  const level = LEVELS.find((l) => l.id === 23) || LEVELS[0];
  const [gs, setGs] = useState(() => generateGameState(level));
  const [selected, setSelected] = useState(null);
  const [shakeSlot, setShakeSlot] = useState(null);
  const [history, setHistory] = useState([]);
  const shakeAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;

  useEffect(() => {
    if (shakeSlot !== null && shakeAnims[shakeSlot]) {
      Animated.sequence([
        Animated.timing(shakeAnims[shakeSlot], { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[shakeSlot], { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[shakeSlot], { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[shakeSlot], { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnims[shakeSlot], { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => setShakeSlot(null));
    }
  }, [shakeSlot]);

  const drawCard = useCallback(() => {
    setGs((p) => {
      if (p.deck.length === 0) return p;
      const d = [...p.deck]; const card = { ...d.pop(), faceUp: true };
      return { ...p, deck: d, drawnCards: [...p.drawnCards, card] };
    });
    setSelected(null);
  }, []);

  const handleCardTap = useCallback((card, source, sourceIndex) => {
    setSelected((prev) => prev && prev.card.id === card.id ? null : { card, source, sourceIndex });
  }, []);

  const handleDrawnTap = useCallback(() => {
    if (gs.drawnCards.length === 0) return;
    handleCardTap(gs.drawnCards[gs.drawnCards.length - 1], 'drawn', null);
  }, [gs.drawnCards, handleCardTap]);

  function removeFromSource(state, source, sourceIndex, cardId) {
    const ns = { ...state };
    if (source === 'drawn') {
      ns.drawnCards = state.drawnCards.filter((c) => c.id !== cardId);
    } else if (source === 'column') {
      ns.columns = state.columns.map((col, i) => {
        if (i !== sourceIndex) return col;
        const nc = col.cards.filter((c) => c.id !== cardId);
        if (nc.length > 0 && !nc[nc.length - 1].faceUp) nc[nc.length - 1] = { ...nc[nc.length - 1], faceUp: true };
        return { ...col, cards: nc };
      });
    }
    return ns;
  }

  const handleSlotTap = useCallback((slotIndex) => {
    if (!selected) return;
    const { card, source, sourceIndex } = selected;
    if (gs.slots[slotIndex].locked) { setSelected(null); return; }

    setGs((prev) => {
      const newSlots = prev.slots.map((sl) => ({ ...sl, placedCards: [...sl.placedCards] }));
      const target = newSlots[slotIndex];

      if (!target.category && card.type === 'category') {
        target.category = card;
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        setHistory((h) => [...h, prev]);
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5, isFailed: prev.moves - 1 <= 0 };
      }

      if (target.category && card.type === 'word') {
        if (card.categoryIndex !== target.category.categoryIndex) {
          setShakeSlot(slotIndex); Vibration.vibrate(100); setSelected(null);
          return { ...prev, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
        }
        target.placedCards.push(card);
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        let done = true;
        for (const sl of newSlots) if (sl.category && sl.placedCards.length < sl.category.totalWords) done = false;
        const catsPlaced = newSlots.filter((sl) => sl.category).length;
        const isComplete = done && catsPlaced >= level.categories.length;
        setHistory((h) => [...h, prev]);
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 10, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
    setSelected(null);
  }, [selected, gs.slots, level.categories.length]);

  const useUndo = useCallback(() => {
    if (history.length === 0) return;
    setGs(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); setSelected(null);
  }, [history]);

  const useDelete = useCallback(() => {
    setGs((p) => {
      if (p.drawnCards.length === 0) return p;
      return { ...p, drawnCards: p.drawnCards.slice(0, -1), moves: p.moves - 1 };
    }); setSelected(null);
  }, []);

  useEffect(() => {
    if (gs.isComplete) setTimeout(() => Alert.alert('🎉 Tebrikler!', 'Bölüm ' + gs.levelId + ' tamamlandı!\nPuan: ' + gs.score, [{ text: 'Ana Sayfa', onPress: () => router.back() }]), 600);
    if (gs.isFailed) setTimeout(() => Alert.alert('😔 Hamlen Bitti!', 'Tekrar deneyebilirsin!', [
      { text: 'Tekrar', onPress: () => { setGs(generateGameState(level)); setHistory([]); } },
      { text: 'Ana Sayfa', onPress: () => router.back() },
    ]), 600);
  }, [gs.isComplete, gs.isFailed]);

  const selId = selected?.card?.id;
  const DRAWN_CW = Math.floor(CARD_W * 1.1);
  const DRAWN_CH = Math.floor(CARD_H * 1.1);

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* HEADER */}
      <View style={s.header}>
        <View style={s.coinBadge}>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
          <Text style={s.coinText}>{gs.coins}</Text>
          <MaterialIcons name="add-circle" size={13} color={COLORS.primary} />
        </View>
        <Text style={s.headerTitle}>BÖLÜM {gs.levelId}</Text>
        <TouchableOpacity style={s.settingsBtn}>
          <MaterialIcons name="settings" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HAMLELER + ÇEKİLEN + DESTE */}
        <View style={s.deckRow}>
          {/* Hamleler */}
          <View style={s.movesPanel}>
            <Text style={s.movesLabel}>HAMLE</Text>
            <Text style={s.movesNum}>{gs.moves}</Text>
            <TouchableOpacity style={s.addBtn}>
              <Text style={s.addBtnText}>+20 ▶</Text>
            </TouchableOpacity>
          </View>

          {/* Çekilen kartlar */}
          <TouchableOpacity style={s.drawnArea} onPress={handleDrawnTap} activeOpacity={0.8}>
            {gs.drawnCards.length === 0 ? (
              <View style={[s.emptyCard, { width: DRAWN_CW, height: DRAWN_CH }]} />
            ) : (
              <View style={{ width: DRAWN_CW + 24, height: DRAWN_CH, justifyContent: 'center', alignItems: 'center' }}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => (
                  <View key={card.id} style={[s.drawnWrap, {
                    transform: [{ translateX: (i - (arr.length - 1)) * 14 }],
                    zIndex: i, opacity: i === arr.length - 1 ? 1 : 0.35 + i * 0.2,
                  }]}>
                    <View style={[
                      s.faceUp, { width: DRAWN_CW, height: DRAWN_CH },
                      i === arr.length - 1 && selId === card.id && s.cardSelected,
                    ]}>
                      <Text style={{ fontSize: 20 }}>{card.emoji}</Text>
                      <Text style={s.word} numberOfLines={1}>{card.word}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>

          {/* Deste */}
          <TouchableOpacity onPress={drawCard} activeOpacity={0.8}>
            {gs.deck.length > 0 ? (
              <View>
                <LinearGradient
                  colors={[COLORS.cardBackTop, COLORS.cardBackBottom]}
                  style={[s.faceDown, { width: DRAWN_CW, height: DRAWN_CH }]}
                >
                  <View style={s.innerFrame}><View style={s.innerFrameInner} /></View>
                </LinearGradient>
                <View style={s.deckBadge}><Text style={s.deckBadgeText}>{gs.deck.length}</Text></View>
              </View>
            ) : (
              <View style={[s.emptyCard, { width: DRAWN_CW, height: DRAWN_CH }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* FOUNDATION */}
        <View style={s.slotsRow}>
          {gs.slots.map((slot, i) => (
            <Animated.View key={i} style={{ flex: 1, transform: [{ translateX: shakeAnims[i] || 0 }] }}>
              <FoundationSlot slot={slot} onPress={() => handleSlotTap(i)} />
            </Animated.View>
          ))}
        </View>

        {/* TABLEAU — TEK SATIR */}
        <View style={s.tableauRow}>
          {gs.columns.map((col, i) => (
            <View key={i} style={{ flex: 1 }}>
              <TableauColumn column={col} colIndex={i} selectedId={selId} onCardTap={handleCardTap} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* TOOLBAR */}
      <View style={s.toolbar}>
        <ToolBtn icon="bolt" label="İPUCU" badge={gs.hints} badgeColor={COLORS.fail} onPress={() => setGs(p => ({ ...p, hints: p.hints - 1 }))} />
        <ToolBtn icon="undo" label="GERİ AL" badge="+" badgeColor={COLORS.success} onPress={useUndo} />
        <ToolBtn icon="auto-fix-normal" label="SİL" badge="+" badgeColor={COLORS.success} onPress={useDelete} />
        <ToolBtn icon="search" label="ARA" small onPress={() => {}} />
      </View>

      {/* Bilge mini */}
      <Image source={require('../assets/bilge-happy.png')} style={s.bilgeMini} />

      <BottomNav activeTab="home" onTabPress={(t) => t === 'home' && router.back()} />
    </View>
  );
}

function ToolBtn({ icon, label, badge, badgeColor, onPress, small }) {
  return (
    <View style={s.toolWrap}>
      <TouchableOpacity style={[s.toolBtn, small && s.toolBtnSm]} onPress={onPress} activeOpacity={0.7}>
        <MaterialIcons name={icon} size={small ? 16 : 20} color="#fff" />
        {badge !== undefined && (
          <View style={[s.toolBdg, { backgroundColor: badgeColor }]}>
            <Text style={s.toolBdgText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
      {!!label && <Text style={s.toolLabel}>{label}</Text>}
    </View>
  );
}

// ═══ STYLES ═══
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 52, paddingBottom: 6, backgroundColor: COLORS.headerBg,
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 9999, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 13, color: COLORS.onSurface },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff', letterSpacing: 2 },
  settingsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 200, gap: 10 },

  // Deck row
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  movesPanel: {
    backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.panelBorder,
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 72,
  },
  movesLabel: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  movesNum: { fontFamily: FONTS.headlineBlack, fontSize: 26, color: '#fff', lineHeight: 30 },
  addBtn: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, marginTop: 2 },
  addBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  drawnArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  drawnWrap: { position: 'absolute' },
  emptyCard: {
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.panelBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  deckBadge: {
    position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.primary,
    minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 3,
  },
  deckBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff' },

  // Cards
  faceDown: {
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.cardBackBorder, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  innerFrame: { flex: 1, margin: 3, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  innerFrameInner: { width: '60%', height: '60%', borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  faceUp: {
    borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.cardBorder, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 2, shadowColor: COLORS.primary, shadowOpacity: 0.6, shadowRadius: 8, elevation: 6 },
  catCardBorder: { borderColor: COLORS.cardBackBorder, borderWidth: 2 },
  emoji: { marginBottom: 1 },
  word: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#1e293b', textAlign: 'center', lineHeight: 9 },
  catBadge: { position: 'absolute', top: 2, right: 3 },
  catBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.cardBackTop },
  catName: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#1e293b', textAlign: 'center', lineHeight: 10, marginTop: 2 },

  // Foundation
  slotsRow: { flexDirection: 'row', gap: 3 },
  slotLocked: {
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: COLORS.panelBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  lockedText: { fontFamily: FONTS.headlineBlack, fontSize: 6, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5 },
  adBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  slotEmpty: {
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1.5, borderColor: COLORS.panelBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  slotCounter: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: 'rgba(255,255,255,0.15)' },
  slotActive: {
    borderRadius: 10, backgroundColor: '#fff', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', padding: 3, overflow: 'hidden',
  },
  slotTag: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 2, alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  slotTagText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  slotCatName: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#1e293b', textAlign: 'center', lineHeight: 9, marginTop: 2 },

  // Tableau
  tableauRow: { flexDirection: 'row', gap: COL_GAP, alignItems: 'flex-start' },
  colLocked: {
    borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: COLORS.panelBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  colEmpty: {
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },

  // Toolbar
  toolbar: {
    position: 'absolute', bottom: 92, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 4, zIndex: 40,
  },
  toolWrap: { alignItems: 'center', gap: 3 },
  toolBtn: {
    width: 46, height: 46, borderRadius: 13, backgroundColor: COLORS.buttonBlue,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3,
  },
  toolBtnSm: { width: 36, height: 36, borderRadius: 10 },
  toolBdg: {
    position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 2,
  },
  toolBdgText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  toolLabel: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.onSurfaceVariant, letterSpacing: 1 },

  // Bilge mini
  bilgeMini: {
    position: 'absolute', bottom: 100, right: 8, width: 52, height: 52,
    borderRadius: 12, opacity: 0.85, zIndex: 30,
  },
});
