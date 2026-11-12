import { configureStore } from '@reduxjs/toolkit';
import authReducer, { login } from '../src/redux/authSlice';
import ordersReducer, { placeOrder, updateOrderStatus } from '../src/redux/ordersSlice';
import partnerReducer, { selectPartnerAccount, selectPartnerOrders, partnerKey, savePartnerProfile, savePartnerDocument,
  submitPartnerApplication, approvePartnerDemo, loadPartnerExamples, transitionPartnerOrder, delayPartnerPickup, loadPartnerData, setPartnerOnline } from '../src/redux/partnerSlice';
import menuReducer, { loadMenu, selectMenuItems, selectAvailableItems, saveMenuItem, toggleMenuItem, deleteMenuItem } from '../src/redux/menuSlice';
import { dishes, makeCartItem, restaurant } from '../src/data/catalog';
import { partnerStage, validateRestaurant, orderDestination } from '../src/data/partnerOrders';
import { restaurantReviews, ratingSummary, samplePartnerReviews } from '../src/data/partnerReviews';
import { foodPhotos, getFoodPhoto } from '../src/data/foodPhotos';
import { routes } from '../src/navigation/routes';

const at = '2026-10-25T00:00:00.000Z';
const userKey = 'partner@food.com';
const profile = { name: 'Urban Bites', ownerName: 'Demo Owner', email: userKey, phone: '03001234567', address: 'Johar Town, Lahore', cuisines: ['Burgers'] };
function makeStore() {
  const store = configureStore({ reducer: { auth: authReducer, orders: ordersReducer, partner: partnerReducer, menu: menuReducer } });
  store.dispatch(login({ email: userKey, name: 'Demo Owner', role: 'partner' }));
  return store;
}
function realOrder() { return { id: 'FM123', restaurant: restaurant.name, status: 'Confirmed', items: [makeCartItem(dishes[0])], total: 1250, payment: 'cash' }; }

test('registration validates details and cannot submit without all three documents', () => {
  const store = makeStore();
  expect(validateRestaurant({})).toBeTruthy();
  expect(validateRestaurant({ ...profile, phone: '--------' })).toBeTruthy();
  expect(validateRestaurant(profile)).toBe('');
  store.dispatch(submitPartnerApplication({ userKey, at }));
  expect(selectPartnerAccount(store.getState()).application.status).toBeUndefined();
  store.dispatch(savePartnerProfile({ userKey, profile }));
  for (const kind of ['license', 'cnic', 'logo']) store.dispatch(savePartnerDocument({ userKey, kind, document: { uri: `file://${kind}.pdf`, name: kind } }));
  store.dispatch(submitPartnerApplication({ userKey, at }));
  expect(selectPartnerAccount(store.getState()).application).toEqual({ status: 'Pending approval', submittedAt: at });
  store.dispatch(approvePartnerDemo({ userKey, at }));
  expect(selectPartnerAccount(store.getState()).application).toMatchObject({ status: 'Approved', demoApproval: true });
});

test('partner documents, profiles, and availability stay separated by account', () => {
  const store = makeStore();
  store.dispatch(savePartnerProfile({ userKey, profile }));
  store.dispatch(savePartnerDocument({ userKey, kind: 'license', document: { uri: 'file://one.pdf' } }));
  store.dispatch(savePartnerDocument({ userKey, kind: 'license', document: { uri: 'file://replacement.pdf' } }));
  store.dispatch(setPartnerOnline({ userKey, online: false }));
  store.dispatch(savePartnerProfile({ userKey: 'other@food.com', profile: { name: 'Other Store' } }));
  expect(Object.keys(selectPartnerAccount(store.getState()).documents)).toHaveLength(1);
  expect(selectPartnerAccount(store.getState()).documents.license.uri).toBe('file://replacement.pdf');
  expect(selectPartnerAccount(store.getState()).online).toBe(false);
  expect(store.getState().partner.byUser['other@food.com'].documents).toEqual({});
  expect(restaurant.name).toBe('Urban Bites');
});

test('sample orders can be reset without inserting or altering customer orders', () => {
  const store = makeStore();
  store.dispatch(placeOrder(realOrder()));
  store.dispatch(loadPartnerExamples({ userKey, at }));
  store.dispatch(transitionPartnerOrder({ id: 'DEMO-1034', stage: 'preparing', prepMinutes: 30 }));
  expect(store.getState().orders.items).toEqual([realOrder()]);
  expect(selectPartnerOrders(store.getState())).toHaveLength(3);
  store.dispatch(loadPartnerExamples({ userKey, at, reset: true }));
  expect(partnerStage(selectPartnerAccount(store.getState()).demoOrders[0])).toBe('new');
  expect(store.getState().orders.items).toEqual([realOrder()]);
});

test('owner actions preserve customer tracking stages and prevent regressions', () => {
  const store = makeStore();
  store.dispatch(placeOrder(realOrder()));
  expect(store.dispatch(transitionPartnerOrder({ id: 'FM123', stage: 'preparing', prepMinutes: 30 }))).toBe(true);
  expect(store.getState().orders.items[0]).toMatchObject({ status: 'Preparing', prepMinutes: 30 });
  const originalReadyAt = new Date(store.getState().orders.items[0].readyAt).getTime();
  store.dispatch(delayPartnerPickup('FM123'));
  expect(new Date(store.getState().orders.items[0].readyAt).getTime()).toBe(originalReadyAt + 300000);
  store.dispatch(transitionPartnerOrder({ id: 'FM123', stage: 'ready' }));
  expect(store.getState().orders.items[0]).toMatchObject({ status: 'Preparing', partnerStage: 'ready' });
  store.dispatch(transitionPartnerOrder({ id: 'FM123', stage: 'picked-up' }));
  expect(store.getState().orders.items[0].status).toBe('On the way');
  expect(store.dispatch(transitionPartnerOrder({ id: 'FM123', stage: 'preparing' }))).toBe(false);
  store.dispatch(updateOrderStatus({ id: 'FM123', status: 'Delivered' }));
  expect(partnerStage(store.getState().orders.items[0])).toBe('delivered');
  expect(orderDestination({ status: 'Confirmed' })).toBe(routes.PARTNER_NEW_ORDER);
  expect(orderDestination({ status: 'Preparing' })).toBe(routes.PARTNER_PREPARING_ORDER);
});

test('a cancelled customer order cannot be accepted by the partner', () => {
  const store = makeStore();
  store.dispatch(placeOrder(realOrder()));
  store.dispatch(updateOrderStatus({ id: 'FM123', status: 'Rejected', cancelledByCustomer: true }));
  expect(store.dispatch(transitionPartnerOrder({ id: 'FM123', stage: 'preparing' }))).toBe(false);
  expect(store.getState().orders.items[0]).toMatchObject({ status: 'Rejected', cancelledByCustomer: true });
});

test('old menu storage loads and edited photos/deletions propagate to customer discovery', () => {
  const store = makeStore();
  store.dispatch(loadMenu({ added: [], edited: {}, unavailable: [] }));
  expect(selectAvailableItems(store.getState())).toHaveLength(dishes.length);
  const edited = { ...dishes[0], photoUri: 'file://new-pasta.jpg', bestseller: true, customizations: ['Extra cheese'] };
  store.dispatch(saveMenuItem(edited));
  expect(getFoodPhoto(selectMenuItems(store.getState())[0])).toEqual({ uri: 'file://new-pasta.jpg' });
  expect(getFoodPhoto(dishes[0])).toBe(foodPhotos[dishes[0].image]);
  store.dispatch(toggleMenuItem(dishes[0].id));
  expect(selectAvailableItems(store.getState()).some(item => item.id === dishes[0].id)).toBe(false);
  store.dispatch(deleteMenuItem(dishes[0].id));
  expect(selectMenuItems(store.getState()).some(item => item.id === dishes[0].id)).toBe(false);
  expect(dishes[0].photoUri).toBeUndefined();
});

test('partner state hydration restores selected files and normalizes optional arrays', () => {
  const store = makeStore();
  store.dispatch(loadPartnerData({ byUser: { [userKey]: { profile, documents: { logo: { uri: 'file://logo.png' } }, photos: null } } }));
  const account = selectPartnerAccount(store.getState());
  expect(account.profile.name).toBe('Urban Bites');
  expect(account.documents.logo.uri).toBe('file://logo.png');
  expect(account.photos).toEqual([]);
  expect(account.demoOrders).toEqual([]);
  expect(partnerKey({ email: ' PARTNER@FOOD.COM ' })).toBe(userKey);
});

test('review summaries use actual ratings and do not expose account emails', () => {
  const reviews = restaurantReviews({ 'private@example.com': { profile: {}, reviews: [
    { id: 'r1', orderId: 'FM123', restaurant: restaurant.name, rating: 5, createdAt: at },
    { id: 'r2', orderId: 'FM124', restaurant: restaurant.name, rating: 3, createdAt: at },
    { id: 'r3', restaurant: 'Other Store', rating: 1 },
  ] } }, [{ id: 'FM123', status: 'Delivered' }]);
  expect(reviews).toHaveLength(2);
  expect(reviews[0].author).toBe('FoodMind diner');
  expect(reviews[0].verified).toBe(true);
  expect(ratingSummary(reviews)).toMatchObject({ count: 2, average: 4 });
  expect(ratingSummary(samplePartnerReviews).count).toBe(3);
});
