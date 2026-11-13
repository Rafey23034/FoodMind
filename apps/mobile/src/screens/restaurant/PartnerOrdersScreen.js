import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import { OrderStageBadge } from '../../components/partner/PartnerOrder';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import FoodThumbnail from '../../components/FoodThumbnail';
import { Chip, EmptyState, ui } from '../../components/customer/ui';
import { loadPartnerExamples, selectPartnerOrders } from '../../redux/partnerSlice';
import { orderNumber, partnerStage, orderDestination } from '../../data/partnerOrders';
import { formatPrice } from '../../data/catalog';
import { COLORS } from '../../theme/colors';

export default function PartnerOrdersScreen({ navigation, hasPartnerTabs }) {
  const dispatch = useDispatch();
  const { demoOrders, userKey } = usePartner();
  const orders = useSelector(selectPartnerOrders);
  const [filter, setFilter] = useState('All');
  const stages = { New: ['new'], Preparing: ['preparing'], Ready: ['ready'], Completed: ['picked-up', 'delivered', 'rejected'] };
  const visible = orders.filter(order => filter === 'All' || stages[filter].includes(partnerStage(order)));
  return <PartnerLayout navigation={navigation} title="Orders" onBack={hasPartnerTabs ? false : undefined} subtitle="Manage incoming and active orders" hasTabs={hasPartnerTabs}>
    <View style={ui.wrap}>{['All', 'New', 'Preparing', 'Ready', 'Completed'].map(value => <Chip key={value} label={value} selected={filter === value} onPress={() => setFilter(value)} />)}</View>
    {visible.length ? visible.map(order => <Pressable key={order.id} style={ui.card} accessibilityRole="button" onPress={() => navigation.navigate(orderDestination(order), { orderId: order.id })}>
      <View style={ui.between}><AppText style={ui.bold}>Order #{orderNumber(order)} ›</AppText><AppText style={ui.bold} color={COLORS.primary}>{formatPrice(order.total)}</AppText></View>
      <View style={ui.row}><FoodThumbnail dishId={order.items[0]?.dishId || order.items[0]?.id} symbol={order.items[0]?.symbol} size={52} />
        <View style={ui.flex}><AppText variant="small">{order.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{order.customerName || 'FoodMind diner'} · {order.isPaid ? 'Online Paid' : 'Cash on delivery'}</AppText></View>
      </View><OrderStageBadge order={order} />
    </Pressable>) : <EmptyState title="No orders in this queue">Customer checkout orders will appear here. You can also explore the workflow with labelled sample orders.</EmptyState>}
    <AppButton title={demoOrders.length ? 'Reset sample orders' : 'Load sample orders'} variant="outline" onPress={() => dispatch(loadPartnerExamples({ userKey, at: new Date().toISOString(), reset: Boolean(demoOrders.length) }))} />
    <AppText variant="caption" color={COLORS.textSecondary}>Sample orders are separate from customer orders. Resetting samples keeps customer orders intact.</AppText>
  </PartnerLayout>;
}
