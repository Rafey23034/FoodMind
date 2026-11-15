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
  'NoMatchScreen', 'AIScreen', 'CompareDishesScreen', 'OrderPlacedScreen', 'TrackOrderScreen',
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

// ---- FoodMind AI chat ----

const allText = tree => JSON.stringify(tree.toJSON());
const chatInput = tree => tree.root.findAllByType(TextInput).find(element => element.props.accessibilityLabel === 'Message FoodMind AI');
const pressLabel = (tree, label) => act(async () => tree.root.findAll(element => element.props.accessibilityLabel === label && typeof element.props.onPress === 'function')[0].props.onPress());
async function say(tree, text) {
  await act(async () => chatInput(tree).props.onChangeText(text));
  await pressLabel(tree, 'Send message');
}
const aiReply = body => ({ ok: true, json: async () => body });

test('the AI chat stays on one screen and shows results in the conversation', async () => {
  global.fetch.mockResolvedValueOnce(aiReply({ reply: 'Pasta under Rs. 1,100 gives you a few choices.', title: 'Pasta under Rs. 1,100',
    recommendations: [{ dishId: 'creamy-pasta', reason: 'Creamy' }, { dishId: 'white-sauce-pasta', reason: 'Cheaper' }, { dishId: 'not-on-menu', reason: 'x' }],
    suggestions: ['Something spicier'] }));
  const { tree, navigation } = await mount(AIScreen);
  await say(tree, 'pasta under 1100');
  expect(navigation.navigate).not.toHaveBeenCalled();
  const text = allText(tree);
  expect(text).toContain('pasta under 1100');
  expect(text).toContain('Pasta under Rs. 1,100');
  expect(text).toContain('Creamy Chicken Pasta');
  expect(text).toContain('White Sauce Pasta');
  expect(text).toContain('Something spicier');
  expect(chatInput(tree).props.value).toBe('');

  // The follow-up carries the earlier turns, and both answers stay on screen.
  global.fetch.mockResolvedValueOnce(aiReply({ reply: 'The White Sauce Pasta is the cheaper one.', title: 'Cheaper pasta', recommendations: [{ dishId: 'white-sauce-pasta', reason: 'Rs. 950' }] }));
  await say(tree, 'cheaper ones');
  const body = JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(body.prompt).toBe('cheaper ones');
  expect(body.history).toEqual([
    { role: 'user', text: 'pasta under 1100' },
    { role: 'assistant', text: 'Pasta under Rs. 1,100 gives you a few choices.', dishIds: ['creamy-pasta', 'white-sauce-pasta', 'not-on-menu'] },
  ]);
  expect(allText(tree)).toContain('Pasta under Rs. 1,100 gives you a few choices.');
  expect(allText(tree)).toContain('The White Sauce Pasta is the cheaper one.');
  await cleanup(tree);
});

test('results open the dish and compare screens, and a new chat clears the conversation', async () => {
  const { tree, navigation } = await mount(AIScreen);
  await say(tree, 'creamy pasta');
  const card = tree.root.findAll(element => element.props.accessibilityLabel === 'Creamy Chicken Pasta, Rs. 1,050' && typeof element.props.onPress === 'function')[0];
  await act(async () => card.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith(routes.DISH_DETAIL, { dishId: 'creamy-pasta' });
  await press(tree, 'Compare');
  expect(navigation.navigate).toHaveBeenCalledWith(routes.COMPARE_DISHES, { dishIds: expect.arrayContaining(['creamy-pasta']) });
  await pressLabel(tree, 'Start a new chat');
  expect(allText(tree)).toContain('Let dinner find you');
  expect(allText(tree)).not.toContain('creamy pasta');
  await cleanup(tree);
});

test('without the AI service the chat uses the menu and remembers what was asked', async () => {
  const { tree } = await mount(AIScreen);
  await say(tree, 'pasta');
  expect(allText(tree)).toContain('FoodMind AI is offline');
  expect(allText(tree)).toContain('Chicken Alfredo');
  await say(tree, 'under 1000');
  // "under 1000" builds on "pasta": the second answer lists only White Sauce Pasta (Rs. 950).
  const cards = name => tree.root.findAll(element => element.props.accessibilityLabel?.startsWith?.(`${name},`) && typeof element.props.onPress === 'function').length;
  expect(cards('White Sauce Pasta')).toBe(2);
  expect(cards('Chicken Alfredo')).toBe(1);
  expect(allText(tree)).toContain('I found 1 dish on the menu for that');
  await cleanup(tree);
});

test('Ask AI from search sends its request into the chat once', async () => {
  const { tree } = await mount(AIScreen, setupStore(), { prompt: 'Vegan sushi under Rs. 300' });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(allText(tree)).toContain('Vegan sushi under Rs. 300');
  expect(allText(tree)).toContain("I couldn't find anything on the menu");
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
