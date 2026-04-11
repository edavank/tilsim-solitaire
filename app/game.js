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
const COL_COUNT = 5;
const COL_GAP = 5;
const CARD_W = Math.floor((SW - 20 - (COL_COUNT - 1) * COL_GAP) / COL_COUNT);
const CARD_H = Math.floor(CARD_W * 1.35);
const OVERLAP = -Math.floor(CARD_H * 0.72);

// ═══ FACE DOWN ═══
function FaceDownCard() {
  return (
    <LinearGradient
      colors={[COLORS.cardBackTop, COLORS.cardBackBottom]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[st.faceDown, { width: CARD_W, height: CARD_H }]}
    >
      <View style={st.innerFrame}><View style={st.innerFrameInner} /></View>
    </LinearGradient>
  );
}

// ═══ FACE UP ═══
function FaceUpCard({ card, selected, width, height }) {
  const w = width || CARD_W;
  const h = height || CARD_H;
  const isCat = card.type === 'category';
  return (
    <View style={[st.faceUp, { width: w, height: h }, selected && st.cardSelected, isCat && st.catCardBorder]}>
      {isCat ? (
        <>
          <View style={st.catBadge}><Text style={st.catBadgeText}>0/{card.totalWords}</Text></View>
          <MaterialIcons name="style" size={16} color={COLORS.cardBackTop} />
          <Text style={st.catName} numberOfLines={2}>{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: Math.max(16, w * 0.3), marginBottom: 1 }}>{card.emoji}</Text>
          <Text style={st.word} numberOfLines={2}>{card.word}</Text>
        </>
      )}
    </View>
  );
}

// ═══ FOUNDATION SLOT ═══
function FoundationSlot({ slot, onPress }) {
  const h = CARD_H * 0.85;
  if (slot.locked) {
    return (
      <View style={[st.slotBox, st.slotDashed, { height: h }]}>
        <Text style={st.lockedText}>KİLİDİ AÇ</Text>
        <MaterialIcons name="style" size={18} color="rgba(255,255,255,0.15)" />
        <TouchableOpacity style={st.adBadge}><Text style={st.adText}>▶ AD</Text></TouchableOpacity>
      </View>
    );
  }
  if (slot.category) {
    const clr = CATEGORY_COLORS[slot.category.categoryIndex % CATEGORY_COLORS.length];
    const p = slot.placedCards.length;
    const t = slot.category.totalWords;
    return (
      <TouchableOpacity style={[st.slotBox, { height: h, borderColor: clr, borderStyle: 'solid', backgroundColor: '#fff' }]} onPress={onPress} activeOpacity={0.7}>
        <View style={[st.slotTag, { backgroundColor: clr }]}><Text style={st.slotTagText}>{p}/{t}</Text></View>
        <MaterialIcons name="style" size={14} color={clr} style={{ marginTop: 8 }} />
        <Text style={[st.word, { fontSize: 7, marginTop: 2 }]} numberOfLines={2}>{slot.category.word}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[st.slotBox, st.slotDashed, { height: h }]} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name="style" size={20} color="rgba(255,255,255,0.12)" />
      <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 7, color: 'rgba(255,255,255,0.15)' }}>0/6</Text>
    </TouchableOpacity>
  );
}

// ═══ COLUMN ═══
function TableauColumn({ column, colIndex, selectedId, onCardTap }) {
  if (column.locked) {
    return (
      <View style={[st.slotBox, st.slotDashed, { height: CARD_H }]}>
        <Text style={st.lockedText}>KİLİDİ AÇ</Text>
        <MaterialIcons name="add" size={14} color="rgba(255,255,255,0.2)" />
        <TouchableOpacity style={st.adBadge}><Text style={st.adText}>▶ AD</Text></TouchableOpacity>
      </View>
    );
  }
  if (column.cards.length === 0) return <View style={[st.slotBox, st.slotDashed, { height: CARD_H, borderColor: 'rgba(255,255,255,0.04)' }]} />;

  return (
    <View>
      {column.cards.map((card, ci) => {
        const isLast = ci === column.cards.length - 1;
        return (
          <View key={card.id} style={{ marginTop: ci === 0 ? 0 : OVERLAP, zIndex: ci }}>
            {card.faceUp ? (
              <TouchableOpacity activeOpacity={0.7} onPress={() => { if (isLast) onCardTap(card, 'column', colIndex); }}>
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
  const [feedback, setFeedback] = useState('');
  const shakeAnims = useRef(Array.from({ length: 10 }, () => new Animated.Value(0))).current;

  // Feedback timeout
  useEffect(() => {
    if (feedback) { const t = setTimeout(() => setFeedback(''), 1500); return () => clearTimeout(t); }
  }, [feedback]);

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

  // ─── DRAW ───
  const drawCard = useCallback(() => {
    setGs((p) => {
      if (p.deck.length === 0) { setFeedback('Deste boş!'); return p; }
      const d = [...p.deck]; const card = { ...d.pop(), faceUp: true };
      setFeedback(card.type === 'category' ? '🃏 ' + card.word + ' çekildi!' : '🎴 ' + card.word + ' çekildi!');
      return { ...p, deck: d, drawnCards: [...p.drawnCards, card] };
    });
    setSelected(null);
  }, []);

  // ─── SELECT ───
  const handleCardTap = useCallback((card, source, sourceIndex) => {
    setSelected((prev) => {
      if (prev && prev.card.id === card.id) {
        setFeedback('');
        return null;
      }
      setFeedback('✋ ' + card.word + ' seçildi → Bir slot\'a dokun');
      return { card, source, sourceIndex };
    });
  }, []);

  // ─── DRAWN TAP ───
  const handleDrawnTap = useCallback(() => {
    if (gs.drawnCards.length === 0) { setFeedback('Önce desteden kart çek!'); return; }
    handleCardTap(gs.drawnCards[gs.drawnCards.length - 1], 'drawn', null);
  }, [gs.drawnCards, handleCardTap]);

  // ─── REMOVE FROM SOURCE ───
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

  // ─── SLOT TAP ───
  const handleSlotTap = useCallback((slotIndex) => {
    if (!selected) { setFeedback('Önce bir kart seç!'); return; }
    const { card, source, sourceIndex } = selected;
    if (gs.slots[slotIndex].locked) { setFeedback('🔒 Bu slot kilitli!'); setSelected(null); return; }

    setGs((prev) => {
      const newSlots = prev.slots.map((sl) => ({ ...sl, placedCards: [...sl.placedCards] }));
      const target = newSlots[slotIndex];

      // Boş slot + kategori kartı
      if (!target.category && card.type === 'category') {
        target.category = card;
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        setHistory((h) => [...h, prev]);
        setFeedback('✅ ' + card.word + ' kategorisi açıldı!');
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5, isFailed: prev.moves - 1 <= 0 };
      }

      // Boş slot + kelime kartı
      if (!target.category && card.type === 'word') {
        setFeedback('⚠️ Önce bir kategori kartı yerleştir!');
        return prev;
      }

      // Aktif slot + kategori kartı
      if (target.category && card.type === 'category') {
        setFeedback('⚠️ Bu slotta zaten kategori var!');
        return prev;
      }

      // Aktif slot + kelime kartı
      if (target.category && card.type === 'word') {
        if (card.categoryIndex !== target.category.categoryIndex) {
          setShakeSlot(slotIndex); Vibration.vibrate(100);
          setFeedback('❌ Yanlış kategori! (-1 hamle)');
          return { ...prev, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
        }
        target.placedCards.push(card);
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        let done = true;
        for (const sl of newSlots) if (sl.category && sl.placedCards.length < sl.category.totalWords) done = false;
        const catsPlaced = newSlots.filter((sl) => sl.category).length;
        const isComplete = done && catsPlaced >= level.categories.length;
        setHistory((h) => [...h, prev]);
        setFeedback('✅ ' + card.word + ' doğru! (+10 puan)');
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 10, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
    setSelected(null);
  }, [selected, gs.slots, level.categories.length]);

  // ─── UNDO ───
  const useUndo = useCallback(() => {
    if (history.length === 0) { setFeedback('Geri alınacak hamle yok!'); return; }
    setGs(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); setSelected(null);
    setFeedback('↩ Hamle geri alındı');
  }, [history]);

  // ─── DELETE ───
  const useDelete = useCallback(() => {
    if (gs.drawnCards.length === 0) { setFeedback('Silinecek kart yok!'); return; }
    const deleted = gs.drawnCards[gs.drawnCards.length - 1];
    setGs((p) => ({ ...p, drawnCards: p.drawnCards.slice(0, -1), moves: p.moves - 1 }));
    setSelected(null);
    setFeedback('🗑️ ' + deleted.word + ' silindi (-1 hamle)');
  }, [gs.drawnCards]);

  // ─── GAME OVER ───
  useEffect(() => {
    if (gs.isComplete) setTimeout(() => Alert.alert('🎉 Tebrikler!', 'Bölüm ' + gs.levelId + ' tamamlandı!\nPuan: ' + gs.score, [{ text: 'Ana Sayfa', onPress: () => router.back() }]), 600);
    if (gs.isFailed) setTimeout(() => Alert.alert('😔 Hamlen Bitti!', 'Tekrar deneyebilirsin!', [
      { text: 'Tekrar', onPress: () => { setGs(generateGameState(level)); setHistory([]); setSelected(null); } },
      { text: 'Ana Sayfa', onPress: () => router.back() },
    ]), 600);
  }, [gs.isComplete, gs.isFailed]);

  const selId = selected?.card?.id;
  const DCW = Math.floor(CARD_W * 1.1);
  const DCH = Math.floor(CARD_H * 1.1);

  return (
    <View style={st.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* HEADER */}
      <View style={st.header}>
        <View style={st.coinBadge}>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
          <Text style={st.coinText}>{gs.coins}</Text>
        </View>
        <Text style={st.headerTitle}>BÖLÜM {gs.levelId}</Text>
        <TouchableOpacity style={st.settingsBtn} onPress={() => router.back()}>
          <MaterialIcons name="settings" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* FEEDBACK BAR */}
      {!!feedback && (
        <View style={st.feedbackBar}>
          <Text style={st.feedbackText}>{feedback}</Text>
        </View>
      )}

      {/* SCROLLABLE GAME AREA */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HAMLELER + ÇEKİLEN + DESTE */}
        <View style={st.deckRow}>
          <View style={st.movesPanel}>
            <Text style={st.movesLabel}>HAMLE</Text>
            <Text style={st.movesNum}>{gs.moves}</Text>
            <TouchableOpacity style={st.addBtn}><Text style={st.addBtnText}>+20 ▶</Text></TouchableOpacity>
          </View>

          <TouchableOpacity style={st.drawnArea} onPress={handleDrawnTap} activeOpacity={0.7}>
            {gs.drawnCards.length === 0 ? (
              <View style={[st.emptyCard, { width: DCW, height: DCH }]}>
                <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Boş</Text>
              </View>
            ) : (
              <View style={{ width: DCW + 28, height: DCH, justifyContent: 'center', alignItems: 'center' }}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => (
                  <View key={card.id} style={{
                    position: 'absolute',
                    transform: [{ translateX: (i - (arr.length - 1)) * 14 }],
                    zIndex: i, opacity: i === arr.length - 1 ? 1 : 0.35 + i * 0.2,
                  }}>
                    <FaceUpCard card={card} selected={i === arr.length - 1 && selId === card.id} width={DCW} height={DCH} />
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={drawCard} activeOpacity={0.7}>
            {gs.deck.length > 0 ? (
              <View>
                <LinearGradient colors={[COLORS.cardBackTop, COLORS.cardBackBottom]} style={[st.faceDown, { width: DCW, height: DCH }]}>
                  <View style={st.innerFrame}><View style={st.innerFrameInner} /></View>
                </LinearGradient>
                <View style={st.deckBadge}><Text style={st.deckBadgeText}>{gs.deck.length}</Text></View>
              </View>
            ) : (
              <View style={[st.emptyCard, { width: DCW, height: DCH }]}>
                <MaterialIcons name="block" size={18} color="rgba(255,255,255,0.12)" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* FOUNDATION */}
        <View style={st.slotsRow}>
          {gs.slots.map((slot, i) => (
            <Animated.View key={i} style={{ flex: 1, transform: [{ translateX: shakeAnims[i] || 0 }] }}>
              <FoundationSlot slot={slot} onPress={() => handleSlotTap(i)} />
            </Animated.View>
          ))}
        </View>

        {/* TABLEAU */}
        <View style={st.tableauRow}>
          {gs.columns.map((col, i) => (
            <View key={i} style={{ flex: 1 }}>
              <TableauColumn column={col} colIndex={i} selectedId={selId} onCardTap={handleCardTap} />
            </View>
          ))}
        </View>

        {/* Spacer for toolbar */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* TOOLBAR — ScrollView dışında, sabit */}
      <View style={st.toolbar} pointerEvents="box-none">
        <ToolBtn icon="bolt" label="İPUCU" badge={gs.hints} badgeColor={COLORS.fail} onPress={() => { setGs(p => ({ ...p, hints: Math.max(0, p.hints - 1) })); setFeedback('💡 İpucu kullanıldı'); }} />
        <ToolBtn icon="undo" label="GERİ AL" badge="+" badgeColor={COLORS.success} onPress={useUndo} />
        <ToolBtn icon="auto-fix-normal" label="SİL" badge="+" badgeColor={COLORS.success} onPress={useDelete} />
        <ToolBtn icon="search" label="ARA" small onPress={() => setFeedback('🔍 Arama yakında!')} />
      </View>

      <BottomNav activeTab="home" onTabPress={(t) => { if (t === 'home') router.back(); }} />
    </View>
  );
}

function ToolBtn({ icon, label, badge, badgeColor, onPress, small }) {
  return (
    <View style={st.toolWrap}>
      <TouchableOpacity style={[st.toolBtn, small && st.toolBtnSm]} onPress={onPress} activeOpacity={0.6}>
        <MaterialIcons name={icon} size={small ? 16 : 20} color="#fff" />
        {badge !== undefined && (
          <View style={[st.toolBdg, { backgroundColor: badgeColor }]}><Text style={st.toolBdgText}>{badge}</Text></View>
        )}
      </TouchableOpacity>
      {!!label && <Text style={st.toolLabel}>{label}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 52, paddingBottom: 6, backgroundColor: COLORS.headerBg, zIndex: 50,
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 9999, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 13, color: COLORS.onSurface },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff', letterSpacing: 2 },
  settingsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },

  // Feedback
  feedbackBar: {
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 6, paddingHorizontal: 16, zIndex: 50,
  },
  feedbackText: { fontFamily: FONTS.headline, fontSize: 12, color: '#fff', textAlign: 'center' },

  scrollContent: { paddingHorizontal: 10, paddingTop: 10, gap: 10 },

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
  drawnArea: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 90 },
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
  cardSelected: {
    borderColor: COLORS.primary, borderWidth: 2.5,
    shadowColor: COLORS.primary, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8,
    transform: [{ scale: 1.03 }],
  },
  catCardBorder: { borderColor: COLORS.cardBackBorder, borderWidth: 2 },
  word: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#1e293b', textAlign: 'center', lineHeight: 9 },
  catBadge: { position: 'absolute', top: 2, right: 3 },
  catBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.cardBackTop },
  catName: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#1e293b', textAlign: 'center', lineHeight: 10, marginTop: 2 },

  // Foundation
  slotsRow: { flexDirection: 'row', gap: 3 },
  slotBox: {
    borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  slotDashed: {
    borderColor: COLORS.panelBorder, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  lockedText: { fontFamily: FONTS.headlineBlack, fontSize: 6, color: 'rgba(255,255,255,0.3)' },
  adBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  slotTag: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 2, alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  slotTagText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },

  // Tableau
  tableauRow: { flexDirection: 'row', gap: COL_GAP, alignItems: 'flex-start' },

  // Toolbar
  toolbar: {
    position: 'absolute', bottom: 94, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 12,
    paddingVertical: 6, zIndex: 100,
  },
  toolWrap: { alignItems: 'center', gap: 3 },
  toolBtn: {
    width: 46, height: 46, borderRadius: 13, backgroundColor: COLORS.buttonBlue,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5,
  },
  toolBtnSm: { width: 36, height: 36, borderRadius: 10 },
  toolBdg: {
    position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 2,
  },
  toolBdgText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  toolLabel: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
});
