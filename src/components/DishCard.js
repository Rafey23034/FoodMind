import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import ChevronIcon from './icons/ChevronIcon';
import StarIcon from './icons/StarIcon';
import AppText from './AppText';
import FoodThumbnail from './FoodThumbnail';
import { formatPrice, ratingLabel } from '../data/catalog';
import { COLORS } from '../theme/colors';
import { SPACING, RADIUS } from '../theme/spacing';

// Menu item card used by the restaurant page and recommendation lists.
export default function DishCard({ dish, restaurant, onPress, showRestaurant = true }) {
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button" accessibilityLabel={`${dish.name}, ${formatPrice(dish.price)}`}>
      <FoodThumbnail symbol={dish.symbol} dishId={dish.id} size={82} />
      <View style={styles.details}>
        <AppText style={styles.name} numberOfLines={2}>{dish.name}</AppText>
        {showRestaurant ? <AppText variant="caption" color={COLORS.textSecondary}>{restaurant.name}</AppText> : null}
        {dish.bestseller ? <AppText variant="caption" color={COLORS.primary} style={styles.bold}>Bestseller</AppText> : null}
        <View style={styles.ratingRow}><StarIcon /><AppText variant="caption" color={COLORS.warning} style={styles.bold}>{ratingLabel(dish)}</AppText></View>
        <AppText variant="small" color={COLORS.primary} style={styles.bold}>{formatPrice(dish.price)}</AppText>
      </View>
      <ChevronIcon />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.lg, padding: 9, marginBottom: 11 },
  details: { flex: 1, paddingHorizontal: SPACING.md, gap: 3 },
  name: { fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bold: { fontWeight: '700' },
});
