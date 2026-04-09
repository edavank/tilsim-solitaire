import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS, FONTS, SIZES } from '../constants/theme';

export function CoinBadge({ coins = 226, showAdd = true }) {
  return (
    <View style={styles.coinContainer}>
      <MaterialIcons name="monetization-on" size={20} color={COLORS.tertiaryFixed} />
      <Text style={styles.coinText}>{coins}</Text>
      {showAdd && (
        <MaterialIcons name="add-circle" size={16} color={COLORS.primary} />
      )}
    </View>
  );
}

export default function Header({ title, coins = 226, onSettings, leftContent, showCoin = true }) {
  return (
    <View style={styles.header}>
      {leftContent || (showCoin && <CoinBadge coins={coins} />)}
      {title && <Text style={styles.title}>{title}</Text>}
      <TouchableOpacity onPress={onSettings} style={styles.settingsBtn}>
        <MaterialIcons name="settings" size={24} color="#cbd5e1" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56, // safe area
    paddingBottom: 12,
    backgroundColor: COLORS.headerBg,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 41, 58, 0.8)',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 102, 0.2)',
  },
  coinText: {
    fontFamily: FONTS.headline,
    fontSize: 14,
    color: COLORS.onSurface,
  },
  title: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 18,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  settingsBtn: {
    opacity: 0.8,
  },
});
