import { configureStore } from '@reduxjs/toolkit';
import reducer, { loadCustomerData, saveReview, earnOrderPoints, redeemReward, selectPoints, selectCustomer, saveProfile } from '../src/redux/customerSlice';
import cartReducer, { addItem, selectBill } from '../src/redux/cartSlice';
import ordersReducer, { placeOrder, updateOrderStatus } from '../src/redux/ordersSlice';
import { makeCartItem, dishes, restaurant, pricing } from '../src/data/catalog';
import { matchDishes } from '../src/data/discovery';
import { orderBill, orderStatusLabel } from '../src/data/orderHelpers';

function makeStore() {
  return configureStore({ reducer: { customer: reducer, cart: cartReducer, orders: ordersReducer, auth: () => ({ user: { email: 'a@food.com' } }) } });
}
const review = { id: 'r1', orderId: 'FM1', dishName: 'Pasta', rating: 5, createdAt: '2026-10-25T00:00:00.000Z' };
test('reviews award points once, edits preserve balance, and accounts remain isolated', () => {
  const store = makeStore();
  store.dispatch(saveReview({ userKey: 'a@food.com', review }));
  store.dispatch(saveReview({ userKey: 'a@food.com', review: { ...review, rating: 4 } }));
  store.dispatch(saveReview({ userKey: 'b@food.com', review }));
  expect(selectPoints(store.getState())).toBe(20);
  expect(selectCustomer(store.getState()).reviews).toHaveLength(1);
  expect(selectCustomer(store.getState()).reviews[0].rating).toBe(4);
  store.dispatch(saveProfile({ userKey: 'a@food.com', profile: { name: 'Updated name' } }));
  expect(store.getState().customer.byUser['b@food.com'].profile).toEqual({});
});
test('completion rewards are idempotent and insufficient points cannot be redeemed', () => {
  const store = makeStore();
  const payload = { userKey: 'a@food.com', id: 'reward1', createdAt: review.createdAt };
  store.dispatch(redeemReward(payload));
  expect(selectCustomer(store.getState()).redemptions).toHaveLength(0);
  for (let i = 0; i < 5; i++) store.dispatch(earnOrderPoints({ userKey: 'a@food.com', orderId: `FM${i}`, createdAt: review.createdAt }));
  store.dispatch(earnOrderPoints({ userKey: 'a@food.com', orderId: 'FM1', createdAt: review.createdAt }));
  expect(selectPoints(store.getState())).toBe(100);
  store.dispatch(redeemReward(payload));
  store.dispatch(redeemReward(payload));
  expect(selectPoints(store.getState())).toBe(0);
  expect(selectCustomer(store.getState()).redemptions).toHaveLength(1);
});
test('accounts saved with old community deliveries load without them', () => {
  const store = makeStore();
  store.dispatch(loadCustomerData({ byUser: { 'a@food.com': { reviews: [], deliveries: [{ id: 'CD1' }] } } }));
  expect(selectCustomer(store.getState())).not.toHaveProperty('deliveries');
});
test('menu matching respects budget, dietary restrictions, ratings, and available delivery time', () => {
  const matches = matchDishes(dishes, 'Creamy chicken pasta under Rs. 1,200');
  expect(matches[0].id).toBe('creamy-pasta');
  expect(matches.every(dish => dish.price <= 1200)).toBe(true);
  expect(matchDishes(dishes, 'Vegan sushi under Rs. 300')).toEqual([]);
  expect(matchDishes(dishes, 'pasta', ['fast'])).toEqual([]);
  expect(matchDishes(dishes, 'pasta', ['budget', 'rating']).every(dish => dish.price <= 1000 && dish.rating >= 4.5)).toBe(true);
  expect(matchDishes(dishes, 'pasta under Rs. 1200', ['budget']).every(dish => dish.price <= 1000)).toBe(true);
});
test('existing cart billing is preserved and order details reconcile to checkout', () => {
  const store = makeStore();
  store.dispatch(addItem(makeCartItem(dishes[0], 2, true)));
  const bill = selectBill(store.getState());
  expect(bill.subtotal).toBe((dishes[0].price + pricing.extraChicken) * 2);
  expect(bill.cartTotal).toBe(bill.subtotal + restaurant.deliveryFee + pricing.platformFee);
  const order = { id: 'FM1', items: store.getState().cart.items, total: bill.cartTotal, deliveryFee: bill.deliveryFee, platformFee: bill.platformFee, status: 'Confirmed' };
  expect(orderBill(order).total).toBe(bill.cartTotal);
  store.dispatch(placeOrder(order));
  store.dispatch(updateOrderStatus({ id: 'FM1', status: 'Rejected', cancelledByCustomer: true }));
  expect(orderStatusLabel(store.getState().orders.items[0])).toBe('Cancelled');
});
