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

// ════════════════════════════════════════
// FACE DOWN CARD
// ════════════════════════════════════════
function FaceDownCard({ style }) {
  return (
    <LinearGradient
      colors={[COLORS.cardBackTop, COLORS.cardBackBottom]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[s.faceDown, style]}
    >
      <View style={s.innerFrame}>
        <View style={s.innerFrameInner} />
      </View>
    </LinearGradient>
  );
}

// ════════════════════════════════════════
// FACE UP CARD — word or category
// ════════════════════════════════════════
function FaceUpCard({ card, selected, style }) {
  const isCategory = card.type === 'category';
  return (
    <View style={[
      s.faceUp, style,
      selected && s.cardSelected,
      isCategory && s.categoryCardBorder,
    ]}>
      {isCategory ? (
        <>
          <View style={s.catCardBadge}>
            <Text style={s.catCardBadgeText}>0/{card.totalWords}</Text>
            <Text style={{ fontSize: 10 }}>🃏</Text>
          </View>
          <Text style={s.catCardName} numberOfLines={2}>{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={s.cardEmoji}>{card.emoji}</Text>
          <Text style={s.cardWord} numberOfLines={2}>{card.word}</Text>
        </>
      )}
    </View>
  );
}

// ════════════════════════════════════════
// FOUNDATION SLOT (üstteki hedef slotlar)
// ════════════════════════════════════════
function FoundationSlot({ slot, index, onPress, colorIndex }) {
  if (slot.locked) {
    return (
      <View style={s.slotContainer}>
        <View style={s.slotLocked}>
          <Text style={s.slotLockedTitle}>Kilidi Aç</Text>
          <MaterialIcons name="style" size={28} color="rgba(255,255,255,0.25)" />
          <TouchableOpacity style={s.slotAdBadge}>
            <Text style={s.slotAdText}>AD</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (slot.category) {
    // Kategori yerleştirilmiş — kartlar kabul ediyor
    const color = CATEGORY_COLORS[slot.category.categoryIndex % CATEGORY_COLORS.length];
    const placed = slot.placedCards.length;
    const total = slot.category.totalWords;
    return (
      <TouchableOpacity style={s.slotContainer} onPress={() => onPress(index)} activeOpacity={0.8}>
        <View style={[s.slotActive, { borderColor: color }]}>
          <View style={[s.slotHeader, { backgroundColor: color }]}>
            <Text style={s.slotHeaderText} numberOfLines={1}>
              {placed}/{total}
            </Text>
            <Text style={{ fontSize: 8 }}>🃏</Text>
          </View>
          <Text style={s.slotCatName} numberOfLines={2}>{slot.category.word}</Text>
          {placed > 0 && (
            <View style={s.slotPlacedPreview}>
              <Text style={{ fontSize: 10 }}>{slot.placedCards[slot.placedCards.length - 1].emoji}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Boş slot — joker şapka ikonu
  return (
    <TouchableOpacity style={s.slotContainer} onPress={() => onPress(index)} activeOpacity={0.8}>
      <View style={s.slotEmpty}>
        <MaterialIcons name="style" size={28} color="rgba(255,255,255,0.2)" />
      </View>
    </TouchableOpacity>
  );
}

// ════════════════════════════════════════
// TABLEAU COLUMN
// ════════════════════════════════════════
function TableauColumn({ column, colIndex, selectedCardId, onCardTap }) {
  if (column.locked) {
    return (
      <View style={s.colLocked}>
        <Text style={s.colLockedTitle}>Kilidi Aç</Text>
        <MaterialIcons name="add" size={20} color="rgba(255,255,255,0.3)" />
        <TouchableOpacity style={s.slotAdBadge}>
          <Text style={s.slotAdText}>AD</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (column.cards.length === 0) {
    return <View style={s.colEmpty} />;
  }

  return (
    <View style={s.colStack}>
      {column.cards.map((card, ci) => {
        const isLast = ci === column.cards.length - 1;
        return (
          <View key={card.id} style={[s.colCardWrap, { marginTop: ci === 0 ? 0 : -46 }]}>
            {card.faceUp ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => isLast && onCardTap(card, 'column', colIndex)}
                style={{ zIndex: 10 }}
              >
                <FaceUpCard card={card} selected={selectedCardId === card.id} />
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

// ════════════════════════════════════════
// GAME SCREEN
// ════════════════════════════════════════
export default function GameScreen() {
  const level = LEVELS.find((l) => l.id === 23) || LEVELS[0];
  const [gs, setGs] = useState(() => generateGameState(level));
  const [selected, setSelected] = useState(null); // { card, source, sourceIndex }
  const [shakeSlot, setShakeSlot] = useState(null);
  const [history, setHistory] = useState([]);

  // Shake animation per slot
  const shakeAnims = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(0))
  ).current;

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

  // ─── DRAW FROM DECK ───
  const drawCard = useCallback(() => {
    setGs((p) => {
      if (p.deck.length === 0) return p;
      const d = [...p.deck];
      const card = { ...d.pop(), faceUp: true };
      return { ...p, deck: d, drawnCards: [...p.drawnCards, card] };
    });
    setSelected(null);
  }, []);

  // ─── SELECT CARD ───
  const handleCardTap = useCallback((card, source, sourceIndex) => {
    setSelected((prev) => {
      if (prev && prev.card.id === card.id) return null; // deselect
      return { card, source, sourceIndex };
    });
  }, []);

  // ─── TAP DRAWN CARD ───
  const handleDrawnTap = useCallback(() => {
    if (gs.drawnCards.length === 0) return;
    const top = gs.drawnCards[gs.drawnCards.length - 1];
    handleCardTap(top, 'drawn', null);
  }, [gs.drawnCards, handleCardTap]);

  // ─── REMOVE CARD FROM SOURCE ───
  function removeFromSource(state, source, sourceIndex, cardId) {
    const ns = { ...state };
    if (source === 'drawn') {
      ns.drawnCards = state.drawnCards.filter((c) => c.id !== cardId);
    } else if (source === 'column') {
      ns.columns = state.columns.map((col, i) => {
        if (i !== sourceIndex) return col;
        const newCards = col.cards.filter((c) => c.id !== cardId);
        // Flip new last card
        if (newCards.length > 0 && !newCards[newCards.length - 1].faceUp) {
          newCards[newCards.length - 1] = { ...newCards[newCards.length - 1], faceUp: true };
        }
        return { ...col, cards: newCards };
      });
    }
    return ns;
  }

  // ─── TAP FOUNDATION SLOT ───
  const handleSlotTap = useCallback((slotIndex) => {
    if (!selected) return;
    const { card, source, sourceIndex } = selected;
    const slot = gs.slots[slotIndex];

    // Kilitli slot
    if (slot.locked) {
      setSelected(null);
      return;
    }

    setGs((prev) => {
      const newSlots = prev.slots.map((s) => ({ ...s, placedCards: [...s.placedCards] }));
      const targetSlot = newSlots[slotIndex];

      // CASE 1: Boş slot + kategori kartı → kategoriyi yerleştir
      if (!targetSlot.category && card.type === 'category') {
        targetSlot.category = card;
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        setHistory((h) => [...h, prev]);
        return {
          ...ns,
          slots: newSlots,
          moves: prev.moves - 1,
          score: prev.score + 5,
          isFailed: prev.moves - 1 <= 0,
        };
      }

      // CASE 2: Aktif kategori + kelime kartı → doğru mu kontrol et
      if (targetSlot.category && card.type === 'word') {
        const isCorrect = card.categoryIndex === targetSlot.category.categoryIndex;

        if (!isCorrect) {
          // YANLIŞ — shake + hamle kaybı
          setShakeSlot(slotIndex);
          Vibration.vibrate(100);
          setSelected(null);
          return { ...prev, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
        }

        // DOĞRU — kartı yerleştir
        targetSlot.placedCards.push(card);
        const ns = removeFromSource(prev, source, sourceIndex, card.id);

        // Tamamlanma kontrolü
        const totalPlaced = newSlots.reduce((sum, sl) => sum + sl.placedCards.length, 0);
        const totalWords = prev.slots.reduce((sum, sl) => {
          return sum + (sl.category ? sl.category.totalWords : 0);
        }, 0) + (card.type === 'word' ? 0 : 0);
        // Daha doğru: tüm kelime kartları yerleşti mi?
        let allWordsPlaced = true;
        for (const sl of newSlots) {
          if (sl.category && sl.placedCards.length < sl.category.totalWords) {
            allWordsPlaced = false;
          }
        }
        // Ayrıca tüm kategoriler yerleştirilmiş olmalı
        const catsPlaced = newSlots.filter((sl) => sl.category).length;
        const isComplete = allWordsPlaced && catsPlaced >= level.categories.length;

        setHistory((h) => [...h, prev]);
        return {
          ...ns,
          slots: newSlots,
          moves: prev.moves - 1,
          score: prev.score + 10,
          isComplete,
          isFailed: prev.moves - 1 <= 0 && !isComplete,
        };
      }

      // Boş slot'a kelime kartı koymaya çalışıyor — yapamaz
      // Ya da dolu slot'a kategori kartı — yapamaz
      return prev;
    });

    setSelected(null);
  }, [selected, gs.slots, level.categories.length]);

  // ─── HINT ───
  const useHint = useCallback(() => {
    if (gs.hints <= 0) return;
    // Basit hint: eğer seçili bir kart varsa, doğru slot'u göster
    // TODO: daha akıllı hint sistemi
    setGs((p) => ({ ...p, hints: p.hints - 1 }));
  }, [gs.hints]);

  // ─── UNDO ───
  const useUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGs(prev);
    setSelected(null);
  }, [history]);

  // ─── DELETE TOP DRAWN ───
  const useDelete = useCallback(() => {
    setGs((p) => {
      if (p.drawnCards.length === 0) return p;
      return {
        ...p,
        drawnCards: p.drawnCards.slice(0, -1),
        moves: p.moves - 1,
      };
    });
    setSelected(null);
  }, []);

  // ─── GAME OVER / WIN ───
  useEffect(() => {
    if (gs.isComplete) {
      setTimeout(() => Alert.alert('🎉 Tebrikler!', `Bölüm ${gs.levelId} tamamlandı!\nPuan: ${gs.score}`, [
        { text: 'Ana Sayfa', onPress: () => router.back() },
      ]), 600);
    }
    if (gs.isFailed) {
      setTimeout(() => Alert.alert('😔 Hamlen Bitti!', 'Tekrar deneyebilirsin!', [
        { text: 'Tekrar Oyna', onPress: () => { setGs(generateGameState(level)); setHistory([]); } },
        { text: 'Ana Sayfa', onPress: () => router.back() },
      ]), 600);
    }
  }, [gs.isComplete, gs.isFailed]);

  // ─── LAYOUT ───
  const row1 = gs.columns.slice(0, level.tableauCols);
  const row2 = gs.columns.slice(level.tableauCols);
  const selectedId = selected?.card?.id;

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientBottom]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* HEADER */}
      <View style={s.header}>
        <View style={s.coinBadge}>
          <MaterialIcons name="monetization-on" size={18} color={COLORS.tertiaryFixed} />
          <Text style={s.coinText}>{gs.coins}</Text>
          <MaterialIcons name="add-circle" size={14} color={COLORS.primary} />
        </View>
        <Text style={s.headerTitle}>Bölüm {gs.levelId}</Text>
        <TouchableOpacity style={s.settingsBtn}>
          <MaterialIcons name="settings" size={22} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* MOVES + DRAWN + DECK */}
        <View style={s.deckRow}>
          {/* Moves panel */}
          <View style={s.movesPanel}>
            <Text style={s.movesLabel}>Hamleler</Text>
            <Text style={s.movesNum}>{gs.moves}</Text>
            <TouchableOpacity style={s.addMovesBtn}>
              <MaterialIcons name="add" size={10} color="#fff" />
              <Text style={s.addMovesText}>20</Text>
            </TouchableOpacity>
          </View>

          {/* Drawn cards */}
          <TouchableOpacity style={s.drawnArea} onPress={handleDrawnTap} activeOpacity={0.8}>
            {gs.drawnCards.length === 0 ? (
              <View style={s.emptySlot}>
                <MaterialIcons name="layers-clear" size={20} color="rgba(255,255,255,0.12)" />
              </View>
            ) : (
              <View style={s.drawnStack}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => {
                  const isTop = i === arr.length - 1;
                  return (
                    <View key={card.id} style={[s.drawnCardWrap, {
                      transform: [{ translateX: (i - (arr.length - 1)) * 12 }],
                      zIndex: i,
                      opacity: isTop ? 1 : 0.4 + i * 0.2,
                    }]}>
                      <FaceUpCard card={card} selected={isTop && selectedId === card.id} />
                    </View>
                  );
                })}
              </View>
            )}
          </TouchableOpacity>

          {/* Deck */}
          <TouchableOpacity onPress={drawCard} activeOpacity={0.8}>
            {gs.deck.length > 0 ? (
              <View>
                <FaceDownCard />
                <View style={s.deckBadge}>
                  <Text style={s.deckBadgeText}>{gs.deck.length}</Text>
                </View>
              </View>
            ) : (
              <View style={s.emptySlot}>
                <MaterialIcons name="block" size={20} color="rgba(255,255,255,0.12)" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* FOUNDATION SLOTS */}
        <View style={s.slotsRow}>
          {gs.slots.map((slot, i) => (
            <Animated.View key={i} style={{ flex: 1, transform: [{ translateX: shakeAnims[i] || 0 }] }}>
              <FoundationSlot slot={slot} index={i} onPress={handleSlotTap} />
            </Animated.View>
          ))}
        </View>

        {/* TABLEAU ROW 1 */}
        <View style={s.tableauRow}>
          {row1.map((col, i) => (
            <View key={`r1-${i}`} style={s.tableauColWrap}>
              <TableauColumn column={col} colIndex={i} selectedCardId={selectedId} onCardTap={handleCardTap} />
            </View>
          ))}
        </View>

        {/* TABLEAU ROW 2 */}
        {row2.length > 0 && (
          <View style={[s.tableauRow, { marginTop: 10 }]}>
            {row2.map((col, i) => (
              <View key={`r2-${i}`} style={s.tableauColWrap}>
                <TableauColumn column={col} colIndex={level.tableauCols + i} selectedCardId={selectedId} onCardTap={handleCardTap} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* TOOLBAR */}
      <View style={s.toolbar}>
        <ToolBtn icon="bolt" label="İpucu" badge={gs.hints} badgeColor={COLORS.fail} onPress={useHint} />
        <ToolBtn icon="undo" label="Geri Al" badge="+" badgeColor={COLORS.success} onPress={useUndo} />
        <ToolBtn icon="auto-fix-normal" label="Sil" badge="+" badgeColor={COLORS.success} onPress={useDelete} />
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
          <View style={[s.toolBadge, { backgroundColor: badgeColor }]}>
            <Text style={s.toolBadgeText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
      {!!label && <Text style={s.toolLabel}>{label}</Text>}
    </View>
  );
}

// ════════════════════════════════════════
// STYLES
// ════════════════════════════════════════
const CW = 56;
const CH = 76;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 14, color: '#fff' },
  headerTitle: {
    fontFamily: FONTS.headlineBlack, fontSize: 17, color: '#fff',
    textTransform: 'uppercase', letterSpacing: 2,
  },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 190, gap: 14 },

  // Deck row
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  movesPanel: {
    backgroundColor: '#3C6E88', borderWidth: 2, borderColor: '#4A8099',
    borderRadius: 14, padding: 8, alignItems: 'center', justifyContent: 'center',
    width: 80, aspectRatio: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  movesLabel: {
    fontFamily: FONTS.headlineBlack, fontSize: 8, color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  movesNum: { fontFamily: FONTS.headlineBlack, fontSize: 28, color: '#fff', lineHeight: 32 },
  addMovesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: COLORS.success, paddingHorizontal: 10, paddingVertical: 2,
    borderRadius: 9999, marginTop: 2,
  },
  addMovesText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff' },

  // Drawn
  drawnArea: { flex: 1, height: CH + 8, justifyContent: 'center', alignItems: 'center' },
  drawnStack: { width: CW + 30, height: CH, justifyContent: 'center', alignItems: 'center' },
  drawnCardWrap: { position: 'absolute' },
  emptySlot: {
    width: CW, height: CH, borderRadius: 10, borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.08)',
  },

  // Deck badge
  deckBadge: {
    position: 'absolute', bottom: 4, right: 4,
    backgroundColor: COLORS.fail, minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 4,
  },
  deckBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff' },

  // Face down
  faceDown: {
    width: CW, height: CH, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.cardBackBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
    overflow: 'hidden',
  },
  innerFrame: {
    flex: 1, margin: 3, borderRadius: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  innerFrameInner: {
    width: '65%', height: '65%', borderRadius: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },

  // Face up
  faceUp: {
    width: CW, height: CH, borderRadius: 10,
    borderWidth: 2, borderColor: COLORS.cardBorder, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  cardSelected: {
    borderColor: COLORS.primary, borderWidth: 2.5,
    shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  categoryCardBorder: {
    borderColor: '#FFB074', borderWidth: 2.5,
  },
  cardEmoji: { fontSize: 24, marginBottom: 2 },
  cardWord: {
    fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#1e293b',
    textAlign: 'center', lineHeight: 9,
  },

  // Category card content
  catCardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    position: 'absolute', top: 4, right: 4,
  },
  catCardBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: COLORS.primary },
  catCardName: {
    fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#1e293b',
    textAlign: 'center', lineHeight: 13,
  },

  // Foundation slots
  slotsRow: { flexDirection: 'row', gap: 4 },
  slotContainer: { flex: 1 },
  slotLocked: {
    width: '100%', aspectRatio: 0.7, borderRadius: 10,
    backgroundColor: 'rgba(60,110,136,0.25)', borderWidth: 2,
    borderColor: 'rgba(74,128,153,0.4)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  slotLockedTitle: {
    fontFamily: FONTS.headlineBlack, fontSize: 8, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  slotAdBadge: {
    backgroundColor: COLORS.tagOrange, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  slotAdText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  slotEmpty: {
    width: '100%', aspectRatio: 0.7, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)', borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  slotActive: {
    width: '100%', aspectRatio: 0.7, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', padding: 4, overflow: 'hidden',
  },
  slotHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    position: 'absolute', top: 4, left: 4, right: 4,
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
  },
  slotHeaderText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  slotCatName: {
    fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#1e293b',
    textAlign: 'center', marginTop: 12, lineHeight: 12,
  },
  slotPlacedPreview: {
    position: 'absolute', bottom: 4,
  },

  // Tableau
  tableauRow: { flexDirection: 'row', gap: 4, alignItems: 'flex-start' },
  tableauColWrap: { flex: 1 },
  colLocked: {
    width: '100%', aspectRatio: 4.5 / 6, borderRadius: 10,
    backgroundColor: 'rgba(60,110,136,0.25)', borderWidth: 2,
    borderColor: 'rgba(74,128,153,0.4)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  colLockedTitle: {
    fontFamily: FONTS.headlineBlack, fontSize: 8, color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  colEmpty: {
    width: '100%', aspectRatio: 4.5 / 6, borderRadius: 10,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  colStack: { alignItems: 'center' },
  colCardWrap: { width: '100%', alignItems: 'center' },

  // Toolbar
  toolbar: {
    position: 'absolute', bottom: 94, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingVertical: 6, zIndex: 40,
  },
  toolWrap: { alignItems: 'center', gap: 3 },
  toolBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: COLORS.buttonBlue, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  toolBtnSm: { width: 38, height: 38, borderRadius: 10 },
  toolBadge: {
    position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 3,
  },
  toolBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff' },
  toolLabel: {
    fontFamily: FONTS.headlineBlack, fontSize: 8, color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase', letterSpacing: 1,
  },
});
