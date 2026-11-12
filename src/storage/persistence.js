import AsyncStorage from '@react-native-async-storage/async-storage';
import { restaurant, normalizeCart } from '../data/catalog';
import { loadAccounts } from '../data/accounts';
import { loadCart, cartForStorage } from '../redux/cartSlice';
import { loadOrders } from '../redux/ordersSlice';
import { loadAddresses } from '../redux/addressesSlice';
import { loadMenu } from '../redux/menuSlice';
import { loadCustomerData } from '../redux/customerSlice';
import { loadPartnerData } from '../redux/partnerSlice';
import { loadRiderData } from '../redux/riderSlice';
import { startSession } from '../redux/session';

// Every persisted slice in one table. Keys are unchanged from earlier versions where possible,
// so existing addresses, orders, menu edits and role data keep loading.
export const SESSION_KEY = 'foodmind_session_v1';
const migrateOrders = items => (Array.isArray(items) ? items : [])
  .map(order => ({ ...order, restaurant: order.restaurant || restaurant.name, items: normalizeCart(order.items) }))
  .filter(order => order.items.length > 0);

export const PERSISTED = [
  { key: 'foodmind_cart_v2', select: state => state.cart, serialize: cartForStorage, load: loadCart },
  { key: 'orders', select: state => state.orders.items, load: value => loadOrders(migrateOrders(value)) },
  { key: 'foodmind_addresses_by_user', select: state => state.addresses, load: loadAddresses },
  { key: 'foodmind_partner_menu', select: state => state.menu, load: loadMenu },
  { key: 'foodmind_customer_features_v1', select: state => state.customer, load: loadCustomerData },
  { key: 'foodmind_partner_features_v1', select: state => state.partner, load: loadPartnerData },
  { key: 'foodmind_rider_features_v1', select: state => state.rider, load: loadRiderData },
  // Stored last so a session is restored only after the user's data is in place.
  { key: SESSION_KEY, select: state => state.auth.user, serialize: user => ({ user }), load: null },
];

// Reads every key independently. A damaged value is copied to a backup key and skipped,
// so one bad entry can never stop the others from loading or get them overwritten with empty data.
export async function hydrateStore(store, storage = AsyncStorage) {
  await loadAccounts(storage);
  let pairs = [];
  try {
    pairs = await storage.multiGet(PERSISTED.map(entry => entry.key));
  } catch (error) {
    console.warn('Could not read saved FoodMind data', error);
  }
  const raw = Object.fromEntries(pairs);
  let session = null;
  for (const entry of PERSISTED) {
    const text = raw[entry.key];
    if (text == null) continue;
    let value;
    try {
      value = JSON.parse(text);
    } catch (error) {
      console.warn(`Saved data for ${entry.key} was unreadable; a backup copy was kept`, error);
      await storage.setItem(`${entry.key}.corrupt-${Date.now()}`, text).catch(() => {});
      continue;
    }
    if (entry.key === SESSION_KEY) session = value?.user || null;
    else if (value !== null) store.dispatch(entry.load(value));
  }
  if (session) store.dispatch(startSession(session));
}

// Writes only the slices that changed, batched so rapid taps (e.g. quantity buttons) cause one write.
export function startPersistence(store, storage = AsyncStorage, delay = 300) {
  const last = new Map(PERSISTED.map(entry => [entry.key, entry.select(store.getState())]));
  const dirty = new Set();
  let timer = null;
  function flush() {
    timer = null;
    if (!dirty.size) return Promise.resolve();
    const state = store.getState();
    const writes = [...dirty].map(key => {
      const entry = PERSISTED.find(item => item.key === key);
      const value = entry.select(state);
      return [key, JSON.stringify(entry.serialize ? entry.serialize(value) : value)];
    });
    dirty.clear();
    return storage.multiSet(writes).catch(error => console.warn('Could not save FoodMind data', error));
  }
  const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    for (const entry of PERSISTED) {
      const value = entry.select(state);
      if (value !== last.get(entry.key)) { last.set(entry.key, value); dirty.add(entry.key); }
    }
    if (dirty.size && !timer) timer = setTimeout(flush, delay);
  });
  return {
    flush: () => { if (timer) clearTimeout(timer); return flush(); },
    stop: () => { if (timer) clearTimeout(timer); unsubscribe(); return flush(); },
  };
}
