import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ms_user'));
    } catch {
      return null;
    }
  });

  const setAuth = (token, userData) => {
    localStorage.setItem('ms_token', token);
    localStorage.setItem('ms_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ms_token');
    localStorage.removeItem('ms_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
