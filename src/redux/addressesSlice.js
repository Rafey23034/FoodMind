import { createSlice } from '@reduxjs/toolkit';
import { userKey } from './userKey';

// Saved addresses are separated by account email. Nothing is sent to a server.
const EMPTY_ADDRESSES = [];
const addressesSlice = createSlice({
  name: 'addresses',
  initialState: { byUser: {}, selectedByUser: {} },
  reducers: {
    loadAddresses: (state, action) => {
      state.byUser = action.payload.byUser || {};
      state.selectedByUser = action.payload.selectedByUser || {};
    },
    saveAddress: (state, action) => {
      const { userKey, address } = action.payload;
      if (!state.byUser[userKey]) state.byUser[userKey] = [];
      const list = state.byUser[userKey];
      const index = list.findIndex(value => value.id === address.id);
      if (index >= 0) list[index] = address;
      else list.push(address);
      if (!state.selectedByUser[userKey]) state.selectedByUser[userKey] = address.id;
    },
    deleteAddress: (state, action) => {
      const { userKey, id } = action.payload;
      state.byUser[userKey] = (state.byUser[userKey] || []).filter(value => value.id !== id);
      if (state.selectedByUser[userKey] === id) {
        state.selectedByUser[userKey] = state.byUser[userKey][0]?.id || null;
      }
    },
    selectAddress: (state, action) => {
      const { userKey, id } = action.payload;
      if ((state.byUser[userKey] || []).some(value => value.id === id)) {
        state.selectedByUser[userKey] = id;
      }
    },
  },
});
export const { loadAddresses, saveAddress, deleteAddress, selectAddress } = addressesSlice.actions;
export default addressesSlice.reducer;
export const addressUserKey = userKey;
export const selectUserAddresses = state => state.addresses.byUser[addressUserKey(state.auth.user)] || EMPTY_ADDRESSES;
export const selectDeliveryAddress = state => {
  const userKey = addressUserKey(state.auth.user);
  return (state.addresses.byUser[userKey] || []).find(
    value => value.id === state.addresses.selectedByUser[userKey]
  ) || null;
};
