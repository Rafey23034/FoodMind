import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import { AuthProvider } from './state/AuthContext';
import { ShopProvider } from './state/ShopContext';
import RootNavigator from './navigation/RootNavigator';
import { COLORS } from './theme/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ShopProvider>
          <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </ShopProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
