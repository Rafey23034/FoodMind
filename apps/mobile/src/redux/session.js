import { signIn, createAccount } from '../data/accounts';
import { demoRiderAccount } from '../data/riderRequests';
import { api, ApiError, API_ENABLED, clearApiSession, setApiSession } from '../services/api';
import { syncCustomerData, syncPartnerData, syncRiderData } from './apiThunks';
import { login, logout, updateSessionTokens } from './authSlice';
import { initializeRiderAccount } from './riderSlice';
import { userKey } from './userKey';

const tokensFrom = session => session?.accessToken && session?.refreshToken
  ? { accessToken: session.accessToken, refreshToken: session.refreshToken }
  : {};
const userFrom = session => session?.user ? { ...session.user, ...tokensFrom(session) } : null;
const isUnreachable = error => error instanceof ApiError && error.status === 0;

// Starts a session for a user, merging saved customer profile details and preparing role data.
export function startSession(user) {
  return (dispatch, getState) => {
    if (!user?.email || !user?.role) return;

    setApiSession(tokensFrom(user), tokens => {
      if (tokens) dispatch(updateSessionTokens(tokens));
      else dispatch(logout());
    });

    const profile = getState().customer?.byUser?.[userKey(user)]?.profile || {};
    const { name, phone, location, photo } = profile;
    const details = user.role === 'customer' ? Object.fromEntries(Object.entries({ name, phone, location, photo }).filter(([, value]) => value)) : {};
    dispatch(login({ ...user, ...details }));
    // Rider accounts are created once at sign-in, so screens only read state (no writes while rendering).
    if (user.role === 'rider') dispatch(initializeRiderAccount({ userKey: userKey(user), account: demoRiderAccount(user) }));
    if (user.role === 'customer' && (user.accessToken || user.refreshToken)) dispatch(syncCustomerData());
    if (user.role === 'partner' && (user.accessToken || user.refreshToken)) dispatch(syncPartnerData());
    if (user.role === 'rider' && (user.accessToken || user.refreshToken)) dispatch(syncRiderData());
  };
}

export function signInWithPassword(email, password) {
  return async dispatch => {
    if (API_ENABLED) {
      try {
        const session = await api.auth.login({ email: email.trim().toLowerCase(), password });
        dispatch(startSession(userFrom(session)));
        return true;
      } catch (error) {
        // Keep the local demo usable when the API is not running. Rejected credentials stay rejected.
        if (!isUnreachable(error)) return false;
      }
    }

    const user = signIn(email, password);
    if (!user) return false;
    dispatch(startSession(user));
    return true;
  };
}

export function registerWithPassword(account, role) {
  return async () => {
    if (API_ENABLED) {
      try {
        const session = await api.auth.register({ ...account, role });
        return { success: true, email: session.user.email };
      } catch (error) {
        if (!isUnreachable(error)) return { success: false, message: error.message };
      }
    }
    return createAccount(account, role);
  };
}

export function signOut() {
  return dispatch => {
    clearApiSession();
    dispatch(logout());
  };
}
