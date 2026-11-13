import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import BackIcon from './icons/BackIcon';
import { COLORS } from '../theme/colors';

// The single back button used by every screen header.
export default function BackButton({ onPress, label = 'Go back', style }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}>
      <BackIcon />
    </Pressable>
  );
}

export const BACK_BUTTON_SIZE = 40;
const styles = StyleSheet.create({
  button: {
    width: BACK_BUTTON_SIZE, height: BACK_BUTTON_SIZE, borderRadius: BACK_BUTTON_SIZE / 2,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.shadow, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
});
