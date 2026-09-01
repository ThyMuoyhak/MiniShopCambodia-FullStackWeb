import React from 'react';
import { FiMinus, FiPlus, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import { fullUrl } from '../api';

export default function CartSidebar() {
  const { items, open, setOpen, removeItem, updateQty, totals } = useCart();
  const { shop } = useShop();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FiShoppingCart /> {t('yourCart')} ({totals.count})
          </h2>
          <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-gray-100"><FiX /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FiShoppingCart className="w-14 h-14 mx-auto mb-3 text-gray-200" />
              <p>{t('cartEmpty')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-3 bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                  {item.image && (
                    <img src={fullUrl(item.image)} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    {Object.keys(item.variations).length > 0 && (
                      <p className="text-xs text-gray-500">
                        {Object.entries(item.variations).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg border px-1 py-0.5">
                        <button onClick={() => updateQty(idx, item.quantity - 1)} className="p-1 hover:bg-gray-100 rounded">
                          <FiMinus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQty(idx, item.quantity + 1)} className="p-1 hover:bg-gray-100 rounded">
                          <FiPlus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-bold text-sm">{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 self-start p-1">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{t('subtotal')}</span>
              <span className="text-xl font-bold">{totals.subtotal.toFixed(2)} {shop.currency}</span>
            </div>
            <button
              onClick={() => { setOpen(false); navigate(`/${shop.username}/checkout`); }}
              className="w-full btn-primary py-3 rounded-xl font-semibold"
            >
              {t('proceedCheckout')}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full py-2 rounded-xl text-gray-500 hover:bg-gray-100"
            >
              {t('continueShopping')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
