import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { View, Image, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { restaurant, formatPrice, findDish } from '../../data/catalog';
import { foodPhotos, getFoodPhoto } from '../../data/foodPhotos';
import { selectMenuItems } from '../../redux/menuSlice';
import { selectPartnerOrders } from '../../redux/partnerSlice';
import { setPartnerAvailability } from '../../redux/apiThunks';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import usePartner from '../../components/partner/usePartner';
import usePartnerReviews from '../../components/partner/usePartnerReviews';
import { ratingSummary } from '../../data/partnerReviews';
import { partnerStage, orderNumber, isLiveForPartner } from '../../data/partnerOrders';
import { initials } from '../../utils/format';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

const NOTE_TONES = { success: COLORS.success, primary: COLORS.primary, muted: COLORS.textSecondary };

function StatCard({ label, value, note, tone }) {
    return (
        <AppCard style={styles.statCard}>
            <AppText variant="caption" color={COLORS.textSecondary} style={styles.statLabel}>{label}</AppText>
            <AppText variant="subheading" numberOfLines={1} adjustsFontSizeToFit>{value}</AppText>
            <AppText variant="caption" style={styles.statNote} color={NOTE_TONES[tone]}>{note}</AppText>
        </AppCard>
    );
}

function OrderCard({ order, onAccept, onReject, onReady, onOpen }) {
    const stage = order.stage;
    const isNew = stage === 'new';
    const isReady = stage === 'ready';
    return (
        <AppCard style={styles.orderCard}>
            <View style={[styles.orderStripe, isNew ? styles.stripeNew : isReady ? styles.stripeReady : styles.stripePreparing]} />
            <View style={styles.orderBody}>
                <View style={styles.orderTop}>
                    <Image source={order.image || foodPhotos['Classic_Smash_Burger.png']} style={styles.orderThumb} />
                    <View style={styles.orderInfo}>
                        <View style={styles.orderTitleRow}>
                            <Pressable style={styles.flex} onPress={() => onOpen?.(order.source)} accessibilityRole="button" accessibilityLabel={`Open order ${order.number}`}>
                                <AppText style={styles.orderTitle}>Order #{order.number} ›</AppText>
                            </Pressable>
                            <View style={[styles.pill, isNew ? styles.pillNew : isReady ? styles.pillReady : styles.pillPreparing]}>
                                <AppText variant="caption" style={styles.bold} color={isNew ? COLORS.primary : isReady ? COLORS.success : COLORS.warning}>
                                    {isNew ? 'New Order' : isReady ? 'Ready' : 'Preparing'}
                                </AppText>
                            </View>
                        </View>
                        <AppText variant="small">{order.items}</AppText>
                        <AppText variant="small" color={COLORS.textSecondary} style={styles.orderMeta}>
                            <AppText variant="small" style={styles.bold}>{order.price}</AppText>
                            {'  •  '}{order.placedAt}{'  •  '}
                            <AppText variant="small" color={order.isPaid ? COLORS.success : COLORS.textSecondary}>{order.payment}</AppText>
                        </AppText>
                    </View>
                </View>
                <View style={styles.divider} />
                {isNew ? (
                    <View style={styles.decisionRow}>
                        <AppButton title="Reject" variant="outline" style={styles.reject} onPress={() => onReject?.(order.id)} />
                        <AppButton title="Accept Order" icon="check" style={styles.accept} onPress={() => onAccept?.(order.id)} />
                    </View>
                ) : (
                    <AppButton title={isReady ? 'Update Pickup Status' : 'Mark Ready for Pickup'} icon={isReady ? 'rider' : 'clock'} variant="secondary"
                        onPress={() => onReady?.(order.source)} />
                )}
            </View>
        </AppCard>
    );
}

export default function PartnerPortalScreen({
    onAcceptOrder, onRejectOrder, onReadyOrder, onAddMenuItem, onManageMenu, onSignOut,
    onOpenOrder, onViewAllOrders, onOpenStore, onCustomerPreview, onDemoOrders,
}) {
    const dispatch = useDispatch();
    const { profile, online: isOnline, demoOrders } = usePartner();
    const allOrders = useSelector(selectPartnerOrders);
    const menuItems = useSelector(selectMenuItems);
    const reviews = usePartnerReviews();
    const storeName = profile.name || restaurant.name;
    const liveOrders = allOrders.filter(isLiveForPartner).map(order => ({
        id: order.id, number: orderNumber(order), source: order, stage: partnerStage(order),
        image: getFoodPhoto(findDish(order.items[0]?.dishId || order.items[0]?.id, menuItems)),
        items: order.items.map(item => `${item.name} ×${item.quantity}`).join(', '),
        price: formatPrice(order.total),
        placedAt: order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
        payment: `${order.isDemo ? 'Sample · ' : ''}${order.isPaid ? 'Online Paid' : 'COD'}`,
        isPaid: Boolean(order.isPaid),
    }));
    // Revenue counts only real customer orders that have left the kitchen (sample orders are excluded).
    const realOrders = allOrders.filter(order => !order.isDemo);
    const completed = realOrders.filter(order => ['picked-up', 'delivered'].includes(partnerStage(order)));
    const revenue = completed.reduce((sum, order) => sum + order.total, 0);
    const rating = reviews.length ? `${ratingSummary(reviews).average.toFixed(1)} ★` : `${restaurant.rating} ★`;
    const stats = [
        { label: 'ORDERS', value: String(realOrders.length), note: `${liveOrders.length} active now`, tone: 'success' },
        { label: 'REVENUE', value: formatPrice(revenue), note: `${completed.length} completed`, tone: 'primary' },
        { label: 'RATING', value: rating, note: reviews.length ? `${reviews.length} reviews` : 'Listing rating', tone: 'muted' },
    ];

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <View style={styles.headerText}>
                        <AppText variant="small" color={COLORS.primary} style={styles.portalLabel}>● PARTNER PORTAL</AppText>
                        <AppText variant="title" numberOfLines={2}>{storeName}</AppText>
                    </View>
                    <Pressable style={styles.avatar} onPress={onOpenStore} accessibilityRole="button" accessibilityLabel="Open store profile">
                        {profile.logoUri ? <Image source={{ uri: profile.logoUri }} style={styles.logo} /> : <AppText variant="subheading" color={COLORS.primary}>{initials(storeName)}</AppText>}
                    </Pressable>
                </View>

                <AppCard style={styles.onlineCard}>
                    <View style={[styles.statusDot, !isOnline && styles.statusDotOffline]} />
                    <View style={styles.flex}>
                        <AppText style={styles.medium}>{isOnline ? 'Accepting orders' : 'Not accepting orders'}</AppText>
                        <AppText variant="caption" color={COLORS.textSecondary}>{isOnline ? 'Customers can check out now' : 'Customers can browse but not order'}</AppText>
                    </View>
                    <Switch value={isOnline} onValueChange={online => dispatch(setPartnerAvailability(online))}
                        accessibilityLabel="Accepting orders" trackColor={{ false: COLORS.border, true: COLORS.success }} thumbColor={COLORS.white} />
                </AppCard>

                <View style={styles.statsRow}>
                    {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
                </View>

                <View style={styles.actionsRow}>
                    <AppButton title="Add Item" icon="utensils" onPress={onAddMenuItem} style={styles.actionButton} />
                    <AppButton title="Manage Menu" variant="outline" onPress={onManageMenu} style={styles.actionButton} />
                </View>

                <View style={styles.sectionRow}>
                    <AppText variant="heading">Live Orders</AppText>
                    <View style={styles.activePill}><AppText variant="small" color={COLORS.primary} style={styles.medium}>{liveOrders.length} active</AppText></View>
                    <View style={styles.flex} />
                    <Pressable onPress={onViewAllOrders} accessibilityRole="button" hitSlop={8}><AppText variant="small" color={COLORS.primary} style={styles.bold}>View All</AppText></Pressable>
                </View>

                {liveOrders.length === 0 ? (
                    <AppCard><AppText color={COLORS.textSecondary}>No active orders right now.</AppText></AppCard>
                ) : liveOrders.map(order => (
                    <OrderCard key={order.id} order={order} onAccept={onAcceptOrder} onReject={onRejectOrder} onReady={onReadyOrder} onOpen={onOpenOrder} />
                ))}
                {!demoOrders.length ? <AppButton title="Load sample orders" variant="outline" onPress={onDemoOrders} style={styles.gap} /> : null}
                <AppButton title="View Customer Experience" variant="outline" onPress={onCustomerPreview} style={styles.gap} />

                <AppCard style={styles.switchCard}>
                    <View style={styles.flex}>
                        <AppText style={styles.bold}>Partner account</AppText>
                        <AppText variant="small" color={COLORS.textSecondary}>{`Signed in to the ${storeName} partner portal`}</AppText>
                    </View>
                    <AppButton title="Log Out" variant="outline" onPress={onSignOut} style={styles.switchButton} />
                </AppCard>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.xl, paddingBottom: 40 },
    flex: { flex: 1 }, bold: { fontWeight: '700' }, medium: { fontWeight: '600' },
    gap: { marginBottom: SPACING.lg },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
    headerText: { flex: 1, marginRight: 12 },
    portalLabel: { fontWeight: '600', marginBottom: 2 },
    avatar: { width: 56, height: 56, borderRadius: RADIUS.pill, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    logo: { width: 56, height: 56, borderRadius: 28 },
    onlineCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 18, marginBottom: SPACING.lg },
    statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success },
    statusDotOffline: { backgroundColor: COLORS.disabled },
    statsRow: { flexDirection: 'row', marginBottom: SPACING.xl, marginHorizontal: -5 },
    statCard: { flex: 1, padding: 14, marginHorizontal: 5, marginBottom: 0, gap: 4 },
    statLabel: { fontWeight: '600' },
    statNote: { fontWeight: '600' },
    actionsRow: { flexDirection: 'row', marginBottom: 28, gap: 10 },
    actionButton: { flex: 1 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    activePill: { marginLeft: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: COLORS.primaryLight },
    orderCard: { flexDirection: 'row', padding: 0, marginBottom: SPACING.lg, overflow: 'hidden' },
    orderStripe: { width: 6 },
    stripeNew: { backgroundColor: COLORS.primary },
    stripePreparing: { backgroundColor: COLORS.warning },
    stripeReady: { backgroundColor: COLORS.success },
    orderBody: { flex: 1, padding: SPACING.lg },
    orderTop: { flexDirection: 'row' },
    orderThumb: { width: 56, height: 56, borderRadius: RADIUS.md, backgroundColor: COLORS.inputBackground, marginRight: 14 },
    orderInfo: { flex: 1 },
    orderTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 8 },
    orderTitle: { fontWeight: '700' },
    pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
    pillNew: { backgroundColor: COLORS.primaryLight },
    pillPreparing: { backgroundColor: COLORS.warningLight },
    pillReady: { backgroundColor: COLORS.successLight },
    orderMeta: { marginTop: 6 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 14 },
    decisionRow: { flexDirection: 'row', gap: 10 },
    reject: { flex: 1 },
    accept: { flex: 2 },
    switchCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder },
    switchButton: { minHeight: 40, paddingVertical: 8 },
});
