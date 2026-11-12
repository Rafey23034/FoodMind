import React from 'react';
import { openHome } from '../../navigation/customerNavigation';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import ScreenLayout from '../../components/customer/ScreenLayout';
import { BillRow, EmptyState, ui } from '../../components/customer/ui';
import { formatPrice, restaurant } from '../../data/catalog';
import { routes } from '../../navigation/routes';
import { selectMyOrder } from '../../redux/ordersSlice';
import { plural } from '../../utils/format';
import { COLORS } from '../../theme/colors';

export default function OrderPlacedScreen({ navigation, route }) {
  const order = useSelector(state => selectMyOrder(state, route.params?.orderId));
  return <ScreenLayout navigation={navigation} title="Order confirmed!"
    footer={<><AppButton title="Track My Order →" disabled={!order} onPress={() => navigation.replace(routes.TRACK_ORDER, { orderId: order.id })} />
      <AppButton title="Back to Home" variant="outline" onPress={() => openHome(navigation)} /></>}>
    {!order ? <EmptyState title="Order not found">Your saved orders are available in My Orders.</EmptyState> : <>
      <View style={styles.hero}><View style={styles.halo}><View style={styles.check}><AppText style={styles.checkText}>✓</AppText></View></View></View>
      <AppText style={[ui.bold, ui.center]}>Your order is on its way to the kitchen</AppText>
      <AppText variant="small" color={COLORS.textSecondary} style={ui.center}>We'll show live progress on the tracking screen.</AppText>
      <View style={ui.card}>
        <View style={ui.between}><AppText variant="small" color={COLORS.primary}>ORDER #{order.id.slice(-6)}</AppText><AppText variant="small" color={COLORS.primary}>{order.status}</AppText></View>
        <View style={ui.line} />
        <BillRow label="Restaurant" value={order.restaurant} />
        <BillRow label="Items" value={plural(order.items.reduce((n, item) => n + item.quantity, 0), 'item')} />
        <BillRow label="Estimated arrival" value={restaurant.time} />
        <View style={ui.line} />
        <BillRow label="Total amount" value={formatPrice(order.total)} bold />
        <AppText variant="caption" color={COLORS.textSecondary} style={styles.right}>Cash on delivery</AppText>
      </View>
    </>}
  </ScreenLayout>;
}
const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 25 },
  halo: { width: 160, height: 160, borderRadius: 80, backgroundColor: COLORS.successLight, borderWidth: 18, borderColor: COLORS.successBorder, alignItems: 'center', justifyContent: 'center' },
  check: { width: 87, height: 87, borderRadius: 44, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 50, lineHeight: 60, color: COLORS.white, fontWeight: '700' },
  right: { textAlign: 'right' },
});
