import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import CustomerStack from '../src/navigation/CustomerStack';
import RestaurantStack from '../src/navigation/RestaurantStack';
import { routes } from '../src/navigation/routes';
import { openCart, openHome, openProfile, openSearch, resetSearch, openOrderHistory } from '../src/navigation/customerNavigation';
import { openPartnerPreparation } from '../src/navigation/partnerNavigation';
import auth from '../src/redux/authSlice';
import cart from '../src/redux/cartSlice';
import orders from '../src/redux/ordersSlice';
import addresses from '../src/redux/addressesSlice';
import menu from '../src/redux/menuSlice';
import customer from '../src/redux/customerSlice';
import partner, { loadPartnerExamples } from '../src/redux/partnerSlice';
import { login } from '../src/redux/authSlice';

jest.mock('../src/utils/partnerMedia', () => ({ choosePartnerDocument: jest.fn(), choosePartnerPhotos: jest.fn(), fileSize: () => '1 KB' }));

function active(state) { return state.routes[state.index]; }
const mounted = new Set();
afterEach(async () => {
  for (const tree of mounted) await close(tree);
});
async function mount(role = 'customer') {
  const store = configureStore({ reducer: { auth, cart, orders, addresses, menu, customer, partner } });
  store.dispatch(login({ name: 'Demo', email: role === 'partner' ? 'partner@food.com' : 'demo@food.com', role }));
  if (role === 'partner') store.dispatch(loadPartnerExamples({ userKey: 'partner@food.com' }));
  const nav = createNavigationContainerRef();
  const unhandled = jest.fn();
  const Navigator = role === 'partner' ? RestaurantStack : CustomerStack;
  let tree;
  await act(async () => {
    tree = renderer.create(<Provider store={store}><SafeAreaProvider>
      <NavigationContainer ref={nav} onUnhandledAction={unhandled}><Navigator /></NavigationContainer>
    </SafeAreaProvider></Provider>);
    mounted.add(tree);
  });
  return { tree, nav, store, unhandled };
}
async function press(tree, label) {
  const button = tree.root.findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.findAll(child => (Array.isArray(child.props.children) ? child.props.children.join('') : child.props.children) === label).length);
  if (!button) throw new Error(`Button not found: ${label}`);
  await act(async () => button.props.onPress());
}
async function close(tree) { await act(async () => tree.unmount()); mounted.delete(tree); }

test('customer navigation has real tabs with Cart, and My Orders opens inside Profile', async () => {
  const { tree, nav, unhandled } = await mount();
  expect(nav.getRootState().type).toBe('tab');
  expect(nav.getRootState().routeNames).toEqual([routes.HOME, routes.SEARCH, routes.CART, routes.PROFILE]);
  await act(async () => nav.navigate(routes.PROFILE));
  await press(tree, 'My Orders');
  expect(active(nav.getRootState()).name).toBe(routes.PROFILE);
  expect(nav.getCurrentRoute().name).toBe(routes.ORDERS);
  const back = tree.root.findAll(node => node.props.accessibilityLabel === 'Back to Profile' && typeof node.props.onPress === 'function')[0];
  await act(async () => back.props.onPress());
  expect(nav.getCurrentRoute().name).toBe(routes.PROFILE_ROOT);
  expect(unhandled).not.toHaveBeenCalled();
  await close(tree);
});

test('switching customer tabs preserves detail history and cart actions return to cart contents', async () => {
  const { tree, nav, unhandled } = await mount();
  await act(async () => nav.navigate(routes.DISH_DETAIL, { dishId: 'creamy-pasta' }));
  await act(async () => openCart(nav));
  expect(nav.getCurrentRoute().name).toBe(routes.CART_ROOT);
  await act(async () => nav.navigate(routes.CHECKOUT));
  await act(async () => nav.navigate(routes.HOME));
  expect(nav.getCurrentRoute().name).toBe(routes.DISH_DETAIL);
  await act(async () => openHome(nav));
  expect(nav.getCurrentRoute().name).toBe(routes.HOME_ROOT);
  await act(async () => openCart(nav));
  expect(nav.getCurrentRoute().name).toBe(routes.CART_ROOT);
  expect(active(nav.getRootState()).state.routes.map(route => route.name)).toEqual([routes.CART_ROOT]);
  await act(async () => resetSearch(nav));
  expect(nav.getCurrentRoute()).toMatchObject({ name: routes.SEARCH_ROOT, params: { reset: expect.any(Number) } });
  await act(async () => nav.navigate(routes.DISH_DETAIL, { dishId: 'creamy-pasta' }));
  await act(async () => openSearch(nav));
  expect(nav.getCurrentRoute().name).toBe(routes.SEARCH_ROOT);
  await act(async () => openOrderHistory(nav));
  expect(active(nav.getRootState()).name).toBe(routes.PROFILE);
  expect(active(nav.getRootState()).state.routes.map(route => route.name)).toEqual([routes.PROFILE_ROOT, routes.ORDERS]);
  await act(async () => openProfile(nav));
  expect(nav.getCurrentRoute().name).toBe(routes.PROFILE_ROOT);
  expect(unhandled).not.toHaveBeenCalled();
  await close(tree);
});

test('partner tabs retain their state while order workflows open and return to the same navigator', async () => {
  const { tree, nav, unhandled } = await mount('partner');
  let main = active(nav.getRootState());
  expect(main.name).toBe(routes.PARTNER_TABS);
  expect(main.state.type).toBe('tab');
  expect(main.state.routeNames).toEqual([routes.DASHBOARD, routes.MANAGE_MENU, routes.PARTNER_ORDERS, routes.PARTNER_REVIEWS, routes.PARTNER_STORE]);
  await press(tree, 'View All');
  expect(nav.getCurrentRoute().name).toBe(routes.PARTNER_ORDERS_LIST);
  await act(async () => openPartnerPreparation(nav, 'DEMO-1033'));
  expect(nav.getCurrentRoute().name).toBe(routes.PARTNER_PREPARING_ORDER);
  expect(active(active(nav.getRootState()).state).name).toBe(routes.PARTNER_ORDERS);
  await press(tree, 'Mark Ready for Pickup');
  expect(nav.getCurrentRoute().name).toBe(routes.PARTNER_ORDER_STATUS);
  await press(tree, 'Back to Orders');
  expect(nav.getRootState().routes).toHaveLength(1);
  expect(nav.getCurrentRoute().name).toBe(routes.PARTNER_ORDERS_LIST);
  const ordersState = active(active(nav.getRootState()).state).state;
  expect(ordersState.routes.map(route => route.name)).toEqual([routes.PARTNER_ORDERS_LIST]);
  await press(tree, 'Order #1034 ›');
  expect(nav.getCurrentRoute().name).toBe(routes.PARTNER_NEW_ORDER);
  await press(tree, 'Accept Order');
  expect(nav.getRootState().routes).toHaveLength(1);
  expect(nav.getCurrentRoute()).toMatchObject({ name: routes.PARTNER_PREPARING_ORDER, params: { orderId: 'DEMO-1034' } });
  expect(unhandled).not.toHaveBeenCalled();
  await close(tree);
});

test('the dashboard\'s Update Pickup Status opens the status screen for a ready order', async () => {
  const { tree, nav, store, unhandled } = await mount('partner');
  const { transitionPartnerOrder } = require('../src/redux/partnerSlice');
  await act(async () => store.dispatch(transitionPartnerOrder({ id: 'DEMO-1033', stage: 'ready' })));
  await press(tree, 'Update Pickup Status');
  expect(nav.getCurrentRoute()).toMatchObject({ name: routes.PARTNER_ORDER_STATUS, params: { orderId: 'DEMO-1033' } });
  expect(unhandled).not.toHaveBeenCalled();
  await close(tree);
});
