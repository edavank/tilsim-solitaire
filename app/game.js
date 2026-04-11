import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ScrollView, Vibration, Image, Animated,
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
const OWL_HAPPY = require('../assets/bilge-happy.png');

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

function FaceUpCard({ card, selected, w, h }) {
  const cw = w || CARD_W; const ch = h || CARD_H;
  const isCat = card.type === 'category';
  return (
    <View style={[st.faceUp, { width: cw, height: ch }, selected && st.cardSelected, isCat && st.catCardBorder]}>
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
    const p = slot.placedCards.length; const t = slot.category.totalWords;
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
    </TouchableOpacity>
  );
}

function TableauColumn({ column, colIndex, selectedId, onCardTap }) {
  if (column.locked) {
    return (
      <View style={[st.slotBox, st.slotDashed, { height: CARD_H }]}>
        <MaterialIcons name="lock" size={16} color="rgba(255,255,255,0.2)" />
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
              <TouchableOpacity activeOpacity={0.7} onPress={() => { if (isLast) onCardTap(card, 'column', colIndex); }} disabled={!isLast}>
                <FaceUpCard card={card} selected={isLast && selectedId === card.id} />
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

        <TouchableOpacity style={ov.rewardRow} activeOpacity={0.7}>
          <MaterialIcons name="card-giftcard" size={22} color={COLORS.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={ov.rewardLabel}>YENİ ÖDÜL</Text>
            <Text style={ov.rewardName}>Mistik Kart Arkalığı</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={COLORS.onSurfaceVariant} />
        </TouchableOpacity>

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
        {/* Broken heart */}
        <View style={ov.heartWrap}>
          <MaterialIcons name="heart-broken" size={64} color={COLORS.primary} />
          <TouchableOpacity style={ov.closeBtn} onPress={onHome}>
            <MaterialIcons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Image source={OWL_HAPPY} style={[ov.owl, { width: 160, height: 160 }]} />

        <View style={ov.speechBubble}>
          <Text style={ov.speechText}>Bazen kaybetmek de öğretir...</Text>
        </View>

        <Text style={ov.failTitle}>Hamlen Bitti!</Text>
        <Text style={ov.failSub}>Üzülme, yıldızlar her zaman parlamaz.</Text>

        <TouchableOpacity onPress={onAddMoves} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={ov.addMovesBtn}>
            <MaterialIcons name="play-circle-filled" size={22} color="#fff" />
            <Text style={ov.addMovesText}>+20 Hamle (Ad)</Text>
            <View style={ov.freeBadge}><Text style={ov.freeText}>ÜCRETSİZ</Text></View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={ov.failBottom}>
          <TouchableOpacity style={ov.failInfoBox} activeOpacity={0.7}>
            <Text style={ov.failInfoLabel}>MEVCUT BÖLÜM</Text>
            <Text style={ov.failInfoValue}>{levelId}. Takımyıldız</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ov.failInfoBox} onPress={onReplay} activeOpacity={0.7}>
            <Text style={[ov.failInfoLabel, { color: COLORS.primary }]}>32%</Text>
            <MaterialIcons name="trending-up" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ── Main Game Screen ── */
export default function GameScreen() {
  const level = LEVELS.find((l) => l.id === 1) || LEVELS[0];
  const [gs, setGs] = useState(() => generateGameState(level));
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState('Karta dokun, sonra slot\'a dokun!');
  const [history, setHistory] = useState([]);

  useEffect(() => { if (feedback) { const t = setTimeout(() => setFeedback(''), 2500); return () => clearTimeout(t); } }, [feedback]);

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
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 5, isFailed: prev.moves - 1 <= 0 };
      }
      if (!target.category && card.type === 'word') { setFeedback('⚠️ Önce kategori koy!'); return prev; }
      if (target.category && card.type === 'category') { setFeedback('⚠️ Zaten dolu!'); return prev; }
      if (target.category && card.type === 'word') {
        if (card.categoryIndex !== target.category.categoryIndex) {
          Vibration.vibrate(100);
          setFeedback('❌ Yanlış! (-1 hamle)');
          return { ...prev, moves: prev.moves - 1, isFailed: prev.moves - 1 <= 0 };
        }
        target.placedCards.push(card);
        const ns = removeFromSource(prev, source, sourceIndex, card.id);
        let done = true;
        for (const sl of newSlots) if (sl.category && sl.placedCards.length < sl.category.totalWords) done = false;
        const catsPlaced = newSlots.filter((sl) => sl.category).length;
        const isComplete = done && catsPlaced >= level.categories.length;
        setHistory((h) => [...h, prev]);
        setFeedback('✅ Doğru! (+10)');
        return { ...ns, slots: newSlots, moves: prev.moves - 1, score: prev.score + 10, isComplete, isFailed: prev.moves - 1 <= 0 && !isComplete };
      }
      return prev;
    });
  }, [gs.slots, level.categories.length]);

  const handleCardTap = useCallback((card, source, sourceIndex) => {
    setSelected((prev) => {
      if (prev && prev.card.id === card.id) { setFeedback(''); return null; }
      setFeedback('✋ ' + card.word + ' seçildi → Slot\'a dokun');
      return { card, source, sourceIndex };
    });
  }, []);

  const handleSlotTap = useCallback((slotIndex) => {
    if (!selected) { setFeedback('Önce kart seç!'); return; }
    placeCard(selected.card, selected.source, selected.sourceIndex, slotIndex);
    setSelected(null);
  }, [selected, placeCard]);

  const drawCard = useCallback(() => {
    setGs((p) => {
      if (p.deck.length === 0) { setFeedback('Deste boş!'); return p; }
      const d = [...p.deck]; const card = { ...d.pop(), faceUp: true };
      setFeedback('🎴 ' + card.word + ' çekildi!');
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

  const resetGame = useCallback(() => { setGs(generateGameState(level)); setHistory([]); setSelected(null); }, [level]);

  const addMoves = useCallback(() => {
    setGs((p) => ({ ...p, moves: p.moves + 20, isFailed: false }));
    setFeedback('⚡ +20 hamle eklendi!');
  }, []);

  const selId = selected?.card?.id;
  const DCW = Math.floor(CARD_W * 1.1); const DCH = Math.floor(CARD_H * 1.1);

  return (
    <View style={st.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      <View style={st.header}>
        <View style={st.coinBadge}>
          <MaterialIcons name="monetization-on" size={16} color={COLORS.coin} />
          <Text style={st.coinText}>{gs.coins}</Text>
        </View>
        <Text style={st.headerTitle}>Bölüm {gs.levelId}</Text>
        <TouchableOpacity style={st.settingsBtn} onPress={() => router.push('/settings')}>
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
                    <FaceUpCard card={card} selected={i === arr.length - 1 && selId === card.id} w={DCW} h={DCH} />
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
              <View style={[st.emptyCard, { width: DCW, height: DCH }]}><MaterialIcons name="block" size={18} color="rgba(255,255,255,0.12)" /></View>
            )}
          </TouchableOpacity>
        </View>

        <View style={st.slotsRow}>
          {gs.slots.map((slot, i) => (
            <View key={i} style={{ flex: 1 }}>
              <FoundationSlot slot={slot} onPress={() => handleSlotTap(i)} />
            </View>
          ))}
        </View>

        <View style={st.tableauRow}>
          {gs.columns.map((col, i) => (
            <View key={i} style={{ flex: 1 }}>
              <TableauColumn column={col} colIndex={i} selectedId={selId} onCardTap={handleCardTap} />
            </View>
          ))}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Toolbar */}
      <View style={st.toolbar}>
        <ToolBtn icon="lightbulb" label="İPUCU" badge={gs.hints} badgeColor={COLORS.fail} onPress={() => { setGs(p => ({ ...p, hints: Math.max(0, p.hints - 1) })); setFeedback('💡 İpucu!'); }} />
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

      {/* Overlays */}
      {gs.isComplete && (
        <LevelCompleteOverlay
          score={gs.score}
          coins={250}
          onNext={() => router.back()}
          onReplay={resetGame}
          onHome={() => router.back()}
        />
      )}
      {gs.isFailed && !gs.isComplete && (
        <LevelFailedOverlay
          levelId={gs.levelId}
          onAddMoves={addMoves}
          onReplay={resetGame}
          onHome={() => router.back()}
        />
      )}
    </View>
  );
}

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
  owl: { width: 200, height: 200, borderRadius: 20, marginTop: -60, marginBottom: 8 },
  title: { fontFamily: FONTS.headlineBlack, fontSize: 36, color: COLORS.onSurface, fontStyle: 'italic' },
  subtitle: { fontFamily: FONTS.headlineBlack, fontSize: 13, color: COLORS.secondary, letterSpacing: 3, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  statBox: { flex: 1, backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 16, alignItems: 'center' },
  statLabel: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  statValue: { fontFamily: FONTS.headlineBlack, fontSize: 28, color: COLORS.onSurface, marginTop: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 14, width: '100%', marginBottom: 16, borderWidth: 1, borderColor: COLORS.panelBorder },
  rewardLabel: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  rewardName: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.onSurface, marginTop: 2 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 40, borderRadius: SIZES.radiusFull },
  nextBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: '#fff' },
  bottomRow: { flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' },
  replayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: SIZES.radiusFull, borderWidth: 1.5, borderColor: COLORS.secondary },
  replayText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.secondary },
  homeBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: COLORS.panelBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },

  // Fail-specific
  heartWrap: { alignItems: 'center', marginBottom: 8 },
  closeBtn: { position: 'absolute', top: 0, right: -80, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  speechBubble: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  speechText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, fontStyle: 'italic' },
  failTitle: { fontFamily: FONTS.headlineBlack, fontSize: 32, color: COLORS.onSurface, marginBottom: 4 },
  failSub: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 20, textAlign: 'center' },
  addMovesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 24, borderRadius: SIZES.radiusFull },
  addMovesText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },
  freeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: SIZES.radiusFull },
  freeText: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: '#fff', letterSpacing: 1 },
  failBottom: { flexDirection: 'row', gap: 10, marginTop: 16, width: '100%' },
  failInfoBox: { flex: 1, backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.panelBorder },
  failInfoLabel: { fontFamily: FONTS.headlineBlack, fontSize: 9, color: COLORS.onSurfaceVariant, letterSpacing: 1 },
  failInfoValue: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.onSurface, marginTop: 2 },
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
  catCardBorder: { borderColor: COLORS.cardBackBorder, borderWidth: 2 },
  word: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: '#1e293b', textAlign: 'center', lineHeight: 9 },
  catBadge: { position: 'absolute', top: 2, right: 3 },
  catBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 7, color: COLORS.cardBackTop },
  catName: { fontFamily: FONTS.headlineBlack, fontSize: 8, color: '#1e293b', textAlign: 'center', lineHeight: 10, marginTop: 2 },
  slotsRow: { flexDirection: 'row', gap: 3 },
  slotBox: { borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  slotDashed: { borderColor: COLORS.panelBorder, borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.03)' },
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
