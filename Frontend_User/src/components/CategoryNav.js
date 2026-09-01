import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';

/**
 * Category chips in a SINGLE horizontal row that the user scrolls left/right.
 * The strip is sticky below the navbar so categories stay visible while the
 * user scrolls down the page.
 */
export default function CategoryNav({ categories }) {
  const { shop } = useShop();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const active = params.get('category');

  const select = (id) => {
    const base = `/${shop.username}/products`;
    if (id) navigate(`${base}?category=${id}`);
    else navigate(base);
  };

  if (!categories || categories.length === 0) return null;

  const chip = (isActive) =>
    `shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${isActive ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`;

  return (
    <div className="sticky top-16 z-30 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button onClick={() => select(null)} className={chip(!active)}>
            {t('all')}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => select(c.id)}
              className={chip(String(active) === String(c.id))}
            >
              {c.name}
              {c.product_count > 0 && <span className="ml-1 text-xs opacity-70">({c.product_count})</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
