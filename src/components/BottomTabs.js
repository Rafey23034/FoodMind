import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCartShopping } from '@fortawesome/free-solid-svg-icons';
import HomeIcon from './icons/HomeIcon';
import SearchTabIcon from './icons/SearchTabIcon';
import { routes } from '../navigation/routes';
import { selectCartCount } from '../redux/cartSlice';
import { initials as toInitials } from '../utils/format';
import { COLORS } from '../theme/colors';

const Tab = createBottomTabNavigator();

export default function BottomTabs({ Home, Search, Cart, Profile }) {
  const user = useSelector(state => state.auth.user);
  const insets = useSafeAreaInsets();
  const cartCount = useSelector(selectCartCount);
  const initials = toInitials(user?.name);
  return <Tab.Navigator initialRouteName={routes.HOME} backBehavior="history" screenOptions={{
    headerShown: false, tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.textSecondary,
    tabBarLabelStyle: styles.label,
    tabBarStyle: { height: 58 + insets.bottom, paddingTop: 6, backgroundColor: COLORS.surface, borderTopColor: COLORS.border },
  }}>
    <Tab.Screen name={routes.HOME} component={Home} options={{ tabBarIcon: ({ color }) => <HomeIcon color={color} /> }} />
    <Tab.Screen name={routes.SEARCH} component={Search} options={{ tabBarIcon: ({ color }) => <SearchTabIcon color={color} /> }} />
    <Tab.Screen name={routes.CART} component={Cart} options={{ tabBarBadge: cartCount || undefined, tabBarBadgeStyle: styles.badge,
      tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faCartShopping} color={color} size={20} /> }} />
    <Tab.Screen name={routes.PROFILE} component={Profile} options={{ tabBarIcon: ({ color, focused }) =>
      <View style={[styles.avatar, focused && styles.avatarActive]}><Text style={[styles.avatarText, { color }]}>{initials}</Text></View> }} />
  </Tab.Navigator>;
}
const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: '600' },
  avatar: { width: 27, height: 27, borderRadius: 14, backgroundColor: COLORS.inputBackground, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  avatarText: { fontSize: 11, fontWeight: '700' },
  badge: { backgroundColor: COLORS.primary, color: COLORS.white, fontSize: 11 },
});
