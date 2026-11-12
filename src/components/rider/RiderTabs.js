import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLocationDot, faFileLines, faWallet, faUser } from '@fortawesome/free-solid-svg-icons';
import { COLORS } from '../../theme/colors';
import { routes } from '../../navigation/routes';

const Tab = createBottomTabNavigator();
export default function RiderTabs({ Jobs, Bids, Earnings, Profile }) {
  const insets = useSafeAreaInsets();
  return <Tab.Navigator initialRouteName={routes.RIDER_JOBS} backBehavior="history" screenOptions={{
    headerShown: false, tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.textSecondary,
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarStyle: { height: 62 + insets.bottom, paddingTop: 7, backgroundColor: COLORS.white, borderTopColor: COLORS.border },
  }}>
    <Tab.Screen name={routes.RIDER_JOBS} component={Jobs} options={{ title: 'Jobs', tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faLocationDot} size={19} color={color} /> }} />
    <Tab.Screen name={routes.RIDER_BIDS} component={Bids} options={{ title: 'Bids', tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faFileLines} size={19} color={color} /> }} />
    <Tab.Screen name={routes.RIDER_EARNINGS} component={Earnings} options={{ title: 'Earnings', tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faWallet} size={19} color={color} /> }} />
    <Tab.Screen name={routes.RIDER_PROFILE} component={Profile} options={{ title: 'Profile', tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faUser} size={19} color={color} /> }} />
  </Tab.Navigator>;
}
