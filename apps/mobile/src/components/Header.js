import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from './AppText';
import BackButton, { BACK_BUTTON_SIZE } from './BackButton';

// Left and right slots are always the same width so the title stays centred.
export default function Header({ title, onBack, centerTitle = false, right, backLabel }) {
  return (
    <View style={styles.container}>
      <View style={styles.slot}>{onBack ? <BackButton onPress={onBack} label={backLabel} /> : null}</View>
      <AppText variant="subheading" accessibilityRole="header" numberOfLines={1}
        style={[styles.title, centerTitle && styles.titleCenter]}>{title}</AppText>
      <View style={[styles.slot, styles.slotRight]}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  slot: { minWidth: BACK_BUTTON_SIZE, height: BACK_BUTTON_SIZE, justifyContent: 'center', alignItems: 'flex-start' },
  slotRight: { alignItems: 'flex-end' },
  title: { flex: 1, marginHorizontal: 12 },
  titleCenter: { textAlign: 'center' },
});
