import React from 'react';
import { Outlet } from 'react-router-dom';
import { FiSend, FiShoppingBag } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import ShopHeader from './ShopHeader';
import ShopFooter from './ShopFooter';
import CartSidebar from './CartSidebar';
import BottomNav from './BottomNav';
import ShopSkeleton from './ShopSkeleton';

export default function ShopLayout() {
  const { shop, loading, error } = useShop();
  const { t } = useLanguage();

  if (loading) {
    return <ShopSkeleton />;
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <FiShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">{t('shopUnavailable')}</h1>
        <p className="text-gray-500 mt-2">{error || t('shopNotFoundMsg')}</p>
        <a href="/" className="btn-primary mt-6 px-6 py-2 rounded-lg">{t('backHome')}</a>
      </div>
    );
  }

  // Contact this shop owner: the shop's own Telegram link, else the platform channel.
  const tgContact = shop.social_media?.telegram
    || (typeof shop.contact === 'string' && shop.contact.includes('t.me') ? shop.contact : '')
    || 'https://t.me/your_telegram';

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900">
      <ShopHeader />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <ShopFooter />
      <CartSidebar />
      <BottomNav />

      {/* Floating "Contact this shop owner" button — fixed on screen */}
      <a
        href={tgContact}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-20 md:bottom-6 right-4 z-[60] inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1d8cc1] text-white font-bold text-xs md:text-sm px-4 py-3 rounded-full shadow-2xl transition"
      >
        <FiSend className="w-4 h-4" /> {t('contactThisOwner')}
      </a>
    </div>
  );
}
