import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faHouse, faUtensils, faBagShopping, faStar, faStore } from '@fortawesome/free-solid-svg-icons';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

const Tab = createBottomTabNavigator();
export default function PartnerTabs({ Overview, Menu, Orders, Reviews, Store }) {
  const insets = useSafeAreaInsets();
  const screens = [
    [routes.DASHBOARD, 'Overview', faHouse, Overview],
    [routes.MANAGE_MENU, 'Menu', faUtensils, Menu],
    [routes.PARTNER_ORDERS, 'Orders', faBagShopping, Orders],
    [routes.PARTNER_REVIEWS, 'Reviews', faStar, Reviews],
    [routes.PARTNER_STORE, 'Store', faStore, Store],
  ];
  return <Tab.Navigator initialRouteName={routes.DASHBOARD} backBehavior="history" screenOptions={{
    headerShown: false, tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.textSecondary,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarStyle: { height: 62 + insets.bottom, paddingTop: 8, backgroundColor: COLORS.white, borderTopColor: COLORS.border },
  }}>
    {screens.map(([name, title, icon, component]) => <Tab.Screen key={name} name={name} component={component}
      options={{ title, tabBarIcon: ({ color }) => <FontAwesomeIcon icon={icon} size={18} color={color} /> }} />)}
  </Tab.Navigator>;
}
