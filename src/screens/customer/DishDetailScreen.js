import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { addItem } from '../../redux/cartSlice';
import { customerKey, selectIsFavorite, toggleFavorite } from '../../redux/customerSlice';
import { selectMenuItems } from '../../redux/menuSlice';
import BackButton from '../../components/BackButton';
import BagIcon from '../../components/icons/BagIcon';
import HeartFilledIcon from '../../components/icons/HeartFilledIcon';
import HeartIcon from '../../components/icons/HeartIcon';
import MinusIcon from '../../components/icons/MinusIcon';
import PlusIcon from '../../components/icons/PlusIcon';
import StarIcon from '../../components/icons/StarIcon';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import FloatingMessage from '../../components/FloatingMessage';
import ScreenFrame from '../../components/ScreenFrame';
import { EmptyState, Notice } from '../../components/customer/ui';
import { restaurant, makeCartItem, findDish, pricing, formatPrice, ratingLabel } from '../../data/catalog';
import { getFoodPhoto } from '../../data/foodPhotos';
import { openCart } from '../../navigation/customerNavigation';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';
import { TYPOGRAPHY } from '../../theme/typography';

export default function DishDetailScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const dish = useSelector(state => findDish(route.params?.dishId, selectMenuItems(state)));
  const unavailable = useSelector(state => Boolean(dish) && state.menu.unavailable.includes(dish.id));
  const favorite = useSelector(state => selectIsFavorite(state, route.params?.dishId));
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [extraChicken, setExtraChicken] = useState(false);
  if (!dish) return <ScreenFrame navigation={navigation} title="Dish">
    <EmptyState title="Dish not found">This dish may have been removed from the menu.</EmptyState>
    <AppButton title="Back" variant="outline" onPress={() => navigation.goBack()} />
  </ScreenFrame>;
  const canCustomize = (dish.tags || []).includes('chicken');
  const unitPrice = dish.price + (extraChicken ? pricing.extraChicken : 0);
  const total = unitPrice * quantity;
  const photo = getFoodPhoto(dish);
  const label = dish.bestseller ? 'BESTSELLER' : dish.recommended ? 'FOODMIND PICK' : dish.category.toUpperCase();

  function add() {
    dispatch(addItem(makeCartItem(dish, quantity, extraChicken)));
    setMessage(`${quantity} × ${dish.name} added to cart`);
  }
  return <SafeAreaView style={styles.screen} edges={['top']}><View style={styles.screen}>
    <View style={styles.heroTop}>
      <BackButton onPress={() => navigation.goBack()} />
      <Pressable onPress={() => dispatch(toggleFavorite({ userKey: customerKey(user), dishId: dish.id }))} style={styles.circleButton}
        accessibilityRole="button" accessibilityLabel={favorite ? 'Remove from favourites' : 'Save to favourites'} accessibilityState={{ selected: favorite }}>
        {favorite ? <HeartFilledIcon /> : <HeartIcon />}
      </Pressable>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {photo ? <Image source={photo} style={styles.heroPhoto} accessibilityIgnoresInvertColors /> : <AppText style={styles.heroEmoji}>{dish.symbol}</AppText>}
      </View>
      <Animated.View entering={FadeIn.duration(300)} style={styles.info}>
        <AppText variant="caption" color={COLORS.primary} style={styles.eyebrow}>{label}</AppText>
        <AppText variant="heading">{dish.name}</AppText>
        <AppText variant="small" color={COLORS.textSecondary}>{restaurant.name}</AppText>
        <View style={styles.meta}>
          <AppText variant="heading" color={COLORS.primary}>{formatPrice(dish.price)}</AppText>
          <View style={styles.ratingRow}><StarIcon /><AppText variant="small" color={COLORS.warning} style={styles.bold}>{ratingLabel(dish)}</AppText></View>
        </View>
        {dish.description ? <AppText variant="small" color={COLORS.textSecondary} style={styles.description}>{dish.description}</AppText> : null}
        {unavailable ? <Notice warning icon="clock" title="Currently unavailable">The restaurant has paused this dish for now.</Notice> : <>
          <AppText variant="subheading" style={styles.heading}>Customize</AppText>
          {canCustomize ? <Pressable onPress={() => setExtraChicken(!extraChicken)} style={styles.checkboxRow}
            accessibilityRole="checkbox" accessibilityState={{ checked: extraChicken }} accessibilityLabel={`Extra chicken, plus ${formatPrice(pricing.extraChicken)}`}>
            <View style={[styles.checkbox, extraChicken && styles.checkboxChecked]}><AppText variant="small" color={COLORS.white} style={styles.bold}>{extraChicken ? '✓' : ''}</AppText></View>
            <AppText variant="small" style={[styles.bold, styles.flex]}>Extra Chicken</AppText>
            <AppText variant="small" color={COLORS.textSecondary}>+ {formatPrice(pricing.extraChicken)}</AppText>
          </Pressable> : <AppText variant="small" color={COLORS.textSecondary}>No customizations available for this dish.</AppText>}
        </>}
      </Animated.View>
    </ScrollView>
    {!unavailable ? <View style={styles.footer}>
      <View style={styles.quantityRow}>
        <Pressable onPress={() => setQuantity(current => Math.max(1, current - 1))} disabled={quantity <= 1} style={[styles.stepper, quantity <= 1 && styles.disabled]} accessibilityRole="button" accessibilityLabel="Decrease quantity"><MinusIcon /></Pressable>
        <AppText style={[styles.bold, styles.quantity]} accessibilityLabel={`Quantity ${quantity}`}>{quantity}</AppText>
        <Pressable onPress={() => setQuantity(current => Math.min(99, current + 1))} style={styles.stepper} accessibilityRole="button" accessibilityLabel="Increase quantity"><PlusIcon /></Pressable>
      </View>
      <Pressable onPress={add} style={styles.button} accessibilityRole="button">
        <View style={styles.buttonRow}><BagIcon /><AppText variant="small" color={COLORS.white} style={styles.bold}>Add to cart · {formatPrice(total)}</AppText></View>
      </Pressable>
    </View> : null}
    <FloatingMessage message={message} onClose={() => setMessage('')} actionLabel="View cart" onAction={() => openCart(navigation)} />
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background }, scroll: { flex: 1 }, content: { flexGrow: 1 },
  flex: { flex: 1 }, bold: { fontWeight: '700' },
  hero: { backgroundColor: COLORS.inputBackground, height: 320, alignItems: 'center', justifyContent: 'center' },
  heroTop: { zIndex: 2, position: 'absolute', top: 13, left: 18, right: 18, flexDirection: 'row', justifyContent: 'space-between' },
  circleButton: { backgroundColor: COLORS.surface, width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  heroPhoto: { width: '100%', height: '100%', position: 'absolute' },
  heroEmoji: { fontSize: 108, lineHeight: 120 },
  info: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 25, paddingBottom: 35, marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, gap: 6 },
  eyebrow: { fontWeight: '700', letterSpacing: 1 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  description: { marginTop: 12, marginBottom: 18 },
  heading: { marginBottom: SPACING.sm },
  checkboxRow: { flexDirection: 'row', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary },
  footer: { flexDirection: 'row', backgroundColor: COLORS.surface, paddingHorizontal: 15, paddingVertical: 14, alignItems: 'center', gap: 13, borderTopColor: COLORS.border, borderTopWidth: 1 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepper: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.45 },
  quantity: { ...TYPOGRAPHY.body, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  button: { flex: 1, backgroundColor: COLORS.primary, minHeight: 50, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
});
