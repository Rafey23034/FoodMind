import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot, faCheck, faBox, faMotorcycle } from '@fortawesome/free-solid-svg-icons';
import RiderLayout from '../../components/rider/RiderLayout';
import useRider from '../../components/rider/useRider';
import DeliveryMap from '../../components/customer/DeliveryMap';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { EmptyState, Notice, ui } from '../../components/customer/ui';
import { advanceRiderDelivery, saveRiderProof } from '../../redux/riderSlice';
import { chooseRiderProof } from '../../utils/riderMedia';
import { riderRequestById } from '../../data/riderRequests';
import { formatPrice } from '../../data/catalog';
import { routes } from '../../navigation/routes';
import Icon from '../../components/Icon';
import { COLORS } from '../../theme/colors';
import { openRiderTab } from '../../navigation/riderNavigation';

const DEMO_PICKUP_CODE = '8421';

// Where each delivery status continues, so resuming always opens the right step.
const STEP = { 'to-pickup': { number: 1, route: routes.RIDER_TO_PICKUP, action: 'Navigate to Restaurant' },
  'to-customer': { number: 2, route: routes.RIDER_TO_CUSTOMER, action: 'Continue to Customer' },
  arrived: { number: 3, route: routes.RIDER_PROOF, action: 'Complete Delivery' } };
function activeFor(rider, route) {
  if (route?.params?.deliveryId && rider.activeDelivery?.id === route.params.deliveryId) return rider.activeDelivery;
  return rider.activeDelivery || null;
}

export function RiderActiveDeliveryScreen({ navigation, route }) {
  const rider = useRider();
  const active = activeFor(rider, route);
  const step = STEP[active?.status] || STEP['to-pickup'];
  return <RiderLayout navigation={navigation} title="Active Delivery" subtitle={active ? `Order #${active.orderId}` : 'Delivery details'} hasTabs>
    {!active ? <EmptyState title="No active delivery">Place a bid on a nearby request to explore the demo delivery route.</EmptyState> : <>
      <View style={ui.between}><AppText variant="caption" color={COLORS.primary}>●  IN PROGRESS</AppText><AppText variant="caption" color={COLORS.textSecondary}>Stage {step.number} of 3</AppText></View>
      <View style={ui.card}><AppText variant="caption" color={COLORS.textSecondary}>YOUR NEXT STOP</AppText><AppText variant="subheading">{step.number === 1 ? active.restaurant : active.customer}</AppText><AppText variant="small" color={COLORS.textSecondary}>{step.number === 1 ? active.pickupAddress : active.customerAddress}</AppText><View style={ui.row}><FontAwesomeIcon icon={faLocationDot} color={COLORS.primary} size={15} /><AppText variant="small">{active.distanceKm} km · about {active.etaMinutes} min away</AppText></View></View>
      <View style={ui.card}><AppText style={ui.bold}>{active.customer} · {active.customerAddress}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{active.items.map(item => `${item.quantity} × ${item.name}`).join(', ')}</AppText><AppText variant="caption" color={COLORS.success}>Delivery fee · {formatPrice(active.earnings)}</AppText></View>
      <View style={ui.between}><AppButton title={step.action} style={ui.flex} onPress={() => navigation.navigate(step.route, { deliveryId: active.id })} /><AppButton title="Contact" variant="outline" style={ui.flex} onPress={() => navigation.navigate(routes.RIDER_SUPPORT)} /></View>
      <Notice title="Active demo delivery">Directions, calls and dispatch notifications will be connected later.</Notice>
    </>}
  </RiderLayout>;
}

export function RiderToPickupScreen({ navigation, route }) {
  const rider = useRider();
  const active = activeFor(rider, route);
  return <RiderLayout navigation={navigation} title="Navigate to Pickup" subtitle={active ? `${active.restaurant} · ${active.pickupAddress}` : ''} hasTabs
    footer={active ? <><AppButton title="I'm Arrived at Restaurant" onPress={() => navigation.navigate(routes.RIDER_CONFIRM_PICKUP, { deliveryId: active.id })} /><AppButton title="Contact Restaurant" variant="outline" onPress={() => navigation.navigate(routes.RIDER_SUPPORT)} /></> : null}>
    {!active ? <EmptyState title="Delivery not found">Return to Jobs to resume your current delivery.</EmptyState> : <>
      <DeliveryMap community />
      <View style={ui.card}><AppText variant="caption" color={COLORS.textSecondary}>PICKUP LOCATION</AppText><AppText variant="subheading">{active.restaurant}</AppText><AppText variant="small" color={COLORS.textSecondary}>{active.pickupAddress}</AppText><View style={ui.row}><FontAwesomeIcon icon={faLocationDot} size={15} color={COLORS.primary} /><AppText variant="small">{active.distanceKm} km · 9 min drive</AppText></View></View>
    </>}
  </RiderLayout>;
}

export function RiderConfirmPickupScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const active = activeFor(rider, route);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [showDemoCode, setShowDemoCode] = useState(false);
  function confirm() {
    if (active.status !== 'to-pickup') { navigation.navigate(STEP[active.status]?.route || routes.RIDER_ACTIVE_DELIVERY, { deliveryId: active.id }); return; }
    if (code.trim() !== DEMO_PICKUP_CODE) { setError('The restaurant pickup code does not match.'); return; }
    dispatch(advanceRiderDelivery({ userKey: rider.userKey, to: 'to-customer' }));
    navigation.navigate(routes.RIDER_TO_CUSTOMER, { deliveryId: active.id });
  }
  return <RiderLayout navigation={navigation} title="Confirm Food Pickup" subtitle={active ? `Order #${active.orderId}` : ''} hasTabs error={error} footer={active ? <AppButton title="✓ Food Picked Up" onPress={confirm} /> : null}>
    {!active ? <EmptyState title="Delivery not found">Return to your active delivery.</EmptyState> : <>
      <View style={ui.card}><RequestRestaurant request={riderRequestById(active.requestId)} active={active} /><AppText variant="subheading">Check items before pickup</AppText>{active.items.map(item => <View key={item.name} style={ui.row}><FontAwesomeIcon icon={faCheck} color={COLORS.success} size={15} /><AppText variant="small">{item.quantity} × {item.name}</AppText></View>)}<Notice success title="Sealed food bag">Ask the restaurant to confirm the order is ready.</Notice></View>
      <View style={styles.pinCard}><AppText variant="caption" color={COLORS.textSecondary}>RESTAURANT PICKUP CODE</AppText><AppText variant="small" color={COLORS.textSecondary}>Ask the restaurant for the 4-digit code on the order.</AppText><AppInput label="ENTER PICKUP CODE" placeholder="4 digit code" value={code} onValueChange={value => { setCode(value.replace(/\D/g, '')); setError(''); }} keyboardType="number-pad" maxLength={4} />
        <AppButton title={showDemoCode ? `Demo code: ${DEMO_PICKUP_CODE}` : 'Show demo code'} variant="text" onPress={() => setShowDemoCode(true)} /></View>
    </>}
  </RiderLayout>;
}

export function RiderToCustomerScreen({ navigation, route }) {
  const rider = useRider();
  const active = activeFor(rider, route);
  return <RiderLayout navigation={navigation} title="Navigate to Customer" subtitle={active ? `${active.customer} · ${active.customerAddress}` : ''} hasTabs footer={active ? <><AppButton title="Update Delivery Progress" onPress={() => navigation.navigate(routes.RIDER_UPDATE_STATUS, { deliveryId: active.id })} /><AppButton title="Contact Customer" variant="outline" onPress={() => navigation.navigate(routes.RIDER_SUPPORT)} /></> : null}>
    {!active ? <EmptyState title="Delivery not found">Return to Jobs to resume your delivery.</EmptyState> : <><DeliveryMap community arrived />
      <View style={ui.card}><AppText variant="caption" color={COLORS.primary}>DROP-OFF LOCATION</AppText><AppText variant="subheading">{active.customer}</AppText><AppText variant="small" color={COLORS.textSecondary}>{active.customerAddress}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Arrive in about 13 minutes · Leave the order at the door if requested.</AppText></View>
    </>}
  </RiderLayout>;
}

export function RiderUpdateStatusScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const active = activeFor(rider, route);
  function markArrived() {
    if (active.status === 'to-customer') dispatch(advanceRiderDelivery({ userKey: rider.userKey, to: 'arrived' }));
    navigation.navigate(routes.RIDER_PROOF, { deliveryId: active.id });
  }
  return <RiderLayout navigation={navigation} title="Delivery in Progress" subtitle={active ? `Order #${active.orderId}` : ''} hasTabs>
    {!active ? <EmptyState title="Delivery not found">Return to your active delivery.</EmptyState> : <>
      <View style={[ui.card, ui.between]}><View style={ui.flex}><AppText style={ui.bold}>{active.customer}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{active.customerAddress}</AppText></View><View style={styles.statusChip}><AppText variant="caption" color={COLORS.success}>On the way</AppText></View></View>
      <View style={ui.card}><AppText variant="subheading">Delivery progress</AppText><TimelineStep title="Picked up from restaurant" time="Confirmed · Food bag collected" done /><TimelineStep title="On the way to customer" time="Live GPS will be connected later" done /><TimelineStep title="Delivered to customer" time="Waiting for arrival" /></View>
      <View style={ui.card}><AppText style={ui.bold}>Delivery instructions</AppText><AppText variant="small" color={COLORS.textSecondary}>Leave at the door and ring once. Customer details are shown for this demo order only.</AppText></View>
      <Notice title="Customer update preview">No live location or notification is sent.</Notice>
      <AppButton title="Call Customer" variant="outline" onPress={() => navigation.navigate(routes.RIDER_SUPPORT)} />
      <AppButton title="Mark Arrived at Customer" onPress={markArrived} />
    </>}
  </RiderLayout>;
}

export function RiderProofScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const active = activeFor(rider, route);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function chooseProof() {
    setBusy(true); setError('');
    try { const photo = await chooseRiderProof(); if (photo) dispatch(saveRiderProof({ userKey: rider.userKey, uri: photo.uri })); }
    catch (problem) { setError('Could not keep that photo. Please try again.'); }
    finally { setBusy(false); }
  }
  function complete() {
    if (!active) return;
    dispatch(advanceRiderDelivery({ userKey: rider.userKey, to: 'completed', at: new Date().toISOString() }));
    navigation.replace(routes.RIDER_COMPLETED, { deliveryId: active.id });
  }
  return <RiderLayout navigation={navigation} title="Complete Delivery" subtitle={active ? `Order #${active.orderId}` : ''} hasTabs={false} error={error} footer={active ? <><AppButton title="✓ Confirm Order Delivered" onPress={complete} /><AppText variant="caption" color={COLORS.textSecondary} style={ui.center}>You can deliver without adding a photo.</AppText></> : null}>
    {!active ? <EmptyState title="Delivery not found">Return to your active delivery.</EmptyState> : <>
      <View style={styles.completeIcon}><FontAwesomeIcon icon={faBox} size={28} color={COLORS.primary} /></View><AppText variant="title" style={ui.center}>Almost done!</AppText><AppText variant="small" color={COLORS.textSecondary} style={ui.center}>Confirm that the customer received the order.</AppText>
      <View style={ui.card}><AppText style={ui.bold}>Delivery method</AppText><View style={ui.between}><AppText variant="small">Handed to customer</AppText><Icon name="check" size={16} color={COLORS.success} /></View><AppText style={ui.bold}>Proof of delivery</AppText>
        {active.proofUri ? <Image source={{ uri: active.proofUri }} style={styles.proofPreview} /> : null}
        <AppButton title={busy ? 'Opening photos…' : 'Add delivery photo (optional)'} variant="outline" onPress={chooseProof} disabled={busy} />
      </View>
      <Notice title="Customer privacy">Photos stay on this device. They are not uploaded.</Notice>
    </>}
  </RiderLayout>;
}

export function RiderCompletedScreen({ navigation, route }) {
  const rider = useRider();
  const delivery = rider.deliveries.find(item => item.id === route.params?.deliveryId);
  return <RiderLayout navigation={navigation} title="Delivery Completed" subtitle={delivery ? `Order #${delivery.orderId}` : ''} footer={delivery ? <><AppButton title="Find Another Delivery" onPress={() => openRiderTab(navigation, routes.RIDER_JOBS)} /><AppButton title="View Earnings" variant="outline" onPress={() => openRiderTab(navigation, routes.RIDER_EARNINGS)} /></> : null}>
    {!delivery ? <EmptyState title="Delivery not found">Completed deliveries are saved in your history.</EmptyState> : <>
      <View style={styles.completeIcon}><FontAwesomeIcon icon={faCheck} size={28} color={COLORS.success} /></View><AppText variant="title" style={ui.center}>Delivery completed!</AppText><AppText variant="small" style={ui.center} color={COLORS.textSecondary}>Well done — another order delivered.</AppText>
      <View style={ui.card}><AppText variant="caption" color={COLORS.textSecondary}>YOUR EARNINGS</AppText><AppText variant="title" color={COLORS.success}>{formatPrice(delivery.earnings)}</AppText><View style={ui.between}><AppText variant="caption" color={COLORS.textSecondary}>Delivered from</AppText><AppText variant="caption" style={ui.bold}>{delivery.restaurant}</AppText></View><View style={ui.between}><AppText variant="caption" color={COLORS.textSecondary}>Time taken</AppText><AppText variant="caption" style={ui.bold}>{delivery.etaMinutes} min</AppText></View></View>
      <View style={[ui.card, ui.between]}><AppText variant="small" style={ui.bold}>Great job, {rider.profile.fullName?.split(' ')[0] || 'Rider'}!</AppText><AppText variant="caption" color={COLORS.textSecondary}>Rate customer</AppText></View>
      <AppButton title="Rate This Delivery" variant="outline" onPress={() => navigation.navigate(routes.RIDER_RATE, { deliveryId: delivery.id })} />
      {delivery.proofUri ? <Image source={{ uri: delivery.proofUri }} style={styles.proofPreview} /> : null}
    </>}
  </RiderLayout>;
}

export function RiderSupportScreen({ navigation }) {
  return <RiderLayout navigation={navigation} title="Rider Help & Support" footer={<AppButton title="Back to Delivery" onPress={() => navigation.goBack()} />}>
    <Notice title="Calls and live support are a preview">Contact actions will connect to a rider support service later.</Notice>
    {['How does bidding work?', 'What should I do at pickup?', 'How do I confirm delivery?', 'Where are my earnings saved?'].map((question, index) => <View key={question} style={ui.card}>
      <AppText variant="small" style={ui.bold}>{question}</AppText>
      <AppText variant="caption" color={COLORS.textSecondary}>{['Choose a delivery job and set the fee and arrival estimate you prefer.', 'Check the order and confirm the four-digit pickup code with the restaurant.', 'Mark your arrival and optionally add a local proof photo before completing delivery.', 'Earning entries from completed demo deliveries appear in the Earnings tab.'][index]}</AppText>
    </View>)}
  </RiderLayout>;
}

function RequestRestaurant({ request, active }) {
  const venue = request || active;
  return <View style={[ui.between, styles.restaurantRow]}><View style={styles.restaurantIcon}><FontAwesomeIcon icon={faMotorcycle} size={17} color={COLORS.primary} /></View><View style={ui.flex}><AppText style={ui.bold}>{venue?.restaurant || 'Restaurant'}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Order #{venue?.orderId}</AppText></View><AppText variant="caption" color={COLORS.success}>Pickup ready</AppText></View>;
}
function TimelineStep({ title, time, done = false }) {
  return <View style={ui.row}><View style={[styles.stepMark, done && styles.stepDone]}><AppText variant="caption" color={done ? COLORS.white : COLORS.textSecondary}>{done ? '✓' : '○'}</AppText></View><View style={ui.flex}><AppText variant="small" style={done ? ui.bold : undefined}>{title}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{time}</AppText></View></View>;
}
const styles = StyleSheet.create({
  restaurantRow: { backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 10, marginBottom: 10 }, restaurantIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
  pinCard: { alignItems: 'center', gap: 9, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, padding: 17 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: COLORS.successLight }, stepMark: { width: 25, height: 25, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }, stepDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  completeIcon: { alignSelf: 'center', width: 70, height: 70, borderRadius: 37, backgroundColor: COLORS.successLight, alignItems: 'center', justifyContent: 'center' }, proofPreview: { width: '100%', height: 160, borderRadius: 14, resizeMode: 'cover' },
});
