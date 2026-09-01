import React, { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { FiGrid, FiLogOut, FiMenu, FiSearch, FiShare2, FiShoppingCart, FiUser, FiX } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useCart } from '../contexts/CartContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useOwner } from '../contexts/OwnerContext';
import { useLanguage } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import CustomerAuth from './CustomerAuth';
import ShopLogo from './ShopLogo';
import { DASHBOARD_URL, fullUrl, ownerCheck } from '../api';

export default function ShopHeader() {
  const { shop } = useShop();
  const { count, setOpen } = useCart();
  const { customer, isLoggedIn, logout } = useCustomer();
  const { owner, token, isLoggedIn: isOwnerLoggedIn, logout: ownerLogout } = useOwner();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isMyShop, setIsMyShop] = useState(false);
  const base = `/${shop.username}`;
  const qrUrl = fullUrl(`/api/shops/${shop.username}/qr?url=${encodeURIComponent(`${window.location.origin}/${shop.username}`)}`);

  // Server-verified ownership: the Dashboard button shows ONLY when the signed-in
  // account is confirmed (by /api/shops/:id/owner) as the owner/staff of this shop.
  useEffect(() => {
    if (isOwnerLoggedIn && token && shop?.id) {
      ownerCheck(shop.id, token)
        .then((r) => setIsMyShop(!!r.is_owner))
        .catch(() => setIsMyShop(owner?.shop_id === shop.id));
    } else {
      setIsMyShop(false);
    }
  }, [isOwnerLoggedIn, token, shop?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitSearch = (e) => {
    e.preventDefault();
    if (search.trim()) window.location.href = `${base}/products?search=${encodeURIComponent(search.trim())}`;
  };

  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-primary text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`;

  const mobileLinkCls = ({ isActive }) =>
    `block px-3 py-2 rounded-lg transition ${isActive ? 'bg-primary text-white font-semibold' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`;

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={base} className="flex items-center gap-2 min-w-0">
            <ShopLogo shop={shop} className="w-10 h-10 rounded-full" textClassName="text-lg" />
            <span className="font-bold text-gray-900 dark:text-white truncate hidden sm:block">{shop.shop_name || shop.username}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to={base} end className={linkCls}>{t('home')}</NavLink>
            <NavLink to={`${base}/products`} className={linkCls}>{t('products')}</NavLink>
            <NavLink to={`${base}/my-orders`} className={linkCls}>{t('myOrders')}</NavLink>
            <NavLink to={`${base}/profile`} className={linkCls}>{t('myProfile')}</NavLink>
            <NavLink to={`${base}/about`} className={linkCls}>{t('about')}</NavLink>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 relative">
            <ThemeToggle />
            <LanguageSwitcher />
            {isLoggedIn ? (
              <button
                onClick={() => setLoginOpen(!loginOpen)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold"
                title={customer?.name}
              >
                <FiUser className="w-3.5 h-3.5" /> {customer?.first_name || customer?.name?.split(' ')[0]}
              </button>
            ) : (
              <button
                onClick={() => setLoginOpen(!loginOpen)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500 text-white text-xs font-semibold hover:bg-sky-600 transition"
              >
                <FiUser className="w-3.5 h-3.5" /> {t('signIn')}
              </button>
            )}
            {isMyShop && (
              <>
                <a
                  href={DASHBOARD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#011F46] text-white text-xs font-bold hover:bg-[#0a2f5c] transition"
                  title={t('youOwnThisShop')}
                >
                  <FiGrid className="w-4 h-4" /> {t('dashboard')}
                </a>
                <button
                  onClick={ownerLogout}
                  className="hidden sm:flex p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"
                  title={t('logOut')}
                >
                  <FiLogOut className="w-4 h-4" />
                </button>
              </>
            )}
            {isOwnerLoggedIn && !isMyShop && (
              <Link
                to={`/${owner.username}`}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:text-primary hover:bg-gray-100 transition"
                title={t('viewMyShop')}
              >
                <FiGrid className="w-4 h-4" /> {t('viewMyShop')}
              </Link>
            )}
            <button
              onClick={() => setQrOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label={t('qrCode')}
              title={t('qrCode')}
            >
              <FiShare2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setOpen(true)}
              className="relative p-2 rounded-lg hover:bg-gray-100"
              aria-label={t('cart')}
            >
              <FiShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {menuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
            </button>

            {/* Customer account popover */}
            {loginOpen && (
              <div className="absolute right-0 top-12 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border p-5 dark:border-gray-700 w-72">
                {isLoggedIn ? (
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
                      <FiUser className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm">{customer?.name}</p>
                    <p className="text-xs text-gray-500">{customer?.phone || customer?.email}</p>
                    <Link
                      to={`${base}/profile`}
                      onClick={() => setLoginOpen(false)}
                      className="block mt-3 w-full py-2 rounded-lg bg-sky-50 text-sky-600 text-sm font-semibold hover:bg-sky-100"
                    >
                      {t('viewProfile')}
                    </Link>
                    <button
                      onClick={() => { logout(); setLoginOpen(false); }}
                      className="mt-4 w-full py-2 rounded-lg border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50"
                    >
                      {t('logOut')}
                    </button>
                  </div>
                ) : (
                  <CustomerAuth onSuccess={() => setLoginOpen(false)} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* QR code modal */}
        {qrOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setQrOpen(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-center gap-2 mb-4">
                <ShopLogo shop={shop} className="w-9 h-9 rounded-full" textClassName="text-sm" />
                <p className="font-bold text-lg dark:text-white">{shop.shop_name || shop.username}</p>
              </div>
              <img src={qrUrl} alt={t('qrCode')} className="w-56 h-56 mx-auto rounded-xl border border-gray-200" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('scanToVisit')}</p>
              <div className="flex gap-2 mt-4">
                <a href={qrUrl} download={`${shop.username}-qr.png`} className="flex-1 btn-primary py-2.5 rounded-xl font-semibold">
                  ↓ {t('downloadQr')}
                </a>
                <button onClick={() => setQrOpen(false)} className="px-4 py-2.5 rounded-xl border text-gray-600 dark:text-gray-300 dark:border-gray-600 font-semibold">
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <form onSubmit={submitSearch} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <FiSearch className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="bg-transparent text-sm w-full focus:outline-none"
              />
            </form>
            <NavLink to={base} end className={mobileLinkCls}>{t('home')}</NavLink>
            <NavLink to={`${base}/products`} className={mobileLinkCls}>{t('products')}</NavLink>
            <NavLink to={`${base}/my-orders`} className={mobileLinkCls}>{t('myOrders')}</NavLink>
            <NavLink to={`${base}/profile`} className={mobileLinkCls}>{t('myProfile')}</NavLink>
            <NavLink to={`${base}/about`} className={mobileLinkCls}>{t('about')}</NavLink>
            {isMyShop && (
              <>
                <a
                  href={DASHBOARD_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#011F46] text-white font-bold text-sm"
                >
                  <FiGrid className="w-4 h-4" /> {t('dashboard')}
                </a>
                <button
                  onClick={ownerLogout}
                  className="block w-full text-left px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-100 text-sm"
                >
                  <FiLogOut className="inline w-4 h-4 mr-1.5" /> {t('logOut')}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
