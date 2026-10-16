import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from './routes';
import { useAuth } from '../state/AuthContext';
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const { login, register } = useAuth();

  return (
    <Stack.Navigator initialRouteName={routes.SPLASH} screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.SPLASH}>
        {({ navigation }) => (
          <SplashScreen
            onGetStarted={() => navigation.navigate(routes.REGISTER)}
            onSignIn={() => navigation.navigate(routes.LOGIN)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name={routes.LOGIN}>
        {props => <LoginScreen {...props} onLogin={login} />}
      </Stack.Screen>
      <Stack.Screen name={routes.REGISTER}>
        {props => <RegisterScreen {...props} onRegister={register} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
