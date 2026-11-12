import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import authReducer, { login } from '../src/redux/authSlice';
import cartReducer, { addItem } from '../src/redux/cartSlice';
import ordersReducer, { placeOrder } from '../src/redux/ordersSlice';
import addressesReducer, { saveAddress } from '../src/redux/addressesSlice';
import menuReducer from '../src/redux/menuSlice';
import customerReducer, { saveDelivery, selectPoints } from '../src/redux/customerSlice';
import { dishes, makeCartItem } from '../src/data/catalog';
import { riderOffers } from '../src/data/riderOffers';
import { routes } from '../src/navigation/routes';
import AIScreen from '../src/screens/customer/AIScreen';
import CheckoutScreen from '../src/screens/customer/CheckoutScreen';
import AIRecommendationsScreen from '../src/screens/customer/AIRecommendationsScreen';
import RateOrderScreen from '../src/screens/customer/RateOrderScreen';
import RiderOffersScreen from '../src/screens/customer/RiderOffersScreen';
import CommunityDeliveryScreen from '../src/screens/customer/CommunityDeliveryScreen';

const order = { id: 'FM123', customerEmail: 'demo@food.com', restaurant: 'Urban Bites', status: 'Delivered', items: [makeCartItem(dishes[0])], total: 1250, payment: 'cash', address: 'Demo Street, Lahore', createdAt: '2026-10-25T00:00:00.000Z' };
const delivery = { id: 'CD123', shop: 'Demo Shop', location: 'Pickup Street', address: 'Demo Street', items: [{ id: 'one', name: 'Biryani', price: 550, quantity: 2 }], status: 'Heading to shop', rider: riderOffers[0] };
function setupStore() {
  const store = configureStore({ reducer: { auth: authReducer, cart: cartReducer, orders: ordersReducer, addresses: addressesReducer, menu: menuReducer, customer: customerReducer } });
  store.dispatch(login({ name: 'Demo Customer', email: 'demo@food.com', role: 'customer' }));
  store.dispatch(placeOrder(order));
  store.dispatch(saveDelivery({ userKey: 'demo@food.com', delivery }));
  return store;
}
function nav() { return { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), reset: jest.fn() }; }
async function mount(Screen, store = setupStore(), params = {}) {
  const navigation = nav();
  let tree;
  await act(async () => { tree = renderer.create(<Provider store={store}><SafeAreaProvider><Screen navigation={navigation} route={{ params }} /></SafeAreaProvider></Provider>); });
  return { tree, navigation, store };
}
function press(tree, label) {
  const button = tree.root.findAll(element => typeof element.props.onPress === 'function')
    .find(element => element.findAll(text => text.props.children === label).length > 0);
  if (!button) throw new Error(`Button not found: ${label}. Rendered: ${JSON.stringify(tree.toJSON()).slice(0, 500)}`);
  return act(async () => { button.props.onPress(); });
}
async function cleanup(tree) { await act(async () => tree.unmount()); }

test.each([
  'NoMatchScreen', 'AIRecommendationsScreen', 'CompareDishesScreen', 'OrderPlacedScreen', 'TrackOrderScreen',
  'OrderDetailsScreen', 'RateOrderScreen', 'RewardsScreen', 'CommunityDeliveryScreen', 'RiderOffersScreen',
  'DeliveryProgressScreen', 'EditProfileScreen', 'MyReviewsScreen', 'HelpSupportScreen',
])('%s renders with saved frontend data', async name => {
  const Screen = require(`../src/screens/customer/${name}`).default;
  const { tree } = await mount(Screen, setupStore(), { orderId: order.id, deliveryId: delivery.id });
  expect(tree.toJSON()).toBeTruthy();
  await cleanup(tree);
});

test.each(['OrderPlacedScreen', 'TrackOrderScreen', 'OrderDetailsScreen', 'RateOrderScreen', 'RiderOffersScreen', 'DeliveryProgressScreen'])('%s handles missing route data safely', async name => {
  const Screen = require(`../src/screens/customer/${name}`).default;
  const { tree } = await mount(Screen);
  expect(tree.toJSON()).toBeTruthy();
  await cleanup(tree);
});

test('AI request connects to recommendations with the entered prompt', async () => {
  const { tree, navigation } = await mount(AIScreen);
  await act(async () => tree.root.findByType(TextInput).props.onChangeText('creamy pasta under Rs. 1200'));
  await press(tree, 'Find My Food  →');
  expect(navigation.navigate).toHaveBeenCalledWith(routes.AI_RECOMMENDATIONS, { prompt: 'creamy pasta under Rs. 1200', preferences: [] });
  await cleanup(tree);
});

test('recommendations add the matching dish to the existing cart', async () => {
  const { tree, store, navigation } = await mount(AIRecommendationsScreen);
  await press(tree, '+  Add to Cart');
  expect(store.getState().cart.items[0].dishId).toBe('creamy-pasta');
  expect(navigation.navigate).toHaveBeenCalledWith(routes.CART, { screen: routes.CART_ROOT, pop: true });
  await cleanup(tree);
});

test('an unmatched AI request can reset to the unfiltered search screen', async () => {
  const { tree, navigation } = await mount(AIRecommendationsScreen, setupStore(), { prompt: 'Vegan sushi under Rs. 300', preferences: ['fast'] });
  await press(tree, 'Reset Filters');
  expect(navigation.navigate).toHaveBeenCalledWith(routes.SEARCH, { screen: routes.SEARCH_ROOT, params: { reset: expect.any(Number) }, pop: true });
  await cleanup(tree);
});

test('a community delivery address can be cleared and validated after prefilling', async () => {
  const store = setupStore();
  store.dispatch(saveAddress({ userKey: 'demo@food.com', address: { id: 'home', label: 'Home', street: 'Demo Street', city: 'Lahore' } }));
  const { tree, navigation } = await mount(CommunityDeliveryScreen, store);
  const input = () => tree.root.findAllByType(TextInput).find(element => element.props.placeholder === 'House, street, area, city');
  expect(input().props.value).toBe('Demo Street, Lahore');
  await act(async () => input().props.onChangeText(''));
  expect(input().props.value).toBe('');
  await press(tree, 'Send Request to Nearby Riders →');
  expect(navigation.navigate).not.toHaveBeenCalled();
  await cleanup(tree);
});

test('checkout validates its address and routes a saved order to confirmation', async () => {
  const store = setupStore();
  store.dispatch(addItem(makeCartItem(dishes[0])));
  const { tree, navigation } = await mount(CheckoutScreen, store);
  const submit = tree.root.findAll(element => typeof element.props.onPress === 'function').find(element => element.findAll(text => typeof text.props.children === 'string' && text.props.children.startsWith('Place Order')).length > 0);
  await act(async () => submit.props.onPress());
  expect(navigation.reset).not.toHaveBeenCalled();
  await act(async () => store.dispatch(saveAddress({ userKey: 'demo@food.com', address: { id: 'home', label: 'Home', street: 'Demo Street', city: 'Lahore' } })));
  await act(async () => submit.props.onPress());
  expect(store.getState().cart.items).toHaveLength(0);
  const placed = store.getState().orders.items[0];
  expect(placed.status).toBe('Confirmed');
  expect(navigation.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: routes.CART_ROOT }, { name: routes.ORDER_PLACED, params: { orderId: placed.id } }] });
  await cleanup(tree);
});

test('rating submission saves a review and awards 20 points', async () => {
  const { tree, store, navigation } = await mount(RateOrderScreen, setupStore(), { orderId: order.id });
  const star = tree.root.find(element => element.props.accessibilityLabel === 'Dish rating: 5 stars' && typeof element.props.onPress === 'function');
  await act(async () => star.props.onPress());
  await press(tree, 'Submit Review · +20 Points');
  expect(store.getState().customer.byUser['demo@food.com'].reviews[0].rating).toBe(5);
  expect(selectPoints(store.getState())).toBe(20);
  expect(navigation.replace).toHaveBeenCalledWith(routes.MY_REVIEWS);
  await cleanup(tree);
});

test('selecting a rider connects the offer to the delivery progress route', async () => {
  const store = setupStore();
  store.dispatch(saveDelivery({ userKey: 'demo@food.com', delivery: { ...delivery, rider: null, status: 'Requested' } }));
  const { tree, navigation } = await mount(RiderOffersScreen, store, { deliveryId: delivery.id });
  await press(tree, 'Select rider');
  expect(store.getState().customer.byUser['demo@food.com'].deliveries[0].rider.id).toBe('rider-c');
  expect(navigation.replace).toHaveBeenCalledWith(routes.DELIVERY_PROGRESS, { deliveryId: delivery.id });
  await cleanup(tree);
});
