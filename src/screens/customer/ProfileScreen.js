import React from 'react';
import { useSelector } from 'react-redux';
import { Image, View, Pressable, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../components/AppText';
import Header from '../../components/Header';
import Icon from '../../components/Icon';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot, faStar, faGear, faRightFromBracket, faPen, faChevronRight, faBagShopping, faGift, faMotorcycle, faHeadset } from '@fortawesome/free-solid-svg-icons';
import { selectCustomer, selectPoints } from '../../redux/customerSlice';
import { selectMyOrders } from '../../redux/ordersSlice';
import { useCustomerPreview } from '../../navigation/PreviewContext';
import { initials } from '../../utils/format';
import { COLORS } from '../../theme/colors';
import { SPACING, RADIUS } from '../../theme/spacing';

function sectionsFor(preview) {
  return [
    { title: 'ACCOUNT', data: [
      { id: 'orders', icon: faBagShopping, label: 'My Orders' },
      { id: 'addresses', icon: faLocationDot, label: 'Saved Addresses' },
    ] },
    { title: 'ACTIVITY & REWARDS', data: [
      { id: 'reviews', icon: faStar, label: 'My Reviews & Ratings' },
      { id: 'rewards', icon: faGift, label: 'Points & Rewards' },
      { id: 'community', icon: faMotorcycle, label: 'Community Delivery' },
    ] },
    { title: 'SUPPORT & APP', data: [
      { id: 'help', icon: faHeadset, label: 'Help & Customer Care' },
      { id: 'settings', icon: faGear, label: 'Settings' },
      // A partner previewing the customer app returns with the banner above, not by logging out.
      ...(preview ? [] : [{ id: 'logout', icon: faRightFromBracket, label: 'Log Out', danger: true }]),
    ] },
  ];
}

function Stat({ value, label, accent }) {
  return <View style={styles.stat}>
    <AppText variant="subheading" color={accent ? COLORS.primary : COLORS.text}>{value}</AppText>
    <AppText variant="small" color={COLORS.textSecondary}>{label}</AppText>
  </View>;
}

function ProfileHeader({ onEdit }) {
  const user = useSelector(state => state.auth.user);
  const orderCount = useSelector(state => selectMyOrders(state).length);
  const points = useSelector(selectPoints);
  const { reviews, profile } = useSelector(selectCustomer);
  return <View>
    <View style={styles.identity}>
      <Pressable style={styles.avatar} onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit profile">
        {profile.photo ? <Image source={{ uri: profile.photo }} style={styles.photo} /> : <AppText variant="title" color={COLORS.primary}>{initials(user?.name)}</AppText>}
        <View style={styles.editBadge}><FontAwesomeIcon icon={faPen} size={13} color={COLORS.white} /></View>
      </Pressable>
      <AppText variant="heading">{user?.name || 'FoodMind User'}</AppText>
      <AppText color={COLORS.textSecondary} style={styles.email}>{user?.email || ''}</AppText>
      <View style={styles.tier}><Icon name="gift" size={13} /><AppText variant="small" color={COLORS.primary} style={styles.bold}>{points} reward points</AppText></View>
    </View>
    <View style={styles.stats}>
      <Stat value={orderCount} label="Orders" />
      <Stat value={reviews.length} label="Reviews" />
      <Stat value={points} label="Points" accent />
    </View>
  </View>;
}

export default function ProfileScreen({ onItemPress }) {
  const preview = useCustomerPreview();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Profile" centerTitle />
      <SectionList
        sections={sectionsFor(preview)}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<ProfileHeader onEdit={() => onItemPress?.('edit_profile')} />}
        renderSectionHeader={({ section }) => <AppText variant="small" color={COLORS.textSecondary} style={styles.sectionTitle}>{section.title}</AppText>}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
        renderItem={({ item, index, section }) => {
          const last = index === section.data.length - 1;
          return <Pressable onPress={() => onItemPress?.(item.id)} accessibilityRole="button"
            style={[styles.row, index === 0 && styles.rowFirst, last && styles.rowLast, !last && styles.rowDivider]}>
            <View style={[styles.icon, item.danger && styles.iconDanger]}>
              <FontAwesomeIcon icon={item.icon} size={18} color={item.danger ? COLORS.danger : COLORS.primary} />
            </View>
            <AppText color={item.danger ? COLORS.danger : COLORS.text} style={[styles.label, styles.medium]}>{item.label}</AppText>
            <FontAwesomeIcon icon={faChevronRight} size={13} color={COLORS.textSecondary} />
          </Pressable>;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm, paddingBottom: SPACING.xxl },
  bold: { fontWeight: '700' }, medium: { fontWeight: '600' },
  identity: { alignItems: 'center', marginBottom: SPACING.xl, gap: 2 },
  avatar: { width: 108, height: 108, borderRadius: RADIUS.pill, borderWidth: 3, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  photo: { width: 102, height: 102, borderRadius: 51 },
  editBadge: { position: 'absolute', right: -4, bottom: 0, backgroundColor: COLORS.primary, borderRadius: RADIUS.pill, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  email: { marginBottom: 12 },
  tier: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill, backgroundColor: COLORS.primaryLight },
  stats: { flexDirection: 'row', marginBottom: SPACING.xxl },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 18, marginHorizontal: 6, borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontWeight: '600', letterSpacing: 1, marginBottom: 10, marginLeft: SPACING.xs },
  sectionGap: { height: SPACING.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACING.lg, paddingVertical: 14, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  rowFirst: { borderTopWidth: 1, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  rowLast: { borderBottomWidth: 1, borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  icon: { width: 40, height: 40, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconDanger: { backgroundColor: COLORS.dangerLight },
  label: { flex: 1 },
});
