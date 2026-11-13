import AsyncStorage from '@react-native-async-storage/async-storage';
import startingUsers from './users.json';

// Demo accounts come from users.json; registrations are saved on this device so they survive restarts.
// Passwords are only kept locally for this frontend prototype — real authentication belongs to the backend.
export const ACCOUNTS_KEY = 'foodmind_accounts_v1';
let registered = [];

const validAccount = value => value && typeof value.email === 'string' && typeof value.password === 'string'
  && ['customer', 'partner', 'rider'].includes(value.role);
const allAccounts = () => [...startingUsers, ...registered];

export async function loadAccounts(storage = AsyncStorage) {
  try {
    const raw = await storage.getItem(ACCOUNTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    registered = Array.isArray(list) ? list.filter(validAccount) : [];
  } catch (error) {
    console.warn('Could not read saved accounts', error);
  }
}

export function signIn(email, password) {
  const account = allAccounts().find(user =>
    user.email === email.trim().toLowerCase() &&
    user.password === password
  );
  if (!account) return null;

  // Screens only need the signed-in user's name, email and role.
  return { name: account.name, email: account.email, role: account.role };
}

export function createAccount(account, role, storage = AsyncStorage) {
  const email = account.email.trim().toLowerCase();
  if (allAccounts().some(user => user.email === email)) {
    return { success: false, message: 'An account with this email already exists.' };
  }
  registered.push({ name: account.name, email, password: account.password, role });
  storage.setItem(ACCOUNTS_KEY, JSON.stringify(registered)).catch(error => console.warn('Could not save account', error));
  return { success: true, email };
}
