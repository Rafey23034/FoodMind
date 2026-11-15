import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMotorcycle, faLocationDot, faChevronRight, faClock, faWallet, faStar, faFileLines, faHeadset } from '@fortawesome/free-solid-svg-icons';
import RiderLayout from '../../components/rider/RiderLayout';
import useRider from '../../components/rider/useRider';
import { useRiderLive } from '../../components/rider/useRiderRealtime';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Chip, EmptyState, Notice, Stars, ui } from '../../components/customer/ui';
import { acceptRiderRequest, declineRiderRequest, rateRiderDelivery } from '../../redux/riderSlice';
import { respondToRiderOffer, setRiderAvailability } from '../../redux/apiThunks';
import { riderRequestById, riderRequests } from '../../data/riderRequests';
import { formatPrice } from '../../data/catalog';
import { signOut } from '../../redux/session';
import { routes } from '../../navigation/routes';
import { openRiderJob, openRiderTab } from '../../navigation/riderNavigation';
import { confirmLogout } from '../../utils/confirm';
import { COLORS } from '../../theme/colors';

const routeToRequest = route => riderRequestById(route?.params?.requestId);

export function RiderJobsScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const apiSession = useSelector(state => Boolean(state.auth.user?.accessToken || state.auth.user?.refreshToken));
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  // Offers and order changes arrive over the WebSocket opened in RiderStack (useRiderRealtime).
  const live = useRiderLive();
  const active = rider.activeDelivery;
  const offer = rider.apiOffer;
  // Signed in through the API: FoodMind offers the closest order, so there is no list to browse.
  // Local demo: sample requests act as offers with a fixed fee.
  let visible = apiSession ? [] : riderRequests.filter(request => !rider.declinedRequests?.includes(request.id) && request.id !== active?.requestId);
  if (filter === 'Under 3 km') visible = visible.filter(item => item.distanceKm < 3);
  if (filter === 'Highest fee') visible = [...visible].sort((a, b) => b.deliveryFee - a.deliveryFee);
  function respond(action) {
    setError('');
    dispatch(respondToRiderOffer(offer.id, action)).then(result => {
      if (!result.ok) setError(result.error);
      else if (result.delivery) openRiderJob(navigation, routes.RIDER_ACTIVE_DELIVERY, { deliveryId: result.delivery.id });
    });
  }
  return <RiderLayout navigation={navigation} hasTabs onBack={false} title="Delivery Jobs" subtitle="Accept or decline delivery offers" error={error}>
    <View style={[ui.card, ui.between]}><View style={ui.flex}><AppText style={ui.bold}>{rider.online ? 'You are online' : 'You are offline'}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{rider.online ? 'Delivery offers appear below' : 'Go online to receive delivery offers'}</AppText>
      {apiSession ? <AppText variant="caption" color={live ? COLORS.success : COLORS.warning}>{live ? '● Live updates on' : '● Reconnecting… checking every 10 seconds'}</AppText> : null}</View>
      <Switch value={rider.online} onValueChange={online => dispatch(setRiderAvailability(online))} trackColor={{ true: COLORS.success }} accessibilityLabel="Available for delivery requests" />
    </View>
    {offer ? <View style={[ui.card, styles.activeCard]}>
      <View style={ui.between}><AppText variant="caption" color={COLORS.warning}>NEW DELIVERY OFFER</AppText><AppText variant="caption" color={COLORS.textSecondary}>{offer.distanceKm} km away</AppText></View>
      <AppText style={ui.bold}>{offer.restaurantName}</AppText>
      <AppText variant="small" color={COLORS.textSecondary}>{offer.restaurantAddress || 'Pickup at the restaurant'}</AppText>
      {offer.deliveryFee != null ? <AppText style={styles.price}>Delivery fee · {formatPrice(Number(offer.deliveryFee))}</AppText> : null}
      <View style={ui.row}><AppButton title="Accept" style={ui.flex} onPress={() => respond('accept')} /><AppButton title="Decline" variant="outline" style={ui.flex} onPress={() => respond('decline')} /></View>
    </View> : null}
    {active ? <Pressable accessibilityRole="button" onPress={() => openRiderJob(navigation, routes.RIDER_ACTIVE_DELIVERY, { deliveryId: active.id })} style={[ui.card, styles.activeCard]}>
      <View style={ui.between}><AppText variant="caption" color={COLORS.success}>ACTIVE DELIVERY · {active.status.replace('-', ' ').toUpperCase()}</AppText><AppText color={COLORS.primary}>›</AppText></View>
      <AppText style={ui.bold}>{active.restaurant} → {active.customer}</AppText><AppText variant="small" color={COLORS.textSecondary}>{formatPrice(active.earnings)} · Resume route</AppText>
    </Pressable> : null}
    {!rider.online ? <EmptyState icon="rider" title="You are offline">Switch on availability above to receive delivery offers.</EmptyState>
      : apiSession ? (offer || active ? null : <EmptyState icon="rider" title="Waiting for an offer">FoodMind sends you the closest order the moment it is ready.</EmptyState>)
      : <>
        <AppText variant="subheading">Delivery offers near you</AppText>
        <View style={ui.wrap}>{['All', 'Under 3 km', 'Highest fee'].map(label => <Chip key={label} label={label} selected={filter === label} onPress={() => setFilter(label)} />)}</View>
        {visible.map(request => <Pressable key={request.id} accessibilityRole="button" accessibilityLabel={`View ${request.restaurant} delivery offer`} style={ui.card} onPress={() => openRiderJob(navigation, routes.RIDER_REQUEST_DETAILS, { requestId: request.id })}>
          <View style={ui.between}><View style={styles.restaurantMark}><FontAwesomeIcon icon={faMotorcycle} size={17} color={COLORS.primary} /></View><View style={ui.flex}><AppText style={ui.bold}>{request.restaurant}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Order #{request.orderId}</AppText></View><AppText variant="caption" color={COLORS.primary}>{request.createdLabel}</AppText></View>
          <View style={ui.row}><FontAwesomeIcon icon={faLocationDot} size={14} color={COLORS.primary} /><AppText variant="small" style={ui.flex}>{request.pickupAddress}</AppText></View>
          <View style={ui.between}><AppText variant="caption" color={COLORS.textSecondary}>{request.distanceKm} km · {request.etaMinutes} min ride</AppText><AppText style={styles.price}>{formatPrice(request.deliveryFee)}</AppText></View>
          <View style={styles.offerCta}><AppText variant="small" color={COLORS.primary} style={ui.bold}>View offer</AppText><FontAwesomeIcon icon={faChevronRight} size={13} color={COLORS.primary} /></View>
        </Pressable>)}
        {!visible.length ? <EmptyState icon="rider" title="No offers right now">New delivery offers will appear here.</EmptyState> : null}
        <Notice icon="info" title="Example delivery offers">These are local samples while you are not signed in to the FoodMind API.</Notice>
      </>}
  </RiderLayout>;
}

export function RiderRequestDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const request = routeToRequest(route);
  const [error, setError] = useState('');
  function accept() {
    if (rider.activeDelivery) { setError('Finish your active delivery before accepting another.'); return; }
    const deliveryId = `DEL-${Date.now()}`;
    dispatch(acceptRiderRequest({ userKey: rider.userKey, requestId: request.id, deliveryId, at: new Date().toISOString() }));
    navigation.replace(routes.RIDER_ACTIVE_DELIVERY, { deliveryId });
  }
  function decline() {
    dispatch(declineRiderRequest({ userKey: rider.userKey, requestId: request.id }));
    navigation.goBack();
  }
  return <RiderLayout navigation={navigation} title="Delivery Offer" subtitle={request ? `Order #${request.orderId}` : 'Offer details'} error={error}
    footer={request ? <><AppButton title={`Accept Delivery · ${formatPrice(request.deliveryFee)}`} onPress={accept} /><AppButton title="Decline" variant="outline" onPress={decline} /></> : null}>
    {!request ? <EmptyState title="Offer not found">Open a delivery offer from Jobs.</EmptyState> : <>
      <RequestRestaurant request={request} />
      <View style={ui.card}><AppText variant="subheading">Delivery route</AppText><InfoLine icon={faLocationDot} label="Pick up" value={request.restaurant} detail={request.pickupAddress} /><InfoLine icon={faLocationDot} label="Drop off" value={request.customer} detail={request.customerAddress} /><InfoLine icon={faClock} label="Route estimate" value={`${request.distanceKm} km · ${request.etaMinutes}–${request.etaMinutes + 6} min`} /></View>
      <View style={ui.card}><AppText variant="subheading">Order items</AppText>{request.items.map(item => <View key={item.name} style={ui.between}><AppText variant="small">{item.quantity} × {item.name}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Ready in about {request.prepMinutes} min</AppText></View>)}<View style={ui.line} /><AppText variant="caption" color={COLORS.success}>{request.customerNote}</AppText></View>
      <View style={ui.card}><AppText variant="caption" color={COLORS.textSecondary}>DELIVERY FEE</AppText><AppText variant="title" color={COLORS.primary}>{formatPrice(request.deliveryFee)}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Set by FoodMind for this distance. You earn this amount when you complete the delivery.</AppText></View>
    </>}
  </RiderLayout>;
}

export function RiderEarningsScreen({ navigation }) {
  const rider = useRider();
  const [period, setPeriod] = useState('This Week');
  const ageDays = item => (Date.now() - new Date(item.completedAt).getTime()) / 86400000;
  const sumEarnings = list => list.reduce((sum, item) => sum + item.earnings, 0);
  const real = rider.deliveries.filter(item => !item.isDemo);
  const actualWeek = sumEarnings(real.filter(item => ageDays(item) < 7));
  const lastWeek = sumEarnings(real.filter(item => ageDays(item) >= 7 && ageDays(item) < 14));
  // Example figures belong to the demo account's current week only; last week shows real deliveries.
  const shownTotal = period === 'This Week' ? (rider.exampleMetrics?.weekTotal || 0) + actualWeek : lastWeek;
  const today = rider.deliveries.filter(item => !item.isDemo && new Date(item.completedAt).toDateString() === new Date().toDateString()).reduce((sum, item) => sum + item.earnings, 0);
  const samples = [12, 28, 20, 36, 43, 55, 69];
  return <RiderLayout navigation={navigation} title="My Earnings" subtitle="Your recent earnings overview" hasTabs onBack={false}>
    <View style={styles.earningsCard}><AppText variant="caption" color={COLORS.textSecondary}>{period === 'Last Week' ? 'EARNED LAST WEEK' : rider.exampleMetrics ? 'EXAMPLE EARNINGS THIS WEEK' : 'EARNED THIS WEEK'}</AppText><AppText variant="title">{formatPrice(shownTotal)}</AppText><AppText variant="caption" color={COLORS.success}>Available balance · {formatPrice((rider.exampleMetrics?.availableBalance || 0) + actualWeek)}</AppText></View>
    <View style={ui.wrap}>{['This Week', 'Last Week'].map(label => <Chip key={label} label={label} selected={period === label} onPress={() => setPeriod(label)} />)}</View>
    <View style={ui.card}><AppText variant="subheading">Earnings overview</AppText><View style={styles.chart}>{samples.map((height, index) => <View key={index} style={styles.chartColumn}><View style={[styles.bar, index === 4 && styles.barActive, { height: rider.exampleMetrics ? height : 4 }]} /><AppText variant="caption" color={COLORS.textSecondary}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}</AppText></View>)}</View><AppText variant="caption" color={COLORS.textSecondary}>Today · {formatPrice(today)}</AppText></View>
    <View style={ui.between}><AppText variant="subheading">Recent payouts</AppText><AppText variant="small" color={COLORS.primary}>{rider.exampleMetrics ? `${rider.exampleMetrics.jobCount + rider.deliveries.filter(item => !item.isDemo).length} demo jobs` : `${rider.deliveries.length} jobs`}</AppText></View>
    {rider.deliveries.slice(0, 3).map(item => <View key={item.id} style={[ui.card, ui.between]}><View style={ui.flex}><AppText style={ui.bold}>{item.restaurant}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Order #{item.requestId} · {new Date(item.completedAt).toLocaleDateString()}</AppText></View><AppText style={styles.price}>+ {formatPrice(item.earnings)}</AppText></View>)}
    {rider.exampleMetrics ? <Notice title="Example week in the rider demo account">Completed demo jobs and the dashboard total are labelled as sample earnings.</Notice> : rider.deliveries.length ? null : <EmptyState title="No earnings yet">Complete a delivery to add its payout to this overview.</EmptyState>}
    <AppButton title="Delivery History" variant="outline" onPress={() => navigation.navigate(routes.RIDER_HISTORY)} />
  </RiderLayout>;
}

export function RiderHistoryScreen({ navigation }) {
  const rider = useRider();
  return <RiderLayout navigation={navigation} title="Delivery History" subtitle={`${rider.deliveries.length} completed deliveries`} hasTabs>
    {rider.deliveries.length ? rider.deliveries.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => navigation.navigate(routes.RIDER_RATE, { deliveryId: item.id })} style={ui.card}>
      <View style={ui.between}><View style={ui.flex}><AppText style={ui.bold}>{item.restaurant} · {item.status}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{item.customerAddress || 'Customer delivery'} · {new Date(item.completedAt).toLocaleDateString()}</AppText></View><AppText style={styles.price}>+ {formatPrice(item.earnings)}</AppText></View>
      <View style={ui.between}><AppText variant="caption" color={COLORS.textSecondary}>Order #{item.requestId}</AppText><AppText variant="caption" color={COLORS.warning}>{item.rating ? `★ ${item.rating}` : item.isDemo ? 'Example delivery' : 'Rate delivery'} ›</AppText></View>
    </Pressable>) : <EmptyState title="No delivery history">Completed jobs will appear here with their delivery amount and rating.</EmptyState>}
  </RiderLayout>;
}

export function RiderRateScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const item = rider.deliveries.find(delivery => delivery.id === route.params?.deliveryId);
  const [rating, setRating] = useState(item?.rating || 5);
  const [comment, setComment] = useState('');
  function submit() {
    if (item && !item.isDemo) dispatch(rateRiderDelivery({ userKey: rider.userKey, deliveryId: item.id, rating, comment }));
    navigation.goBack();
  }
  return <RiderLayout navigation={navigation} title="Rate This Delivery" subtitle={item ? `Order #${item.requestId}` : ''} footer={<><AppButton title="Submit Review" onPress={submit} /><AppButton title="Skip for Now" variant="text" onPress={() => navigation.goBack()} /></>}>
    {!item ? <EmptyState title="Delivery not found">Choose a completed delivery from your history.</EmptyState> : <>
      <View style={styles.decisionHero}><View style={styles.starIcon}><FontAwesomeIcon icon={faStar} size={26} color={COLORS.warning} /></View><AppText variant="title" style={ui.center}>How was the delivery?</AppText><AppText variant="small" color={COLORS.textSecondary} style={ui.center}>{item.customer} · {item.restaurant}</AppText></View>
      <View style={ui.card}><AppText style={ui.center} variant="subheading">Customer pickup experience</AppText><View style={styles.stars}><Stars value={rating} onChange={setRating} label="Customer rating" /></View><AppText style={ui.center} variant="small" color={COLORS.success}>{rating} star{rating === 1 ? '' : 's'}</AppText></View>
      <AppInput label="OPTIONAL COMMENTS" placeholder="Anything else to share?" value={comment} onValueChange={setComment} multiline />
      {item.isDemo ? <Notice title="Example delivery">Ratings for sample deliveries are not saved.</Notice> : null}
    </>}
  </RiderLayout>;
}

export function RiderProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const rated = rider.deliveries.filter(item => item.rating);
  const average = rated.length ? (rated.reduce((sum, item) => sum + item.rating, 0) / rated.length).toFixed(1) : rider.exampleMetrics ? '4.9' : '—';
  const row = (icon, title, detail, onPress) => <Pressable key={title} accessibilityRole="button" onPress={onPress} style={[ui.card, ui.row]}>
    <View style={styles.profileIcon}><FontAwesomeIcon icon={icon} size={17} color={COLORS.primary} /></View><View style={ui.flex}><AppText variant="small" style={ui.bold}>{title}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{detail}</AppText></View><FontAwesomeIcon icon={faChevronRight} size={13} color={COLORS.textSecondary} />
  </Pressable>;
  return <RiderLayout navigation={navigation} title="Rider Profile" subtitle="Manage your rider account" hasTabs onBack={false}>
    <View style={styles.profileHero}>{rider.documents.profilePhoto?.uri ? <Image source={{ uri: rider.documents.profilePhoto.uri }} style={styles.avatar} /> : <View style={styles.avatar}><AppText variant="title" color={COLORS.primary}>{(rider.profile.fullName || 'R').split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()}</AppText></View>}<AppText variant="subheading">{rider.profile.fullName || 'FoodMind Rider'}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{rider.profile.email}</AppText><View style={styles.verified}><AppText variant="caption" color={COLORS.success}>●  {rider.application.status}</AppText></View></View>
    <View style={ui.card}><View style={ui.between}><AppText variant="caption" color={COLORS.textSecondary}>RIDER RATING</AppText><AppText color={COLORS.warning}>★ {average}  ·  {rated.length} ratings</AppText></View><AppText variant="caption" color={COLORS.textSecondary}>{rider.profile.vehicle || 'Delivery vehicle'} · {rider.profile.vehicleRegistration || 'Registration not added'}</AppText></View>
    {row(faFileLines, 'Personal Information', rider.profile.phone || rider.profile.city || 'Name, phone and city', () => navigation.navigate(routes.RIDER_EDIT_PROFILE))}
    {row(faMotorcycle, 'Documents & Vehicle', 'CNIC, licence and vehicle details', () => navigation.navigate(routes.RIDER_DOCUMENTS_VEHICLE))}
    {row(faWallet, 'Payout Settings', 'Local cash earning preview', () => openRiderTab(navigation, routes.RIDER_EARNINGS))}
    {row(faHeadset, 'Help & Support', 'Rider help and safety', () => navigation.navigate(routes.RIDER_SUPPORT))}
    <AppButton title="Log Out" icon="logout" variant="outline" onPress={() => confirmLogout(() => dispatch(signOut()))} />
    {rider.application.demoApproval ? <Notice title="Rider demo account">Example requests and sample earnings are labelled in the rider screens.</Notice> : null}
  </RiderLayout>;
}

function RequestRestaurant({ request }) {
  return <View style={[ui.card, ui.row]}><View style={styles.restaurantMark}><FontAwesomeIcon icon={faMotorcycle} size={17} color={COLORS.primary} /></View><View style={ui.flex}><AppText style={ui.bold}>{request.restaurant}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Order #{request.orderId} · {request.createdLabel}</AppText></View><AppText variant="caption" color={COLORS.success}>Pickup ready</AppText></View>;
}
function InfoLine({ icon, label, value, detail }) {
  return <View style={ui.row}><View style={styles.infoIcon}><FontAwesomeIcon icon={icon} size={14} color={COLORS.primary} /></View><View style={ui.flex}><AppText variant="caption" color={COLORS.textSecondary}>{label}</AppText><AppText variant="small" style={ui.bold}>{value}</AppText>{detail ? <AppText variant="caption" color={COLORS.textSecondary}>{detail}</AppText> : null}</View></View>;
}
const styles = StyleSheet.create({
  restaurantMark: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
  price: { color: COLORS.primary, fontWeight: '700' }, offerCta: { paddingTop: 11, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeCard: { borderColor: COLORS.successBorder, borderWidth: 1.5 }, infoIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
  decisionHero: { alignItems: 'center', gap: 13, paddingVertical: 14 },
  earningsCard: { backgroundColor: COLORS.white, padding: 18, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, gap: 7 }, chart: { height: 124, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }, chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 7 }, bar: { width: '100%', borderRadius: 7, backgroundColor: COLORS.primaryBorder }, barActive: { backgroundColor: COLORS.primary },
  profileHero: { alignItems: 'center', gap: 8, padding: 14 }, avatar: { width: 77, height: 77, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight }, verified: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.successLight }, profileIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.primaryLight }, stars: { alignItems: 'center', alignSelf: 'center' }, starIcon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 34, backgroundColor: COLORS.warningLight },
});
