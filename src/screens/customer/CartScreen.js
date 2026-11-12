import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { openHome } from '../../navigation/customerNavigation';
import ScreenFrame from '../../components/ScreenFrame';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import FoodThumbnail from '../../components/FoodThumbnail';
import PlusIcon from '../../components/icons/PlusIcon';
import MinusIcon from '../../components/icons/MinusIcon';
import { BillRow, EmptyState, Notice, ui } from '../../components/customer/ui';
import { changeQuantity, clearCart, removeItem, selectBill, selectCartCount, selectCartLines } from '../../redux/cartSlice';
import { selectRestaurantOnline } from '../../redux/partnerSlice';
import { routes } from '../../navigation/routes';
import { restaurant, formatPrice } from '../../data/catalog';
import { confirmAction } from '../../utils/confirm';
import { plural } from '../../utils/format';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

// Cart tab root: no back button (it is a tab), prices always reflect the current menu.
export default function CartScreen({ navigation }) {
  const dispatch = useDispatch();
  const lines = useSelector(selectCartLines);
  const count = useSelector(selectCartCount);
  const online = useSelector(selectRestaurantOnline);
  const { subtotal, platformFee, deliveryFee, cartTotal } = useSelector(selectBill);
  const unavailable = lines.filter(line => !line.available);
  const empty = lines.length === 0;

  const clear = () => confirmAction({ title: 'Clear your cart?', message: `This removes ${plural(count, 'item')}.`, confirmLabel: 'Clear cart', onConfirm: () => dispatch(clearCart()) });
  const remove = line => confirmAction({ title: `Remove ${line.name}?`, confirmLabel: 'Remove', onConfirm: () => dispatch(removeItem(line.id)) });

  return (
    <ScreenFrame navigation={navigation} title="Your Cart" subtitle={empty ? '' : `${restaurant.name} · ${plural(count, 'item')}`} onBack={false}
      right={empty ? null : <Pressable onPress={clear} accessibilityRole="button" accessibilityLabel="Clear cart" hitSlop={10}><AppText variant="small" color={COLORS.danger} style={ui.bold}>Clear</AppText></Pressable>}
      footer={empty ? null : <View style={styles.footer}>
        <View><AppText variant="caption" color={COLORS.textSecondary}>Total payable</AppText><AppText variant="subheading">{formatPrice(cartTotal)}</AppText></View>
        <AppButton title="Checkout  →" style={styles.checkout} disabled={!online || unavailable.length > 0 || subtotal === 0} onPress={() => navigation.navigate(routes.CHECKOUT)} />
      </View>}>
      {empty ? <>
        <EmptyState icon="bag" title="Your cart is empty">Add a dish from the menu and it will appear here.</EmptyState>
        <AppButton title="Browse menu" onPress={() => openHome(navigation)} />
      </> : <>
        {!online ? <Notice warning icon="clock" title={`${restaurant.name} is not accepting orders right now`}>Your cart is saved. You can check out when the restaurant is back online.</Notice> : null}
        {unavailable.length ? <Notice warning icon="warning" title="Some items are no longer available">Remove them to continue to checkout.</Notice> : null}
        {lines.map(line => (
          <View key={line.id} style={[ui.card, !line.available && styles.unavailable]}>
            <View style={styles.itemRow}>
              <FoodThumbnail dishId={line.dishId || line.id.split('-extra')[0]} symbol={line.symbol} size={64} />
              <View style={ui.flex}>
                <AppText style={ui.bold}>{line.name}</AppText>
                <AppText variant="small" color={COLORS.textSecondary}>{line.option || line.subtitle}</AppText>
                {line.available ? <AppText variant="small" color={COLORS.primary}>{formatPrice(line.price)}{line.priceChanged ? `  (was ${formatPrice(line.previousPrice)})` : ''}</AppText>
                  : <AppText variant="small" color={COLORS.danger} style={ui.bold}>Unavailable</AppText>}
              </View>
              {/* Available lines are removed from the quantity control; unavailable ones only need this button. */}
              {!line.available ? <Pressable onPress={() => remove(line)} accessibilityRole="button" accessibilityLabel={`Remove ${line.name}`} hitSlop={10} style={styles.iconButton}>
                <Icon name="trash" size={15} color={COLORS.danger} />
              </Pressable> : null}
            </View>
            {line.available ? <View style={styles.itemBottom}>
              <AppText style={ui.bold}>{formatPrice(line.price * line.quantity)}</AppText>
              <View style={styles.quantityControl}>
                {line.quantity === 1
                  ? <Pressable style={styles.step} onPress={() => remove(line)} accessibilityRole="button" accessibilityLabel={`Remove ${line.name}`}><Icon name="trash" size={14} color={COLORS.danger} /></Pressable>
                  : <Pressable style={styles.step} onPress={() => dispatch(changeQuantity({ id: line.id, amount: -1 }))} accessibilityRole="button" accessibilityLabel={`Decrease ${line.name}`}><MinusIcon /></Pressable>}
                <AppText style={[ui.bold, styles.quantity]} accessibilityLabel={`Quantity ${line.quantity}`}>{line.quantity}</AppText>
                <Pressable style={styles.step} disabled={line.quantity >= 99} onPress={() => dispatch(changeQuantity({ id: line.id, amount: 1 }))} accessibilityRole="button" accessibilityLabel={`Increase ${line.name}`}><PlusIcon /></Pressable>
              </View>
            </View> : null}
          </View>
        ))}
        <Pressable style={styles.addMore} onPress={() => openHome(navigation)} accessibilityRole="button">
          <AppText color={COLORS.primary} style={ui.bold}>+ Add more dishes</AppText>
        </Pressable>
        <View style={ui.card}>
          <AppText variant="subheading">Bill summary</AppText>
          <BillRow label="Subtotal" value={formatPrice(subtotal)} />
          <BillRow label="Delivery fee" value={formatPrice(deliveryFee)} />
          <BillRow label="Platform fee" value={formatPrice(platformFee)} />
          <View style={ui.line} />
          <BillRow label="Total" value={formatPrice(cartTotal)} bold />
        </View>
      </>}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.lg },
  checkout: { flex: 1, maxWidth: 200 },
  unavailable: { opacity: 0.75, borderColor: COLORS.warningBorder },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconButton: { padding: SPACING.sm },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  quantity: { minWidth: 20, textAlign: 'center' },
  step: { backgroundColor: COLORS.primaryLight, borderRadius: RADIUS.sm, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addMore: { padding: SPACING.lg, borderRadius: RADIUS.md, borderColor: COLORS.primary, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
});
