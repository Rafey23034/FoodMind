import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

// This is the welcome screen in the first FoodMind Figma frame.
// The parent decides what happens when the user presses either button.
export default function SplashScreen({ onGetStarted, onSignIn }) {
  const fade = useRef(new Animated.Value(0)).current;
  const move = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const fadeAnimation = Animated.timing(fade, {
      toValue: 1,
      duration: 850,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });

    const moveAnimation = Animated.timing(move, {
      toValue: 0,
      duration: 850,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });

    fadeAnimation.start();
    moveAnimation.start();

    return () => {
      fadeAnimation.stop();
      moveAnimation.stop();
    };
  }, [fade, move]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.hero,
            { opacity: fade, transform: [{ translateY: move }] },
          ]}
        >
          <View style={styles.logoStage}>
            <View style={styles.logoBox}>
              <AppText style={styles.utensils}>🍴</AppText>
              <AppText style={styles.logoLabel} color={COLORS.white}>
                FOODMIND
              </AppText>
            </View>

            <View style={[styles.pill, styles.pillTop]}>
              <AppText variant="caption">✨ AI Matchmaking</AppText>
            </View>
            <View style={[styles.pill, styles.pillLeft]}>
              <AppText variant="caption">🌿 Curated For You</AppText>
            </View>
            <View style={[styles.pill, styles.pillRight]}>
              <AppText variant="caption">📍 Food Delivery</AppText>
            </View>
          </View>

          <View style={styles.brandRow}>
            <AppText variant="title" style={styles.brandName}>
              Food
            </AppText>
            <AppText
              variant="title"
              color={COLORS.primary}
              style={styles.brandName}
            >
              Mind
            </AppText>
          </View>

          <AppText
            color={COLORS.textSecondary}
            style={styles.tagline}
          >
            Culinary intelligence for your every craving.{'\n'}
            Find food you'll truly love.
          </AppText>
        </Animated.View>

        <View style={styles.actions}>
          <AppButton
            title="Get Started  →"
            onPress={onGetStarted}
            style={styles.getStartedButton}
            testID="get-started-button"
          />

          <View style={styles.signInRow}>
            <AppText variant="small" color={COLORS.textSecondary}>
              Already have an account?{' '}
            </AppText>
            <Pressable onPress={onSignIn} testID="sign-in-link">
              <AppText variant="small" style={styles.signInText}>
                Sign in
              </AppText>
            </Pressable>
          </View>

          <AppText
            variant="caption"
            color={COLORS.textSecondary}
            style={styles.footerText}
          >
            DISCOVER    •    COMPARE    •    DECIDE
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  logoStage: {
    width: '100%',
    maxWidth: 310,
    height: 205,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  logoBox: {
    width: 130,
    height: 130,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
  },
  utensils: {
    fontSize: 42,
    marginBottom: SPACING.xs,
  },
  logoLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  pill: {
    position: 'absolute',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    zIndex: 1,
  },
  pillTop: {
    right: 0,
    top: 21,
  },
  pillLeft: {
    left: 0,
    bottom: 18,
  },
  pillRight: {
    right: 0,
    bottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
  },
  tagline: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
    marginTop: SPACING.md,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  getStartedButton: {
    width: '100%',
    minHeight: 55,
    borderRadius: RADIUS.md,
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  signInText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  footerText: {
    marginTop: SPACING.xl,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
