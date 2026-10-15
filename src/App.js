import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './state/AuthContext';
import SplashScreen from './screens/auth/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import HomeScreen from './screens/customer/HomeScreen';
import { COLORS } from './theme/colors';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, login, register } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <>
            <Stack.Screen name="Splash">
              {({ navigation }) => (
                <SplashScreen
                  onGetStarted={() => navigation.navigate('Login')}
                  onSignIn={() => navigation.navigate('Login')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={login} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} onRegister={register} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <AppNavigator />
        {/* Root Navigator to be used  */}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
