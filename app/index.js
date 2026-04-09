import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../src/constants/theme';
import BottomNav from '../src/components/BottomNav';

const { width, height } = Dimensions.get('window');

// Baykuş maskot placeholder — sonra gerçek asset ile değiştirilecek
const OWL_PLACEHOLDER = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNgYWKBzrJ6nMN9sOS6xEbTmSNfAxuK4YIY4xHGJ0QTuyhCGVH0VZo7mlcrtaDdKZ_qyiTHqYzEgnVs8wPyCb7pb7ZOjl-AZPDwUczHh4isrgAsXrUN9jG7iRlqWvtcVD1Gud3pTjVeLgiQ1GXnXnPY8ptxubecuAX_KPeCkN8CBXvZNq_WmJy628EZRWFxM3ZrENXi3JIFyYRWgodi2FXBl34ezfYO1OJDtVhKu8eirMECPoraAMrYYPvhOcSWB4mLrGVXWepDhU';
const OWL_AVATAR = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9Byo03fsHlzRUCdB3VG63n6J8KFr8WFqhXpE__8T6DTwLhTnXO59Crf11jrG-KRqTG9Qpv6XjFaeUe8UbhUsOArCuyxHMpbMwbWUmnWsejD_ycavOnZTtMsmVL__znFBpEgSqUqCun1SIyYsLroFBcazOcXDDg4SpA-FHDHBkC4JAI4td4kHV3U4MNCjLM6_ydd2rsj76CUiejWXyIlQAAKFYjbQFPHl3X4GuasQ6Ll86Nv3NzGRKtw9Kbu85qwsoc35WRPVEgO0';

export default function HomeScreen() {
  // Owl bounce animation
  const owlBounce = useRef(new Animated.Value(0)).current;
  // Glow pulse animation
  const glowPulse = useRef(new Animated.Value(0)).current;
  // Screen fade in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Screen entry
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    // Owl bounce loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(owlBounce, { toValue: -15, duration: 2000, useNativeDriver: true }),
        Animated.timing(owlBounce, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientBottom]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Atmospheric glow blobs */}
      <View style={styles.glowBlobLeft} />
      <View style={styles.glowBlobRight} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: OWL_AVATAR }} style={styles.avatar} />
        </View>
        <View style={styles.coinBadge}>
          <MaterialIcons name="monetization-on" size={20} color={COLORS.tertiaryFixed} />
          <Text style={styles.coinText}>226</Text>
          <MaterialIcons name="add-circle" size={16} color={COLORS.primary} />
        </View>
        <TouchableOpacity>
          <MaterialIcons name="settings" size={24} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <Animated.View
        style={[
          styles.mainContent,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Owl mascot */}
        <Animated.View style={[styles.owlContainer, { transform: [{ translateY: owlBounce }] }]}>
          <View style={styles.owlGlow} />
          <Image source={{ uri: OWL_PLACEHOLDER }} style={styles.owlImage} />
        </Animated.View>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.titleMain}>Tılsım</Text>
          <Text style={styles.titleSub}>SOLİTAİRE</Text>
        </View>

        {/* Language picker */}
        <TouchableOpacity style={styles.langPicker}>
          <Text style={styles.langText}>TÜRKÇE</Text>
          <MaterialIcons name="keyboard-arrow-down" size={16} color={COLORS.onSurface} />
        </TouchableOpacity>

        {/* Main CTA - Bölüm butonu */}
        <TouchableOpacity style={styles.ctaOuter} activeOpacity={0.85}>
          <Animated.View style={[styles.ctaGlow, { opacity: glowOpacity }]} />
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>Bölüm 12</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ADS button */}
        <TouchableOpacity style={styles.adsButton} activeOpacity={0.7}>
          <MaterialIcons name="smart-display" size={24} color={COLORS.tertiaryFixed} />
          <View>
            <Text style={styles.adsLabel}>İZLE VE KAZAN</Text>
            <View style={styles.adsRow}>
              <Text style={styles.adsText}>ADS</Text>
              <MaterialIcons name="monetization-on" size={14} color={COLORS.tertiaryFixed} />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Nav */}
      <BottomNav activeTab="home" onTabPress={(tab) => console.log(tab)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Atmospheric
  glowBlobLeft: {
    position: 'absolute',
    top: height * 0.25,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0, 110, 44, 0.12)',
    // No blur in RN, using opacity
  },
  glowBlobRight: {
    position: 'absolute',
    bottom: height * 0.25,
    right: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(243, 130, 57, 0.08)',
  },

  // Header
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
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: COLORS.headerBg,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coinBadge: {
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

  // Main content
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 120,
    paddingHorizontal: 24,
  },

  // Owl
  owlContainer: {
    width: 280,
    height: 280,
    marginBottom: 16,
  },
  owlGlow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 145, 77, 0.08)',
  },
  owlImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  // Branding
  branding: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleMain: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 56,
    color: '#ffffff',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  titleSub: {
    fontFamily: FONTS.headline,
    fontSize: 20,
    color: COLORS.primary,
    letterSpacing: 10,
    textTransform: 'uppercase',
    marginTop: -4,
  },

  // Language picker
  langPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 22, 32, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  langText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    color: COLORS.onSurface,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // CTA
  ctaOuter: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  ctaGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.primary,
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: SIZES.radiusFull,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaText: {
    fontFamily: FONTS.headlineBlack,
    fontSize: 24,
    color: COLORS.onPrimary,
  },

  // ADS
  adsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 41, 58, 0.6)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: 'rgba(21, 77, 102, 0.3)',
  },
  adsLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    color: 'rgba(201, 234, 255, 0.7)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  adsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adsText: {
    fontFamily: FONTS.headline,
    fontSize: 14,
    color: COLORS.onSurface,
  },
});
