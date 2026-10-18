import React, { useState } from 'react';
import { View, Image, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import AppCard from '../../components/AppCard';
import order1034 from '../../assets/order-1034.png';
import order1033 from '../../assets/order-1033.png';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

const STORE = {
    name: 'Urban Bites',
    initials: 'RB',
    greeting: 'Good afternoon, Urban Bites Team',
};

const STATS = [
    { label: 'ORDERS TODAY', value: '18', note: "↑ 12% vs y'day", tone: 'success', sub: '16 completed' },
    { label: 'REVENUE', value: 'Rs. 24.5k', note: 'Target 88%', tone: 'primary', sub: 'Avg Rs. 1,360' },
    { label: 'STORE RATING', value: '4.7 ★', note: '500+ reviews', tone: 'muted', sub: 'Top 5% local' },
];

const NOTE_TONES = {
    success: COLORS.success,
    primary: COLORS.primary,
    muted: COLORS.textSecondary,
}; 

const ORDERS = [
    {
        id: '1034',
        image: order1034,
        items: 'Classic Smash Burger x2, Loaded Fries x1',
        price: 'Rs. 1,640',
        placedAt: '2 mins ago',
        payment: 'Online Paid',
        isPaid: true,
        status: 'new',
    },
    {
        id: '1033',
        image: order1033,
        items: 'Fire Burger x1, Mint Lemonade x2',
        price: 'Rs. 1,120',
        placedAt: 'Rider Assigned',
        payment: 'COD',
        isPaid: false,
        status: 'preparing',
    },
];

function StatCard({ label, value, note, tone, sub }) {
    return (
        <AppCard style={styles.statCard}>
            <AppText variant="caption" color={COLORS.textSecondary} style={styles.statLabel}>
                {label}
            </AppText>
            <AppText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {value}
            </AppText>
            <AppText variant="small" style={[styles.statNote, { color: NOTE_TONES[tone] }]}>
                {note}
            </AppText>
            <AppText variant="small" color={COLORS.textSecondary}>
                {sub}
            </AppText>
        </AppCard>
    );
}

function OrderCard({ order, onAccept, onReject, onReady }) {
    const isNew = order.status === 'new';

    return (
        <AppCard style={styles.orderCard}>
            <View style={[styles.orderStripe, isNew ? styles.stripeNew : styles.stripePreparing]} />

            <View style={styles.orderBody}>
                <View style={styles.orderTop}>
                    <Image source={order.image} style={styles.orderThumb} />

                    <View style={styles.orderInfo}>
                        <View style={styles.orderTitleRow}>
                            <AppText style={styles.orderTitle}>Order #{order.id}</AppText>
                            <View style={[styles.pill, isNew ? styles.pillNew : styles.pillPreparing]}>
                                <AppText
                                    variant="caption"
                                    style={isNew ? styles.pillTextNew : styles.pillTextPreparing}
                                >
                                    {isNew ? '● New Order' : 'Preparing (12m left)'}
                                </AppText>
                            </View>
                        </View>

                        <AppText variant="small" color={COLORS.text}>
                            {order.items}
                        </AppText>
                        <AppText variant="small" color={COLORS.textSecondary} style={styles.orderMeta}>
                            <AppText style={styles.orderPrice}>{order.price}</AppText>
                            {'  •  '}{order.placedAt}{'  •  '}
                            <AppText color={order.isPaid ? COLORS.success : COLORS.textSecondary}>
                                {order.payment}
                            </AppText>
                        </AppText>
                    </View>
                </View>

                <View style={styles.divider} />

                {isNew ? (
                    <View style={styles.decisionRow}>
                        <Pressable style={[styles.orderButton, styles.rejectButton]} onPress={() => onReject?.(order.id)}>
                            <AppText style={styles.rejectText}>Reject</AppText>
                        </Pressable>
                        <Pressable style={[styles.orderButton, styles.acceptButton]} onPress={() => onAccept?.(order.id)}>
                            <AppText style={styles.acceptText}>✓  Accept Order</AppText>
                        </Pressable>
                    </View>
                ) : (
                    <Pressable style={[styles.orderButton, styles.readyButton]} onPress={() => onReady?.(order.id)}>
                        <AppText style={styles.readyText}>◔  Ready for Pickup</AppText>
                    </Pressable>
                )}
            </View>
        </AppCard>
    );
}

export default function PartnerPortalScreen({
    onAcceptOrder,
    onRejectOrder,
    onReadyOrder,
    onAddMenuItem,
    onManageMenu,
    onSwitchToCustomer,
}) {
    const [isOnline, setIsOnline] = useState(true);

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.headerRow}>
                    <View>
                        <AppText variant="small" color={COLORS.primary} style={styles.portalLabel}>
                            ● PARTNER PORTAL
                        </AppText>
                        <AppText style={styles.storeName}>{STORE.name}</AppText>
                    </View>
                    <View style={styles.avatar}>
                        <AppText style={styles.avatarText}>{STORE.initials}</AppText>
                    </View>
                </View>

                {/* Online toggle */}
                <AppCard style={styles.onlineCard}>
                    <View style={[styles.statusDot, !isOnline && styles.statusDotOffline]} />
                    <AppText style={styles.onlineText}>
                        {isOnline ? 'Accepting Orders • Online' : 'Not accepting orders • Offline'}
                    </AppText>
                    <View style={styles.spacer} />
                    <Switch
                        value={isOnline}
                        onValueChange={setIsOnline}
                        trackColor={{ false: COLORS.disabled, true: COLORS.success }}
                        thumbColor={COLORS.white}
                    />
                </AppCard>

                <AppText variant="body" color={COLORS.textSecondary} style={styles.greeting}>
                    {STORE.greeting}
                </AppText>

                {/* Stats */}
                <View style={styles.statsRow}>
                    {STATS.map((stat) => (
                        <StatCard key={stat.label} {...stat} />
                    ))}
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                    <AppButton
                        title="+  Add Menu Item"
                        onPress={onAddMenuItem}
                        style={styles.actionButton}
                    />
                    <AppButton
                        title="Manage Menu"
                        variant="outline"
                        onPress={onManageMenu}
                        style={styles.actionButton}
                    />
                </View>

                {/* Live orders */}
                <View style={styles.sectionRow}>
                    <AppText style={styles.sectionTitle}>Live Orders</AppText>
                    <View style={styles.activePill}>
                        <AppText variant="small" color={COLORS.primary} style={styles.activeText}>
                            {ORDERS.length} Active
                        </AppText>
                    </View>
                    <View style={styles.spacer} />
                    <Pressable hitSlop={8}>
                        <AppText variant="small" color={COLORS.primary} style={styles.viewAll}>
                            View All
                        </AppText>
                    </Pressable>
                </View>

                {ORDERS.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        onAccept={onAcceptOrder}
                        onReject={onRejectOrder}
                        onReady={onReadyOrder}
                    />
                ))}

                {/* Switch to customer view */}
                <AppCard style={styles.switchCard}>
                    <View style={styles.switchIcon}>
                        <AppText style={styles.switchEmoji}>🍽️</AppText>
                    </View>
                    <View style={styles.switchInfo}>
                        <AppText style={styles.switchTitle}>View Customer Experience</AppText>
                        <AppText variant="small" color={COLORS.textSecondary}>
                            Browse Urban Bites as a diner
                        </AppText>
                    </View>
                    <Pressable style={styles.switchButton} onPress={onSwitchToCustomer}>
                        <AppText variant="small" color={COLORS.primary} style={styles.switchButtonText}>
                            Switch
                        </AppText>
                    </Pressable>
                </AppCard>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.xl, paddingBottom: 40 },
    spacer: { flex: 1 },

    // Header
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    portalLabel: { fontWeight: '600', marginBottom: 2 },
    storeName: { fontSize: 32, lineHeight: 40, fontWeight: '800', color: COLORS.text },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },

    // Online toggle
    onlineCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 18,
        marginBottom: SPACING.lg,
    },
    statusDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success, marginRight: 14 },
    statusDotOffline: { backgroundColor: COLORS.disabled },
    onlineText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
    greeting: { marginBottom: SPACING.xl },

    // Stats
    statsRow: { flexDirection: 'row', marginBottom: SPACING.xl },
    statCard: { flex: 1, borderRadius: 20, padding: 14, marginHorizontal: 5, marginBottom: 0 },
    statLabel: { marginBottom: SPACING.sm },
    statValue: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
    statNote: { fontWeight: '600', marginBottom: 10 },

    // Actions
    actionsRow: { flexDirection: 'row', marginBottom: 28 },
    actionButton: { flex: 1, height: 56, borderRadius: 20, marginHorizontal: 5 },

    // Live orders
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: COLORS.text },
    activePill: {
        marginLeft: SPACING.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: COLORS.primaryLight,
    },
    activeText: { fontWeight: '600' },
    viewAll: { fontWeight: '700' },

    // Order card
    orderCard: { flexDirection: 'row', padding: 0, borderRadius: 24, marginBottom: SPACING.lg, overflow: 'hidden' },
    orderStripe: { width: 6 },
    stripeNew: { backgroundColor: COLORS.primary },
    stripePreparing: { backgroundColor: COLORS.warning },
    orderBody: { flex: 1, padding: SPACING.lg },
    orderTop: { flexDirection: 'row' },
    orderThumb: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.inputBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    orderInfo: { flex: 1 },
    orderTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    orderTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
    pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
    pillNew: { backgroundColor: COLORS.primaryLight },
    pillPreparing: { backgroundColor: COLORS.warningLight },
    pillTextNew: { fontWeight: '700', color: COLORS.primary },
    pillTextPreparing: { fontWeight: '700', color: COLORS.warning },
    orderMeta: { marginTop: 6 },
    orderPrice: { fontWeight: '800', color: COLORS.text },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 14 },

    decisionRow: { flexDirection: 'row' },
    orderButton: { height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' },
    rejectButton: { flex: 1, backgroundColor: COLORS.inputBackground, marginRight: 10 },
    rejectText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
    acceptButton: { flex: 2, backgroundColor: COLORS.primary },
    acceptText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
    readyButton: { backgroundColor: COLORS.successLight },
    readyText: { fontSize: 16, fontWeight: '700', color: COLORS.success },

    // Switch to customer view
    switchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 14, backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryLight },
    switchIcon: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.pill,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.md,
    },
    switchEmoji: { fontSize: 20 },
    switchInfo: { flex: 1 },
    switchTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
    switchButton: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 14,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.primaryLight,
    },
    switchButtonText: { fontWeight: '700' },
});
