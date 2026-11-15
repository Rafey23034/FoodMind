import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import { usePartnerOrder, PartnerOrderSummary, OrderStageBadge } from '../../components/partner/PartnerOrder';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { EmptyState, ui } from '../../components/customer/ui';
import { transitionPartnerOrder } from '../../redux/partnerSlice';
import { orderNumber, partnerStage } from '../../data/partnerOrders';
import { routes } from '../../navigation/routes';
import Icon from '../../components/Icon';
import { COLORS } from '../../theme/colors';

export default function PartnerPreparingOrderScreen({ navigation, route, hasPartnerTabs }) {
  const dispatch = useDispatch();
  const order = usePartnerOrder(route.params?.orderId);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const stage = partnerStage(order);
  const remaining = order?.readyAt ? Math.max(0, Math.ceil((new Date(order.readyAt).getTime() - now) / 60000)) : order?.prepMinutes || 20;
  const total = (order?.prepMinutes || 20) + (order?.delayMinutes || 0);
  const progress = Math.max(0, Math.min(1, 1 - remaining / total));
  function ready() {
    Promise.resolve(dispatch(transitionPartnerOrder({ id: order.id, stage: 'ready' })))
      .then(ok => { if (ok) navigation.navigate(routes.PARTNER_ORDER_STATUS, { orderId: order.id }); });
  }
  return <PartnerLayout navigation={navigation} title={order ? `Order #${orderNumber(order)}` : 'Preparing Order'} hasTabs={hasPartnerTabs}
    footer={order ? <AppButton title={stage === 'preparing' ? 'Mark Ready for Pickup' : 'View Current Status'} icon={stage === 'preparing' ? 'clock' : undefined} variant={stage === 'preparing' ? 'secondary' : 'outline'}
      onPress={stage === 'preparing' ? ready : () => navigation.navigate(routes.PARTNER_ORDER_STATUS, { orderId: order.id })} /> : null}>
    {!order ? <EmptyState title="Order not found">Choose an active order from the Orders tab.</EmptyState> : <>
      <OrderStageBadge order={order} /><PartnerOrderSummary order={order} />
      <View style={ui.card}><View style={ui.row}><Icon name="clock" size={15} /><AppText style={ui.bold}>{stage === 'preparing' ? `Preparing · ${remaining > 0 ? `${remaining} min left` : 'Prep estimate reached'}` : 'Order has moved to its next stage'}</AppText></View>
        <View style={styles.track}><View style={[styles.fill, { width: `${progress * 100}%` }]} /></View>
        {order.delayMinutes ? <AppText variant="caption" color={COLORS.warning}>Pickup estimate extended by {order.delayMinutes} minutes.</AppText> : null}
      </View>
      <View style={[ui.card, ui.row]}><View style={styles.avatar}><Icon name="rider" size={15} /></View><View style={ui.flex}>
        <AppText style={ui.bold}>{order.rider ? `${order.rider.name} · ${order.rider.rating} ★` : 'Rider assignment pending'}</AppText>
        <AppText variant="caption" color={COLORS.textSecondary}>{order.rider ? `${order.rider.vehicle} · Arrives in ${order.rider.eta}${order.rider.isDemo ? ' · Sample rider' : ''}` : 'A rider is assigned when the food is ready.'}</AppText>
      </View></View>
    </>}
  </PartnerLayout>;
}
const styles = StyleSheet.create({ track: { height: 5, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' }, fill: { height: 5, backgroundColor: COLORS.warning }, avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' } });
