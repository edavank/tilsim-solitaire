import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Vibration, Image, Animated, Easing, PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, SIZES, CATEGORY_COLORS } from '../src/constants/theme';
import { LEVELS, generateGameState, getLevel } from '../src/data/levels';
import { loadProgress, updateProgress, clearSavedGame, saveSavedGame } from '../src/utils/storage';
import { playHaptic, playSound } from '../src/utils/sounds';
import { showRewarded, showInterstitial } from '../src/utils/ads';
import { useLang } from '../src/context/LanguageContext';
import { submitScore } from '../src/utils/leaderboardService';
import { getDailyChallenge, markDailyChallengeCompleted } from '../src/utils/dailyChallenge';

import { IS_TABLET, rs, fs, getGameLayout } from '../src/utils/responsive';

const OWL_HAPPY = require('../assets/bilge-happy.png');

/* ── Responsive Game Dimensions (recalculated on rotation) ── */
function useGameDimensions() {
  const [dims, setDims] = useState(() => getGameLayout());
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => setDims(getGameLayout()));
    return () => sub?.remove?.();
  }, []);
  return dims;
}

/* ── Score Popup Animation ── */
function ScorePopup({ text, x, y }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.Text style={{
      position: 'absolute', left: x - 30, top: y - 20, zIndex: 999,
      fontFamily: FONTS.headlineBlack, fontSize: fs(16), color: COLORS.coin,
      opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] }) },
                  { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 1.3, 1] }) }],
    }}>{text}</Animated.Text>
  );
}

/* ── Initial Layout Constants (for max 7 columns) ── */
const _layout = getGameLayout();
const SW = _layout.sw;
const SH = _layout.sh;
const COL_COUNT = 7; // Max columns
const COL_GAP = IS_TABLET ? 5 : 3;
const CARD_W = Math.floor((SW - 12 - (COL_COUNT - 1) * COL_GAP) / COL_COUNT);
const CARD_H = Math.floor(CARD_W * 1.35);
const OVERLAP = -Math.floor(CARD_H * 0.72);

/* ── Sparkle Particle ── */
function SparkleEffect({ visible, x, y }) {
  const particles = useRef([...Array(12)].map(() => ({
    anim: new Animated.Value(0),
    angle: Math.random() * Math.PI * 2,
    dist: 30 + Math.random() * 40,
    color: ['#FFD166', '#FF8AA7', '#5DBE6E', '#B794F6', '#9B7DFF'][Math.floor(Math.random() * 5)],
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

/* ── Confetti Effect (Win Screen) ── */
function ConfettiEffect() {
  const pieces = useRef([...Array(30)].map(() => ({
    anim: new Animated.Value(0),
    x: Math.random() * SW,
    delay: Math.random() * 500,
    color: ['#FFD166', '#FF8AA7', '#6ECB8B', '#B794F6', '#9B7DFF', '#FFB074'][Math.floor(Math.random() * 6)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    drift: (Math.random() - 0.5) * 100,
  }))).current;

  useEffect(() => {
    pieces.forEach((p) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, { toValue: 1, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 998 }} pointerEvents="none">
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: -20,
          width: p.size, height: p.size * 0.6, borderRadius: 2,
          backgroundColor: p.color,
          opacity: p.anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0] }),
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, SH + 40] }) },
            { translateX: p.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.drift, p.drift * 1.5] }) },
            { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', p.rotation + 'deg'] }) },
          ],
        }} />
      ))}
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

function FaceUpCard({ card, selected, w, h, hinted, isDragging }) {
  const cw = w || CARD_W; const ch = h || CARD_H;
  const isCat = card.type === 'category';
  return (
    <View style={[st.faceUp, { width: cw, height: ch }, selected && st.cardSelected, isCat && st.catCardBorder, hinted && st.cardHinted, isDragging && { opacity: 0.3 }]}>
      {isCat ? (
        <>
          <View style={st.catBadge}><Text style={st.catBadgeText}>0/{card.totalWords}</Text></View>
          <Text style={{ fontSize: Math.max(22, cw * 0.4) }}>{card.emoji}</Text>
          <Text style={st.catName} numberOfLines={2}>{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: Math.max(22, cw * 0.4) }}>{card.emoji}</Text>
          <Text style={st.word} numberOfLines={2}>{card.word}</Text>
        </>
      )}
    </View>
  );
}

function FoundationSlot({ t, slot, slotIndex, onPress, onUnlock, hinted }) {
  const h = CARD_H * 0.72;
  if (slot.locked) {
    return (
      <View style={[st.slotBox, st.slotDashed, { height: h }]}>
        <Text style={st.lockedText}>{t.locked}</Text>
        <MaterialIcons name="style" size={18} color="rgba(255,255,255,0.15)" />
        <TouchableOpacity style={st.adBadge} onPress={() => onUnlock?.('slot', slotIndex)}>
          <Text style={st.adText}>▶ AD</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (slot.category) {
    const clr = CATEGORY_COLORS[slot.category.categoryIndex % CATEGORY_COLORS.length];
    const p = slot.placedCards.length; const tw = slot.category.totalWords;
    const isDone = p >= tw;
    return (
      <TouchableOpacity style={[st.slotBox, { height: h, borderColor: isDone ? COLORS.success : clr, borderStyle: 'solid', backgroundColor: isDone ? '#f0fff0' : '#fff' }, hinted && st.slotHinted]} onPress={onPress} activeOpacity={0.7}>
        <View style={[st.slotTag, { backgroundColor: isDone ? COLORS.success : clr }]}>
          {isDone ? <MaterialIcons name="check" size={10} color="#fff" /> : <Text style={st.slotTagText}>{p}/{tw}</Text>}
        </View>
        {isDone ? (
          <MaterialIcons name="check-circle" size={16} color={COLORS.success} style={{ marginTop: 8 }} />
        ) : (
          <Text style={{ fontSize: 16, marginTop: 8 }}>{slot.category.emoji}</Text>
        )}
        <Text style={[st.word, { fontSize: 8, marginTop: 2, color: isDone ? COLORS.success : '#1e293b' }]} numberOfLines={2}>{slot.category.word}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[st.slotBox, st.slotDashed, { height: h }, hinted && st.slotHinted]} onPress={onPress} activeOpacity={0.7}>
      <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{t.empty}</Text>
    </TouchableOpacity>
  );
}

function TableauColumn({ column, colIndex, selectedId, selectedStackIds, hintedId, dragCardId, dragStackIds, onCardTap, onColumnTap, onCardLongPress, onUnlock }) {
  if (column.locked) {
    return (
      <View style={[st.slotBox, st.slotDashed, { height: CARD_H }]}>
        <MaterialIcons name="lock" size={16} color="rgba(255,255,255,0.2)" />
        <TouchableOpacity style={st.adBadge} onPress={() => onUnlock?.('column', colIndex)}>
          <Text style={st.adText}>▶ AD</Text>
        </TouchableOpacity>
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
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onCardTap(card, 'column', colIndex, isLast)}
                onLongPress={(e) => onCardLongPress?.(card, 'column', colIndex, isLast, e)}
                delayLongPress={200}
              >
                <FaceUpCard card={card} selected={selectedId === card.id || (selectedStackIds && selectedStackIds.has(card.id))} hinted={isHinted} isDragging={dragStackIds && dragStackIds.has(card.id)} />
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
function LevelCompleteOverlay({ t, score, coins, movesLeft, maxMoves, levelId, combo, isDaily, onNext, onReplay, onHome }) {
  const moveBonus = Math.floor(8 * (movesLeft / maxMoves));
  const totalCoins = coins + moveBonus;
  const moveRatio = movesLeft / maxMoves;
  const stars = moveRatio > 0.5 ? 3 : moveRatio > 0.25 ? 2 : 1;
  return (
    <View style={ov.overlay}>
      <LinearGradient colors={['rgba(21,6,41,0.95)', 'rgba(61,53,96,0.95)']} style={StyleSheet.absoluteFillObject} />
      <View style={ov.card}>
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
          {[1, 2, 3].map((s) => (
            <MaterialIcons key={s} name="star" size={32} color={s <= stars ? COLORS.coin : 'rgba(255,255,255,0.15)'} />
          ))}
        </View>
        <Image source={OWL_HAPPY} style={ov.owl} />
        <Text style={ov.title}>{t.congrats}</Text>
        <Text style={ov.subtitle}>{isDaily ? '📅 GÜNLÜK GÖREV' : t.level + ' ' + levelId} {t.levelComplete}</Text>
        {combo > 0 && <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 12, color: COLORS.tertiary, marginBottom: 8 }}>🔥 Max Combo: {combo}x</Text>}
        <View style={ov.statsRow}>
          <View style={ov.statBox}>
            <Text style={ov.statLabel}>{t.score}</Text>
            <Text style={ov.statValue}>{score.toLocaleString()}</Text>
          </View>
          <View style={ov.statBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 10 }}>🪙</Text>
              <Text style={ov.statLabel}>{t.gold}</Text>
            </View>
            <Text style={[ov.statValue, { color: COLORS.coin }]}>+{totalCoins}</Text>
            {moveBonus > 0 && <Text style={{ fontFamily: FONTS.body, fontSize: 9, color: COLORS.onSurfaceVariant, marginTop: 2 }}>({coins} + {moveBonus} {t.moveBonus})</Text>}
          </View>
        </View>
        <TouchableOpacity onPress={onNext} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={ov.nextBtn}>
            <Text style={ov.nextBtnText}>{isDaily ? t.home : t.nextLevel}</Text>
            <MaterialIcons name={isDaily ? 'home' : 'arrow-forward'} size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <View style={ov.bottomRow}>
          <TouchableOpacity style={ov.replayBtn} onPress={onReplay} activeOpacity={0.7}>
            <MaterialIcons name="refresh" size={18} color={COLORS.secondary} />
            <Text style={ov.replayText}>{t.replay}</Text>
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
function LevelFailedOverlay({ t, levelId, onAddMovesAd, onAddMovesCoin, onReplay, onHome }) {
  return (
    <View style={ov.overlay}>
      <LinearGradient colors={['rgba(21,6,41,0.95)', 'rgba(61,53,96,0.95)']} style={StyleSheet.absoluteFillObject} />
      <View style={ov.card}>
        <Image source={OWL_HAPPY} style={ov.owl} />
        <View style={ov.speechBubble}><Text style={ov.speechText}>{t.failSpeech}</Text></View>
        <Text style={ov.failTitle}>{t.outOfMoves}</Text>
        <Text style={ov.failSub}>{t.failMsg}</Text>
        <TouchableOpacity onPress={onAddMovesAd} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={ov.addMovesBtn}>
            <MaterialIcons name="play-circle-filled" size={22} color="#fff" />
            <Text style={ov.addMovesText}>{t.addMoves}</Text>
            <View style={ov.freeBadge}><Text style={ov.freeText}>{t.free}</Text></View>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAddMovesCoin} activeOpacity={0.85} style={{ marginTop: 8, width: '100%' }}>
          <View style={[ov.addMovesBtn, { backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.coin, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 9999 }]}>
            <Text style={{ fontSize: 16 }}>🪙</Text>
            <Text style={[ov.addMovesText, { color: COLORS.coin }]}>500 Coin → +20</Text>
          </View>
        </TouchableOpacity>
        <View style={ov.bottomRow}>
          <TouchableOpacity style={ov.replayBtn} onPress={onReplay} activeOpacity={0.7}>
            <MaterialIcons name="refresh" size={18} color={COLORS.secondary} />
            <Text style={ov.replayText}>{t.replay}</Text>
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
  const { lang, t } = useLang();
  const [levelId, setLevelId] = useState(parseInt(params.level) || 1);
  const [gameLang, setGameLang] = useState(lang);
  const [isDaily, setIsDaily] = useState(params.daily === 'true');

  // Sync game language with context
  useEffect(() => { setGameLang(lang); }, [lang]);
  const level = isDaily ? getDailyChallenge(gameLang) : (getLevel(levelId, gameLang) || getLevel(1, gameLang));
  const [gs, setGs] = useState(() => generateGameState(level));
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [history, setHistory] = useState([]);
  const [hintCard, setHintCard] = useState(null);
  const [hintSlot, setHintSlot] = useState(null);
  const [sparkle, setSparkle] = useState(null);
  const [coins, setCoins] = useState(500);
  const [combo, setCombo] = useState(0);
  const [paused, setPaused] = useState(false);
  const [shakeSlotIdx, setShakeSlotIdx] = useState(-1);
  const [showTutorial, setShowTutorial] = useState(false);
  const [toolModal, setToolModal] = useState(null); // 'hint' | 'undo' | 'delete' | null
  const [scorePopups, setScorePopups] = useState([]); // [{id, text, x, y}]
  
  const showScorePopup = useCallback((text, x, y) => {
    const id = Date.now() + Math.random();
    setScorePopups((prev) => [...prev.slice(-5), { id, text, x: x || SW / 2, y: y || 200 }]);
    setTimeout(() => setScorePopups((prev) => prev.filter((p) => p.id !== id)), 1000);
  }, []);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Drag & Drop System ──
  const [dragCard, setDragCard] = useState(null); // { card, source, sourceIndex, isLast }
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragOpacity = useRef(new Animated.Value(0)).current;
  const dropZones = useRef([]); // [{ type: 'slot'|'column', index, x, y, w, h }]
  const dragRef = useRef({ card: null, source: null, sourceIndex: null, isLast: false, startX: 0, startY: 0 });
  const scrollRef = useRef(null);

  const measureDropZone = useCallback((type, index, event) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    // Store layout relative to screen — we'll need pageX/pageY later
    dropZones.current = dropZones.current.filter((z) => !(z.type === type && z.index === index));
    dropZones.current.push({ type, index, x, y, w: width, h: height });
  }, []);

  const startDrag = useCallback((card, source, sourceIndex, isLast, pageX, pageY) => {
    let stackCards = [card];
    if (source === 'column' && !isLast) {
      const col = gs.columns[sourceIndex];
      if (!col) return;
      const cardIdx = col.cards.findIndex((c) => c.id === card.id);
      if (cardIdx < 0) return;
      const stack = col.cards.slice(cardIdx);
      const allValid = stack.every((c) => c.faceUp && c.categoryIndex === card.categoryIndex);
      if (!allValid) { setFeedback(t.stackDragError); return; }
      stackCards = stack;
    }
    dragRef.current = { card, source, sourceIndex, isLast, stackCards, startX: pageX, startY: pageY };
    setDragCard({ card, source, sourceIndex, isLast, stackCards });
    dragX.setValue(pageX - CARD_W / 2);
    dragY.setValue(pageY - CARD_H / 2);
    dragOpacity.setValue(1);
    Animated.spring(dragScale, { toValue: 1.15, friction: 6, useNativeDriver: true }).start();
    playSound('tap');
    setSelected(null);
  }, [gs.columns]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: () => !!dragRef.current.card,
    onPanResponderMove: (_, gestureState) => {
      if (!dragRef.current.card) return;
      dragX.setValue(dragRef.current.startX + gestureState.dx - CARD_W / 2);
      dragY.setValue(dragRef.current.startY + gestureState.dy - CARD_H / 2);
    },
    onPanResponderRelease: (_, gestureState) => {
      if (!dragRef.current.card) return;
      const dropX = dragRef.current.startX + gestureState.dx;
      const dropY = dragRef.current.startY + gestureState.dy;
      handleDrop(dragRef.current, dropX, dropY);
    },
    onPanResponderTerminate: () => {
      cancelDrag();
    },
  })).current;

  const cancelDrag = useCallback(() => {
    Animated.timing(dragOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setDragCard(null);
      dragRef.current = { card: null, source: null, sourceIndex: null, isLast: false, startX: 0, startY: 0 };
      dragScale.setValue(1);
    });
  }, []);

  const handleDrop = useCallback((dragInfo, dropX, dropY) => {
    const { card, source, sourceIndex, stackCards } = dragInfo;
    const stack = stackCards || [card];

    // Check slots (foundation) — top area
    if (dropY < 380) {
      const slotWidth = (SW - 20) / gs.slots.length;
      const slotIdx = Math.floor((dropX - 10) / slotWidth);
      if (slotIdx >= 0 && slotIdx < gs.slots.length) {
        placeCard(card, source, sourceIndex, slotIdx);
        cancelDrag();
        return;
      }
    }

    // Check columns — bottom area
    const colWidth = (SW - 20) / COL_COUNT;
    const colIdx = Math.floor((dropX - 10) / colWidth);
    if (colIdx >= 0 && colIdx < gs.columns.length) {
      if (stack.length > 1) {
        moveStackToColumn(stack, source, sourceIndex, colIdx);
      } else {
        moveToColumn(card, source, sourceIndex, colIdx);
      }
      cancelDrag();
      return;
    }

    cancelDrag();
    setFeedback(t.cantPlace);
  }, [gs.slots, gs.columns, placeCard, moveToColumn, moveStackToColumn, cancelDrag]);

  // Play win/lose sounds
  useEffect(() => {
    if (gs.isComplete) playSound('win');
    else if (gs.isFailed) playSound('lose');
  }, [gs.isComplete, gs.isFailed]);

  // Load progress
  useEffect(() => {
    loadProgress().then(async (p) => {
      setCoins(p.coins || 0);
      if (!params.level) setLevelId(p.currentLevel || 1);
      if ((p.currentLevel || 1) === 1 && !isDaily) setShowTutorial(true);
      if (!isDaily) {
        try {
          const { loadSavedGame } = require('../src/utils/storage');
          const saved = await loadSavedGame();
          if (saved && saved.levelId === (parseInt(params.level) || p.currentLevel) && !saved.isComplete && !saved.isFailed) {
            setGs(saved);
          }
        } catch (e) {}
      }
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
    if (!gs.isComplete && !gs.isFailed && !isDaily) {
      saveSavedGame({ ...gs, levelId });
    }
  }, [gs]);

  useEffect(() => { if (feedback) { const tmr = setTimeout(() => setFeedback(''), 2500); return () => clearTimeout(tmr); } }, [feedback]);

  // Clear hint after 2s
  useEffect(() => {
    if (hintCard) {
      const tmr = setTimeout(() => { setHintCard(null); setHintSlot(null); }, 2500);
      return () => clearTimeout(tmr);
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
    if (gs.slots[slotIndex].locked) { setFeedback(t.isLocked); return; }

    setGs((prev) => {
      const newSlots = prev.slots.map((sl) => ({ ...sl, placedCards: [...sl.placedCards] }));
      const target = newSlots[slotIndex];

      if (!target.category && card.type === 'category') {
        target.category = card;
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        setHistory((h) => [...h, prev]);
        
        setTimeout(() => playSound('flip'), 10);
        setCombo((c) => c + 1);
        const comboBonus = combo * 5;
        showScorePopup('+' + (5 + comboBonus));
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5 + comboBonus, isFailed: prev.moves - 1 <= 0 };
      }
      if (!target.category && card.type === 'word') { setFeedback(t.putCategoryFirst); return prev; }
      if (target.category && card.type === 'category') { setFeedback(t.alreadyFull); return prev; }
      if (target.category && card.type === 'word') {
        if (card.categoryIndex !== target.category.categoryIndex) {
          setTimeout(() => { Vibration.vibrate(100); playSound('wrong'); }, 10);
          triggerShake(slotIndex);
          setFeedback(t.wrongPlace);
          setCombo(0);
          return { ...prev, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
        }

        // Collect ALL same-category cards from source column (both directions)
        const cardsToPlace = [card];

        if (source === 'column' && sourceIndex !== null && sourceIndex !== undefined) {
          const col = prev.columns[sourceIndex];
          const colCards = col ? col.cards : [];
          const cardIdx = colCards.findIndex((c) => c.id === card.id);
          
          // Scan UPWARD (cards above selected)
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
          // Scan DOWNWARD (cards below selected)
          if (cardIdx < colCards.length - 1) {
            for (let k = cardIdx + 1; k < colCards.length; k++) {
              const below = colCards[k];
              if (!below.faceUp) break;
              if (below.type !== 'word') break;
              if (below.categoryIndex !== card.categoryIndex) break;
              if (cardsToPlace.length + target.placedCards.length >= target.category.totalWords) break;
              cardsToPlace.push(below);
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
        let newCompletedCats = prev.completedCats || 0;

        if (catCompleted) {
          newCompletedCats++;
          // Clear the slot — make it available for the next category
          setTimeout(() => {
            setGs((g) => {
              const cleared = g.slots.map((sl, idx) => {
                if (idx === slotIndex && sl.category && sl.placedCards.length >= sl.category.totalWords) {
                  return { ...sl, category: null, placedCards: [], locked: false };
                }
                return sl;
              });
              return { ...g, slots: cleared };
            });
          }, 300); // Hızlı boşalt
        }

        const isComplete = newCompletedCats >= level.categories.length;
        setHistory((h) => [...h, prev]);

        if (catCompleted && !isComplete) {
          setFeedback('🎉 ' + target.category.word + t.categoryComplete);
          setTimeout(() => playSound('complete'), 10);
          // Sparkle effect on completed slot
          const slotWidth = (SW - 20) / gs.slots.length;
          setSparkle({ x: slotWidth * slotIndex + slotWidth / 2 + 10, y: SH * 0.55 });
          showScorePopup('🎉 +25');
        } else if (totalPlaced > 1) {
          
          setTimeout(() => playSound('correct'), 10);
        } else {
          
          setTimeout(() => playSound('correct'), 10);
        }
        const catBonus = catCompleted ? 25 : 0;
        setCombo((c) => c + totalPlaced);
        const comboBonus = combo * 5;
        showScorePopup('+' + ((totalPlaced * 10) + catBonus + comboBonus));
        if (combo >= 3) setFeedback('🔥 ' + combo + 'x Combo! +' + comboBonus);
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + (totalPlaced * 10) + catBonus + comboBonus, completedCats: newCompletedCats, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
  }, [gs.slots, level.categories.length]);

  const moveToColumn = useCallback((card, source, sourceIndex, targetColIndex) => {
    if (source === 'column' && sourceIndex === targetColIndex) return;
    setGs((prev) => {
      const targetCol = prev.columns[targetColIndex];
      if (targetCol.locked) { setFeedback(t.isLocked); return prev; }
      if (targetCol.cards.length > 0) {
        const bottomCard = targetCol.cards[targetCol.cards.length - 1];
        if (!bottomCard.faceUp) { setFeedback(t.cantPlace); return prev; }
        // Kelime kartı kategori kartının üstüne konamaz
        if (card.type === 'word' && bottomCard.type === 'category') {
          setFeedback(t.wordOnCategory);
          return prev;
        }
        // Aynı kategorideki kelime kartları üst üste konabilir
        if (card.type === 'word' && bottomCard.type === 'word' && card.categoryIndex !== bottomCard.categoryIndex) {
          setFeedback(t.wrongCategory);
          return prev;
        }
      }
      const ns = removeFromSource(prev, source, sourceIndex, card.id);
      ns.columns = ns.columns.map((col, i) => {
        if (i !== targetColIndex) return col;
        return { ...col, cards: [...col.cards, { ...card, faceUp: true }] };
      });
      setHistory((h) => [...h, prev]);
      
      return ns;
    });
    setSelected(null);
  }, []);

  const handleCardTap = useCallback((card, source, sourceIndex, isLast = true) => {
    if (source === 'column' && !isLast) {
      // Check if this card + all below form a same-category stack
      const col = gs.columns[sourceIndex];
      if (!col) return;
      const cardIdx = col.cards.findIndex((c) => c.id === card.id);
      if (cardIdx < 0) return;
      const stack = col.cards.slice(cardIdx);
      const allValid = stack.every((c) => c.faceUp && c.categoryIndex === card.categoryIndex);
      if (!allValid) {
        setFeedback(t.stackSelectError);
        return;
      }
      // Valid stack — select it
      setSelected({ card, source, sourceIndex, stackCards: stack });
      setFeedback('✋ ' + stack.length + ' kart seçildi → Sütuna veya slot\'a dokun');
      return;
    }
    setSelected((prev) => {
      if (prev && prev.card.id !== card.id && source === 'column') {
        // Move selected card/stack to this column
        if (prev.stackCards && prev.stackCards.length > 1) {
          moveStackToColumn(prev.stackCards, prev.source, prev.sourceIndex, sourceIndex);
        } else {
          moveToColumn(prev.card, prev.source, prev.sourceIndex, sourceIndex);
        }
        return null;
      }
      if (prev && prev.card.id === card.id) { setFeedback(''); return null; }
      
      return { card, source, sourceIndex, stackCards: [card] };
    });
  }, [moveToColumn, moveStackToColumn, gs.columns]);

  // Move entire stack to another column
  const moveStackToColumn = useCallback((stackCards, source, sourceIndex, targetColIndex) => {
    if (source === 'column' && sourceIndex === targetColIndex) return;
    setGs((prev) => {
      const targetCol = prev.columns[targetColIndex];
      if (targetCol.locked) { setFeedback(t.isLocked); return prev; }

      if (targetCol.cards.length > 0) {
        const bottomCard = targetCol.cards[targetCol.cards.length - 1];
        if (!bottomCard.faceUp) { setFeedback(t.cantPlace); return prev; }
        // Kelime kartı kategori kartının üstüne konamaz
        if (stackCards[0].type === 'word' && bottomCard.type === 'category') {
          setFeedback(t.wordOnCategory);
          return prev;
        }
        // Aynı kategorideki kelime kartları üst üste konabilir
        if (stackCards[0].type === 'word' && bottomCard.type === 'word' && stackCards[0].categoryIndex !== bottomCard.categoryIndex) {
          setFeedback(t.wrongCategory);
          return prev;
        }
      }

      const stackIds = new Set(stackCards.map((c) => c.id));
      const newColumns = prev.columns.map((col, i) => {
        if (i === sourceIndex) {
          const remaining = col.cards.filter((c) => !stackIds.has(c.id));
          if (remaining.length > 0 && !remaining[remaining.length - 1].faceUp) {
            remaining[remaining.length - 1] = { ...remaining[remaining.length - 1], faceUp: true };
          }
          return { ...col, cards: remaining };
        }
        if (i === targetColIndex) {
          return { ...col, cards: [...col.cards, ...stackCards.map((c) => ({ ...c, faceUp: true }))] };
        }
        return col;
      });

      setHistory((h) => [...h, prev]);
      
      return { ...prev, columns: newColumns };
    });
    setSelected(null);
  }, []);

  const handleColumnTap = useCallback((colIndex) => {
    if (!selected) return;
    if (selected.stackCards && selected.stackCards.length > 1) {
      moveStackToColumn(selected.stackCards, selected.source, selected.sourceIndex, colIndex);
    } else {
      moveToColumn(selected.card, selected.source, selected.sourceIndex, colIndex);
    }
  }, [selected, moveToColumn, moveStackToColumn]);

  const handleCardLongPress = useCallback((card, source, sourceIndex, isLast, event) => {
    if (!event?.nativeEvent) return;
    const { pageX, pageY } = event.nativeEvent;
    startDrag(card, source, sourceIndex, isLast, pageX, pageY);
  }, [startDrag]);

  const handleSlotTap = useCallback((slotIndex) => {
    if (!selected) { setFeedback(t.selectCardFirst); return; }
    placeCard(selected.card, selected.source, selected.sourceIndex, slotIndex);
    setSelected(null);
  }, [selected, placeCard]);

  const drawCard = useCallback(() => {
    setGs((p) => {
      if (p.deck.length === 0 && p.drawnCards.length === 0) { setFeedback(t.allCardsUsed); return p; }
      if (p.deck.length === 0) {
        const recycled = [...p.drawnCards].reverse().map((c) => ({ ...c, faceUp: false }));
        for (let i = recycled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [recycled[i], recycled[j]] = [recycled[j], recycled[i]];
        }
        setFeedback(t.deckShuffled);
        setTimeout(() => playSound('draw'), 10);
        return { ...p, deck: recycled, drawnCards: [], moves: p.moves - 1, isFailed: p.moves - 1 <= 0 };
      }
      const d = [...p.deck]; const card = { ...d.pop(), faceUp: true };
      
      setTimeout(() => playSound('draw'), 10);
      return { ...p, deck: d, drawnCards: [...p.drawnCards, card], moves: p.moves - 1, isFailed: p.moves - 1 <= 0 };
    });
    setSelected(null);
  }, []);

  const handleDrawnTap = useCallback(() => {
    if (gs.drawnCards.length === 0) { setFeedback(t.selectCardFirst); return; }
    handleCardTap(gs.drawnCards[gs.drawnCards.length - 1], 'drawn', null);
  }, [gs.drawnCards, handleCardTap]);

  const useUndo = useCallback(async () => {
    if (history.length === 0) { setFeedback(t.nothingToUndo); return; }
    setToolModal('undo');
  }, [history]);

  const executeUndo = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 500) { setFeedback('🪙 500 coin gerekli!'); setToolModal(null); return; }
      setCoins(coins - 500); await updateProgress({ coins: coins - 500 });
    }
    // method === 'ad' → free (ad watched)
    if (method === 'ad') await showRewarded();
    setGs(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); setSelected(null);
    setFeedback(t.undone); setToolModal(null);
  }, [history, coins]);

  const useDelete = useCallback(async () => {
    if (gs.drawnCards.length === 0) { setFeedback(t.nothingToDelete); return; }
    setToolModal('delete');
  }, [gs.drawnCards]);

  const executeDelete = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 500) { setFeedback('🪙 500 coin gerekli!'); setToolModal(null); return; }
      setCoins(coins - 500); await updateProgress({ coins: coins - 500 });
    }
    if (method === 'ad') await showRewarded();
    setGs((p) => ({ ...p, drawnCards: p.drawnCards.slice(0, -1), moves: p.moves - 1 })); setSelected(null);
    setFeedback(t.deleted); setToolModal(null);
  }, [gs.drawnCards, coins]);

  // ── Smart Hint ──
  const useHint = useCallback(async () => {
    if (gs.hints > 0) {
      // Free hint available, use directly
      runHintLogic();
      return;
    }
    setToolModal('hint');
  }, [gs]);

  const executeHint = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 500) { setFeedback('🪙 500 coin gerekli!'); setToolModal(null); return; }
      setCoins(coins - 500); await updateProgress({ coins: coins - 500 });
    }
    if (method === 'ad') await showRewarded();
    setGs((prev) => ({ ...prev, hints: prev.hints + 1 }));
    setToolModal(null);
    setTimeout(() => runHintLogic(), 100);
  }, [coins]);

  const runHintLogic = useCallback(() => {

    // 1. Find playable cards (all face-up in columns + top of drawn)
    const playable = [];
    gs.columns.forEach((col, ci) => {
      if (col.locked || col.cards.length === 0) return;
      // Check all face-up cards from bottom to top
      for (let k = col.cards.length - 1; k >= 0; k--) {
        const card = col.cards[k];
        if (!card.faceUp) break;
        playable.push({ card, source: 'column', sourceIndex: ci });
      }
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
    setFeedback(t.noHintFound);
    setGs((prev) => ({ ...prev, hints: prev.hints - 1 }));
  }, [gs]);

  const resetGame = useCallback(() => {
    const newLevel = isDaily ? getDailyChallenge(gameLang) : getLevel(levelId, gameLang);
    setGs(generateGameState(newLevel)); setHistory([]); setSelected(null);
    setHintCard(null); setHintSlot(null); setCombo(0);
  }, [levelId, isDaily]);

  const addMovesAd = useCallback(async () => {
    const result = await showRewarded();
    setGs((p) => ({ ...p, moves: p.moves + 20, isFailed: false }));
    setFeedback('⚡ +20!');
  }, []);

  const addMovesCoin = useCallback(async () => {
    if (coins < 500) { setFeedback('🪙 500 coin gerekli!'); return; }
    const newCoins = coins - 500;
    setCoins(newCoins);
    await updateProgress({ coins: newCoins });
    setGs((p) => ({ ...p, moves: p.moves + 20, isFailed: false }));
    setFeedback('⚡ +20! (-500 🪙)');
  }, [coins]);

  // ── Level Complete → save & advance ──
  const handleNextLevel = useCallback(async () => {
    const bonus = Math.floor(8 * (gs.moves / level.moves));
    const prog = await loadProgress();

    if (isDaily) {
      // Daily challenge: 100 coin bonus, mark done, go home
      const newCoins = (prog.coins || 0) + 100 + bonus;
      await updateProgress({
        coins: newCoins,
        totalGames: (prog.totalGames || 0) + 1,
        totalWins: (prog.totalWins || 0) + 1,
        bestScore: Math.max(prog.bestScore || 0, gs.score),
      });
      setCoins(newCoins);
      await markDailyChallengeCompleted();
      router.back();
      return;
    }

    const nextId = levelId + 1;
    const nextLevel = getLevel(nextId, gameLang);
    if (!nextLevel) { router.back(); return; }
    await updateProgress({
      currentLevel: nextId,
      coins: (prog.coins || 0) + 30 + bonus,
      totalGames: (prog.totalGames || 0) + 1,
      totalWins: (prog.totalWins || 0) + 1,
      bestScore: Math.max(prog.bestScore || 0, gs.score),
      streak: (prog.streak || 0) + 1,
    });
    await clearSavedGame();
    // Submit to leaderboard
    try {
      submitScore({
        score: Math.max(prog.bestScore || 0, gs.score),
        level: nextId,
        totalWins: (prog.totalWins || 0) + 1,
        language: gameLang,
      });
    } catch (e) {}
    // Show interstitial ad every 3 levels
    if (nextId % 3 === 0) await showInterstitial();
    setLevelId(nextId);
    setGs(generateGameState(nextLevel));
    setHistory([]); setSelected(null);
    setHintCard(null); setHintSlot(null); setCombo(0);
    setCoins((prog.coins || 0) + 30 + bonus);
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
  const selectedStackIds = selected?.stackCards ? new Set(selected.stackCards.map((c) => c.id)) : null;
  
  // Dynamic card sizing based on actual column count
  const colCount = gs.columns.length;
  const dynCardW = Math.floor((SW - 16 - (colCount - 1) * COL_GAP) / colCount);
  const dynCardH = Math.floor(dynCardW * 1.3);
  const dynOverlap = -Math.floor(dynCardH * 0.75);
  const DCW = Math.floor(dynCardW * 0.88); const DCH = Math.floor(dynCardH * 0.78);
  const dragStackIds = dragCard?.stackCards ? new Set(dragCard.stackCards.map((c) => c.id)) : null;

  // Unlock slot or column (via ad or free)
  const handleUnlock = useCallback(async (type, index) => {
    const result = await showRewarded();
    // Always unlock (rewarded returns success:true in stub)
    if (result.success) {
      setGs((prev) => {
        if (type === 'slot') {
          const newSlots = prev.slots.map((sl, i) => i === index ? { ...sl, locked: false } : sl);
          return { ...prev, slots: newSlots };
        }
        if (type === 'column') {
          const newCols = prev.columns.map((col, i) => i === index ? { ...col, locked: false } : col);
          return { ...prev, columns: newCols };
        }
        return prev;
      });
      setFeedback(t.unlocked);
      playSound('correct');
    }
  }, []);

  return (
    <View style={st.container} {...panResponder.panHandlers}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Sparkle */}
      {sparkle && <SparkleEffect visible={true} x={sparkle.x} y={sparkle.y} />}
      {scorePopups.map((sp) => <ScorePopup key={sp.id} text={sp.text} x={sp.x} y={sp.y} />)}

      <View style={st.header}>
        <View style={st.coinBadge}>
          <Text style={{ fontSize: 14 }}>🪙</Text>
          <Text style={st.coinText}>{coins}</Text>
        </View>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={st.headerTitle}>{isDaily ? '📅 GÜNLÜK' : t.level + ' ' + gs.levelId}</Text>
          {combo >= 2 && <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: fs(11), color: COLORS.coin }}>🔥 {combo}x Combo</Text>}
          {/* Category progress bar */}
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
            {gs.slots.filter(s => !s.locked).map((s, i) => (
              <View key={i} style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: s.category && s.placedCards?.length >= (s.category?.totalWords || 99) ? COLORS.success : s.category ? COLORS.primary + '60' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </View>
        </View>
        <TouchableOpacity style={st.settingsBtn} onPress={() => setPaused(true)}>
          <MaterialIcons name="settings" size={20} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {!!feedback && <View style={st.feedbackBar}><Text style={st.feedbackText}>{feedback}</Text></View>}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} scrollEnabled={!dragCard} ref={scrollRef}>
        <View style={{ height: 20 }} />
        <View style={st.deckRow}>
          <View style={[st.movesPanel, gs.moves <= 5 && { borderColor: COLORS.fail, shadowColor: COLORS.fail, shadowOpacity: 0.6 }]}>
            <Text style={st.movesLabel}>{t.moves}</Text>
            <Text style={[st.movesNum, gs.moves <= 5 && { color: COLORS.fail }]}>{gs.moves}</Text>
            <TouchableOpacity style={st.addBtn} onPress={addMovesAd}><Text style={st.addBtnText}>+20 ▶</Text></TouchableOpacity>
          </View>

          <TouchableOpacity
            style={st.drawnArea}
            onPress={handleDrawnTap}
            onLongPress={(e) => {
              if (gs.drawnCards.length > 0) {
                const card = gs.drawnCards[gs.drawnCards.length - 1];
                handleCardLongPress(card, 'drawn', null, true, e);
              }
            }}
            delayLongPress={200}
            activeOpacity={0.7}
          >
            {gs.drawnCards.length === 0 ? (
              <View style={[st.emptyCard, { width: DCW, height: DCH }]} />
            ) : (
              <View style={{ width: DCW + 40, height: DCH, justifyContent: 'center', alignItems: 'flex-end' }}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => (
                  <View key={card.id} style={{ position: 'absolute', right: (arr.length - 1 - i) * 18, zIndex: i, opacity: i === arr.length - 1 ? 1 : 0.4 }}>
                    <FaceUpCard card={card} selected={i === arr.length - 1 && selId === card.id} hinted={card.id === hintCard} isDragging={card.id === dragCard?.card?.id} w={DCW} h={DCH} />
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
              <FoundationSlot t={t} slot={slot} slotIndex={i} onPress={() => handleSlotTap(i)} onUnlock={handleUnlock} hinted={hintSlot === i} />
            </Animated.View>
          ))}
        </View>

        <View style={st.tableauRow}>
          {gs.columns.map((col, i) => (
            <View key={i} style={{ flex: 1 }}>
              <TableauColumn column={col} colIndex={i} selectedId={selId} selectedStackIds={selectedStackIds} hintedId={hintCard} dragCardId={dragCard?.card?.id} dragStackIds={dragStackIds} onCardTap={handleCardTap} onColumnTap={handleColumnTap} onCardLongPress={handleCardLongPress} onUnlock={handleUnlock} />
            </View>
          ))}
        </View>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Toolbar */}
      <View style={st.toolbar}>
        <ToolBtn icon="lightbulb" label={t.hint} badge={gs.hints > 0 ? gs.hints : '🪙'} badgeColor={gs.hints > 0 ? COLORS.fail : COLORS.coin} onPress={useHint} big />
        <ToolBtn icon="undo" label={t.undo} badge="🪙" badgeColor={COLORS.coin} onPress={useUndo} big />
        <ToolBtn icon="auto-fix-normal" label={t.delete} badge="🪙" badgeColor={COLORS.coin} onPress={useDelete} big />
      </View>

      {/* Ad Banner Space */}
      <View style={st.adBannerSpace} />

      {/* Tool Purchase Modal */}
      {toolModal && (
        <View style={ov.overlay}>
          <View style={[ov.card, { paddingTop: 20, paddingBottom: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.onSurface }}>
                {toolModal === 'hint' ? t.hint : toolModal === 'undo' ? t.undo : t.delete}
              </Text>
              <TouchableOpacity onPress={() => setToolModal(null)}><Text style={{ fontSize: 22, color: COLORS.fail }}>✕</Text></TouchableOpacity>
            </View>
            <View style={{ backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 20, alignItems: 'center', width: '100%', marginBottom: 16 }}>
              <MaterialIcons name={toolModal === 'hint' ? 'lightbulb' : toolModal === 'undo' ? 'undo' : 'auto-fix-normal'} size={48} color={COLORS.secondary} />
              <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                {toolModal === 'hint' ? (t.hintDesc || 'Doğru hamleyi göster') : toolModal === 'undo' ? (t.undoDesc || 'Önceki adımı geri al') : (t.deleteDesc || 'Bir kartı sil')}
              </Text>
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: COLORS.coin, borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%', marginBottom: 10 }} 
              onPress={() => { const fn = toolModal === 'hint' ? executeHint : toolModal === 'undo' ? executeUndo : executeDelete; fn('coin'); }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#000' }}>🪙 500</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' }} 
              onPress={() => { const fn = toolModal === 'hint' ? executeHint : toolModal === 'undo' ? executeUndo : executeDelete; fn('ad'); }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' }}>▶ AD Kullan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tutorial */}
      {showTutorial && (
        <View style={ov.overlay}>
          <LinearGradient colors={['rgba(21,6,41,0.92)', 'rgba(61,53,96,0.92)']} style={StyleSheet.absoluteFillObject} />
          <View style={ov.card}>
            <Image source={OWL_HAPPY} style={{ width: 100, height: 100, borderRadius: 16, marginBottom: 12 }} />
            <Text style={[ov.title, { fontSize: 24 }]}>{t.howToPlay}</Text>
            <View style={s_tut.steps}>
              <TutStep n="1" text={t.tutStep1} icon="touch-app" />
              <TutStep n="2" text={t.tutStep2} icon="style" />
              <TutStep n="3" text={t.tutStep3} icon="category" />
              <TutStep n="4" text={t.tutStep4} icon="emoji-events" />
            </View>
            <TouchableOpacity onPress={() => setShowTutorial(false)} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={[ov.nextBtn, { paddingHorizontal: 48 }]}>
                <Text style={ov.nextBtnText}>{t.start}</Text>
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
            <Text style={[ov.title, { fontSize: 28, marginBottom: 4 }]}>{t.paused}</Text>
            <Text style={[ov.subtitle, { marginBottom: 24 }]}>{t.level} {gs.levelId}</Text>

            <TouchableOpacity style={ov.pauseBtn} onPress={() => setPaused(false)} activeOpacity={0.7}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={ov.pauseBtnInner}>
                <MaterialIcons name="play-arrow" size={24} color="#fff" />
                <Text style={ov.pauseBtnText}>{t.resume}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={ov.pauseSecBtn} onPress={() => { setPaused(false); resetGame(); }} activeOpacity={0.7}>
              <MaterialIcons name="refresh" size={20} color={COLORS.secondary} />
              <Text style={ov.pauseSecText}>{t.restart}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ov.pauseSecBtn} onPress={() => router.push('/settings')} activeOpacity={0.7}>
              <MaterialIcons name="settings" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={ov.pauseSecText}>{t.settings}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ov.pauseSecBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <MaterialIcons name="home" size={20} color={COLORS.onSurfaceVariant} />
              <Text style={ov.pauseSecText}>{t.home}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Overlays */}
      {gs.isComplete && (
        <>
          <ConfettiEffect />
          <LevelCompleteOverlay t={t} score={gs.score} coins={isDaily ? 100 : 30} movesLeft={gs.moves} maxMoves={level.moves} levelId={gs.levelId} combo={combo} isDaily={isDaily} onNext={handleNextLevel} onReplay={handleReplay} onHome={handleHome} />
        </>
      )}
      {gs.isFailed && !gs.isComplete && (
        <LevelFailedOverlay t={t} levelId={gs.levelId} onAddMovesAd={addMovesAd} onAddMovesCoin={addMovesCoin} onReplay={handleReplay} onHome={handleHome} />
      )}

      {/* Floating drag card */}
      {dragCard && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', zIndex: 99999,
            left: dragX, top: dragY,
            opacity: dragOpacity,
            transform: [{ scale: dragScale }],
          }}
        >
          <FaceUpCard card={dragCard.card} selected={true} />
          {dragCard.stackCards && dragCard.stackCards.length > 1 && (
            <View style={{ position: 'absolute', top: -10, right: -10, backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#fff' }}>{dragCard.stackCards.length}</Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function TutStep({ n, text, icon }) {
  const { t } = useLang();
  return (
    <View style={s_tut.step}>
      <View style={s_tut.stepIcon}>
        <MaterialIcons name={icon} size={18} color={COLORS.secondary} />
      </View>
      <View style={s_tut.stepContent}>
        <Text style={s_tut.stepNum}>{t.step} {n}</Text>
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
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ])).start();
  }, []);
  const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  return (
    <View style={st.toolWrap}>
      <Animated.View style={{ transform: [{ scale: glowScale }], opacity: glowOpacity }}>
        <TouchableOpacity style={[st.toolBtn, big && st.toolBtnBig]} onPress={onPress} activeOpacity={0.6}>
          <MaterialIcons name={icon} size={big ? 26 : 22} color="#fff" />
          {badge !== undefined && <View style={[st.toolBdg, { backgroundColor: badgeColor }]}><Text style={st.toolBdgText}>{badge}</Text></View>}
        </TouchableOpacity>
      </Animated.View>
      {!!label && <Text style={st.toolLabel}>{label}</Text>}
    </View>
  );
}

/* ── Overlay Styles ── */
const ov = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  card: { width: SW - 48, backgroundColor: COLORS.surfaceContainerHigh, borderRadius: 28, paddingTop: 16, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },
  owl: { width: 100, height: 100, borderRadius: 16, marginBottom: 8 },
  title: { fontFamily: FONTS.headlineBlack, fontSize: 36, color: COLORS.onSurface, fontStyle: 'italic' },
  subtitle: { fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.secondary, letterSpacing: 3, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  statBox: { flex: 1, backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 16, alignItems: 'center' },
  statLabel: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  statValue: { fontFamily: FONTS.headlineBlack, fontSize: 28, color: COLORS.onSurface, marginTop: 4 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 40, borderRadius: SIZES.radiusFull, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 8 },
  nextBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  replayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: SIZES.radiusFull, borderWidth: 1.5, borderColor: COLORS.secondary },
  replayText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.secondary },
  homeBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },
  speechBubble: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  speechText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, fontStyle: 'italic' },
  failTitle: { fontFamily: FONTS.headlineBlack, fontSize: 32, color: COLORS.onSurface, marginBottom: 4 },
  failSub: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 20, textAlign: 'center' },
  addMovesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24, borderRadius: SIZES.radiusFull, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 14, elevation: 8 },
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 50, paddingBottom: 4, backgroundColor: COLORS.headerBg, zIndex: 50 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.panelBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, borderWidth: 1, borderColor: COLORS.panelBorder },
  coinText: { fontFamily: FONTS.headline, fontSize: 13, color: COLORS.onSurface },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff', letterSpacing: 1 },
  settingsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  feedbackBar: { position: 'absolute', top: 90, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 10, paddingHorizontal: 16, zIndex: 200, borderRadius: 12, alignSelf: 'center' },
  feedbackText: { fontFamily: FONTS.headline, fontSize: 13, color: '#fff', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 8, paddingTop: 2, gap: 6 },
  deckRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  movesPanel: { backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.panelBorder, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 60, shadowColor: '#9B7DFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8 },
  movesLabel: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  movesNum: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: '#fff', lineHeight: 26 },
  addBtn: { backgroundColor: COLORS.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, marginTop: 2 },
  addBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  drawnArea: { flex: 1, justifyContent: 'center', alignItems: 'flex-end', minHeight: 66, paddingRight: 6 },
  emptyCard: { borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.panelBorder, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  deckBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.primary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 3 },
  deckBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff' },
  faceDown: { borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.cardBackBorder, overflow: 'hidden', shadowColor: COLORS.cardBackTop, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  innerFrame: { flex: 1, margin: 3, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  innerFrameInner: { width: '60%', height: '60%', borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  faceUp: { borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.cardBorder, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 2.5, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 14, elevation: 10, transform: [{ scale: 1.05 }] },
  cardHinted: { borderColor: COLORS.coin, borderWidth: 2.5, shadowColor: COLORS.coin, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 16, elevation: 12, transform: [{ scale: 1.08 }] },
  catCardBorder: { borderColor: COLORS.cardBackBorder, borderWidth: 2, shadowColor: COLORS.cardBackTop, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  word: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#1e293b', textAlign: 'center', lineHeight: 13 },
  catBadge: { position: 'absolute', top: 3, right: 4, backgroundColor: COLORS.cardBackTop, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
  catBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  catName: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#1e293b', textAlign: 'center', lineHeight: 13, marginTop: 1 },
  slotsRow: { flexDirection: 'row', gap: 2 },
  slotBox: { borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slotDashed: { borderColor: COLORS.panelBorder, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)' },
  slotHinted: { borderColor: COLORS.coin, borderWidth: 2.5, shadowColor: COLORS.coin, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 14 },
  lockedText: { fontFamily: FONTS.headlineBlack, fontSize: 6, color: 'rgba(255,255,255,0.3)' },
  adBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  slotTag: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 2, alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  slotTagText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  tableauRow: { flexDirection: 'row', gap: COL_GAP, alignItems: 'flex-start', marginTop: 2 },
  toolbar: { position: 'absolute', bottom: 70, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 16, paddingVertical: 8, paddingHorizontal: 20, zIndex: 100 },
  toolWrap: { alignItems: 'center', gap: 3 },
  toolBtn: { width: 52, height: 52, borderRadius: 15, backgroundColor: COLORS.buttonBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(140,180,255,0.3)', shadowColor: '#6B8AFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  toolBtnBig: { width: 62, height: 62, borderRadius: 18, backgroundColor: COLORS.buttonBlue, shadowColor: '#6B8AFF', shadowOpacity: 0.6, shadowRadius: 14, elevation: 10 },
  toolBdg: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 4 },
  toolBdgText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  toolLabel: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  adBannerSpace: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 99 },
});
