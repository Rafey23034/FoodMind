import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { routes } from './routes';
import { colors } from '../theme';
import * as S from '../screens/customer';
import { makePlaceholder } from '../screens/placeholder';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                // tabBarActiveTintColor: 
                // tabBarIcon: 
            })}
        >
            <Tab.Screen name={routes.HOME} component={S.HomeScreen} />
            {/* placeholders to be replaced later */}
            <Tab.Screen name={routes.SEARCH} component={makePlaceholder('Search')} />
            <Tab.Screen name={routes.ORDERS} component={makePlaceholder('Orders')} />
            <Tab.Screen name={routes.PROFILE} component={makePlaceholder('Profile')} />
        </Tab.Navigator>
    )
}

export default function CustomerNavigation() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name={routes.MAIN_TABS} component={MainTabs} />
            {/* placeholders to be replaced later */}
            <Stack.Screen name={routes.RESTAURANT_DETAIL} component={makePlaceholder('Restraunt Detail')} />
            <Stack.Screen name={routes.DISH_DETAIL} component={makePlaceholder('Dish Detail')} />
            <Stack.Screen name={routes.CART} component={makePlaceholder('Cart')} />
            <Stack.Screen name={routes.CHECKOUT} component={makePlaceholder('Checkout')} />
        </Stack.Navigator>
    )
}