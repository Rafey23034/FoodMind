import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import PartnerLayout from '../../components/partner/PartnerLayout';
import usePartner from '../../components/partner/usePartner';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { Chip, ui } from '../../components/customer/ui';
import { savePartnerProfile, savePartnerDocument } from '../../redux/partnerSlice';
import { choosePartnerPhotos } from '../../utils/partnerMedia';
import { validateRestaurant } from '../../data/partnerOrders';
import Icon from '../../components/Icon';
import { COLORS } from '../../theme/colors';

export default function EditRestaurantProfileScreen({ navigation, route, hasPartnerTabs }) {
  const dispatch = useDispatch();
  const { profile, userKey } = usePartner();
  const [form, setForm] = useState(profile);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newMedia, setNewMedia] = useState({});
  const [error, setError] = useState('');
  const field = key => value => setForm(previous => ({ ...previous, [key]: value }));
  async function changePhoto(kind) {
    setBusy(true); setError('');
    try {
      const photos = await choosePartnerPhotos({ kind });
      if (photos[0]) {
        setForm(previous => ({ ...previous, [`${kind}Uri`]: photos[0].uri }));
        setNewMedia(previous => ({ ...previous, [kind]: photos[0] })); setChoosing(false);
      }
    } catch (problem) { setError('Could not keep that image. Please choose another photo.'); }
    finally { setBusy(false); }
  }
  function save() {
    const problem = validateRestaurant(form);
    if (problem || !form.openingHours.trim()) { setError(problem || 'Enter your opening hours.'); return; }
    dispatch(savePartnerProfile({ userKey, profile: { ...form, name: form.name.trim(), description: form.description.trim(), address: form.address.trim(), phone: form.phone.trim(), openingHours: form.openingHours.trim() } }));
    if (newMedia.logo) dispatch(savePartnerDocument({ userKey, kind: 'logo', document: newMedia.logo }));
    navigation.goBack();
  }
  return <PartnerLayout navigation={navigation} title="Edit restaurant profile" hasTabs={hasPartnerTabs} error={error} footer={<AppButton title="Save changes" disabled={busy} onPress={save} />}>
    <Pressable style={styles.cover} disabled={busy} onPress={() => setChoosing(!choosing)} accessibilityRole="button" accessibilityLabel="Change cover or logo">
      {form.coverUri ? <Image source={{ uri: form.coverUri }} style={styles.coverImage} /> : <Icon name="utensils" size={28} />}
      {form.logoUri ? <Image source={{ uri: form.logoUri }} style={styles.logo} /> : null}
      <View style={styles.changeLabel}><AppText color={COLORS.primary} style={ui.bold}>{busy ? 'Opening photos…' : 'Change cover / logo'}</AppText></View>
    </Pressable>
    {choosing ? <View style={ui.row}><AppButton style={ui.flex} title="Change cover" variant="outline" onPress={() => changePhoto('cover')} /><AppButton style={ui.flex} title="Change logo" variant="outline" onPress={() => changePhoto('logo')} /></View> : null}
    <AppInput label="STORE NAME" value={form.name} onValueChange={field('name')} placeholder="Your restaurant name" />
    <AppInput label="SHORT DESCRIPTION" value={form.description} onValueChange={field('description')} placeholder="Tell diners about your food" multiline maxLength={300} />
    <AppInput label="ADDRESS" value={form.address} onValueChange={field('address')} placeholder="Street, area, city" autoFocus={route.params?.field === 'address'} />
    <AppInput label="PHONE" value={form.phone} onValueChange={field('phone')} keyboardType="phone-pad" placeholder="0300 1234567" autoFocus={route.params?.field === 'phone'} />
    <AppInput label="OPENING HOURS" value={form.openingHours} onValueChange={field('openingHours')} placeholder="11:00 AM – 11:00 PM" autoFocus={route.params?.field === 'openingHours'} />
    <AppText variant="caption" color={COLORS.textSecondary} style={ui.bold}>CUISINE TAGS</AppText>
    <View style={ui.wrap}>{['Burgers', 'Fast Food', 'Pizza', 'Pasta', 'Desi', 'Desserts', 'Other'].map(value => <Chip key={value} label={value} selected={form.cuisines.includes(value)} onPress={() => setForm(previous => ({ ...previous, cuisines: previous.cuisines.includes(value) ? previous.cuisines.filter(cuisine => cuisine !== value) : [...previous.cuisines, value] }))} />)}</View>
  </PartnerLayout>;
}
const styles = StyleSheet.create({
  cover: { height: 145, borderRadius: 18, borderWidth: 1, borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%', position: 'absolute' }, logo: { width: 48, height: 48, borderRadius: 24, marginBottom: 25 },
  changeLabel: { position: 'absolute', bottom: 16, backgroundColor: COLORS.white, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 6 },
});
