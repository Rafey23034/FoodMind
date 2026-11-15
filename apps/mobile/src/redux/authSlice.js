import { createSlice } from '@reduxjs/toolkit';

// Redux only keeps the current signed-in user, not the list of accounts (see data/accounts.js).
const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null },
  reducers: {
    login: (state, action) => { state.user = action.payload; },
    logout: state => { state.user = null; },
    // Profile edits change display details without starting a new session.
    updateUser: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload, email: state.user.email, role: state.user.role };
    },
    // Refreshed tokens are saved with the session without touching profile details.
    updateSessionTokens: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
  },
});

export const { login, logout, updateUser, updateSessionTokens } = authSlice.actions;
export const selectUser = state => state.auth.user;
export default authSlice.reducer;
