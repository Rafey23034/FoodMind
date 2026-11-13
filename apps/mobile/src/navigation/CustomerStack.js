import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from '../components/BottomTabs';
import { routes } from './routes';
import HomeScreen from '../screens/customer/HomeScreen';
import SearchScreen from '../screens/customer/SearchScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import MenuScreen from '../screens/customer/MenuScreen';
import CartScreen from '../screens/customer/CartScreen';
import AIScreen from '../screens/customer/AIScreen';
import RestaurantScreen from '../screens/customer/RestaurantScreen';
import DishDetailScreen from '../screens/customer/DishDetailScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import AddressBookScreen from '../screens/customer/AddressBookScreen';
import SettingsScreen from '../screens/customer/SettingsScreen';
import NoMatchScreen from '../screens/customer/NoMatchScreen';
import AIRecommendationsScreen from '../screens/customer/AIRecommendationsScreen';
import CompareDishesScreen from '../screens/customer/CompareDishesScreen';
import OrderPlacedScreen from '../screens/customer/OrderPlacedScreen';
import TrackOrderScreen from '../screens/customer/TrackOrderScreen';
import OrderDetailsScreen from '../screens/customer/OrderDetailsScreen';
import RateOrderScreen from '../screens/customer/RateOrderScreen';
import RewardsScreen from '../screens/customer/RewardsScreen';
import CommunityDeliveryScreen from '../screens/customer/CommunityDeliveryScreen';
import RiderOffersScreen from '../screens/customer/RiderOffersScreen';
import DeliveryProgressScreen from '../screens/customer/DeliveryProgressScreen';
import EditProfileScreen from '../screens/customer/EditProfileScreen';
import MyReviewsScreen from '../screens/customer/MyReviewsScreen';
import HelpSupportScreen from '../screens/customer/HelpSupportScreen';

const Stack = createNativeStackNavigator();
const sharedScreens = [
  [routes.AI, AIScreen],
  [routes.RESTAURANT_DETAIL, RestaurantScreen],
  [routes.DISH_DETAIL, DishDetailScreen],
  [routes.ADDRESSES, AddressBookScreen],
  [routes.SETTINGS, SettingsScreen],
  [routes.NO_MATCH, NoMatchScreen],
  [routes.AI_RECOMMENDATIONS, AIRecommendationsScreen],
  [routes.COMPARE_DISHES, CompareDishesScreen],
  [routes.ORDER_PLACED, OrderPlacedScreen],
  [routes.TRACK_ORDER, TrackOrderScreen],
  [routes.ORDER_DETAILS, OrderDetailsScreen],
  [routes.RATE_ORDER, RateOrderScreen],
  [routes.REWARDS, RewardsScreen],
  [routes.COMMUNITY_DELIVERY, CommunityDeliveryScreen],
  [routes.RIDER_OFFERS, RiderOffersScreen],
  [routes.DELIVERY_PROGRESS, DeliveryProgressScreen],
  [routes.EDIT_PROFILE, EditProfileScreen],
  [routes.MY_REVIEWS, MyReviewsScreen],
  [routes.HELP_SUPPORT, HelpSupportScreen],
];

// Details stay inside the originating tab, so each tab retains its own history.
// Shared routes allow browsing, tracking and support without a second tab bar.
function CustomerTabStack({ root, Screen, profile = false, cart = false }) {
  return <Stack.Navigator initialRouteName={root} screenOptions={{ headerShown: false }}>
    <Stack.Screen name={root} component={Screen} />
    {profile ? <Stack.Screen name={routes.ORDERS} component={OrdersScreen} /> : null}
    {cart ? <Stack.Screen name={routes.CHECKOUT} component={CheckoutScreen} /> : null}
    {sharedScreens.map(([name, component]) => <Stack.Screen key={name} name={name} component={component} />)}
  </Stack.Navigator>;
}

function HomeStack() { return <CustomerTabStack root={routes.HOME_ROOT} Screen={HomeScreen} />; }
function SearchStack() { return <CustomerTabStack root={routes.SEARCH_ROOT} Screen={SearchScreen} />; }
function CartStack() { return <CustomerTabStack root={routes.CART_ROOT} Screen={CartScreen} cart />; }
function ProfileStack() { return <CustomerTabStack root={routes.PROFILE_ROOT} Screen={MenuScreen} profile />; }

export default function CustomerStack() {
  return <BottomTabs Home={HomeStack} Search={SearchStack} Cart={CartStack} Profile={ProfileStack} />;
}
