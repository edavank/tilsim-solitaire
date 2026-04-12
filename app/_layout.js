import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_700Bold,
} from '@expo-google-fonts/be-vietnam-pro';
import {
  Fondamento_400Regular,
  Fondamento_400Regular_Italic,
} from '@expo-google-fonts/fondamento';
import { COLORS } from '../src/constants/theme';
import { initAds } from '../src/utils/ads';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_700Bold,
    Fondamento_400Regular,
    Fondamento_400Regular_Italic,
  });

  // Request ATT permission on iOS, then initialize ads
  useEffect(() => {
    async function setup() {
      if (Platform.OS === 'ios') {
        try {
          const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
          await requestTrackingPermissionsAsync();
        } catch (e) { /* Expo Go fallback */ }
      }
      initAds();
    }
    setup();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.surface },
          animation: 'fade',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
});
