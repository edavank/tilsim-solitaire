import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Vibration, Image, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, SIZES, CATEGORY_COLORS } from '../src/constants/theme';
import { generateGameState, getLevel } from '../src/data/levels';
import { loadProgress, updateProgress, clearSavedGame, saveSavedGame, saveLevelStars, addXP } from '../src/utils/storage';
import { playSound } from '../src/utils/sounds';
import { showRewarded, showInterstitial } from '../src/utils/ads';
import { useLang } from '../src/context/LanguageContext';
import { submitScore } from '../src/utils/leaderboardService';
import { getDailyChallenge, markDailyChallengeCompleted } from '../src/utils/dailyChallenge';
import { checkAchievements, ACHIEVEMENT_I18N } from '../src/utils/achievements';
import { markCategoryCompleted } from '../src/utils/collection';
// seasonalEvents kaldırıldı

import { IS_TABLET, fs, getGameLayout } from '../src/utils/responsive';

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

/* ── Initial Layout Constants (for max 5 columns) ── */
const _layout = getGameLayout();
const SW = _layout.sw;
const SH = _layout.sh;
const COL_COUNT = 5;
const COL_GAP = IS_TABLET ? 5 : 3;
const GAME_PAD = 10; // Sağ/sol eşit padding — tüm satırlar aynı kılavuz
const CARD_W = Math.floor((SW - GAME_PAD * 2 - (COL_COUNT - 1) * COL_GAP) / COL_COUNT);
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
const FaceDownCard = React.memo(function FaceDownCard({ w, h }) {
  const cb = COLORS.cardBackTop;
  const accent = '#9B7DFF';
  return (
    <LinearGradient colors={[cb, cb]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[st.faceDown, { width: w || '100%', height: h || CARD_H, borderWidth: 1, borderColor: accent + '40' }]}>
      <View style={[st.innerFrame, { borderColor: accent + '30' }]}><View style={[st.innerFrameInner, { borderColor: accent + '20' }]} /></View>
    </LinearGradient>
  );
});

const FaceUpCard = React.memo(function FaceUpCard({ card, selected, w, h, hinted, isDragging }) {
  const cw = w || '100%'; const ch = h || CARD_H;
  const isCat = card.type === 'category';
  const isJoker = card.isJoker;
  const catColor = isJoker ? '#FFD166' : CATEGORY_COLORS[card.categoryIndex % CATEGORY_COLORS.length];
  const bg = '#FFFFFF';
  const txt = '#1e293b';
  const bdr = 'rgba(155,125,255,0.15)';
  const accent = '#9B7DFF';
  const catEmojiSize = 26;
  const wordEmojiSize = 22;
  const catTextSize = 10;
  const wordTextSize = 10;
  return (
    <View style={[st.faceUp, { width: cw, height: ch, backgroundColor: bg, borderColor: bdr, borderWidth: 1.5, borderBottomWidth: isCat ? 0 : 3, borderBottomColor: catColor, shadowColor: accent, shadowOpacity: 0.15, shadowRadius: 4 }, selected && st.cardSelected, isCat && st.catCardBorder, isJoker && { borderColor: '#FFD166', borderWidth: 2, shadowColor: '#FFD166', shadowOpacity: 0.8, shadowRadius: 12, backgroundColor: '#FFFBF0' }, hinted && st.cardHinted, isDragging && { opacity: 0.3 }]}>
      {isCat ? (
        <>
          <View style={st.catBadge}><Text style={st.catBadgeText}>0/{card.totalWords}</Text></View>
          <Text style={{ fontSize: catEmojiSize, textAlign: 'center' }}>{card.emoji}</Text>
          <Text style={[st.catName, { fontSize: catTextSize, color: txt }]} numberOfLines={1} ellipsizeMode="tail">{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: wordEmojiSize, textAlign: 'center' }}>{card.emoji}</Text>
          <Text style={[st.word, { fontSize: wordTextSize, color: isJoker ? '#B8860B' : txt }]} numberOfLines={1} ellipsizeMode="tail">{card.word}</Text>
          {!isJoker && <View style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: catColor }} />}
        </>
      )}
    </View>
  );
});

function FoundationSlot({ t, slot, slotIndex, onPress, onUnlock, hinted }) {
  const h = CARD_H * 0.72;
  const slotBdr = 'rgba(183,148,246,0.3)';
  const slotBgC = 'rgba(124,92,252,0.05)';
  const cardBg = '#fff';
  const cardTxt = '#1e293b';
  if (slot.locked) {
    return (
      <View style={[st.slotBox, { height: h, borderColor: slotBdr, borderStyle: 'dashed', backgroundColor: slotBgC }]}>
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
      <TouchableOpacity style={[st.slotBox, { height: h, borderColor: isDone ? COLORS.success : clr, borderStyle: 'solid', backgroundColor: isDone ? '#f0fff0' : cardBg }, hinted && st.slotHinted]} onPress={onPress} activeOpacity={0.7}>
        <View style={[st.slotTag, { backgroundColor: isDone ? COLORS.success : clr }]}>
          {isDone ? <MaterialIcons name="check" size={10} color="#fff" /> : <Text style={st.slotTagText}>{p}/{tw}</Text>}
        </View>
        {isDone ? (
          <MaterialIcons name="check-circle" size={16} color={COLORS.success} style={{ marginTop: 8 }} />
        ) : (
          <Text style={{ fontSize: 18, marginTop: 8 }}>{slot.category.emoji}</Text>
        )}
        <Text style={[st.word, { fontSize: 9, marginTop: 2, color: isDone ? COLORS.success : cardTxt }]} numberOfLines={1} ellipsizeMode="tail">{slot.category.word}</Text>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity style={[st.slotBox, { height: h, borderColor: slotBdr, borderStyle: 'dashed', backgroundColor: slotBgC }, hinted && st.slotHinted]} onPress={onPress} activeOpacity={0.7}>
      <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{t.empty}</Text>
    </TouchableOpacity>
  );
}

const TableauColumn = React.memo(function TableauColumn({ column, colIndex, selectedId, selectedStackIds, hintedId, onCardTap, onColumnTap, onUnlock, onDragStart, onDragMove, onDragEnd, onScrollLock, onCancelDrag }) {
  const touchRef = useRef({ card: null, startX: 0, startY: 0, moved: false });
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
              <View
                onStartShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                  // Önceki drag kalmışsa temizle
                  if (touchRef.current.moved) onDragEnd?.(0, 0);
                  const { pageX, pageY } = e.nativeEvent;
                  touchRef.current = { card, colIndex, isLast, startX: pageX, startY: pageY, moved: false };
                  onScrollLock?.(true);
                }}
                onResponderMove={(e) => {
                  const t = touchRef.current;
                  if (!t.card) return;
                  const { pageX, pageY } = e.nativeEvent;
                  if (!t.moved && (Math.abs(pageX - t.startX) + Math.abs(pageY - t.startY)) > 5) {
                    t.moved = true;
                    onDragStart?.(t.card, 'column', t.colIndex, t.isLast, t.startX, t.startY);
                  }
                  if (t.moved) onDragMove?.(pageX, pageY);
                }}
                onResponderRelease={(e) => {
                  if (touchRef.current.moved) {
                    onDragEnd?.(e.nativeEvent.pageX, e.nativeEvent.pageY);
                  } else {
                    onCardTap(card, 'column', colIndex, isLast);
                  }
                  touchRef.current = { card: null, startX: 0, startY: 0, moved: false };
                  onScrollLock?.(false);
                }}
                onResponderTerminationRequest={() => !touchRef.current.moved}
                onResponderTerminate={() => {
                  if (touchRef.current.moved) onCancelDrag?.();
                  touchRef.current = { card: null, startX: 0, startY: 0, moved: false };
                  onScrollLock?.(false);
                }}
              >
                <FaceUpCard card={card} selected={selectedId === card.id || (selectedStackIds && selectedStackIds.has(card.id))} hinted={isHinted} isDragging={false} />
              </View>
            ) : (
              <FaceDownCard />
            )}
          </View>
        );
      })}
    </View>
  );
});

/* ── Win Overlay ── */
function LevelCompleteOverlay({ t, score, coins, movesLeft, maxMoves, levelId, combo, isDaily, elapsedTime, onNext, onReplay, onHome }) {
  const moveBonus = Math.floor(8 * (movesLeft / maxMoves));
  const speedBonus = elapsedTime < 60 ? 20 : elapsedTime < 120 ? 10 : elapsedTime < 180 ? 5 : 0;
  const totalCoins = coins + moveBonus + speedBonus;
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
        {combo > 0 && <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 12, color: COLORS.tertiary, marginBottom: 4 }}>🔥 Max Combo: {combo}x</Text>}
        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant, marginBottom: 8 }}>⏱ {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}{speedBonus > 0 ? ' ⚡ Hız Bonusu!' : ''}</Text>
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
            {(moveBonus > 0 || speedBonus > 0) && <Text style={{ fontFamily: FONTS.body, fontSize: 9, color: COLORS.onSurfaceVariant, marginTop: 2 }}>({coins}{moveBonus > 0 ? ' +' + moveBonus + ' hamle' : ''}{speedBonus > 0 ? ' +' + speedBonus + ' hız' : ''})</Text>}
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
function LevelFailedOverlay({ t, levelId, onAddMovesAd, onAddMovesCoin, onShuffle, onReplay, onHome }) {
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
        <TouchableOpacity onPress={onShuffle} activeOpacity={0.85} style={{ marginTop: 8, width: '100%' }}>
          <View style={[ov.addMovesBtn, { backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 9999 }]}>
            <MaterialIcons name="shuffle" size={18} color={COLORS.secondary} />
            <Text style={[ov.addMovesText, { color: COLORS.secondary }]}>{t.shuffle || 'Karıştır'}</Text>
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
  const [dailyDate, setDailyDate] = useState(params.dailyDate || null);
  const [isTimed, setIsTimed] = useState(params.timed === '1');
  // Zamanlı mod: bölüme göre süre (saniye) — bölüm arttıkça azalır
  const getTimedSeconds = (lvl) => Math.max(60, 180 - (lvl - 1) * 3);
  const [timeRemaining, setTimeRemaining] = useState(() => getTimedSeconds(parseInt(params.level) || 1));

  // Sync game language with context
  useEffect(() => { setGameLang(lang); }, [lang]);
  const level = isDaily
    ? getDailyChallenge(gameLang, params.dailySeed ? parseInt(params.dailySeed) : undefined)
    : (getLevel(levelId, gameLang) || getLevel(1, gameLang));
  const [gs, setGs] = useState(() => {
    const state = generateGameState(level);
    if (params.timed === '1') state.moves = 9999;
    return state;
  });
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [history, setHistory] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef(Date.now());
  const [hintCard, setHintCard] = useState(null);
  const [hintSlot, setHintSlot] = useState(null);
  const [sparkle, setSparkle] = useState(null);
  const [coins, setCoins] = useState(500);
  const [combo, setCombo] = useState(0);
  const comboRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [shakeSlotIdx, setShakeSlotIdx] = useState(-1);
  const [showTutorial, setShowTutorial] = useState(false);
  const [toolModal, setToolModal] = useState(null); // 'hint' | 'undo' | 'delete' | 'joker' | 'shuffle'
  const [toolCredits, setToolCredits] = useState({ hint: 0, joker: 0, shuffle: 0, undo: 0, delete: 0 });
  const [unlockedTools, setUnlockedTools] = useState([]);
  const [toolIntro, setToolIntro] = useState(null); // { tool, icon, title, desc }
  const [dailyIntro, setDailyIntro] = useState(false);
  const [timedIntro, setTimedIntro] = useState(false);
  const [scorePopups, setScorePopups] = useState([]); // [{id, text, x, y}]
  const [achievementPopup, setAchievementPopup] = useState(null); // { icon, title }
  
  // Araç açılma sırası
  const TOOL_UNLOCK = { hint: 2, undo: 3, joker: 5, shuffle: 7, delete: 10 };
  const TOOL_INFO = {
    hint: { icon: 'lightbulb', title: t.toolUnlockedHint || 'İpucu Açıldı!', desc: t.toolDescHint || 'Doğru hamleyi gösterir. 3 adet hediye!' },
    undo: { icon: 'undo', title: t.toolUnlockedUndo || 'Geri Al Açıldı!', desc: t.toolDescUndo || 'Son hamleyi geri alır. 3 adet hediye!' },
    joker: { icon: 'style', title: t.toolUnlockedJoker || 'Joker Açıldı!', desc: t.toolDescJoker || 'Kartı jokere çevirir. 3 adet hediye!' },
    shuffle: { icon: 'shuffle', title: t.toolUnlockedShuffle || 'Karıştır Açıldı!', desc: t.toolDescShuffle || 'Kartları karıştırır. 3 adet hediye!' },
    delete: { icon: 'auto-fix-normal', title: t.toolUnlockedDelete || 'Sil Açıldı!', desc: t.toolDescDelete || 'Kartı siler. 3 adet hediye!' },
  };
  
  const isToolUnlocked = useCallback((tool) => {
    return unlockedTools.includes(tool) || levelId >= TOOL_UNLOCK[tool];
  }, [unlockedTools, levelId]);
  
  const showScorePopup = useCallback((text, x, y) => {
    const id = Date.now() + Math.random();
    setScorePopups((prev) => [...prev.slice(-5), { id, text, x: x || SW / 2, y: y || 200 }]);
    setTimeout(() => setScorePopups((prev) => prev.filter((p) => p.id !== id)), 1000);
  }, []);
  
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── Drag & Drop System ──
  const dragCardRef = useRef(null);
  const [, forceRender] = useState(0); // floating kart içeriği için
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragOpacity = useRef(new Animated.Value(0)).current;
  const dropZones = useRef([]); // [{ type: 'slot'|'column', index, x, y, w, h }]
  const dragRef = useRef({ card: null, source: null, sourceIndex: null, isLast: false, startX: 0, startY: 0 });
  const scrollRef = useRef(null);
  const saveTimerRef = useRef(null);
  const drawnTouchRef = useRef({ startX: 0, startY: 0, moved: false });
  const slotsRowY = useRef({ top: 0, bottom: 0 });
  const tableauRowY = useRef({ top: 0, bottom: 0 });
  const scrollOffsetRef = useRef(0);
  const startDragRef = useRef(null);
  const cancelDragRef = useRef(null);
  const handleDropRef = useRef(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const scrollLockedRef = useRef(false);
  const lockScroll = useCallback((val) => { scrollLockedRef.current = val; setScrollLocked(val); }, []);

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
    dragCardRef.current = { card, source, sourceIndex, isLast, stackCards };
    forceRender(v => v + 1); // floating kart içeriğini güncelle
    dragX.setValue(pageX - CARD_W / 2);
    dragY.setValue(pageY - CARD_H / 2);
    dragOpacity.setValue(1);
    dragScale.setValue(1.1);
    // Güvenlik: 3sn sonra hala drag aktifse temizle
    setTimeout(() => { if (dragRef.current.card) cancelDrag(); }, 3000);
    playSound('tap');
    setSelected(null);
  }, [gs.columns]);
  startDragRef.current = startDrag;

  const onDragStart = useCallback((card, source, sourceIndex, isLast, pageX, pageY) => {
    startDragRef.current?.(card, source, sourceIndex, isLast, pageX, pageY);
  }, []);

  const onDragMove = useCallback((pageX, pageY) => {
    if (!dragRef.current.card) return;
    forceRender(v => v + 1); // floating kart içeriğini güncelle
    dragX.setValue(pageX - CARD_W / 2);
    dragY.setValue(pageY - CARD_H / 2);
  }, []);

  const onDragEnd = useCallback((pageX, pageY) => {
    if (!dragRef.current.card) { cancelDragRef.current?.(); return; }
    if (pageX === 0 && pageY === 0) { cancelDragRef.current?.(); return; }
    handleDropRef.current?.(dragRef.current, pageX, pageY);
  }, []);

  const cancelDrag = useCallback(() => {
    dragOpacity.setValue(0);
    dragScale.setValue(1);
    dragCardRef.current = null;
    dragRef.current = { card: null, source: null, sourceIndex: null, isLast: false, startX: 0, startY: 0 };
    lockScroll(false);
    forceRender(v => v + 1);
  }, []);
  cancelDragRef.current = cancelDrag;

  const handleDrop = useCallback((dragInfo, dropX, dropY) => {
    const { card, source, sourceIndex, stackCards } = dragInfo;
    const stack = stackCards || [card];

    // ÖNCE drag'i temizle
    cancelDrag();

    // Scroll offset'i hesapla — layout Y değerleri content-relative, dropY screen-relative
    // Header yüksekliği yaklaşık 70px (paddingTop:62 + içerik)
    const headerH = 70;
    const contentY = dropY - headerH + scrollOffsetRef.current;

    // Slot satırının gerçek Y pozisyonunu kullan
    const slotMid = (slotsRowY.current.top + slotsRowY.current.bottom) / 2;
    const colTop = tableauRowY.current.top;
    
    // Bırakma noktası slot bölgesine mi, sütun bölgesine mi yakın?
    const slotTolerance = CARD_H * 1.5; // Cömert tolerans
    const isNearSlots = slotsRowY.current.bottom > 0 && Math.abs(contentY - slotMid) < slotTolerance;
    const isNearColumns = tableauRowY.current.bottom > 0 && contentY > colTop - CARD_H;

    // En yakın slot/sütun merkezini bul (pixel-perfect değil, cömert)
    const findNearest = (count, startX, totalW) => {
      const w = totalW / count;
      let best = -1, bestD = 9999;
      for (let i = 0; i < count; i++) {
        const center = startX + w * i + w / 2;
        const d = Math.abs(dropX - center);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    };

    // Slot kontrolü
    if (isNearSlots) {
      const idx = findNearest(gs.slots.length, GAME_PAD, SW - GAME_PAD * 2);
      if (idx >= 0) {
        placeCard(card, source, sourceIndex, idx);
        return;
      }
    }

    // Sütun kontrolü
    if (isNearColumns || !isNearSlots) {
      const idx = findNearest(gs.columns.length, GAME_PAD, SW - GAME_PAD * 2);
      if (idx >= 0 && idx < gs.columns.length) {
        if (stack.length > 1) {
          moveStackToColumn(stack, source, sourceIndex, idx);
        } else {
          moveToColumn(card, source, sourceIndex, idx);
        }
        return;
      }
    }

    // Fallback — en yakın sütun
    const idx = findNearest(gs.columns.length, GAME_PAD, SW - GAME_PAD * 2);
    if (stack.length > 1) {
      moveStackToColumn(stack, source, sourceIndex, Math.max(0, idx));
    } else {
      moveToColumn(card, source, sourceIndex, Math.max(0, idx));
    }
  }, [gs.slots, gs.columns, placeCard, moveToColumn, moveStackToColumn, cancelDrag]);
  handleDropRef.current = handleDrop;

  // Timer
  useEffect(() => {
    if (gs.isComplete || gs.isFailed || paused) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      if (isTimed) {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Süre doldu — oyun bitti
            setGs((g) => ({ ...g, isFailed: true }));
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gs.isComplete, gs.isFailed, paused, isTimed]);

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
      // Araç durumlarını yükle
      setUnlockedTools(p.unlockedTools || []);
      setToolCredits(p.toolCredits || { hint: 0, joker: 0, shuffle: 0, undo: 0, delete: 0 });
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
      // Debounced save — her hamlede değil, 2sn'de bir
      if (!saveTimerRef.current) {
        saveTimerRef.current = setTimeout(() => { saveSavedGame({ ...gs, levelId }); saveTimerRef.current = null; }, 2000);
      }
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
        setCombo((c) => { comboRef.current = c + 1; return c + 1; });
        const comboBonus = comboRef.current * 5;
        showScorePopup('+' + (5 + comboBonus));
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5 + comboBonus, isFailed: prev.moves - 1 <= 0 };
      }
      if (!target.category && card.type === 'word') { setFeedback(t.putCategoryFirst); return prev; }
      if (target.category && card.type === 'category') { setFeedback(t.alreadyFull); return prev; }
      if (target.category && card.type === 'word') {
        if (card.categoryIndex !== target.category.categoryIndex && !card.isJoker) {
          setTimeout(() => { Vibration.vibrate(100); playSound('wrong'); }, 10);
          triggerShake(slotIndex);
          setFeedback(t.wrongPlace);
          setCombo(0); comboRef.current = 0;
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
          try { markCategoryCompleted(target.category.word); } catch (e) {}
          setTimeout(() => playSound('complete'), 10);
          // Sparkle effect on completed slot
          const slotWidth = (SW - GAME_PAD * 2) / gs.slots.length;
          setSparkle({ x: slotWidth * slotIndex + slotWidth / 2 + 10, y: SH * 0.55 });
          showScorePopup('🎉 +25');
        } else if (totalPlaced > 1) {
          
          setTimeout(() => playSound('correct'), 10);
        } else {
          
          setTimeout(() => playSound('correct'), 10);
        }
        const catBonus = catCompleted ? 25 : 0;
        setCombo((c) => c + totalPlaced);
        const comboBonus = comboRef.current * 5;
        showScorePopup('+' + ((totalPlaced * 10) + catBonus + comboBonus));
        if (combo >= 3) setFeedback('🔥 ' + combo + 'x Combo! +' + comboBonus);
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + (totalPlaced * 10) + catBonus + comboBonus, completedCats: newCompletedCats, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
  }, [gs.slots, level.categories.length]);

  const moveToColumn = useCallback((card, source, sourceIndex, targetColIndex) => {
    if (source === 'column' && sourceIndex === targetColIndex) return;
    // Kategori kartları sütuna KONAMAZ — AMA boş sütuna park edilebilir
    if (card.type === 'category') {
      setGs((prev) => {
        const targetCol = prev.columns[targetColIndex];
        if (targetCol.locked) { setFeedback(t.isLocked); return prev; }
        // Sadece BOŞ sütuna park edilebilir
        if (targetCol.cards.length > 0) {
          setFeedback('📂 Kategori kartı sadece boş sütuna konabilir!');
          return prev;
        }
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        ns.columns = ns.columns.map((col, i) => {
          if (i !== targetColIndex) return col;
          return { ...col, cards: [{ ...card, faceUp: true }] };
        });
        setHistory((h) => [...h, prev]);
        return { ...ns, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
      });
      setSelected(null);
      return;
    }
    setGs((prev) => {
      const targetCol = prev.columns[targetColIndex];
      if (targetCol.locked) { setFeedback(t.isLocked); return prev; }
      
      if (targetCol.cards.length > 0) {
        const topCard = targetCol.cards[targetCol.cards.length - 1];
        if (!topCard.faceUp) { setFeedback(t.cantPlace); return prev; }
        // KURAL: Sadece AYNI KATEGORİ üst üste gelebilir (solitaire renk kuralı gibi)
        if (topCard.type === 'word' && card.categoryIndex !== topCard.categoryIndex && !card.isJoker) {
          setFeedback('⛔ Farklı kategori! Sadece aynı kategoriden kartlar üst üste gelir.');
          return prev;
        }
        // Kategori kartının üstüne kelime kartı konamaz (sütunda)
        if (topCard.type === 'category') {
          setFeedback('📂 Kategori kartını önce boş slota taşı!');
          return prev;
        }
      }
      
      const ns = removeFromSource(prev, source, sourceIndex, card.id);
      ns.columns = ns.columns.map((col, i) => {
        if (i !== targetColIndex) return col;
        return { ...col, cards: [...col.cards, { ...card, faceUp: true }] };
      });
      setHistory((h) => [...h, prev]);
      const newMoves = prev.moves - 1;
      return { ...ns, moves: newMoves, isFailed: newMoves <= 0 };
    });
    setSelected(null);
  }, []);

  const handleCardTap = useCallback((card, source, sourceIndex, isLast = true) => {
    if (source === 'column' && !isLast) {
      // Select this card + all cards BELOW it (if all face-up)
      const col = gs.columns[sourceIndex];
      if (!col) return;
      const cardIdx = col.cards.findIndex((c) => c.id === card.id);
      if (cardIdx < 0) return;
      const stack = col.cards.slice(cardIdx);
      const allFaceUp = stack.every((c) => c.faceUp);
      if (!allFaceUp) {
        setFeedback(t.stackSelectError);
        return;
      }
      // Valid stack — select it
      setSelected({ card, source, sourceIndex, stackCards: stack });
      setFeedback('✋ ' + stack.length + ' kart seçildi');
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
    if (stackCards.some(c => c.type === 'category')) {
      setFeedback('📂 Kategori kartını üstteki boş slota koy!');
      return;
    }
    setGs((prev) => {
      const targetCol = prev.columns[targetColIndex];
      if (targetCol.locked) { setFeedback(t.isLocked); return prev; }

      if (targetCol.cards.length > 0) {
        const topCard = targetCol.cards[targetCol.cards.length - 1];
        if (!topCard.faceUp) { setFeedback(t.cantPlace); return prev; }
        // AYNI KATEGORİ KURALI (Joker bypass)
        if (topCard.type === 'word' && stackCards[0].categoryIndex !== topCard.categoryIndex && !stackCards[0].isJoker && !topCard.isJoker) {
          setFeedback('⛔ Farklı kategori!');
          return prev;
        }
        if (topCard.type === 'category') {
          setFeedback('📂 Kategori kartını önce boş slota taşı!');
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
      const newMoves = prev.moves - 1;
      return { ...prev, columns: newColumns, moves: newMoves, isFailed: newMoves <= 0 };
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
    if (!isToolUnlocked('undo')) return;
    if (history.length === 0) { setFeedback(t.nothingToUndo); return; }
    if (toolCredits.undo > 0) {
      const newCredits = { ...toolCredits, undo: toolCredits.undo - 1 };
      setToolCredits(newCredits);
      await updateProgress({ toolCredits: newCredits });
      setGs(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); setSelected(null);
      setFeedback(t.undoDone);
      return;
    }
    setToolModal('undo');
  }, [history, toolCredits, isToolUnlocked]);

  const executeUndo = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 450) { setFeedback(t.coinNeeded500); setToolModal(null); return; }
      setCoins(coins - 450); await updateProgress({ coins: coins - 450 });
    }
    if (method === 'ad') await showRewarded();
    const newCredits = { ...toolCredits, undo: toolCredits.undo + 1 };
    setToolCredits(newCredits);
    await updateProgress({ toolCredits: newCredits });
    setFeedback(t.undoAdded);
    setToolModal(null);
  }, [coins, toolCredits]);

  const useDelete = useCallback(async () => {
    if (!isToolUnlocked('delete')) return;
    if (gs.drawnCards.length === 0) { setFeedback(t.nothingToDelete); return; }
    if (toolCredits.delete > 0) {
      const newCredits = { ...toolCredits, delete: toolCredits.delete - 1 };
      setToolCredits(newCredits);
      await updateProgress({ toolCredits: newCredits });
      setGs((p) => ({ ...p, drawnCards: p.drawnCards.slice(0, -1), moves: p.moves - 1 }));
      setSelected(null);
      setFeedback(t.deleteDone);
      return;
    }
    setToolModal('delete');
  }, [gs.drawnCards, toolCredits, isToolUnlocked]);

  const executeDelete = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 500) { setFeedback(t.coinNeeded500); setToolModal(null); return; }
      setCoins(coins - 500); await updateProgress({ coins: coins - 500 });
    }
    if (method === 'ad') await showRewarded();
    const newCredits = { ...toolCredits, delete: toolCredits.delete + 1 };
    setToolCredits(newCredits);
    await updateProgress({ toolCredits: newCredits });
    setFeedback(t.deleteAdded);
    setToolModal(null);
  }, [coins, toolCredits]);

  // ── Joker Card (Wildcard) ──
  const useJoker = useCallback(async () => {
    if (!isToolUnlocked('joker')) return;
    if (gs.drawnCards.length === 0) { setFeedback(t.jokerNeedCard); return; }
    if (toolCredits.joker > 0) {
      const newCredits = { ...toolCredits, joker: toolCredits.joker - 1 };
      setToolCredits(newCredits);
      await updateProgress({ toolCredits: newCredits });
      setGs((p) => {
        if (p.drawnCards.length === 0) return p;
        const newDrawn = [...p.drawnCards];
        const lastCard = { ...newDrawn[newDrawn.length - 1], isJoker: true, word: '✦ Joker', emoji: '🃏' };
        newDrawn[newDrawn.length - 1] = lastCard;
        return { ...p, drawnCards: newDrawn };
      });
      setFeedback(t.jokerActive);
      return;
    }
    setToolModal('joker');
  }, [gs.drawnCards, toolCredits, isToolUnlocked]);

  const executeJoker = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 750) { setFeedback(t.coinNeeded750); setToolModal(null); return; }
      setCoins(coins - 750); await updateProgress({ coins: coins - 750 });
    }
    if (method === 'ad') await showRewarded();
    const newCredits = { ...toolCredits, joker: toolCredits.joker + 1 };
    setToolCredits(newCredits);
    await updateProgress({ toolCredits: newCredits });
    setFeedback(t.jokerAdded);
    setToolModal(null);
  }, [coins, toolCredits]);

  // ── Shuffle (Karıştır) ──
  const useShuffle = useCallback(async () => {
    if (!isToolUnlocked('shuffle')) return;
    const hasCards = gs.columns.some(col => !col.locked && col.cards.length > 0) || gs.drawnCards.length > 0;
    if (!hasCards) { setFeedback(t.shuffleNoCards); return; }
    if (toolCredits.shuffle > 0) {
      const newCredits = { ...toolCredits, shuffle: toolCredits.shuffle - 1 };
      setToolCredits(newCredits);
      await updateProgress({ toolCredits: newCredits });
      setGs((prev) => {
        // Tüm kartları topla (sütunlar + çekilen kartlar)
        const allCards = [];
        const colSizes = [];
        prev.columns.forEach(col => {
          if (col.locked) { colSizes.push(-1); return; }
          colSizes.push(col.cards.length);
          col.cards.forEach(c => allCards.push({ ...c }));
        });
        prev.drawnCards.forEach(c => allCards.push({ ...c }));
        // Karıştır
        for (let i = allCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
        }
        // Sütunlara geri dağıt
        let idx = 0;
        const newColumns = prev.columns.map((col, ci) => {
          if (col.locked) return col;
          const size = colSizes[ci];
          const newCards = allCards.slice(idx, idx + size).map((c, cardIdx) => ({
            ...c, faceUp: cardIdx === size - 1 // sadece en üstteki açık
          }));
          idx += size;
          return { ...col, cards: newCards };
        });
        // Kalanlar çekilen kartlar
        const newDrawn = allCards.slice(idx).map(c => ({ ...c, faceUp: true }));
        setHistory((h) => [...h, prev]);
        return { ...prev, columns: newColumns, drawnCards: newDrawn };
      });
      setFeedback(t.shuffleDone);
      playSound('flip');
      return;
    }
    setToolModal('shuffle');
  }, [gs.columns, gs.drawnCards, toolCredits, isToolUnlocked]);

  const executeShuffle = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 500) { setFeedback(t.coinNeeded500); setToolModal(null); return; }
      setCoins(coins - 500); await updateProgress({ coins: coins - 500 });
    }
    if (method === 'ad') await showRewarded();
    const newCredits = { ...toolCredits, shuffle: toolCredits.shuffle + 1 };
    setToolCredits(newCredits);
    await updateProgress({ toolCredits: newCredits });
    setFeedback(t.shuffleAdded);
    setToolModal(null);
  }, [coins, toolCredits]);

  // ── Smart Hint ──
  const useHint = useCallback(async () => {
    if (!isToolUnlocked('hint')) return;
    if (toolCredits.hint > 0) {
      const newCredits = { ...toolCredits, hint: toolCredits.hint - 1 };
      setToolCredits(newCredits);
      await updateProgress({ toolCredits: newCredits });
      runHintLogic();
      return;
    }
    setToolModal('hint');
  }, [toolCredits, isToolUnlocked]);

  const executeHint = useCallback(async (method) => {
    if (method === 'coin') {
      if (coins < 500) { setFeedback(t.coinNeeded500); setToolModal(null); return; }
      setCoins(coins - 500); await updateProgress({ coins: coins - 500 });
      setFeedback(t.hintBought);
    }
    if (method === 'ad') { await showRewarded(); setFeedback(t.hintEarned); }
    setToolModal(null);
    setTimeout(() => runHintLogic(), 100);
  }, [coins]);

  const runHintLogic = useCallback(() => {
    const playable = [];
    gs.columns.forEach((col, ci) => {
      if (col.locked || col.cards.length === 0) return;
      for (let k = col.cards.length - 1; k >= 0; k--) {
        const card = col.cards[k];
        if (!card.faceUp) break;
        playable.push({ card, source: 'column', sourceIndex: ci });
      }
    });
    if (gs.drawnCards.length > 0) {
      playable.push({ card: gs.drawnCards[gs.drawnCards.length - 1], source: 'drawn', sourceIndex: null });
    }

    for (const p of playable) {
      if (p.card.type === 'category') {
        const emptySlot = gs.slots.findIndex((sl) => !sl.locked && !sl.category);
        if (emptySlot >= 0) {
          setHintCard(p.card.id); setHintSlot(emptySlot);
          setFeedback('💡 ' + p.card.word + ' → boş slota koy!');
          return;
        }
      }
      if (p.card.type === 'word') {
        const matchSlot = gs.slots.findIndex((sl) => sl.category && sl.category.categoryIndex === p.card.categoryIndex && sl.placedCards.length < sl.category.totalWords);
        if (matchSlot >= 0) {
          setHintCard(p.card.id); setHintSlot(matchSlot);
          setFeedback('💡 ' + p.card.word + ' → ' + gs.slots[matchSlot].category.word + '!');
          return;
        }
      }
    }
    setFeedback('Uygun hamle yok. Desteden kart çek veya sütunları düzenle!');
  }, [gs]);

  const resetGame = useCallback(() => {
    const newLevel = isDaily ? getDailyChallenge(gameLang) : getLevel(levelId, gameLang);
    const state = generateGameState(newLevel);
    if (isTimed) state.moves = 9999;
    setGs(state); setHistory([]); setSelected(null);
    setHintCard(null); setHintSlot(null); setCombo(0); comboRef.current = 0; startTimeRef.current = Date.now(); setElapsedTime(0);
    if (isTimed) setTimeRemaining(getTimedSeconds(levelId));
  }, [levelId, isDaily, isTimed]);

  const addMovesAd = useCallback(async () => {
    const result = await showRewarded();
    setGs((p) => ({ ...p, moves: p.moves + 20, isFailed: false }));
    setFeedback(t.movesAdded);
  }, []);

  const addMovesCoin = useCallback(async () => {
    if (coins < 500) { setFeedback(t.coinNeeded500); return; }
    const newCoins = coins - 500;
    setCoins(newCoins);
    await updateProgress({ coins: newCoins });
    setGs((p) => ({ ...p, moves: p.moves + 20, isFailed: false }));
    setFeedback(t.movesAdded);
  }, [coins]);

  // ── Level Complete → save & advance ──
  const handleNextLevel = useCallback(async () => {
    const bonus = isTimed ? Math.min(levelId * 2, 50) : Math.floor(8 * (gs.moves / level.moves));
    const eventMultiplier = 1;
    const prog = await loadProgress();

    if (isDaily) {
      // Daily challenge: 100 coin bonus, mark done, go home
      const newCoins = (prog.coins || 0) + Math.floor((100 + bonus) * eventMultiplier);
      await updateProgress({
        coins: newCoins,
        totalGames: (prog.totalGames || 0) + 1,
        totalWins: (prog.totalWins || 0) + 1,
        bestScore: Math.max(prog.bestScore || 0, gs.score),
      });
      setCoins(newCoins);
      // Başarım kontrolü
      try {
        const achStats = { ...prog, coins: newCoins, totalWins: (prog.totalWins || 0) + 1, dailyCount: 1, noHintWin: gs.hints === level.hints, speedWin: gs.moves > level.moves / 2, maxCombo: combo };
        const newAch = await checkAchievements(achStats);
        if (newAch.length > 0) {
          const totalReward = newAch.reduce((sum, a) => sum + (a.reward || 0), 0);
          setAchievementPopup({ ...newAch[0], reward: newAch[0].reward || 0, pendingCoins: totalReward });
          await updateProgress({ unseenAch: (prog.unseenAch || 0) + newAch.length });
        }
      } catch (e) {}
      await markDailyChallengeCompleted(dailyDate);
      router.canGoBack() ? router.back() : router.replace("/");
      return;
    }

    const nextId = levelId + 1;
    const nextLevel = getLevel(nextId, gameLang);
    if (!nextLevel) { router.canGoBack() ? router.back() : router.replace("/"); return; }
    await updateProgress({
      currentLevel: nextId,
      coins: (prog.coins || 0) + Math.floor((30 + bonus) * eventMultiplier),
      totalGames: (prog.totalGames || 0) + 1,
      totalWins: (prog.totalWins || 0) + 1,
      bestScore: Math.max(prog.bestScore || 0, gs.score),
      streak: (prog.streak || 0) + 1,
    });
    await clearSavedGame();
    // Yıldız kaydet
    const moveRatio = gs.moves / level.moves;
    const stars = moveRatio > 0.5 ? 3 : moveRatio > 0.25 ? 2 : 1;
    await saveLevelStars(levelId, stars);
    // XP ekle (yıldız başına 50 + bölüm bonusu)
    await addXP(stars * 50 + Math.floor(levelId / 5) * 10);
    // Submit to leaderboard
    try {
      submitScore({
        score: Math.max(prog.bestScore || 0, gs.score),
        level: nextId,
        totalWins: (prog.totalWins || 0) + 1,
        language: gameLang,
      });
    } catch (e) {}
    // Başarım kontrolü
    try {
      const achStats = { currentLevel: nextId, coins: (prog.coins || 0) + 30 + bonus, totalWins: (prog.totalWins || 0) + 1, bestScore: Math.max(prog.bestScore || 0, gs.score), streak: (prog.streak || 0) + 1, noHintWin: gs.hints === level.hints, speedWin: gs.moves > level.moves / 2, perfectWin: true, maxCombo: combo };
      const newAch = await checkAchievements(achStats);
      if (newAch.length > 0) {
        const totalReward = newAch.reduce((sum, a) => sum + (a.reward || 0), 0);
        setAchievementPopup({ ...newAch[0], reward: newAch[0].reward || 0, pendingCoins: totalReward });
        await updateProgress({ unseenAch: (prog.unseenAch || 0) + newAch.length });
      }
    } catch (e) {}
    // Show interstitial ad every 3 levels
    if (nextId % 3 === 0) await showInterstitial();
    
    // Araç açılma kontrolü
    const currentUnlocked = prog.unlockedTools || [];
    const currentCredits = prog.toolCredits || { hint: 0, joker: 0, shuffle: 0, undo: 0, delete: 0 };
    let newUnlocked = [...currentUnlocked];
    let newCredits = { ...currentCredits };
    let introTool = null;
    for (const [tool, unlockLevel] of Object.entries(TOOL_UNLOCK)) {
      if (nextId >= unlockLevel && !currentUnlocked.includes(tool)) {
        newUnlocked.push(tool);
        newCredits[tool] = (newCredits[tool] || 0) + 3;
        if (!introTool) introTool = tool; // İlk açılan aracı tanıt
      }
    }
    if (newUnlocked.length > currentUnlocked.length) {
      await updateProgress({ unlockedTools: newUnlocked, toolCredits: newCredits });
      setUnlockedTools(newUnlocked);
      setToolCredits(newCredits);
    }
    
    setLevelId(nextId);
    const nextState = generateGameState(nextLevel);
    if (isTimed) nextState.moves = 9999;
    setGs(nextState);
    setHistory([]); setSelected(null);
    setHintCard(null); setHintSlot(null); setCombo(0); comboRef.current = 0; startTimeRef.current = Date.now(); setElapsedTime(0);
    if (isTimed) setTimeRemaining(getTimedSeconds(nextId));
    setCoins((prog.coins || 0) + 30 + bonus);
    // Araç tanıtım popup'ı
    if (introTool) {
      setTimeout(() => { playSound('unlock'); setToolIntro(TOOL_INFO[introTool]); }, 500);
    }
    // Günlük Meydan Okuma tanıtımı (Lv.10)
    if (nextId === 10 && !(prog.dailyIntroShown)) {
      await updateProgress({ dailyIntroShown: true });
      setTimeout(() => { setDailyIntro(true); playSound('unlock'); }, introTool ? 1500 : 500);
    }
    // Zamanlı Mod tanıtımı (Lv.5)
    if (nextId === 5 && !(prog.timedIntroShown)) {
      await updateProgress({ timedIntroShown: true });
      setTimeout(() => { setTimedIntro(true); playSound('unlock'); }, introTool ? 1500 : 500);
    }
  }, [levelId, gs, level, coins]);

  // Hamle bitti → Karıştır (shuffle + 5 hamle ekle)
  const handleFailedShuffle = useCallback(async () => {
    if (toolCredits.shuffle > 0) {
      // Kredi varsa kullan
      const newCredits = { ...toolCredits, shuffle: toolCredits.shuffle - 1 };
      setToolCredits(newCredits);
      await updateProgress({ toolCredits: newCredits });
      setGs((prev) => {
        const allCards = [];
        const colSizes = [];
        prev.columns.forEach(col => {
          if (col.locked) { colSizes.push(-1); return; }
          colSizes.push(col.cards.length);
          col.cards.forEach(c => allCards.push({ ...c }));
        });
        prev.drawnCards.forEach(c => allCards.push({ ...c }));
        for (let i = allCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
        }
        let idx = 0;
        const newColumns = prev.columns.map((col, ci) => {
          if (col.locked) return col;
          const size = colSizes[ci];
          const newCards = allCards.slice(idx, idx + size).map((c, cardIdx) => ({
            ...c, faceUp: cardIdx === size - 1
          }));
          idx += size;
          return { ...col, cards: newCards };
        });
        const newDrawn = allCards.slice(idx).map(c => ({ ...c, faceUp: true }));
        return { ...prev, columns: newColumns, drawnCards: newDrawn, moves: 5, isFailed: false };
      });
      playSound('flip');
      setFeedback(t.shuffleDone);
    } else {
      // Kredi yoksa satın alma modal
      setToolModal('shuffle');
      // Failed state'i kaldır ki modal açılsın
      setGs(prev => ({ ...prev, isFailed: false, moves: 0 }));
    }
  }, [toolCredits]);

  const handleReplay = useCallback(async () => {
    const prog = await loadProgress();
    await updateProgress({ totalGames: (prog.totalGames || 0) + 1 });
    await clearSavedGame();
    resetGame();
  }, [resetGame]);

  const handleHome = useCallback(async () => {
    await clearSavedGame();
    router.canGoBack() ? router.back() : router.replace("/");
  }, []);

  const selId = selected?.card?.id;
  const selectedStackIds = selected?.stackCards ? new Set(selected.stackCards.map((c) => c.id)) : null;
  
  // Dynamic card sizing based on actual column count
  const colCount = gs.columns.length;
  const dynCardW = Math.floor((SW - GAME_PAD * 2 - (colCount - 1) * COL_GAP) / colCount);
  const dynCardH = Math.floor(dynCardW * 1.3);
  const dynOverlap = -Math.floor(dynCardH * 0.75);
  const DCW = dynCardW; const DCH = dynCardH; // Sütun kartlarıyla aynı boyut
  // dragStackIds hesaplanır ama prop olarak geçilmez (performans)

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
    <View 
      style={st.container}
    >
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      {/* Sparkle */}
      {sparkle && <SparkleEffect visible={true} x={sparkle.x} y={sparkle.y} />}
      {scorePopups.map((sp) => <ScorePopup key={sp.id} text={sp.text} x={sp.x} y={sp.y} />)}

      <View style={st.header}>
        <View style={{ width: 80, alignItems: 'flex-start' }}>
          <View style={st.coinBadge}>
            <Text style={{ fontSize: 14 }}>🪙</Text>
            <Text style={st.coinText}>{coins}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={st.headerTitle}>{isDaily ? '📅 ' + (dailyDate || 'GÜNLÜK') : t.level + ' ' + gs.levelId}</Text>
          {combo >= 2 && <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: fs(11), color: COLORS.coin }}>🔥 {combo}x Combo</Text>}
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
            {gs.slots.filter(s => !s.locked).map((s, i) => (
              <View key={i} style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: s.category && s.placedCards?.length >= (s.category?.totalWords || 99) ? COLORS.success : s.category ? COLORS.primary + '60' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </View>
        </View>
        <View style={{ width: 80, alignItems: 'flex-end' }}>
          <TouchableOpacity style={st.settingsBtn} onPress={() => setPaused(true)}>
            <MaterialIcons name="settings" size={20} color={COLORS.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {!!feedback && <View style={st.feedbackBar}><Text style={st.feedbackText}>{feedback}</Text></View>}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} scrollEnabled={!scrollLocked} bounces={false} overScrollMode="never" ref={scrollRef} onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={16}>
        <View style={{ height: 20 }} />
        <View style={st.deckRow}>
          {isTimed ? (
            <View style={st.movesPanel}>
              <Text style={st.movesLabel}>{t.moves}</Text>
              <Text style={st.movesNum}>∞</Text>
            </View>
          ) : (
            <View style={[st.movesPanel, gs.moves <= 5 && { borderColor: COLORS.fail, shadowColor: COLORS.fail, shadowOpacity: 0.6 }]}>
              <Text style={st.movesLabel}>{t.moves}</Text>
              <Text style={[st.movesNum, gs.moves <= 5 && { color: COLORS.fail }]}>{gs.moves}</Text>
              <TouchableOpacity style={st.addBtn} onPress={addMovesAd}><Text style={st.addBtnText}>+20 ▶</Text></TouchableOpacity>
            </View>
          )}
          {isTimed ? (
            <View style={[st.movesPanel, timeRemaining <= 15 && { borderColor: COLORS.fail, shadowColor: COLORS.fail, shadowOpacity: 0.6 }]}>
              <Text style={st.movesLabel}>KALAN</Text>
              <Text style={[st.movesNum, timeRemaining <= 15 && { color: COLORS.fail }]}>{Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}</Text>
            </View>
          ) : (
            <View style={st.movesPanel}>
              <Text style={st.movesLabel}>SÜRE</Text>
              <Text style={st.movesNum}>{Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}</Text>
            </View>
          )}

          <View
            style={st.drawnArea}
            onStartShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              if (drawnTouchRef.current.moved) cancelDrag();
              const { pageX, pageY } = e.nativeEvent;
              drawnTouchRef.current = { startX: pageX, startY: pageY, moved: false };
              lockScroll(true);
            }}
            onResponderMove={(e) => {
              const dt = drawnTouchRef.current;
              const { pageX, pageY } = e.nativeEvent;
              if (!dt.moved && (Math.abs(pageX - dt.startX) + Math.abs(pageY - dt.startY)) > 5) {
                dt.moved = true;
                if (gs.drawnCards.length > 0) {
                  const card = gs.drawnCards[gs.drawnCards.length - 1];
                  startDragRef.current?.(card, 'drawn', null, true, dt.startX, dt.startY);
                }
              }
              if (dt.moved && dragRef.current.card) {
                dragX.setValue(pageX - CARD_W / 2);
                dragY.setValue(pageY - CARD_H / 2);
              }
            }}
            onResponderRelease={(e) => {
              if (drawnTouchRef.current.moved) {
                if (dragRef.current.card) handleDropRef.current?.(dragRef.current, e.nativeEvent.pageX, e.nativeEvent.pageY);
                else cancelDragRef.current?.();
              } else {
                handleDrawnTap();
              }
              drawnTouchRef.current = { startX: 0, startY: 0, moved: false };
              lockScroll(false);
            }}
            onResponderTerminationRequest={() => !drawnTouchRef.current.moved}
            onResponderTerminate={() => {
              if (drawnTouchRef.current.moved) cancelDragRef.current?.();
              drawnTouchRef.current = { startX: 0, startY: 0, moved: false };
              lockScroll(false);
            }}
          >
            {gs.drawnCards.length === 0 ? (
              <View style={[st.emptyCard, { width: DCW, height: DCH }]} />
            ) : (
              <View style={{ width: DCW + 30, height: DCH, justifyContent: 'center', alignItems: 'flex-end' }}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => {
                  const isTop = i === arr.length - 1;
                  const isSecond = i === arr.length - 2;
                  return (
                    <View key={card.id} style={{ position: 'absolute', right: (arr.length - 1 - i) * 14, zIndex: i }}>
                      {isTop || isSecond ? (
                        <FaceUpCard card={card} selected={isTop && selId === card.id} hinted={isTop && card.id === hintCard} isDragging={false} w={DCW} h={DCH} />
                      ) : (
                        <View style={{ width: DCW, height: DCH, borderRadius: 8, backgroundColor: '#e0d8f0', borderWidth: 1, borderColor: 'rgba(155,125,255,0.2)' }} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

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

        <View style={st.slotsRow} onLayout={(e) => { const { y, height } = e.nativeEvent.layout; slotsRowY.current = { top: y, bottom: y + height }; }}>
          {gs.slots.map((slot, i) => (
            <Animated.View key={i} style={{ flex: 1, transform: [{ translateX: shakeSlotIdx === i ? shakeAnim : 0 }] }}>
              <FoundationSlot t={t} slot={slot} slotIndex={i} onPress={() => handleSlotTap(i)} onUnlock={handleUnlock} hinted={hintSlot === i} />
            </Animated.View>
          ))}
        </View>

        <View style={st.tableauRow} onLayout={(e) => { const { y, height } = e.nativeEvent.layout; tableauRowY.current = { top: y, bottom: y + height }; }}>
          {gs.columns.map((col, i) => (
            <View key={i} style={{ flex: 1 }}>
              <TableauColumn column={col} colIndex={i} selectedId={selId} selectedStackIds={selectedStackIds} hintedId={hintCard}  onCardTap={handleCardTap} onColumnTap={handleColumnTap} onUnlock={handleUnlock} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} onScrollLock={lockScroll} onCancelDrag={cancelDrag} />
            </View>
          ))}
        </View>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Toolbar */}
      <View style={st.toolbar}>
        <ToolBtn icon="lightbulb" label={t.hint} badge={toolCredits.hint > 0 ? toolCredits.hint : '🪙'} badgeColor={toolCredits.hint > 0 ? COLORS.success : COLORS.coin} onPress={useHint} locked={!isToolUnlocked('hint')} unlockLevel={TOOL_UNLOCK.hint} pulse={gs.moves <= 5 && !isTimed} />
        <ToolBtn icon="undo" label={t.undo} badge={toolCredits.undo > 0 ? toolCredits.undo : '🪙'} badgeColor={toolCredits.undo > 0 ? COLORS.success : COLORS.coin} onPress={useUndo} locked={!isToolUnlocked('undo')} unlockLevel={TOOL_UNLOCK.undo} pulse={gs.moves <= 3 && !isTimed} />
        <ToolBtn icon="style" label="JOKER" badge={toolCredits.joker > 0 ? toolCredits.joker : '🪙'} badgeColor={toolCredits.joker > 0 ? COLORS.success : COLORS.coin} onPress={useJoker} locked={!isToolUnlocked('joker')} unlockLevel={TOOL_UNLOCK.joker} />
        <ToolBtn icon="shuffle" label="KARIŞTIR" badge={toolCredits.shuffle > 0 ? toolCredits.shuffle : '🪙'} badgeColor={toolCredits.shuffle > 0 ? COLORS.success : COLORS.coin} onPress={useShuffle} locked={!isToolUnlocked('shuffle')} unlockLevel={TOOL_UNLOCK.shuffle} />
        <ToolBtn icon="auto-fix-normal" label={t.delete} badge={toolCredits.delete > 0 ? toolCredits.delete : '🪙'} badgeColor={toolCredits.delete > 0 ? COLORS.success : COLORS.coin} onPress={useDelete} locked={!isToolUnlocked('delete')} unlockLevel={TOOL_UNLOCK.delete} />
      </View>

      {/* Ad Banner Space */}
      <View style={st.adBannerSpace} />

      {/* Achievement Popup */}
      {achievementPopup && (
        <View style={st.achievPopup}>
          <Text style={{ fontSize: 28 }}>{achievementPopup.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#FFD166' }}>{(ACHIEVEMENT_I18N[gameLang] || ACHIEVEMENT_I18N.tr).earned}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: '#fff' }}>{(ACHIEVEMENT_I18N[gameLang] || ACHIEVEMENT_I18N.tr)[achievementPopup.id]?.[0] || achievementPopup.title}</Text>
          </View>
          {achievementPopup.pendingCoins > 0 ? (
            <TouchableOpacity 
              style={{ backgroundColor: '#FFD700', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}
              onPress={async () => {
                const p = await loadProgress();
                const nc = (p.coins || 0) + achievementPopup.pendingCoins;
                setCoins(nc);
                await updateProgress({ coins: nc });
                playSound('coin');
                setAchievementPopup(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 13, color: '#000' }}>+{achievementPopup.pendingCoins} 🪙 Topla</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setAchievementPopup(null)}>
              <MaterialIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tool Purchase Modal */}
      {toolModal && (
        <View style={ov.overlay}>
          <View style={[ov.card, { paddingTop: 20, paddingBottom: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.onSurface }}>
                {toolModal === 'hint' ? t.hint : toolModal === 'undo' ? t.undo : toolModal === 'joker' ? 'Joker' : toolModal === 'shuffle' ? 'Karıştır' : t.delete}
              </Text>
              <TouchableOpacity onPress={() => setToolModal(null)}><Text style={{ fontSize: 22, color: COLORS.fail }}>✕</Text></TouchableOpacity>
            </View>
            <View style={{ backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 20, alignItems: 'center', width: '100%', marginBottom: 16 }}>
              <MaterialIcons name={toolModal === 'hint' ? 'lightbulb' : toolModal === 'undo' ? 'undo' : toolModal === 'joker' ? 'style' : toolModal === 'shuffle' ? 'shuffle' : 'auto-fix-normal'} size={48} color={COLORS.secondary} />
              <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                {toolModal === 'hint' ? (t.hintDesc || 'Doğru hamleyi göster') : toolModal === 'undo' ? (t.undoDesc || 'Önceki adımı geri al') : toolModal === 'joker' ? 'Üstteki kartı joker yap — herhangi bir kategoriye uyar' : toolModal === 'shuffle' ? 'Sütunlardaki kapalı kartları karıştır' : (t.deleteDesc || 'Bir kartı sil')}
              </Text>
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: COLORS.coin, borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%', marginBottom: 10 }} 
              onPress={() => { const fn = toolModal === 'hint' ? executeHint : toolModal === 'undo' ? executeUndo : toolModal === 'joker' ? executeJoker : toolModal === 'shuffle' ? executeShuffle : executeDelete; fn('coin'); }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#000' }}>🪙 {toolModal === 'joker' ? '750' : toolModal === 'undo' ? '450' : '500'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' }} 
              onPress={() => { const fn = toolModal === 'hint' ? executeHint : toolModal === 'undo' ? executeUndo : toolModal === 'joker' ? executeJoker : toolModal === 'shuffle' ? executeShuffle : executeDelete; fn('ad'); }}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' }}>▶ AD Kullan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tool Introduction Popup */}
      {toolIntro && (
        <View style={ov.overlay}>
          <View style={[ov.card, { paddingTop: 24, paddingBottom: 24 }]}>
            <Image source={OWL_HAPPY} style={{ width: 100, height: 75, resizeMode: 'contain', marginBottom: 12 }} />
            <View style={{ backgroundColor: COLORS.primary + '20', borderRadius: 20, width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <MaterialIcons name={toolIntro.icon} size={36} color={COLORS.primary} />
            </View>
            <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.coin, textAlign: 'center', marginBottom: 6 }}>{toolIntro.title}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 16, paddingHorizontal: 10 }}>{toolIntro.desc}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 20 }}>🎁</Text>
              <Text style={{ fontFamily: FONTS.headline, fontSize: 14, color: '#fff' }}>{t.toolGift || '3 adet ücretsiz hak eklendi!'}</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' }}
              onPress={() => setToolIntro(null)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' }}>{t.toolGreat || 'Harika!'} 🎉</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Daily Challenge Introduction */}
      {dailyIntro && (
        <View style={ov.overlay}>
          <View style={[ov.card, { paddingTop: 24, paddingBottom: 24 }]}>
            <Image source={OWL_HAPPY} style={{ width: 100, height: 75, resizeMode: 'contain', marginBottom: 12 }} />
            <Text style={{ fontSize: 40, marginBottom: 8 }}>📅</Text>
            <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.coin, textAlign: 'center', marginBottom: 6 }}>{t.dailyUnlocked || 'Günlük Meydan Okuma Açıldı!'}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 16, paddingHorizontal: 10 }}>{t.dailyUnlockedDesc || 'Her gün yeni bir bulmaca!'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
              <Text style={{ fontFamily: FONTS.headline, fontSize: 14, color: '#fff' }}>{t.dailyUnlockedPlay || 'Ana sayfadan her gün oyna!'}</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' }}
              onPress={() => setDailyIntro(false)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' }}>{t.dailyGotIt || 'Anladım!'} 🎯</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Timed Mode Introduction */}
      {timedIntro && (
        <View style={ov.overlay}>
          <View style={[ov.card, { paddingTop: 24, paddingBottom: 24 }]}>
            <Image source={OWL_HAPPY} style={{ width: 100, height: 75, resizeMode: 'contain', marginBottom: 12 }} />
            <Text style={{ fontSize: 40, marginBottom: 8 }}>⏱️</Text>
            <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 20, color: '#FF7043', textAlign: 'center', marginBottom: 6 }}>{t.timedModeUnlocked || 'Zamanlı Mod Açıldı!'}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 16, paddingHorizontal: 10 }}>{t.timedModeDesc || 'Süre dolmadan bölümü tamamla! Hız ve strateji gerektiren özel mod.'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 16 }}>
              <Text style={{ fontSize: 20 }}>🔥</Text>
              <Text style={{ fontFamily: FONTS.headline, fontSize: 14, color: '#fff' }}>{t.timedModePlay || 'Ana sayfadan oyna!'}</Text>
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#FF7043', borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' }}
              onPress={() => setTimedIntro(false)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' }}>{t.toolGreat || 'Harika!'} ⏱️</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tutorial */}
      {showTutorial && (
        <View style={ov.overlay}>
          <LinearGradient colors={['rgba(21,6,41,0.92)', 'rgba(61,53,96,0.92)']} style={StyleSheet.absoluteFillObject} />
          <View style={ov.card}>
            <Image source={OWL_HAPPY} style={{ width: 120, height: 90, resizeMode: 'contain', marginBottom: 12 }} />
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

            <TouchableOpacity style={ov.pauseSecBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} activeOpacity={0.7}>
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
          <LevelCompleteOverlay t={t} score={gs.score} coins={isDaily ? 100 : 30} movesLeft={isTimed ? 0 : gs.moves} maxMoves={level.moves} levelId={gs.levelId} combo={combo} isDaily={isDaily} elapsedTime={elapsedTime} onNext={handleNextLevel} onReplay={handleReplay} onHome={handleHome} />
        </>
      )}
      {gs.isFailed && !gs.isComplete && (
        <LevelFailedOverlay t={t} levelId={gs.levelId} onAddMovesAd={addMovesAd} onAddMovesCoin={addMovesCoin} onShuffle={handleFailedShuffle} onReplay={handleReplay} onHome={handleHome} />
      )}

      {/* Floating drag card — her zaman render, opacity ile gizle */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', zIndex: 99999,
          left: 0, top: 0,
          opacity: dragOpacity,
          transform: [{ translateX: dragX }, { translateY: dragY }, { scale: dragScale }],
        }}
      >
        {dragCardRef.current && <FaceUpCard card={dragCardRef.current.card} selected={true} w={CARD_W} h={CARD_H} />}
      </Animated.View>
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

function ToolBtn({ icon, label, badge, badgeColor, onPress, big, locked, unlockLevel, pulse }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (locked || !pulse) { pulseAnim.setValue(0); return; }
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [locked, pulse]);
  
  if (locked) {
    return (
      <View style={st.toolWrap}>
        <View style={[st.toolBtn, { opacity: 0.3 }]}>
          <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.4)" />
        </View>
        <Text style={[st.toolLabel, { color: 'rgba(255,255,255,0.3)' }]}>Lv.{unlockLevel}</Text>
      </View>
    );
  }
  
  const glowScale = pulse ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) : 1;
  const glowOpacity = pulse ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) : 1;
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
  owl: { width: 120, height: 90, resizeMode: 'contain', marginBottom: 8 },
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 62, paddingBottom: 6, backgroundColor: COLORS.headerBg, zIndex: 50 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.panelBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9999, borderWidth: 1, borderColor: COLORS.panelBorder },
  coinText: { fontFamily: FONTS.headline, fontSize: 13, color: COLORS.onSurface },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff', letterSpacing: 1 },
  settingsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center' },
  feedbackBar: { position: 'absolute', top: 90, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.75)', paddingVertical: 10, paddingHorizontal: 16, zIndex: 200, borderRadius: 12, alignSelf: 'center' },
  feedbackText: { fontFamily: FONTS.headline, fontSize: 13, color: '#fff', textAlign: 'center' },
  scrollContent: { paddingHorizontal: GAME_PAD, paddingTop: 2, gap: 10 },
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
  faceDown: { borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.cardBackBorder, overflow: 'hidden', shadowColor: '#9B7DFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12, elevation: 6 },
  innerFrame: { flex: 1, margin: 3, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,92,252,0.1)' },
  innerFrameInner: { width: '60%', height: '60%', borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(124,92,252,0.08)' },
  faceUp: { borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(200,180,255,0.4)', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, paddingVertical: 3, shadowColor: '#9B7DFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  cardSelected: { borderColor: COLORS.primary, borderWidth: 2.5, shadowColor: '#B794F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20, elevation: 12, transform: [{ scale: 1.05 }] },
  cardHinted: { borderColor: COLORS.coin, borderWidth: 2.5, shadowColor: COLORS.coin, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 20, elevation: 14, transform: [{ scale: 1.08 }] },
  catCardBorder: { borderColor: '#B794F6', borderWidth: 2, shadowColor: '#D4BBFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 16, elevation: 8 },
  word: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#1e293b', textAlign: 'center', lineHeight: 14 },
  emoji: { fontSize: 24, textAlign: 'center' },
  catEmoji: { fontSize: 28, textAlign: 'center' },
  catName: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#1e293b', textAlign: 'center', lineHeight: 14, marginTop: 1 },
  catBadge: { position: 'absolute', top: 3, right: 4, backgroundColor: COLORS.cardBackTop, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 6 },
  catBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  slotsRow: { flexDirection: 'row', justifyContent: 'center', gap: COL_GAP, marginBottom: 4 },
  slotBox: { borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slotDashed: { borderColor: 'rgba(183,148,246,0.3)', borderStyle: 'dashed', backgroundColor: 'rgba(124,92,252,0.05)' },
  slotHinted: { borderColor: COLORS.coin, borderWidth: 2.5, shadowColor: COLORS.coin, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 18 },
  lockedText: { fontFamily: FONTS.headlineBlack, fontSize: 6, color: 'rgba(255,255,255,0.3)' },
  adBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#fff' },
  slotTag: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 2, alignItems: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  slotTagText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  tableauRow: { flexDirection: 'row', justifyContent: 'center', gap: COL_GAP, alignItems: 'flex-start', marginTop: 8 },
  toolbar: { position: 'absolute', bottom: 70, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 16, paddingVertical: 8, paddingHorizontal: 20, zIndex: 100 },
  toolWrap: { alignItems: 'center', gap: 3 },
  toolBtn: { width: 52, height: 52, borderRadius: 15, backgroundColor: COLORS.buttonBlue, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(140,180,255,0.3)', shadowColor: '#6B8AFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  toolBtnBig: { width: 62, height: 62, borderRadius: 18, backgroundColor: COLORS.buttonBlue, shadowColor: '#6B8AFF', shadowOpacity: 0.6, shadowRadius: 14, elevation: 10 },
  toolBdg: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff', paddingHorizontal: 4 },
  toolBdgText: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#fff' },
  toolLabel: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  adBannerSpace: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 99 },
  achievPopup: { position: 'absolute', top: 100, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(30,10,50,0.95)', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#FFD166', shadowColor: '#FFD166', shadowOpacity: 0.5, shadowRadius: 12, elevation: 10, zIndex: 200 },
});
