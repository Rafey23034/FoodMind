import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { openCart } from '../../navigation/customerNavigation';
import ScreenFrame from '../../components/ScreenFrame';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import Icon from '../../components/Icon';
import FoodThumbnail from '../../components/FoodThumbnail';
import OrderProgress from '../../components/customer/OrderProgress';
import { EmptyState, ui } from '../../components/customer/ui';
import { reorder } from '../../redux/cartSlice';
import { selectMyOrders } from '../../redux/ordersSlice';
import { syncCustomerData } from '../../redux/apiThunks';
import { routes } from '../../navigation/routes';
import { formatPrice, restaurant } from '../../data/catalog';
import { isClosedOrder, orderStatusLabel, orderEtaText, riderLine } from '../../data/orderHelpers';
import { COLORS } from '../../theme/colors';
import { RADIUS } from '../../theme/spacing';

export default function OrdersScreen({ navigation }) {
  const dispatch = useDispatch();
  const orders = useSelector(selectMyOrders);
  const apiSession = useSelector(state => Boolean(state.auth.user?.accessToken || state.auth.user?.refreshToken));
  const [selectedTab, setSelectedTab] = useState('active');
  useEffect(() => {
    if (!apiSession) return undefined;
    dispatch(syncCustomerData());
    const timer = setInterval(() => dispatch(syncCustomerData()), 10000);
    return () => clearInterval(timer);
  }, [apiSession, dispatch]);
  const activeOrders = orders.filter(order => !isClosedOrder(order));
  const pastOrders = orders.filter(isClosedOrder);

  function handleReorder(order) {
    dispatch(reorder(order.items));
    openCart(navigation);
  }

  const renderPastOrder = order => (
    <View key={order.id} style={[ui.card, ui.row]}>
      <FoodThumbnail dishId={order.items[0]?.dishId || order.items[0]?.id} symbol={order.items[0]?.symbol} size={54} />
      <Pressable style={ui.flex} accessibilityRole="button" accessibilityLabel={`View order ${order.id.slice(-6)}`} onPress={() => navigation.navigate(routes.ORDER_DETAILS, { orderId: order.id })}>
        <AppText style={ui.bold}>{order.restaurant} ›</AppText>
        <AppText variant="small" color={COLORS.textSecondary} numberOfLines={1}>{order.items.map(item => item.name).join(', ')}</AppText>
        <AppText variant="small"><AppText variant="small" style={ui.bold}>{formatPrice(order.total)}</AppText>
          <AppText variant="small" color={order.status === 'Delivered' ? COLORS.success : COLORS.danger}>  ·  {orderStatusLabel(order)}</AppText></AppText>
      </Pressable>
      <Pressable style={styles.reorderButton} onPress={() => handleReorder(order)} accessibilityRole="button" accessibilityLabel={`Reorder ${order.restaurant}`}>
        <AppText variant="small" color={COLORS.primary} style={ui.bold}>Reorder</AppText>
      </Pressable>
    </View>
  );

  return (
    <ScreenFrame navigation={navigation} title="My Orders" backLabel="Back to Profile" onBack={() => navigation.goBack()}>
      <View style={styles.tabs}>
        {[['active', `Active (${activeOrders.length})`], ['past', `Past (${pastOrders.length})`]].map(([key, label]) => (
          <Pressable key={key} style={[styles.tab, selectedTab === key && styles.activeTab]} onPress={() => setSelectedTab(key)}
            accessibilityRole="button" accessibilityState={{ selected: selectedTab === key }}>
            <AppText style={ui.bold} color={selectedTab === key ? COLORS.white : COLORS.textSecondary}>{label}</AppText>
          </Pressable>
        ))}
      </View>

      {selectedTab === 'active' ? <>
        {activeOrders.length === 0 ? <EmptyState icon="bag" title="No active orders">Orders you place will show their live status here.</EmptyState>
          : activeOrders.map(order => (
            <View key={order.id} style={[ui.card, styles.activeOrderCard]}>
              <View style={ui.between}>
                <AppText variant="caption" color={COLORS.primary} style={ui.bold}>ORDER #{order.id.slice(-6)}</AppText>
                <AppText variant="caption" color={COLORS.success} style={ui.bold}>● {orderStatusLabel(order)}</AppText>
              </View>
              <AppText variant="subheading">{order.restaurant}</AppText>
              <View style={styles.etaBox}>
                <View style={styles.etaIcon}><Icon name="clock" size={15} color={COLORS.white} /></View>
                <View style={ui.flex}>
                  <AppText variant="caption" color={COLORS.textSecondary}>Estimated arrival</AppText>
                  <AppText style={ui.bold}>{orderEtaText(order, restaurant.time)}</AppText>
                </View>
              </View>
              <OrderProgress status={order.status} />
              <View style={styles.riderCard}>
                <View style={styles.avatar}><Icon name="rider" size={15} /></View>
                <View style={ui.flex}>
                  <AppText style={ui.bold}>{order.rider ? order.rider.name : 'Rider assignment pending'}</AppText>
                  <AppText variant="caption" color={COLORS.textSecondary}>{riderLine(order)}</AppText>
                </View>
              </View>
              <AppText variant="small" color={COLORS.textSecondary}>{order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}</AppText>
              <View style={ui.between}>
                <AppText variant="small" color={COLORS.textSecondary}>{order.payment === 'cash' ? 'Due on delivery (cash)' : 'Paid'}</AppText>
                <AppText style={ui.bold}>{formatPrice(order.total)}</AppText>
              </View>
              <AppButton title="Track Order" onPress={() => navigation.navigate(routes.TRACK_ORDER, { orderId: order.id })} />
              <View style={ui.row}>
                <AppButton style={ui.flex} variant="outline" title="View Details" onPress={() => navigation.navigate(routes.ORDER_DETAILS, { orderId: order.id })} />
                <AppButton style={ui.flex} variant="outline" title="Need Help?" onPress={() => navigation.navigate(routes.HELP_SUPPORT, { orderId: order.id })} />
              </View>
            </View>
          ))}
        <View style={ui.between}>
          <AppText variant="subheading">Previous orders</AppText>
          {pastOrders.length ? <Pressable onPress={() => setSelectedTab('past')} accessibilityRole="button" hitSlop={8}>
            <AppText variant="small" color={COLORS.primary} style={ui.bold}>View all ({pastOrders.length})</AppText>
          </Pressable> : null}
        </View>
        {pastOrders.length ? pastOrders.slice(0, 2).map(renderPastOrder) : <AppText variant="small" color={COLORS.textSecondary}>No previous orders yet.</AppText>}
      </> : <>
        <AppText variant="subheading">Order history</AppText>
        {pastOrders.length === 0 ? <EmptyState icon="bag" title="No previous orders yet">Delivered and cancelled orders appear here.</EmptyState> : pastOrders.map(renderPastOrder)}
      </>}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border, padding: 4, borderRadius: RADIUS.md },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.sm },
  activeTab: { backgroundColor: COLORS.primary },
  activeOrderCard: { borderColor: COLORS.primaryBorder, gap: 14 },
  etaBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: RADIUS.md },
  etaIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  riderCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: COLORS.inputBackground, borderRadius: RADIUS.md, padding: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  reorderButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primaryLight },
});
