import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenFrame from '../../components/ScreenFrame';
import AppButton from '../../components/AppButton';
import AppText from '../../components/AppText';
import { BillRow, Notice, ui } from '../../components/customer/ui';
import { selectBill, selectCartLines } from '../../redux/cartSlice';
import { selectDeliveryAddress } from '../../redux/addressesSlice';
import { selectRestaurantOnline } from '../../redux/partnerSlice';
import { checkout } from '../../redux/orderThunks';
import { restaurant, formatPrice } from '../../data/catalog';
import { routes } from '../../navigation/routes';
import { plural } from '../../utils/format';
import { COLORS } from '../../theme/colors';

// Checkout has one delivery fee, one payment method, and no optional charges.
// Validation (address, availability, current prices, restaurant open) lives in the checkout thunk.
export default function CheckoutScreen({ navigation }) {
  const dispatch = useDispatch();
  const lines = useSelector(selectCartLines);
  const address = useSelector(selectDeliveryAddress);
  const online = useSelector(selectRestaurantOnline);
  const { subtotal, deliveryFee, platformFee, cartTotal } = useSelector(selectBill);
  const [error, setError] = useState('');
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  function handlePlaceOrder() {
    const result = dispatch(checkout());
    if (!result.ok) { setError(result.error); return; }
    setError('');
    navigation.reset({ index: 1, routes: [{ name: routes.CART_ROOT }, { name: routes.ORDER_PLACED, params: { orderId: result.orderId } }] });
  }

  return (
    <ScreenFrame navigation={navigation} title="Checkout" error={error}
      footer={<AppButton title={`Place Order  |  ${formatPrice(cartTotal)}`} onPress={handlePlaceOrder} disabled={lines.length === 0 || !online} />}>
      {!online ? <Notice warning icon="clock" title={`${restaurant.name} is not accepting orders right now`}>Please try again when the restaurant is back online.</Notice> : null}
      <View style={ui.card}>
        <View style={ui.between}>
          <View style={ui.flex}>
            <AppText variant="caption" color={COLORS.textSecondary}>DELIVERING TO</AppText>
            <AppText style={ui.bold}>{address?.label || 'No address selected'}</AppText>
          </View>
          <Pressable onPress={() => { setError(''); navigation.navigate(routes.ADDRESSES); }} accessibilityRole="button" hitSlop={10}>
            <AppText color={COLORS.primary} style={ui.bold}>{address ? 'Change' : 'Add'}</AppText>
          </Pressable>
        </View>
        <View style={ui.line} />
        <AppText variant="small" color={address ? COLORS.text : COLORS.danger}>{address ? `${address.street}, ${address.city}` : 'Choose an address before ordering.'}</AppText>
      </View>
      <View style={ui.card}>
        <AppText variant="subheading">Delivery</AppText>
        <AppText>{restaurant.time} estimated</AppText>
        <AppText variant="small" color={COLORS.textSecondary}>Standard delivery from {restaurant.name}</AppText>
      </View>
      <View style={ui.card}>
        <AppText variant="subheading">Payment</AppText>
        <AppText>Cash on Delivery</AppText>
        <AppText variant="small" color={COLORS.textSecondary}>Pay when your food arrives.</AppText>
      </View>
      <View style={ui.card}>
        <AppText variant="subheading">Order summary · {plural(count, 'item')}</AppText>
        {lines.map(line => <BillRow key={line.id} label={`${line.quantity} × ${line.name}`} value={formatPrice(line.price * line.quantity)} />)}
        <View style={ui.line} />
        <BillRow label="Subtotal" value={formatPrice(subtotal)} />
        <BillRow label="Delivery fee" value={formatPrice(deliveryFee)} />
        <BillRow label="Platform fee" value={formatPrice(platformFee)} />
        <View style={ui.line} />
        <BillRow label="Total" value={formatPrice(cartTotal)} bold />
      </View>
    </ScreenFrame>
  );
}
