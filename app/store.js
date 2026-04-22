import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES  } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress, updateProgress } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';
import { showRewarded } from '../src/utils/ads';

const STORE_TEXT = {
  tr: { title: 'MAĞAZA', earnCoins: 'Coin Kazan', watchAd: 'Reklam İzle', watchAdDesc: 'Reklam izle, 50 coin kazan!', earned: 'Kazandın!', earnedMsg: '50 coin eklendi.', boosters: 'Güçlendiriciler', hint: 'İpucu', hintDesc: 'Tıkanınca yolunu bul', undo: 'Geri Al', undoDesc: 'Hatalı hamleyi düzelt', notEnough: 'Yetersiz Coin', bought: 'Eklendi!', boughtMsg: ' eklendi.', adFail: 'Reklam yüklenemedi', footer: 'TILSIM SOLITAIRE MAĞAZA' },
  en: { title: 'STORE', earnCoins: 'Earn Coins', watchAd: 'Watch Ad', watchAdDesc: 'Watch an ad, earn 50 coins!', earned: 'You won!', earnedMsg: '50 coins added.', boosters: 'Boosters', hint: 'Hint', hintDesc: 'Find your way when stuck', undo: 'Undo', undoDesc: 'Fix wrong moves', notEnough: 'Not Enough Coins', bought: 'Added!', boughtMsg: ' added.', adFail: 'Ad could not load', footer: 'TILSIM SOLITAIRE STORE' },
  de: { title: 'SHOP', earnCoins: 'Coins verdienen', watchAd: 'Werbung ansehen', watchAdDesc: 'Werbung ansehen, 50 Coins!', earned: 'Gewonnen!', earnedMsg: '50 Coins hinzugefügt.', boosters: 'Booster', hint: 'Tipp', hintDesc: 'Finde deinen Weg', undo: 'Zurück', undoDesc: 'Fehler korrigieren', notEnough: 'Nicht genug Coins', bought: 'Hinzugefügt!', boughtMsg: ' hinzugefügt.', adFail: 'Werbung nicht geladen', footer: 'TILSIM SOLITAIRE SHOP' },
  fr: { title: 'BOUTIQUE', earnCoins: 'Gagner des coins', watchAd: 'Regarder une pub', watchAdDesc: 'Regardez une pub, 50 coins!', earned: 'Gagné!', earnedMsg: '50 coins ajoutés.', boosters: 'Boosters', hint: 'Indice', hintDesc: 'Trouvez votre chemin', undo: 'Annuler', undoDesc: 'Corrigez les erreurs', notEnough: 'Pas assez de Coins', bought: 'Ajouté!', boughtMsg: ' ajouté.', adFail: 'Pub non chargée', footer: 'TILSIM SOLITAIRE BOUTIQUE' },
  es: { title: 'TIENDA', earnCoins: 'Ganar monedas', watchAd: 'Ver anuncio', watchAdDesc: 'Ver un anuncio, 50 monedas!', earned: '¡Ganaste!', earnedMsg: '50 monedas añadidas.', boosters: 'Potenciadores', hint: 'Pista', hintDesc: 'Encuentra tu camino', undo: 'Deshacer', undoDesc: 'Corrige errores', notEnough: 'Coins insuficientes', bought: '¡Añadido!', boughtMsg: ' añadido.', adFail: 'Anuncio no cargado', footer: 'TILSIM SOLITAIRE TIENDA' },
  ar: { title: 'المتجر', earnCoins: 'اكسب عملات', watchAd: 'شاهد إعلانا', watchAdDesc: 'شاهد إعلانا واربح 50 عملة!', earned: 'فزت!', earnedMsg: 'تمت إضافة 50 عملة.', boosters: 'معززات', hint: 'تلميح', hintDesc: 'اعثر على طريقك', undo: 'تراجع', undoDesc: 'صحح الأخطاء', notEnough: 'عملات غير كافية', bought: 'تمت الإضافة!', boughtMsg: ' تمت الإضافة.', adFail: 'فشل تحميل الإعلان', footer: 'TILSIM SOLITAIRE متجر' },
  ru: { title: 'МАГАЗИН', earnCoins: 'Заработай монеты', watchAd: 'Смотреть рекламу', watchAdDesc: 'Посмотри рекламу, получи 50 монет!', earned: 'Получено!', earnedMsg: '50 монет добавлено.', boosters: 'Усилители', hint: 'Подсказка', hintDesc: 'Найди путь', undo: 'Отмена', undoDesc: 'Исправь ошибку', notEnough: 'Недостаточно монет', bought: 'Добавлено!', boughtMsg: ' добавлено.', adFail: 'Реклама не загрузилась', footer: 'TILSIM SOLITAIRE МАГАЗИН' },
};

export default function StoreScreen() {
  const { lang } = useLang();
  const st = STORE_TEXT[lang] || STORE_TEXT.tr;
  const [coins, setCoins] = useState(0);
  const [adLoading, setAdLoading] = useState(false);

  useEffect(() => {
    loadProgress().then((p) => setCoins(p.coins)).catch(() => {});
  }, []);

  const BOOSTERS = [
    { name: st.hint, desc: st.hintDesc, icon: 'lightbulb', coinCost: 500, color: COLORS.secondary, toolKey: 'hint' },
    { name: st.undo, desc: st.undoDesc, icon: 'undo', coinCost: 450, color: COLORS.secondary, toolKey: 'undo' },
  ];

  const buyBooster = async (booster) => {
    // CRITICAL FIX: Önceden sadece coin düşürülüyor, envantere booster
    // eklenmiyordu — kullanıcı coin harcayıp hiçbir şey almıyordu.
    // Artık progress.toolCredits[toolKey]++ ile game.js'nin okuduğu
    // yere yazılır. Ayrıca atomik: callback pattern ile concurrent
    // coin değişikliklerinde kayıp önlenir.
    let insufficient = false;
    try {
      const next = await updateProgress((cur) => {
        if ((cur.coins || 0) < booster.coinCost) {
          insufficient = true;
          return {}; // no-op patch
        }
        const prevCredits = cur.toolCredits || { hint: 0, joker: 0, shuffle: 0, undo: 0, delete: 0 };
        return {
          coins: (cur.coins || 0) - booster.coinCost,
          toolCredits: { ...prevCredits, [booster.toolKey]: (prevCredits[booster.toolKey] || 0) + 1 },
        };
      });
      if (insufficient) {
        Alert.alert(st.notEnough, `${booster.coinCost} coin`);
        return;
      }
      setCoins(next.coins);
      Alert.alert(st.bought, booster.name + st.boughtMsg);
    } catch (e) {
      Alert.alert(st.adFail);
    }
  };

  const watchAdForCoins = async () => {
    if (adLoading) return;
    setAdLoading(true);
    try {
      const result = await showRewarded();
      if (result && result.success) {
        // Atomik: concurrent coin yazımını koru
        const next = await updateProgress((cur) => ({ coins: (cur.coins || 0) + 50 }));
        setCoins(next.coins);
        Alert.alert(st.earned, st.earnedMsg);
      } else {
        Alert.alert(st.adFail);
      }
    } catch (e) {
      Alert.alert(st.adFail);
    }
    setAdLoading(false);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={[COLORS.gradientTop, COLORS.gradientBottom]} style={StyleSheet.absoluteFillObject} />

      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{st.title}</Text>
        </View>
        <View style={s.coinBadge}>
          <Text style={{ fontSize: 12 }}>🪙</Text>
          <Text style={s.coinText}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <Text style={s.sectionTitle}>{st.earnCoins}</Text>
        <TouchableOpacity activeOpacity={0.85} onPress={watchAdForCoins} style={s.adCard} disabled={adLoading}>
          <View style={s.adIconCircle}>
            <MaterialIcons name="play-circle-filled" size={44} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={s.adTitle}>{st.watchAd}</Text>
            <Text style={s.adDesc}>{st.watchAdDesc}</Text>
          </View>
          <View style={s.adReward}>
            <Text style={{ fontSize: 18 }}>🪙</Text>
            <Text style={s.adRewardText}>+50</Text>
          </View>
        </TouchableOpacity>

        <Text style={[s.sectionTitle, { marginTop: 28 }]}>{st.boosters}</Text>
        <View style={s.boosterRow}>
          {BOOSTERS.map((b, i) => (
            <TouchableOpacity key={i} style={s.boosterCard} onPress={() => buyBooster(b)} activeOpacity={0.7}>
              <View style={[s.boosterIcon, { backgroundColor: b.color + '22' }]}>
                <MaterialIcons name={b.icon} size={22} color={b.color} />
              </View>
              <Text style={s.boosterName}>{b.name}</Text>
              <Text style={s.boosterDesc}>{b.desc}</Text>
              <View style={s.boosterPrice}>
                <Text style={{ fontSize: 12 }}>🪙</Text>
                <Text style={s.boosterPriceText}>{b.coinCost}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.footerText}>{st.footer}</Text>
        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav activeTab="store" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff', fontStyle: 'italic' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  sectionTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: COLORS.onSurface, marginBottom: 14 },

  adCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.panelBg, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.primary + '55',
  },
  adIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  adTitle: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.onSurface, marginBottom: 2 },
  adDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant },
  adReward: { alignItems: 'center' },
  adRewardText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: COLORS.coin, marginTop: 2 },

  boosterRow: { flexDirection: 'row', gap: 12 },
  boosterCard: {
    flex: 1, backgroundColor: COLORS.panelBg, borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  boosterIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  boosterName: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.onSurface, marginBottom: 2 },
  boosterDesc: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.onSurfaceVariant, textAlign: 'center', marginBottom: 8 },
  boosterPrice: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  boosterPriceText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: COLORS.coin },

  footerText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.outlineVariant, textAlign: 'center', marginTop: 24, letterSpacing: 2 },
});
