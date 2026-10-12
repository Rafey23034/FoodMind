import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const DEMO_ACCOUNT = {
  name: 'Demo',
  email: 'demo@food.com',
  password: '123456',
};

export function AuthProvider({ children }) {
  const [registeredAccount, setRegisteredAccount] = useState(null);
  const [user, setUser] = useState(null);

  const register = account => setRegisteredAccount(account);
  const logout = () => setUser(null);

  function login(email, password) {
    let matchedAccount = null;

    if (registeredAccount && email === registeredAccount.email && password === registeredAccount.password) {
      matchedAccount = registeredAccount;
    } else if (email === DEMO_ACCOUNT.email && password === DEMO_ACCOUNT.password) {
      matchedAccount = DEMO_ACCOUNT;
    }

    if (!matchedAccount) return false;
    setUser({ name: matchedAccount.name, email: matchedAccount.email });
    return true;
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
