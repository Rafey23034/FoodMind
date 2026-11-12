import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from './AppText';
import { COLORS } from '../theme/colors';
import { RADIUS } from '../theme/spacing';

// A short confirmation toast. It sits above the screen's footer, closes itself, and can offer one action.
export default function FloatingMessage({ message, onClose, actionLabel, onAction, bottom = 96, duration = 3500 }) {
  useEffect(() => {
    if (!message || !duration) return undefined;
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);
  if (!message) return null;
  return (
    <View pointerEvents="box-none" style={[styles.area, { bottom }]}>
      <View style={styles.message} accessibilityLiveRegion="polite">
        <AppText variant="small" color={COLORS.white} style={styles.text}>{message}</AppText>
        {actionLabel ? <Pressable accessibilityRole="button" hitSlop={8} onPress={() => { onAction?.(); onClose?.(); }}>
          <AppText variant="small" color={COLORS.primaryMuted} style={styles.bold}>{actionLabel}</AppText>
        </Pressable> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" hitSlop={10} onPress={onClose}>
          <AppText color={COLORS.white} style={styles.bold}>×</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: { position: 'absolute', left: 16, right: 16, zIndex: 100, elevation: 10 },
  message: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.text },
  text: { flex: 1, fontWeight: '600' },
  bold: { fontWeight: '700' },
});
