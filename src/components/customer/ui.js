import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '../AppText';
import Icon from '../Icon';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/spacing';

// Small building blocks shared by customer, partner and rider screens.
export function Notice({ title, children, success = false, warning = false, icon }) {
  const color = success ? COLORS.success : warning ? COLORS.warning : COLORS.primary;
  return <View style={[ui.notice, success && ui.success, warning && ui.warning]}>
    <View style={ui.row}>
      {icon ? <Icon name={icon} size={15} color={color} /> : null}
      <AppText style={[ui.bold, ui.flex]} color={color}>{title}</AppText>
    </View>
    {children ? <AppText variant="small" color={COLORS.textSecondary}>{children}</AppText> : null}
  </View>;
}

export function Chip({ label, selected, onPress, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} onPress={onPress} disabled={disabled}
    hitSlop={4} style={[ui.chip, selected && ui.chipSelected, disabled && ui.chipDisabled]}>
    <AppText variant="small" color={selected ? COLORS.white : disabled ? COLORS.textSecondary : COLORS.text}>{label}</AppText>
  </Pressable>;
}

export function Stars({ value, onChange, label = 'Rating', small = false, compact = false }) {
  const rounded = Math.round(value || 0);
  return <View style={[ui.row, compact && ui.tight]} accessible={!onChange} accessibilityLabel={!onChange ? `${label}: ${rounded} of 5 stars` : undefined}>{[1, 2, 3, 4, 5].map(star => (
    <Pressable key={star} disabled={!onChange} onPress={() => onChange?.(star)}
      accessibilityRole={onChange ? 'button' : undefined} accessibilityLabel={onChange ? `${label}: ${star} stars` : undefined}
      accessibilityState={onChange ? { selected: star === rounded } : undefined} style={compact ? ui.compactStar : small ? ui.smallStar : ui.star}>
      <AppText style={compact ? ui.starCompactText : small ? ui.starSmallText : ui.starText} color={COLORS.warning}>
        {star <= rounded ? '★' : '☆'}
      </AppText>
    </Pressable>
  ))}</View>;
}

export function BillRow({ label, value, bold }) {
  return <View style={ui.between}>
    <AppText variant="small" color={bold ? COLORS.text : COLORS.textSecondary} style={bold && ui.bold}>{label}</AppText>
    <AppText variant="small" style={bold && ui.bold} color={bold ? COLORS.primary : COLORS.text}>{value}</AppText>
  </View>;
}

export function EmptyState({ title, children, icon = 'search' }) {
  return <View style={ui.empty}>
    <View style={ui.emptyIcon}><Icon name={icon} size={28} color={COLORS.primary} /></View>
    <AppText variant="subheading" style={ui.center}>{title}</AppText>
    {children ? <AppText variant="small" color={COLORS.textSecondary} style={ui.center}>{children}</AppText> : null}
  </View>;
}

export const ui = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tight: { gap: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1 }, bold: { fontWeight: '700' },
  line: { height: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  notice: { padding: 15, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primaryBorder, gap: 5 },
  success: { backgroundColor: COLORS.successLight, borderColor: COLORS.successBorder },
  warning: { backgroundColor: COLORS.warningLight, borderColor: COLORS.warningBorder },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipDisabled: { backgroundColor: COLORS.inputBackground },
  star: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  smallStar: { minWidth: 26, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 34, lineHeight: 42 },
  starSmallText: { fontSize: 20, lineHeight: 26 },
  compactStar: { minWidth: 15, alignItems: 'center' },
  starCompactText: { fontSize: 15, lineHeight: 20 },
  empty: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
