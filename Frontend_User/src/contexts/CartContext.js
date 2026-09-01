import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext(null);
const STORAGE_KEY = 'minishop_cart';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, quantity = 1, variations = {}) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product_id === product.id && JSON.stringify(i.variations) === JSON.stringify(variations)
      );
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id && JSON.stringify(i.variations) === JSON.stringify(variations)
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      const image = product.images && product.images.length > 0 ? product.images[0] : '';
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.sale_price ?? product.price,
        image,
        quantity,
        variations,
        shop_id: product.shop_id,
      }];
    });
    setOpen(true);
    toast.success('Added to cart');
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQty = (index, qty) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i, idx) => (idx === index ? { ...i, quantity: qty } : i)));
  };

  const clear = () => setItems([]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    return { subtotal: Math.round(subtotal * 100) / 100, count };
  }, [items]);

  return (
    <CartContext.Provider value={{ items, open, setOpen, addItem, removeItem, updateQty, clear, totals }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
