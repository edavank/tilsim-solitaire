import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useLang } from '../context/LanguageContext';

const TAB_LABELS = {
  tr: { store: 'MAĞAZA', home: 'ANA SAYFA', achievements: 'BAŞARIM', leaderboard: 'LİDERLER' },
  en: { store: 'STORE', home: 'HOME', achievements: 'BADGES', leaderboard: 'LEADERS' },
  de: { store: 'SHOP', home: 'START', achievements: 'ERFOLGE', leaderboard: 'RANGLISTE' },
  fr: { store: 'BOUTIQUE', home: 'ACCUEIL', achievements: 'SUCCÈS', leaderboard: 'CLASSEMENT' },
  es: { store: 'TIENDA', home: 'INICIO', achievements: 'LOGROS', leaderboard: 'LÍDERES' },
  ar: { store: 'متجر', home: 'الرئيسية', achievements: 'إنجازات', leaderboard: 'المتصدرين' },
  ru: { store: 'МАГАЗИН', home: 'ГЛАВНАЯ', achievements: 'ДОСТИЖЕНИЯ', leaderboard: 'ЛИДЕРЫ' },
};

const tabDefs = [
  { key: 'store', route: '/store', icon: 'storefront' },
  { key: 'home', route: '/', icon: 'home' },
  { key: 'achievements', route: '/achievements', icon: 'emoji-events' },
  { key: 'leaderboard', route: '/leaderboard', icon: 'leaderboard' },
];

export default function BottomNav({ activeTab = 'home', achievementBadge = 0 }) {
  const { lang } = useLang();
  const labels = TAB_LABELS[lang] || TAB_LABELS.tr;
  return (
    <View style={styles.container}>
      {tabDefs.map((tab) => {
        const isActive = activeTab === tab.key;
        const showBadge = tab.key === 'achievements' && achievementBadge > 0;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => { if (!isActive) router.replace(tab.route); }}
            activeOpacity={0.7}
          >
            <View>
              <MaterialIcons name={tab.icon} size={24} color={isActive ? COLORS.navActive : COLORS.navInactive} />
              {showBadge && (
                <View style={{ position: 'absolute', top: -4, right: -8, backgroundColor: '#FF4444', minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ fontFamily: FONTS.headline, fontSize: 9, color: '#fff' }}>{achievementBadge}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>{labels[tab.key]}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    paddingTop: 14, paddingBottom: SIZES.navPaddingBottom, paddingHorizontal: 16,
    backgroundColor: COLORS.navBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  tab: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 8 },
  activeTab: { backgroundColor: 'rgba(255, 138, 167, 0.12)', borderRadius: SIZES.radiusFull, paddingHorizontal: 20, paddingVertical: 8 },
  label: { fontFamily: FONTS.bodyMedium, fontSize: 9, letterSpacing: 2, color: COLORS.navInactive, marginTop: 4, textTransform: 'uppercase' },
  activeLabel: { color: COLORS.navActive },
});
