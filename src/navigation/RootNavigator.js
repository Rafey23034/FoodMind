import React from 'react';
import { useSession } from '../state/hooks';
import { SplashScreen } from '../screens/auth';
import AuthStack from './AuthStack';
import CustomerNavigator from './CustomerNavigator';
import RestaurantStack from './RestaurantStack';

const DEV_ROLE_OVERRIDE = null;

export default function RootNavigator() {
  const { role, loading } = useSession();
  const activeRole = DEV_ROLE_OVERRIDE || role;

  if (loading) return <SplashScreen />;
  if (activeRole === 'customer') return <CustomerNavigator />;
  if (activeRole === 'restaurant') return <RestaurantStack />;
  return <AuthStack />;
}