import React, { useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import DeliveryMap from '../../components/customer/DeliveryMap';
import OrderProgress from '../../components/customer/OrderProgress';
import { BillRow, EmptyState, Notice, ui } from '../../components/customer/ui';
import { customerKey, saveDelivery, selectCustomer } from '../../redux/customerSlice';
import { COMMUNITY_STAGES } from '../../data/riderOffers';
import { formatPrice } from '../../data/catalog';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

export default function DeliveryProgressScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { deliveries } = useSelector(selectCustomer);
  const delivery = deliveries.find(item => item.id === route.params?.deliveryId);
  const [contact, setContact] = useState(false);
  const current = COMMUNITY_STAGES.indexOf(delivery?.status);
  const delivered = delivery?.status === 'Delivered';
  const foodTotal = delivery?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  return <ScreenLayout navigation={navigation} title="Delivery in Progress" subtitle={delivery ? `Community Delivery · #${delivery.id.slice(-6)}` : ''}>
    {!delivery?.rider ? <EmptyState title="No rider selected">Choose a rider offer to preview your delivery.</EmptyState> : <>
      <DeliveryMap community arrived={delivered} />
      <View style={ui.card}>
        <View style={ui.between}><AppText variant="subheading" style={ui.flex}>{delivered ? 'Delivery complete!' : delivery.status === 'On the way' ? 'Your rider is on the way' : delivery.status}</AppText><AppText variant="caption" color={COLORS.primary}>Demo tracking</AppText></View>
        <View style={ui.row}><View style={ui.flex}><AppText style={ui.bold}>{delivery.rider.name} · {delivery.rider.rating} ★</AppText><AppText variant="small" color={COLORS.textSecondary}>{delivery.rider.eta} · Sample rider</AppText></View><AppButton title="Call" icon="phone" variant="outline" onPress={() => setContact(!contact)} /></View>
        {contact ? <Notice title="Rider contact preview">Calls will be available when the rider service is connected.</Notice> : null}
        <View style={ui.line} /><OrderProgress vertical status={delivery.status} stages={COMMUNITY_STAGES} />
      </View>
      <View style={ui.card}>
        <AppText style={ui.bold}>{delivery.shop}</AppText><AppText variant="small" color={COLORS.textSecondary}>Pickup: {delivery.location}</AppText>
        <AppText variant="small" color={COLORS.textSecondary}>Deliver to: {delivery.address}</AppText>
        {delivery.notes ? <AppText variant="small">Note: {delivery.notes}</AppText> : null}
        <View style={ui.line} />
        <BillRow label="Estimated food total" value={formatPrice(foodTotal)} /><BillRow label="Rider delivery fee" value={formatPrice(delivery.rider.fee)} />
        <BillRow label="Estimated cash due" value={formatPrice(foodTotal + delivery.rider.fee)} bold />
      </View>
      {!delivered ? <View style={ui.card}><AppText variant="small" color={COLORS.textSecondary}>Demo control: move this delivery to its next stage.</AppText><AppButton title={`Demo · ${COMMUNITY_STAGES[current + 1]}`} variant="outline" onPress={() => dispatch(saveDelivery({ userKey: customerKey(user), delivery: { ...delivery, status: COMMUNITY_STAGES[current + 1] } }))} /></View> : <Notice success icon="check" title="Delivered">Your community delivery is complete.</Notice>}
      <AppButton title="Open Support" variant="text" onPress={() => navigation.navigate(routes.HELP_SUPPORT, { deliveryId: delivery.id })} />
    </>}
  </ScreenLayout>;
}
