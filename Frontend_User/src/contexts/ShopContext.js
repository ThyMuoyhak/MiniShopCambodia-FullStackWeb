import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getShop, fullUrl } from '../api';

const ShopContext = createContext(null);

// The browser-tab icon (favicon) follows the active shop's logo.
// The default favicon link in index.html has data-default="true".
function setShopFavicon(logoUrl) {
  document.querySelectorAll('link[rel="icon"]:not([data-default])').forEach((l) => l.remove());
  if (logoUrl) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'icon');
    link.setAttribute('href', logoUrl);
    document.head.appendChild(link);
  }
}

export const ShopProvider = ({ children }) => {
  const { username } = useParams();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) {
      setShop(null);
      setLoading(false);
      setError(null);
      document.title = 'Mini Shop';
      setShopFavicon(null);
      return;
    }
    setLoading(true);
    setError(null);
    setShop(null); // reset so we never show the previous shop's data while loading
    setShopFavicon(null);
    getShop(username)
      .then((data) => {
        setShop(data);
        // Dynamic browser tab title + meta description for this shop.
        const shopTitle = data.shop_name || data.username || 'Shop';
        document.title = `${shopTitle} | Mini Shop`;
        // Browser-tab icon (favicon) follows the shop's logo.
        setShopFavicon(data.logo ? fullUrl(data.logo) : null);
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'description');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', (data.description || data.bio || `Shop ${shopTitle} on Mini Shop`).slice(0, 200));
        // Apply theme colors
        const theme = data.theme || {};
        if (theme.primary) document.documentElement.style.setProperty('--primary', theme.primary);
        if (theme.secondary) document.documentElement.style.setProperty('--secondary', theme.secondary);
        if (theme.font_family) document.documentElement.style.fontFamily = `'${theme.font_family}', sans-serif`;
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Shop not found');
        toast.error(err?.response?.data?.detail || 'Shop not found');
        setShopFavicon(null);
      })
      .finally(() => setLoading(false));
  }, [username]);

  return (
    <ShopContext.Provider value={{ shop, loading, error, setShop }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
