import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiShoppingBag } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import { getProducts, getCategories } from '../api';
import CategoryNav from '../components/CategoryNav';
import ProductCard from '../components/ProductCard';

const PAGE_SIZE = 20;

// Blurred placeholder card shown while products are loading.
function ProductSkeleton() {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-square bg-gray-200 dark:bg-gray-700 blur-[2px] flex items-center justify-center">
        <FiShoppingBag className="w-12 h-12 text-gray-300" />
      </div>
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 blur-[1px] rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 blur-[1px] rounded w-1/2" />
      </div>
    </div>
  );
}

export default function Products() {
  const { shop } = useShop();
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [search, setSearch] = useState(params.get('search') || '');
  const [sort, setSort] = useState('newest');

  const categoryId = params.get('category') || '';
  const searchTerm = params.get('search') || '';

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    setVisibleCount(PAGE_SIZE);
    Promise.all([
      getProducts(shop.id, { category_id: categoryId || undefined, search: searchTerm, sort }),
      getCategories(shop.id),
    ])
      .then(([prods, cats]) => {
        setProducts(prods);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, [shop, categoryId, searchTerm, sort]);

  // Infinite scroll: when the user reaches near the bottom, show 20 more.
  useEffect(() => {
    if (loading || visibleCount >= products.length) return;
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
        setLoadingMore(true);
        setVisibleCount((v) => Math.min(products.length, v + PAGE_SIZE));
        setTimeout(() => setLoadingMore(false), 350);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [loading, visibleCount, products.length]);

  const applySearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (search.trim()) next.set('search', search.trim());
    else next.delete('search');
    setParams(next, { replace: true });
  };

  const shown = products.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold dark:text-gray-100">{t('products')}</h1>
        <div className="flex items-center gap-2">
          <form onSubmit={applySearch} className="flex-1 md:flex-none">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="border rounded-lg pl-9 pr-3 py-2 text-sm w-full md:w-56"
              />
            </div>
          </form>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-gray-200"
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
          </select>
        </div>
      </div>

      <CategoryNav categories={categories} />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FiSearch className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p>{t('noProducts')}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {shown.length} / {products.length} {t('products')}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shown.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {loadingMore && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: Math.min(PAGE_SIZE, products.length - shown.length) }).map((_, i) => <ProductSkeleton key={`more-${i}`} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
