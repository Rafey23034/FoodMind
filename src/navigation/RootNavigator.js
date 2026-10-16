import React from 'react';
import { useAuth } from '../state/AuthContext';
import AuthStack from './AuthStack';
import CustomerStack from './CustomerStack';

export default function RootNavigator() {
  const { user } = useAuth();

  return user ? <CustomerStack /> : <AuthStack />;
}
