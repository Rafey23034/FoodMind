import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import { usePartnerOrder, PartnerOrderSummary, OrderStageBadge } from '../../components/partner/PartnerOrder';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { Chip, EmptyState, Notice, ui } from '../../components/customer/ui';
import { transitionPartnerOrder } from '../../redux/partnerSlice';
import { orderNumber, partnerStage } from '../../data/partnerOrders';
import { routes } from '../../navigation/routes';
import { openPartnerPreparation } from '../../navigation/partnerNavigation';
import { COLORS } from '../../theme/colors';

export default function PartnerNewOrderScreen({ navigation, route, hasPartnerTabs }) {
  const dispatch = useDispatch();
  const order = usePartnerOrder(route.params?.orderId);
  const [minutes, setMinutes] = useState(20);
  const [rejecting, setRejecting] = useState(Boolean(route.params?.confirmReject));
  const canAccept = partnerStage(order) === 'new';
  function accept() {
    Promise.resolve(dispatch(transitionPartnerOrder({ id: order.id, stage: 'preparing', prepMinutes: minutes })))
      .then(ok => { if (ok) openPartnerPreparation(navigation, order.id); });
  }
  return <PartnerLayout navigation={navigation} title={order ? `Order #${orderNumber(order)}` : 'New Order'} hasTabs={hasPartnerTabs}
    footer={order && canAccept ? <View style={ui.row}><AppButton title="Reject" variant="outline" style={ui.flex} onPress={() => setRejecting(!rejecting)} /><AppButton title="Accept Order" icon="check" style={styles.accept} onPress={accept} /></View> : null}>
    {!order ? <EmptyState title="Order not found">Choose an order from the partner Orders tab.</EmptyState> : <>
      {canAccept && rejecting ? <View style={[ui.card, styles.reject]}><AppText style={ui.bold}>Reject this order?</AppText>
        <AppText variant="small" color={COLORS.textSecondary}>The customer is told it could not be accepted, and it leaves the active queue.</AppText>
        <AppButton title="Confirm rejection" variant="danger" onPress={() => {
          Promise.resolve(dispatch(transitionPartnerOrder({ id: order.id, stage: 'rejected' })))
            .then(ok => { if (ok) navigation.replace(routes.PARTNER_ORDER_STATUS, { orderId: order.id }); });
        }} /><AppButton title="Keep order" variant="text" onPress={() => setRejecting(false)} /></View> : null}
      <OrderStageBadge order={order} /><PartnerOrderSummary order={order} />
      {canAccept ? <>
        <AppText variant="caption" color={COLORS.textSecondary} style={ui.bold}>ESTIMATED PREP TIME</AppText>
        <View style={ui.wrap}>{[15, 20, 30, 45].map(value => <Chip key={value} label={`${value} min`} selected={minutes === value} onPress={() => setMinutes(value)} />)}</View>
      </> : <><Notice title="This order has already been updated">Open its current workflow to continue.</Notice><AppButton title="View Current Status" onPress={() => navigation.replace(routes.PARTNER_ORDER_STATUS, { orderId: order.id })} /></>}
    </>}
  </PartnerLayout>;
}
const styles = StyleSheet.create({ accept: { flex: 2 }, reject: { borderColor: COLORS.danger } });
