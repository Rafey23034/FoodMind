import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Notice, ui } from '../../components/customer/ui';
import { selectDeliveryAddress } from '../../redux/addressesSlice';
import { customerKey, saveDelivery, selectCustomer } from '../../redux/customerSlice';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

export default function CommunityDeliveryScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const savedAddress = useSelector(selectDeliveryAddress);
  const { deliveries } = useSelector(selectCustomer);
  const [shop, setShop] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ id: 'item-1', name: '', quantity: '1', price: '' }]);
  const [error, setError] = useState('');
  const destination = address ?? (savedAddress ? `${savedAddress.street}, ${savedAddress.city}` : '');
  function updateItem(id, field, value) {
    setItems(previous => previous.map(item => item.id === id ? { ...item, [field]: value } : item));
  }
  function send() {
    if (!shop.trim() || !location.trim() || !destination.trim()) { setError('Enter the shop name, pickup location, and delivery address.'); return; }
    if (!items.length || items.some(item => !item.name.trim() || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 99 || !item.price.trim() || !Number.isFinite(Number(item.price)) || Number(item.price) < 0)) {
      setError('Add an item name, a quantity from 1 to 99, and an estimated unit price for each item.'); return;
    }
    const delivery = { id: `CD${Date.now()}`, shop: shop.trim(), location: location.trim(), address: destination.trim(), notes: notes.trim(),
      items: items.map(item => ({ ...item, name: item.name.trim(), quantity: Number(item.quantity), price: Number(item.price) })),
      status: 'Requested', createdAt: new Date().toISOString() };
    dispatch(saveDelivery({ userKey: customerKey(user), delivery }));
    navigation.navigate(routes.RIDER_OFFERS, { deliveryId: delivery.id });
  }
  return <ScreenLayout navigation={navigation} title="Community Delivery" subtitle="Let a nearby rider pick up your food"
    error={error} footer={<AppButton title="Send Request to Nearby Riders →" onPress={send} />}>
    <Notice icon="info" title="Order from any shop — even if it's not listed!">Plan a pickup from your favourite local shop. This prototype shows example rider offers.</Notice>
    {deliveries.slice(0, 3).map(delivery => <Pressable key={delivery.id} style={ui.card} onPress={() => navigation.navigate(delivery.rider ? routes.DELIVERY_PROGRESS : routes.RIDER_OFFERS, { deliveryId: delivery.id })}>
      <View style={ui.between}><AppText style={ui.bold}>{delivery.shop}</AppText><AppText variant="small" color={COLORS.primary} style={ui.bold}>{delivery.status} ›</AppText></View>
      <AppText variant="small" color={COLORS.textSecondary}>Request #{delivery.id.slice(-6)} · Tap to resume</AppText>
    </Pressable>)}
    <AppInput label="SHOP / RESTAURANT NAME" value={shop} onValueChange={setShop} placeholder="e.g. Kashmiri Biryani" />
    <AppInput label="SHOP LOCATION" value={location} onValueChange={setLocation} placeholder="Street, area, and nearby landmark" />
    <AppText variant="small" style={ui.bold}>YOUR ITEMS</AppText>
    {items.map((item, index) => <View key={item.id} style={ui.card}>
      <View style={ui.between}><AppText style={ui.bold}>Item {index + 1}</AppText>{items.length > 1 ? <Pressable onPress={() => setItems(previous => previous.filter(value => value.id !== item.id))}><AppText color={COLORS.danger} variant="small">Remove</AppText></Pressable> : null}</View>
      <AppInput label="Item name" value={item.name} onValueChange={value => updateItem(item.id, 'name', value)} placeholder="e.g. Chicken Biryani" />
      <View style={ui.row}>
        <View style={ui.flex}><AppInput label="Quantity" keyboardType="number-pad" value={item.quantity} onValueChange={value => updateItem(item.id, 'quantity', value)} /></View>
        <View style={ui.flex}><AppInput label="Unit price (Rs.)" keyboardType="decimal-pad" value={item.price} onValueChange={value => updateItem(item.id, 'price', value)} placeholder="e.g. 550" /></View>
      </View>
    </View>)}
    <AppButton title="+ Add another item" variant="outline" onPress={() => setItems(previous => [...previous, { id: `item-${Date.now()}`, name: '', quantity: '1', price: '' }])} />
    <AppInput label="DELIVERY ADDRESS" value={destination} onValueChange={setAddress} placeholder="House, street, area, city" />
    <AppButton title="Choose a saved address" variant="text" onPress={() => { setAddress(null); navigation.navigate(routes.ADDRESSES); }} />
    <AppInput label="DELIVERY NOTES (OPTIONAL)" value={notes} onValueChange={setNotes} placeholder="e.g. enter through the main gate" multiline />
    <Notice icon="rider" title="Example offers">No request is sent to real riders in this frontend demo.</Notice>
  </ScreenLayout>;
}
