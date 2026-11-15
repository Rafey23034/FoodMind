import { createSelector, createSlice } from '@reduxjs/toolkit';
import { userKey } from './userKey';

const newAccount = () => ({ reviews: [], redemptions: [], reports: [], profile: {}, pointsHistory: [], favorites: [] });
const EMPTY_ACCOUNT = Object.freeze(newAccount());
export const REWARD_COST = 100;
export const customerKey = userKey;
function accountFor(state, key) {
  if (!state.byUser[key]) state.byUser[key] = newAccount();
  return state.byUser[key];
}
function normalizeAccount(account) {
  const base = newAccount();
  if (!account || typeof account !== 'object') return base;
  // Accounts saved before community delivery was removed may still carry "deliveries"; drop it.
  const { deliveries, ...saved } = account;
  const result = { ...base, ...saved, profile: account.profile && typeof account.profile === 'object' ? account.profile : {} };
  for (const field of ['reviews', 'redemptions', 'reports', 'pointsHistory', 'favorites']) {
    if (!Array.isArray(result[field])) result[field] = [];
  }
  return result;
}

const customerSlice = createSlice({
  name: 'customer', initialState: { byUser: {} },
  reducers: {
    loadCustomerData(state, { payload }) {
      if (!payload?.byUser || typeof payload.byUser !== 'object' || Array.isArray(payload.byUser)) return;
      for (const [key, account] of Object.entries(payload.byUser)) state.byUser[userKey(key)] = normalizeAccount(account);
    },
    saveProfile(state, { payload: { userKey: key, profile } }) {
      accountFor(state, key).profile = profile;
    },
    saveReview(state, { payload: { userKey: key, review } }) {
      const account = accountFor(state, key);
      const index = account.reviews.findIndex(item => item.orderId === review.orderId);
      if (index >= 0) account.reviews[index] = { ...account.reviews[index], ...review };
      else {
        account.reviews.unshift(review);
        account.pointsHistory.unshift({ id: `review-${review.orderId}`, amount: 20, label: `${review.dishName} review`, createdAt: review.createdAt });
      }
    },
    earnOrderPoints(state, { payload: { userKey: key, orderId, createdAt } }) {
      const account = accountFor(state, key);
      if (!account.pointsHistory.some(event => event.id === `order-${orderId}`)) {
        account.pointsHistory.unshift({ id: `order-${orderId}`, amount: 20, label: `Completed order #${String(orderId).slice(-6)}`, createdAt });
      }
    },
    redeemReward(state, { payload: { userKey: key, id, createdAt } }) {
      const account = accountFor(state, key);
      if (pointsOf(account) < REWARD_COST) return;
      account.redemptions.unshift({ id, createdAt, points: REWARD_COST, label: 'Rs. 100 demo voucher' });
    },
    saveReport(state, { payload: { userKey: key, report } }) {
      accountFor(state, key).reports.unshift(report);
    },
    toggleFavorite(state, { payload: { userKey: key, dishId } }) {
      const account = accountFor(state, key);
      account.favorites = account.favorites.includes(dishId)
        ? account.favorites.filter(id => id !== dishId) : [...account.favorites, dishId];
    },
  },
});

function pointsOf(account) {
  return (account.pointsHistory || []).reduce((sum, event) => sum + event.amount, 0)
    - (account.redemptions || []).reduce((sum, item) => sum + (item.points || REWARD_COST), 0);
}

export const { loadCustomerData, saveProfile, saveReview, redeemReward, saveReport, earnOrderPoints, toggleFavorite } = customerSlice.actions;
export const selectCustomer = state => state.customer.byUser[customerKey(state.auth.user)] || EMPTY_ACCOUNT;
export const selectPoints = createSelector([selectCustomer], pointsOf);
export const selectIsFavorite = (state, dishId) => (selectCustomer(state).favorites || []).includes(dishId);
export default customerSlice.reducer;
