import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import AppText from '../../components/AppText';
import Header from '../../components/Header';
import FoodThumbnail from '../../components/FoodThumbnail';
import SearchBar from '../../components/SearchBar';
import { EmptyState } from '../../components/customer/ui';
import { selectMenuItems, selectMenuCategories, toggleMenuItem } from '../../redux/menuSlice';
import { restaurant, formatPrice } from '../../data/catalog';
import usePartner from '../../components/partner/usePartner';
import { plural } from '../../utils/format';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

// Menu tab root (no back button). Availability is a real switch so its state is obvious at a glance.
export default function ManageMenuScreen({ onAddItem, onEditItem }) {
  const dispatch = useDispatch();
  const { profile } = usePartner();
  const items = useSelector(selectMenuItems);
  const categories = useSelector(selectMenuCategories);
  const unavailable = useSelector(state => state.menu.unavailable);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const visible = items.filter(item => (category === 'All' || item.category === category) && (!term || item.name.toLowerCase().includes(term)));

  function renderItem({ item }) {
    const available = !unavailable.includes(item.id);
    return (
      <AppCard style={styles.card}>
        <FoodThumbnail dishId={item.id} symbol={item.symbol} size={80} />
        <View style={styles.info}>
          <AppText style={styles.bold}>{item.name}</AppText>
          {item.bestseller ? <AppText variant="caption" color={COLORS.primary} style={styles.bold}>★ Bestseller</AppText> : null}
          <AppText variant="small" color={COLORS.textSecondary}>{item.category}</AppText>
          <AppText color={COLORS.primary} style={styles.bold}>{formatPrice(item.price)}</AppText>
          <View style={styles.actions}>
            <Pressable onPress={() => onEditItem(item.id)} accessibilityRole="button" accessibilityLabel={`Edit ${item.name}`} hitSlop={8}>
              <AppText color={COLORS.primary} style={styles.bold}>Edit</AppText>
            </Pressable>
            <View style={styles.toggle}>
              <AppText variant="small" color={available ? COLORS.success : COLORS.textSecondary} style={styles.bold}>{available ? 'Available' : 'Hidden'}</AppText>
              <Switch value={available} onValueChange={() => dispatch(toggleMenuItem(item.id))} accessibilityLabel={`${item.name} available`}
                trackColor={{ false: COLORS.border, true: COLORS.success }} thumbColor={COLORS.white} />
            </View>
          </View>
        </View>
      </AppCard>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Header title="Manage Menu" centerTitle />
      <AppText variant="small" color={COLORS.textSecondary} style={styles.subtitle}>{profile.name || restaurant.name} · {plural(items.length, 'item')}</AppText>
      <SearchBar placeholder="Search menu items..." value={query} onChangeText={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryStrip} contentContainerStyle={styles.categories}>
        {['All', ...categories].map(value => (
          <Pressable key={value} onPress={() => setCategory(value)} accessibilityRole="button" accessibilityState={{ selected: category === value }}
            style={[styles.chip, category === value && styles.activeChip]}>
            <AppText variant="small" color={category === value ? COLORS.white : COLORS.text}>{value}</AppText>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList data={visible} keyExtractor={item => item.id} renderItem={renderItem}
        style={styles.list} contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState title="No matching menu items">Try another search or category.</EmptyState>} />
      <View style={styles.footer}><AppButton title="+ Add New Item" onPress={onAddItem} /></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, list: { flex: 1 },
  bold: { fontWeight: '700' },
  subtitle: { textAlign: 'center', marginTop: -6 },
  info: { flex: 1, gap: 3 },
  categoryStrip: { flexGrow: 0, flexShrink: 0, marginTop: SPACING.md }, categories: { paddingHorizontal: 20, gap: 8 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  activeChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  listContent: { padding: 20, paddingBottom: 10 },
  card: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footer: { padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
});
