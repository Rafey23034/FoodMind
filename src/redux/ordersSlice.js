import { createSelector, createSlice } from '@reduxjs/toolkit';
import { updatedPartnerOrder, delayedOrder, partnerStage } from '../data/partnerOrders';
import { selectUserKey, userKey } from './userKey';

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { items: [] },
  reducers: {
    loadOrders: (state, action) => { state.items = Array.isArray(action.payload) ? action.payload : []; },
    placeOrder: (state, action) => { state.items.unshift(action.payload); },
    updateOrderStatus: (state, action) => {
      const order = state.items.find(item => item.id === action.payload.id);
      if (order) {
        order.status = action.payload.status;
        if (action.payload.cancelledByCustomer) order.cancelledByCustomer = true;
      }
    },
    // Customers may cancel only before the restaurant accepts.
    cancelOrder: (state, { payload: { id, at } }) => {
      const order = state.items.find(item => item.id === id);
      if (!order || partnerStage(order) !== 'new') return;
      order.status = 'Rejected';
      order.partnerStage = 'rejected';
      order.cancelledByCustomer = true;
      order.statusUpdatedAt = at || new Date().toISOString();
    },
    updatePartnerOrder: (state, { payload: { id, stage, prepMinutes, at } }) => {
      const index = state.items.findIndex(order => order.id === id);
      if (index >= 0) state.items[index] = updatedPartnerOrder(state.items[index], stage, { prepMinutes, at });
    },
    delayPartnerOrder: (state, { payload: { id } }) => {
      const index = state.items.findIndex(value => value.id === id);
      if (index >= 0) state.items[index] = delayedOrder(state.items[index]);
    },
  },
});

export const { loadOrders, placeOrder, updateOrderStatus, cancelOrder, updatePartnerOrder, delayPartnerOrder } = ordersSlice.actions;
export default ordersSlice.reducer;

const selectOrderItems = state => state.orders.items;
// Customers see only the orders they placed; the partner portal sees every order for the restaurant.
export const selectMyOrders = createSelector([selectOrderItems, selectUserKey], (items, key) =>
  items.filter(order => order.customerEmail && userKey(order.customerEmail) === key));
export const selectMyOrder = (state, id) => selectMyOrders(state).find(order => order.id === id);
