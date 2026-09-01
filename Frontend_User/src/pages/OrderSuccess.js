import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiDownload, FiHelpCircle } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useLanguage } from '../i18n';
import { trackOrder, fullUrl } from '../api';
import Loading from '../components/Loading';

export default function OrderSuccess() {
  const { shop } = useShop();
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const orderNumber = params.get('order');

  useEffect(() => {
    if (!orderNumber) {
      setLoading(false);
      return;
    }
    trackOrder(orderNumber)
      .then(setOrder)
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) return <Loading />;

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <FiHelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold">{t('orderNotFound')}</h1>
        <p className="text-gray-500 mt-2">{t('orderNotFoundDesc')}</p>
        <Link to={`/${shop.username}/products`} className="btn-primary inline-block mt-6 px-6 py-2 rounded-lg">{t('continueShopping')}</Link>
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid';

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        {isPaid ? (
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center text-4xl text-green-600">
            <FiCheckCircle className="w-10 h-10" />
          </div>
        ) : (
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-4xl text-amber-500">
            <FiClock className="w-10 h-10" />
          </div>
        )}
        <h1 className="text-2xl font-bold mt-4">
          {isPaid ? t('paymentSuccess') : t('orderPlacedMsg')}
        </h1>
        <p className="text-gray-500 mt-2">
          {isPaid ? t('paymentSuccessMsg') : t('orderPlacedMsg')}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-6 border-b grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500 block text-xs">{t('orderNumber')}</span><span className="font-bold">{order.order_number}</span></div>
          <div><span className="text-gray-500 block text-xs">{t('date')}</span><span>{new Date(order.created_at).toLocaleString()}</span></div>
          <div><span className="text-gray-500 block text-xs">{t('paymentStatus')}</span>
            <span className={`font-semibold ${isPaid ? 'text-green-600' : 'text-amber-600'}`}>{order.payment_status.toUpperCase()}</span>
          </div>
          <div><span className="text-gray-500 block text-xs">{t('orderStatus')}</span><span className="font-semibold capitalize">{order.order_status}</span></div>
        </div>

        <div className="p-6 border-b">
          <h3 className="font-bold mb-3 text-sm uppercase text-gray-500">{t('itemsLabel')}</h3>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  {item.variations && Object.keys(item.variations).length > 0 && (
                    <p className="text-xs text-gray-500">{Object.entries(item.variations).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>
                  )}
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">{item.quantity} × {item.price.toFixed(2)}</span>{' '}
                  <span className="font-bold">= {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500"><span>{t('subtotal')}</span><span>{order.items_total.toFixed(2)}</span></div>
            {order.shipping_fee > 0 && <div className="flex justify-between text-gray-500"><span>{t('shipping')}</span><span>{order.shipping_fee.toFixed(2)}</span></div>}
            {order.discount > 0 && <div className="flex justify-between text-gray-500"><span>{t('total')} discount</span><span>-{order.discount.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-lg pt-2">
              <span>{t('total')}</span><span>{order.total.toFixed(2)} {order.currency}</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-bold mb-3 text-sm uppercase text-gray-500">{t('customerLabel')}</h3>
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-sm text-gray-500">{order.customer_phone}</p>
          <p className="text-sm text-gray-500">{order.customer_address}, {order.customer_city}, {order.customer_country}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {order.receipt_url && (
          <a href={fullUrl(order.receipt_url)} target="_blank" rel="noreferrer"
             className="btn-primary flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
            <FiDownload /> {t('downloadInvoice')}
          </a>
        )}
        <Link to={`/${shop.username}/products`} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-center font-semibold hover:bg-gray-50">
          {t('continueShopping')}
        </Link>
      </div>
    </div>
  );
}
