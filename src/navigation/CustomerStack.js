import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { routes } from './routes';
import AppText from '../components/AppText';
import { useAuth } from '../state/AuthContext';
import HomeScreen from '../screens/customer/HomeScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import { COLORS } from '../theme/colors';
import { SPACING } from '../theme/spacing';

const Stack = createNativeStackNavigator();

function HomeActions() {
  const navigation = useNavigation();
  const { logout } = useAuth();

  return (
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" style={styles.action}
        onPress={() => navigation.navigate(routes.CART)}>
        <AppText variant="small" color={COLORS.primary}>Cart</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.action}
        onPress={() => navigation.navigate(routes.ORDERS)}>
        <AppText variant="small" color={COLORS.primary}>Orders</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" style={styles.action} onPress={logout}>
        <AppText variant="small" color={COLORS.primary}>Sign out</AppText>
      </Pressable>
    </View>
  );
}

const homeOptions = {
  headerShown: true,
  title: 'FoodMind',
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.text,
  headerRight: () => <HomeActions />,
};

export default function CustomerStack() {
  return (
    <Stack.Navigator initialRouteName={routes.HOME} screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.HOME} component={HomeScreen}
        options={homeOptions} />
      <Stack.Screen name={routes.CART} component={CartScreen} />
      <Stack.Screen name={routes.CHECKOUT} component={CheckoutScreen} />
      <Stack.Screen name={routes.ORDERS} component={OrdersScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: SPACING.md },
  action: { paddingVertical: SPACING.sm },
});
