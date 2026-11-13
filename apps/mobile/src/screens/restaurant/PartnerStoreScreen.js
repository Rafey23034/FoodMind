import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import usePartnerReviews from '../../components/partner/usePartnerReviews';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { ui } from '../../components/customer/ui';
import { logout } from '../../redux/authSlice';
import { ratingSummary } from '../../data/partnerReviews';
import { restaurant } from '../../data/catalog';
import { routes } from '../../navigation/routes';
import Icon from '../../components/Icon';
import { initials } from '../../utils/format';
import { confirmLogout } from '../../utils/confirm';
import { COLORS } from '../../theme/colors';

export default function PartnerStoreScreen({ navigation, hasPartnerTabs }) {
  const dispatch = useDispatch();
  const { profile, application, documents } = usePartner();
  const reviews = usePartnerReviews();
  const rating = reviews.length ? ratingSummary(reviews).average.toFixed(1) : restaurant.rating;
  const logoInitials = initials(profile.name || 'Your Restaurant');
  const rows = [
    ['location', 'ADDRESS', profile.address || 'Add your restaurant address', routes.PARTNER_EDIT_STORE, 'address'],
    ['phone', 'PHONE', profile.phone || 'Add a contact number', routes.PARTNER_EDIT_STORE, 'phone'],
    ['clock', 'OPENING HOURS', profile.openingHours, routes.PARTNER_EDIT_STORE, 'openingHours'],
    ['document', 'DOCUMENTS & PHOTOS', Object.keys(documents).length === 3 ? 'All required files selected' : 'Select your documents', routes.PARTNER_DOCUMENTS],
  ];
  return <PartnerLayout navigation={navigation} title="Store" subtitle="PARTNER PORTAL" hasTabs={hasPartnerTabs}
    onBack={false} footer={<><AppButton title="Edit restaurant profile" icon="edit" onPress={() => navigation.navigate(routes.PARTNER_EDIT_STORE)} /><AppButton title="Log Out" icon="logout" variant="outline" onPress={() => confirmLogout(() => dispatch(logout()))} /></>}>
    <View style={styles.brandCard}><View style={styles.cover}>{profile.coverUri ? <Image source={{ uri: profile.coverUri }} style={styles.coverImage} /> : <Icon name="utensils" size={28} />}</View>
      <View style={styles.brandBody}><View style={styles.logo}>{profile.logoUri ? <Image source={{ uri: profile.logoUri }} style={styles.logoImage} /> : <AppText color={COLORS.primary} style={ui.bold}>{logoInitials}</AppText>}</View>
        <View style={ui.flex}><AppText variant="subheading">{profile.name || 'Your restaurant'}</AppText><AppText variant="caption" color={COLORS.textSecondary}>{profile.cuisines.join(' · ')}</AppText></View>
      </View>
      <View style={[ui.between, styles.brandMeta]}><AppText variant="small" color={application.status === 'Approved' ? COLORS.success : COLORS.warning}>{application.status}{application.status === 'Approved' ? ' · Demo' : ''}</AppText><AppText color={COLORS.warning} variant="small">★ {rating} {reviews.length ? `(${reviews.length})` : ''}</AppText></View>
    </View>
    {rows.map(([icon, label, value, destination, field]) => <Pressable key={label} style={[ui.card, ui.row]} accessibilityRole="button" onPress={() => navigation.navigate(destination, field ? { field } : undefined)}>
      <Icon name={icon} size={16} /><View style={ui.flex}><AppText variant="caption" color={COLORS.textSecondary}>{label}</AppText><AppText variant="small" style={ui.bold}>{value}</AppText></View><AppText color={COLORS.textSecondary}>›</AppText>
    </Pressable>)}
    <AppButton title="Restaurant registration & status" variant="text" onPress={() => navigation.navigate(application.status === 'Pending approval' ? routes.PARTNER_UNDER_REVIEW : routes.PARTNER_REGISTER)} />
    <AppButton title="View Customer Experience" variant="outline" onPress={() => navigation.navigate(routes.PARTNER_CUSTOMER_PREVIEW)} />
  </PartnerLayout>;
}
const styles = StyleSheet.create({
  brandCard: { borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cover: { height: 90, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }, coverImage: { width: '100%', height: '100%' },
  brandBody: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 16, paddingTop: 14 }, brandMeta: { padding: 16 },
  logo: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, logoImage: { width: '100%', height: '100%' },
});
