import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { Chip, ui } from '../../components/customer/ui';
import { savePartnerProfile } from '../../redux/partnerSlice';
import { validateRestaurant } from '../../data/partnerOrders';
import { routes } from '../../navigation/routes';
import { openPartnerTab } from '../../navigation/partnerNavigation';
import { COLORS } from '../../theme/colors';

export default function PartnerRegistrationScreen({ navigation }) {
  const dispatch = useDispatch();
  const { profile, userKey } = usePartner();
  const [form, setForm] = useState(profile);
  const [error, setError] = useState('');
  const field = key => value => setForm(previous => ({ ...previous, [key]: value }));
  function next() {
    const problem = validateRestaurant(form);
    if (problem) { setError(problem); return; }
    dispatch(savePartnerProfile({ userKey, profile: { ...form, name: form.name.trim(), ownerName: form.ownerName.trim(),
      email: form.email.trim(), phone: form.phone.trim(), address: form.address.trim() } }));
    navigation.navigate(routes.PARTNER_DOCUMENTS);
  }
  return <PartnerLayout navigation={navigation} title="Register your restaurant"
    onBack={() => navigation.canGoBack?.() ? navigation.goBack() : openPartnerTab(navigation, routes.PARTNER_STORE)}
    error={error} footer={<AppButton title="Continue →" onPress={next} />}>
    <View style={styles.progress}><View style={styles.fill} /></View>
    <View style={ui.between}><AppText variant="small" color={COLORS.textSecondary} style={ui.flex}>Tell us about your restaurant.</AppText><AppText variant="caption" color={COLORS.primary}>Step 1 of 2</AppText></View>
    <AppInput label="RESTAURANT NAME" placeholder="e.g. Urban Bites" value={form.name} onValueChange={field('name')} />
    <AppInput label="OWNER FULL NAME" placeholder="Enter the owner's full name" value={form.ownerName} onValueChange={field('ownerName')} />
    <AppInput label="PHONE NUMBER" placeholder="0300 0000000" keyboardType="phone-pad" value={form.phone} onValueChange={field('phone')} />
    <AppInput label="EMAIL ADDRESS" placeholder="owner@restaurant.pk" keyboardType="email-address" autoCapitalize="none" value={form.email} onValueChange={field('email')} />
    <AppInput label="RESTAURANT ADDRESS" placeholder="Street, area, city" value={form.address} onValueChange={field('address')} multiline />
    <AppText variant="caption" color={COLORS.textSecondary} style={ui.bold}>CUISINE TYPE</AppText>
    <View style={ui.wrap}>{['Other', 'Burgers', 'Pizza', 'Desi', 'Pasta', 'Fast Food'].map(cuisine => <Chip key={cuisine} label={cuisine} selected={form.cuisines.includes(cuisine)}
      onPress={() => setForm(previous => ({ ...previous, cuisines: previous.cuisines.includes(cuisine) ? previous.cuisines.filter(value => value !== cuisine) : [...previous.cuisines, cuisine] }))} />)}</View>
  </PartnerLayout>;
}
const styles = StyleSheet.create({ progress: { height: 4, borderRadius: 3, backgroundColor: COLORS.border }, fill: { width: '50%', height: 4, borderRadius: 3, backgroundColor: COLORS.primary } });
