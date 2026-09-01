import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiLoader, FiSearch, FiShoppingBag, FiX } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import { fullUrl, getProducts } from '../api';

// Full-width search bar shown under the shop navbar. Typing filters products
// live in a smooth dropdown (image + name + price).
export default function ShopSearchBar() {
  const { shop } = useShop();
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const base = `/${shop.username}`;

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); setSearching(false); setOpen(false); return; }
    setOpen(true);
    setSearching(true);
    const t2 = setTimeout(() => {
      getProducts(shop.id, { search: term })
        .then((list) => setResults(list.slice(0, 8)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t2);
  }, [q, shop.id]);

  return (
    <div className="w-full bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
      <div ref={boxRef} className="relative max-w-7xl mx-auto px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) window.location.href = `${base}/products?search=${encodeURIComponent(q.trim())}`;
          }}
          className="relative"
        >
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => { if (q.trim()) setOpen(true); }}
            placeholder={t('searchPlaceholder')}
            className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-2xl pl-11 pr-10 py-3 text-sm dark:text-gray-200 dark:placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm bg-white"
          />
          {searching ? (
            <FiLoader className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-gray-400 w-4 h-4" />
          ) : q ? (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX className="w-4 h-4" />
            </button>
          ) : null}
        </form>

        {open && q.trim() && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-[searchFade_.18s_ease-out]">
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`${base}/product/${p.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <div className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden shrink-0">
                        {p.images && p.images.length > 0 ? (
                          <img
                            src={fullUrl(p.images[0])}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                            <FiShoppingBag className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${(p.sale_price ?? p.price).toFixed(2)} <span className="uppercase">{shop.currency}</span>
                        </p>
                      </div>
                      <FiArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : !searching ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">{t('noProducts')}</p>
            ) : null}

            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <Link
                to={`${base}/products?search=${encodeURIComponent(q.trim())}`}
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-primary hover:underline py-1"
              >
                {t('viewAll')} "{q.trim()}"
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
