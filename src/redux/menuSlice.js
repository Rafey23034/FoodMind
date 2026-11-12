import { createSelector, createSlice } from '@reduxjs/toolkit';
import { restaurant } from '../data/catalog';

const initialState = { added: [], edited: {}, unavailable: [], deleted: [] };

// JSON is the starter menu. Redux holds only partner changes.
const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    loadMenu: (state, action) => {
      const saved = action.payload;
      if (!saved || typeof saved !== 'object') return;
      state.added = Array.isArray(saved.added) ? saved.added : [];
      state.edited = saved.edited && typeof saved.edited === 'object' ? saved.edited : {};
      state.unavailable = Array.isArray(saved.unavailable) ? saved.unavailable : [];
      state.deleted = Array.isArray(saved.deleted) ? saved.deleted : [];
    },
    saveMenuItem: (state, action) => {
      const item = action.payload;
      state.deleted = (state.deleted || []).filter(id => id !== item.id);
      const position = state.added.findIndex(value => value.id === item.id);
      if (position >= 0) {
        state.added[position] = item;
      } else if (restaurant.items.some(value => value.id === item.id)) {
        state.edited[item.id] = item;
      } else {
        state.added.push(item);
      }
    },
    toggleMenuItem: (state, action) => {
      const id = action.payload;
      if (state.unavailable.includes(id)) {
        state.unavailable = state.unavailable.filter(value => value !== id);
      } else {
        state.unavailable.push(id);
      }
    },
    deleteMenuItem: (state, { payload: id }) => {
      state.added = state.added.filter(item => item.id !== id);
      delete state.edited[id];
      state.unavailable = state.unavailable.filter(value => value !== id);
      if (restaurant.items.some(item => item.id === id) && !(state.deleted || []).includes(id)) {
        state.deleted = [...(state.deleted || []), id];
      }
    },
  },
});

export const { loadMenu, saveMenuItem, toggleMenuItem, deleteMenuItem } = menuSlice.actions;
export default menuSlice.reducer;

// Memoized: components re-render only when the partner actually changes the menu.
const selectMenuState = state => state.menu || initialState;
export const selectMenuItems = createSelector([selectMenuState], menu => {
  const deleted = menu.deleted || [];
  const items = restaurant.items.filter(item => !deleted.includes(item.id)).map(item => menu.edited[item.id] || item);
  return [...items, ...menu.added];
});
export const selectAvailableItems = createSelector(
  [selectMenuItems, state => selectMenuState(state).unavailable],
  (items, unavailable) => items.filter(item => !unavailable.includes(item.id)),
);
export const selectMenuCategories = createSelector([selectMenuItems], items => [...new Set(items.map(item => item.category))]);
