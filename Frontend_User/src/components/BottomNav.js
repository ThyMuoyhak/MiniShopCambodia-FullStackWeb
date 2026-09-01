import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiHome, FiList, FiShoppingCart, FiUser } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../i18n';

/**
 * Mobile-only bottom navigation bar (shown on phones, hidden on md+ screens).
 * - Home    -> /:username
 * - Products -> /:username/products
 * - Cart     -> opens the cart sidebar
 * - Orders   -> /:username/my-orders
 * - Profile  -> /:username/profile
 */
export default function BottomNav() {
  const { shop } = useShop();
  const { count, setOpen } = useCart();
  const { t } = useLanguage();
  const { pathname } = useLocation();

  if (!shop) return null;
  const base = `/${shop.username}`;

  // Focused flows: hide the bottom nav while paying / confirming an order.
  if (pathname === `${base}/checkout` || pathname.startsWith(`${base}/checkout/`) ||
      pathname === `${base}/order-success` || pathname.startsWith(`${base}/order-success/`)) {
    return null;
  }

  const items = [
    { to: base, exact: true, icon: <FiHome className="w-5 h-5" />, label: t('home') },
    { to: `${base}/products`, prefixes: [`${base}/products`, `${base}/product/`], icon: <FiGrid className="w-5 h-5" />, label: t('products') },
    { cart: true, icon: <FiShoppingCart className="w-5 h-5" />, label: t('cart') },
    { to: `${base}/my-orders`, prefixes: [`${base}/my-orders`], icon: <FiList className="w-5 h-5" />, label: t('myOrders') },
    { to: `${base}/profile`, prefixes: [`${base}/profile`], icon: <FiUser className="w-5 h-5" />, label: t('myProfile') },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {items.map((item) => {
          // Cart button opens the sidebar instead of navigating.
          if (item.cart) {
            return (
              <button
                key="cart"
                onClick={() => setOpen(true)}
                className="relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-gray-500 dark:text-gray-400 active:scale-95 transition"
                aria-label={t('cart')}
              >
                <span className="relative">
                  {item.icon}
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-secondary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          const active = item.exact
            ? pathname === item.to
            : (item.prefixes || []).some((p) => pathname.startsWith(p));

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 transition ${
                active ? 'text-primary' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {active && <span className="absolute top-0 w-8 h-0.5 rounded-b-full bg-primary" />}
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
