import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES , getThemeGradient } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';
import { loadProgress, updateProgress } from '../src/utils/storage';
import { useLang } from '../src/context/LanguageContext';


const STORE_TEXT = {
  tr: { premium: 'PREMİUM', noAds: 'Reklamsız Deneyim', noAdsDesc: 'Kesintisiz oyun keyfi için reklamları kaldırın.', coinPacks: 'Coin Paketleri', small: 'Küçük bir başlangıç', popular: 'En çok tercih edilen', popularBadge: 'EN POPÜLER', best: 'EN İYİ FİYAT', boosters: 'Güçlendiriciler', hint: 'İpucu', hintDesc: 'Tıkanınca yolunu bul', undo: 'Geri Al', undoDesc: 'Hatalı hamleyi düzelt', restore: 'Satın Alımları Geri Yükle', coming: 'Yakında!', comingMsg: 'IAP entegrasyonu gerekli.', notEnough: 'Yetersiz Coin', bought: 'Satın Alındı!', boughtMsg: ' eklendi.', footer: 'TILSIM SOLITAIRE MAĞAZA' },
  en: { premium: 'PREMIUM', noAds: 'Ad-Free Experience', noAdsDesc: 'Remove ads for uninterrupted gameplay.', coinPacks: 'Coin Packs', small: 'A small start', popular: 'Most preferred', popularBadge: 'MOST POPULAR', best: 'BEST VALUE', boosters: 'Boosters', hint: 'Hint', hintDesc: 'Find your way when stuck', undo: 'Undo', undoDesc: 'Fix wrong moves', restore: 'Restore Purchases', coming: 'Coming Soon!', comingMsg: 'IAP integration required.', notEnough: 'Not Enough Coins', bought: 'Purchased!', boughtMsg: ' added.', footer: 'TILSIM SOLITAIRE STORE' },
  de: { premium: 'PREMIUM', noAds: 'Werbefreies Erlebnis', noAdsDesc: 'Entfernen Sie Werbung.', coinPacks: 'Coin-Pakete', small: 'Ein kleiner Anfang', popular: 'Am beliebtesten', popularBadge: 'BELIEBTESTE', best: 'BESTER WERT', boosters: 'Booster', hint: 'Tipp', hintDesc: 'Finde deinen Weg', undo: 'Zurück', undoDesc: 'Fehler korrigieren', restore: 'Käufe wiederherstellen', coming: 'Bald!', comingMsg: 'IAP erforderlich.', notEnough: 'Nicht genug Coins', bought: 'Gekauft!', boughtMsg: ' hinzugefügt.', footer: 'TILSIM SOLITAIRE SHOP' },
  fr: { premium: 'PREMIUM', noAds: 'Sans publicité', noAdsDesc: 'Supprimez les pubs.', coinPacks: 'Packs de Coins', small: 'Un petit début', popular: 'Le plus choisi', popularBadge: 'POPULAIRE', best: 'MEILLEUR PRIX', boosters: 'Boosters', hint: 'Indice', hintDesc: 'Trouvez votre chemin', undo: 'Annuler', undoDesc: 'Corrigez les erreurs', restore: 'Restaurer les achats', coming: 'Bientôt!', comingMsg: 'IAP requis.', notEnough: 'Pas assez de Coins', bought: 'Acheté!', boughtMsg: ' ajouté.', footer: 'TILSIM SOLITAIRE BOUTIQUE' },
  es: { premium: 'PREMIUM', noAds: 'Sin anuncios', noAdsDesc: 'Elimina los anuncios.', coinPacks: 'Packs de Coins', small: 'Un pequeño inicio', popular: 'El más elegido', popularBadge: 'MÁS POPULAR', best: 'MEJOR PRECIO', boosters: 'Potenciadores', hint: 'Pista', hintDesc: 'Encuentra tu camino', undo: 'Deshacer', undoDesc: 'Corrige errores', restore: 'Restaurar compras', coming: '¡Pronto!', comingMsg: 'IAP requerido.', notEnough: 'Coins insuficientes', bought: '¡Comprado!', boughtMsg: ' añadido.', footer: 'TILSIM SOLITAIRE TIENDA' },
  ar: { premium: 'مميز', noAds: 'بدون إعلانات', noAdsDesc: 'أزل الإعلانات.', coinPacks: 'حزم العملات', small: 'بداية صغيرة', popular: 'الأكثر اختياراً', popularBadge: 'الأكثر شعبية', best: 'أفضل قيمة', boosters: 'معززات', hint: 'تلميح', hintDesc: 'اعثر على طريقك', undo: 'تراجع', undoDesc: 'صحح الأخطاء', restore: 'استعادة المشتريات', coming: 'قريباً!', comingMsg: 'IAP مطلوب.', notEnough: 'عملات غير كافية', bought: 'تم الشراء!', boughtMsg: ' تمت الإضافة.', footer: 'TILSIM SOLITAIRE متجر' },
};

export default function StoreScreen() {
  const { lang } = useLang();
  const st = STORE_TEXT[lang] || STORE_TEXT.tr;
  const [coins, setCoins] = useState(0);
  const [activeTheme, setActiveTheme] = useState('cosmic');

  useEffect(() => {
    loadProgress().then((p) => setCoins(p.coins));
  }, []);

  const COIN_PACKS = [
    { amount: 500, price: '₺49,99', desc: st.small, icon: 'paid', popular: false },
    { amount: 2500, price: '₺149,99', desc: st.popular, icon: 'account-balance-wallet', popular: true },
    { amount: 6000, price: '₺299,99', desc: st.best, icon: 'savings', popular: false },
  ];

  const BOOSTERS = [
    { name: st.hint, desc: st.hintDesc, icon: 'lightbulb', coinCost: 500, color: COLORS.secondary, key: 'hints' },
    { name: st.undo, desc: st.undoDesc, icon: 'undo', coinCost: 450, color: COLORS.secondary, key: 'undos' },
  ];

  const buyBooster = async (booster) => {
    if (coins < booster.coinCost) {
      Alert.alert(st.notEnough, `${booster.coinCost} coin`);
      return;
    }
    const newCoins = coins - booster.coinCost;
    setCoins(newCoins);
    await updateProgress({ coins: newCoins });
    Alert.alert(st.bought, booster.name + st.boughtMsg);
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={getThemeGradient(activeTheme)} style={StyleSheet.absoluteFillObject} />

      <View style={s.header}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{st.premium || 'STORE'}</Text>
        </View>
        <View style={s.coinBadge}>
          <Text style={{ fontSize: 12 }}>🪙</Text>
          <Text style={s.coinText}>{coins.toLocaleString()}</Text>
          <Text style={s.coinPlus}>+</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.premiumCard}>
          <View style={s.premiumBadge}><Text style={s.premiumBadgeText}>{st.premium}</Text></View>
          <Text style={s.premiumTitle}>{st.noAds}</Text>
          <Text style={s.premiumDesc}>{st.noAdsDesc}</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => Alert.alert(st.coming, st.comingMsg)}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={s.premiumBtn}>
              <Text style={s.premiumBtnText}>₺499,99</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>{st.coinPacks}</Text>
        {COIN_PACKS.map((pack, i) => (
          <View key={i} style={[s.goldCard, pack.popular && s.goldCardPopular]}>
            {pack.popular && <View style={s.popularBadge}><Text style={s.popularText}>{st.popularBadge}</Text></View>}
            <MaterialIcons name={pack.icon} size={36} color={COLORS.coin} style={{ marginBottom: 6 }} />
            <Text style={s.goldAmount}>{pack.amount} Coin</Text>
            <Text style={s.goldDesc}>{pack.desc}</Text>
            <TouchableOpacity activeOpacity={0.8} style={{ width: '100%', marginTop: 12 }} onPress={() => Alert.alert(st.coming, st.comingMsg)}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryContainer]} style={s.goldBtn}>
                <Text style={s.goldBtnText}>{pack.price}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={s.sectionTitle}>{st.boosters}</Text>
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

        <TouchableOpacity style={s.restoreBtn} onPress={() => Alert.alert(st.coming)} activeOpacity={0.7}>
          <MaterialIcons name="restore" size={18} color={COLORS.onSurfaceVariant} />
          <Text style={s.restoreText}>{st.restore}</Text>
        </TouchableOpacity>

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
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff', fontStyle: 'italic' },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.panelBg, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: SIZES.radiusFull, borderWidth: 1, borderColor: COLORS.panelBorder,
  },
  coinText: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },
  coinPlus: { fontFamily: FONTS.headline, fontSize: 14, color: COLORS.coin },

  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  premiumCard: {
    backgroundColor: COLORS.panelBg, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 28,
  },
  premiumBadge: { backgroundColor: COLORS.tertiary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  premiumBadgeText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff', letterSpacing: 1 },
  premiumTitle: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface, marginBottom: 6 },
  premiumDesc: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 16, lineHeight: 18 },
  premiumBtn: { paddingVertical: 14, borderRadius: SIZES.radiusFull, alignItems: 'center' },
  premiumBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 16, color: '#fff' },

  sectionTitle: { fontFamily: FONTS.headlineBlack, fontSize: 18, color: COLORS.onSurface, marginBottom: 14 },

  goldCard: {
    backgroundColor: COLORS.panelBg, borderRadius: 20, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.panelBorder, marginBottom: 14,
  },
  goldCardPopular: { borderColor: COLORS.primary, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: -12, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  popularText: { fontFamily: FONTS.headlineBlack, fontSize: 10, color: '#fff', letterSpacing: 1 },
  goldAmount: { fontFamily: FONTS.headlineBlack, fontSize: 22, color: COLORS.onSurface },
  goldDesc: { fontFamily: FONTS.body, fontSize: 12, color: COLORS.onSurfaceVariant, marginTop: 2 },
  goldBtn: { paddingVertical: 12, borderRadius: SIZES.radiusFull, alignItems: 'center' },
  goldBtnText: { fontFamily: FONTS.headlineBlack, fontSize: 14, color: '#fff' },

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

  restoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 12 },
  restoreText: { fontFamily: FONTS.body, fontSize: 13, color: COLORS.onSurfaceVariant, textDecorationLine: 'underline' },

  footerText: { fontFamily: FONTS.body, fontSize: 10, color: COLORS.outlineVariant, textAlign: 'center', marginTop: 24, letterSpacing: 2 },
});
