import { signIn } from '../data/accounts';
import { demoRiderAccount } from '../data/riderRequests';
import { login, logout } from './authSlice';
import { initializeRiderAccount } from './riderSlice';
import { userKey } from './userKey';

// Starts a session for a user, merging saved customer profile details and preparing role data.
export function startSession(user) {
  return (dispatch, getState) => {
    if (!user?.email || !user?.role) return;
    const profile = getState().customer?.byUser?.[userKey(user)]?.profile || {};
    const { name, phone, location, photo } = profile;
    const details = user.role === 'customer' ? Object.fromEntries(Object.entries({ name, phone, location, photo }).filter(([, value]) => value)) : {};
    dispatch(login({ ...user, ...details }));
    // Rider accounts are created once at sign-in, so screens only read state (no writes while rendering).
    if (user.role === 'rider') dispatch(initializeRiderAccount({ userKey: userKey(user), account: demoRiderAccount(user) }));
  };
}

export function signInWithPassword(email, password) {
  return dispatch => {
    const user = signIn(email, password);
    if (!user) return false;
    dispatch(startSession(user));
    return true;
  };
}

export const signOut = logout;
