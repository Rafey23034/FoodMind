import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faMotorcycle, faLocationDot, faChevronRight, faClock, faWallet, faStar, faFileLines, faHeadset } from '@fortawesome/free-solid-svg-icons';
import RiderLayout from '../../components/rider/RiderLayout';
import useRider from '../../components/rider/useRider';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppInput from '../../components/AppInput';
import { Chip, EmptyState, Notice, Stars, ui } from '../../components/customer/ui';
import { setRiderOnline, submitRiderBid, selectRiderDemoBid, acceptRiderBid, declineRiderBid, withdrawRiderBid, rateRiderDelivery } from '../../redux/riderSlice';
import { riderRequestById, riderRequests } from '../../data/riderRequests';
import { formatPrice } from '../../data/catalog';
import { logout } from '../../redux/authSlice';
import { routes } from '../../navigation/routes';
import { openRiderJob, openRiderTab } from '../../navigation/riderNavigation';
import { confirmLogout } from '../../utils/confirm';
import { COLORS } from '../../theme/colors';

const routeToRequest = route => riderRequestById(route?.params?.requestId);

export function RiderJobsScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const [filter, setFilter] = useState('All');
  let visible = riderRequests;
  if (filter === 'Under 3 km') visible = visible.filter(item => item.distanceKm < 3);
  if (filter === 'Highest fee') visible = [...visible].sort((a, b) => b.deliveryFee - a.deliveryFee);
  const active = rider.activeDelivery;
  return <RiderLayout navigation={navigation} hasTabs onBack={false} title="Nearby Requests" subtitle="Choose a delivery job to place a bid">
    <View style={[ui.card, ui.between]}><View style={ui.flex}><AppText style={ui.bold}>{rider.online ? 'You are online' : 'You are offline'}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{rider.online ? 'Nearby requests are shown below' : 'Go online to see and bid on requests'}</AppText></View>
      <Switch value={rider.online} onValueChange={online => dispatch(setRiderOnline({ userKey: rider.userKey, online }))} trackColor={{ true: COLORS.success }} accessibilityLabel="Available for delivery requests" />
    </View>
    {active ? <Pressable accessibilityRole="button" onPress={() => openRiderJob(navigation, routes.RIDER_ACTIVE_DELIVERY, { deliveryId: active.id })} style={[ui.card, styles.activeCard]}>
      <View style={ui.between}><AppText variant="caption" color={COLORS.success}>ACTIVE DELIVERY · {active.status.replace('-', ' ').toUpperCase()}</AppText><AppText color={COLORS.primary}>›</AppText></View>
      <AppText style={ui.bold}>{active.restaurant} → {active.customer}</AppText><AppText variant="small" color={COLORS.textSecondary}>{formatPrice(active.earnings)} · Resume route</AppText>
    </Pressable> : null}
    <AppText variant="subheading">Delivery requests near you</AppText>
    {rider.online ? <>
    <View style={ui.wrap}>{['All', 'Under 3 km', 'Highest fee'].map(label => <Chip key={label} label={label} selected={filter === label} onPress={() => setFilter(label)} />)}</View>
    {visible.map(request => {
      const bid = rider.bids.find(item => item.requestId === request.id && item.status !== 'Withdrawn');
      return <Pressable key={request.id} accessibilityRole="button" accessibilityLabel={`View ${request.restaurant} delivery request`} style={ui.card} onPress={() => openRiderJob(navigation, routes.RIDER_REQUEST_DETAILS, { requestId: request.id })}>
        <View style={ui.between}><View style={styles.restaurantMark}><FontAwesomeIcon icon={faMotorcycle} size={17} color={COLORS.primary} /></View><View style={ui.flex}><AppText style={ui.bold}>{request.restaurant}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Order #{request.orderId}</AppText></View><AppText variant="caption" color={bid?.status === 'Pending' ? COLORS.warning : COLORS.primary}>{bid?.status === 'Pending' ? 'Bid sent' : 'New request'}</AppText></View>
        <View style={ui.row}><FontAwesomeIcon icon={faLocationDot} size={14} color={COLORS.primary} /><AppText variant="small" style={ui.flex}>{request.pickupAddress}</AppText></View>
        <View style={ui.between}><AppText variant="caption" color={COLORS.textSecondary}>{request.distanceKm} km · {request.etaMinutes} min ride</AppText><AppText style={styles.price}>{formatPrice(request.deliveryFee)}</AppText></View>
        <View style={styles.bidCta}><AppText variant="small" color={COLORS.primary} style={ui.bold}>{bid?.status === 'Pending' ? 'Edit / review bid' : 'View Details & Place Bid'}</AppText><FontAwesomeIcon icon={faChevronRight} size={13} color={COLORS.primary} /></View>
      </Pressable>;
    })}
    </> : <EmptyState icon="rider" title="You are offline">Switch on availability above to see nearby delivery requests.</EmptyState>}
    <Notice icon="info" title="Example delivery requests">Restaurant details and sample offers are local previews while rider dispatch is under development.</Notice>
  </RiderLayout>;
}

export function RiderRequestDetailsScreen({ navigation, route }) {
  const request = routeToRequest(route);
  return <RiderLayout navigation={navigation} title="Delivery Request" subtitle={request ? `Order #${request.orderId}` : 'Request details'}
    footer={request ? <AppButton title="Set My Delivery Bid →" onPress={() => navigation.navigate(routes.RIDER_SUBMIT_BID, { requestId: request.id })} /> : null}>
    {!request ? <EmptyState title="Request not found">Open a delivery request from Nearby Jobs.</EmptyState> : <>
      <RequestRestaurant request={request} />
      <View style={ui.card}><AppText variant="subheading">Delivery route</AppText><InfoLine icon={faLocationDot} label="Pick up" value={request.restaurant} detail={request.pickupAddress} /><InfoLine icon={faLocationDot} label="Drop off" value={request.customer} detail={request.customerAddress} /><InfoLine icon={faClock} label="Route estimate" value={`${request.distanceKm} km · ${request.etaMinutes}–${request.etaMinutes + 6} min`} /></View>
      <View style={ui.card}><AppText variant="subheading">Order items</AppText>{request.items.map(item => <View key={item.name} style={ui.between}><AppText variant="small">{item.quantity} × {item.name}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Ready in about {request.prepMinutes} min</AppText></View>)}<View style={ui.line} /><AppText variant="caption" color={COLORS.success}>{request.customerNote}</AppText></View>
      <View style={ui.card}><AppText variant="caption" color={COLORS.textSecondary}>SUGGESTED DELIVERY FEE</AppText><AppText variant="title" color={COLORS.primary}>{formatPrice(request.deliveryFee)}</AppText><AppText variant="caption" color={COLORS.textSecondary}>Submit your own fee and arrival estimate.</AppText></View>
    </>}
  </RiderLayout>;
}

export function RiderSubmitBidScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const request = routeToRequest(route);
  const [amount, setAmount] = useState(request ? String(request.deliveryFee) : '');
  const [eta, setEta] = useState(20);
  const [error, setError] = useState('');
  function submit() {
    if (rider.activeDelivery) { setError('Finish your active delivery before placing another bid.'); return; }
    if (!request || !Number.isFinite(Number(amount)) || Number(amount) < 50) { setError('Enter a delivery bid of at least Rs. 50.'); return; }
    const id = `BID-${Date.now()}`;
    dispatch(submitRiderBid({ userKey: rider.userKey, id, requestId: request.id, amount, etaMinutes: eta, at: new Date().toISOString() }));
    navigation.replace(routes.RIDER_BID_SUBMITTED, { requestId: request.id, bidId: id });
  }
  return <RiderLayout navigation={navigation} title="Submit Delivery Bid" subtitle={request?.restaurant || 'Rider offer'} error={error} footer={<><AppButton title={`Submit Bid · ${formatPrice(Number(amount) || 0)}`} onPress={submit} /><AppButton title="Back to Requests" variant="text" onPress={() => navigation.goBack()} /></>}>
    {!request ? <EmptyState title="Request not found">Choose a delivery request before setting your bid.</EmptyState> : <>
      <RequestRestaurant request={request} />
      <View style={[ui.card, ui.between]}><View><AppText variant="small" style={ui.bold}>Your delivery fee</AppText><AppText variant="caption" color={COLORS.textSecondary}>Suggested fee {formatPrice(request.deliveryFee)}</AppText></View><View style={ui.flex}><AppInput label="BID AMOUNT · RS." value={amount} onValueChange={setAmount} keyboardType="number-pad" placeholder="240" /></View></View>
      <View style={ui.card}><AppText variant="small" style={ui.bold}>Estimated delivery time</AppText><View style={ui.wrap}>{[15, 20, 25, 30].map(value => <Chip key={value} label={`${value} min`} selected={eta === value} onPress={() => setEta(value)} />)}</View></View>
      <Notice title="The customer chooses their rider">This bid is saved as a local preview. It is not sent to a customer.</Notice>
    </>}
  </RiderLayout>;
}

export function RiderBidSubmittedScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const request = routeToRequest(route);
  const bid = rider.bids.find(item => item.id === route.params?.bidId);
  return <RiderLayout navigation={navigation} title="Bid Submitted" subtitle={request ? `Order #${request.orderId}` : ''}
    footer={<><AppButton title="View My Bids" onPress={() => openRiderTab(navigation, routes.RIDER_BIDS, { screen: routes.RIDER_BIDS_ROOT, initial: false, pop: true })} /><AppButton title="Withdraw This Bid" variant="outline" disabled={!bid || bid.status !== 'Pending'} onPress={() => { dispatch(withdrawRiderBid({ userKey: rider.userKey, bidId: bid.id })); openRiderTab(navigation, routes.RIDER_BIDS, { screen: routes.RIDER_BIDS_ROOT, initial: false, pop: true }); }} /></>}>
    <View style={styles.successIcon}><AppText style={styles.successMark}>✓</AppText></View><AppText variant="title" style={ui.center}>Bid submitted!</AppText><AppText variant="small" style={ui.center} color={COLORS.textSecondary}>Your offer was saved. You will see its status in My Bids.</AppText>
    <View style={ui.card}><InfoLine icon={faWallet} label="Your offer" value={bid ? formatPrice(bid.amount) : formatPrice(request?.deliveryFee || 0)} /><InfoLine icon={faClock} label="Estimated time" value={`${bid?.etaMinutes || 20} min`} /><InfoLine icon={faFileLines} label="Request" value={request?.restaurant || 'Delivery request'} /></View>
    <Notice title="Preview only">Notifications and customer selection will be connected after the rider service is available.</Notice>
  </RiderLayout>;
}

export function RiderBidsScreen({ navigation }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const [filter, setFilter] = useState('All');
  const groups = { All: () => true, Pending: bid => ['Pending', 'Selected · demo'].includes(bid.status), Accepted: bid => bid.status === 'Accepted', Closed: bid => ['Declined', 'Withdrawn'].includes(bid.status) };
  const shown = rider.bids.filter(groups[filter]);
  return <RiderLayout navigation={navigation} title="My Bids" subtitle="Track your delivery offers" hasTabs onBack={false}>
    <View style={ui.wrap}>{Object.keys(groups).map(name => <Chip key={name} label={`${name} (${rider.bids.filter(groups[name]).length})`} selected={filter === name} onPress={() => setFilter(name)} />)}</View>
    {shown.length ? shown.map(bid => {
      const request = riderRequestById(bid.requestId);
      return <View key={bid.id} style={ui.card}>
        <View style={ui.between}><View style={ui.flex}><AppText style={ui.bold}>{request?.restaurant || 'Delivery request'}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{request ? `Order #${request.orderId}` : ''}</AppText></View><AppText style={styles.price}>{formatPrice(bid.amount)}</AppText></View>
        <View style={ui.between}><AppText variant="small" color={bid.status === 'Accepted' ? COLORS.success : bid.status === 'Declined' ? COLORS.danger : COLORS.warning}>● {bid.status}</AppText><AppText variant="caption" color={COLORS.textSecondary}>ETA · {bid.etaMinutes} min</AppText></View>
        {bid.status === 'Pending' ? <AppButton title="Preview customer selection · demo" variant="outline" onPress={() => { dispatch(selectRiderDemoBid({ userKey: rider.userKey, bidId: bid.id })); openRiderJob(navigation, routes.RIDER_JOB_DECISION, { bidId: bid.id, requestId: bid.requestId }); }} /> : null}
        {bid.status === 'Selected · demo' ? <AppButton title="Review selected delivery" onPress={() => openRiderJob(navigation, routes.RIDER_JOB_DECISION, { bidId: bid.id, requestId: bid.requestId })} /> : null}
        {bid.status === 'Accepted' && rider.activeDelivery?.bidId === bid.id ? <AppButton title="View Active Delivery" onPress={() => openRiderJob(navigation, routes.RIDER_ACTIVE_DELIVERY, { deliveryId: rider.activeDelivery.id })} /> : null}
        {bid.isDemo ? <AppText variant="caption" color={COLORS.textSecondary}>Sample bid</AppText> : null}
      </View>;
    }) : <EmptyState icon="document" title={rider.bids.length ? 'No bids in this group' : 'You have no bids yet'}>Choose a nearby delivery job, then submit an offer for its delivery fee.</EmptyState>}
    <AppButton title="Browse Nearby Requests" variant="text" onPress={() => openRiderTab(navigation, routes.RIDER_JOBS)} />
  </RiderLayout>;
}

export function RiderJobDecisionScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const rider = useRider();
  const bid = rider.bids.find(item => item.id === route.params?.bidId);
  const request = bid ? riderRequestById(bid.requestId) : routeToRequest(route);
  function accept() {
    if (!bid || rider.activeDelivery) return;
    const deliveryId = `DEL-${Date.now()}`;
    dispatch(acceptRiderBid({ userKey: rider.userKey, bidId: bid.id, deliveryId, at: new Date().toISOString() }));
    navigation.replace(routes.RIDER_ACTIVE_DELIVERY, { deliveryId });
  }
  function decline() {
    if (bid) dispatch(declineRiderBid({ userKey: rider.userKey, bidId: bid.id }));
    openRiderTab(navigation, routes.RIDER_BIDS, { screen: routes.RIDER_BIDS_ROOT, initial: false, pop: true });
  }
  const selected = bid?.status === 'Selected · demo';
  return <RiderLayout navigation={navigation} title="Delivery Offer" subtitle={request ? `Order #${request.orderId}` : ''} hasTabs={false}
    footer={selected ? <><AppButton title="Accept Delivery Job" onPress={accept} /><AppButton title="Decline Request" variant="outline" onPress={decline} /></> : <AppButton title="Back to My Bids" onPress={() => openRiderTab(navigation, routes.RIDER_BIDS)} />}>
    {!request ? <EmptyState title="Delivery offer not found">Return to My Bids to review another offer.</EmptyState> : <>
      <View style={styles.decisionHero}><View style={styles.decisionIcon}><AppText style={styles.successMark}>✓</AppText></View><AppText variant="title" style={ui.center}>{selected ? "You've been selected!" : 'Delivery job'}</AppText><AppText variant="small" style={ui.center} color={COLORS.textSecondary}>{selected ? 'The customer chose your offer. Confirm the pickup details before starting.' : `This bid is ${bid?.status?.toLowerCase() || 'not available'}.`}</AppText></View>
      <RequestRestaurant request={request} /><View style={ui.card}><InfoLine icon={faWallet} label="Your delivery fee" value={formatPrice(bid?.amount || request.deliveryFee)} /><InfoLine icon={faClock} label="Your ETA" value={`${bid?.etaMinutes || request.etaMinutes} min`} /><InfoLine icon={faLocationDot} label="Drop off" value={request.customerAddress} /></View>
      <Notice title="Demo customer selection">No real customer was notified and this job is not dispatched.</Notice>
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
    <AppButton title="Log Out" icon="logout" variant="outline" onPress={() => confirmLogout(() => dispatch(logout()))} />
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
  price: { color: COLORS.primary, fontWeight: '700' }, bidCta: { paddingTop: 11, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeCard: { borderColor: COLORS.successBorder, borderWidth: 1.5 }, infoIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight },
  successIcon: { alignSelf: 'center', width: 72, height: 72, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.successLight }, successMark: { fontSize: 38, color: COLORS.success },
  decisionHero: { alignItems: 'center', gap: 13, paddingVertical: 14 }, decisionIcon: { width: 78, height: 78, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.successLight },
  earningsCard: { backgroundColor: COLORS.white, padding: 18, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, gap: 7 }, chart: { height: 124, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }, chartColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 7 }, bar: { width: '100%', borderRadius: 7, backgroundColor: COLORS.primaryBorder }, barActive: { backgroundColor: COLORS.primary },
  profileHero: { alignItems: 'center', gap: 8, padding: 14 }, avatar: { width: 77, height: 77, borderRadius: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight }, verified: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.successLight }, profileIcon: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: COLORS.primaryLight }, stars: { alignItems: 'center', alignSelf: 'center' }, starIcon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 34, backgroundColor: COLORS.warningLight },
});
