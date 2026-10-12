import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import AppText from './AppText';
import { COLORS } from '../theme/colors';
import { RADIUS, SPACING } from '../theme/spacing';

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  testID,
}) {
  const buttonStyles = {
    primary: styles.primary,
    secondary: styles.secondary,
    outline: styles.outline,
    text: styles.textButton,
  };

  const labelColor = variant === 'primary' ? COLORS.white : COLORS.primary;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <AppText variant="button" color={labelColor}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  outline: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
  },
  textButton: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
