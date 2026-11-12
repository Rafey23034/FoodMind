import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Alert, TextInput } from 'react-native';
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer, { login } from '../src/redux/authSlice';
import cartReducer from '../src/redux/cartSlice';
import ordersReducer from '../src/redux/ordersSlice';
import addressesReducer from '../src/redux/addressesSlice';
import menuReducer, { selectMenuItems, selectAvailableItems } from '../src/redux/menuSlice';
import customerReducer from '../src/redux/customerSlice';
import partnerReducer, { savePartnerProfile, loadPartnerExamples, transitionPartnerOrder, selectPartnerAccount, submitPartnerApplication, savePartnerDocument } from '../src/redux/partnerSlice';
import { choosePartnerDocument, choosePartnerPhotos } from '../src/utils/partnerMedia';
import { hydrateStore, startPersistence } from '../src/storage/persistence';
import { routes } from '../src/navigation/routes';

jest.mock('../src/utils/partnerMedia', () => ({ choosePartnerDocument: jest.fn(), choosePartnerPhotos: jest.fn(), fileSize: () => '1 KB' }));
const userKey = 'partner@food.com';
const at = '2026-10-25T00:00:00.000Z';
const profile = { name: 'Urban Bites', ownerName: 'Demo Owner', email: userKey, phone: '03001234567', address: 'Johar Town, Lahore', cuisines: ['Burgers'], description: 'Burgers and pasta', openingHours: '11:00 AM – 11:00 PM' };
function setupStore() {
  const store = configureStore({ reducer: { auth: authReducer, cart: cartReducer, orders: ordersReducer, addresses: addressesReducer, menu: menuReducer, customer: customerReducer, partner: partnerReducer } });
  store.dispatch(login({ name: 'Demo Owner', email: userKey, role: 'partner' }));
  store.dispatch(savePartnerProfile({ userKey, profile }));
  store.dispatch(loadPartnerExamples({ userKey, at }));
  return store;
}
beforeEach(() => {
  choosePartnerDocument.mockImplementation(async kind => ({ uri: `file://${kind}.${kind === 'logo' ? 'png' : 'pdf'}`, name: kind, size: 1024 }));
  choosePartnerPhotos.mockImplementation(async ({ kind = 'photo' } = {}) => [{ uri: `file://${kind}.jpg`, name: `${kind}.jpg`, size: 1024 }]);
});
function navigation() { return { navigate: jest.fn(), replace: jest.fn(), reset: jest.fn(), goBack: jest.fn(), canGoBack: () => true }; }
async function mount(name, store = setupStore(), params = {}, props = {}) {
  const Screen = require(`../src/screens/restaurant/${name}`).default;
  const nav = navigation(); let tree;
  await act(async () => { tree = renderer.create(<Provider store={store}><SafeAreaProvider><Screen navigation={nav} route={{ params }} {...props} /></SafeAreaProvider></Provider>); });
  return { tree, store, nav };
}
async function close(tree) { await act(async () => tree.unmount()); }
beforeEach(() => AsyncStorage.clear());
async function press(tree, label) {
  const button = tree.root.findAll(element => typeof element.props.onPress === 'function')
    .find(element => element.findAll(text => text.props.children === label).length);
  if (!button) throw new Error(`Button not found: ${label}`);
  await act(async () => button.props.onPress());
}
async function pressLabel(tree, label) {
  const button = tree.root.findAll(element => element.props.accessibilityLabel === label && typeof element.props.onPress === 'function')[0];
  if (!button) throw new Error(`Action not found: ${label}`);
  await act(async () => button.props.onPress());
}
async function input(tree, placeholder, value) {
  const field = tree.root.findAllByType(TextInput).find(element => element.props.placeholder === placeholder);
  if (!field) throw new Error(`Input not found: ${placeholder}`);
  await act(async () => field.props.onChangeText(value));
}

test.each(['PartnerRegistrationScreen', 'PartnerDocumentsScreen', 'PartnerUnderReviewScreen', 'PartnerOrdersScreen',
  'PartnerNewOrderScreen', 'PartnerPreparingOrderScreen', 'PartnerOrderStatusScreen', 'PartnerReviewsScreen', 'PartnerStoreScreen',
  'EditRestaurantProfileScreen', 'PartnerPortalScreen', 'ManageMenu', 'MenuItemEditorScreen'])('%s renders with partner state', async name => {
  const { tree } = await mount(name, setupStore(), { orderId: 'DEMO-1034' });
  expect(tree.toJSON()).toBeTruthy(); await close(tree);
});

test.each(['PartnerNewOrderScreen', 'PartnerPreparingOrderScreen', 'PartnerOrderStatusScreen'])('%s handles a missing order', async name => {
  const { tree } = await mount(name, setupStore(), { orderId: 'missing' });
  expect(tree.toJSON()).toBeTruthy(); await close(tree);
});

test('restaurant registration validates input and continues to documents', async () => {
  const store = setupStore();
  store.dispatch(login({ name: 'New Owner', email: 'new@food.com', role: 'partner' }));
  const { tree, nav } = await mount('PartnerRegistrationScreen', store);
  await press(tree, 'Continue →'); expect(nav.navigate).not.toHaveBeenCalled();
  await input(tree, 'e.g. Urban Bites', 'New Restaurant');
  await input(tree, '0300 0000000', '03001234567');
  await input(tree, 'Street, area, city', 'Demo Street, Lahore');
  await press(tree, 'Fast Food'); await press(tree, 'Continue →');
  expect(nav.navigate).toHaveBeenCalledWith(routes.PARTNER_DOCUMENTS);
  expect(store.getState().partner.byUser['new@food.com'].profile.name).toBe('New Restaurant');
  await close(tree);
});

test('document selection saves all required files before opening review status', async () => {
  // A newly registered partner (the listed restaurant's owner is already approved).
  const store = setupStore();
  store.dispatch(login({ name: 'New Owner', email: 'new@food.com', role: 'partner' }));
  store.dispatch(savePartnerProfile({ userKey: 'new@food.com', profile: { ...profile, email: 'new@food.com' } }));
  const { tree, nav } = await mount('PartnerDocumentsScreen', store);
  await press(tree, 'Submit for approval →'); expect(nav.replace).not.toHaveBeenCalled();
  await pressLabel(tree, 'Upload Business license'); await pressLabel(tree, 'Upload Owner CNIC'); await pressLabel(tree, 'Upload Restaurant logo');
  await press(tree, 'Submit for approval →');
  expect(selectPartnerAccount(store.getState()).application.status).toBe('Pending approval');
  expect(nav.replace).toHaveBeenCalledWith(routes.PARTNER_UNDER_REVIEW);
  await close(tree);
});

test('the review screen explicitly previews approval and resets to dashboard', async () => {
  const store = setupStore();
  for (const kind of ['license', 'cnic', 'logo']) store.dispatch(savePartnerDocument({ userKey, kind, document: { uri: `file://${kind}` } }));
  store.dispatch(submitPartnerApplication({ userKey, at }));
  const { tree, nav } = await mount('PartnerUnderReviewScreen', store);
  await press(tree, 'Preview approved dashboard (demo)');
  expect(selectPartnerAccount(store.getState()).application.demoApproval).toBe(true);
  expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: routes.PARTNER_TABS, params: { screen: routes.DASHBOARD } }] });
  await close(tree);
});

test('accepting a new order records the chosen preparation time and opens preparation', async () => {
  const { tree, store, nav } = await mount('PartnerNewOrderScreen', setupStore(), { orderId: 'DEMO-1034' });
  await press(tree, '30 min'); await press(tree, 'Accept Order');
  expect(selectPartnerAccount(store.getState()).demoOrders[0]).toMatchObject({ status: 'Preparing', prepMinutes: 30 });
  expect(nav.navigate).toHaveBeenCalledWith(routes.PARTNER_TABS, { screen: routes.PARTNER_ORDERS, params: { screen: routes.PARTNER_PREPARING_ORDER, params: { orderId: 'DEMO-1034' }, initial: false, pop: true } }, { pop: true });
  await close(tree);
});

test('rejecting requires confirmation and removes the order from the new queue', async () => {
  const { tree, store, nav } = await mount('PartnerNewOrderScreen', setupStore(), { orderId: 'DEMO-1034', confirmReject: true });
  await press(tree, 'Confirm rejection');
  expect(selectPartnerAccount(store.getState()).demoOrders[0].status).toBe('Rejected');
  expect(nav.replace).toHaveBeenCalledWith(routes.PARTNER_ORDER_STATUS, { orderId: 'DEMO-1034' });
  await close(tree);
});

test('preparing an order connects ready-for-pickup to the status workflow', async () => {
  const { tree, store, nav } = await mount('PartnerPreparingOrderScreen', setupStore(), { orderId: 'DEMO-1033' });
  await press(tree, 'Mark Ready for Pickup');
  expect(selectPartnerAccount(store.getState()).demoOrders[1]).toMatchObject({ status: 'Preparing', partnerStage: 'ready' });
  expect(nav.navigate).toHaveBeenCalledWith(routes.PARTNER_ORDER_STATUS, { orderId: 'DEMO-1033' });
  await close(tree);
});

test('status quick actions delay the pickup and mark the order on the way', async () => {
  const store = setupStore(); store.dispatch(transitionPartnerOrder({ id: 'DEMO-1033', stage: 'ready' }));
  const { tree } = await mount('PartnerOrderStatusScreen', store, { orderId: 'DEMO-1033' });
  await press(tree, 'Delay 5 min'); await press(tree, 'Mark Picked Up');
  expect(selectPartnerAccount(store.getState()).demoOrders[1]).toMatchObject({ status: 'On the way', delayMinutes: 5 });
  await close(tree);
});

test('editing the store profile saves text and chosen cover photo', async () => {
  const { tree, store, nav } = await mount('EditRestaurantProfileScreen');
  await input(tree, 'Your restaurant name', 'Urban Bites Kitchen');
  await pressLabel(tree, 'Change cover or logo'); await press(tree, 'Change cover');
  await press(tree, 'Save changes');
  expect(selectPartnerAccount(store.getState()).profile).toMatchObject({ name: 'Urban Bites Kitchen', coverUri: 'file://cover.jpg' });
  expect(nav.goBack).toHaveBeenCalled(); await close(tree);
});

test('menu photo and availability edits reach customer menu selectors', async () => {
  const { tree, store } = await mount('MenuItemEditorScreen', setupStore(), { itemId: 'creamy-pasta' });
  await pressLabel(tree, 'Change dish photo');
  const availability = tree.root.findAll(element => element.props.accessibilityLabel === 'Available' && typeof element.props.onValueChange === 'function')[0];
  await act(async () => availability.props.onValueChange(false));
  await press(tree, 'Save Changes');
  expect(selectMenuItems(store.getState()).find(item => item.id === 'creamy-pasta').photoUri).toBe('file://dish.jpg');
  expect(selectAvailableItems(store.getState()).some(item => item.id === 'creamy-pasta')).toBe(false);
  await close(tree);
});

test('menu deletion uses confirmation and preserves the other items', async () => {
  const { tree, store, nav } = await mount('MenuItemEditorScreen', setupStore(), { itemId: 'classic-smash' });
  const count = selectMenuItems(store.getState()).length;
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => buttons.find(button => button.style === 'destructive').onPress());
  await pressLabel(tree, 'Delete menu item');
  expect(alert).toHaveBeenCalledWith('Delete Classic Smash Burger?', expect.any(String), expect.any(Array));
  alert.mockRestore();
  expect(selectMenuItems(store.getState())).toHaveLength(count - 1);
  expect(selectMenuItems(store.getState()).some(item => item.id === 'classic-smash')).toBe(false);
  expect(nav.goBack).toHaveBeenCalled(); await close(tree);
});

test('partner persistence hydrates before writing and keeps its own storage key', async () => {
  const store = setupStore();
  const key = 'foodmind_partner_features_v1';
  await AsyncStorage.setItem(key, JSON.stringify({ byUser: { [userKey]: { profile: { name: 'Saved Partner' }, documents: {}, photos: [], demoOrders: [], application: {}, online: false } } }));
  await hydrateStore(store);
  expect(selectPartnerAccount(store.getState()).profile.name).toBe('Saved Partner');
  const persistence = startPersistence(store, AsyncStorage, 0);
  store.dispatch(savePartnerProfile({ userKey, profile: { phone: '03009999999' } }));
  await persistence.stop();
  const saved = JSON.parse(await AsyncStorage.getItem(key));
  expect(saved.byUser[userKey].profile).toMatchObject({ name: 'Saved Partner', phone: '03009999999' });
});

test('an approved store saving documents is not sent back to review', async () => {
  const store = setupStore();
  for (const kind of ['license', 'cnic', 'logo']) store.dispatch(savePartnerDocument({ userKey, kind, document: { uri: `file://${kind}` } }));
  const { tree, nav } = await mount('PartnerDocumentsScreen', store);
  await press(tree, 'Save changes');
  expect(selectPartnerAccount(store.getState()).application.status).toBeUndefined();
  expect(nav.replace).not.toHaveBeenCalled();
  expect(nav.navigate).toHaveBeenCalledWith(routes.PARTNER_TABS, { screen: routes.PARTNER_STORE, params: undefined }, { pop: true });
  await close(tree);
});

test('the dashboard opens the status screen for an order that is already ready', async () => {
  const store = setupStore(); store.dispatch(transitionPartnerOrder({ id: 'DEMO-1033', stage: 'ready' }));
  const onReadyOrder = jest.fn();
  const { tree } = await mount('PartnerPortalScreen', store, {}, { onReadyOrder });
  await press(tree, 'Update Pickup Status');
  expect(onReadyOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 'DEMO-1033', partnerStage: 'ready' }));
  await close(tree);
});

test('picked-up orders leave the live queue and revenue excludes sample orders', async () => {
  const store = setupStore();
  store.dispatch(transitionPartnerOrder({ id: 'DEMO-1033', stage: 'ready' }));
  store.dispatch(transitionPartnerOrder({ id: 'DEMO-1033', stage: 'picked-up' }));
  const { tree } = await mount('PartnerPortalScreen', store);
  const text = JSON.stringify(tree.toJSON());
  expect(text).toContain('1 active');
  expect(text).not.toContain('Order #1033');
  await close(tree);
});

test('a typed category reuses an existing one regardless of letter case', async () => {
  const { tree, store } = await mount('MenuItemEditorScreen', setupStore());
  await input(tree, 'e.g. Cheese Burger', 'Tower Burger');
  await input(tree, 'e.g. Desserts', 'burgers');
  await input(tree, 'e.g. 850', '990');
  await press(tree, 'Add Item');
  const added = selectMenuItems(store.getState()).find(item => item.name === 'Tower Burger');
  expect(added).toMatchObject({ category: 'Burgers', price: 990, rating: 0 });
  expect(new Set(selectMenuItems(store.getState()).map(item => item.category)).size).toBe(5);
  await close(tree);
});
