import React, { useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import DeliveryMap from '../../components/customer/DeliveryMap';
import OrderProgress from '../../components/customer/OrderProgress';
import { EmptyState, Notice, ui } from '../../components/customer/ui';
import { selectMyOrder } from '../../redux/ordersSlice';
import { advanceOrderDemo } from '../../redux/orderThunks';
import { isClosedOrder, orderStatusLabel, orderEtaText, riderLine } from '../../data/orderHelpers';
import { DEMO_STAGE_ACTION, partnerStage } from '../../data/partnerOrders';
import { restaurant } from '../../data/catalog';
import { routes } from '../../navigation/routes';
import { COLORS } from '../../theme/colors';

const HEADLINE = { new: 'Your order is confirmed', preparing: 'Your order is being prepared', ready: 'Your food is ready for pickup', 'picked-up': 'Your rider is on the way' };

export default function TrackOrderScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const order = useSelector(state => selectMyOrder(state, route.params?.orderId));
  const [contact, setContact] = useState(false);
  const stage = partnerStage(order);
  const closed = isClosedOrder(order);
  return <ScreenLayout navigation={navigation} title="Track Order" subtitle={order ? `Order #${order.id.slice(-6)}` : ''}>
    {!order ? <EmptyState title="Order not found">Choose an order from My Orders to track it.</EmptyState> : <>
      <DeliveryMap arrived={order.status === 'Delivered'} eta={closed ? null : orderEtaText(order, restaurant.time)} />
      <View style={ui.card}>
        <AppText variant="subheading">{HEADLINE[stage] || orderStatusLabel(order)}</AppText>
        {!closed ? <AppText variant="small" color={COLORS.textSecondary}>{orderEtaText(order, restaurant.time)}</AppText> : null}
        <OrderProgress status={order.status} />
        <View style={ui.line} />
        <View style={ui.row}><View style={ui.flex}>
          <AppText style={ui.bold}>{order.rider ? order.rider.name : 'Rider assignment pending'}</AppText>
          <AppText variant="small" color={COLORS.textSecondary}>{riderLine(order)}</AppText>
        </View></View>
        <AppButton title="Contact Rider" variant="outline" icon="phone" disabled={!order.rider || closed} onPress={() => setContact(!contact)} />
        {contact ? <Notice title="Rider contact">Calls and messages will be available when the delivery service is connected.</Notice> : null}
        <AppButton title="View Order Details" variant="outline" onPress={() => navigation.navigate(routes.ORDER_DETAILS, { orderId: order.id })} />
      </View>
      {!closed && DEMO_STAGE_ACTION[stage] ? <View style={ui.card}>
        <AppText variant="small" color={COLORS.textSecondary}>Demo control: move this order to its next stage (normally done by the restaurant and rider).</AppText>
        <AppButton title={`Demo · ${DEMO_STAGE_ACTION[stage]}`} variant="outline" onPress={() => dispatch(advanceOrderDemo(order.id))} />
      </View> : order.status === 'Delivered' ? <AppButton title="Rate Your Order" onPress={() => navigation.navigate(routes.RATE_ORDER, { orderId: order.id })} /> : null}
      <AppButton title="Open Support" variant="text" onPress={() => navigation.navigate(routes.HELP_SUPPORT, { orderId: order.id })} />
    </>}
  </ScreenLayout>;
}
