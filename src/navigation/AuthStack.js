import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from './routes';
import { LoginScreen, RegisterScreen } from '../screens/auth';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.LOGIN} component={LoginScreen} />
      <Stack.Screen name={routes.REGISTER} component={RegisterScreen} />
    </Stack.Navigator>
  );
}
