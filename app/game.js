import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Vibration, Image, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, SIZES, CATEGORY_COLORS } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { LEVELS, generateGameState } from '../src/data/levels';
import { loadProgress, updateProgress, clearSavedGame, saveSavedGame } from '../src/utils/storage';
import { playHaptic } from '../src/utils/sounds';
import { showRewarded, showInterstitial } from '../src/utils/ads';

const { width: SW } = Dimensions.get('window');
const COL_COUNT = 5;
const COL_GAP = 5;
const CARD_W = Math.floor((SW - 20 - (COL_COUNT - 1) * COL_GAP) / COL_COUNT);
const CARD_H = Math.floor(CARD_W * 1.35);
const OVERLAP = -Math.floor(CARD_H * 0.72);
const OWL_HAPPY = require('../assets/bilge-happy.png');

/* ── Sparkle Particle ── */
function SparkleEffect({ visible, x, y }) {
  const particles = useRef([...Array(12)].map(() => ({
    anim: new Animated.Value(0),
    angle: Math.random() * Math.PI * 2,
    dist: 30 + Math.random() * 40,
    color: ['#FFD166', '#FF8AA7', '#5DBE6E', '#00D2FD', '#FF9F4A'][Math.floor(Math.random() * 5)],
    size: 4 + Math.random() * 6,
  }))).current;

  useEffect(() => {
    if (visible) {
      particles.forEach((p) => {
        p.anim.setValue(0);
        Animated.timing(p.anim, { toValue: 1, duration: 500 + Math.random() * 200, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      });
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <View style={{ position: 'absolute', left: x - 50, top: y - 50, width: 100, height: 100, zIndex: 9999 }} pointerEvents="none">
      {particles.map((p, i) => {
        const tx = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(p.angle) * p.dist] });
        const ty = p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(p.angle) * p.dist] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
        const scale = p.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1.2, 0.3] });
        return (
          <Animated.View key={i} style={{
            position: 'absolute', left: 50, top: 50,
            width: p.size, height: p.size, borderRadius: p.size / 2,
            backgroundColor: p.color, opacity,
            transform: [{ translateX: tx }, { translateY: ty }, { scale }],
          }} />
        );
      })}
    </View>
  );
}

/* ── Animated Card Wrapper (flip) ── */
function AnimatedCard({ children, flipTrigger }) {
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (flipTrigger) {
      flipAnim.setValue(0);
      Animated.timing(flipAnim, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    }
  }, [flipTrigger]);

  const rotateY = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['90deg', '90deg', '0deg'] });
  const scale = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.95, 1.05, 1] });

  return (
    <Animated.View style={{ transform: [{ perspective: 800 }, { rotateY }, { scale }] }}>
      {children}
    </Animated.View>
  );
}

/* ── Pop-in animation ── */
function PopInView({ children, trigger }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    if (trigger) {
      scaleAnim.setValue(0.6);
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    }
  }, [trigger]);
  return <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{children}</Animated.View>;
}

/* ── Card Components ── */
function FaceDownCard() {
  return (
    <LinearGradient colors={[COLORS.cardBackTop, COLORS.cardBackBottom]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[st.faceDown, { width: CARD_W, height: CARD_H }]}>
      <View style={st.innerFrame}><View style={st.innerFrameInner} /></View>
    </LinearGradient>
  );
}

function FaceUpCard({ card, selected, w, h, hinted }) {
  const cw = w || CARD_W; const ch = h || CARD_H;
  const isCat = card.type === 'category';
  return (
    <View style={[st.faceUp, { width: cw, height: ch }, selected && st.cardSelected, isCat && st.catCardBorder, hinted && st.cardHinted]}>
      {isCat ? (
        <>
          <View style={st.catBadge}><Text style={st.catBadgeText}>0/{card.totalWords}</Text></View>
          <MaterialIcons name="style" size={16} color={COLORS.cardBackTop} />
          <Text style={st.catName} numberOfLines={2}>{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: Math.max(16, cw * 0.3), marginBottom: 1 }}>{card.emoji}</Text>
          <Text style={st.word} numberOfLines={2}>{card.word}</Text>
        </>
      )}
    </View>
  );
}

function FoundationSlot({ slot, onPress, hinted }) {
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
    const p = slot.placedCards.length; const t = slot.category.totalWords;
    return (
      <TouchableOpacity style={[st.slotBox, { height: h, borderColor: clr, borderStyle: 'solid', backgroundColor: '#fff' }, hinted && st.slotHinted]} onPress={onPress} activeOpacity={0.7}>
        <View style={[st.slotTag, { backgroundColor: clr }]}><Text style={st.slotTagText}>{p}/{t}</Text></View>
        <MaterialIcons name="style" size={14} color={clr} style={{ marginTop: 8 }} />
        <Text style={[st.word, { fontSize: 7, marginTop: 2 }]} numberOfLines={2}>{slot.category.word}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[st.slotBox, st.slotDashed, { height: h }, hinted && st.slotHinted]} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name="style" size={20} color="rgba(255,255,255,0.12)" />
    </TouchableOpacity>
  );
}

function TableauColumn({ column, colIndex, selectedId, hintedId, onCardTap, onColumnTap }) {
  if (column.locked) {
    return (
      <View style={[st.slotBox, st.slotDashed, { height: CARD_H }]}>
        <MaterialIcons name="lock" size={16} color="rgba(255,255,255,0.2)" />
        <TouchableOpacity style={st.adBadge}><Text style={st.adText}>▶ AD</Text></TouchableOpacity>
      </View>
    );
  }
  if (column.cards.length === 0) {
    return (
      <TouchableOpacity
        style={[st.slotBox, st.slotDashed, { height: CARD_H, borderColor: 'rgba(255,255,255,0.08)' }]}
        onPress={() => onColumnTap(colIndex)}
        activeOpacity={0.7}
      />
    );
  }

  return (
    <View>
      {column.cards.map((card, ci) => {
        const isLast = ci === column.cards.length - 1;
        const isHinted = card.id === hintedId;
        return (
          <View key={card.id} style={{ marginTop: ci === 0 ? 0 : OVERLAP, zIndex: ci }}>
            {card.faceUp ? (
              <TouchableOpacity activeOpacity={0.7} onPress={() => { if (isLast) onCardTap(card, 'column', colIndex); }} disabled={!isLast}>
                <FaceUpCard card={card} selected={isLast && selectedId === card.id} hinted={isHinted} />
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

/* ── Win Overlay ── */
function LevelCompleteOverlay({ score, coins, onNext, onReplay, onHome }) {
  return (
    <View style={ov.overlay}>
      <LinearGradient colors={['rgba(21,6,41,0.95)', 'rgba(61,53,96,0.95)']} style={StyleSheet.absoluteFillObject} />
      <View style={ov.card}>
        <Image source={OWL_HAPPY} style={ov.owl} />
        <Text style={ov.title}>Tebrikler!</Text>
        <Text style={ov.subtitle}>BÖLÜM TAMAMLANDI</Text>
        <View style={ov.statsRow}>
          <View style={ov.statBox}>
            <Text style={ov.statLabel}>SKOR</Text>
            <Text style={ov.statValue}>{score.toLocaleString()}</Text>
          </View>
          <View style={ov.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="monetization-on" size={14} color={COLORS.coin} />
              <Text style={ov.statLabel}>ALTIN</Text>
            </View>
            <Text style={[ov.statValue, { color: COLORS.coin }]}>+{coins}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onNext} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={ov.nextBtn}>
            <Text style={ov.nextBtnText}>Sonraki Bölüm</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <View style={ov.bottomRow}>
          <TouchableOpacity style={ov.replayBtn} onPress={onReplay} activeOpacity={0.7}>
            <MaterialIcons name="refresh" size={18} color={COLORS.secondary} />
            <Text style={ov.replayText}>Tekrar Oyna</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ov.homeBtn} onPress={onHome} activeOpacity={0.7}>
            <MaterialIcons name="home" size={20} color={COLORS.onSurface} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ── Fail Overlay ── */
function LevelFailedOverlay({ levelId, onAddMoves, onReplay, onHome }) {
  return (
    <View style={ov.overlay}>
      <LinearGradient colors={['rgba(21,6,41,0.95)', 'rgba(61,53,96,0.95)']} style={StyleSheet.absoluteFillObject} />
      <View style={ov.card}>
        <MaterialIcons name="heart-broken" size={64} color={COLORS.primary} style={{ marginBottom: 8 }} />
        <Image source={OWL_HAPPY} style={[ov.owl, { width: 140, height: 140 }]} />
        <View style={ov.speechBubble}><Text style={ov.speechText}>Bazen kaybetmek de öğretir...</Text></View>
        <Text style={ov.failTitle}>Hamlen Bitti!</Text>
        <Text style={ov.failSub}>Üzülme, yıldızlar her zaman parlamaz.</Text>
        <TouchableOpacity onPress={onAddMoves} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={ov.addMovesBtn}>
            <MaterialIcons name="play-circle-filled" size={22} color="#fff" />
            <Text style={ov.addMovesText}>+20 Hamle (Ad)</Text>
            <View style={ov.freeBadge}><Text style={ov.freeText}>ÜCRETSİZ</Text></View>
          </LinearGradient>
        </TouchableOpacity>
        <View style={ov.bottomRow}>
          <TouchableOpacity style={ov.replayBtn} onPress={onReplay} activeOpacity={0.7}>
            <MaterialIcons name="refresh" size={18} color={COLORS.secondary} />
            <Text style={ov.replayText}>Tekrar Oyna</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ov.homeBtn} onPress={onHome} activeOpacity={0.7}>
            <MaterialIcons name="home" size={20} color={COLORS.onSurface} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ── Main Game Screen ── */
export default function GameScreen() {
  const params = useLocalSearchParams();
  const [levelId, setLevelId] = useState(parseInt(params.level) || 1);
  const level = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
  const [gs, setGs] = useState(() => generateGameState(level));
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('Karta dokun, sonra slot\'a dokun!');
  const [history, setHistory] = useState([]);
  const [hintCard, setHintCard] = useState(null);
  const [hintSlot, setHintSlot] = useState(null);
  const [sparkle, setSparkle] = useState(null);
  const [coins, setCoins] = useState(310);
  const [paused, setPaused] = useState(false);
  const [shakeSlotIdx, setShakeSlotIdx] = useState(-1);
  const [showTutorial, setShowTutorial] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Load progress
  useEffect(() => {
    loadProgress().then((p) => {
      setCoins(p.coins);
      if (!params.level) setLevelId(p.currentLevel);
      // Show tutorial on first play
      if (p.currentLevel === 1) setShowTutorial(true);
    });
  }, []);

  // Shake animation
  const triggerShake = useCallback((slotIdx) => {
    setShakeSlotIdx(slotIdx);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => setShakeSlotIdx(-1));
  }, [shakeAnim]);

  // Auto-save game state
  useEffect(() => {
    if (!gs.isComplete && !gs.isFailed) {
      saveSavedGame({ ...gs, levelId });
    }
  }, [gs]);

  useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(''), 2500); return () => clearTimeout(t); } }, [feedback]);

  // Clear hint after 2s
  useEffect(() => {
    if (hintCard) {
      const t = setTimeout(() => { setHintCard(null); setHintSlot(null); }, 2500);
      return () => clearTimeout(t);
    }
  }, [hintCard]);

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

  const placeCard = useCallback((card, source, sourceIndex, slotIndex) => {
    if (slotIndex < 0 || slotIndex >= gs.slots.length) return;
    if (gs.slots[slotIndex].locked) { setFeedback('🔒 Kilitli!'); return; }

    setGs((prev) => {
      const newSlots = prev.slots.map((sl) => ({ ...sl, placedCards: [...sl.placedCards] }));
      const target = newSlots[slotIndex];

      if (!target.category && card.type === 'category') {
        target.category = card;
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        setHistory((h) => [...h, prev]);
        setFeedback('✅ ' + card.word + ' açıldı!');
        playHaptic('flip');
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5, isFailed: prev.moves - 1 <= 0 };
      }
      if (!target.category && card.type === 'word') { setFeedback('⚠️ Önce kategori koy!'); return prev; }
      if (target.category && card.type === 'category') { setFeedback('⚠️ Zaten dolu!'); return prev; }
      if (target.category && card.type === 'word') {
        if (card.categoryIndex !== target.category.categoryIndex) {
          Vibration.vibrate(100);
          playHaptic('wrong');
          triggerShake(slotIndex);
          setFeedback('❌ Yanlış! (-1 hamle)');
          return { ...prev, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
        }

        // Collect ALL same-category cards from bottom of source column
        const cardsToPlace = [card];

        if (source === 'column' && sourceIndex !== null && sourceIndex !== undefined) {
          const col = prev.columns[sourceIndex];
          const colCards = col ? col.cards : [];
          const cardIdx = colCards.findIndex((c) => c.id === card.id);
          
          if (cardIdx > 0) {
            for (let k = cardIdx - 1; k >= 0; k--) {
              const above = colCards[k];
              if (!above.faceUp) break;
              if (above.type !== 'word') break;
              if (above.categoryIndex !== card.categoryIndex) break;
              if (cardsToPlace.length + target.placedCards.length >= target.category.totalWords) break;
              cardsToPlace.push(above);
            }
          }
        }

        const names = cardsToPlace.map((c) => c.word).join(', ');

        // Place all collected cards
        cardsToPlace.forEach((c) => target.placedCards.push(c));

        // Remove all placed cards from source
        let ns = { ...prev };
        const placedIds = new Set(cardsToPlace.map((c) => c.id));

        if (source === 'column') {
          ns.columns = prev.columns.map((col, i) => {
            if (i !== sourceIndex) return col;
            const remaining = col.cards.filter((c) => !placedIds.has(c.id));
            // Flip the new bottom card if face down
            if (remaining.length > 0 && !remaining[remaining.length - 1].faceUp) {
              remaining[remaining.length - 1] = { ...remaining[remaining.length - 1], faceUp: true };
            }
            return { ...col, cards: remaining };
          });
        } else if (source === 'drawn') {
          ns.drawnCards = prev.drawnCards.filter((c) => !placedIds.has(c.id));
        }

        const totalPlaced = cardsToPlace.length;
        setSparkle({ x: SW / 2, y: 200 });
        setTimeout(() => setSparkle(null), 700);

        // Check if this placement completed a category
        const catCompleted = target.placedCards.length >= target.category.totalWords;

        let done = true;
        for (const sl of newSlots) if (sl.category && sl.placedCards.length < sl.category.totalWords) done = false;
        const catsPlaced = newSlots.filter((sl) => sl.category).length;
        const isComplete = done && catsPlaced >= level.categories.length;
        setHistory((h) => [...h, prev]);

        if (catCompleted && !isComplete) {
          setFeedback('🎉 ' + target.category.word + ' tamamlandı!');
          playHaptic('complete');
        } else if (totalPlaced > 1) {
          setFeedback('✅ ' + totalPlaced + ' kart: ' + names + ' (+' + (totalPlaced * 10) + ')');
        } else {
          setFeedback('✅ Doğru! (+10)');
        }
        playHaptic('correct');
        const catBonus = catCompleted ? 25 : 0;
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + (totalPlaced * 10) + catBonus, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
  }, [gs.slots, level.categories.length]);

  const moveToColumn = useCallback((card, source, sourceIndex, targetColIndex) => {
    if (source === 'column' && sourceIndex === targetColIndex) return;
    setGs((prev) => {
      const targetCol = prev.columns[targetColIndex];
      if (targetCol.locked) { setFeedback('🔒 Kilitli!'); return prev; }
      if (targetCol.cards.length > 0) {
        const bottomCard = targetCol.cards[targetCol.cards.length - 1];
        if (!bottomCard.faceUp) { setFeedback('⚠️ Buraya koyamazsın!'); return prev; }
        // Category cards can't be stacking targets — only word on word
        if (bottomCard.type === 'category') { setFeedback('⚠️ Kategori kartının üstüne konamazsın!'); return prev; }
        if (card.type === 'category') { setFeedback('⚠️ Kategori kartı sütuna taşınamaz!'); return prev; }
        if (card.categoryIndex !== bottomCard.categoryIndex) {
          setFeedback('⚠️ Aynı kategori kartları üst üste konabilir!');
          return prev;
        }
      }
      const ns = removeFromSource(prev, source, sourceIndex, card.id);
      ns.columns = ns.columns.map((col, i) => {
        if (i !== targetColIndex) return col;
        return { ...col, cards: [...col.cards, { ...card, faceUp: true }] };
      });
      setHistory((h) => [...h, prev]);
      setFeedback('📋 ' + card.word + ' taşındı');
      return ns;
    });
    setSelected(null);
  }, []);

  const handleCardTap = useCallback((card, source, sourceIndex) => {
    setSelected((prev) => {
      if (prev && prev.card.id !== card.id && source === 'column') {
        moveToColumn(prev.card, prev.source, prev.sourceIndex, sourceIndex);
        return null;
      }
      if (prev && prev.card.id === card.id) { setFeedback(''); return null; }
      setFeedback('✋ ' + card.word + ' → Slot veya sütuna dokun');
      return { card, source, sourceIndex };
    });
  }, [moveToColumn]);

  const handleColumnTap = useCallback((colIndex) => {
    if (!selected) return;
    moveToColumn(selected.card, selected.source, selected.sourceIndex, colIndex);
  }, [selected, moveToColumn]);

  const handleSlotTap = useCallback((slotIndex) => {
    if (!selected) { setFeedback('Önce kart seç!'); return; }
    placeCard(selected.card, selected.source, selected.sourceIndex, slotIndex);
    setSelected(null);
  }, [selected, placeCard]);

  const drawCard = useCallback(() => {
    setGs((p) => {
      if (p.deck.length === 0 && p.drawnCards.length === 0) { setFeedback('Tüm kartlar kullanıldı!'); return p; }
      if (p.deck.length === 0) {
        // Recycle: drawn cards go back to deck (shuffled, face down)
        const recycled = [...p.drawnCards].reverse().map((c) => ({ ...c, faceUp: false }));
        // Shuffle recycled
        for (let i = recycled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [recycled[i], recycled[j]] = [recycled[j], recycled[i]];
        }
        setFeedback('🔄 Deste karıştırıldı!');
        playHaptic('draw');
        return { ...p, deck: recycled, drawnCards: [] };
      }
      const d = [...p.deck]; const card = { ...d.pop(), faceUp: true };
      setFeedback('🎴 ' + card.word + ' çekildi!');
      playHaptic('draw');
      return { ...p, deck: d, drawnCards: [...p.drawnCards, card] };
    });
    setSelected(null);
  }, []);

  const handleDrawnTap = useCallback(() => {
    if (gs.drawnCards.length === 0) { setFeedback('Önce desteden çek!'); return; }
    handleCardTap(gs.drawnCards[gs.drawnCards.length - 1], 'drawn', null);
  }, [gs.drawnCards, handleCardTap]);

  const useUndo = useCallback(() => {
    if (history.length === 0) { setFeedback('Geri alınacak yok!'); return; }
    setGs(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); setSelected(null);
    setFeedback('↩ Geri alındı');
  }, [history]);

  const useDelete = useCallback(() => {
    if (gs.drawnCards.length === 0) { setFeedback('Silinecek yok!'); return; }
    setFeedback('🗑️ Silindi');
    setGs((p) => ({ ...p, drawnCards: p.drawnCards.slice(0, -1), moves: p.moves - 1 })); setSelected(null);
  }, [gs.drawnCards]);

  // ── Smart Hint ──
  const useHint = useCallback(() => {
    if (gs.hints <= 0) { setFeedback('İpucu hakkın kalmadı!'); return; }

    // 1. Find playable cards (bottom of columns + top of drawn)
    const playable = [];
    gs.columns.forEach((col, ci) => {
      if (col.locked || col.cards.length === 0) return;
      const last = col.cards[col.cards.length - 1];
      if (last.faceUp) playable.push({ card: last, source: 'column', sourceIndex: ci });
    });
    if (gs.drawnCards.length > 0) {
      playable.push({ card: gs.drawnCards[gs.drawnCards.length - 1], source: 'drawn', sourceIndex: null });
    }

    // 2. Check each against slots
    for (const p of playable) {
      // Category card → any empty slot
      if (p.card.type === 'category') {
        const emptySlot = gs.slots.findIndex((sl) => !sl.locked && !sl.category);
        if (emptySlot >= 0) {
          setHintCard(p.card.id); setHintSlot(emptySlot);
          setGs((prev) => ({ ...prev, hints: prev.hints - 1 }));
          setFeedback('💡 ' + p.card.word + ' → boş slota koy!');
          return;
        }
      }
      // Word card → matching active category slot
      if (p.card.type === 'word') {
        const matchSlot = gs.slots.findIndex((sl) => sl.category && sl.category.categoryIndex === p.card.categoryIndex && sl.placedCards.length < sl.category.totalWords);
        if (matchSlot >= 0) {
          setHintCard(p.card.id); setHintSlot(matchSlot);
          setGs((prev) => ({ ...prev, hints: prev.hints - 1 }));
          setFeedback('💡 ' + p.card.word + ' → ' + gs.slots[matchSlot].category.word + '!');
          return;
        }
      }
    }
    setFeedback('💡 Şu an yapılabilecek hamle bulunamadı. Desteden çek!');
    setGs((prev) => ({ ...prev, hints: prev.hints - 1 }));
  }, [gs]);

  const resetGame = useCallback(() => {
    const newLevel = LEVELS.find((l) => l.id === levelId) || LEVELS[0];
    setGs(generateGameState(newLevel)); setHistory([]); setSelected(null);
    setHintCard(null); setHintSlot(null);
  }, [levelId]);

  const addMoves = useCallback(async () => {
    const result = await showRewarded();
    if (result.success) {
      setGs((p) => ({ ...p, moves: p.moves + 20, isFailed: false }));
      setFeedback('⚡ +20 hamle eklendi!');
    } else {
      // Fallback: give moves anyway (ad might not be available in Expo Go)
      setGs((p) => ({ ...p, moves: p.moves + 20, isFailed: false }));
      setFeedback('⚡ +20 hamle eklendi!');
    }
  }, []);

  // ── Level Complete → save & advance ──
  const handleNextLevel = useCallback(async () => {
    const nextId = levelId + 1;
    const nextLevel = LEVELS.find((l) => l.id === nextId);
    if (!nextLevel) { router.back(); return; }
    const bonus = Math.floor(50 * (gs.moves / level.moves));
    const prog = await loadProgress();
    await updateProgress({
      currentLevel: nextId,
      coins: (prog.coins || 0) + 250 + bonus,
      totalGames: (prog.totalGames || 0) + 1,
      totalWins: (prog.totalWins || 0) + 1,
      bestScore: Math.max(prog.bestScore || 0, gs.score),
      streak: (prog.streak || 0) + 1,
    });
    await clearSavedGame();
    // Show interstitial ad every 3 levels (not on every level — Better Ads Standards)
    if (nextId % 3 === 0) await showInterstitial();
    setLevelId(nextId);
    setGs(generateGameState(nextLevel));
    setHistory([]); setSelected(null);
    setHintCard(null); setHintSlot(null);
    setCoins((prog.coins || 0) + 250 + bonus);
  }, [levelId, gs, level, coins]);

  const handleReplay = useCallback(async () => {
    const prog = await loadProgress();
    await updateProgress({ totalGames: (prog.totalGames || 0) + 1 });
    await clearSavedGame();
    resetGame();
  }, [resetGame]);

  const handleHome = useCallback(async () => {
    await clearSavedGame();
    router.back();
  }, []);

  const selId = selected?.card?.id;
  const DCW = Math.floor(CARD_W * 1.1); const DCH = Math.floor(CARD_H * 1.1);

  return (
    <View style={st.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Sparkle */}
      {sparkle && <SparkleEffect visible={true} x={sparkle.x} y={sparkle.y} />}

      <View style={st.header}>
        <View style={st.coinBadge}>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
          <Text style={st.coinText}>{coins}</Text>
        </View>
        <Text style={st.headerTitle}>Bölüm {gs.levelId}</Text>
        <TouchableOpacity style={st.settingsBtn} onPress={() => setPaused(true)}>
          <MaterialIcons name="settings" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {!!feedback && <View style={st.feedbackBar}><Text style={st.feedbackText}>{feedback}</Text></View>}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={st.deckRow}>
          <View style={st.movesPanel}>
            <Text style={st.movesLabel}>HAMLE</Text>
            <Text style={st.movesNum}>{gs.moves}</Text>
            <TouchableOpacity style={st.addBtn} onPress={addMoves}><Text style={st.addBtnText}>+20 ▶</Text></TouchableOpacity>
          </View>

          <TouchableOpacity style={st.drawnArea} onPress={handleDrawnTap} activeOpacity={0.7}>
            {gs.drawnCards.length === 0 ? (
              <View style={[st.emptyCard, { width: DCW, height: DCH }]}>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>Boş</Text>
              </View>
            ) : (
              <View style={{ width: DCW + 28, height: DCH, justifyContent: 'center', alignItems: 'center' }}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => (
                  <View key={card.id} style={{ position: 'absolute', transform: [{ translateX: (i - (arr.length - 1)) * 14 }], zIndex: i, opacity: i === arr.length - 1 ? 1 : 0.35 + i * 0.2 }}>
                    <FaceUpCard card={card} selected={i === arr.length - 1 && selId === card.id} hinted={card.id === hintCard} w={DCW} h={DCH} />
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
                {gs.drawnCards.length > 0 ? (
                  <MaterialIcons name="refresh" size={22} color={COLORS.secondary} />
                ) : (
                  <MaterialIcons name="block" size={18} color="rgba(255,255,255,0.12)" />
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={st.slotsRow}>
          {gs.slots.map((slot, i) => (
            <Animated.View key={i} style={{ flex: 1, transform: [{ translateX: shakeSlotIdx === i ? shakeAnim : 0 }] }}>
              <FoundationSlot slot={slot} onPress={() => handleSlotTap(i)} hinted={hintSlot === i} />
            </Animated.View>
          ))}
        </View>

        <View style={st.tableauRow}>
          {gs.columns.map((col, i) => (
            <View key={i} style={{ flex: 1 }}>
              <TableauColumn column={col} colIndex={i} selectedId={selId} hintedId={hintCard} onCardTap={handleCardTap} onColumnTap={handleColumnTap} />
            </View>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Toolbar */}
      <View style={st.toolbar}>
        <ToolBtn icon="lightbulb" label="İPUCU" badge={gs.hints} badgeColor={COLORS.fail} onPress={useHint} />
        <ToolBtn icon="undo" label="GERİ AL" badge="+" badgeColor={COLORS.success} onPress={useUndo} />
        <ToolBtn icon="auto-fix-normal" label="SİL" badge="+" badgeColor={COLORS.success} onPress={useDelete} big />
        <View style={st.toolOwlWrap}>
          <Image source={OWL_HAPPY} style={st.toolOwl} />
          <TouchableOpacity style={st.searchBtn} onPress={() => setFeedback('🔍 Yakında!')}>
            <MaterialIcons name="search" size={18} color="#fff" />
          </TouchableOpacity>
          <Text style={st.toolLabel}>ARAMA</Text>
        </View>
      </View>

      <BottomNav activeTab="home" />

      {/* Tutorial */}
      {showTutorial && (
        <View style={ov.overlay}>
          <LinearGradient colors={['rgba(21,6,41,0.92)', 'rgba(61,53,96,0.92)']} style={StyleSheet.absoluteFillObject} />
          <View style={ov.card}>
            <Image source={OWL_HAPPY} style={{ width: 100, height: 100, borderRadius: 16, marginBottom: 12 }} />
            <Text style={[ov.title, { fontSize: 24 }]}>Nasıl Oynanır?</Text>
            <View style={s_tut.steps}>
              <TutStep n="1" text="Sütundaki kartlara dokun. Sadece en alttaki kart seçilebilir." icon="touch-app" />
              <TutStep n="2" text="Kategori kartını bul ve üst slota yerleştir. Bu, o kategoriyi açar." icon="style" />
              <TutStep n="3" text="Kelime kartlarını doğru kategoriye yerleştir. Aynı kategorideki kartları sütunlarda üst üste koyabilirsin." icon="category" />
              <TutStep n="4" text="Tüm kartları kategorilerine yerleştir. Hamlelerin bitmeden bitir!" icon="emoji-events" />
            </View>
            <TouchableOpacity onPress={() => setShowTutorial(false)} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={[ov.nextBtn, { paddingHorizontal: 48 }]}>
                <Text style={ov.nextBtnText}>Başla!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Pause Menu */}
      {paused && (
        <View style={ov.overlay}>
          <LinearGradient colors={['rgba(21,6,41,0.95)', 'rgba(61,53,96,0.95)']} style={StyleSheet.absoluteFillObject} />
          <View style={ov.card}>
            <Text style={[ov.title, { fontSize: 28, marginBottom: 4 }]}>Duraklatıldı</Text>
            <Text style={[ov.subtitle, { marginBottom: 24 }]}>BÖLÜM {gs.levelId}</Text>

            <TouchableOpacity style={ov.pauseBtn} onPress={() => setPaused(false)} activeOpacity={0.7}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={ov.pauseBtnInner}>
                <MaterialIcons name="play-arrow" size={24} color="#fff" />
                <Text style={ov.pauseBtnText}>Devam Et</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={ov.pauseSecBtn} onPress={() => { setPaused(false); resetGame(); }} activeOpacity={0.7}>
              <MaterialIcons name="refresh" size={20} color={COLORS.secondary} />
              <Text style={ov.pauseSecText}>Tekrar Başla</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ov.pauseSecBtn} onPress={() => router.push('/settings')} activeOpacity={0.7}>
              <MaterialIcons name="settings" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={ov.pauseSecText}>Ayarlar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ov.pauseSecBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialIcons name="home" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={ov.pauseSecText}>Ana Sayfa</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Overlays */}
      {gs.isComplete && (
        <LevelCompleteOverlay score={gs.score} coins={250} onNext={handleNextLevel} onReplay={handleReplay} onHome={handleHome} />
      )}
      {gs.isFailed && !gs.isComplete && (
        <LevelFailedOverlay levelId={gs.levelId} onAddMoves={addMoves} onReplay={handleReplay} onHome={handleHome} />
      )}
    </View>
  );
}

function TutStep({ n, text, icon }) {
  return (
    <View style={s_tut.step}>
      <View style={s_tut.stepIcon}>
        <MaterialIcons name={icon} size={18} color={COLORS.secondary} />
      </View>
      <View style={s_tut.stepContent}>
        <Text style={s_tut.stepNum}>ADIM {n}</Text>
        <Text style={s_tut.stepText}>{text}</Text>
      </View>
    </View>
  );
}

const s_tut = StyleSheet.create({
  steps: { width: '100%', gap: 10, marginVertical: 16 },
  step: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stepIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.secondary + '22', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepContent: { flex: 1 },
  stepNum: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: COLORS.secondary, letterSpacing: 1, marginBottom: 2 },
  stepText: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant, lineHeight: 17 },
});

function ToolBtn({ icon, label, badge, badgeColor, onPress, big }) {
  return (
    <View style={st.toolWrap}>
      <TouchableOpacity style={[st.toolBtn, big && st.toolBtnBig]} onPress={onPress} activeOpacity={0.6}>
        <MaterialIcons name={icon} size={big ? 22 : 20} color="#fff" />
        {badge !== undefined && <View style={[st.toolBdg, { backgroundColor: badgeColor }]}><Text style={st.toolBdgText}>{badge}</Text></View>}
      </TouchableOpacity>
      {!!label && <Text style={st.toolLabel}>{label}</Text>}
    </View>
  );
}

/* ── Overlay Styles ── */
const ov = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  card: { width: SW - 48, backgroundColor: COLORS.surfaceContainerHigh, borderRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },
  owl: { width: 180, height: 180, borderRadius: 20, marginTop: -50, marginBottom: 8 },
  title: { fontFamily: FONTS.headlineBlack, fontSize: 36, color: COLORS.onSurface, fontStyle: 'italic' },
  subtitle: { fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.secondary, letterSpacing: 3, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  statBox: { flex: 1, backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 16, alignItems: 'center' },
  statLabel: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  statValue: { fontFamily: FONTS.headlineBlack, fontSize: 28, color: COLORS.onSurface, marginTop: 4 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 40, borderRadius: SIZES.radiusFull },
  nextBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  replayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: SIZES.radiusFull, borderWidth: 1.5, borderColor: COLORS.secondary },
  replayText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.secondary },
  homeBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },
  speechBubble: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  speechText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, fontStyle: 'italic' },
  failTitle: { fontFamily: FONTS.headlineBlack, fontSize: 32, color: COLORS.onSurface, marginBottom: 4 },
  failSub: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 20, textAlign: 'center' },
  addMovesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24, borderRadius: SIZES.radiusFull },
  addMovesText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },
  freeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: SIZES.radiusFull },
  freeText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff', letterSpacing: 1 },
  pauseBtn: { width: '100%', marginBottom: 12 },
  pauseBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: SIZES.radiusFull },
  pauseBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  pauseSecBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, width: '100%', paddingVertical: 14, borderRadius: 16, backgroundColor: COLORS.panelBg, borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 8 },
  pauseSecText: { fontFamily: FONTS.headline, fontSize: 15, color: COLORS.onSurface },
});

/* ── Game Styles ── */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 52, paddingBottom: 6, backgroundColor: COLORS.headerBg, zIndex: 50 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.panelBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, borderWidth: 1, borderColor: COLORS.panelBorder },
  coinText: { fontFamily: FONTS.headline, fontSize: 13, color: COLORS.onSurface },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff', letterSpacing: 1 },
  settingsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  feedbackBar: { backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 8, paddingHorizontal: 16, zIndex: 50 },
  feedbackText: { fontFamily: FONTS.headline, fontSize: 13, color: '#fff', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 10, paddingTop: 10, gap: 10 },
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  movesPanel: { backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.panelBorder, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: 72 },
  movesLabel: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  movesNum: { fontFamily: FONTS.headlineBlack, fontSize: 26, color: '#fff', lineHeight: 30 },
  addBtn: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, marginTop: 2 },
  addBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  drawnArea: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 90 },
  emptyCard: { borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.panelBorder, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  deckBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 3 },
  deckBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff' },
  faceDown: { borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.cardBackBorder, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  innerFrame: { flex: 1, margin: 3, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  innerFrameInner: { width: '60%', height: '60%', borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  faceUp: { borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.cardBorder, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 2.5, shadowColor: COLORS.primary, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8, transform: [{ scale: 1.05 }] },
  cardHinted: { borderColor: COLORS.coin, borderWidth: 2.5, shadowColor: COLORS.coin, shadowOpacity: 0.8, shadowRadius: 12, elevation: 8, transform: [{ scale: 1.08 }] },
  catCardBorder: { borderColor: COLORS.cardBackBorder, borderWidth: 2 },
  word: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#1e293b', textAlign: 'center', lineHeight: 9 },
  catBadge: { position: 'absolute', top: 2, right: 3 },
  catBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.cardBackTop },
  catName: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#1e293b', textAlign: 'center', lineHeight: 10, marginTop: 2 },
  slotsRow: { flexDirection: 'row', gap: 3 },
  slotBox: { borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slotDashed: { borderColor: COLORS.panelBorder, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)' },
  slotHinted: { borderColor: COLORS.coin, borderWidth: 2.5, shadowColor: COLORS.coin, shadowOpacity: 0.6, shadowRadius: 10 },
  lockedText: { fontFamily: FONTS.headlineBlack, fontSize: 6, color: 'rgba(255,255,255,0.3)' },
  adBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  slotTag: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 2, alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  slotTagText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  tableauRow: { flexDirection: 'row', gap: COL_GAP, alignItems: 'flex-start' },
  toolbar: { position: 'absolute', bottom: 94, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, paddingVertical: 6, paddingHorizontal: 16, zIndex: 100 },
  toolWrap: { alignItems: 'center', gap: 3 },
  toolBtn: { width: 46, height: 46, borderRadius: 13, backgroundColor: COLORS.buttonBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
  toolBtnBig: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.primary },
  toolBdg: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 2 },
  toolBdgText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  toolLabel: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  toolOwlWrap: { alignItems: 'center', gap: 3 },
  toolOwl: { width: 56, height: 56, borderRadius: 12 },
  searchBtn: { position: 'absolute', bottom: 0, right: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.buttonBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
});
