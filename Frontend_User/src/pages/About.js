import React from 'react';
import { FiMapPin } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import SocialLinks from '../components/SocialLinks';
import ShopLogo from '../components/ShopLogo';
import { fullUrl } from '../api';

export default function About() {
  const { shop } = useShop();
  const { t } = useLanguage();
  if (!shop) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <ShopLogo shop={shop} className="w-24 h-24 rounded-full mx-auto" textClassName="text-4xl" />
        <h1 className="text-3xl font-bold mt-4">{shop.shop_name || shop.username}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">@{shop.username}</p>
      </div>

      {shop.banner && (
        <div className="rounded-2xl overflow-hidden mb-8 h-48">
          <img src={fullUrl(shop.banner)} alt="Banner" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8">
        <h2 className="text-xl font-bold mb-4">{t('aboutUs')}</h2>
        <div className="space-y-4 text-gray-600 dark:text-gray-100 whitespace-pre-line">
          {shop.description || shop.bio || 'Welcome to our shop!'}
        </div>

        {shop.contact && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-bold mb-2 flex items-center gap-2"><FiMapPin className="text-primary" /> {t('contact')}</h3>
            <p className="text-gray-600 dark:text-gray-100 whitespace-pre-line">{shop.contact}</p>
          </div>
        )}

        <div className="mt-6 border-t pt-6">
          <h3 className="font-bold mb-3">{t('followUs')}</h3>
          <SocialLinks />
        </div>
      </div>
    </div>
  );
}
