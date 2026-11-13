import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';
import Icon from '../../components/Icon';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';

// This is the welcome screen in the first FoodMind Figma frame.
// The parent decides what happens when the user presses either button.
export default function SplashScreen({ onGetStarted, onSignIn, onPartnerRegister, onRiderRegister }) {
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
              <Icon name="utensils" size={40} color={COLORS.white} style={styles.utensils} />
              <AppText style={styles.logoLabel} color={COLORS.white}>
                FOODMIND
              </AppText>
            </View>

            <View style={[styles.pill, styles.pillTop]}>
              <Icon name="ai" size={11} /><AppText variant="caption" style={styles.pillText}>AI Matchmaking</AppText>
            </View>
            <View style={[styles.pill, styles.pillLeft]}>
              <Icon name="star" size={11} /><AppText variant="caption" style={styles.pillText}>Curated For You</AppText>
            </View>
            <View style={[styles.pill, styles.pillRight]}>
              <Icon name="location" size={11} /><AppText variant="caption" style={styles.pillText}>Food Delivery</AppText>
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
            Culinary intelligence for your every craving. Find food you'll truly love.
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
            <Pressable onPress={onSignIn} testID="sign-in-link" accessibilityRole="button" hitSlop={8}>
              <AppText variant="small" style={styles.signInText}>
                Sign in
              </AppText>
            </Pressable>
          </View>

          {/* Partners create their account here, then use the same Sign In page. */}
          <View style={styles.partnerRow}>
            <Pressable onPress={onPartnerRegister} testID="partner-register-link" accessibilityRole="button" hitSlop={8}>
              <AppText variant="small" color={COLORS.primary} style={styles.signInText}>Become a Partner</AppText>
            </Pressable>
            <AppText variant="small" color={COLORS.textSecondary}>·</AppText>
            <Pressable onPress={onRiderRegister} testID="rider-register-link" accessibilityRole="button" hitSlop={8}>
              <AppText variant="small" color={COLORS.primary} style={styles.signInText}>Become a Rider</AppText>
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
  partnerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg },
  pillText: { fontWeight: '600' },
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
    marginBottom: SPACING.xs,
  },
  logoLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 4,
    shadowColor: COLORS.shadow,
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
    ...TYPOGRAPHY.display,
  },
  tagline: {
    textAlign: 'center',
    maxWidth: 300,
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
