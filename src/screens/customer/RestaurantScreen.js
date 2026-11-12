import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Image, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { openCart } from '../../navigation/customerNavigation';
import BackButton from '../../components/BackButton';
import BagIcon from '../../components/icons/BagIcon';
import StarIcon from '../../components/icons/StarIcon';
import AppText from '../../components/AppText';
import DishCard from '../../components/DishCard';
import { Notice } from '../../components/customer/ui';
import { restaurant, formatPrice } from '../../data/catalog';
import { selectAvailableItems } from '../../redux/menuSlice';
import { selectCartCount, selectBill } from '../../redux/cartSlice';
import { selectRestaurantOnline } from '../../redux/partnerSlice';
import { restaurantPhotos } from '../../data/restaurantPhotos';
import { routes } from '../../navigation/routes';
import { plural } from '../../utils/format';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

export default function RestaurantScreen({ navigation }) {
  const cartCount = useSelector(selectCartCount);
  const { subtotal } = useSelector(selectBill);
  const dishes = useSelector(selectAvailableItems);
  const online = useSelector(selectRestaurantOnline);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [...new Set(dishes.map(dish => dish.category))];
  const visibleCategories = selectedCategory === 'All' ? categories : [selectedCategory];
  const sections = visibleCategories.map(title => ({ title, data: dishes.filter(dish => dish.category === title) }));
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <SectionList sections={sections} keyExtractor={item => item.id} stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        <View style={styles.cover}>
          {restaurantPhotos[restaurant.image]
            ? <Image source={restaurantPhotos[restaurant.image]} style={styles.coverPhoto} resizeMode="cover" accessibilityIgnoresInvertColors />
            : <AppText style={styles.coverSymbol}>{restaurant.symbol}</AppText>}
          <View style={styles.topRow}><BackButton onPress={() => navigation.goBack()} /></View>
        </View>
        <Animated.View entering={FadeIn.duration(300)} style={styles.restaurantIntro}>
          <AppText variant="heading">{restaurant.name}</AppText>
          <AppText variant="small" color={COLORS.textSecondary}>{restaurant.cuisine}</AppText>
          <View style={styles.statsRow}><StarIcon /><AppText variant="small" color={COLORS.warning} style={styles.bold}>{restaurant.rating} rating</AppText></View>
          <View style={styles.deliveryFields}>
            <View style={styles.deliveryInfo}><AppText variant="caption" color={COLORS.textSecondary}>Estimated time</AppText><AppText style={styles.bold} color={COLORS.primaryDark}>{restaurant.time}</AppText></View>
            <View style={styles.deliveryInfo}><AppText variant="caption" color={COLORS.textSecondary}>Delivery fee</AppText><AppText style={styles.bold} color={COLORS.primaryDark}>{formatPrice(restaurant.deliveryFee)}</AppText></View>
          </View>
          <AppText variant="small" color={COLORS.textSecondary} style={styles.description}>{restaurant.description}</AppText>
          {!online ? <Notice warning icon="clock" title="Closed right now">You can browse the menu; ordering opens when the restaurant is back online.</Notice> : null}
        </Animated.View>
        <AppText variant="heading" style={styles.menuHeading}>Explore Menu</AppText>
        <View style={styles.categoryRow}>
          {['All', ...categories].map(item => (
            <Pressable key={item} onPress={() => setSelectedCategory(item)} accessibilityRole="button" accessibilityState={{ selected: selectedCategory === item }}
              style={[styles.categoryChip, selectedCategory === item && styles.selectedChip]}>
              <AppText variant="caption" color={selectedCategory === item ? COLORS.white : COLORS.text} style={styles.bold}>{item === 'All' ? 'All dishes' : item}</AppText>
            </Pressable>
          ))}
        </View>
      </>}
      renderSectionHeader={({ section }) => <AppText style={styles.sectionHeading}>{section.title}</AppText>}
      renderItem={({ item }) => <DishCard dish={item} restaurant={restaurant} showRestaurant={false} onPress={() => navigation.navigate(routes.DISH_DETAIL, { dishId: item.id })} />}
      ListFooterComponent={<View style={styles.footerSpace} />}
    />
    {cartCount ? <Pressable onPress={() => openCart(navigation)} style={styles.cartBar} accessibilityRole="button">
      <View style={styles.cartBarRow}><BagIcon /><AppText color={COLORS.white} style={styles.bold}>View Cart · {plural(cartCount, 'item')} · {formatPrice(subtotal)}</AppText></View>
    </Pressable> : null}
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, content: { paddingHorizontal: 18 },
  bold: { fontWeight: '700' },
  cover: { height: 230, backgroundColor: COLORS.primaryLight, marginHorizontal: -18, alignItems: 'center', justifyContent: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  coverPhoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  coverSymbol: { fontSize: 68, lineHeight: 80 },
  topRow: { position: 'absolute', left: 18, top: 15 },
  restaurantIntro: { backgroundColor: COLORS.background, marginTop: -16, marginHorizontal: -18, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: SPACING.xl, paddingBottom: 17, gap: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  deliveryFields: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  deliveryInfo: { flex: 1, backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.md, padding: SPACING.md },
  description: { marginTop: 6 },
  menuHeading: { marginTop: 12 },
  categoryRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: SPACING.md, marginBottom: 7 },
  categoryChip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: RADIUS.pill, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  selectedChip: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sectionHeading: { fontWeight: '700', marginTop: 17, marginBottom: 11 },
  footerSpace: { height: 22 },
  cartBarRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  cartBar: { backgroundColor: COLORS.primary, margin: SPACING.lg, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md },
});
