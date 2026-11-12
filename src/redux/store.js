import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import ordersReducer from './ordersSlice';
import addressesReducer from './addressesSlice';
import menuReducer from './menuSlice';
import customerReducer from './customerSlice';
import partnerReducer from './partnerSlice';
import riderReducer from './riderSlice';

// Each slice handles one type of shared app data.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    orders: ordersReducer,
    addresses: addressesReducer,
    menu: menuReducer,
    customer: customerReducer,
    partner: partnerReducer,
    rider: riderReducer,
  },
});
