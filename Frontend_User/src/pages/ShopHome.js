import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCreditCard, FiHeadphones, FiShoppingBag, FiTruck } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import { getProducts, getCategories, fullUrl } from '../api';
import Slideshow from '../components/Slideshow';
import CategoryNav from '../components/CategoryNav';
import ProductCard from '../components/ProductCard';
import ProductRow from '../components/ProductRow';
import SocialLinks from '../components/SocialLinks';
import ShopLogo from '../components/ShopLogo';
import ShopSearchBar from '../components/ShopSearchBar';

export default function ShopHome() {
  const { shop } = useShop();
  const { t } = useLanguage();
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    Promise.all([
      getProducts(shop.id, { featured_only: true }),
      getProducts(shop.id),
      getCategories(shop.id),
    ])
      .then(([feat, prods, cats]) => {
        setFeatured(feat);
        setAllProducts(prods);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, [shop]);

  if (!shop) return null;

  return (
    <div>
      {/* Full-width search bar — shop home page only */}
      <ShopSearchBar />

      {/* Categories — sticky single-row left/right scroll */}
      {categories.length > 0 && <CategoryNav categories={categories} />}

      {/* Hero slideshow — contained to match the page content width */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Slideshow slides={shop.slideshow} />
      </div>

      {/* Shop intro */}
      <section className="max-w-7xl mx-auto px-4 pb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col sm:flex-row items-center gap-4">
          <ShopLogo shop={shop} className="w-20 h-20 rounded-full" textClassName="text-3xl" />
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{shop.shop_name || shop.username}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{shop.bio || shop.description}</p>
            <div className="mt-2 flex justify-center sm:justify-start">
              <SocialLinks />
            </div>
          </div>
          <Link to={`/${shop.username}/products`} className="btn-primary px-6 py-2.5 rounded-xl font-semibold whitespace-nowrap">
            {t('shopNow')}
          </Link>
        </div>
      </section>

      {/* Categories moved to the sticky strip at the top */}

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold dark:text-gray-100">{t('featuredProducts')}</h2>
          <Link to={`/${shop.username}/products`} className="text-primary font-semibold hover:underline text-sm">
            {t('viewAll')} →
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-200 blur-[2px] flex items-center justify-center">
                  <FiShoppingBag className="w-12 h-12 text-gray-300" />
                </div>
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 blur-[1px] rounded w-3/4" />
                  <div className="h-4 bg-gray-200 blur-[1px] rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="text-gray-400 text-center py-10">{t('noFeatured')}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      {/* Products grouped by category — 1 category = 1 row */}
      {loading ? null : (
        <>
          {categories.map((cat) => {
            const items = allProducts.filter((p) => p.category_id === cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id} className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold dark:text-gray-100">{cat.name}</h2>
                  <Link to={`/${shop.username}/products?category=${cat.id}`} className="text-primary font-semibold hover:underline text-sm">
                    {t('viewAll')} →
                  </Link>
                </div>
                <ProductRow products={items} />
              </section>
            );
          })}

          {/* Un-categorized products */}
          {(() => {
            const catIds = new Set(categories.map((c) => c.id));
            const others = allProducts.filter((p) => !catIds.has(p.category_id));
            if (others.length === 0) return null;
            return (
              <section className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold dark:text-gray-100">{t('products')}</h2>
                  <Link to={`/${shop.username}/products`} className="text-primary font-semibold hover:underline text-sm">
                    {t('viewAll')} →
                  </Link>
                </div>
                <ProductRow products={others} />
              </section>
            );
          })()}
        </>
      )}

      {/* About strip */}
      <section className="bg-white dark:bg-gray-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-6 text-center">
          <div className="p-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <FiTruck className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-2 dark:text-gray-100">{t('fastDelivery')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('fastDeliveryDesc')}</p>
          </div>
          <div className="p-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
              <FiCreditCard className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-2 dark:text-gray-100">{t('abaAccepted')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('abaAcceptedDesc')}</p>
          </div>
          <div className="p-6">
            <div className="w-12 h-12 mx-auto rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
              <FiHeadphones className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-2 dark:text-gray-100">{t('support')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('supportDesc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
