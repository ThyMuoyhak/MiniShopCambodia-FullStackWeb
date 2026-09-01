import React, { createContext, useContext, useState } from 'react';
import { ownerLogin as apiOwnerLogin } from '../api';

// Shop-owner session for the storefront (Frontend_User).
// When a shop owner registers a shop they are auto-logged-in here so they can
// see the "ផ្ទាំងគ្រប់គ្រង" (Dashboard) button on their own shop page only.
const OwnerContext = createContext(null);

export function OwnerProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ms_owner_session')) || null;
    } catch {
      return null;
    }
  });

  const saveSession = (res) => {
    const data = { token: res.access_token, user: res.user };
    localStorage.setItem('ms_owner_session', JSON.stringify(data));
    setSession(data);
    return data;
  };

  const login = async (username, password) => {
    const res = await apiOwnerLogin({ username, password });
    return saveSession(res);
  };

  // Used right after /api/plans/register — the response already contains a
  // valid access token for the newly created owner account.
  const setFromRegistration = (res) => saveSession(res);

  const logout = () => {
    localStorage.removeItem('ms_owner_session');
    setSession(null);
  };

  return (
    <OwnerContext.Provider
      value={{
        owner: session?.user || null,
        token: session?.token || null,
        isLoggedIn: !!session?.token,
        login,
        setFromRegistration,
        logout,
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
}

export const useOwner = () => useContext(OwnerContext);
