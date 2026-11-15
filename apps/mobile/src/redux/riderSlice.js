import { createSlice } from '@reduxjs/toolkit';
import { riderRequestById } from '../data/riderRequests';
import { userKey } from './userKey';

const EMPTY = Object.freeze({ profile: {}, documents: {}, application: { status: 'Draft' }, online: false, declinedRequests: [], apiOffer: null, activeDelivery: null, deliveries: [], exampleMetrics: null });
const keyFor = userKey;
export const RIDER_DOCUMENTS = ['nationalId', 'drivingLicense', 'vehicleRegistration', 'profilePhoto'];
// Shared by the reducer and the screens so the UI can explain exactly what is missing.
export function riderApplicationProblem(account) {
  const { fullName, phone, city, vehicle, vehicleRegistration } = account?.profile || {};
  if (!fullName?.trim() || !phone?.trim() || !city?.trim() || !vehicleRegistration?.trim()) return 'Complete your name, phone, city and vehicle registration first.';
  if (!vehicle) return 'Choose your delivery vehicle.';
  if (RIDER_DOCUMENTS.some(kind => !account?.documents?.[kind])) return 'Upload your national ID, driving licence, vehicle registration and profile photo first.';
  return '';
}
const accountFor = (state, userKey) => {
  const key = keyFor(userKey);
  if (!state.byUser[key]) state.byUser[key] = { ...EMPTY, profile: {}, documents: {}, application: { status: 'Draft' }, declinedRequests: [], apiOffer: null, deliveries: [] };
  return state.byUser[key];
};
const initialState = { byUser: {} };

const riderSlice = createSlice({
  name: 'rider', initialState,
  reducers: {
    loadRiderData(state, { payload }) {
      if (!payload?.byUser || typeof payload.byUser !== 'object' || Array.isArray(payload.byUser)) return;
      for (const [key, saved] of Object.entries(payload.byUser)) {
        if (!saved || typeof saved !== 'object') continue;
        // Older saves may still hold "bids" from the removed bidding flow; they are dropped here.
        const { bids, ...rest } = saved;
        state.byUser[keyFor(key)] = { ...EMPTY, ...rest,
          profile: saved.profile || {}, documents: saved.documents || {},
          application: saved.application || { status: 'Draft' },
          declinedRequests: Array.isArray(saved.declinedRequests) ? saved.declinedRequests : [],
          apiOffer: saved.apiOffer || null,
          deliveries: Array.isArray(saved.deliveries) ? saved.deliveries : [],
        };
      }
    },
    initializeRiderAccount(state, { payload: { userKey, account } }) {
      const key = keyFor(userKey);
      if (!state.byUser[key] && account) state.byUser[key] = { ...EMPTY, ...account };
    },
    saveRiderProfile(state, { payload: { userKey, profile } }) {
      Object.assign(accountFor(state, userKey).profile, profile);
    },
    saveRiderDocument(state, { payload: { userKey, kind, document } }) {
      if (RIDER_DOCUMENTS.includes(kind)) accountFor(state, userKey).documents[kind] = document;
    },
    submitRiderApplication(state, { payload: { userKey, at } }) {
      const account = accountFor(state, userKey);
      if (riderApplicationProblem(account) || !account.profile.email?.trim()) return;
      account.application = { status: 'Under review', submittedAt: at || new Date().toISOString(), demoApproval: false };
    },
    approveRiderDemo(state, { payload: { userKey, at } }) {
      const account = accountFor(state, userKey);
      if (account.application.status === 'Under review') account.application = { ...account.application, status: 'Approved', demoApproval: true, approvedAt: at || new Date().toISOString() };
    },
    setRiderOnline(state, { payload: { userKey, online } }) { accountFor(state, userKey).online = Boolean(online); },
    setRiderApiOffer(state, { payload: { userKey, offer } }) { accountFor(state, userKey).apiOffer = offer || null; },
    setRiderActiveDelivery(state, { payload: { userKey, delivery } }) { accountFor(state, userKey).activeDelivery = delivery || null; },
    // Delivery history from the API replaces the list; ratings the rider gave on this phone are kept.
    setRiderDeliveries(state, { payload: { userKey, deliveries } }) {
      const account = accountFor(state, userKey);
      const ratings = new Map(account.deliveries.map(item => [item.id, item]));
      account.deliveries = deliveries.map(item => ({ ...item, rating: ratings.get(item.id)?.rating ?? item.rating ?? null, feedback: ratings.get(item.id)?.feedback }));
    },
    completeRiderDelivery(state, { payload: { userKey, at } }) {
      const account = accountFor(state, userKey);
      if (!account.activeDelivery) return;
      account.deliveries.unshift({ ...account.activeDelivery, status: 'Delivered', completedAt: at || new Date().toISOString(), rating: null });
      account.activeDelivery = null;
    },
    // Demo requests have a fixed delivery fee: the rider accepts or declines, there is no bidding.
    acceptRiderRequest(state, { payload: { userKey, requestId, deliveryId, at } }) {
      const account = accountFor(state, userKey);
      const source = riderRequestById(requestId);
      if (!source || account.activeDelivery) return;
      account.activeDelivery = { ...source, id: deliveryId || `DEL-${Date.now()}`, requestId, earnings: source.deliveryFee, status: 'to-pickup', acceptedAt: at || new Date().toISOString(), isDemo: true, proofUri: null };
    },
    declineRiderRequest(state, { payload: { userKey, requestId } }) {
      const account = accountFor(state, userKey);
      if (riderRequestById(requestId) && !account.declinedRequests.includes(requestId)) account.declinedRequests.push(requestId);
    },
    saveRiderProof(state, { payload: { userKey, uri } }) {
      const active = accountFor(state, userKey).activeDelivery;
      if (active) active.proofUri = uri;
    },
    advanceRiderDelivery(state, { payload: { userKey, to, at } }) {
      const account = accountFor(state, userKey);
      const active = account.activeDelivery;
      const next = { 'to-pickup': 'to-customer', 'to-customer': 'arrived', arrived: 'completed' };
      if (!active || next[active.status] !== to) return;
      if (to !== 'completed') { active.status = to; return; }
      const done = { ...active, status: 'Delivered', completedAt: at || new Date().toISOString(), rating: null };
      account.deliveries.unshift(done);
      account.activeDelivery = null;
    },
    rateRiderDelivery(state, { payload: { userKey, deliveryId, rating, comment } }) {
      const item = accountFor(state, userKey).deliveries.find(delivery => delivery.id === deliveryId);
      if (!item || !Number.isInteger(rating) || rating < 1 || rating > 5) return;
      item.rating = rating;
      item.feedback = String(comment || '').trim().slice(0, 300);
    },
  },
});

export const {
  loadRiderData, initializeRiderAccount, saveRiderProfile, saveRiderDocument,
  submitRiderApplication, approveRiderDemo, setRiderOnline, setRiderApiOffer, setRiderActiveDelivery, setRiderDeliveries,
  completeRiderDelivery, acceptRiderRequest, declineRiderRequest, saveRiderProof, advanceRiderDelivery, rateRiderDelivery,
} = riderSlice.actions;
export const riderKey = keyFor;
export const selectRiderAccount = state => state.rider?.byUser?.[keyFor(state.auth?.user)] || EMPTY;
export default riderSlice.reducer;
