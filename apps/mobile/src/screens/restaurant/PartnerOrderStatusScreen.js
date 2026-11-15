import React, { useState } from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import { usePartnerOrder, PartnerOrderProgress, OrderStageBadge } from '../../components/partner/PartnerOrder';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import DeliveryMap from '../../components/customer/DeliveryMap';
import { orderMapSource } from '../../services/api';
import { EmptyState, Notice, ui } from '../../components/customer/ui';
import { transitionPartnerOrder, delayPartnerPickup } from '../../redux/partnerSlice';
import { orderNumber, partnerStage, PARTNER_STAGE_LABELS } from '../../data/partnerOrders';
import { routes } from '../../navigation/routes';
import { openPartnerOrders } from '../../navigation/partnerNavigation';
import { COLORS } from '../../theme/colors';

export default function PartnerOrderStatusScreen({ navigation, route, hasPartnerTabs }) {
  const dispatch = useDispatch();
  const order = usePartnerOrder(route.params?.orderId);
  const { profile } = usePartner();
  const [contact, setContact] = useState(false);
  const stage = partnerStage(order);
  const message = stage === 'ready' ? `Your order from ${profile.name || 'the restaurant'} is ready for pickup. The rider should be on the way shortly.`
    : stage === 'picked-up' ? 'Your rider has collected your order and is on the way.'
      : stage === 'preparing' ? 'Your order has been accepted and is being prepared.'
        : stage === 'delivered' ? 'Your order has been delivered. Enjoy your meal!'
          : stage === 'rejected' ? (order?.cancelledByCustomer ? 'This order was cancelled by the customer.' : 'This order could not be accepted.') : 'Your order has been received.';
  return <PartnerLayout navigation={navigation} title="Update Order Status" subtitle={order ? `Order #${orderNumber(order)}` : ''} hasTabs={hasPartnerTabs}>
    {!order ? <EmptyState title="Order not found">Choose an order from the Orders tab.</EmptyState> : <>
      <View style={ui.card}><AppText style={ui.bold}>{order.items.map(item => `${item.name} ×${item.quantity}`).join(', ')}</AppText><AppText variant="small" color={COLORS.textSecondary}>{order.isPaid ? 'Online Paid' : 'Cash on Delivery'}</AppText><OrderStageBadge order={order} /></View>
      <View style={ui.card}><AppText variant="subheading">Workflow</AppText><PartnerOrderProgress order={order} accepted />
        <Notice success={stage === 'ready' || stage === 'delivered'} title={`Current stage: ${PARTNER_STAGE_LABELS[stage]}`} />
      </View>
      {order.source === 'api' && !['rejected', 'delivered'].includes(stage) ? <View style={ui.card}>
        <AppText variant="subheading">Delivery route</AppText>
        <DeliveryMap eta={order.rider ? `Rider · ${order.rider.name}` : 'Waiting for a rider'} mapSource={orderMapSource(order.id, order.dbStatus || stage)} />
      </View> : null}
      <AppText variant="small" color={COLORS.textSecondary}>QUICK ACTIONS</AppText>
      {stage === 'ready' ? (order.source === 'api'
        ? <Notice title="Waiting for rider pickup">The assigned rider marks this order picked up in the rider app.</Notice>
        : <AppButton title="Mark Picked Up" onPress={() => dispatch(transitionPartnerOrder({ id: order.id, stage: 'picked-up' }))} />)
        : stage === 'preparing' ? <AppButton title="Mark Ready for Pickup" onPress={() => Promise.resolve(dispatch(transitionPartnerOrder({ id: order.id, stage: 'ready' })))} />
          : stage === 'new' ? <AppButton title="Review New Order" onPress={() => navigation.replace(routes.PARTNER_NEW_ORDER, { orderId: order.id })} /> : null}
      <View style={ui.row}><AppButton title="Delay 5 min" variant="outline" style={ui.flex} disabled={!['preparing', 'ready'].includes(stage)} onPress={() => dispatch(delayPartnerPickup(order.id))} />
        <AppButton title="Contact Rider" variant="secondary" style={ui.flex} disabled={!order.rider || ['rejected', 'delivered'].includes(stage)} onPress={() => setContact(!contact)} /></View>
      {order.delayMinutes ? <AppText variant="small" color={COLORS.warning}>Pickup estimate extended by {order.delayMinutes} minutes.</AppText> : null}
      {contact ? <Notice title={order.rider?.name || 'Rider contact'}>Calls and rider messaging will be connected with the delivery service.</Notice> : null}
      <View style={ui.card}><AppText variant="subheading">Customer update preview</AppText><AppText variant="small" color={COLORS.textSecondary}>“{message}”</AppText><AppText variant="caption" color={COLORS.textSecondary}>Preview only · no notification is sent</AppText></View>
      <AppButton title="Back to Orders" variant="outline" onPress={() => openPartnerOrders(navigation)} />
    </>}
  </PartnerLayout>;
}
