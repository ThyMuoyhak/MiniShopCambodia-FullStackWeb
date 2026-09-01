import React, { createContext, useContext, useState } from 'react';
import { customerSignin, customerSignup } from '../api';

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
  const [customer, setCustomer] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ms_customer'));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('ms_customer_token'));

  const setSession = (res) => {
    localStorage.setItem('ms_customer_token', res.access_token);
    localStorage.setItem('ms_customer', JSON.stringify(res.customer));
    setToken(res.access_token);
    setCustomer(res.customer);
    return res.customer;
  };

  const signin = async (shopId, identifier, password) => {
    const res = await customerSignin({ shop_id: shopId, identifier, password });
    return setSession(res);
  };

  const signup = async (shopId, data) => {
    const res = await customerSignup({ shop_id: shopId, ...data });
    return setSession(res);
  };

  const logout = () => {
    localStorage.removeItem('ms_customer_token');
    localStorage.removeItem('ms_customer');
    setToken(null);
    setCustomer(null);
  };

  return (
    <CustomerContext.Provider value={{ customer, token, isLoggedIn: !!token, signin, signup, setSession, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => useContext(CustomerContext);
