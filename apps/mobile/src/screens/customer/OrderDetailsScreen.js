import React from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { openCart } from '../../navigation/customerNavigation';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import FoodThumbnail from '../../components/FoodThumbnail';
import { BillRow, EmptyState, Notice, ui } from '../../components/customer/ui';
import { formatPrice } from '../../data/catalog';
import { orderBill, orderStatusLabel, canCustomerCancel } from '../../data/orderHelpers';
import { reorder } from '../../redux/cartSlice';
import { selectMyOrder } from '../../redux/ordersSlice';
import { cancelMyOrder } from '../../redux/orderThunks';
import { routes } from '../../navigation/routes';
import { confirmAction } from '../../utils/confirm';
import { COLORS } from '../../theme/colors';

export default function OrderDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const order = useSelector(state => selectMyOrder(state, route.params?.orderId));
  const bill = order ? orderBill(order) : null;
  const delivered = order?.status === 'Delivered';
  const cancel = () => confirmAction({
    title: 'Cancel this order?', message: 'The restaurant has not started preparing it yet.', confirmLabel: 'Cancel order',
    onConfirm: () => dispatch(cancelMyOrder(order.id)),
  });
  return <ScreenLayout navigation={navigation} title="Order Details" subtitle={order ? `Order #${order.id.slice(-6)}` : ''}
    footer={order ? <View style={ui.row}>
      <AppButton style={ui.flex} title={delivered ? 'Rate Your Order' : 'Track Order'} disabled={order.status === 'Rejected'}
        onPress={() => navigation.navigate(delivered ? routes.RATE_ORDER : routes.TRACK_ORDER, { orderId: order.id })} />
      <AppButton style={ui.flex} title="Reorder" variant="outline" onPress={() => { dispatch(reorder(order.items)); openCart(navigation); }} />
    </View> : null}>
    {!order ? <EmptyState title="Order not found">Your orders are saved in My Orders.</EmptyState> : <>
      <Notice success={delivered} icon={delivered ? 'check' : 'clock'} title={orderStatusLabel(order)}>
        {order.createdAt ? `Placed ${new Date(order.createdAt).toLocaleString()}` : 'Saved order'}
      </Notice>
      <AppText variant="subheading">{order.restaurant}</AppText>
      <View style={ui.card}>{order.items.map(item => <View key={item.id} style={ui.row}>
        <FoodThumbnail dishId={item.dishId || item.id} symbol={item.symbol} size={60} />
        <View style={ui.flex}><AppText style={ui.bold}>{item.name}</AppText><AppText variant="small" color={COLORS.textSecondary}>{item.quantity} × {formatPrice(item.price)}</AppText></View>
        <AppText variant="small" color={COLORS.primary} style={ui.bold}>{formatPrice(item.price * item.quantity)}</AppText>
      </View>)}</View>
      <AppText variant="subheading">Payment summary</AppText>
      <View style={ui.card}>
        <BillRow label="Subtotal" value={formatPrice(bill.subtotal)} />
        <BillRow label="Delivery fee" value={formatPrice(bill.deliveryFee)} />
        <BillRow label="Platform fee" value={formatPrice(bill.platformFee)} />
        <View style={ui.line} /><BillRow label={order.payment === 'cash' ? 'Total (cash on delivery)' : 'Total paid'} value={formatPrice(order.total)} bold />
      </View>
      <Notice icon="location" title="Delivery address">{order.address}</Notice>
      {canCustomerCancel(order) ? <>
        <AppButton title="Cancel Order" variant="outline" onPress={cancel} />
        <AppText variant="small" color={COLORS.textSecondary} style={ui.center}>You can cancel until the restaurant accepts your order.</AppText>
      </> : null}
      <AppButton title="Need help with this order?" variant="text" onPress={() => navigation.navigate(routes.HELP_SUPPORT, { orderId: order.id })} />
    </>}
  </ScreenLayout>;
}
