import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Vibration, Image, Animated, Easing,
  ImageBackground, AppState, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, FONTS, SIZES, CATEGORY_COLORS, TOOL_COLORS, getCategoryColor } from '../src/constants/theme';
import { generateGameState, createRunId, getLevel } from '../src/data/levels';
import { loadProgress, updateProgress, commitBoardAction, clearSavedGame, saveSavedGame, saveLevelStars, addXP, loadSelectedAvatar, getAvatarEmoji } from '../src/utils/storage';
import { purchaseToolCredit, grantToolCredit, TOOL_PRICES } from '../src/utils/toolEconomy';
import { playSound } from '../src/utils/sounds';
import { showRewarded, showInterstitial, showRewardedInterstitial } from '../src/utils/ads';
import AdBanner from '../src/components/AdBanner';
import { useLang } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { submitScore } from '../src/utils/leaderboardService';
import { getDailyChallenge, isDailyChallengeCompleted, getDailyCompletionMap } from '../src/utils/dailyChallenge';
import { calculateCompletion, settleCompletion } from '../src/utils/completion';
import { checkAchievements, claimAchievements, ACHIEVEMENT_I18N } from '../src/utils/achievements';
import { markCategoryCompleted } from '../src/utils/collection';
import { shuffleBoard } from '../src/utils/boardActions';
import { resolveDrawnWord, prepareJokerPlacement, getMovableSource, findSlotHint, isSavedBoardValid } from '../src/utils/cardSafety';
// seasonalEvents kaldırıldı

import { IS_TABLET, fs, getGameLayout } from '../src/utils/responsive';

const OWL_HAPPY = require('../assets/logo-main.png');
const BG_STARS = require('../assets/bg-stars.webp');

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
    const loops = [];
    pieces.forEach((p) => {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.anim, { toValue: 1, duration: 2000 + Math.random() * 1000, useNativeDriver: true }),
        ])
      );
      loops.push(loop);
      loop.start();
    });
    return () => {
      // Component unmount olduğunda animation loop'larını durdur — memory leak fix
      loops.forEach((l) => l.stop?.());
    };
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
const CARD_BACK_IMG = require('../assets/card-back.png');
const FaceDownCard = React.memo(function FaceDownCard({ w, h }) {
  return (
    <Image
      source={CARD_BACK_IMG}
      style={{ width: w || '100%', height: h || CARD_H, borderRadius: 10 }}
      resizeMode="cover"
    />
  );
});

const FaceUpCard = React.memo(function FaceUpCard({ card, selected, w, h, hinted, isDragging }) {
  const { t } = useLang();
  const cw = w || '100%'; const ch = h || CARD_H;
  const isCat = card.type === 'category';
  const isJoker = card.isJoker;
  const displayWord = isJoker ? ('✦ ' + (t.joker || 'Joker')) : card.word;
  const catColor = isJoker ? '#FFD166' : CATEGORY_COLORS[card.categoryIndex % CATEGORY_COLORS.length];
  const bg = '#1f1736';  // Stitch ikonları ile renk uyumu için
  const txt = '#fff';
  const bdr = '#FFD166';
  const accent = '#9B7DFF';
  const catEmojiSize = 26;
  const wordEmojiSize = 22;
  const catTextSize = 10;
  const wordTextSize = 10;
  return (
    <View style={[st.faceUp, { width: cw, height: ch, backgroundColor: bg, borderColor: bdr, borderWidth: 1.5, borderBottomWidth: 3, borderBottomColor: catColor, shadowColor: accent, shadowOpacity: 0.45, shadowRadius: 10 }, selected && st.cardSelected, isCat && st.catCardBorder, isJoker && { borderColor: '#FFD166', borderWidth: 2, shadowColor: '#FFD166', shadowOpacity: 0.8, shadowRadius: 12, backgroundColor: '#FFFBF0' }, hinted && st.cardHinted, isDragging && { opacity: 0.3 }]}>
      {isCat ? (
        <>
          <View style={st.catBadge}><Text style={st.catBadgeText}>0/{card.totalWords}</Text></View>
          <Text style={{ fontSize: catEmojiSize, textAlign: 'center' }}>{card.emoji}</Text>
          <Text style={[st.catName, { fontSize: catTextSize, color: txt }]} numberOfLines={1} ellipsizeMode="tail">{card.word}</Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: wordEmojiSize, textAlign: 'center' }}>{card.emoji}</Text>
          <Text style={[st.word, { fontSize: wordTextSize, color: isJoker ? '#FFD166' : txt }]} numberOfLines={1} ellipsizeMode="tail">{displayWord}</Text>
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
        <MaterialIcons name="lock" size={26} color="#FFE9A6" />
        <TouchableOpacity style={st.adBadge} onPress={() => onUnlock?.('slot', slotIndex)}>
          <Text style={st.adText}>▶ Ad</Text>
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
      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: FONTS.headlineBlack, letterSpacing: 0.5 }}>{t.empty}</Text>
    </TouchableOpacity>
  );
}

const TableauColumn = React.memo(function TableauColumn({ column, colIndex, selectedId, selectedStackIds, hintedId, onCardTap, onColumnTap, onUnlock, onDragStart, onDragMove, onDragEnd, onScrollLock, onCancelDrag }) {
  const touchRef = useRef({ card: null, startX: 0, startY: 0, moved: false });
  if (column.locked) {
    return (
      <View style={[st.slotBox, st.slotDashed, { height: CARD_H }]}>
        <MaterialIcons name="lock" size={26} color="#FFE9A6" />
        <TouchableOpacity style={st.adBadge} onPress={() => onUnlock?.('column', colIndex)}>
          <Text style={st.adText}>▶ Ad</Text>
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
function LevelCompleteOverlay({ t, score, summary, rewardStatus, levelId, combo, isDaily, elapsedTime, onNext, onReplay, onHome }) {
  const { baseCoins: coins, moveBonus, speedBonus, coins: totalCoins, stars } = summary;
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
        <Text style={{ color: COLORS.onSurfaceVariant, marginBottom: 8 }}>{rewardStatus === 'saved' ? (t.rewardSaved || 'Ödül kaydedildi') : rewardStatus === 'error' ? (t.rewardSaveError || 'Kayıt tamamlanamadı. Devam ederek yeniden deneyebilirsin.') : (t.rewardSaving || 'Ödül kaydediliyor…')}</Text>
        <Text style={ov.subtitle}>{isDaily ? '📅 ' + (t.dailyChallenge || 'DAILY').toUpperCase() : t.level + ' ' + levelId} {t.levelComplete}</Text>
        {combo > 0 && <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 12, color: COLORS.tertiary, marginBottom: 4 }}>🔥 {t.maxCombo || 'Max Combo'}: {combo}x</Text>}
        <Text style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.onSurfaceVariant, marginBottom: 8 }}>⏱ {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}{speedBonus > 0 ? ' ' + (t.speedBonusLabel || '⚡ Speed Bonus!') : ''}</Text>
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
            {(moveBonus > 0 || speedBonus > 0) && <Text style={{ fontFamily: FONTS.body, fontSize: 9, color: COLORS.onSurfaceVariant, marginTop: 2 }}>({coins}{moveBonus > 0 ? ' +' + moveBonus + ' ' + (t.moveBonusSuffix || 'moves') : ''}{speedBonus > 0 ? ' +' + speedBonus + ' ' + (t.speedBonusSuffix || 'speed') : ''})</Text>}
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
function LevelFailedOverlay({ t, isTimed = false, levelId, onAddMovesAd, onAddMovesCoin, onShuffle, onReplay, onHome }) {
  return (
    <View style={ov.overlay}>
      <LinearGradient colors={['rgba(21,6,41,0.95)', 'rgba(61,53,96,0.95)']} style={StyleSheet.absoluteFillObject} />
      <View style={ov.card}>
        <Image source={OWL_HAPPY} style={ov.owl} />
        <View style={ov.speechBubble}><Text style={ov.speechText}>{t.failSpeech}</Text></View>
        <Text style={ov.failTitle}>{isTimed ? (t.timeUp || 'Süre doldu') : t.outOfMoves}</Text>
        <Text style={ov.failSub}>{isTimed ? (t.timeUpMsg || 'Bu denemede süre doldu. Yeniden deneyebilirsin.') : t.failMsg}</Text>
        {!isTimed && <>
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
            <Text style={[ov.addMovesText, { color: COLORS.coin }]}>🪙 500 → +20 {t.moves || 'MOVES'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShuffle} activeOpacity={0.85} style={{ marginTop: 8, width: '100%' }}>
          <View style={[ov.addMovesBtn, { backgroundColor: COLORS.panelBg, borderWidth: 1.5, borderColor: COLORS.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 9999 }]}>
            <MaterialIcons name="shuffle" size={18} color={COLORS.secondary} />
            <Text style={[ov.addMovesText, { color: COLORS.secondary }]}>{t.shuffle}</Text>
          </View>
        </TouchableOpacity>
        </>}
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
  const { user, syncToCloud } = useAuth();
  const [levelId, setLevelId] = useState(parseInt(params.level) || 1);
  const [gameLang, setGameLang] = useState(lang);
  const [isDaily, setIsDaily] = useState(params.daily === 'true');
  const [dailyDate, setDailyDate] = useState(params.dailyDate || null);
  const [isTimed, setIsTimed] = useState(params.timed === '1');
  // Zamanlı mod: bölüme göre süre (saniye) — bölüm arttıkça azalır
  const getTimedSeconds = (lvl) => Math.max(60, 180 - (lvl - 1) * 3);
  const [timeRemaining, setTimeRemaining] = useState(() => getTimedSeconds(parseInt(params.level) || 1));
  // Wall-clock tabanlı bitiş timestamp'i — background'da JS timer pause olunca
  // eski kod 'prev - 1' ile sayıyordu, bu "background'a at, timer durur" exploit
  // yaratıyordu. Şimdi Date.now() > timedEndRef ile gerçek zaman kontrol edilir.
  const timedEndRef = useRef(null);
  const pauseRemainRef = useRef(null); // paused anında kalan saniyeyi sakla

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
  const [feedback, setFeedbackRaw] = useState({ msg: '', id: 0 });
  const setFeedback = useCallback((msg) => {
    setFeedbackRaw({ msg: msg || '', id: Date.now() + Math.random() });
  }, []);
  const [adLoadingTool, setAdLoadingTool] = useState(null);
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
  const wrongMovesRef = useRef(0); // Perfect başarımı için yanlış hamle sayacı
  const maxComboRef = useRef(0);
  maxComboRef.current = Math.max(maxComboRef.current, combo);
  const completionPromiseRef = useRef(null);
  const navigationRef = useRef(false);
  const [completionReceipt, setCompletionReceipt] = useState(null);
  const [rewardStatus, setRewardStatus] = useState('saving');
  const _pendingFailedShuffleRef = useRef(false); // handleFailedShuffle → modal → purchase sonrası auto-apply
  
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
  const latestSaveRef = useRef(null);
  const skipSaveRef = useRef(false);
  const [saveReady, setSaveReady] = useState(false);
  const [saveLoadError, setSaveLoadError] = useState(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const toolActionRef = useRef(false);
  const purchaseRef = useRef(false);
  const hintActionRef = useRef(null);
  const drawnTouchRef = useRef({ startX: 0, startY: 0, moved: false });
const slotLayoutsRef = useRef([]); // her slot'un {x, y, w, h} ölçümü
  const colLayoutsRef = useRef([]); // her sütunun {x, y, w, h} ölçümü
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
    const info = { ...dragRef.current }; // kopya al — cancelDrag ref'i temizleyebilir
    handleDropRef.current?.(info, pageX, pageY);
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

  // Timer
  useEffect(() => {
    if (!saveReady || gs.isComplete || gs.isFailed) return;
    // Paused: timedEnd'i sakla, resume'da geri yükle (wall-clock shift)
    if (paused) {
      if (isTimed && timedEndRef.current != null) {
        pauseRemainRef.current = Math.max(0, timedEndRef.current - Date.now());
      }
      return;
    }
    if (isTimed) {
      if (pauseRemainRef.current != null) {
        // Resume: kalan süreyi Date.now()'dan itibaren yeniden başlat
        timedEndRef.current = Date.now() + pauseRemainRef.current;
        pauseRemainRef.current = null;
      } else if (timedEndRef.current == null) {
        timedEndRef.current = Date.now() + timeRemaining * 1000;
      }
    }
    const timer = setInterval(() => {
      if (toolActionRef.current) return;
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      if (isTimed && timedEndRef.current != null) {
        const remaining = Math.max(0, Math.ceil((timedEndRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          // Süre doldu — background exploit korumalı: gerçek geçen zaman esas
          setGs((g) => ({ ...g, isFailed: true }));
          setTimeRemaining(0);
        } else {
          setTimeRemaining(remaining);
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [saveReady, gs.isComplete, gs.isFailed, paused, isTimed]);

  // Play win/lose sounds
  useEffect(() => {
    if (gs.isComplete) playSound('win');
    else if (gs.isFailed) playSound('lose');
  }, [gs.isComplete, gs.isFailed]);

  // Load progress
  useEffect(() => {
    loadProgress().then(async (p) => {
      setCoins(p.coins || 0);
      const requestedLevel = parseInt(params.level) || p.currentLevel || 1;
      const activeLevel = isDaily ? level : (getLevel(requestedLevel,gameLang) || getLevel(1,gameLang));
      if (!isDaily) setLevelId(activeLevel.id);
      if ((p.currentLevel || 1) === 1 && !isDaily && !p.tutorialShown) {
        setShowTutorial(true);
        // Tekrar gösterilmesin — kullanıcı 1. bölümü tekrar oynasa bile
        updateProgress({ tutorialShown: true }).catch(() => {});
      }
      // Araç durumlarını yükle
      setUnlockedTools(p.unlockedTools || []);
      setToolCredits(p.toolCredits || { hint: 0, joker: 0, shuffle: 0, undo: 0, delete: 0 });
      {
        try {
          const { loadSavedGame } = require('../src/utils/storage');
          const saved = await loadSavedGame(isDaily ? 'daily' : isTimed ? 'timed' : 'classic');
          if (saved && !isSavedBoardValid(saved)) throw new Error('Kayıtlı oyun okunamadı. Mevcut veriler korunuyor.');
          // Şekil doğrulaması: bozuk/eski save crash'e yol açmasın.
          // Gerekli alanlar: slots, columns, drawnCards (arrays), deck, moves (number).
          const validSave = saved
            && typeof saved === 'object'
            && Array.isArray(saved.slots)
            && Array.isArray(saved.columns)
            && Array.isArray(saved.drawnCards)
            && Array.isArray(saved.deck)
            && typeof saved.moves === 'number'
            && (saved.gameLanguage ? saved.gameLanguage === gameLang : gameLang === 'tr')
            && (saved.gameMode ? saved.gameMode === (isDaily ? 'daily' : isTimed ? 'timed' : 'classic') : !isTimed && !isDaily)
            && (!isTimed || saved.isComplete || (Number.isFinite(saved.timeRemaining) && saved.timeRemaining > 0))
            && saved.levelId === activeLevel.id;
          if (validSave) {
            setGs({ ...saved, runId: saved.runId || createRunId() });
            if (Number.isFinite(saved.elapsedTime)) {
              setElapsedTime(saved.elapsedTime);
              startTimeRef.current = Date.now() - saved.elapsedTime * 1000;
            }
            if (isTimed && Number.isFinite(saved.timeRemaining)) {
              setTimeRemaining(saved.timeRemaining);
              timedEndRef.current = Date.now() + saved.timeRemaining * 1000;
            }
          } else {
            const fresh = generateGameState(activeLevel);
            if (isTimed) fresh.moves = 9999;
            setGs(fresh);
            setHistory([]); setElapsedTime(0); startTimeRef.current = Date.now();
            if (isTimed) {
              setTimeRemaining(getTimedSeconds(activeLevel.id));
              timedEndRef.current = null; pauseRemainRef.current = null;
            }
          } // A save for another level/language is never deleted while inspecting it.
        } catch (error) { throw error; }
      }
    }).then(() => { setSaveLoadError(null); setSaveReady(true); })
      .catch(error => { setSaveReady(false); setSaveLoadError(error.message || 'Kayıt okunamadı.'); });
  }, [loadAttempt]);

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

  // Every write reads the latest render, never the first state in a time window.
  latestSaveRef.current = saveReady && !gs.isComplete && !gs.isFailed
    ? { ...gs, levelId:isDaily ? level.id : levelId, gameLanguage:gameLang, gameMode:isDaily ? 'daily' : isTimed ? 'timed' : 'classic', timeRemaining, elapsedTime }
    : null;
  const flushGameSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    if (!skipSaveRef.current && latestSaveRef.current) {
      return saveSavedGame(latestSaveRef.current);
    }
    return Promise.resolve();
  }, []);

  useEffect(() => {
    if (latestSaveRef.current && !skipSaveRef.current) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { flushGameSave().catch(() => setFeedback(t.saveFailed || 'Oyun kaydedilemedi. Lütfen yeniden dene.')); }, 500);
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [gs, saveReady, gameLang, isDaily, isTimed, flushGameSave, setFeedback, t]);

  // Unmount'ta auto-save timer'ı temizle — timer ateşlenip saveSavedGame çağırsa
  // o sırada async bir pipeline'a kayıt takılmasın
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      flushGameSave().catch(() => setFeedback(t.saveFailed || 'Oyun kaydedilemedi. Lütfen yeniden dene.'));
    });
    return () => {
      sub.remove();
      flushGameSave().catch(error => console.warn('[Save] final write failed', error.message));
    };
  }, [flushGameSave, setFeedback, t]);

  useEffect(() => { if (feedback.msg) { const tmr = setTimeout(() => setFeedbackRaw({ msg: '', id: 0 }), 2500); return () => clearTimeout(tmr); } }, [feedback.id]);

  // BUG-4 FIX: Achievement popup 4 saniye sonra otomatik kapansın
  useEffect(() => {
    if (achievementPopup) {
      const tmr = setTimeout(() => setAchievementPopup(null), 4000);
      return () => clearTimeout(tmr);
    }
  }, [achievementPopup?.id, achievementPopup?.title]);

  // BUG-4 FIX: "Topla" → coin'i hemen ekle, popup'ı kapat, unseenAch decrement
  const claimAchievement = useCallback(async () => {
    if (!achievementPopup) return;
    try {
      const result = await claimAchievements(achievementPopup.achievementIds || [achievementPopup.id]);
      if (result.success) {
        setCoins(result.coins);
        setFeedback(`+${result.reward} 🪙`);
      }
      setAchievementPopup(null);
    } catch (e) {
      setFeedback(t.saveFailed || 'Ödül kaydedilemedi. Lütfen yeniden dene.');
    }
  }, [achievementPopup, setFeedback, t]);

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

  const placeCard = useCallback((selectedCard, source, sourceIndex, slotIndex) => {
    if (!saveReady) return;
    if (toolActionRef.current) return;
    setGs((current) => {
      let prev = current;
      let card = selectedCard;
      if (slotIndex < 0 || slotIndex >= prev.slots.length) return prev;
      if (prev.slots[slotIndex].locked) { setFeedback(t.isLocked); return prev; }
      const sourceCard = getMovableSource(prev, source, sourceIndex, card.id, true)?.[0];
      if (!sourceCard || sourceCard.id !== card.id || prev.isComplete || prev.isFailed) return prev;
      card = sourceCard;
      if (card.isJoker && prev.slots[slotIndex].category) {
        const prepared = prepareJokerPlacement(prev, card, prev.slots[slotIndex].category, level.categories);
        if (!prepared) return prev;
        prev = prepared.state;
        card = prepared.card;
      }

      const newSlots = prev.slots.map((sl) => ({ ...sl, placedCards: [...sl.placedCards] }));
      const target = newSlots[slotIndex];

      if (!target.category && card.type === 'category') {
        target.category = card;
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        setHistory((h) => [...h, current]);
        
        setTimeout(() => playSound('flip'), 10);
        setCombo((c) => { comboRef.current = c + 1; return c + 1; });
        const comboBonus = comboRef.current * 5;
        showScorePopup('+' + (5 + comboBonus));
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5 + comboBonus, isFailed: prev.moves - 1 <= 0 };
      }
      if (!target.category && card.type === 'word') { 
        setFeedback(card.isJoker ? (t.jokerNeedFilledSlot || '🃏 Joker\'i dolu bir kategori slotuna sürükle') : t.putCategoryFirst); 
        return prev; 
      }
      if (target.category && card.type === 'category') { setFeedback(t.alreadyFull); return prev; }
      if (target.category && card.type === 'word') {
        // Slot zaten tamamlanmış mı? Joker bile olsa konamaz
        if (target.placedCards.length >= target.category.totalWords) {
          setFeedback(t.alreadyFull || '✓ Bu kategori zaten tamamlandı');
          return prev;
        }
        if (card.categoryIndex !== target.category.categoryIndex && !card.isJoker) {
          setTimeout(() => { playSound('wrong'); }, 10);
          triggerShake(slotIndex);
          setFeedback(t.wrongPlace);
          setCombo(0); comboRef.current = 0;
          wrongMovesRef.current += 1;
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
        setHistory((h) => [...h, current]);

        if (catCompleted) {
          setFeedback('🎉 ' + target.category.word + t.categoryComplete);
          markCategoryCompleted(target.category.word, gameLang).catch(() => {});
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
        if (combo >= 3) setFeedback((t.comboToast || '🔥 {n}x Combo! +{bonus}').replace('{n}', combo).replace('{bonus}', comboBonus));
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + (totalPlaced * 10) + catBonus + comboBonus, completedCats: newCompletedCats, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
  }, [saveReady, level.categories, gameLang, t]);

  const moveToColumn = useCallback((card, source, sourceIndex, targetColIndex) => {
    if (!saveReady) return;
    if (toolActionRef.current) return;
    if (source === 'column' && sourceIndex === targetColIndex) return;
    // Kategori kartları sütuna KONAMAZ — AMA boş sütuna park edilebilir
    if (card.type === 'category') {
      setGs((prev) => {
        const live = getMovableSource(prev, source, sourceIndex, card.id);
        if (!live || !prev.columns[targetColIndex]) return prev;
        card = live[0];
        const targetCol = prev.columns[targetColIndex];
        if (targetCol.locked) { setFeedback(t.isLocked); return prev; }
        // Sadece BOŞ sütuna park edilebilir
        if (targetCol.cards.length > 0) {
          setFeedback(t.catOnlyEmptyColumn || '📂 Category card goes only on empty column!');
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
      const live = getMovableSource(prev, source, sourceIndex, card.id);
      if (!live || !prev.columns[targetColIndex]) return prev;
      card = live[0];
      const targetCol = prev.columns[targetColIndex];
      if (targetCol.locked) { setFeedback(t.isLocked); return prev; }
      
      if (targetCol.cards.length > 0) {
        const topCard = targetCol.cards[targetCol.cards.length - 1];
        if (!topCard.faceUp) { setFeedback(t.cantPlace); return prev; }
        // KURAL: Sadece AYNI KATEGORİ üst üste gelebilir (solitaire renk kuralı gibi)
        if (topCard.type === 'word' && card.categoryIndex !== topCard.categoryIndex && !card.isJoker && !topCard.isJoker) {
          setFeedback(t.diffCategoryStack || '⛔ Different category!');
          return prev;
        }
        // Kategori kartının üstüne kelime kartı konamaz (sütunda)
        if (topCard.type === 'category') {
          setFeedback(t.catMoveToSlot || '📂 Move category card to empty slot first!');
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
  }, [saveReady]);

  // Move entire stack to another column
  const moveStackToColumn = useCallback((stackCards, source, sourceIndex, targetColIndex) => {
    if (!saveReady) return;
    if (toolActionRef.current) return;
    if (source === 'column' && sourceIndex === targetColIndex) return;
    if (stackCards.some(c => c.type === 'category')) {
      setFeedback(t.catFirstSlot || '📂 Place category card in empty upper slot!');
      return;
    }
    setGs((prev) => {
      const live = getMovableSource(prev, source, sourceIndex, stackCards[0]?.id, true);
      if (source !== 'column' || !live || !prev.columns[targetColIndex]
        || live.length !== stackCards.length || live.some((card, i) => card.id !== stackCards[i].id)) return prev;
      stackCards = live;
      const targetCol = prev.columns[targetColIndex];
      if (targetCol.locked) { setFeedback(t.isLocked); return prev; }

      if (targetCol.cards.length > 0) {
        const topCard = targetCol.cards[targetCol.cards.length - 1];
        if (!topCard.faceUp) { setFeedback(t.cantPlace); return prev; }
        // AYNI KATEGORİ KURALI (Joker bypass)
        if (topCard.type === 'word' && stackCards[0].categoryIndex !== topCard.categoryIndex && !stackCards[0].isJoker && !topCard.isJoker) {
          setFeedback(t.diffCategoryShort || '⛔ Different category!');
          return prev;
        }
        if (topCard.type === 'category') {
          setFeedback(t.catMoveToSlot || '📂 Move category card to empty slot first!');
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
  }, [saveReady]);

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
      setFeedback((t.stackSelected || '✋ {n} cards selected').replace('{n}', stack.length));
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
    if (!saveReady) return;
    if (toolActionRef.current) return;
    setGs((p) => {
      if (p.isComplete || p.isFailed || p.moves <= 0) return p;
      if (p.deck.length === 0 && p.drawnCards.length === 0) { setFeedback(t.allCardsUsed); return p; }
      setHistory(h => [...h, p]);
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
  }, [saveReady]);

  const handleDrawnTap = useCallback(() => {
    if (gs.drawnCards.length === 0) { setFeedback(t.selectCardFirst); return; }
    handleCardTap(gs.drawnCards[gs.drawnCards.length - 1], 'drawn', null);
  }, [gs.drawnCards, handleCardTap]);

  const acquireTool = useCallback(async (tool, method) => {
    if (!saveReady) return;
    if (purchaseRef.current || !['coin','ad'].includes(method)) return null;
    purchaseRef.current = true;
    try {
      let progress;
      if (method === 'coin') {
        const result = await purchaseToolCredit(tool);
        progress = result.progress;
        setCoins(progress.coins); setToolCredits(progress.toolCredits || {});
        if (!result.success) {
          setFeedback(gameLang === 'tr' ? `Yetersiz coin. Gerekli: ${TOOL_PRICES[tool]}.` : `Not enough coins. Required: ${TOOL_PRICES[tool]}.`);
          return null;
        }
      } else {
        const result = await showRewarded(loading => setAdLoadingTool(loading ? tool : null));
        if (!result.success) return null;
        progress = await grantToolCredit(tool);
        setCoins(progress.coins); setToolCredits(progress.toolCredits || {});
      }
      setToolModal(null);
      return progress;
    } catch (error) {
      setFeedback(t.saveFailed || 'İşlem kaydedilemedi. Mevcut coin ve hakların korunuyor.');
      return null;
    } finally { purchaseRef.current = false; setAdLoadingTool(null); }
  }, [saveReady, gameLang, t, setFeedback]);

  const commitToolBoard = useCallback(async (tool, nextBoard, coinCost = 0) => {
    if (!saveReady || toolActionRef.current || navigationRef.current) return null;
    toolActionRef.current = true;
    try {
      const before = { ...gs, levelId:isDaily ? level.id : levelId, gameLanguage:gameLang,
        gameMode:isDaily ? 'daily' : isTimed ? 'timed' : 'classic', timeRemaining, elapsedTime };
      // Establish this run before the atomic action and drain queued autosaves.
      await saveSavedGame(before);
      const result = await commitBoardAction({before,after:{...before,...nextBoard,runId:before.runId},tool,coinCost});
      setCoins(result.progress.coins); setToolCredits(result.progress.toolCredits || {});
      if (!result.success) {
        if (tool) setToolModal(tool); else setFeedback(t.coinNeeded500);
        return null;
      }
      latestSaveRef.current = result.board;
      setGs(result.board); setSelected(null);
      return result.board;
    } catch (error) {
      setFeedback(error.code === 'BOARD_CONFLICT' ? error.message : (t.saveFailed || 'İşlem kaydedilemedi. Coin ve hakların korunuyor.'));
      return null;
    } finally { toolActionRef.current = false; }
  }, [saveReady, gs, isDaily, isTimed, level.id, levelId, gameLang, timeRemaining, elapsedTime, t]);

  const useUndo = useCallback(async () => {
    if (!saveReady || toolActionRef.current || !isToolUnlocked('undo')) return;
    if (history.length === 0) { setFeedback(t.nothingToUndo); return; }
    const previous = history[history.length - 1];
    const next = { ...previous, runId:gs.runId, _toolRevision:gs._toolRevision,
      // Undo cannot revoke permanent slot/column unlocks or purchased extra moves.
      slots:previous.slots.map((slot,i) => gs.slots[i]?.locked === false ? {...slot,locked:false} : slot),
      columns:previous.columns.map((col,i) => gs.columns[i]?.locked === false ? {...col,locked:false} : col),
      extraMovesGranted:gs.extraMovesGranted || 0,
      moves:previous.moves + Math.max(0,(gs.extraMovesGranted || 0)-(previous.extraMovesGranted || 0)),
      hintsUsed:gs.hintsUsed || 0 };
    next.isFailed = next.moves <= 0 && !next.isComplete;
    if (await commitToolBoard('undo',next)) {
      setHistory(h=>h.slice(0,-1)); setFeedback(t.undoDone);
    }
  }, [saveReady, gs, history, isToolUnlocked, commitToolBoard, t]);

  const executeUndo = useCallback(async (method) => {
    if (await acquireTool('undo',method)) setFeedback(t.undoAdded);
  }, [acquireTool, t]);

  const useDelete = useCallback(async () => {
    if (!saveReady) return;
    if (!isToolUnlocked('delete')) return;
    if (toolActionRef.current) return;
    const resolved = resolveDrawnWord(gs, level.categories.length);
    if (!resolved) { setFeedback(t.nothingToDelete); return; }
    if (await commitToolBoard('delete',resolved.state)) {
      setHistory(h => [...h, gs]); setFeedback(t.deleteDone);
      if (resolved.completedCategoryName) markCategoryCompleted(resolved.completedCategoryName, gameLang).catch(() => {});
    }
  }, [saveReady, gs, level.categories.length, isToolUnlocked, gameLang, t, commitToolBoard]);

  const executeDelete = useCallback(async (method) => {
    if (await acquireTool('delete',method)) setFeedback(t.deleteAdded);
  }, [acquireTool, t]);

  // ── Joker Card (Wildcard) ──
  const useJoker = useCallback(async () => {
    if (!saveReady) return;
    if (!isToolUnlocked('joker')) return;
    if (toolActionRef.current) return;
    if (gs.drawnCards.length === 0) { setFeedback(t.jokerNeedCard); return; }
    if (gs.drawnCards[gs.drawnCards.length - 1].type !== 'word' || gs.drawnCards[gs.drawnCards.length - 1].isJoker) { setFeedback(t.jokerNeedCard); return; }
    const drawnCards = [...gs.drawnCards], original = drawnCards[drawnCards.length-1];
    drawnCards[drawnCards.length-1] = {...original,jokerOriginal:{...original},isJoker:true,word:'',emoji:'🃏'};
    if (await commitToolBoard('joker',{...gs,drawnCards})) setFeedback(t.jokerActive);
  }, [saveReady, gs, isToolUnlocked, commitToolBoard, t]);

  const executeJoker = useCallback(async (method) => {
    if (await acquireTool('joker',method)) setFeedback(t.jokerAdded);
  }, [acquireTool, t]);

  // ── Shuffle (Karıştır) ──
  const useShuffle = useCallback(async () => {
    if (!saveReady || toolActionRef.current || !isToolUnlocked('shuffle')) return;
    if (gs.isComplete || gs.isFailed) return;
    const next = shuffleBoard(gs);
    if (!next) { setFeedback(t.shuffleNoCards); return; }
    if (await commitToolBoard('shuffle',next)) {
      setHistory(h=>[...h,gs]); setFeedback(t.shuffleDone); playSound('flip');
    }
  }, [saveReady, gs, isToolUnlocked, commitToolBoard, t]);

  // ── Smart Hint ──
  const useHint = useCallback(async () => {
    if (!saveReady) return;
    if (!isToolUnlocked('hint') || toolActionRef.current) return;
    const hint = findSlotHint(gs,level.categories);
    if (!hint) { setFeedback(t.hintNoMoves || 'Uygun kategori hamlesi yok. Desteden kart çekebilir veya sütunları düzenleyebilirsin.'); return; }
    if (await commitToolBoard('hint',{...gs,hintsUsed:(gs.hintsUsed || 0)+1})) {
      setHintCard(hint.cardId); setHintSlot(hint.slotIndex);
      setFeedback(hint.categoryName ? `💡 ${hint.word} → ${hint.categoryName}` : (t.hintToEmptySlot || '{word} → boş kategori alanı').replace('{word}',hint.word));
    }
  }, [saveReady, gs, level.categories, isToolUnlocked, t, commitToolBoard]);
  hintActionRef.current = useHint;

  const executeHint = useCallback(async (method) => {
    if (await acquireTool('hint',method)) await hintActionRef.current?.();
  }, [acquireTool]);

  const resetGame = useCallback(() => {
    completionPromiseRef.current = null;
    setCompletionReceipt(null); setRewardStatus('saving'); maxComboRef.current = 0;
    skipSaveRef.current = false;
    const newLevel = isDaily ? getDailyChallenge(gameLang, params.dailySeed ? parseInt(params.dailySeed) : undefined) : getLevel(levelId, gameLang);
    const state = generateGameState(newLevel);
    if (isTimed) state.moves = 9999;
    setGs(state); setHistory([]); setSelected(null);
    setHintCard(null); setHintSlot(null); setCombo(0); comboRef.current = 0; startTimeRef.current = Date.now(); setElapsedTime(0);
    wrongMovesRef.current = 0;
    if (isTimed) { setTimeRemaining(getTimedSeconds(levelId)); timedEndRef.current = null; pauseRemainRef.current = null; }
  }, [levelId, isDaily, isTimed, gameLang]);

  const addMovesAd = useCallback(async () => {
    if (!saveReady || isTimed) return;
    if (adLoadingTool) return;
    const result = await showRewarded((loading) => {
      setAdLoadingTool(loading ? 'moves' : null);
    });
    setAdLoadingTool(null);
    if (!result.success) {
      if (!result.handled && result.reason !== 'dismissed') setFeedback(t.adFailed || 'Reklam yüklenemedi');
      return;
    }
    setGs((p) => ({ ...p, moves: p.moves + 20, extraMovesGranted: (p.extraMovesGranted || 0) + 20, isFailed: false }));
    setFeedback(t.movesAdded);
  }, [saveReady, isTimed, adLoadingTool, t, setFeedback]);

  const addMovesCoin = useCallback(async () => {
    if (!saveReady || isTimed || purchaseRef.current) return;
    if (await commitToolBoard(null,{...gs,moves:gs.moves+20,extraMovesGranted:(gs.extraMovesGranted || 0)+20,isFailed:false},500)) {
      setFeedback(t.movesAdded);
    }
  }, [saveReady,isTimed,gs,commitToolBoard,t]);

  // A finished run is committed before any navigation, including Replay.
  const ensureCompletion = useCallback(() => {
    if (!gs.isComplete) return Promise.resolve(null);
    if (completionPromiseRef.current?.runId === gs.runId) return completionPromiseRef.current.promise;
    const promise = (async () => {
      setRewardStatus('saving');
      const mode = isDaily ? 'daily' : isTimed ? 'timed' : 'classic';
      const seed = String(level.id);
      const date = dailyDate || (isDaily ? `${seed.slice(0, 4)}-${seed.slice(4, 6)}-${seed.slice(6, 8)}` : undefined);
      // Persist the completed board first. Recovery retries the same runId.
      await saveSavedGame({ ...gs, levelId: level.id, gameLanguage: gameLang, gameMode: mode, timeRemaining, elapsedTime });
      const dailyAlreadyCompleted = isDaily ? await isDailyChallengeCompleted(date) : false;
      const result = await settleCompletion({ game: gs, level, mode, date, elapsedTime,
        timeLimit: getTimedSeconds(level.id), dailyAlreadyCompleted });
      setCoins(result.progress.coins);
      setToolCredits(result.progress.toolCredits || {});
      setUnlockedTools(result.progress.unlockedTools || []);
      setCompletionReceipt(result.receipt);
      setRewardStatus('saved');
      try {
        const dailyMap = await getDailyCompletionMap();
        const newAch = await checkAchievements({ ...result.progress, dailyCount: Object.keys(dailyMap).length,
          noHintWin: !(gs.hintsUsed > 0), speedWin: gs.moves - (gs.extraMovesGranted || 0) > level.moves / 2,
          perfectWin: wrongMovesRef.current === 0, maxCombo: maxComboRef.current });
        if (newAch.length) {
          await updateProgress(cur => ({ unseenAch: (cur.unseenAch || 0) + newAch.length }));
          setAchievementPopup({ ...newAch[0], pendingCoins: newAch.reduce((n, ach) => n + (ach.reward || 0), 0), achievementIds: newAch.map(ach => ach.id) });
        }
      } catch (e) { console.warn('[Completion] achievement check pending'); }
      if (result.firstSettlement) {
        try { submitScore({ score: result.progress.bestScore, level: result.progress.currentLevel,
          totalWins: result.progress.totalWins, language: gameLang, displayName: user?.name }).catch(() => {}); }
        catch (e) { console.warn('[Completion] leaderboard pending'); }
      }
      if (user) syncToCloud().catch(() => {});
      return result;
    })().catch(error => {
      completionPromiseRef.current = null;
      setRewardStatus('error');
      setFeedback(t.rewardSaveError || 'Ödül kaydedilemedi. Devam ederek yeniden deneyebilirsin.');
      throw error;
    });
    completionPromiseRef.current = { runId: gs.runId, promise };
    return promise;
  }, [gs, level, isDaily, isTimed, dailyDate, gameLang, elapsedTime, timeRemaining, user, syncToCloud, t]);

  useEffect(() => {
    if (gs.isComplete) ensureCompletion().catch(() => {});
  }, [gs.isComplete, gs.runId, ensureCompletion]);

  const completionSummary = completionReceipt || calculateCompletion({ game: gs, level,
    mode: isDaily ? 'daily' : isTimed ? 'timed' : 'classic', elapsedTime, timeLimit: getTimedSeconds(level.id) });

  const handleNextLevel = useCallback(async () => {
    if (navigationRef.current || toolActionRef.current) return;
    navigationRef.current = true;
    try {
      const result = await ensureCompletion();
      if (!result) return;
      skipSaveRef.current = true; latestSaveRef.current = null;
      await clearSavedGame(isDaily ? 'daily' : isTimed ? 'timed' : 'classic');
      if (isDaily) { router.canGoBack() ? router.back() : router.replace('/'); return; }
      const nextId = levelId + 1;
      const nextLevel = getLevel(nextId, gameLang);
      if (!nextLevel) { router.replace('/'); return; }
      if (nextId % 3 === 0) {
        try {
          const ad = await showRewardedInterstitial();
          if (ad.success) await updateProgress(cur => ({ coins: (cur.coins || 0) + 20 }), {kind:'reward',source:'ad',description:'Reklam ödülü'});
        } catch (e) { console.warn('[Completion] optional ad skipped'); }
      }
      setLevelId(nextId);
      const nextState = generateGameState(nextLevel);
      if (isTimed) nextState.moves = 9999;
      skipSaveRef.current = false;
      completionPromiseRef.current = null;
      setCompletionReceipt(null); setRewardStatus('saving');
      setGs(nextState); setHistory([]); setSelected(null); setHintCard(null); setHintSlot(null);
      setCombo(0); comboRef.current = 0; maxComboRef.current = 0; wrongMovesRef.current = 0;
      startTimeRef.current = Date.now(); setElapsedTime(0);
      if (isTimed) { setTimeRemaining(getTimedSeconds(nextId)); timedEndRef.current = null; pauseRemainRef.current = null; }
      const latest = await loadProgress(); setCoins(latest.coins || 0);
      const tool = result.receipt.newTools?.[0];
      if (tool) setTimeout(() => { playSound('unlock'); setToolIntro(TOOL_INFO[tool]); }, 500);
      if (nextId === 10 && !latest.dailyIntroShown) {
        await updateProgress({ dailyIntroShown: true }); setDailyIntro(true);
      }
      if (nextId === 5 && !latest.timedIntroShown) {
        await updateProgress({ timedIntroShown: true }); setTimedIntro(true);
      }
      if (user) syncToCloud().catch(() => {});
    } catch (e) { setFeedback(t.rewardSaveError || 'Kayıt tamamlanamadı. Lütfen yeniden dene.'); }
    finally { navigationRef.current = false; }
  }, [ensureCompletion, levelId, gameLang, isDaily, isTimed, user, syncToCloud, t]);

  // Failed classic games can continue with a durable shuffle and five moves.
  const applyFailedShuffle = useCallback(async () => {
    if (isTimed) return false;
    const shuffled = shuffleBoard(gs);
    if (!shuffled) { setFeedback(t.shuffleNoCards); return false; }
    const next = {...shuffled,moves:5,extraMovesGranted:(gs.extraMovesGranted || 0)+Math.max(0,5-gs.moves),isFailed:false};
    if (!await commitToolBoard('shuffle',next)) return false;
    _pendingFailedShuffleRef.current = false;
    playSound('flip'); setFeedback(t.shuffleDone); return true;
  }, [isTimed,gs,commitToolBoard,t]);

  const executeShuffle = useCallback(async (method) => {
    if (toolActionRef.current) return;
    const progress = await acquireTool('shuffle',method);
    if (!progress) return;
    if (_pendingFailedShuffleRef.current) await applyFailedShuffle();
    else setFeedback(t.shuffleAdded);
  }, [acquireTool,applyFailedShuffle,t]);

  const handleFailedShuffle = useCallback(async () => {
    if (!saveReady || isTimed || toolActionRef.current) return;
    _pendingFailedShuffleRef.current = true;
    await applyFailedShuffle();
  }, [saveReady,isTimed,applyFailedShuffle]);

  const handleReplay = useCallback(async () => {
    if (navigationRef.current || toolActionRef.current) return;
    navigationRef.current = true;
    try {
      if (gs.isComplete) await ensureCompletion();
      else await updateProgress(cur => ({ totalGames: (cur.totalGames || 0) + 1,
        streak: gs.isFailed ? 0 : (cur.streak || 0) }));
      skipSaveRef.current = true; latestSaveRef.current = null;
      await clearSavedGame(isDaily ? 'daily' : isTimed ? 'timed' : 'classic'); resetGame();
    } catch (e) { setFeedback(t.rewardSaveError || 'Kayıt tamamlanamadı. Lütfen yeniden dene.'); }
    finally { navigationRef.current = false; }
  }, [gs.isComplete, gs.isFailed, ensureCompletion, resetGame, t]);

  const handleHome = useCallback(async () => {
    if (navigationRef.current || toolActionRef.current) return;
    navigationRef.current = true;
    try {
      if (gs.isComplete) await ensureCompletion();
      else if (!gs.isFailed) await flushGameSave();
      else await updateProgress({ streak: 0 });
      skipSaveRef.current = true; latestSaveRef.current = null;
      if (gs.isComplete || gs.isFailed) await clearSavedGame(isDaily ? 'daily' : isTimed ? 'timed' : 'classic');
      router.canGoBack() ? router.back() : router.replace('/');
    } catch (e) { setFeedback(t.rewardSaveError || 'Kayıt tamamlanamadı. Lütfen yeniden dene.'); }
    finally { navigationRef.current = false; }
  }, [gs.isComplete, gs.isFailed, ensureCompletion, flushGameSave, t]);

  const selId = selected?.card?.id;
  const selectedStackIds = selected?.stackCards ? new Set(selected.stackCards.map((c) => c.id)) : null;
  
  // Dynamic card sizing based on actual column count
  const colCount = gs.columns.length;
  const dynCardW = Math.floor((SW - GAME_PAD * 2 - (colCount - 1) * COL_GAP) / colCount);
  const dynCardH = Math.floor(dynCardW * 1.3);
  const dynOverlap = -Math.floor(dynCardH * 0.75);
  const DCW = dynCardW; const DCH = dynCardH; // Sütun kartlarıyla aynı boyut
  // dragStackIds hesaplanır ama prop olarak geçilmez (performans)

  const handleUnlock = useCallback(async (type, index) => {
    if (!saveReady) return;
    if (adLoadingTool) return;
    const result = await showRewarded((loading) => {
      setAdLoadingTool(loading ? 'unlock' : null);
    });
    setAdLoadingTool(null);
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
    } else {
      if (!result.handled && result.reason !== 'dismissed') setFeedback(t.adFailed || 'Reklam yüklenemedi');
    }
  }, [saveReady, adLoadingTool, t]);

  const handleDrop = useCallback((dragInfo, dropX, dropY) => {
    const { card, source, sourceIndex, stackCards } = dragInfo;
    const stack = stackCards || [card];

    // ÖNCE drag'i temizle
    cancelDrag();

    // Basit Y tespiti: ekranın üst %45'i → slot, alt %55'i → sütun
    const isUpperHalf = dropY < SH * 0.45;

    // En yakın hedefi bul — gerçek ölçümlerden
    const findNearestFromLayouts = (layouts, count) => {
      let best = -1, bestD = 9999;
      for (let i = 0; i < count; i++) {
        const l = layouts[i];
        if (!l) continue;
        const center = l.x + l.w / 2;
        const d = Math.abs(dropX - center);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    };
    const findNearest = (count, startX, totalW, layouts) => {
      // Önce gerçek ölçümlerden dene
      if (layouts && layouts.length >= count && layouts[0]) {
        return findNearestFromLayouts(layouts, count);
      }
      // Fallback: hesapla
      const totalGap = COL_GAP * (count - 1);
      const itemW = (totalW - totalGap) / count;
      let best = -1, bestD = 9999;
      for (let i = 0; i < count; i++) {
        const center = startX + i * (itemW + COL_GAP) + itemW / 2;
        const d = Math.abs(dropX - center);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    };

    const trySlot = () => {
      const idx = findNearest(gs.slots.length, GAME_PAD, SW - GAME_PAD * 2, slotLayoutsRef.current);
      if (idx < 0 || idx >= gs.slots.length) return false;
      const slot = gs.slots[idx];
      // Slot kilitliyse → geç
      if (slot.locked) return false;
      // Boş slot + kategori kartı → yerleştir
      if (!slot.category && card.type === 'category') {
        placeCard(card, source, sourceIndex, idx);
        return true;
      }
      // Boş slot + kelime kartı → slot'a yerleşemez, sütuna dene
      // JOKER: Joker de boş slot'a yerleşemez. Joker yapan oyuncu kartı 
      // dolu (kategorisi atanmış, henüz tamamlanmamış) bir slot'a sürüklemeli.
      if (!slot.category && card.type === 'word') {
        if (card.isJoker) {
          setFeedback(t.jokerNeedFilledSlot || '🃏 Joker\'i dolu bir kategori slotuna sürükle');
        }
        return false;
      }
      // Dolu slot + kategori kartı → zaten dolu, sütuna dene
      if (slot.category && card.type === 'category') return false;
      // Dolu slot + kelime kartı → KATEGORİ EŞLEŞME kontrolü
      if (slot.category && card.type === 'word') {
        if (card.categoryIndex === slot.category.categoryIndex || card.isJoker) {
          placeCard(card, source, sourceIndex, idx);
          return true;
        }
        // Eşleşmiyorsa → sütuna dene (slot'u titretme!)
        return false;
      }
      return false;
    };

    const tryColumn = () => {
      const idx = findNearest(gs.columns.length, GAME_PAD, SW - GAME_PAD * 2, colLayoutsRef.current);
      if (idx >= 0 && idx < gs.columns.length) {
        if (stack.length > 1) moveStackToColumn(stack, source, sourceIndex, idx);
        else moveToColumn(card, source, sourceIndex, idx);
        return true;
      }
      return false;
    };

    // Üst yarı → önce slot, sonra sütun. Alt yarı → önce sütun, sonra slot.
    if (isUpperHalf) {
      if (!trySlot()) tryColumn();
    } else {
      if (!tryColumn()) trySlot();
    }
  }, [gs.slots, gs.columns, placeCard, moveToColumn, moveStackToColumn, cancelDrag]);
  handleDropRef.current = handleDrop;


  return (
    <View 
      style={st.container}
    >
      <ImageBackground source={BG_STARS} style={StyleSheet.absoluteFillObject} resizeMode="cover">
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21, 6, 41, 0.65)' }} />
      </ImageBackground>

      {!saveReady && <View style={st.adLoadingOverlay}>
        <View style={st.adLoadingCard}>
          <Text style={st.adLoadingText}>{saveLoadError ? (gameLang === 'tr' ? 'Oyun kaydı okunamadı. Verilerin korunuyor.' : 'Could not read your save. Your data is preserved.') : (gameLang === 'tr' ? 'Oyun kaydı yükleniyor…' : 'Loading your save…')}</Text>
          {saveLoadError ? <>
            <TouchableOpacity onPress={() => {setSaveLoadError(null);setLoadAttempt(n=>n+1);}}><Text style={{color:'#fff',marginTop:16}}>{gameLang === 'tr' ? 'Tekrar dene' : 'Try again'}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/')}><Text style={{color:'#fff',marginTop:16}}>{t.home}</Text></TouchableOpacity>
          </> : <ActivityIndicator color="#fff" style={{marginTop:12}} />}
        </View>
      </View>}

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
          <Text style={st.headerTitle}>{isDaily ? '📅 ' + (dailyDate || t.dailyUpper) : t.level + ' ' + gs.levelId}</Text>
          {combo >= 2 && <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: fs(11), color: COLORS.coin }}>🔥 {combo}x Combo</Text>}
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 4 }}>
            {gs.slots.filter(s => !s.locked).map((s, i) => (
              <View key={i} style={{ width: 20, height: 4, borderRadius: 2, backgroundColor: s.category && s.placedCards?.length >= (s.category?.totalWords || 99) ? COLORS.success : s.category ? COLORS.primary + '60' : 'rgba(255,255,255,0.1)' }} />
            ))}
          </View>
        </View>
        <View style={{ width: 80, alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          <TouchableOpacity style={st.settingsBtn} onPress={() => setPaused(true)}>
            <MaterialIcons name="pause" size={22} color={COLORS.onSurface} />
          </TouchableOpacity>
        </View>
      </View>

      {!!feedback.msg && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={st.feedbackBar}
          onPress={() => setFeedbackRaw({ msg: '', id: 0 })}
        >
          <Text style={st.feedbackText}>{feedback.msg}</Text>
        </TouchableOpacity>
      )}

      {!!adLoadingTool && (
        <View style={st.adLoadingOverlay}>
          <View style={st.adLoadingCard}>
            <MaterialIcons name="hourglass-top" size={28} color="#fff" />
            <Text style={st.adLoadingText}>{t.adLoading || 'Reklam yukleniyor...'}</Text>
          </View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} scrollEnabled={!scrollLocked} bounces={false} overScrollMode="never" ref={scrollRef}>
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
              if (drawnTouchRef.current.moved && dragRef.current.card) {
                // dragInfo kopyasını al (cancelDrag ref'i temizlemeden)
                const info = { ...dragRef.current };
                handleDropRef.current?.(info, e.nativeEvent.pageX, e.nativeEvent.pageY);
              } else if (drawnTouchRef.current.moved) {
                cancelDragRef.current?.();
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
                <Image source={CARD_BACK_IMG} style={{ width: DCW, height: DCH, borderRadius: 10 }} resizeMode="cover" />
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
            <Animated.View key={i} style={{ flex: 1, transform: [{ translateX: shakeSlotIdx === i ? shakeAnim : 0 }] }} onLayout={(e) => { const { x, y, width, height } = e.nativeEvent.layout; slotLayoutsRef.current[i] = { x: x + GAME_PAD, w: width }; }}>
              <FoundationSlot t={t} slot={slot} slotIndex={i} onPress={() => handleSlotTap(i)} onUnlock={handleUnlock} hinted={hintSlot === i} />
            </Animated.View>
          ))}
        </View>

        <View style={st.tableauRow}>
          {gs.columns.map((col, i) => (
            <View key={i} style={{ flex: 1 }} onLayout={(e) => { const { x, width } = e.nativeEvent.layout; colLayoutsRef.current[i] = { x: x + GAME_PAD, w: width }; }}>
              <TableauColumn column={col} colIndex={i} selectedId={selId} selectedStackIds={selectedStackIds} hintedId={hintCard}  onCardTap={handleCardTap} onColumnTap={handleColumnTap} onUnlock={handleUnlock} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} onScrollLock={lockScroll} onCancelDrag={cancelDrag} />
            </View>
          ))}
        </View>

        <View style={{ height: 200 }} />
      </ScrollView>

      {/* Toolbar */}
      <View style={st.toolbar}>
        <ToolBtn tone="hint" icon="lightbulb" label={t.hint} badge={toolCredits.hint > 0 ? toolCredits.hint : '🪙'} badgeColor={toolCredits.hint > 0 ? COLORS.success : COLORS.coin} onPress={useHint} locked={!isToolUnlocked('hint')} unlockLevel={TOOL_UNLOCK.hint} pulse={gs.moves <= 5 && !isTimed} />
        <ToolBtn tone="undo" icon="undo" label={t.undo} badge={toolCredits.undo > 0 ? toolCredits.undo : '🪙'} badgeColor={toolCredits.undo > 0 ? COLORS.success : COLORS.coin} onPress={useUndo} locked={!isToolUnlocked('undo')} unlockLevel={TOOL_UNLOCK.undo} pulse={gs.moves <= 3 && !isTimed} />
        <ToolBtn tone="joker" icon="style" label={t.joker || 'JOKER'} badge={toolCredits.joker > 0 ? toolCredits.joker : '🪙'} badgeColor={toolCredits.joker > 0 ? COLORS.success : COLORS.coin} onPress={useJoker} locked={!isToolUnlocked('joker')} unlockLevel={TOOL_UNLOCK.joker} />
        <ToolBtn tone="shuffle" icon="shuffle" label={t.shuffle || 'SHUFFLE'} badge={toolCredits.shuffle > 0 ? toolCredits.shuffle : '🪙'} badgeColor={toolCredits.shuffle > 0 ? COLORS.success : COLORS.coin} onPress={useShuffle} locked={!isToolUnlocked('shuffle')} unlockLevel={TOOL_UNLOCK.shuffle} />
        <ToolBtn tone="delete" icon="auto-fix-normal" label={t.delete} badge={toolCredits.delete > 0 ? toolCredits.delete : '🪙'} badgeColor={toolCredits.delete > 0 ? COLORS.success : COLORS.coin} onPress={useDelete} locked={!isToolUnlocked('delete')} unlockLevel={TOOL_UNLOCK.delete} />
      </View>

      {/* Ad Banner */}
      <View style={st.adBannerSpace}>
        <AdBanner />
      </View>

      {/* Achievement Popup — başarım coin'i GARANTİLİ verilir */}
      {achievementPopup && (
        <View style={st.achievPopup}>
          <Text style={{ fontSize: 28 }}>{achievementPopup.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#FFD166' }}>{(ACHIEVEMENT_I18N[gameLang] || ACHIEVEMENT_I18N.tr).earned}</Text>
            <Text style={{ fontFamily: FONTS.body, fontSize: 12, color: '#fff' }}>{(ACHIEVEMENT_I18N[gameLang] || ACHIEVEMENT_I18N.tr)[achievementPopup.id]?.[0] || achievementPopup.title}</Text>
            {achievementPopup.pendingCoins > 0 && (
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 12, color: '#FFD700', marginTop: 2 }}>+{achievementPopup.pendingCoins} 🪙</Text>
            )}
          </View>
          {/* BUG-4 FIX: Topla butonu — coin'i hemen verir, popup'ı kapatır */}
          {achievementPopup.pendingCoins > 0 && (
            <TouchableOpacity
              onPress={claimAchievement}
              style={{ backgroundColor: '#FFD166', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 13, color: '#1a0a30' }}>
                {t.claim || 'Topla'}
              </Text>
            </TouchableOpacity>
          )}
          {/* BUG-4 FIX: Çarpı butonu hitSlop genişletildi (eskiden tıklanmıyordu) */}
          <TouchableOpacity
            onPress={() => setAchievementPopup(null)}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            style={{ padding: 4 }}
          >
            <MaterialIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tool Purchase Modal */}
      {toolModal && (
        <View style={ov.overlay}>
          <View style={[ov.card, { paddingTop: 20, paddingBottom: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 20, color: COLORS.onSurface }}>
                {toolModal === 'hint' ? t.hint : toolModal === 'undo' ? t.undo : toolModal === 'joker' ? t.joker : toolModal === 'shuffle' ? t.shuffle : t.delete}
              </Text>
              <TouchableOpacity onPress={() => {
                // Fail-shuffle modalı kapatılırsa oyunu fail state'e geri döndür
                if (_pendingFailedShuffleRef.current) {
                  _pendingFailedShuffleRef.current = false;
                  setGs(prev => ({ ...prev, isFailed: true }));
                }
                setToolModal(null);
              }}><Text style={{ fontSize: 22, color: COLORS.fail }}>✕</Text></TouchableOpacity>
            </View>
            <View style={{ backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 20, alignItems: 'center', width: '100%', marginBottom: 16 }}>
              <MaterialIcons name={toolModal === 'hint' ? 'lightbulb' : toolModal === 'undo' ? 'undo' : toolModal === 'joker' ? 'style' : toolModal === 'shuffle' ? 'shuffle' : 'auto-fix-normal'} size={48} color={COLORS.secondary} />
              <Text style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                {toolModal === 'hint' ? t.hintDesc : toolModal === 'undo' ? t.undoDesc : toolModal === 'joker' ? t.jokerDesc : toolModal === 'shuffle' ? t.shuffleDesc : t.deleteDesc}
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
              <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' }}>▶ {t.watchAd || 'Watch Ad'}</Text>
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
          <LevelCompleteOverlay t={t} score={gs.score} summary={completionSummary} rewardStatus={rewardStatus} levelId={gs.levelId} combo={combo} isDaily={isDaily} elapsedTime={elapsedTime} onNext={handleNextLevel} onReplay={handleReplay} onHome={handleHome} />
        </>
      )}
      {gs.isFailed && !gs.isComplete && !toolModal && (
        <LevelFailedOverlay t={t} isTimed={isTimed} levelId={gs.levelId} onAddMovesAd={addMovesAd} onAddMovesCoin={addMovesCoin} onShuffle={handleFailedShuffle} onReplay={handleReplay} onHome={handleHome} />
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
        {dragCardRef.current && (
          <>
            <FaceUpCard card={dragCardRef.current.card} selected={true} w={CARD_W} h={CARD_H} />
            {dragCardRef.current.stackCards && dragCardRef.current.stackCards.length > 1 && (
              <View style={{ position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
                <Text style={{ fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#fff' }}>{dragCardRef.current.stackCards.length}</Text>
              </View>
            )}
          </>
        )}
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

function ToolBtn({ icon, label, badge, badgeColor, onPress, big, locked, unlockLevel, pulse, tone }) {
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
        <TouchableOpacity style={[st.toolBtn, big && st.toolBtnBig, tone && TOOL_COLORS[tone] && { backgroundColor: TOOL_COLORS[tone].bg, shadowColor: TOOL_COLORS[tone].glow, shadowOpacity: 0.7, borderColor: "rgba(255,255,255,0.4)" }]} onPress={onPress} activeOpacity={0.6}>
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

  adLoadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', zIndex: 999,
  },
  adLoadingCard: {
    backgroundColor: 'rgba(31,23,54,0.95)',
    paddingVertical: 18, paddingHorizontal: 28,
    borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(183,148,246,0.4)',
    flexDirection: 'row', gap: 12,
  },
  adLoadingText: {
    fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff',
  },
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
  catCardBorder: { borderColor: '#FFD166', borderWidth: 2.5, shadowColor: '#FFD166', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 18, elevation: 12 },
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
  lockedText: { fontFamily: FONTS.headlineBlack, fontSize: 11, color: '#FFE9A6', letterSpacing: 0.5 },
  adBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff' },
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
  adBannerSpace: { position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: 50, alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  achievPopup: { position: 'absolute', top: 100, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(30,10,50,0.95)', borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: '#FFD166', shadowColor: '#FFD166', shadowOpacity: 0.5, shadowRadius: 12, elevation: 10, zIndex: 200 },
});

