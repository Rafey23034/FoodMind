// One rule for turning a signed-in user (or an email) into the key used by every per-account map.
export function userKey(value) {
  const email = typeof value === 'string' ? value : value?.email;
  return String(email || '').trim().toLowerCase() || 'guest';
}

export const selectUserKey = state => userKey(state.auth?.user);
