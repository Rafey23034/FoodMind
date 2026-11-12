import React from 'react';
import { useDispatch } from 'react-redux';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { routes } from './routes';
import { signInWithPassword } from '../redux/session';
import { createAccount } from '../data/accounts';
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import RiderWelcomeScreen from '../screens/rider/RiderWelcomeScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const dispatch = useDispatch();

  // RootNavigator reads user.role and opens the correct stack automatically.
  function onLogin(email, password) {
    return dispatch(signInWithPassword(email, password));
  }

  function onRegister(account, role) {
    return createAccount(account, role);
  }

  return (
    <Stack.Navigator initialRouteName={routes.SPLASH} screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.SPLASH}>
        {({ navigation }) => <SplashScreen
          onGetStarted={() => navigation.navigate(routes.REGISTER)}
          onSignIn={() => navigation.navigate(routes.LOGIN)}
          onPartnerRegister={() => navigation.navigate(routes.REGISTER, { role: 'partner' })}
          onRiderRegister={() => navigation.navigate(routes.RIDER_WELCOME)} />}
      </Stack.Screen>
      <Stack.Screen name={routes.RIDER_WELCOME}>
        {({ navigation }) => <RiderWelcomeScreen onSignIn={() => navigation.navigate(routes.LOGIN)}
          onRegister={() => navigation.navigate(routes.REGISTER, { role: 'rider' })} />}
      </Stack.Screen>
      <Stack.Screen name={routes.LOGIN}>
        {props => <LoginScreen {...props} onLogin={onLogin} />}
      </Stack.Screen>
      <Stack.Screen name={routes.REGISTER}>
        {props => <RegisterScreen {...props}
          onRegister={(account, role) => onRegister(account, role)} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
