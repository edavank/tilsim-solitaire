import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const tabs = [
  { key: 'magaza', label: 'MAĞAZA', icon: 'storefront' },
  { key: 'home', label: 'ANA SAYFA', icon: 'home' },
  { key: 'liderler', label: 'LİDERLER', icon: 'leaderboard' },
];

export default function BottomNav({ activeTab = 'home', onTabPress }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabPress?.(tab.key)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={tab.icon}
              size={24}
              color={isActive ? COLORS.navActive : COLORS.navInactive}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: SIZES.navPaddingBottom,
    paddingHorizontal: 16,
    backgroundColor: COLORS.navBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  tab: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 138, 167, 0.12)',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  label: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9,
    letterSpacing: 2,
    color: COLORS.navInactive,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  activeLabel: {
    color: COLORS.navActive,
  },
});
