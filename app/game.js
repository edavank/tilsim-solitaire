import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Animated, Alert, Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES, CATEGORY_COLORS } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { LEVELS, generateGameState } from '../src/data/levels';

const { width: SW } = Dimensions.get('window');

// ═══ FACE DOWN CARD ═══
function FaceDownCard() {
  return (
    <LinearGradient
      colors={[COLORS.cardBackTop, COLORS.cardBackBottom]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={s.faceDown}
    >
      <View style={s.innerFrame}>
        <View style={s.innerFrameInner} />
      </View>
    </LinearGradient>
  );
}

// ═══ FACE UP CARD ═══
function FaceUpCard({ card, selected }) {
  const isCategory = card.type === 'category';
  return (
    <View style={[s.faceUp, selected && s.cardSelected, isCategory && s.catBorder]}>
      {isCategory ? (
        <>
          <View style={s.catBadge}>
            <Text style={s.catBadgeText}>0/{card.totalWords}</Text>
            <Text style={{ fontSize: 9 }}>🃏</Text>
          </View>
          <Text style={s.catName} numberOfLines={2}>{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={s.emoji}>{card.emoji}</Text>
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
      <View style={s.slotLocked}>
        <Text style={s.slotLockedText}>KİLİDİ AÇ</Text>
        <MaterialIcons name="style" size={24} color="rgba(255,255,255,0.2)" />
        <TouchableOpacity style={s.adBadge}><Text style={s.adText}>AD</Text></TouchableOpacity>
      </View>
    );
  }
  if (slot.category) {
    const clr = CATEGORY_COLORS[slot.category.categoryIndex % CATEGORY_COLORS.length];
    const p = slot.placedCards.length;
    const t = slot.category.totalWords;
    return (
      <TouchableOpacity style={[s.slotActive, { borderColor: clr }]} onPress={onPress} activeOpacity={0.8}>
        <View style={[s.slotTag, { backgroundColor: clr }]}>
          <Text style={s.slotTagText}>{p}/{t}</Text>
          <Text style={{ fontSize: 8 }}>🃏</Text>
        </View>
        <Text style={s.slotCatName} numberOfLines={2}>{slot.category.word}</Text>
        {p > 0 && <Text style={s.slotPreview}>{slot.placedCards[p - 1].emoji}</Text>}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={s.slotEmpty} onPress={onPress} activeOpacity={0.8}>
      <MaterialIcons name="style" size={24} color="rgba(255,255,255,0.15)" />
    </TouchableOpacity>
  );
}

// ═══ TABLEAU COLUMN ═══
function TableauColumn({ column, colIndex, selectedId, onCardTap }) {
  if (column.locked) {
    return (
      <View style={s.colLocked}>
        <Text style={s.slotLockedText}>KİLİDİ AÇ</Text>
        <MaterialIcons name="add" size={18} color="rgba(255,255,255,0.25)" />
        <TouchableOpacity style={s.adBadge}><Text style={s.adText}>AD</Text></TouchableOpacity>
      </View>
    );
  }
  if (column.cards.length === 0) {
    return <View style={s.colEmpty} />;
  }
  return (
    <View>
      {column.cards.map((card, ci) => {
        const isLast = ci === column.cards.length - 1;
        return (
          <View key={card.id} style={{ marginTop: ci === 0 ? 0 : -44, zIndex: ci }}>
            {card.faceUp ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => isLast && onCardTap(card, 'column', colIndex)}
              >
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
      const a = shakeAnims[shakeSlot];
      Animated.sequence([
        Animated.timing(a, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(a, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(a, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(a, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start(() => setShakeSlot(null));
    }
  }, [shakeSlot]);

  const drawCard = useCallback(() => {
    setGs((p) => {
      if (p.deck.length === 0) return p;
      const d = [...p.deck];
      const card = { ...d.pop(), faceUp: true };
      return { ...p, deck: d, drawnCards: [...p.drawnCards, card] };
    });
    setSelected(null);
  }, []);

  const handleCardTap = useCallback((card, source, sourceIndex) => {
    setSelected((prev) => prev && prev.card.id === card.id ? null : { card, source, sourceIndex });
  }, []);

  const handleDrawnTap = useCallback(() => {
    if (gs.drawnCards.length === 0) return;
    const top = gs.drawnCards[gs.drawnCards.length - 1];
    handleCardTap(top, 'drawn', null);
  }, [gs.drawnCards, handleCardTap]);

  function removeFromSource(state, source, sourceIndex, cardId) {
    const ns = { ...state };
    if (source === 'drawn') {
      ns.drawnCards = state.drawnCards.filter((c) => c.id !== cardId);
    } else if (source === 'column') {
      ns.columns = state.columns.map((col, i) => {
        if (i !== sourceIndex) return col;
        const newCards = col.cards.filter((c) => c.id !== cardId);
        if (newCards.length > 0 && !newCards[newCards.length - 1].faceUp) {
          newCards[newCards.length - 1] = { ...newCards[newCards.length - 1], faceUp: true };
        }
        return { ...col, cards: newCards };
      });
    }
    return ns;
  }

  const handleSlotTap = useCallback((slotIndex) => {
    if (!selected) return;
    const { card, source, sourceIndex } = selected;
    const slot = gs.slots[slotIndex];
    if (slot.locked) { setSelected(null); return; }

    setGs((prev) => {
      const newSlots = prev.slots.map((sl) => ({ ...sl, placedCards: [...sl.placedCards] }));
      const target = newSlots[slotIndex];

      // Boş slot + kategori kartı → yerleştir
      if (!target.category && card.type === 'category') {
        target.category = card;
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        setHistory((h) => [...h, prev]);
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5, isFailed: prev.moves - 1 <= 0 };
      }

      // Aktif slot + kelime kartı
      if (target.category && card.type === 'word') {
        if (card.categoryIndex !== target.category.categoryIndex) {
          setShakeSlot(slotIndex);
          Vibration.vibrate(100);
          setSelected(null);
          return { ...prev, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
        }
        target.placedCards.push(card);
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        let done = true;
        for (const sl of newSlots) {
          if (sl.category && sl.placedCards.length < sl.category.totalWords) done = false;
        }
        const catsPlaced = newSlots.filter((sl) => sl.category).length;
        const isComplete = done && catsPlaced >= level.categories.length;
        setHistory((h) => [...h, prev]);
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 10, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
    setSelected(null);
  }, [selected, gs.slots, level.categories.length]);

  const useHint = useCallback(() => {
    if (gs.hints <= 0) return;
    setGs((p) => ({ ...p, hints: p.hints - 1 }));
  }, [gs.hints]);

  const useUndo = useCallback(() => {
    if (history.length === 0) return;
    setGs(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
  }, [history]);

  const useDelete = useCallback(() => {
    setGs((p) => {
      if (p.drawnCards.length === 0) return p;
      return { ...p, drawnCards: p.drawnCards.slice(0, -1), moves: p.moves - 1 };
    });
    setSelected(null);
  }, []);

  useEffect(() => {
    if (gs.isComplete) setTimeout(() => Alert.alert('🎉 Tebrikler!', 'Bölüm ' + gs.levelId + ' tamamlandı!\nPuan: ' + gs.score, [{ text: 'Ana Sayfa', onPress: () => router.back() }]), 600);
    if (gs.isFailed) setTimeout(() => Alert.alert('😔 Hamlen Bitti!', 'Tekrar deneyebilirsin!', [
      { text: 'Tekrar', onPress: () => { setGs(generateGameState(level)); setHistory([]); } },
      { text: 'Ana Sayfa', onPress: () => router.back() },
    ]), 600);
  }, [gs.isComplete, gs.isFailed]);

  const selId = selected?.card?.id;

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* HEADER */}
      <View style={s.header}>
        <View style={s.coinBadge}>
          <MaterialIcons name="monetization-on" size={18} color={COLORS.tertiaryFixed} />
          <Text style={s.coinText}>{gs.coins}</Text>
          <MaterialIcons name="add-circle" size={14} color={COLORS.primary} />
        </View>
        <Text style={s.headerTitle}>BÖLÜM {gs.levelId}</Text>
        <TouchableOpacity style={s.settingsBtn}>
          <MaterialIcons name="settings" size={22} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* MOVES + DRAWN + DECK */}
        <View style={s.deckRow}>
          <View style={s.movesPanel}>
            <Text style={s.movesLabel}>HAMLELER</Text>
            <Text style={s.movesNum}>{gs.moves}</Text>
            <TouchableOpacity style={s.addBtn}>
              <Text style={s.addBtnText}>+ 20</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.drawnArea} onPress={handleDrawnTap} activeOpacity={0.8}>
            {gs.drawnCards.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialIcons name="swipe" size={22} color="rgba(255,255,255,0.15)" />
              </View>
            ) : (
              <View style={s.drawnStack}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => (
                  <View key={card.id} style={[s.drawnWrap, {
                    transform: [{ translateX: (i - (arr.length - 1)) * 12 }],
                    zIndex: i, opacity: i === arr.length - 1 ? 1 : 0.4 + i * 0.2,
                  }]}>
                    <FaceUpCard card={card} selected={i === arr.length - 1 && selId === card.id} />
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={drawCard} activeOpacity={0.8}>
            {gs.deck.length > 0 ? (
              <View>
                <FaceDownCard />
                <View style={s.deckBadge}><Text style={s.deckBadgeText}>{gs.deck.length}</Text></View>
              </View>
            ) : (
              <View style={s.emptyCard}>
                <MaterialIcons name="block" size={22} color="rgba(255,255,255,0.12)" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* FOUNDATION SLOTS */}
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
        <ToolBtn icon="bolt" label="İPUCU" badge={gs.hints} badgeColor={COLORS.fail} onPress={useHint} />
        <ToolBtn icon="undo" label="GERİ AL" badge="+" badgeColor={COLORS.success} onPress={useUndo} />
        <ToolBtn icon="auto-fix-normal" label="SİL" badge="+" badgeColor={COLORS.success} onPress={useDelete} />
        <ToolBtn icon="search" label="" small onPress={() => {}} />
      </View>

      <BottomNav activeTab="home" onTabPress={(t) => t === 'home' && router.back()} />
    </View>
  );
}

function ToolBtn({ icon, label, badge, badgeColor, onPress, small }) {
  return (
    <View style={s.toolWrap}>
      <TouchableOpacity style={[s.toolBtn, small && s.toolBtnSm]} onPress={onPress} activeOpacity={0.7}>
        <MaterialIcons name={icon} size={small ? 18 : 22} color="#fff" />
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
const CW = 56; const CH = 76;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 8, backgroundColor: 'rgba(0,0,0,0.06)',
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 14, color: '#fff' },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 17, color: '#fff', letterSpacing: 2 },
  settingsBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 200, gap: 14 },

  // Deck row
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  movesPanel: {
    backgroundColor: '#3C6E88', borderWidth: 2, borderColor: '#4A8099',
    borderRadius: 14, padding: 8, alignItems: 'center', width: 80, aspectRatio: 1,
  },
  movesLabel: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  movesNum: { fontFamily: FONTS.headlineBlack, fontSize: 28, color: '#fff', lineHeight: 32 },
  addBtn: { backgroundColor: COLORS.success, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 9999, marginTop: 2 },
  addBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff' },
  drawnArea: { flex: 1, height: CH + 8, justifyContent: 'center', alignItems: 'center' },
  drawnStack: { width: CW + 30, height: CH, justifyContent: 'center', alignItems: 'center' },
  drawnWrap: { position: 'absolute' },
  emptyCard: {
    width: CW, height: CH, borderRadius: 10, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.06)',
  },
  deckBadge: {
    position: 'absolute', bottom: 4, right: 4, backgroundColor: COLORS.fail,
    minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 4,
  },
  deckBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff' },

  // Cards
  faceDown: {
    width: CW, height: CH, borderRadius: 10, borderWidth: 2, borderColor: COLORS.cardBackBorder, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  innerFrame: { flex: 1, margin: 3, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  innerFrameInner: { width: '65%', height: '65%', borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  faceUp: {
    width: CW, height: CH, borderRadius: 10, borderWidth: 2, borderColor: COLORS.cardBorder,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 2.5, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 8 },
  catBorder: { borderColor: '#FFB074', borderWidth: 2.5 },
  emoji: { fontSize: 24, marginBottom: 2 },
  word: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#1e293b', textAlign: 'center', lineHeight: 9 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, position: 'absolute', top: 3, right: 3 },
  catBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: COLORS.primary },
  catName: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#1e293b', textAlign: 'center', lineHeight: 13 },

  // Foundation slots
  slotsRow: { flexDirection: 'row', gap: 4 },
  slotLocked: {
    aspectRatio: 0.72, borderRadius: 10, backgroundColor: 'rgba(60,110,136,0.2)',
    borderWidth: 2, borderColor: 'rgba(74,128,153,0.3)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  slotLockedText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },
  adBadge: { backgroundColor: COLORS.tagOrange, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  adText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  slotEmpty: {
    aspectRatio: 0.72, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  slotActive: {
    aspectRatio: 0.72, borderRadius: 10, backgroundColor: '#fff', borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', padding: 4, overflow: 'hidden',
  },
  slotTag: { flexDirection: 'row', alignItems: 'center', gap: 2, position: 'absolute', top: 3, left: 3, right: 3, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  slotTagText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  slotCatName: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#1e293b', textAlign: 'center', marginTop: 10, lineHeight: 12 },
  slotPreview: { position: 'absolute', bottom: 4, fontSize: 12 },

  // Tableau — TEK SATIR
  tableauRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-start' },
  colLocked: {
    aspectRatio: 4.5 / 6, borderRadius: 10, backgroundColor: 'rgba(60,110,136,0.2)',
    borderWidth: 2, borderColor: 'rgba(74,128,153,0.3)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  colEmpty: {
    aspectRatio: 4.5 / 6, borderRadius: 10, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.04)', borderStyle: 'dashed', backgroundColor: 'rgba(0,0,0,0.02)',
  },

  // Toolbar
  toolbar: {
    position: 'absolute', bottom: 94, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 14, paddingVertical: 6, zIndex: 40,
  },
  toolWrap: { alignItems: 'center', gap: 3 },
  toolBtn: {
    width: 50, height: 50, borderRadius: 14, backgroundColor: COLORS.buttonBlue,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  toolBtnSm: { width: 40, height: 40, borderRadius: 10 },
  toolBdg: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 3,
  },
  toolBdgText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff' },
  toolLabel: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 },
});
