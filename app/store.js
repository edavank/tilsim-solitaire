import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert , ImageBackground} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES  } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress, updateProgress } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';
import { showRewarded, isAdsAvailable } from '../src/utils/ads';

const BG_STARS = require('../assets/bg-stars.webp');

const STORE_TEXT = {
  tr: { title: 'MAGAZA', earnCoins: 'Coin Kazan', watchAd: 'Reklam Izle', watchAdDesc: 'Reklam izle, 50 coin kazan!', earned: 'Kazandin!', earnedMsg: '50 coin eklendi.', boosters: 'Guclendiriciler', hint: 'Ipucu', hintDesc: 'Tikaninca yolunu bul', undo: 'Geri Al', undoDesc: 'Hatali hamleyi duzelt', notEnough: 'Yetersiz Coin', notEnoughMsg: '{n} coin eksik. Reklam izleyerek 50 coin kazanabilirsin.', watchAdBtn: 'Reklam Izle (+50)', cancelBtn: 'Vazgec', adLoading: 'Reklam yukleniyor...', bought: 'Eklendi!', boughtMsg: ' eklendi.', adFail: 'Reklam yuklenemedi', footer: 'TILSIM SOLITAIRE MAGAZA' },
  en: { title: 'STORE', earnCoins: 'Earn Coins', watchAd: 'Watch Ad', watchAdDesc: 'Watch an ad, earn 50 coins!', earned: 'You won!', earnedMsg: '50 coins added.', boosters: 'Boosters', hint: 'Hint', hintDesc: 'Find your way when stuck', undo: 'Undo', undoDesc: 'Fix wrong moves', notEnough: 'Not Enough Coins', notEnoughMsg: '{n} more coins needed. Watch an ad to earn 50 coins.', watchAdBtn: 'Watch Ad (+50)', cancelBtn: 'Cancel', adLoading: 'Ad loading...', bought: 'Added!', boughtMsg: ' added.', adFail: 'Ad could not load', footer: 'TILSIM SOLITAIRE STORE' },
  de: { title: 'SHOP', earnCoins: 'Coins verdienen', watchAd: 'Werbung ansehen', watchAdDesc: 'Werbung ansehen, 50 Coins!', earned: 'Gewonnen!', earnedMsg: '50 Coins hinzugefugt.', boosters: 'Booster', hint: 'Tipp', hintDesc: 'Finde deinen Weg', undo: 'Zuruck', undoDesc: 'Fehler korrigieren', notEnough: 'Nicht genug Coins', notEnoughMsg: '{n} Coins fehlen. Werbung ansehen fur 50 Coins.', watchAdBtn: 'Werbung ansehen (+50)', cancelBtn: 'Abbrechen', adLoading: 'Werbung wird geladen...', bought: 'Hinzugefugt!', boughtMsg: ' hinzugefugt.', adFail: 'Werbung nicht geladen', footer: 'TILSIM SOLITAIRE SHOP' },
  fr: { title: 'BOUTIQUE', earnCoins: 'Gagner des coins', watchAd: 'Regarder une pub', watchAdDesc: 'Regardez une pub, 50 coins!', earned: 'Gagne!', earnedMsg: '50 coins ajoutes.', boosters: 'Boosters', hint: 'Indice', hintDesc: 'Trouvez votre chemin', undo: 'Annuler', undoDesc: 'Corrigez les erreurs', notEnough: 'Pas assez de Coins', notEnoughMsg: 'Il manque {n} coins. Regardez une pub pour 50 coins.', watchAdBtn: 'Regarder pub (+50)', cancelBtn: 'Annuler', adLoading: 'Pub en cours...', bought: 'Ajoute!', boughtMsg: ' ajoute.', adFail: 'Pub non chargee', footer: 'TILSIM SOLITAIRE BOUTIQUE' },
  es: { title: 'TIENDA', earnCoins: 'Ganar monedas', watchAd: 'Ver anuncio', watchAdDesc: 'Ver un anuncio, 50 monedas!', earned: 'Ganaste!', earnedMsg: '50 monedas anadidas.', boosters: 'Potenciadores', hint: 'Pista', hintDesc: 'Encuentra tu camino', undo: 'Deshacer', undoDesc: 'Corrige errores', notEnough: 'Coins insuficientes', notEnoughMsg: 'Faltan {n} coins. Ver un anuncio para 50 coins.', watchAdBtn: 'Ver anuncio (+50)', cancelBtn: 'Cancelar', adLoading: 'Cargando anuncio...', bought: 'Anadido!', boughtMsg: ' anadido.', adFail: 'Anuncio no cargado', footer: 'TILSIM SOLITAIRE TIENDA' },
  ar: { title: 'STORE_AR', earnCoins: 'Earn', watchAd: 'Watch Ad', watchAdDesc: 'Watch ad, 50 coins!', earned: 'Win!', earnedMsg: '50 added.', boosters: 'Boosters', hint: 'Hint', hintDesc: 'Find way', undo: 'Undo', undoDesc: 'Fix error', notEnough: 'Not Enough Coins', notEnoughMsg: '{n} coins needed. Watch ad for 50.', watchAdBtn: 'Watch Ad (+50)', cancelBtn: 'Cancel', adLoading: 'Loading...', bought: 'Added!', boughtMsg: ' added.', adFail: 'Ad failed', footer: 'TILSIM' },
  ru: { title: 'MAGAZIN', earnCoins: 'Zarabotay monety', watchAd: 'Smotret reklamu', watchAdDesc: 'Posmotri reklamu, 50 monet!', earned: 'Polucheno!', earnedMsg: '50 monet dobavleno.', boosters: 'Usiliteli', hint: 'Podskazka', hintDesc: 'Naydi put', undo: 'Otmena', undoDesc: 'Isprav oshibku', notEnough: 'Nedostatochno monet', notEnoughMsg: 'Ne hvataet {n} monet. Smotri reklamu za 50.', watchAdBtn: 'Smotret reklamu (+50)', cancelBtn: 'Otmena', adLoading: 'Zagruzka...', bought: 'Dobavleno!', boughtMsg: ' dobavleno.', adFail: 'Reklama ne zagruzilas', footer: 'TILSIM SOLITAIRE' },
};

export default function StoreScreen() {
  const { lang } = useLang();
  const st = STORE_TEXT[lang] || STORE_TEXT.tr;
  const [coins, setCoins] = useState(0);
  const [adLoading, setAdLoading] = useState(false);
  const [insufficientModal, setInsufficientModal] = useState(null);

  useEffect(() => {
    loadProgress().then((p) => setCoins(p.coins)).catch(() => {});
  }, []);

  const BOOSTERS = [
    { name: st.hint, desc: st.hintDesc, icon: 'lightbulb', coinCost: 500, color: COLORS.secondary, toolKey: 'hint' },
    { name: st.undo, desc: st.undoDesc, icon: 'undo', coinCost: 450, color: COLORS.secondary, toolKey: 'undo' },
  ];

  const buyBooster = async (booster) => {
    let insufficient = false;
    let currentCoins = 0;
    try {
      const next = await updateProgress((cur) => {
        currentCoins = cur.coins || 0;
        if (currentCoins < booster.coinCost) {
          insufficient = true;
          return {};
        }
        const prevCredits = cur.toolCredits || { hint: 0, joker: 0, shuffle: 0, undo: 0, delete: 0 };
        return {
          coins: currentCoins - booster.coinCost,
          toolCredits: { ...prevCredits, [booster.toolKey]: (prevCredits[booster.toolKey] || 0) + 1 },
        };
      });
      if (insufficient) {
        setInsufficientModal({ booster, deficit: booster.coinCost - currentCoins });
        return;
      }
      setCoins(next.coins);
      Alert.alert(st.bought, booster.name + st.boughtMsg);
    } catch (e) {
      Alert.alert(st.adFail);
    }
  };

  const watchAdFromInsufficient = async () => {
    if (adLoading) return;
    setAdLoading(true);
    try {
      const result = await showRewarded();
      if (result && result.success) {
        const next = await updateProgress((cur) => ({ coins: (cur.coins || 0) + 50 }));
        setCoins(next.coins);
        if (insufficientModal && next.coins >= insufficientModal.booster.coinCost) {
          setInsufficientModal(null);
          Alert.alert(st.earned, st.earnedMsg);
        } else if (insufficientModal) {
          setInsufficientModal({
            booster: insufficientModal.booster,
            deficit: insufficientModal.booster.coinCost - next.coins,
          });
        }
      } else {
        Alert.alert(st.adFail);
      }
    } catch (e) {
      Alert.alert(st.adFail);
    }
    setAdLoading(false);
  };

  const watchAdForCoins = async () => {
    if (adLoading) return;
    setAdLoading(true);
    try {
      const result = await showRewarded();
      if (result && result.success) {
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
      <ImageBackground source={BG_STARS} style={StyleSheet.absoluteFillObject} resizeMode="cover">
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(21, 6, 41, 0.78)' }} />
      </ImageBackground>

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

      {insufficientModal && (
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => !adLoading && setInsufficientModal(null)}
        >
          <TouchableOpacity activeOpacity={1} style={s.modalCard} onPress={(e) => e.stopPropagation?.()}>
            <View style={s.modalIconCircle}>
              <Text style={{ fontSize: 28 }}>🪙</Text>
            </View>
            <Text style={s.modalTitle}>{st.notEnough}</Text>
            <Text style={s.modalDesc}>
              {(st.notEnoughMsg || '{n} coin needed.').replace('{n}', insufficientModal.deficit)}
            </Text>

            <TouchableOpacity
              style={[s.modalAdBtn, adLoading && { opacity: 0.6 }]}
              onPress={watchAdFromInsufficient}
              disabled={adLoading}
              activeOpacity={0.8}
            >
              <MaterialIcons name="play-circle-filled" size={20} color="#fff" />
              <Text style={s.modalAdBtnText}>
                {adLoading ? (st.adLoading || 'Loading...') : (st.watchAdBtn || 'Watch Ad (+50)')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => !adLoading && setInsufficientModal(null)}
              disabled={adLoading}
              activeOpacity={0.7}
            >
              <Text style={s.modalCancelText}>{st.cancelBtn || 'Cancel'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
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

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, zIndex: 999,
  },
  modalCard: {
    backgroundColor: COLORS.surface || '#1f1736',
    borderRadius: 20, padding: 24, width: '100%', maxWidth: 340,
    borderWidth: 1, borderColor: COLORS.panelBorder,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,200,80,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: FONTS.headlineBlack, fontSize: 18,
    color: COLORS.onSurface, marginBottom: 8, textAlign: 'center',
  },
  modalDesc: {
    fontFamily: FONTS.body, fontSize: 13,
    color: COLORS.onSurfaceVariant, textAlign: 'center',
    marginBottom: 22, lineHeight: 18,
  },
  modalAdBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: 14, marginBottom: 10,
  },
  modalAdBtnText: {
    fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff',
  },
  modalCancelBtn: {
    paddingVertical: 12, paddingHorizontal: 28,
  },
  modalCancelText: {
    fontFamily: FONTS.headline, fontSize: 14, color: COLORS.onSurfaceVariant,
  },
});
