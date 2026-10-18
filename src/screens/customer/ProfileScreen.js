import React from 'react';
import { View, Image, Pressable, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import CareIcon from '../../assets/icons/customer-care.svg';
import EditIcon from '../../assets/icons/edit-button.svg';
import LocationPin from '../../assets/icons/location-pin.png';
import PaymentIcon from '../../assets/icons/payment-icon.png';
import FavoritesIcon from '../../assets/icons/favorites.png';
import ReviewStar from '../../assets/icons/review-star.png';
import PreferencesIcon from '../../assets/icons/preferences.png';
import NotificationsIcon from '../../assets/icons/notifications.png';
import SettingsIcon from '../../assets/icons/settings.png';
import LogoutIcon from '../../assets/icons/logout.png';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

const USER = {
    name: 'Syed Hashim Abbas',
    email: 'hashim@example.com',
    tier: 'FOODMIND VIP GOURMET',
    orders: 24,
    reviews: 12,
    saved: 'Rs. 450',
};

const SECTIONS = [
    {
        title: 'ACCOUNT',
        data: [
            { id: 'addresses', source: LocationPin, label: 'Saved Addresses' },
            { id: 'payments', source: PaymentIcon, label: 'Payment Methods' },
            { id: 'favourites', source: FavoritesIcon, label: 'Favourite Dishes' },
        ],
    },
    {
        title: 'ACTIVITY & PREFERENCES',
        data: [
            { id: 'reviews', source: ReviewStar, label: 'My Reviews & Ratings' },
            { id: 'dietary', source: PreferencesIcon, label: 'Dietary Preferences', badge: 'AI' },
            { id: 'notifications', source: NotificationsIcon, label: 'Notifications', dot: true },
        ],
    },
    {
        title: 'SUPPORT & APP',
        data: [
            { id: 'help', comp: CareIcon, label: 'Help & Customer Care' },
            { id: 'settings', source: SettingsIcon, label: 'Settings' },
            { id: 'logout', source: LogoutIcon, label: 'Log Out', danger: true },
        ],
    },
];

function Stat({ value, label, accent }) {
    return (
        <View style={styles.stat}>
            <AppText style={[styles.statValue, accent && styles.accentText]}>{value}</AppText>
            <AppText style={styles.statLabel}>{label}</AppText>
        </View>
    );
}

function ProfileHeader() {
    return (
        <View>
            <View style={styles.titleRow}>
                <AppText style={styles.title}>Profile</AppText>
                <View style={styles.gear}>
                    <Image source={SettingsIcon} style={styles.gearImage} />
                </View>
            </View>

            <View style={styles.identity}>
                <View style={styles.avatar}>
                    <AppText style={styles.avatarText}>SH</AppText>
                    <View style={styles.editBadge}>
                        <EditIcon width={34} height={35} color={COLORS.primary} />
                    </View>
                </View>
                <AppText style={styles.name}>{USER.name}</AppText>
                <AppText style={styles.email}>{USER.email}</AppText>
                <View style={styles.tier}>
                    <Image source={ReviewStar} style={styles.tierStar} />
                    <AppText style={styles.tierText}>{USER.tier}</AppText>
                </View>
            </View>

            <View style={styles.stats}>
                <Stat value={USER.orders} label="Orders" />
                <Stat value={USER.reviews} label="Reviews" />
                <Stat value={USER.saved} label="Saved" accent />
            </View>
        </View>
    );
}

export default function ProfileScreen({ onItemPress }) {
    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <SectionList
                sections={SECTIONS}
                keyExtractor={(item) => item.id}
                stickySectionHeadersEnabled={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
                ListHeaderComponent={ProfileHeader}
                ListFooterComponent={
                    <AppText style={styles.version}>FoodMind v2.4.1 (Build 890)</AppText>
                }
                renderSectionHeader={({ section }) => (
                    <AppText style={styles.sectionTitle}>{section.title}</AppText>
                )}
                renderSectionFooter={() => <View style={styles.sectionGap} />}
                renderItem={({ item, index, section }) => {
                    const last = index === section.data.length - 1;
                    return (
                        <Pressable
                            onPress={() => onItemPress?.(item.id)}
                            style={[
                                styles.row,
                                index === 0 && styles.rowFirst,
                                last && styles.rowLast,
                                !last && styles.rowDivider,
                            ]}
                        >
                            <View style={[styles.icon, item.danger && styles.iconDanger]}>
                                {item.comp ? (
                                    <item.comp width={24} height={24} color={COLORS.primary} />
                                ) : (
                                    <Image source={item.source} style={styles.iconImage} />
                                )}
                            </View>
                            <AppText style={[styles.label, item.danger && styles.dangerText]}>
                                {item.label}
                            </AppText>
                            {item.badge ? (
                                <View style={styles.badge}>
                                    <AppText style={styles.badgeText}>{item.badge}</AppText>
                                </View>
                            ) : null}
                            <View style={styles.spacer} />
                            {item.dot ? <View style={styles.dot} /> : null}
                            <AppText style={styles.chevron}>›</AppText>
                        </Pressable>
                    );
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.xxl },

    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl, marginTop: SPACING.lg },
    title: { fontSize: 30, lineHeight: 38, fontWeight: '800', color: COLORS.text },
    gear: { width: 44, height: 44, borderRadius: RADIUS.pill, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
    gearImage: { width: 22, height: 22 },

    identity: { alignItems: 'center', marginBottom: SPACING.xl },
    avatar: { width: 108, height: 108, borderRadius: RADIUS.pill, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
    avatarText: { fontSize: 34, lineHeight: 40, fontWeight: '700', color: COLORS.primary },
    editBadge: { position: 'absolute', right: -6, bottom: -2 },
    name: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: COLORS.text },
    email: { fontSize: 15, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: 14 },
    tier: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: 20, backgroundColor: COLORS.primaryLight },
    tierStar: { width: 14, height: 14 },
    tierText: { marginLeft: SPACING.sm, fontSize: 13, fontWeight: '700', color: COLORS.primary },

    stats: { flexDirection: 'row', marginBottom: SPACING.xxl },
    stat: { flex: 1, alignItems: 'center', paddingVertical: 18, marginHorizontal: 6, borderRadius: 20, backgroundColor: COLORS.white },
    statValue: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
    statLabel: { fontSize: 14, color: COLORS.textSecondary },
    accentText: { color: COLORS.primary },

    sectionTitle: { fontSize: 13, fontWeight: '600', letterSpacing: 1, color: COLORS.textSecondary, marginBottom: 10, marginLeft: SPACING.xs },
    sectionGap: { height: SPACING.xl },

    row: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: COLORS.white },
    rowFirst: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    rowLast: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
    icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.lg },
    iconDanger: { backgroundColor: '#FDEDEE' },
    iconImage: { width: 24, height: 24 },
    label: { fontSize: 17, fontWeight: '600', color: COLORS.text },
    dangerText: { color: COLORS.danger },
    badge: { marginLeft: 10, paddingHorizontal: 9, paddingVertical: 3, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
    badgeText: { fontSize: 12, fontWeight: '800', color: COLORS.white },
    spacer: { flex: 1 },
    dot: { width: 10, height: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.primary, marginRight: SPACING.md },
    chevron: { fontSize: 22, lineHeight: 22, color: COLORS.textSecondary },

    version: { textAlign: 'center', fontSize: 14, color: COLORS.textSecondary },
});
