import { createSelector, createSlice } from '@reduxjs/toolkit';
import { restaurant, normalizeCart, pricing } from '../data/catalog';
import { selectAvailableItems } from './menuSlice';
import { login, logout } from './authSlice';
import { userKey } from './userKey';

// `items` is always the signed-in user's cart. Other accounts' carts wait in `byUser`
// and are swapped in on sign-in, so one person never sees another person's cart.
const initialState = { items: [], owner: null, byUser: {} };

function stash(state) {
  if (!state.owner) return;
  if (state.items.length) state.byUser[state.owner] = state.items;
  else delete state.byUser[state.owner];
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    loadCart: (state, action) => {
      const saved = action.payload;
      if (Array.isArray(saved)) { state.items = normalizeCart(saved); return; }
      if (!saved || typeof saved !== 'object' || !saved.byUser || typeof saved.byUser !== 'object') return;
      state.byUser = {};
      for (const [key, items] of Object.entries(saved.byUser)) {
        const normalized = normalizeCart(items);
        if (normalized.length) state.byUser[key] = normalized;
      }
      if (state.owner && state.byUser[state.owner]) {
        state.items = state.byUser[state.owner];
        delete state.byUser[state.owner];
      }
    },
    addItem: (state, action) => {
      const item = normalizeCart([action.payload])[0];
      if (!item) return; // Ignore malformed cart entries.
      const existing = state.items.find(value => value.id === item.id);
      if (existing) existing.quantity = Math.min(99, existing.quantity + item.quantity);
      else state.items.push(item);
    },
    changeQuantity: (state, action) => {
      const item = state.items.find(value => value.id === action.payload.id);
      if (item) item.quantity = Math.min(99, Math.max(1, item.quantity + action.payload.amount));
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(value => value.id !== action.payload);
    },
    clearCart: state => { state.items = []; },
    reorder: (state, action) => { state.items = normalizeCart(action.payload); },
    // Replaces stored price snapshots with current menu prices and drops unavailable dishes.
    syncCart: (state, action) => { state.items = normalizeCart(action.payload); },
  },
  extraReducers: builder => {
    builder.addCase(login, (state, action) => {
      const key = userKey(action.payload);
      if (state.owner === key) return;
      stash(state);
      state.items = state.byUser[key] || [];
      delete state.byUser[key];
      state.owner = key;
    });
    builder.addCase(logout, state => {
      stash(state);
      state.items = [];
      state.owner = null;
    });
  },
});

export const { loadCart, addItem, changeQuantity, removeItem, clearCart, reorder, syncCart } = cartSlice.actions;
export default cartSlice.reducer;

// Persisted form: every account's cart, including the one currently in use.
export function cartForStorage(cart) {
  return { byUser: { ...cart.byUser, ...(cart.owner && cart.items.length ? { [cart.owner]: cart.items } : {}) } };
}

const selectCartItems = state => state.cart.items;
const baseDishId = item => item.dishId || String(item.id).replace(/-extra$/, '');

// Each cart line priced against today's menu. Unavailable or deleted dishes are flagged, not charged.
export const selectCartLines = createSelector([selectCartItems, selectAvailableItems], (items, menu) => items.map(item => {
  const dish = menu.find(value => value.id === baseDishId(item));
  if (!dish) return { ...item, available: false };
  const extra = String(item.id).endsWith('-extra');
  const price = dish.price + (extra ? pricing.extraChicken : 0);
  return { ...item, name: dish.name, price, available: true, priceChanged: price !== item.price, previousPrice: item.price };
}));

export const selectCartCount = createSelector([selectCartItems], items => items.reduce((total, item) => total + item.quantity, 0));

// A few easy calculations shared by Cart and Checkout. Memoized so the object is stable between renders.
export const selectBill = createSelector([selectCartLines], lines => {
  const subtotal = lines.filter(line => line.available).reduce((sum, item) => sum + item.price * item.quantity, 0);
  // All items belong to the same restaurant, so charge delivery once.
  const deliveryFee = subtotal > 0 ? restaurant.deliveryFee : 0;
  const platformFee = subtotal > 0 ? pricing.platformFee : 0;
  return { subtotal, deliveryFee, platformFee, cartTotal: subtotal + deliveryFee + platformFee };
});

export const selectCartProblems = createSelector([selectCartLines], lines => ({
  unavailable: lines.filter(line => !line.available),
  repriced: lines.filter(line => line.available && line.priceChanged),
}));
