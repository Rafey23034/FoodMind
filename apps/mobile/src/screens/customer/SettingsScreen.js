import React from 'react';
import { Pressable, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import ScreenLayout from '../../components/customer/ScreenLayout';
import AppText from '../../components/AppText';
import AppButton from '../../components/AppButton';
import { ui } from '../../components/customer/ui';
import { signOut } from '../../redux/session';
import { selectUserAddresses } from '../../redux/addressesSlice';
import { useCustomerPreview } from '../../navigation/PreviewContext';
import { routes } from '../../navigation/routes';
import { confirmLogout } from '../../utils/confirm';
import { plural } from '../../utils/format';
import { COLORS } from '../../theme/colors';

export default function SettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const preview = useCustomerPreview();
  const user = useSelector(state => state.auth.user);
  const saved = useSelector(selectUserAddresses);
  return (
    <ScreenLayout navigation={navigation} title="Settings">
      <AppText variant="caption" color={COLORS.textSecondary} style={ui.bold}>ACCOUNT</AppText>
      <View style={ui.card}>
        <AppText variant="small" color={COLORS.textSecondary}>Signed in as</AppText>
        <AppText style={ui.bold}>{user?.email || ''}</AppText>
      </View>
      <Pressable style={[ui.card, ui.between]} onPress={() => navigation.navigate(routes.ADDRESSES)} accessibilityRole="button">
        <View><AppText style={ui.bold}>Saved Addresses</AppText><AppText variant="small" color={COLORS.textSecondary}>{plural(saved.length, 'address', 'addresses')} saved</AppText></View>
        <AppText color={COLORS.textSecondary}>›</AppText>
      </Pressable>
      <View style={ui.card}>
        <AppText style={ui.bold}>Payment method</AppText>
        <AppText variant="small" color={COLORS.textSecondary}>Cash on Delivery</AppText>
      </View>
      <AppText variant="caption" color={COLORS.textSecondary} style={ui.bold}>ABOUT</AppText>
      <View style={ui.card}>
        <AppText variant="small" color={COLORS.textSecondary}>Your orders, addresses and profile are stored on this device. FoodMind does not use your location or card details.</AppText>
      </View>
      {!preview ? <AppButton title="Log Out" icon="logout" variant="outline" onPress={() => confirmLogout(() => dispatch(signOut()))} /> : null}
    </ScreenLayout>
  );
}
