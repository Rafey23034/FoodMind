import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '../AppText';
import { COLORS } from '../../theme/colors';

export const ORDER_STAGES = ['Confirmed', 'Preparing', 'On the way', 'Delivered'];
// Completed steps show a tick, the current step a filled dot, future steps an empty dot.
export default function OrderProgress({ status, vertical = false, stages = ORDER_STAGES }) {
  const current = stages.indexOf(status);
  return <View style={vertical ? styles.vertical : styles.horizontal} accessibilityLabel={`Progress: ${status}`}>
    {!vertical ? <View style={styles.line} /> : null}
    {stages.map((stage, index) => (
      <View key={stage} style={vertical ? styles.verticalStep : styles.step}>
        <View style={[styles.dot, index <= current && styles.done, index === current && styles.current]}>
          <AppText variant="caption" color={index <= current ? COLORS.white : COLORS.textSecondary} style={styles.bold}>{index < current ? '✓' : index === current ? '●' : '○'}</AppText>
        </View>
        <AppText variant="caption" color={index <= current ? COLORS.primary : COLORS.textSecondary} style={[!vertical && styles.label, index === current && styles.bold]}>{stage}</AppText>
      </View>
    ))}
  </View>;
}
const styles = StyleSheet.create({
  horizontal: { flexDirection: 'row', paddingVertical: 10 }, vertical: { gap: 18, paddingVertical: 8 },
  line: { position: 'absolute', height: 3, backgroundColor: COLORS.border, left: '12%', right: '12%', top: 21 },
  step: { flex: 1, alignItems: 'center', gap: 8 }, verticalStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: COLORS.primary }, current: { borderWidth: 3, borderColor: COLORS.primaryBorder },
  label: { textAlign: 'center' }, bold: { fontWeight: '700' },
});
