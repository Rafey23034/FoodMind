import { api, ApiError, getApiSession } from '../services/api';
import { restaurant } from '../data/catalog';
import { setUserAddresses, deleteAddress, saveAddress, selectAddress, selectDeliveryAddress } from './addressesSlice';
import { mergeOrders, placeOrder, replaceOrder } from './ordersSlice';
import { clearCart } from './cartSlice';
import { apiOrderToLocal, clean } from './apiOrderMap';
import { savePartnerProfile, setPartnerOnline } from './partnerSlice';
import { advanceRiderDelivery, completeRiderDelivery, saveRiderProfile, setRiderActiveDelivery, setRiderApiOffer, setRiderOnline } from './riderSlice';
import { userKey } from './userKey';

let restaurantCache = null;
const DEFAULT_RIDER_LOCATION = { lat: 31.4697, lng: 74.2728, accuracyM: 80 };

export const hasApiSession = () => {
  const tokens = getApiSession();
  return Boolean(tokens.accessToken || tokens.refreshToken);
};

export { apiOrderToLocal };

function apiAddressToLocal(address) {
  return {
    id: String(address.id),
    apiId: String(address.id),
    label: address.label,
    street: address.street,
    area: address.area || '',
    city: address.city,
    isDefault: Boolean(address.isDefault),
    location: address.location || (address.lat != null && address.lng != null
      ? { lat: Number(address.lat), lng: Number(address.lng) }
      : null),
  };
}

async function loadRestaurantContext() {
  if (restaurantCache) return restaurantCache;
  const { restaurants } = await api.catalog.restaurants();
  const venue = restaurants.find(value => clean(value.name) === clean(restaurant.name));
  if (!venue) throw new ApiError('This restaurant is not available right now.', 404);
  const menu = await api.catalog.menu(venue.id);
  restaurantCache = { restaurant: venue, items: menu.items };
  return restaurantCache;
}

async function ensureAddressId(dispatch, getState) {
  const state = getState();
  const key = userKey(state.auth.user);
  const address = selectDeliveryAddress(state);
  if (!address) throw new ApiError('Please choose a delivery address.', 400);
  if (address.apiId) return Number(address.apiId);

  const { address: created } = await api.addresses.create({
    label: address.label,
    street: address.street,
    area: address.area || undefined,
    city: address.city,
    lat: address.location?.lat,
    lng: address.location?.lng,
    isDefault: true,
  });

  dispatch(deleteAddress({ userKey: key, id: address.id }));
  const saved = {
    ...address,
    ...apiAddressToLocal(created),
    label: address.label,
    street: address.street,
    city: address.city,
  };
  dispatch(saveAddress({ userKey: key, address: saved }));
  dispatch(selectAddress({ userKey: key, id: saved.id }));
  return Number(saved.apiId);
}

async function apiItemsFor(lines) {
  const { restaurant: venue, items } = await loadRestaurantContext();
  const menu = new Map(items.map(item => [clean(item.name), item]));

  return {
    restaurantId: Number(venue.id),
    items: lines.map(line => {
      const item = menu.get(clean(line.name));
      if (!item) throw new ApiError(`${line.name} is no longer available. Refresh your cart.`, 400);
      const extras = line.option === 'Extra Chicken'
        ? (item.options || []).filter(option => clean(option.name).includes('extra chicken')).map(option => Number(option.id))
        : [];
      return { menuItemId: Number(item.id), quantity: line.quantity, ...(extras.length ? { optionIds: extras } : {}) };
    }),
  };
}

export function syncCustomerData() {
  return async (dispatch, getState) => {
    const user = getState().auth.user;
    if (user?.role !== 'customer' || !hasApiSession()) return;

    const key = userKey(user);
    const [addressResult, orderResult] = await Promise.allSettled([api.addresses.list(), api.orders.list()]);

    if (addressResult.status === 'fulfilled' && addressResult.value.addresses?.length) {
      const addresses = addressResult.value.addresses.map(apiAddressToLocal);
      dispatch(setUserAddresses({
        userKey: key,
        addresses,
        selectedId: addresses.find(address => address.isDefault)?.id,
      }));
    }

    if (orderResult.status === 'fulfilled') {
      dispatch(mergeOrders(orderResult.value.orders.map(apiOrderToLocal)));
    }
  };
}

export function syncPartnerData() {
  return async (dispatch, getState) => {
    const user = getState().auth.user;
    if (user?.role !== 'partner' || !hasApiSession()) return;

    const key = userKey(user);
    const [ordersResult, dashboardResult] = await Promise.allSettled([api.partner.orders(), api.partner.dashboard()]);

    if (ordersResult.status === 'fulfilled') {
      dispatch(mergeOrders(ordersResult.value.orders.map(apiOrderToLocal)));
    }

    if (dashboardResult.status === 'fulfilled') {
      const venue = dashboardResult.value.restaurant;
      dispatch(savePartnerProfile({
        userKey: key,
        profile: {
          name: venue.name,
          ownerName: user.name,
          email: venue.email || user.email,
          phone: venue.phone || '',
          address: [venue.address_line, venue.city].filter(Boolean).join(', '),
          description: venue.description || '',
          logoUri: venue.logo_url,
          coverUri: venue.cover_url,
        },
      }));
      dispatch(setPartnerOnline({ userKey: key, online: Boolean(venue.isAcceptingOrders) }));
    }
  };
}

export function setPartnerAvailability(online) {
  return async (dispatch, getState) => {
    const key = userKey(getState().auth.user);
    dispatch(setPartnerOnline({ userKey: key, online: Boolean(online) }));
    if (!hasApiSession()) return true;
    try {
      await api.partner.availability(Boolean(online));
      return true;
    } catch {
      dispatch(setPartnerOnline({ userKey: key, online: !online }));
      return false;
    }
  };
}

function riderDeliveryFromOrder(order) {
  const local = apiOrderToLocal(order);
  return {
    id: local.id,
    orderId: local.id,
    requestId: null,
    restaurant: local.restaurant,
    pickupAddress: order.restaurantAddress || `Pick up from ${local.restaurant}`,
    customer: local.customerName || local.customerEmail || 'FoodMind customer',
    customerAddress: local.address,
    items: local.items,
    earnings: Number(local.deliveryFee) || 0,
    distanceKm: local.deliveryDistanceM != null ? (local.deliveryDistanceM / 1000).toFixed(1) : '—',
    etaMinutes: local.etaMinutes || 20,
    pickupCode: local.pickupCode || null,
    status: local.dbStatus === 'picked_up' ? 'to-customer' : 'to-pickup',
    proofUri: null,
    isApi: true,
  };
}

function riderOfferFromApi(offer) {
  return {
    ...offer,
    id: String(offer.id),
    orderId: String(offer.orderId),
    restaurantName: offer.restaurant?.name,
    restaurantAddress: offer.restaurant?.address,
    distanceKm: (Number(offer.distanceM) / 1000).toFixed(1),
  };
}

export function syncRiderData() {
  return async (dispatch, getState) => {
    const user = getState().auth.user;
    if (user?.role !== 'rider' || !hasApiSession()) return;

    const key = userKey(user);
    const [statusResult, offerResult, activeResult] = await Promise.allSettled([
      api.rider.status(), api.rider.currentOffer(), api.rider.activeOrder(),
    ]);

    if (statusResult.status === 'fulfilled') {
      const profile = statusResult.value.rider;
      dispatch(setRiderOnline({ userKey: key, online: profile.isOnline }));
      dispatch(saveRiderProfile({
        userKey: key,
        profile: {
          fullName: user.name,
          email: user.email,
          city: profile.city || '',
          vehicle: profile.vehicleType || '',
          vehicleRegistration: profile.vehicleRegistration || '',
        },
      }));
      const lastPing = profile.locationUpdatedAt ? new Date(profile.locationUpdatedAt).getTime() : 0;
      if (profile.isOnline && Date.now() - lastPing > 90000) {
        api.rider.location(DEFAULT_RIDER_LOCATION).catch(() => {});
      }
    }

    if (offerResult.status === 'fulfilled') {
      dispatch(setRiderApiOffer({ userKey: key, offer: offerResult.value.offer ? riderOfferFromApi(offerResult.value.offer) : null }));
    }

    if (activeResult.status === 'fulfilled') {
      const current = getState().rider.byUser[key]?.activeDelivery;
      if (activeResult.value.order) {
        const delivery = riderDeliveryFromOrder(activeResult.value.order);
        if (current?.id === delivery.id) {
          delivery.proofUri = current.proofUri;
          if (current.status === 'arrived') delivery.status = 'arrived';
        }
        dispatch(setRiderActiveDelivery({ userKey: key, delivery }));
      } else if (current?.isApi) dispatch(setRiderActiveDelivery({ userKey: key, delivery: null }));
    }
  };
}

export function setRiderAvailability(online) {
  return async (dispatch, getState) => {
    const key = userKey(getState().auth.user);
    dispatch(setRiderOnline({ userKey: key, online: Boolean(online) }));
    if (!online) dispatch(setRiderApiOffer({ userKey: key, offer: null }));
    if (!hasApiSession()) return true;
    try {
      const result = await api.rider.setOnline(Boolean(online));
      dispatch(setRiderOnline({ userKey: key, online: result.rider.isOnline }));
      if (result.rider.isOnline) await api.rider.location(DEFAULT_RIDER_LOCATION);
      return true;
    } catch {
      dispatch(setRiderOnline({ userKey: key, online: !online }));
      return false;
    }
  };
}

export function respondToRiderOffer(offerId, action) {
  return async (dispatch, getState) => {
    const key = userKey(getState().auth.user);
    try {
      const result = await api.rider.respondToOffer(offerId, action);
      dispatch(setRiderApiOffer({ userKey: key, offer: null }));
      if (result.order) dispatch(setRiderActiveDelivery({ userKey: key, delivery: riderDeliveryFromOrder(result.order) }));
      return { ok: true, delivery: result.order ? riderDeliveryFromOrder(result.order) : null };
    } catch (error) {
      return { ok: false, error: error?.message || 'Could not answer this delivery offer.' };
    }
  };
}

export function pickupApiOrder(orderId, code) {
  return async (dispatch, getState) => {
    try {
      await api.rider.pickup(orderId, code);
      dispatch(advanceRiderDelivery({ userKey: userKey(getState().auth.user), to: 'to-customer' }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || 'That pickup code did not match.' };
    }
  };
}

export function completeApiOrder(orderId) {
  return async (dispatch, getState) => {
    try {
      await api.rider.delivered(orderId);
      dispatch(completeRiderDelivery({ userKey: userKey(getState().auth.user), at: new Date().toISOString() }));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error?.message || 'Could not complete this delivery.' };
    }
  };
}

export async function placeApiOrder(dispatch, getState, { lines, cartTotal }) {
  const { restaurantId, items } = await apiItemsFor(lines);
  const addressId = await ensureAddressId(dispatch, getState);
  const { order } = await api.orders.create({
    restaurantId,
    addressId,
    items,
    idempotencyKey: `mobile-${userKey(getState().auth.user)}-${Date.now()}`,
  });

  const local = apiOrderToLocal(order);
  dispatch(placeOrder(local));
  dispatch(clearCart());
  return { ok: true, orderId: local.id, order: local, total: cartTotal };
}

export function saveCustomerAddress({ userKey: key, address }) {
  return async dispatch => {
    let apiId = address.apiId;
    const body = { label: address.label, street: address.street, area: address.area || undefined, city: address.city };

    if (hasApiSession()) {
      try {
        if (apiId) {
          await api.addresses.update(apiId, body);
        } else {
          const result = await api.addresses.create({ ...body, isDefault: Boolean(address.isDefault) });
          apiId = String(result.address.id);
          if (result.address.location || result.address.lat != null) {
            address = { ...address, ...apiAddressToLocal(result.address), id: address.id };
          }
        }
      } catch (error) {
        if (error?.status !== 0) return { ok: false, error: error?.message || 'Could not save this address.' };
      }
    }

    const saved = { ...address, apiId };
    dispatch(saveAddress({ userKey: key, address: saved }));
    dispatch(selectAddress({ userKey: key, id: saved.id }));
    return { ok: true, address: saved };
  };
}

export function deleteCustomerAddress({ userKey: key, address }) {
  return async dispatch => {
    if (address.apiId && hasApiSession()) {
      try {
        await api.addresses.remove(address.apiId);
      } catch (error) {
        if (error?.status !== 0 && error?.status !== 404) return { ok: false, error: error?.message || 'Could not remove this address.' };
      }
    }
    dispatch(deleteAddress({ userKey: key, id: address.id }));
    return { ok: true };
  };
}

export function saveApiReview(orderId, { restaurantRating, riderRating, comment }) {
  return async () => {
    if (!hasApiSession()) return false;
    try {
      await api.orders.review(orderId, {
        restaurantRating,
        ...(riderRating ? { riderRating } : {}),
        ...(comment ? { comment } : {}),
      });
      return true;
    } catch {
      return false;
    }
  };
}

export function refreshOrderTracking(orderId) {
  return async dispatch => {
    if (!hasApiSession()) return null;
    try {
      const result = await api.orders.tracking(orderId);
      const order = { ...apiOrderToLocal(result.order), route: result.route, eta: result.eta, estimatedDeliveryAt: result.estimatedDeliveryAt };
      dispatch(replaceOrder(order));
      return order;
    } catch {
      return null;
    }
  };
}

export function cancelApiOrder(orderId) {
  return async dispatch => {
    try {
      const { order } = await api.orders.cancel(orderId);
      dispatch(replaceOrder(apiOrderToLocal(order)));
      return true;
    } catch {
      return false;
    }
  };
}
