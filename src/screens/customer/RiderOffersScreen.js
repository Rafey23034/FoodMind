import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { Chip, EmptyState, Notice, ui } from '../../components/customer/ui';
import { customerKey, saveDelivery, selectCustomer } from '../../redux/customerSlice';
import { riderOffers, sortRiderOffers } from '../../data/riderOffers';
import { formatPrice } from '../../data/catalog';
import { routes } from '../../navigation/routes';
import { COLORS } from '../../theme/colors';

export default function RiderOffersScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { deliveries } = useSelector(selectCustomer);
  const delivery = deliveries.find(item => item.id === route.params?.deliveryId);
  const [sort, setSort] = useState('Lowest price');
  return <ScreenLayout navigation={navigation} title="Rider Offers" subtitle={delivery ? `3 demo offers for ${delivery.shop}` : ''}>
    {!delivery ? <EmptyState title="Request not found">Create a community delivery request to see rider offers.</EmptyState> : <>
      <View style={ui.card}><AppText variant="caption" color={COLORS.primary}>YOUR DELIVERY REQUEST</AppText><AppText style={ui.bold}>{delivery.shop} · {delivery.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}</AppText><AppText variant="small" color={COLORS.textSecondary}>To {delivery.address}</AppText></View>
      <AppText variant="subheading">Available nearby riders</AppText>
      <View style={ui.wrap}>{['Lowest price', 'Fastest', 'Top rated'].map(label => <Chip key={label} label={label} selected={sort === label} onPress={() => setSort(label)} />)}</View>
      {sortRiderOffers(riderOffers, sort).map(rider => <View key={rider.id} style={[ui.card, delivery.rider?.id === rider.id && styles.chosen]}>
        <View style={ui.row}>
          <View style={[styles.avatar, { backgroundColor: rider.color }]}><AppText style={ui.bold}>{rider.initials}</AppText></View>
          <View style={ui.flex}><AppText style={ui.bold}>{rider.name}</AppText><AppText variant="small" color={COLORS.warning}>★ {rider.rating}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{rider.eta} · Demo rider</AppText></View>
          <AppText color={COLORS.primary} style={ui.bold}>{formatPrice(rider.fee)}</AppText>
        </View>
        <View style={ui.between}><AppText variant="caption" color={COLORS.primary}>{rider.badge}</AppText>
          {delivery.rider && delivery.rider.id !== rider.id ? null : <AppButton title={delivery.rider ? 'View Delivery' : 'Select rider'} onPress={() => {
            if (!delivery.rider) dispatch(saveDelivery({ userKey: customerKey(user), delivery: { ...delivery, rider, status: 'Rider accepted' } }));
            navigation.replace(routes.DELIVERY_PROGRESS, { deliveryId: delivery.id });
          }} />}
        </View>
      </View>)}
      <Notice icon="info" title="Your delivery, your choice">These offers demonstrate price, delivery-time, and rating comparisons. No real booking or payment is made.</Notice>
    </>}
  </ScreenLayout>;
}
const styles = StyleSheet.create({ avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, chosen: { borderColor: COLORS.primary, borderWidth: 2 } });
