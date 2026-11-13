import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { Notice, ui } from '../../components/customer/ui';
import { customerKey, saveProfile, selectCustomer } from '../../redux/customerSlice';
import { updateUser } from '../../redux/authSlice';
import Icon from '../../components/Icon';
import { initials as toInitials } from '../../utils/format';
import { COLORS } from '../../theme/colors';

export default function EditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const { profile } = useSelector(selectCustomer);
  const [name, setName] = useState(profile.name || user?.name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [location, setLocation] = useState(profile.location || '');
  const [photo, setPhoto] = useState(profile.photo || null);
  const [message, setMessage] = useState('');
  const [picking, setPicking] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState(false);
  async function pickPhoto() {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        const source = result.assets[0].uri;
        if (Platform.OS === 'web') setPhoto(source);
        else {
          const target = `${FileSystem.documentDirectory}foodmind-avatar-${Date.now()}.jpg`;
          await FileSystem.copyAsync({ from: source, to: target });
          setPhoto(target);
        }
      }
    } catch (error) {
      setMessage('Could not open that photo. Please choose another image.');
    } finally { setPicking(false); }
  }
  function save() {
    if (!name.trim()) { setMessage('Please enter your full name.'); return; }
    if (phone && !/^\+?[\d\s()-]{7,20}$/.test(phone)) { setMessage('Enter a valid phone number or leave it empty.'); return; }
    const next = { name: name.trim(), phone: phone.trim(), location: location.trim(), photo };
    dispatch(saveProfile({ userKey: customerKey(user), profile: next }));
    dispatch(updateUser(next));
    navigation.goBack();
  }
  const initials = toInitials(name);
  return <ScreenLayout navigation={navigation} title="Edit Profile" error={message} footer={<AppButton title="Save Changes" onPress={save} disabled={picking} />}>
    <Pressable style={styles.identity} onPress={pickPhoto} disabled={picking} accessibilityRole="button" accessibilityLabel="Change profile photo">
      <View style={styles.avatar}>{photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <AppText variant="title" color={COLORS.primary}>{initials}</AppText>}<View style={styles.badge}><Icon name="edit" size={12} color={COLORS.white} /></View></View>
      <AppText variant="small" color={COLORS.primary} style={ui.bold}>{picking ? 'Opening photos...' : 'Change photo'}</AppText>
    </Pressable>
    <AppInput label="FULL NAME" value={name} onValueChange={setName} autoCapitalize="words" placeholder="Enter your name" />
    <AppInput label="EMAIL ADDRESS" value={user?.email || ''} editable={false} />
    <AppText variant="caption" color={COLORS.textSecondary}>Your sign-in email identifies this local account.</AppText>
    <AppInput label="PHONE NUMBER" value={phone} onValueChange={setPhone} keyboardType="phone-pad" placeholder="03XX XXXXXXX" />
    <AppInput label="CURRENT LOCATION" value={location} onValueChange={setLocation} placeholder="e.g. Johar Town, Lahore" />
    <Pressable style={[ui.card, ui.between]} onPress={() => setPasswordInfo(!passwordInfo)} accessibilityRole="button">
      <View style={ui.row}><Icon name="lock" size={15} /><AppText style={ui.bold}>Change password</AppText></View><AppText color={COLORS.textSecondary}>›</AppText>
    </Pressable>
    {passwordInfo ? <Notice icon="lock" title="Account security">Password changes will be available when account management is connected.</Notice> : null}
    <Notice title="Your FoodMind profile">Your name, photo, phone, and location are saved on this device.</Notice>
  </ScreenLayout>;
}
const styles = StyleSheet.create({
  identity: { alignItems: 'center', gap: 12, paddingVertical: 22 },
  avatar: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  photo: { width: 100, height: 100, borderRadius: 50 },
  initials: { fontSize: 32, lineHeight: 42, color: COLORS.primary, fontWeight: '700' },
  badge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
