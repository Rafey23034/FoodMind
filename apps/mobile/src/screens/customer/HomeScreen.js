import React, { useRef, useState } from 'react';
import { openProfile, openSearch } from '../../navigation/customerNavigation';
import { useSelector } from 'react-redux';
import ChevronIcon from '../../components/icons/ChevronIcon';
import DownIcon from '../../components/icons/DownIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import StarIcon from '../../components/icons/StarIcon';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import AppText from '../../components/AppText';
import Icon from '../../components/Icon';
import FoodThumbnail from '../../components/FoodThumbnail';
import { Notice } from '../../components/customer/ui';
import { restaurant, formatPrice } from '../../data/catalog';
import { searchDishes } from '../../data/discovery';
import { selectAvailableItems, selectMenuCategories } from '../../redux/menuSlice';
import { selectRestaurantOnline } from '../../redux/partnerSlice';
import { getFoodPhoto } from '../../data/foodPhotos';
import { selectDeliveryAddress } from '../../redux/addressesSlice';
import { routes } from '../../navigation/routes';
import { initials } from '../../utils/format';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';

export default function HomeScreen({ navigation }) {
  const address = useSelector(selectDeliveryAddress);
  const user = useSelector(state => state.auth.user);
  const online = useSelector(selectRestaurantOnline);
  const menuItems = useSelector(selectAvailableItems);
  const allCategories = useSelector(selectMenuCategories);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const searchInput = useRef(null);

  const categories = ['All', ...allCategories.filter(name => menuItems.some(item => item.category === name))];
  const query = search.trim().toLowerCase();
  const dishes = searchDishes(menuItems, query).filter(dish => category === 'All' || dish.category === category);
  const restaurantMatches = !query || `${restaurant.name} ${restaurant.cuisine}`.toLowerCase().includes(query);
  const recommended = query || category !== 'All' ? dishes : dishes.filter(dish => dish.recommended === true);
  const openDish = dish => navigation.navigate(routes.DISH_DETAIL, { dishId: dish.id });

  return <SafeAreaView style={styles.screen} edges={['top']}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.topLine}>
        <Pressable onPress={() => navigation.navigate(routes.ADDRESSES)} accessibilityRole="button" accessibilityLabel="Change delivery address" style={styles.flex}>
          <AppText variant="caption" color={COLORS.textSecondary}>Deliver to</AppText>
          <View style={styles.locationLine}><AppText style={styles.location} numberOfLines={1}>{address ? `${address.label} · ${address.city}` : 'Choose an address'}</AppText><DownIcon /></View>
        </Pressable>
        <Pressable onPress={() => openProfile(navigation)} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Open profile">
          <AppText style={styles.bold}>{initials(user?.name)}</AppText>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Pressable onPress={() => searchInput.current?.focus()} style={styles.searchIconWrap} accessibilityRole="button" accessibilityLabel="Search dishes">
          <SearchIcon />
        </Pressable>
        <TextInput ref={searchInput} value={search} onChangeText={setSearch} placeholder="Search dishes, e.g. pasta under Rs. 1,000"
          accessibilityLabel="Search dishes" placeholderTextColor={COLORS.textSecondary} style={styles.searchInput} returnKeyType="search" />
        {search || category !== 'All' ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search and filters" hitSlop={8}
          onPress={() => { setSearch(''); setCategory('All'); }} style={styles.searchButton}>
          <AppText style={styles.searchClear} color={COLORS.primary}>×</AppText>
        </Pressable> : null}
      </View>

      {!online ? <View style={styles.notice}><Notice warning icon="clock" title={`${restaurant.name} is closed right now`}>You can browse the menu; ordering opens when the restaurant is back online.</Notice></View> : null}

      <Pressable style={styles.aiBanner} onPress={() => navigation.navigate(routes.AI)} accessibilityRole="button" accessibilityLabel="Open FoodMind AI">
        <View style={styles.flex}>
          <AppText variant="caption" color={COLORS.primaryDark} style={styles.bold}>FOODMIND AI</AppText>
          <AppText style={styles.bold}>Craving something specific?</AppText>
          <AppText variant="caption" color={COLORS.textSecondary}>Describe your cravings and let AI curate your meal.</AppText>
          <AppText variant="small" color={COLORS.primary} style={styles.bold}>Explore AI →</AppText>
        </View>
        <View style={styles.aiIcon}><Icon name="ai" size={20} /></View>
      </Pressable>

      <AppText variant="subheading" style={styles.title}>What are you craving?</AppText>
      <FlatList horizontal showsHorizontalScrollIndicator={false} data={categories} keyExtractor={item => item}
        contentContainerStyle={styles.chips} renderItem={({ item }) =>
          <Pressable onPress={() => setCategory(item)} accessibilityRole="button" accessibilityState={{ selected: category === item }}
            style={[styles.chip, category === item && styles.activeChip]}>
            <AppText variant="small" color={category === item ? COLORS.white : COLORS.text} style={styles.medium}>{item}</AppText>
          </Pressable>
        } />

      <View style={styles.headingRow}>
        <AppText variant="subheading" style={styles.title}>{query || category !== 'All' ? 'Matching dishes' : 'Recommended for you'}</AppText>
        <Pressable onPress={() => openSearch(navigation)} accessibilityRole="button" hitSlop={8}><AppText variant="small" color={COLORS.primary} style={styles.bold}>See all</AppText></Pressable>
      </View>
      <Animated.View entering={FadeIn.duration(300)}>
        <FlatList horizontal data={recommended}
          keyExtractor={item => item.id} showsHorizontalScrollIndicator={false}
          ListEmptyComponent={<AppText variant="small" color={COLORS.textSecondary} style={styles.empty}>No dishes match this search or filter.</AppText>}
          renderItem={({ item }) => <Pressable onPress={() => openDish(item)} style={styles.smallCard} accessibilityRole="button" accessibilityLabel={`${item.name}, ${formatPrice(item.price)}`}>
            <FoodThumbnail symbol={item.symbol} dishId={item.id} imageSource={getFoodPhoto(item, { featured: true })} size={134} />
            <AppText style={styles.smallName} numberOfLines={1}>{item.name}</AppText>
            <AppText variant="caption" color={COLORS.textSecondary} numberOfLines={1}>{restaurant.name}</AppText>
            <AppText variant="small" color={COLORS.primary} style={styles.bold}>{formatPrice(item.price)}</AppText>
          </Pressable>} />
      </Animated.View>

      <AppText variant="subheading" style={[styles.title, styles.sectionGap]}>Restaurants</AppText>
      {restaurantMatches ? (
        <Pressable style={styles.restaurant} onPress={() => navigation.navigate(routes.RESTAURANT_DETAIL, { restaurantId: restaurant.id })} accessibilityRole="button" accessibilityLabel={`Open ${restaurant.name}`}>
          <FoodThumbnail symbol={restaurant.symbol} restaurantId={restaurant.id} size={72} />
          <View style={styles.restaurantInfo}>
            <AppText style={styles.bold}>{restaurant.name}</AppText>
            <AppText variant="caption" color={COLORS.textSecondary}>{restaurant.cuisine}</AppText>
            <View style={styles.ratingRow}><StarIcon /><AppText variant="caption" color={COLORS.warning} style={styles.bold}>{restaurant.rating} · {restaurant.time}</AppText></View>
            {!online ? <AppText variant="caption" color={COLORS.danger} style={styles.bold}>Closed now</AppText> : null}
          </View>
          <ChevronIcon />
        </Pressable>
      ) : null}
      {query && dishes.length === 0 && !restaurantMatches ? (
        <AppText variant="small" color={COLORS.textSecondary} style={styles.empty}>No matches for “{search}”. Try another dish.</AppText>
      ) : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, scroll: { flex: 1 }, content: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 25 },
  flex: { flex: 1 }, bold: { fontWeight: '700' }, medium: { fontWeight: '600' },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17, gap: SPACING.md },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  location: { ...TYPOGRAPHY.body, fontWeight: '700', flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  avatar: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.pill, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
  searchRow: { flexDirection: 'row', height: 56, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.lg, alignItems: 'center', paddingLeft: 7, paddingRight: 6, marginBottom: 20, gap: SPACING.sm },
  searchIconWrap: { width: 40, height: 40, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  searchInput: { ...TYPOGRAPHY.small, flex: 1, color: COLORS.text, paddingVertical: 10 },
  searchButton: { width: 36, height: 36, backgroundColor: COLORS.inputBackground, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  searchClear: { ...TYPOGRAPHY.subheading },
  notice: { marginBottom: SPACING.lg },
  title: { marginBottom: SPACING.md },
  chips: { gap: SPACING.sm, paddingBottom: 24 },
  chip: { paddingHorizontal: 18, paddingVertical: 9, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface },
  activeChip: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionGap: { marginTop: 26 },
  restaurant: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 9, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  restaurantInfo: { flex: 1, marginLeft: SPACING.md, gap: 3 },
  aiBanner: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder, borderWidth: 1, padding: 18, borderRadius: RADIUS.lg, flexDirection: 'row', marginBottom: SPACING.xl, gap: SPACING.md, alignItems: 'center' },
  aiIcon: { backgroundColor: COLORS.surface, borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  smallCard: { width: 154, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 9, marginRight: SPACING.md, gap: 3 },
  smallName: { fontWeight: '700', marginTop: 5 },
  empty: { marginVertical: 15 },
});
