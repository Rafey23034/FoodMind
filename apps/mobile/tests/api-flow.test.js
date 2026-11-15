import { configureStore } from '@reduxjs/toolkit';
import auth, { login } from '../src/redux/authSlice';
import cart, { addItem, clearCart } from '../src/redux/cartSlice';
import orders, { mergeOrders } from '../src/redux/ordersSlice';
import addresses, { saveAddress } from '../src/redux/addressesSlice';
import menu from '../src/redux/menuSlice';
import customer from '../src/redux/customerSlice';
import partner from '../src/redux/partnerSlice';
import rider from '../src/redux/riderSlice';
import { checkout } from '../src/redux/orderThunks';
import { transitionPartnerOrder } from '../src/redux/partnerSlice';
import { apiOrderToLocal, hasApiSession, respondToRiderOffer, syncRiderData } from '../src/redux/apiThunks';
import { rateRiderDelivery } from '../src/redux/riderSlice';
import { dishes, makeCartItem } from '../src/data/catalog';

jest.mock('../src/services/api', () => {
  class ApiError extends Error {
    constructor(message, status = 0) { super(message); this.status = status; }
  }
  return {
    API_ENABLED: true,
    ApiError,
    getApiSession: jest.fn(),
    api: {
      catalog: { restaurants: jest.fn(), menu: jest.fn() },
      addresses: { create: jest.fn() },
      orders: { create: jest.fn(), cancel: jest.fn(), tracking: jest.fn() },
      partner: { orders: jest.fn(), dashboard: jest.fn(), accept: jest.fn(), reject: jest.fn(), ready: jest.fn(), delay: jest.fn(), availability: jest.fn() },
      rider: { status: jest.fn(), setOnline: jest.fn(), location: jest.fn(), currentOffer: jest.fn(), activeOrder: jest.fn(), respondToOffer: jest.fn(), pickup: jest.fn(), delivered: jest.fn(), orders: jest.fn() },
    },
  };
});

const { api, getApiSession } = require('../src/services/api');
const reducer = { auth, cart, orders, addresses, menu, customer, partner, rider };
const makeStore = () => configureStore({ reducer });
const customerUser = { id: '1', name: 'Demo Customer', email: 'demo@food.com', role: 'customer', accessToken: 'a1', refreshToken: 'r1' };
const address = { id: 'local-1', label: 'Home', street: 'Demo Street', city: 'Lahore' };

function readyStore() {
  const store = makeStore();
  store.dispatch(login(customerUser));
  store.dispatch(saveAddress({ userKey: customerUser.email, address }));
  store.dispatch(addItem(makeCartItem(dishes[0])));
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
  getApiSession.mockReturnValue({ accessToken: 'a1', refreshToken: 'r1' });
  api.catalog.restaurants.mockResolvedValue({ restaurants: [{ id: '1', name: 'Urban Bites' }] });
  api.catalog.menu.mockResolvedValue({ items: [{ id: '1', name: dishes[0].name, options: [] }] });
  api.addresses.create.mockResolvedValue({ address: { id: '77', lat: 31.47, lng: 74.27, isDefault: true } });
  api.orders.create.mockResolvedValue({
    order: {
      id: '501', restaurantId: '1', restaurant: 'Urban Bites', status: 'Confirmed', partnerStage: 'new',
      customerEmail: customerUser.email, payment: 'cash', total: 1250, subtotal: 1050, deliveryFee: 150, platformFee: 50,
      items: [{ id: '900', menuItemId: '1', restaurantId: '1', name: dishes[0].name, price: dishes[0].price, quantity: 1 }],
    },
  });
});

test('an API session places the order on the server and keeps the local UI shape', async () => {
  const store = readyStore();
  expect(hasApiSession()).toBe(true);

  const result = await store.dispatch(checkout());
  expect(result).toMatchObject({ ok: true, orderId: '501' });
  expect(api.orders.create).toHaveBeenCalledWith(expect.objectContaining({
    restaurantId: 1,
    addressId: 77,
    items: [{ menuItemId: 1, quantity: 1 }],
  }));

  expect(store.getState().orders.items[0]).toMatchObject({ id: '501', source: 'api', partnerStage: 'new', customerEmail: customerUser.email });
  expect(store.getState().cart.items).toEqual([]);
  expect(store.getState().addresses.byUser[customerUser.email][0]).toMatchObject({ id: '77', apiId: '77' });
});

test('an offline API falls back to the local demo order', async () => {
  const store = readyStore();
  api.orders.create.mockRejectedValueOnce(Object.assign(new Error('offline'), { status: 0 }));

  const result = await store.dispatch(checkout());
  expect(result.ok).toBe(true);
  expect(result.orderId).toMatch(/^FM/);
  expect(store.getState().orders.items[0].source).toBeUndefined();
  expect(store.getState().cart.items).toEqual([]);
});

test('the partner accepts an API order through the server', async () => {
  const store = makeStore();
  const partnerUser = { name: 'Urban Bites Partner', email: 'partner@food.com', role: 'partner', accessToken: 'p1', refreshToken: 'pr1' };
  store.dispatch(login(partnerUser));
  store.dispatch(mergeOrders([apiOrderToLocal({
    id: '700', restaurant: 'Urban Bites', status: 'Confirmed', partnerStage: 'new', customerEmail: 'demo@food.com',
    items: [{ id: '1', menuItemId: '1', restaurantId: '1', name: dishes[0].name, price: 1050, quantity: 1 }],
  })]));
  api.partner.accept.mockResolvedValueOnce({ order: { id: '700', restaurant: 'Urban Bites', status: 'Preparing', partnerStage: 'preparing', items: [] } });

  const ok = await store.dispatch(transitionPartnerOrder({ id: '700', stage: 'preparing', prepMinutes: 15 }));
  expect(ok).toBe(true);
  expect(api.partner.accept).toHaveBeenCalledWith('700', 15);
  expect(store.getState().orders.items[0]).toMatchObject({ id: '700', status: 'Preparing', partnerStage: 'preparing', source: 'api' });
});

test('a rider accepts a direct API offer and gets the active delivery', async () => {
  const store = makeStore();
  const riderUser = { name: 'Tariq Mehmood', email: 'rider@food.com', role: 'rider', accessToken: 'd1', refreshToken: 'dr1' };
  store.dispatch(login(riderUser));
  api.rider.respondToOffer.mockResolvedValueOnce({
    order: {
      id: '700', restaurant: 'Urban Bites', status: 'Preparing', dbStatus: 'ready', partnerStage: 'ready',
      customerName: 'FoodMind Customer', address: 'Demo Street, Lahore', deliveryFee: 150, deliveryDistanceM: 2400,
      pickupCode: '4321', items: [{ id: '1', menuItemId: '1', restaurantId: '1', name: dishes[0].name, price: 1050, quantity: 1 }],
    },
  });

  const result = await store.dispatch(respondToRiderOffer('9', 'accept'));
  expect(result.ok).toBe(true);
  expect(api.rider.respondToOffer).toHaveBeenCalledWith('9', 'accept');
  expect(store.getState().rider.byUser[riderUser.email].activeDelivery).toMatchObject({
    id: '700', status: 'to-pickup', pickupCode: '4321', isApi: true,
  });
});

test('rider sync loads the offer, its fee and delivered orders into Redux, keeping local ratings', async () => {
  const store = makeStore();
  const riderUser = { name: 'Rider', email: 'r2@food.com', role: 'rider', accessToken: 'd1', refreshToken: 'dr1' };
  store.dispatch(login(riderUser));
  api.rider.status.mockResolvedValue({ rider: { isOnline: true, locationUpdatedAt: new Date().toISOString() } });
  api.rider.currentOffer.mockResolvedValue({ offer: { id: 4, orderId: 12, distanceM: 1500, deliveryFee: 180, restaurant: { name: 'Urban Bites', address: 'Main Blvd' } } });
  api.rider.activeOrder.mockResolvedValue({ order: null });
  api.rider.orders.mockResolvedValue({ orders: [
    { id: '11', dbStatus: 'delivered', restaurant: 'Urban Bites', customerName: 'Ayesha', address: 'Model Town', deliveryFee: 150, deliveryDistanceM: 3200, updatedAt: '2026-11-15T10:00:00Z', items: [] },
    { id: '12', dbStatus: 'preparing', restaurant: 'Urban Bites', deliveryFee: 180, items: [] },
  ] });
  await store.dispatch(syncRiderData());
  const account = () => store.getState().rider.byUser[riderUser.email];
  expect(account().apiOffer).toMatchObject({ id: '4', deliveryFee: 180, distanceKm: '1.5', restaurantName: 'Urban Bites' });
  expect(account().deliveries).toEqual([expect.objectContaining({ id: '11', earnings: 150, distanceKm: '3.2', status: 'Delivered', isApi: true })]);
  store.dispatch(rateRiderDelivery({ userKey: riderUser.email, deliveryId: '11', rating: 5 }));
  await store.dispatch(syncRiderData());
  expect(account().deliveries[0].rating).toBe(5);
});

test('API order items map back to local dish details and add-ons', () => {
  const order = apiOrderToLocal({
    id: 501, restaurant: 'Urban Bites', status: 'Preparing', partnerStage: 'preparing',
    items: [{ id: 9, menuItemId: 1, restaurantId: 1, name: dishes[0].name, price: 1250, quantity: 2, options: [{ id: '4', name: 'Extra Chicken', priceDelta: 200 }] }],
  });
  expect(order.items[0]).toMatchObject({
    dishId: dishes[0].id,
    name: dishes[0].name,
    symbol: dishes[0].symbol,
    price: 1250,
    option: 'Extra Chicken',
  });
});
