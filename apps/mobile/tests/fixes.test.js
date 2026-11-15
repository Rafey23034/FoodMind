import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth, { login, logout, updateUser } from '../src/redux/authSlice';
import cart, { addItem, selectBill, selectCartLines } from '../src/redux/cartSlice';
import orders, { placeOrder, selectMyOrders } from '../src/redux/ordersSlice';
import addresses, { saveAddress } from '../src/redux/addressesSlice';
import menu, { saveMenuItem, toggleMenuItem, selectAvailableItems } from '../src/redux/menuSlice';
import customer, { selectPoints } from '../src/redux/customerSlice';
import partner, { setPartnerOnline, loadPartnerExamples } from '../src/redux/partnerSlice';
import rider, { saveRiderProfile, saveRiderDocument, submitRiderApplication, riderApplicationProblem, selectRiderAccount, acceptRiderRequest, declineRiderRequest, advanceRiderDelivery, rateRiderDelivery } from '../src/redux/riderSlice';
import { checkout, advanceOrderDemo, cancelMyOrder } from '../src/redux/orderThunks';
import { startSession } from '../src/redux/session';
import { hydrateStore, startPersistence, SESSION_KEY } from '../src/storage/persistence';
import { dishes, makeCartItem, restaurant, formatPrice } from '../src/data/catalog';
import { partnerStage } from '../src/data/partnerOrders';
import { searchDishes, matchDishes, restaurantMeetsTime } from '../src/data/discovery';
import { plural } from '../src/utils/format';
import { CHAT_STARTERS, LOCAL_SUGGESTIONS, contextualPrompt, historyForServer, localChatReply } from '../src/data/aiChat';

jest.mock('../src/utils/partnerMedia', () => ({ choosePartnerDocument: jest.fn(), choosePartnerPhotos: jest.fn(), fileSize: () => '1 KB' }));
jest.mock('../src/utils/riderMedia', () => ({ chooseRiderDocument: jest.fn(), chooseRiderProof: jest.fn() }));

const reducer = { auth, cart, orders, addresses, menu, customer, partner, rider };
const makeStore = () => configureStore({ reducer });
const A = { name: 'Customer A', email: 'a@food.com', role: 'customer' };
const B = { name: 'Customer B', email: 'b@food.com', role: 'customer' };
const home = { id: 'home', label: 'Home', street: 'Demo Street', city: 'Lahore' };
function readyToOrder(store, user = A) {
  store.dispatch(login(user));
  store.dispatch(saveAddress({ userKey: user.email, address: home }));
  store.dispatch(addItem(makeCartItem(dishes[0])));
}
beforeEach(() => AsyncStorage.clear());

describe('account isolation', () => {
  test('each account keeps its own cart across sign-out and sign-in', () => {
    const store = makeStore();
    store.dispatch(login(A));
    store.dispatch(addItem(makeCartItem(dishes[0], 2)));
    store.dispatch(logout());
    expect(store.getState().cart.items).toEqual([]);
    store.dispatch(login(B));
    expect(store.getState().cart.items).toEqual([]);
    store.dispatch(addItem(makeCartItem(dishes[1])));
    store.dispatch(logout());
    store.dispatch(login(A));
    expect(store.getState().cart.items).toHaveLength(1);
    expect(store.getState().cart.items[0]).toMatchObject({ dishId: dishes[0].id, quantity: 2 });
  });

  test('customers only see the orders they placed', () => {
    const store = makeStore();
    readyToOrder(store, A);
    expect(store.dispatch(checkout()).ok).toBe(true);
    store.dispatch(logout());
    store.dispatch(login(B));
    expect(selectMyOrders(store.getState())).toHaveLength(0);
    expect(store.getState().orders.items).toHaveLength(1);
    store.dispatch(logout());
    store.dispatch(login(A));
    expect(selectMyOrders(store.getState())).toHaveLength(1);
    expect(selectMyOrders(store.getState())[0]).toMatchObject({ customerEmail: 'a@food.com', customerName: 'Customer A', partnerStage: 'new' });
  });

  test('profile edits update the session without replacing email or role', () => {
    const store = makeStore();
    store.dispatch(login(A));
    store.dispatch(updateUser({ name: 'Renamed', email: 'other@food.com', role: 'partner' }));
    expect(store.getState().auth.user).toEqual({ ...A, name: 'Renamed' });
  });
});

describe('checkout validation', () => {
  test('selectors are memoized so screens do not re-render on unrelated changes', () => {
    const store = makeStore();
    readyToOrder(store);
    const bill = selectBill(store.getState());
    const items = selectAvailableItems(store.getState());
    store.dispatch(saveAddress({ userKey: A.email, address: { ...home, id: 'work', label: 'Work' } }));
    expect(selectBill(store.getState())).toBe(bill);
    expect(selectAvailableItems(store.getState())).toBe(items);
  });

  test('a dish the partner hid is removed from the cart instead of being ordered', () => {
    const store = makeStore();
    readyToOrder(store);
    store.dispatch(addItem(makeCartItem(dishes[1])));
    store.dispatch(toggleMenuItem(dishes[0].id));
    expect(selectCartLines(store.getState()).find(line => line.dishId === dishes[0].id).available).toBe(false);
    const result = store.dispatch(checkout());
    expect(result.ok).toBe(false);
    expect(result.error).toContain('no longer available');
    expect(store.getState().cart.items.map(item => item.dishId)).toEqual([dishes[1].id]);
    expect(store.getState().orders.items).toHaveLength(0);
    expect(store.dispatch(checkout()).ok).toBe(true);
  });

  test('price changes are shown before ordering and the order uses the current price', () => {
    const store = makeStore();
    readyToOrder(store);
    store.dispatch(saveMenuItem({ ...dishes[0], price: dishes[0].price + 100 }));
    expect(selectBill(store.getState()).subtotal).toBe(dishes[0].price + 100);
    expect(store.dispatch(checkout()).error).toContain('prices changed');
    const result = store.dispatch(checkout());
    expect(result.ok).toBe(true);
    expect(store.getState().orders.items[0].items[0].price).toBe(dishes[0].price + 100);
  });

  test('ordering is blocked while the restaurant is offline', () => {
    const store = makeStore();
    readyToOrder(store);
    store.dispatch(setPartnerOnline({ userKey: restaurant.ownerEmail, online: false }));
    expect(store.dispatch(checkout())).toEqual({ ok: false, error: `${restaurant.name} is not accepting orders right now.` });
    store.dispatch(setPartnerOnline({ userKey: restaurant.ownerEmail, online: true }));
    expect(store.dispatch(checkout()).ok).toBe(true);
  });
});

describe('one order lifecycle for customer and partner', () => {
  test('demo progress keeps the partner stage in sync and awards points once on delivery', () => {
    const store = makeStore();
    readyToOrder(store);
    const { orderId } = store.dispatch(checkout());
    const stage = () => partnerStage(store.getState().orders.items[0]);
    store.dispatch(advanceOrderDemo(orderId));
    expect(store.getState().orders.items[0]).toMatchObject({ status: 'Preparing', partnerStage: 'preparing', prepMinutes: 20 });
    expect(store.getState().orders.items[0].readyAt).toBeTruthy();
    store.dispatch(advanceOrderDemo(orderId));
    expect(stage()).toBe('ready');
    store.dispatch(advanceOrderDemo(orderId));
    expect(stage()).toBe('picked-up');
    expect(store.getState().orders.items[0].rider).toMatchObject({ isDemo: true });
    store.dispatch(advanceOrderDemo(orderId));
    expect(store.getState().orders.items[0].status).toBe('Delivered');
    expect(store.dispatch(advanceOrderDemo(orderId))).toBe(false);
    expect(selectPoints(store.getState())).toBe(20);
  });

  test('customers can cancel only before the restaurant accepts', () => {
    const store = makeStore();
    readyToOrder(store);
    const { orderId } = store.dispatch(checkout());
    store.dispatch(advanceOrderDemo(orderId));
    expect(store.dispatch(cancelMyOrder(orderId))).toBe(false);
    store.dispatch(addItem(makeCartItem(dishes[1])));
    const second = store.dispatch(checkout()).orderId;
    expect(store.dispatch(cancelMyOrder(second))).toBe(true);
    expect(store.getState().orders.items.find(order => order.id === second)).toMatchObject({ status: 'Rejected', cancelledByCustomer: true });
  });
});

describe('saved data', () => {
  test('one unreadable entry is backed up and does not erase the others', async () => {
    await AsyncStorage.setItem('foodmind_addresses_by_user', JSON.stringify({ byUser: { 'a@food.com': [home] }, selectedByUser: { 'a@food.com': 'home' } }));
    await AsyncStorage.setItem('orders', '{not json');
    const store = makeStore();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await hydrateStore(store);
    warn.mockRestore();
    expect(store.getState().addresses.byUser['a@food.com']).toEqual([home]);
    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some(key => key.startsWith('orders.corrupt-'))).toBe(true);
    const persistence = startPersistence(store, AsyncStorage, 0);
    await persistence.stop();
    expect(JSON.parse(await AsyncStorage.getItem('foodmind_addresses_by_user')).byUser['a@food.com']).toEqual([home]);
  });

  test('the session and each account\'s cart are restored after a restart', async () => {
    const first = makeStore();
    const persistence = startPersistence(first, AsyncStorage, 0);
    readyToOrder(first, A);
    await persistence.stop();
    expect(JSON.parse(await AsyncStorage.getItem(SESSION_KEY)).user.email).toBe('a@food.com');
    const second = makeStore();
    await hydrateStore(second);
    expect(second.getState().auth.user.email).toBe('a@food.com');
    expect(second.getState().cart.items).toHaveLength(1);
    expect(second.getState().addresses.byUser['a@food.com']).toEqual([home]);
  });

  test('registered accounts survive a restart', async () => {
    jest.isolateModules(() => {
      const accounts = require('../src/data/accounts');
      expect(accounts.createAccount({ name: 'New', email: 'NEW@food.com', password: 'secret1' }, 'rider')).toEqual({ success: true, email: 'new@food.com' });
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    let accounts;
    jest.isolateModules(() => { accounts = require('../src/data/accounts'); });
    expect(accounts.signIn('new@food.com', 'secret1')).toBeNull();
    await accounts.loadAccounts();
    expect(accounts.signIn('new@food.com', 'secret1')).toEqual({ name: 'New', email: 'new@food.com', role: 'rider' });
  });
});

describe('rider fixes', () => {
  const R = { name: 'New Rider', email: 'newrider@food.com', role: 'rider' };
  test('an application without a vehicle is explained instead of silently ignored', () => {
    const store = makeStore();
    store.dispatch(startSession(R));
    store.dispatch(saveRiderProfile({ userKey: R.email, profile: { fullName: 'New Rider', phone: '03001234567', city: 'Lahore', vehicleRegistration: 'LEB-1', email: R.email } }));
    for (const kind of ['nationalId', 'drivingLicense', 'vehicleRegistration', 'profilePhoto']) store.dispatch(saveRiderDocument({ userKey: R.email, kind, document: { uri: `file://${kind}` } }));
    expect(riderApplicationProblem(selectRiderAccount(store.getState()))).toBe('Choose your delivery vehicle.');
    store.dispatch(submitRiderApplication({ userKey: R.email, at: '2026-11-01T00:00:00.000Z' }));
    expect(selectRiderAccount(store.getState()).application.status).toBe('Draft');
    store.dispatch(saveRiderProfile({ userKey: R.email, profile: { vehicle: 'Motorbike' } }));
    store.dispatch(submitRiderApplication({ userKey: R.email, at: '2026-11-01T00:00:00.000Z' }));
    expect(selectRiderAccount(store.getState()).application.status).toBe('Under review');
  });

  test('a completed delivery can be rated while another delivery is active', () => {
    const store = makeStore();
    store.dispatch(startSession(R));
    const key = R.email;
    const deliver = (requestId, deliveryId) => {
      store.dispatch(acceptRiderRequest({ userKey: key, requestId, deliveryId }));
      for (const to of ['to-customer', 'arrived', 'completed']) store.dispatch(advanceRiderDelivery({ userKey: key, to }));
    };
    deliver('RDR-1042', 'D1');
    store.dispatch(acceptRiderRequest({ userKey: key, requestId: 'RDR-1043', deliveryId: 'D2' }));
    expect(selectRiderAccount(store.getState()).activeDelivery.id).toBe('D2');
    store.dispatch(rateRiderDelivery({ userKey: key, deliveryId: 'D1', rating: 4, comment: 'Smooth pickup' }));
    expect(selectRiderAccount(store.getState()).deliveries[0]).toMatchObject({ id: 'D1', rating: 4 });
  });

  test('demo offers pay their fixed fee, a second one cannot start mid-delivery, and declines are remembered', () => {
    const store = makeStore();
    store.dispatch(startSession(R));
    const key = R.email;
    store.dispatch(acceptRiderRequest({ userKey: key, requestId: 'RDR-1043', deliveryId: 'D9' }));
    expect(selectRiderAccount(store.getState()).activeDelivery).toMatchObject({ id: 'D9', earnings: 330, status: 'to-pickup' });
    store.dispatch(acceptRiderRequest({ userKey: key, requestId: 'RDR-1044', deliveryId: 'D10' }));
    expect(selectRiderAccount(store.getState()).activeDelivery.id).toBe('D9');
    store.dispatch(declineRiderRequest({ userKey: key, requestId: 'RDR-1044' }));
    store.dispatch(declineRiderRequest({ userKey: key, requestId: 'RDR-1044' }));
    expect(selectRiderAccount(store.getState()).declinedRequests).toEqual(['RDR-1044']);
    expect(selectRiderAccount(store.getState())).not.toHaveProperty('bids');
  });
});

test('search, AI suggestions and formatting helpers', () => {
  expect(searchDishes(dishes, 'pasta').every(dish => dish.category === 'Pasta' || dish.tags.includes('pasta'))).toBe(true);
  expect(searchDishes(dishes, 'burger under 800').map(dish => dish.id)).toEqual(['zinger-burger']);
  // Every suggested craving on the AI screen returns at least one dish.
  for (const prompt of ['Creamy chicken pasta under Rs. 1,200', 'Spicy midnight comfort food', 'Spicy chicken under Rs. 900', 'Authentic biryani nearby']) {
    expect(matchDishes(dishes, prompt).length).toBeGreaterThan(0);
  }
  // "under 30 mins" is a time filter, not a Rs. 30 budget.
  expect(matchDishes(dishes, 'pasta under 30 mins')).toEqual([]);
  expect(restaurantMeetsTime('25-35 min', 30)).toBe(false);
  expect(restaurantMeetsTime('15-25 min', 30)).toBe(true);
  expect(formatPrice(1250)).toBe('Rs. 1,250');
  expect(formatPrice(1234567)).toBe('Rs. 1,234,567');
  expect(plural(1, 'item')).toBe('1 item');
  expect(plural(3, 'item')).toBe('3 items');
});

test('offline AI chat: starters and suggestions return dishes, and follow-ups keep context', () => {
  for (const { text } of CHAT_STARTERS) expect(localChatReply(dishes, text).recommendations.length).toBeGreaterThan(0);
  for (const text of LOCAL_SUGGESTIONS.filter(value => value !== 'Cheaper options')) {
    expect(localChatReply(dishes, text).recommendations.length).toBeGreaterThan(0);
  }
  const history = [{ role: 'user', text: 'creamy pasta' }, { role: 'assistant', text: 'Here.', dishIds: ['creamy-pasta', 'chicken-alfredo', 'white-sauce-pasta'] }];
  expect(contextualPrompt('under 1000', history)).toBe('pasta under 1000');
  expect(contextualPrompt('Cheaper options', history, dishes)).toBe('pasta under 1099');
  expect(localChatReply(dishes, 'Cheaper options', history).recommendations.map(item => item.dishId)).toEqual(['creamy-pasta', 'white-sauce-pasta']);
  expect(contextualPrompt('burgers', history)).toBe('burgers');
  expect(localChatReply(dishes, 'hello').recommendations).toEqual([]);
  expect(localChatReply(dishes, 'pasta under 30 mins').reply).toContain('under 30 minutes');
  expect(localChatReply(dishes, 'pasta').suggestions[0]).toBe('Cheaper options');
  expect(historyForServer([
    { role: 'user', text: 'pasta' },
    { role: 'assistant', status: 'done', reply: 'Here.', recommendations: [{ dishId: 'creamy-pasta' }] },
    { role: 'assistant', status: 'loading' },
  ])).toEqual([{ role: 'user', text: 'pasta' }, { role: 'assistant', text: 'Here.', dishIds: ['creamy-pasta'] }]);
});

// ---- Every screen renders without stray "\n" / "/n" text ----

function collectText(node, out = []) {
  if (node == null) return out;
  if (typeof node === 'string') { out.push(node); return out; }
  if (Array.isArray(node)) { node.forEach(child => collectText(child, out)); return out; }
  if (node.type === 'TextInput') return out; // typed values are not UI copy
  collectText(node.children, out);
  return out;
}
function screenStore(user) {
  const store = makeStore();
  store.dispatch(startSession(user));
  if (user.role === 'customer') {
    store.dispatch(saveAddress({ userKey: user.email, address: home }));
    store.dispatch(addItem(makeCartItem(dishes[0])));
    store.dispatch(placeOrder({ id: 'FM123', customerEmail: user.email, restaurant: restaurant.name, status: 'Delivered', partnerStage: 'delivered', items: [makeCartItem(dishes[0]), makeCartItem(dishes[1])], total: 2000, payment: 'cash', address: 'Demo Street, Lahore', createdAt: '2026-10-25T00:00:00.000Z' }));
  }
  if (user.role === 'partner') store.dispatch(loadPartnerExamples({ userKey: user.email, at: '2026-10-25T00:00:00.000Z' }));
  return store;
}
const nav = () => ({ navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(), reset: jest.fn(), setParams: jest.fn(), canGoBack: () => true });
const CUSTOMER = ['HomeScreen', 'SearchScreen', 'CartScreen', 'CheckoutScreen', 'DishDetailScreen', 'RestaurantScreen', 'MenuScreen', 'OrdersScreen',
  'OrderDetailsScreen', 'TrackOrderScreen', 'OrderPlacedScreen', 'RateOrderScreen', 'AIScreen', 'CompareDishesScreen',
  'NoMatchScreen', 'SettingsScreen', 'EditProfileScreen', 'RewardsScreen',
  'MyReviewsScreen', 'HelpSupportScreen', 'AddressBookScreen'].map(name => ['customer', name, () => require(`../src/screens/customer/${name}`).default]);
const PARTNER = ['PartnerPortalScreen', 'ManageMenu', 'MenuItemEditorScreen', 'PartnerOrdersScreen', 'PartnerNewOrderScreen', 'PartnerPreparingOrderScreen',
  'PartnerOrderStatusScreen', 'PartnerReviewsScreen', 'PartnerStoreScreen', 'EditRestaurantProfileScreen', 'PartnerRegistrationScreen',
  'PartnerDocumentsScreen', 'PartnerUnderReviewScreen'].map(name => ['partner', name, () => require(`../src/screens/restaurant/${name}`).default]);
const RIDER = [['RiderWorkScreens', ['RiderJobsScreen', 'RiderRequestDetailsScreen', 'RiderEarningsScreen', 'RiderHistoryScreen', 'RiderRateScreen', 'RiderProfileScreen']],
  ['RiderDeliveryScreens', ['RiderActiveDeliveryScreen', 'RiderToPickupScreen', 'RiderConfirmPickupScreen', 'RiderToCustomerScreen', 'RiderUpdateStatusScreen', 'RiderProofScreen', 'RiderCompletedScreen', 'RiderSupportScreen']],
  ['RiderRegistrationScreens', ['RiderRegistrationScreen', 'RiderDocumentsScreen', 'RiderUnderReviewScreen', 'RiderEditProfileScreen', 'RiderDocumentsVehicleScreen']]]
  .flatMap(([file, names]) => names.map(name => ['rider', name, () => require(`../src/screens/rider/${file}`)[name]]));
const AUTH = [['customer', 'LoginScreen', () => require('../src/screens/auth/LoginScreen').default],
  ['customer', 'RegisterScreen', () => require('../src/screens/auth/RegisterScreen').default],
  ['customer', 'SplashScreen', () => require('../src/screens/auth/SplashScreen').default],
  ['customer', 'RiderWelcomeScreen', () => require('../src/screens/rider/RiderWelcomeScreen').default]];
const USERS = { customer: { name: 'Demo Customer', email: 'demo@food.com', role: 'customer' }, partner: { name: 'Demo Owner', email: 'partner@food.com', role: 'partner' }, rider: { name: 'Tariq Mehmood', email: 'rider@food.com', role: 'rider' } };

test.each([...CUSTOMER, ...PARTNER, ...RIDER, ...AUTH])('%s %s shows no stray "\\n" or "/n" text', async (role, name, load) => {
  const Screen = load();
  const store = screenStore(USERS[role]);
  const params = { orderId: role === 'partner' ? 'DEMO-1034' : 'FM123', dishId: dishes[0].id, requestId: 'RDR-1042', deliveryId: 'DEMO-DEL-240', prompt: 'Creamy chicken pasta under Rs. 1,200' };
  let tree;
  await act(async () => { tree = renderer.create(<Provider store={store}><SafeAreaProvider><Screen navigation={nav()} route={{ params }} /></SafeAreaProvider></Provider>); });
  const text = collectText(tree.toJSON()).join(' ');
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toMatch(/\\n|(^|[^a-z])\/n\b|\n/i);
  await act(async () => tree.unmount());
});

// ---- Rider jobs: fixed-fee offers, no bidding ----

async function renderRider(Screen, user, params = {}) {
  const store = makeStore();
  store.dispatch(startSession(user));
  const navigation = nav();
  let tree;
  await act(async () => { tree = renderer.create(<Provider store={store}><SafeAreaProvider><Screen navigation={navigation} route={{ params }} /></SafeAreaProvider></Provider>); });
  return { tree, store, navigation, text: () => collectText(tree.toJSON()).join(' ') };
}

test('local demo riders see sample offers with a fixed fee and can accept or decline them', async () => {
  const { RiderJobsScreen, RiderRequestDetailsScreen } = require('../src/screens/rider/RiderWorkScreens');
  const jobs = await renderRider(RiderJobsScreen, USERS.rider);
  expect(jobs.text()).toContain('Delivery offers near you');
  expect(jobs.text()).not.toMatch(/bid/i);
  await act(async () => jobs.tree.unmount());

  const details = await renderRider(RiderRequestDetailsScreen, USERS.rider, { requestId: 'RDR-1043' });
  expect(details.text()).toContain('Accept Delivery · Rs. 330');
  expect(details.text()).not.toMatch(/bid/i);
  const accept = details.tree.root.findAll(node => typeof node.props.onPress === 'function' && collectText(node.children).join('').startsWith('Accept Delivery'))[0];
  await act(async () => accept.props.onPress());
  expect(selectRiderAccount(details.store.getState()).activeDelivery).toMatchObject({ requestId: 'RDR-1043', earnings: 330 });
  expect(details.navigation.replace).toHaveBeenCalledWith('RiderActiveDelivery', expect.any(Object));
  await act(async () => details.tree.unmount());
});

test('riders signed in through the API wait for a dispatched offer instead of browsing samples', async () => {
  const { RiderJobsScreen } = require('../src/screens/rider/RiderWorkScreens');
  const jobs = await renderRider(RiderJobsScreen, { ...USERS.rider, accessToken: 'a1', refreshToken: 'r1' });
  expect(jobs.text()).toContain('Waiting for an offer');
  expect(jobs.text()).not.toContain('Delivery offers near you');
  await act(async () => jobs.tree.unmount());
});
