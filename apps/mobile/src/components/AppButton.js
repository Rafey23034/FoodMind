import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import Icon from './Icon';
import { COLORS } from '../theme/colors';
import { RADIUS, SPACING } from '../theme/spacing';

const LABEL_COLOR = { primary: COLORS.white, danger: COLORS.white, secondary: COLORS.primary, outline: COLORS.primary, text: COLORS.primary };

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  style,
  testID,
  accessibilityLabel,
}) {
  const labelColor = LABEL_COLOR[variant] || COLORS.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <Icon name={icon} size={15} color={labelColor} /> : null}
        <AppText variant="button" color={labelColor} style={styles.label}>{title}</AppText>
      </View>
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
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  label: { textAlign: 'center' },
  primary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  danger: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  secondary: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryLight },
  outline: { backgroundColor: COLORS.surface, borderColor: COLORS.primary },
  text: { backgroundColor: 'transparent', borderColor: 'transparent' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
