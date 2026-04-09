import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  PanResponder,
  Alert,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES, CATEGORY_COLORS } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { LEVELS, WORD_EMOJIS, generateGameState } from '../src/data/levels';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── FACE DOWN CARD ───
function FaceDownCard({ style, small }) {
  return (
    <LinearGradient
      colors={[COLORS.cardBackTop, COLORS.cardBackBottom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.faceDownCard, small && styles.faceDownCardSmall, style]}
    >
      <View style={styles.innerFrame}>
        <View style={styles.innerFrameInner} />
      </View>
    </LinearGradient>
  );
}

// ─── FACE UP CARD ───
function FaceUpCard({ card, style, small, onLayout }) {
  return (
    <View style={[styles.faceUpCard, small && styles.faceUpCardSmall, style]} onLayout={onLayout}>
      <Text style={[styles.cardEmoji, small && { fontSize: 22 }]}>{card.emoji}</Text>
      <Text style={[styles.cardWord, small && { fontSize: 6 }]} numberOfLines={1}>
        {card.word.toUpperCase()}
      </Text>
    </View>
  );
}

// ─── CATEGORY TAG ───
function CategoryTag({ category, index, onDrop, highlight, shake }) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (shake) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [shake]);

  useEffect(() => {
    if (highlight) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        { iterations: 3 }
      ).start();
    }
  }, [highlight]);

  const color = CATEGORY_COLORS[category.colorIndex % CATEGORY_COLORS.length];
  const placed = category.placedCards.length;
  const total = category.totalWords;
  const isFull = placed >= total;

  return (
    <Animated.View
      style={[
        styles.categoryContainer,
        { transform: [{ translateX: shakeAnim }, { scale: pulseAnim }] },
      ]}
    >
      {/* Tag label */}
      <View style={[styles.categoryTag, { backgroundColor: color }]}>
        <Text style={styles.categoryTagText} numberOfLines={1}>
          {category.name} {placed}/{total}
        </Text>
      </View>

      {/* Drop zone */}
      <View style={[styles.categoryDropZone, isFull && { borderColor: COLORS.success, borderStyle: 'solid' }]}>
        {placed > 0 ? (
          <View style={styles.categoryPlacedStack}>
            {category.placedCards.slice(-1).map((card, i) => (
              <View key={card.id} style={styles.categoryPlacedCard}>
                <Text style={{ fontSize: 14 }}>{card.emoji}</Text>
                <Text style={styles.categoryPlacedWord}>{card.word}</Text>
              </View>
            ))}
          </View>
        ) : (
          <MaterialIcons name="add" size={18} color="rgba(255,255,255,0.15)" />
        )}
        {isFull && (
          <View style={styles.categoryCheckMark}>
            <MaterialIcons name="check-circle" size={16} color={COLORS.success} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── TABLEAU COLUMN ───
function TableauColumn({ column, colIndex, onCardTap }) {
  if (column.locked) {
    return (
      <View style={styles.lockedColumn}>
        <MaterialIcons name="lock" size={18} color="rgba(255,255,255,0.3)" />
        <TouchableOpacity style={styles.adBadge}>
          <Text style={styles.adBadgeText}>AD</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (column.cards.length === 0) {
    return (
      <View style={styles.emptyColumn}>
        <MaterialIcons name="check" size={16} color="rgba(255,255,255,0.1)" />
      </View>
    );
  }

  return (
    <View style={styles.tableauColumn}>
      {column.cards.map((card, cardIndex) => {
        const isLast = cardIndex === column.cards.length - 1;
        const offset = cardIndex * 14; // overlap offset

        if (!card.faceUp) {
          return (
            <View
              key={card.id}
              style={[styles.tableauCardWrapper, { marginTop: cardIndex === 0 ? 0 : -42 }]}
            >
              <FaceDownCard small />
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={card.id}
            style={[styles.tableauCardWrapper, { marginTop: cardIndex === 0 ? 0 : -42, zIndex: 10 }]}
            onPress={() => isLast && onCardTap(card, 'column', colIndex)}
            activeOpacity={0.8}
          >
            <FaceUpCard card={card} small />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── MAIN GAME SCREEN ───
export default function GameScreen() {
  // Level 12 as default demo
  const level = LEVELS.find((l) => l.id === 12) || LEVELS[0];
  const [gameState, setGameState] = useState(() => generateGameState(level));
  const [selectedCard, setSelectedCard] = useState(null); // {card, source, sourceIndex}
  const [shakeCategory, setShakeCategory] = useState(null);
  const [highlightCategory, setHighlightCategory] = useState(null);
  const [history, setHistory] = useState([]);

  // Sparkle animation
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const sparklePos = useRef({ x: 0, y: 0 });

  // ─── DRAW FROM DECK ───
  const drawCard = useCallback(() => {
    setGameState((prev) => {
      if (prev.deck.length === 0) return prev;
      const newDeck = [...prev.deck];
      const drawn = { ...newDeck.pop(), faceUp: true };
      return {
        ...prev,
        deck: newDeck,
        drawnCards: [...prev.drawnCards, drawn],
      };
    });
  }, []);

  // ─── SELECT CARD (tap to select, tap category to place) ───
  const handleCardTap = useCallback((card, source, sourceIndex) => {
    if (selectedCard && selectedCard.card.id === card.id) {
      setSelectedCard(null); // deselect
      return;
    }
    setSelectedCard({ card, source, sourceIndex });
  }, [selectedCard]);

  // ─── TAP DRAWN CARD ───
  const handleDrawnCardTap = useCallback(() => {
    const gs = gameState;
    if (gs.drawnCards.length === 0) return;
    const topCard = gs.drawnCards[gs.drawnCards.length - 1];
    handleCardTap(topCard, 'drawn', null);
  }, [gameState, handleCardTap]);

  // ─── PLACE CARD IN CATEGORY ───
  const handleCategoryTap = useCallback((catIndex) => {
    if (!selectedCard) return;

    const { card, source, sourceIndex } = selectedCard;

    setGameState((prev) => {
      const newState = { ...prev };
      const category = { ...newState.categories[catIndex] };

      // Check if correct category
      const isCorrect = card.categoryIndex === catIndex;

      if (!isCorrect) {
        // Wrong! Shake + lose a move
        setShakeCategory(catIndex);
        setTimeout(() => setShakeCategory(null), 400);
        Vibration.vibrate(100);
        return { ...prev, moves: prev.moves - 1 };
      }

      // Correct placement
      category.placedCards = [...category.placedCards, card];
      const newCategories = [...newState.categories];
      newCategories[catIndex] = category;

      // Remove card from source
      let newDrawnCards = [...prev.drawnCards];
      let newColumns = prev.columns.map((col) => ({ ...col, cards: [...col.cards] }));

      if (source === 'drawn') {
        newDrawnCards = newDrawnCards.filter((c) => c.id !== card.id);
      } else if (source === 'column') {
        const col = newColumns[sourceIndex];
        col.cards = col.cards.filter((c) => c.id !== card.id);
        // Flip the new last card
        if (col.cards.length > 0) {
          const lastCard = { ...col.cards[col.cards.length - 1] };
          lastCard.faceUp = true;
          col.cards[col.cards.length - 1] = lastCard;
        }
      }

      // Check win
      const totalPlaced = newCategories.reduce((sum, c) => sum + c.placedCards.length, 0);
      const totalWords = newCategories.reduce((sum, c) => sum + c.totalWords, 0);
      const isComplete = totalPlaced >= totalWords;

      // Save history
      setHistory((h) => [...h, prev]);

      return {
        ...newState,
        categories: newCategories,
        drawnCards: newDrawnCards,
        columns: newColumns,
        moves: prev.moves - 1,
        score: prev.score + 10,
        isComplete,
        isFailed: prev.moves - 1 <= 0 && !isComplete,
      };
    });

    setSelectedCard(null);
  }, [selectedCard]);

  // ─── HINT ───
  const useHint = useCallback(() => {
    if (gameState.hints <= 0) return;

    // Find a playable card and highlight its category
    let found = false;

    // Check drawn cards
    if (gameState.drawnCards.length > 0) {
      const topDrawn = gameState.drawnCards[gameState.drawnCards.length - 1];
      setHighlightCategory(topDrawn.categoryIndex);
      found = true;
    }

    // Check columns
    if (!found) {
      for (const col of gameState.columns) {
        if (col.locked || col.cards.length === 0) continue;
        const lastCard = col.cards[col.cards.length - 1];
        if (lastCard.faceUp) {
          setHighlightCategory(lastCard.categoryIndex);
          found = true;
          break;
        }
      }
    }

    if (found) {
      setGameState((prev) => ({ ...prev, hints: prev.hints - 1, moves: prev.moves - 2 }));
      setTimeout(() => setHighlightCategory(null), 2000);
    }
  }, [gameState]);

  // ─── UNDO ───
  const useUndo = useCallback(() => {
    if (gameState.undos <= 0 || history.length === 0) return;
    const prevState = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setGameState({ ...prevState, undos: prevState.undos - 1 });
  }, [gameState, history]);

  // ─── DELETE (remove top drawn card) ───
  const useDelete = useCallback(() => {
    setGameState((prev) => {
      if (prev.drawnCards.length === 0) return prev;
      const newDrawn = prev.drawnCards.slice(0, -1);
      return { ...prev, drawnCards: newDrawn, moves: prev.moves - 1 };
    });
  }, []);

  // ─── COMPLETION / FAILURE ───
  useEffect(() => {
    if (gameState.isComplete) {
      setTimeout(() => {
        Alert.alert('🎉 Tebrikler!', `Bölüm ${gameState.levelId} tamamlandı!\nPuan: ${gameState.score}`, [
          { text: 'Ana Sayfa', onPress: () => router.back() },
        ]);
      }, 500);
    }
    if (gameState.isFailed) {
      setTimeout(() => {
        Alert.alert('😔 Hamlen Bitti!', 'Endişelenme, tekrar deneyebilirsin!', [
          { text: 'Tekrar Oyna', onPress: () => setGameState(generateGameState(level)) },
          { text: 'Ana Sayfa', onPress: () => router.back() },
        ]);
      }, 500);
    }
  }, [gameState.isComplete, gameState.isFailed]);

  // ─── RENDER ───
  const gs = gameState;

  // Split columns into rows
  const row1Cols = gs.columns.slice(0, level.colsPerRow + (level.lockedColumns.includes(0) ? 1 : 0));
  const row2Cols = gs.columns.slice(row1Cols.length);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientBottom]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ─── HEADER ─── */}
      <View style={styles.header}>
        <View style={styles.coinBadge}>
          <MaterialIcons name="monetization-on" size={18} color={COLORS.tertiaryFixed} />
          <Text style={styles.coinText}>{gs.coins}</Text>
        </View>
        <Text style={styles.headerTitle}>Bölüm {gs.levelId}</Text>
        <TouchableOpacity style={styles.settingsBtn}>
          <MaterialIcons name="settings" size={22} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* ─── SCROLLABLE CONTENT ─── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── MOVES + DRAWN + DECK ─── */}
        <View style={styles.deckRow}>
          {/* Moves */}
          <View style={styles.movesPanel}>
            <Text style={styles.movesLabel}>HAMLELER</Text>
            <Text style={styles.movesCount}>{gs.moves}</Text>
            <TouchableOpacity style={styles.addMovesBtn}>
              <MaterialIcons name="add" size={10} color="#fff" />
              <Text style={styles.addMovesText}>20</Text>
            </TouchableOpacity>
          </View>

          {/* Drawn cards stack */}
          <TouchableOpacity
            style={styles.drawnArea}
            onPress={handleDrawnCardTap}
            activeOpacity={0.8}
          >
            {gs.drawnCards.length === 0 ? (
              <View style={styles.emptyDrawn}>
                <MaterialIcons name="layers-clear" size={20} color="rgba(255,255,255,0.15)" />
              </View>
            ) : (
              <View style={styles.drawnStack}>
                {gs.drawnCards.slice(-3).map((card, i, arr) => {
                  const isTop = i === arr.length - 1;
                  const isSelected = selectedCard?.card.id === card.id;
                  return (
                    <View
                      key={card.id}
                      style={[
                        styles.drawnCardWrapper,
                        {
                          transform: [{ translateX: (i - arr.length + 1) * 10 }],
                          zIndex: i,
                          opacity: isTop ? 1 : 0.5 + i * 0.2,
                        },
                        isSelected && styles.selectedCard,
                      ]}
                    >
                      <FaceUpCard card={card} />
                    </View>
                  );
                })}
              </View>
            )}
          </TouchableOpacity>

          {/* Deck */}
          <TouchableOpacity onPress={drawCard} activeOpacity={0.8} style={styles.deckWrapper}>
            {gs.deck.length > 0 ? (
              <View>
                <FaceDownCard />
                <View style={styles.deckBadge}>
                  <Text style={styles.deckBadgeText}>{gs.deck.length}</Text>
                </View>
                <View style={styles.deckWandIcon}>
                  <MaterialIcons name="auto-fix-high" size={20} color="rgba(255,255,255,0.25)" />
                </View>
              </View>
            ) : (
              <View style={styles.emptyDeck}>
                <MaterialIcons name="block" size={20} color="rgba(255,255,255,0.15)" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── CATEGORIES (Foundation) ─── */}
        <View style={styles.categoriesRow}>
          {gs.categories.map((cat, i) => (
            <TouchableOpacity
              key={i}
              style={{ flex: 1 }}
              onPress={() => handleCategoryTap(i)}
              activeOpacity={0.85}
            >
              <CategoryTag
                category={cat}
                index={i}
                shake={shakeCategory === i}
                highlight={highlightCategory === i}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── TABLEAU ROW 1 ─── */}
        <View style={styles.tableauRow}>
          {row1Cols.map((col, i) => (
            <View key={`r1-${i}`} style={styles.tableauColWrapper}>
              <TableauColumn
                column={col}
                colIndex={i}
                onCardTap={handleCardTap}
              />
            </View>
          ))}
        </View>

        {/* ─── TABLEAU ROW 2 ─── */}
        {row2Cols.length > 0 && (
          <View style={[styles.tableauRow, { marginTop: 8 }]}>
            {row2Cols.map((col, i) => (
              <View key={`r2-${i}`} style={styles.tableauColWrapper}>
                <TableauColumn
                  column={col}
                  colIndex={row1Cols.length + i}
                  onCardTap={handleCardTap}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── BOTTOM TOOLBAR ─── */}
      <View style={styles.toolbar}>
        <ToolButton
          icon="lightbulb"
          label="İpucu"
          badge={gs.hints}
          badgeColor={COLORS.fail}
          onPress={useHint}
        />
        <ToolButton
          icon="undo"
          label="Geri Al"
          badge={gs.undos}
          badgeColor={COLORS.fail}
          onPress={useUndo}
        />
        <ToolButton
          icon="auto-fix-normal"
          label="Sil"
          badge="+"
          badgeColor={COLORS.success}
          onPress={useDelete}
        />
        <ToolButton
          icon="search"
          label="Ara"
          small
          onPress={() => {}}
        />
      </View>

      {/* ─── BOTTOM NAV ─── */}
      <BottomNav activeTab="home" onTabPress={(tab) => {
        if (tab === 'home') router.back();
      }} />
    </View>
  );
}

// ─── TOOL BUTTON ───
function ToolButton({ icon, label, badge, badgeColor, onPress, small }) {
  return (
    <View style={styles.toolBtnContainer}>
      <TouchableOpacity
        style={[styles.toolBtn, small && styles.toolBtnSmall]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <MaterialIcons name={icon} size={small ? 18 : 22} color="#fff" />
        {badge !== undefined && (
          <View style={[styles.toolBadge, { backgroundColor: badgeColor || COLORS.fail }]}>
            <Text style={styles.toolBadgeText}>{badge}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.toolLabel}>{label}</Text>
    </View>
  );
}

// ─── STYLES ───
const CARD_WIDTH = 56;
const CARD_HEIGHT = 76;
const SMALL_CARD_WIDTH = 48;
const SMALL_CARD_HEIGHT = 64;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 54,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 50,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  coinText: {
    fontFamily: FONTS.headline,
    fontSize: 13,
    color: COLORS.onSurface,
  },
  headerTitle: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 17,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 180,
    gap: 12,
  },

  // Deck Row
  deckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movesPanel: {
    backgroundColor: '#3C6E88',
    borderWidth: 2,
    borderColor: '#4A8099',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  movesLabel: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 7,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  movesCount: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 26,
    color: '#fff',
    lineHeight: 30,
  },
  addMovesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addMovesText: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 9,
    color: '#fff',
  },

  // Drawn cards
  drawnArea: {
    flex: 1,
    height: CARD_HEIGHT + 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDrawn: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  drawnStack: {
    width: CARD_WIDTH + 30,
    height: CARD_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawnCardWrapper: {
    position: 'absolute',
  },
  selectedCard: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 10,
  },

  // Deck
  deckWrapper: {
    position: 'relative',
  },
  deckBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: COLORS.fail,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deckBadgeText: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 9,
    color: '#fff',
  },
  deckWandIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDeck: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  // Face Down Card
  faceDownCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.cardBackBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  faceDownCardSmall: {
    width: '100%',
    height: undefined,
    aspectRatio: 4.5 / 6,
  },
  innerFrame: {
    flex: 1,
    margin: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerFrameInner: {
    width: '70%',
    height: '70%',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Face Up Card
  faceUpCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.cardFace,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  faceUpCardSmall: {
    width: '100%',
    height: undefined,
    aspectRatio: 4.5 / 6,
  },
  cardEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  cardWord: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 7,
    color: '#1e293b',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Categories
  categoriesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    width: '100%',
    alignItems: 'center',
  },
  categoryTagText: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 7,
    color: '#fff',
    textTransform: 'uppercase',
  },
  categoryDropZone: {
    width: '100%',
    aspectRatio: 4.5 / 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  categoryPlacedStack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  categoryPlacedCard: {
    width: '100%',
    backgroundColor: COLORS.cardFace,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    aspectRatio: 4.5 / 6,
  },
  categoryPlacedWord: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 6,
    color: '#1e293b',
    textTransform: 'uppercase',
  },
  categoryCheckMark: {
    position: 'absolute',
    top: 2,
    right: 2,
  },

  // Tableau
  tableauRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  tableauColWrapper: {
    flex: 1,
  },
  tableauColumn: {
    alignItems: 'center',
  },
  tableauCardWrapper: {
    width: '100%',
  },
  lockedColumn: {
    width: '100%',
    aspectRatio: 4.5 / 6,
    backgroundColor: 'rgba(60,110,136,0.3)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(74,128,153,0.5)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  adBadge: {
    backgroundColor: COLORS.tagOrange,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  adBadgeText: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 8,
    color: '#fff',
  },
  emptyColumn: {
    width: '100%',
    aspectRatio: 4.5 / 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Toolbar
  toolbar: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
    zIndex: 40,
  },
  toolBtnContainer: {
    alignItems: 'center',
    gap: 4,
  },
  toolBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.buttonBlue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  toolBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  toolBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toolBadgeText: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 9,
    color: '#fff',
  },
  toolLabel: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 8,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
