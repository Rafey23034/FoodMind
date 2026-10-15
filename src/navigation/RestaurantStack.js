import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from './routes';
import { makePlaceholder } from '../screens/placeholder';

const Stack = createNativeStackNavigator();

export default function RestaurantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.DASHBOARD} component={makePlaceholder('Dashboard')} />
      <Stack.Screen name={routes.MANAGE_MENU} component={makePlaceholder('Manage Menu')} />
    </Stack.Navigator>
  );
}