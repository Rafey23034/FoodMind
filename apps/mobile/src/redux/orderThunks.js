import { restaurant } from '../data/catalog';
import { NEXT_STAGE, partnerStage } from '../data/partnerOrders';
import { selectBill, selectCartLines, syncCart, clearCart } from './cartSlice';
import { selectDeliveryAddress } from './addressesSlice';
import { selectRestaurantOnline } from './partnerSlice';
import { placeOrder, updatePartnerOrder, cancelOrder, selectMyOrders } from './ordersSlice';
import { cancelApiOrder, hasApiSession, placeApiOrder } from './apiThunks';
import { earnOrderPoints } from './customerSlice';
import { userKey } from './userKey';

// Order creation lives here rather than in a screen: it validates the cart against the
// current menu, the restaurant's availability and the delivery address before saving.
export function checkout({ at = new Date().toISOString() } = {}) {
  return (dispatch, getState) => {
    const state = getState();
    const user = state.auth.user;
    const lines = selectCartLines(state);
    if (!lines.length) return { ok: false, error: 'Add items to your cart first.' };
    if (!selectRestaurantOnline(state)) return { ok: false, error: `${restaurant.name} is not accepting orders right now.` };
    const unavailable = lines.filter(line => !line.available);
    const repriced = lines.filter(line => line.available && line.priceChanged);
    if (unavailable.length || repriced.length) {
      dispatch(syncCart(lines.filter(line => line.available).map(({ available, priceChanged, previousPrice, ...item }) => item)));
      const parts = [];
      if (unavailable.length) parts.push(`${unavailable.map(line => line.name).join(', ')} ${unavailable.length === 1 ? 'is' : 'are'} no longer available and ${unavailable.length === 1 ? 'was' : 'were'} removed`);
      if (repriced.length) parts.push('some prices changed');
      return { ok: false, error: `Your cart was updated: ${parts.join(' and ')}. Please review it before ordering.` };
    }
    const address = selectDeliveryAddress(state);
    if (!address) return { ok: false, error: 'Please choose a delivery address.' };
    const { subtotal, deliveryFee, platformFee, cartTotal } = selectBill(state);

    function placeLocalOrder() {
      const order = {
        id: `FM${Date.parse(at) || Date.now()}`,
        restaurant: restaurant.name,
        status: 'Confirmed', partnerStage: 'new',
        items: lines.map(({ available, priceChanged, previousPrice, ...item }) => item),
        customerEmail: userKey(user), customerName: user?.name || 'FoodMind diner',
        address: `${address.street}, ${address.city}`, addressLabel: address.label,
        payment: 'cash', isPaid: false,
        total: cartTotal, subtotal, deliveryFee, platformFee,
        createdAt: at,
      };
      dispatch(placeOrder(order));
      dispatch(clearCart());
      return { ok: true, orderId: order.id };
    }

    if (hasApiSession()) {
      return placeApiOrder(dispatch, getState, { lines, cartTotal }).catch(error => {
        // Keep the demo usable offline, but show real validation errors from the API.
        if (error?.status === 0) return placeLocalOrder();
        return { ok: false, error: error?.message || 'Could not place your order. Please try again.' };
      });
    }

    return placeLocalOrder();
  };
}

// Demo control on the customer side: moves an order one step along the same lifecycle
// the partner uses, so both portals always agree. Delivery awards completion points.
export function advanceOrderDemo(orderId) {
  return (dispatch, getState) => {
    const order = selectMyOrders(getState()).find(item => item.id === orderId);
    const next = NEXT_STAGE[partnerStage(order)];
    if (!order || order.source === 'api' || !next) return false;
    const at = new Date().toISOString();
    dispatch(updatePartnerOrder({ id: orderId, stage: next, prepMinutes: 20, at }));
    if (next === 'delivered') dispatch(earnOrderPoints({ userKey: userKey(order.customerEmail), orderId, createdAt: at }));
    return true;
  };
}

export function cancelMyOrder(orderId) {
  return (dispatch, getState) => {
    const order = selectMyOrders(getState()).find(item => item.id === orderId);
    if (!order || partnerStage(order) !== 'new') return false;
    if (order.source === 'api') return dispatch(cancelApiOrder(orderId));
    dispatch(cancelOrder({ id: orderId, at: new Date().toISOString() }));
    return true;
  };
}
