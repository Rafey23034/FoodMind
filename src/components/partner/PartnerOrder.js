import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from '../Icon';
import { initials } from '../../utils/format';
import AppText from '../AppText';
import FoodThumbnail from '../FoodThumbnail';
import { BillRow, ui } from '../customer/ui';
import { selectPartnerOrders } from '../../redux/partnerSlice';
import { partnerStage, PARTNER_STAGE_LABELS, PARTNER_STAGES } from '../../data/partnerOrders';
import { formatPrice } from '../../data/catalog';
import { COLORS } from '../../theme/colors';

export function usePartnerOrder(id) {
  return useSelector(state => selectPartnerOrders(state).find(order => order.id === id));
}
export function PartnerOrderProgress({ order, accepted = false }) {
  const stage = partnerStage(order);
  const current = stage === 'delivered' ? 3 : PARTNER_STAGES.indexOf(stage);
  return <View style={styles.progress}>
    <View style={styles.line} />
    {['New', 'Preparing', 'Ready', 'Picked Up'].map((label, index) => <View key={label} style={styles.step}>
      <View style={[styles.dot, index <= current && styles.done]}><AppText variant="caption" color={index <= current ? COLORS.white : COLORS.textSecondary} style={styles.bold}>{index < current || stage === 'delivered' ? '✓' : index === current ? '●' : index + 1}</AppText></View>
      <AppText variant="caption" color={index <= current ? COLORS.primary : COLORS.textSecondary} style={styles.label}>{index === 0 && accepted ? 'Accepted' : label}</AppText>
    </View>)}
  </View>;
}
export function PartnerOrderSummary({ order, workflow = true }) {
  const name = order.customerName || 'FoodMind diner';
  return <>
    <View style={[ui.card, ui.row]}>
      <View style={styles.avatar}><AppText color={COLORS.primary} style={ui.bold}>{initials(name)}</AppText></View>
      <View style={ui.flex}><AppText style={ui.bold}>{name}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{order.address || 'Delivery address in order'}</AppText></View>
      <AppText variant="caption" color={order.isPaid ? COLORS.success : COLORS.textSecondary} style={ui.bold}>{order.isPaid ? 'Online Paid' : 'Cash on delivery'}</AppText>
    </View>
    {workflow ? <PartnerOrderProgress order={order} /> : null}
    <View style={ui.card}>{order.items.map(item => <View style={ui.row} key={item.id}>
      <FoodThumbnail dishId={item.dishId || item.id} symbol={item.symbol} size={48} />
      <View style={ui.flex}><AppText variant="small" style={ui.bold}>{item.quantity} × {item.name}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{item.option || item.subtitle || 'Regular'}</AppText></View>
    </View>)}<View style={ui.line} /><BillRow label="Order total" value={formatPrice(order.total)} bold /></View>
    {order.notes ? <View style={[ui.card, ui.row]}><Icon name="note" size={15} /><AppText variant="small" style={ui.flex}>{order.notes}</AppText></View> : null}
  </>;
}
export function OrderStageBadge({ order }) {
  const stage = partnerStage(order);
  return <AppText variant="small" style={ui.bold} color={stage === 'ready' || stage === 'delivered' ? COLORS.success : stage === 'rejected' ? COLORS.danger : COLORS.primary}>{order.cancelledByCustomer ? 'Cancelled' : PARTNER_STAGE_LABELS[stage]}{order.isDemo ? ' · Sample' : ''}</AppText>;
}
const styles = StyleSheet.create({
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
  progress: { flexDirection: 'row', paddingVertical: 10 }, line: { position: 'absolute', height: 3, backgroundColor: COLORS.border, left: 30, right: 30, top: 20 },
  step: { flex: 1, alignItems: 'center', gap: 7 }, dot: { width: 23, height: 23, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: COLORS.primary }, label: { textAlign: 'center' }, bold: { fontWeight: '700' },
});
