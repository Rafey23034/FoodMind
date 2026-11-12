import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { openCart, openSearch } from '../../navigation/customerNavigation';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import FoodThumbnail from '../../components/FoodThumbnail';
import { Chip, Notice, EmptyState, ui } from '../../components/customer/ui';
import { selectAvailableItems } from '../../redux/menuSlice';
import { addItem } from '../../redux/cartSlice';
import { makeCartItem, formatPrice, restaurant, ratingLabel } from '../../data/catalog';
import { COLORS } from '../../theme/colors';

// Each row highlights only the better value (higher rating, lower price); ties and text rows stay neutral.
const METRICS = [
  { label: 'Customer rating', value: dish => `${ratingLabel(dish)} ★`, better: (a, b) => a.rating > b.rating },
  { label: 'Price', value: dish => formatPrice(dish.price), better: (a, b) => a.price < b.price },
  { label: 'Category', value: dish => dish.category },
];

export default function CompareDishesScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const items = useSelector(selectAvailableItems);
  const initial = route.params?.dishIds || [];
  const [ids, setIds] = useState([initial[0] || items[0]?.id, initial[1] || items[1]?.id]);
  const [choosing, setChoosing] = useState(null);
  const pair = ids.map(id => items.find(item => item.id === id));
  if (pair.some(item => !item)) return <ScreenLayout navigation={navigation} title="Compare Dishes"><EmptyState title="Choose two available dishes">Browse the menu for more dishes to compare.</EmptyState><AppButton title="Browse Menu" onPress={() => openSearch(navigation)} /></ScreenLayout>;
  const best = [...pair].sort((a, b) => b.rating - a.rating || a.price - b.price)[0];
  return <ScreenLayout navigation={navigation} title="Compare Dishes" subtitle="Make the smarter food choice"
    footer={<AppButton title={`Add ${best.name} · ${formatPrice(best.price)}`} onPress={() => {
      dispatch(addItem(makeCartItem(best))); openCart(navigation);
    }} />}>
    <Notice icon="info" title="Side-by-side comparison">Based on the current menu's price and rating. Tap a dish to swap it.</Notice>
    <View style={styles.pair}>{pair.map((dish, index) => <Pressable key={index} style={[ui.card, styles.dish, choosing === index && styles.choosing]}
      onPress={() => setChoosing(choosing === index ? null : index)} accessibilityRole="button" accessibilityLabel={`Change ${dish.name}`}>
      <FoodThumbnail dishId={dish.id} symbol={dish.symbol} size={110} />
      <AppText style={[ui.bold, ui.center]}>{dish.name}</AppText>
      <AppText variant="small" color={COLORS.textSecondary}>{restaurant.name}</AppText>
      <AppText color={COLORS.primary} style={ui.bold}>{formatPrice(dish.price)}</AppText>
      <AppText variant="small" color={COLORS.warning} style={ui.bold}>★ {ratingLabel(dish)}</AppText>
      <AppText variant="caption" color={COLORS.primary} style={ui.bold}>Change dish ▾</AppText>
    </Pressable>)}</View>
    {choosing !== null ? <View style={ui.wrap}>{items.filter(item => item.id !== ids[1 - choosing]).map(item => <Chip key={item.id} label={item.name} selected={ids[choosing] === item.id} onPress={() => {
      setIds(previous => previous.map((id, index) => index === choosing ? item.id : id)); setChoosing(null);
    }} />)}</View> : null}
    <AppText variant="subheading">How they compare</AppText>
    <View style={ui.card}>
      {METRICS.map(metric => <View key={metric.label} style={styles.metric}>
        <AppText variant="small" color={COLORS.textSecondary} style={ui.flex}>{metric.label}</AppText>
        {pair.map((dish, i) => {
          const wins = metric.better?.(dish, pair[1 - i]);
          return <AppText key={i} variant="small" style={[ui.bold, styles.value]} color={wins ? COLORS.success : COLORS.text}>{metric.value(dish)}{wins ? ' ✓' : ''}</AppText>;
        })}
      </View>)}
    </View>
    <Notice success icon="check" title={`Best match: ${best.name}`}>Highest menu rating, with the lower price used to break a tie.</Notice>
  </ScreenLayout>;
}
const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: 12 },
  dish: { flex: 1, alignItems: 'center', gap: 6 },
  choosing: { borderColor: COLORS.primary },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  value: { width: 92, textAlign: 'center' },
});
