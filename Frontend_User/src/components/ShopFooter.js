import React from 'react';
import { Link } from 'react-router-dom';
import { FiCreditCard } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import SocialLinks from './SocialLinks';
import ShopLogo from './ShopLogo';

export default function ShopFooter() {
  const { shop } = useShop();
  const { t } = useLanguage();
  const base = `/${shop.username}`;
  return (
    <footer className="bg-gray-900 text-gray-300 pb-24 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShopLogo shop={shop} className="w-8 h-8 rounded-full" textClassName="text-sm" />
              <span className="text-white font-bold">{shop.shop_name || shop.username}</span>
            </div>
            <p className="text-sm text-gray-400 line-clamp-3">{shop.bio || shop.description}</p>
            <div className="mt-4">
              <SocialLinks />
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">{t('quickLinks')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to={base} className="hover:text-white">{t('home')}</Link></li>
              <li><Link to={`${base}/products`} className="hover:text-white">{t('products')}</Link></li>
              <li><Link to={`${base}/about`} className="hover:text-white">{t('about')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">{t('contact')}</h4>
            <p className="text-sm text-gray-400 whitespace-pre-line">{shop.contact || '—'}</p>
            <p className="text-xs text-gray-500 mt-4">{t('poweredBy')}</p>
          </div>
        </div>

        {/* Payment methods accepted */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-wrap items-center justify-center gap-3">
          <span className="text-sm text-gray-400">{t('weAccept')}:</span>
          <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs">
            <FiCreditCard className="w-3.5 h-3.5" /> ABA Pay
          </span>
          <span className="inline-flex items-center gap-1.5 bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs">
            KHQR
          </span>
          <span className="inline-flex items-center gap-1.5 bg-gray-800 text-gray-300 font-bold px-3 py-1.5 rounded-lg text-xs border border-gray-700">
            💳 Visa / Mastercard
          </span>
        </div>
      </div>
    </footer>
  );
}
