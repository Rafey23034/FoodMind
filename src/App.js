import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import AppStorage from './storage/AppStorage';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppStorage>
          <NavigationContainer><RootNavigator /></NavigationContainer>
        </AppStorage>
      </SafeAreaProvider>
    </Provider>
  );
}
