import React from 'react';
import { useSelector } from 'react-redux';
import AuthStack from './AuthStack';
import CustomerStack from './CustomerStack';
import RestaurantStack from './RestaurantStack';
import RiderStack from './RiderStack';

export default function RootNavigator() {
  const user = useSelector(state => state.auth.user);

  // Only an account signed in as a partner gets the partner navigation stack.
  if (user?.role === 'partner') return <RestaurantStack />;
  if (user?.role === 'rider') return <RiderStack />;
  if (user?.role === 'customer') return <CustomerStack />;
  return <AuthStack />;
}
