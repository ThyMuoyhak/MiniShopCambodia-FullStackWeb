import React from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart, FiShoppingBag } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../i18n';
import { fullUrl } from '../api';

export default function ProductCard({ product }) {
  const { shop } = useShop();
  const { addItem } = useCart();
  const { t } = useLanguage();
  const price = product.sale_price ?? product.price;
  const hasSale = product.sale_price != null && product.sale_price < product.price;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition group border-2 border-transparent hover:border-[color:var(--primary)]">
      <Link to={`/${shop.username}/product/${product.id}`} className="block relative">
        <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <img
              src={fullUrl(product.images[0])}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <FiShoppingBag className="w-12 h-12" />
            </div>
          )}
        </div>
        {hasSale && (
          <span className="absolute top-2 left-2 bg-secondary text-white text-xs font-bold px-2 py-1 rounded-lg">
            {t('sale')}
          </span>
        )}
      </Link>
      <div className="p-4">
        <Link to={`/${shop.username}/product/${product.id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-primary transition">{product.name}</h3>
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{price.toFixed(2)}</span>{' '}
            <span className="text-xs text-gray-500">{shop.currency}</span>
            {hasSale && <span className="text-sm text-gray-400 line-through ml-2">{product.price.toFixed(2)}</span>}
          </div>
          <button
            onClick={() => addItem(product, 1, {})}
            className="btn-primary p-2 rounded-lg text-sm"
            aria-label={t('addToCart')}
          >
            <FiShoppingCart />
          </button>
        </div>
      </div>
    </div>
  );
}
