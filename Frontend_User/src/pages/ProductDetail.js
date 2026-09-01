import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiShoppingBag, FiShoppingCart } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../i18n';
import { getProduct, getProducts, fullUrl } from '../api';
import ProductCard from '../components/ProductCard';
import Loading from '../components/Loading';

export default function ProductDetail() {
  const { id } = useParams();
  const { shop } = useShop();
  const { addItem } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState({});
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    Promise.all([getProduct(id), getProducts(shop.id)])
      .then(([prod, prods]) => {
        setProduct(prod);
        setRelated(prods.filter((p) => p.id !== prod.id && p.category_id === prod.category_id).slice(0, 4));
        // Seed empty selections for every selectable attribute
        // (variation attrs + custom select/color attributes with options).
        const initial = {};
        if (prod.variations && prod.variations.length > 0) {
          Object.keys(prod.variations[0].attrs || {}).forEach((a) => { initial[a] = ''; });
        }
        (prod.custom_attributes || [])
          .filter((a) => (a.type === 'select' || a.type === 'color') && (a.options || '').trim())
          .forEach((a) => { if (initial[a.name] === undefined) initial[a.name] = ''; });
        setSelectedVariations(initial);
      })
      .catch((e) => toast.error(e?.response?.data?.detail || 'Product not found'))
      .finally(() => setLoading(false));
  }, [id, shop]);

  const currentVariation = useMemo(() => {
    if (!product || !product.variations || product.variations.length === 0) return null;
    // Only match attributes that are actually part of the variations, so extra
    // selections like Color (not in stock matrix) never break price/stock lookup.
    const vkeys = Object.keys(product.variations[0].attrs || {});
    if (vkeys.length === 0) return null;
    return product.variations.find((v) =>
      vkeys.every((k) => selectedVariations[k] && v.attrs?.[k] === selectedVariations[k])
    ) || null;
  }, [product, selectedVariations]);

  const effectivePrice = currentVariation?.price ?? product?.sale_price ?? product?.price ?? 0;
  const effectiveStock = currentVariation?.quantity ?? product?.quantity ?? 0;

  if (loading) return <Loading />;
  if (!product) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Product not found.</div>;
  }

  const displayAttrs = (product.custom_attributes || []).filter((a) => !['select', 'color'].includes(a.type));
  const varAttrs = product.variations && product.variations.length > 0
    ? Object.keys(product.variations[0].attrs || {})
    : [];
  const varOptions = (attrName) => [...new Set((product.variations || []).map((v) => v.attrs?.[attrName]).filter(Boolean))];

  // Unified list of attributes the customer can pick: custom select/color
  // attributes with options, plus any variation attributes not covered.
  const selectableAttrs = (() => {
    const list = [];
    const seen = new Set();
    for (const a of product.custom_attributes || []) {
      if ((a.type === 'select' || a.type === 'color') && (a.options || '').trim()) {
        const opts = a.options.split(',').map((o) => o.trim()).filter(Boolean);
        if (opts.length > 0) {
          list.push({ key: a.name || a.label, label: a.label || a.name, type: a.type, required: !!a.required, options: opts });
          seen.add(a.name);
        }
      }
    }
    for (const attr of varAttrs) {
      if (!seen.has(attr)) {
        const opts = varOptions(attr);
        if (opts.length > 0) list.push({ key: attr, label: attr, type: 'select', required: true, options: opts });
      }
    }
    return list;
  })();

  const addToCart = () => {
    const missing = selectableAttrs.find((a) => !selectedVariations[a.key]);
    if (missing) {
      toast.error(`Please select ${missing.label}`);
      return;
    }
    if (effectiveStock <= 0) {
      toast.error('This item is out of stock');
      return;
    }
    addItem(product, qty, selectedVariations);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 text-sm">
        <FiChevronLeft /> {t('back')}
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img src={fullUrl(product.images[activeImage])} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                <FiShoppingBag className="w-16 h-16" />
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${activeImage === i ? 'border-primary' : 'border-transparent'}`}
                >
                  <img src={fullUrl(img)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category_name && <span className="text-xs text-primary font-semibold uppercase">{product.category_name}</span>}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">{product.name}</h1>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-3xl font-bold dark:text-gray-100">{effectivePrice.toFixed(2)}</span>
            <span className="text-gray-500 dark:text-gray-400">{shop.currency}</span>
            {product.sale_price != null && product.sale_price < product.price && (
              <span className="text-lg text-gray-400 dark:text-gray-500 line-through">{product.price.toFixed(2)}</span>
            )}
          </div>

          {effectiveStock > 0 ? (
            <p className="text-sm text-green-600 mt-1">✓ {t('inStock')} ({effectiveStock})</p>
          ) : (
            <p className="text-sm text-red-500 mt-1">✗ {t('outOfStock')}</p>
          )}

          {/* Selectable options — size, color, ... (clickable) */}
          {selectableAttrs.length > 0 && (
            <div className="mt-6 space-y-4">
              {selectableAttrs.map((attr) => (
                <div key={attr.key}>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                    {attr.label}{attr.required ? ' *' : ''}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {attr.options.map((opt) =>
                      attr.type === 'color' ? (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedVariations((prev) => ({ ...prev, [attr.key]: opt }))}
                          className="flex flex-col items-center gap-1 group"
                          title={opt}
                        >
                          <span
                            className={`w-10 h-10 rounded-full border-2 shadow-inner transition ${
                              selectedVariations[attr.key] === opt
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-gray-200 group-hover:border-gray-400 dark:border-gray-600'
                            }`}
                            style={{ backgroundColor: opt.toLowerCase() }}
                          />
                          <span className={`text-xs ${selectedVariations[attr.key] === opt ? 'text-primary font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                            {opt}
                          </span>
                        </button>
                      ) : (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSelectedVariations((prev) => ({ ...prev, [attr.key]: opt }))}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                            selectedVariations[attr.key] === opt
                              ? 'border-primary bg-primary text-white'
                              : 'border-gray-200 text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity + add to cart */}
          <div className="flex items-center gap-4 mt-8">
            <div className="flex items-center border rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">−</button>
              <span className="px-4 font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">+</button>
            </div>
            <button
              onClick={addToCart}
              disabled={effectiveStock <= 0}
              className="flex-1 btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FiShoppingCart /> {t('addToCart')}
            </button>
          </div>

          {/* Custom attributes */}
          {displayAttrs.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="font-bold mb-3">{t('productDetails')}</h3>
              <dl className="space-y-2">
                {displayAttrs.map((a) => (
                  <div key={a.name} className="flex justify-between text-sm">
                    <dt className="text-gray-500 dark:text-gray-400">{a.label || a.name}:</dt>
                    <dd className="font-medium">{a.value || (a.options ? a.options.split(',').join(', ') : '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-bold mb-2">{t('description')}</h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line text-sm leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold mb-6 dark:text-gray-100">{t('relatedProducts')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

