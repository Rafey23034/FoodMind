import { createSelector, createSlice } from '@reduxjs/toolkit';
import { restaurant } from '../data/catalog';
import { api, getApiSession } from '../services/api';
import { samplePartnerOrders, updatedPartnerOrder, delayedOrder, canTransitionOrder, validateRestaurant } from '../data/partnerOrders';
import { updatePartnerOrder, delayPartnerOrder, replaceOrder } from './ordersSlice';
import { apiOrderToLocal } from './apiOrderMap';
import { userKey } from './userKey';

const EMPTY = Object.freeze({ profile: {}, documents: {}, photos: [], application: {}, online: true, demoOrders: [] });
export const partnerKey = userKey;
function accountFor(state, key) {
  if (!state.byUser[key]) state.byUser[key] = { profile: {}, documents: {}, photos: [], application: {}, online: true, demoOrders: [] };
  return state.byUser[key];
}

const slice = createSlice({
  name: 'partner', initialState: { byUser: {} },
  reducers: {
    loadPartnerData(state, { payload }) {
      if (!payload?.byUser || typeof payload.byUser !== 'object' || Array.isArray(payload.byUser)) return;
      for (const [key, account] of Object.entries(payload.byUser)) {
        if (!account || typeof account !== 'object') continue;
        state.byUser[userKey(key)] = { ...EMPTY, ...account,
          profile: account.profile || {}, application: account.application || {},
          documents: account.documents || {}, photos: Array.isArray(account.photos) ? account.photos : [],
          demoOrders: Array.isArray(account.demoOrders) ? account.demoOrders : [] };
      }
    },
    savePartnerProfile(state, { payload: { userKey: key, profile } }) {
      Object.assign(accountFor(state, key).profile, profile);
    },
    setPartnerOnline(state, { payload: { userKey: key, online } }) { accountFor(state, key).online = Boolean(online); },
    savePartnerDocument(state, { payload: { userKey: key, kind, document } }) {
      if (['license', 'cnic', 'logo'].includes(kind)) accountFor(state, key).documents[kind] = document;
    },
    addPartnerPhotos(state, { payload: { userKey: key, photos } }) { accountFor(state, key).photos.push(...photos); },
    removePartnerPhoto(state, { payload: { userKey: key, uri } }) {
      const account = accountFor(state, key);
      account.photos = account.photos.filter(photo => photo.uri !== uri);
    },
    submitPartnerApplication(state, { payload: { userKey: key, at } }) {
      const account = accountFor(state, key);
      if (validateRestaurant(account.profile) || !account.documents.license || !account.documents.cnic || !account.documents.logo) return;
      // Editing an approved store's details does not send it back to review.
      if (account.application.status === 'Approved') { account.application.updatedAt = at; return; }
      account.application = { status: 'Pending approval', submittedAt: at };
    },
    approvePartnerDemo(state, { payload: { userKey: key, at } }) {
      const account = accountFor(state, key);
      if (account.application.status !== 'Pending approval') return;
      account.application = { ...account.application, status: 'Approved', approvedAt: at, demoApproval: true };
    },
    loadPartnerExamples(state, { payload: { userKey: key, at, reset = false } }) {
      const account = accountFor(state, key);
      if (!account.demoOrders.length || reset) account.demoOrders = samplePartnerOrders(at);
    },
    transitionPartnerExample(state, { payload: { userKey: key, id, stage, prepMinutes, at } }) {
      const account = accountFor(state, key);
      const index = account.demoOrders.findIndex(order => order.id === id);
      if (index >= 0) account.demoOrders[index] = updatedPartnerOrder(account.demoOrders[index], stage, { prepMinutes, at });
    },
    delayPartnerExample(state, { payload: { userKey: key, id } }) {
      const account = accountFor(state, key);
      const index = account.demoOrders.findIndex(order => order.id === id);
      if (index >= 0) account.demoOrders[index] = delayedOrder(account.demoOrders[index]);
    },
  },
});
export const { loadPartnerData, savePartnerProfile, setPartnerOnline, savePartnerDocument, addPartnerPhotos, removePartnerPhoto, submitPartnerApplication, approvePartnerDemo, loadPartnerExamples, transitionPartnerExample, delayPartnerExample } = slice.actions;
export const selectPartnerAccount = state => state.partner?.byUser[partnerKey(state.auth.user)] || EMPTY;
export const selectPartnerOrders = createSelector(
  [state => state.orders.items, state => selectPartnerAccount(state).demoOrders],
  (orders, demoOrders) => [...orders, ...demoOrders].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
);
// The restaurant's own online switch decides whether customers can check out.
export const selectRestaurantOnline = state => state.partner?.byUser?.[userKey(restaurant.ownerEmail)]?.online ?? true;

const hasApiSession = () => {
  const tokens = getApiSession();
  return Boolean(tokens.accessToken || tokens.refreshToken);
};
function apiTransition(order, stage, prepMinutes) {
  if (!order.source || order.source !== 'api' || !hasApiSession()) return null;
  if (stage === 'preparing') return api.partner.accept(order.id, prepMinutes);
  if (stage === 'ready') return api.partner.ready(order.id);
  if (stage === 'rejected') return api.partner.reject(order.id);
  return null;
}
export function transitionPartnerOrder({ id, stage, prepMinutes = 20 }) {
  return (dispatch, getState) => {
    const state = getState();
    const order = selectPartnerOrders(state).find(value => value.id === id);
    if (!order || !canTransitionOrder(order, stage)) return false;
    const payload = { id, stage, prepMinutes, at: new Date().toISOString() };
    if (order.isDemo) {
      dispatch(transitionPartnerExample({ ...payload, userKey: partnerKey(state.auth.user) }));
      return true;
    }
    const request = apiTransition(order, stage, prepMinutes);
    if (order.source === 'api') {
      if (!request) return false;
      return request
        .then(({ order: updated }) => { dispatch(replaceOrder(apiOrderToLocal(updated))); return true; })
        .catch(() => false);
    }
    dispatch(updatePartnerOrder(payload));
    return true;
  };
}
export function delayPartnerPickup(id) {
  return (dispatch, getState) => {
    const state = getState();
    const order = selectPartnerOrders(state).find(value => value.id === id);
    if (!order) return;
    if (order.isDemo) dispatch(delayPartnerExample({ userKey: partnerKey(state.auth.user), id }));
    else if (order.source === 'api' && hasApiSession()) {
      return api.partner.delay(order.id, 5)
        .then(({ order: updated }) => { dispatch(replaceOrder(apiOrderToLocal(updated))); return true; })
        .catch(() => false);
    } else dispatch(delayPartnerOrder({ id }));
  };
}
export function isRestaurantOwner(user) {
  return userKey(user) === userKey(restaurant.ownerEmail);
}
export function defaultPartnerProfile(user) {
  const owner = isRestaurantOwner(user);
  return { name: owner ? restaurant.name : '', ownerName: user?.name || '', email: user?.email || '',
    phone: owner ? '0300 1234567' : '', address: owner ? 'Johar Town, Lahore' : '',
    description: owner ? restaurant.description : '', openingHours: '11:00 AM – 11:00 PM',
    cuisines: owner ? ['Burgers', 'Fast Food'] : [], logoUri: null, coverUri: null };
}
export default slice.reducer;
