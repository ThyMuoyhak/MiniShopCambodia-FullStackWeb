import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCreditCard, FiLoader, FiLock, FiSmartphone, FiUser } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useCart } from '../contexts/CartContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useLanguage } from '../i18n';
import { createOrderAsCustomer, createPayment, verifyPayment, fullUrl } from '../api';
import CustomerAuth from '../components/CustomerAuth';
import { Spinner } from '../components/Loading';

const initialForm = {
  customer_name: '', customer_email: '', customer_phone: '',
  customer_telegram: '', customer_address: '', customer_city: '',
  customer_country: '', customer_note: '',
};

// Cambodia timezone display (Asia/Phnom_Penh, UTC+7)
const fmtKH = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return d.toLocaleString(undefined, {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (e) {
    return d.toLocaleString();
  }
};

export default function Checkout() {
  const { shop } = useShop();
  const { items, totals, clear } = useCart();
  const { customer, token, isLoggedIn, logout } = useCustomer();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState(null);
  const [order, setOrder] = useState(null);
  const [checking, setChecking] = useState(false);
  const [remaining, setRemaining] = useState(180); // 3:00 countdown for payment check
  const [qrFailed, setQrFailed] = useState(false); // QR image failed to load → show fallback

  useEffect(() => {
    setQrFailed(false);
  }, [payment?.id]);

  useEffect(() => {
    if (items.length === 0 && !payment) {
      navigate(`/${shop?.username || ''}/products`, { replace: true });
    }
  }, [items, shop, payment, navigate]);

  // Prefill the form from the logged-in customer's account profile.
  useEffect(() => {
    if (!customer) return;
    setForm((f) => ({
      ...f,
      customer_name: f.customer_name || customer.name || '',
      customer_email: f.customer_email || customer.email || '',
      customer_phone: f.customer_phone || customer.phone || '',
      customer_telegram: f.customer_telegram || customer.telegram || '',
    }));
  }, [customer]);

  // ⏳ Auto-check the payment status every 3 seconds once the order + payment exist.
  // When the payment is verified (sandbox auto-succeeds / real ABA confirms), the
  // customer is redirected to the order-success page automatically.
  useEffect(() => {
    if (!payment || !order) return;
    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // ~3 minutes

    const check = async () => {
      if (cancelled) return;
      attempts += 1;
      setChecking(true);
      try {
        const res = await verifyPayment({
          order_id: order.id,
          transaction_id: payment.transaction_id || '',
        });
        if (cancelled) return;
        if (res.verified) {
          setChecking(false);
          toast.success('Payment confirmed! Redirecting...', { id: 'auto-verify' });
          navigate(`/${shop.username}/order-success?order=${order.order_number}`);
          return;
        }
      } catch (e) {
        // transient network/API error — keep polling
      }
      if (attempts >= MAX_ATTEMPTS) {
        setChecking(false);
      }
    };

    // First check shortly after the QR appears, then poll every 3s
    const first = setTimeout(() => { check(); }, 2500);
    const interval = setInterval(check, 3000);
    return () => { cancelled = true; clearTimeout(first); clearInterval(interval); };
  }, [payment, order, shop, navigate]);

  // ⏳ Live countdown (minutes:seconds) while the payment is being confirmed.
  useEffect(() => {
    if (!payment || !order) return;
    setRemaining(180);
    const id = setInterval(() => {
      setRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [payment, order]);

  if (!shop) return null;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      toast.error(t('signInRequired'));
      return;
    }
    if (!form.customer_name || !form.customer_phone || !form.customer_address || !form.customer_city || !form.customer_country) {
      toast.error(t('fillRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const newOrder = await createOrderAsCustomer({
        shop_id: shop.id,
        ...form,
        items: items.map((i) => ({
          product_id: i.product_id, name: i.name, price: i.price,
          quantity: i.quantity, variations: i.variations,
        })),
      }, token);
      setOrder(newOrder);
      const paymentData = await createPayment({
        order_id: newOrder.id,
        success_url: `${window.location.origin}/${shop.username}/order-success?order=${newOrder.order_number}`,
        error_url: `${window.location.origin}/${shop.username}/checkout`,
      });
      setPayment(paymentData);
      clear();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAlreadyPaid = async () => {
    if (!order) return;
    toast.loading('Checking payment status...', { id: 'verify' });
    try {
      const res = await verifyPayment({ order_id: order.id, transaction_id: payment?.transaction_id || '' });
      if (res.verified) {
        toast.success('Payment confirmed!', { id: 'verify' });
        navigate(`/${shop.username}/order-success?order=${order.order_number}`);
      } else if (res.status === 'pending') {
        toast.error('Payment is still pending. Please complete the payment in ABA Mobile.', { id: 'verify' });
      } else if (res.status === 'not_configured') {
        toast.error('ABA Pay is not configured for this shop.', { id: 'verify' });
      } else {
        toast.error('Payment could not be verified yet. Please try again in a moment.', { id: 'verify' });
      }
    } catch (err) {
      toast.error('Verification failed. Please try again.', { id: 'verify' });
    }
  };

  const shipping = 0;
  const grandTotal = Math.round((totals.subtotal + shipping) * 100) / 100;

  if (payment) {
    const payAmount = Number(payment.amount || order?.total || 0).toFixed(2);
    const payTime = fmtKH(order?.created_at);
    return (
      <div className="min-h-[72vh] bg-white dark:bg-gray-800 py-8 px-4">
        <div className="max-w-sm mx-auto flex flex-col items-center">
          {/* Header: ABA PayWay + timer */}
          <div className="hdr">
            <div className="hdr-inner">
              <div className="hdr-row">
                <h3>ABA PayWay</h3>
                <div className="timer-box">
                  <FiLoader className="timer-spin" />
                  <span className="timer-txt">
                    {remaining > 0
                      ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
                      : '00:00'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QR card */}
          <div className="qr-area">
            <div className="qr-card-new">
              <div className="qr-top">
                <span className="w-6 h-6 rounded-full bg-white dark:bg-gray-800 text-[var(--primary)] flex items-center justify-center font-black text-xs">A</span>
              </div>
              <div className="qr-tab"><div className="qr-tab-tri" /></div>
              <div className="qr-info">
                <span className="qr-merch">{(shop.shop_name || shop.username).toUpperCase()}</span>
                <div className="qr-amt-row">
                  {payAmount} <span className="qr-amt-cur">{shop.currency}</span>
                </div>
              </div>
              <div className="qr-divider" />
              <div className="qr-box">
                <div style={{ position: 'relative', width: 195, height: 195 }}>
                  {payment.qr_code_url && !qrFailed ? (
                    <img src={fullUrl(payment.qr_code_url)} alt="KHQR"
                         className="qr-img"
                         onError={() => setQrFailed(true)} />
                  ) : (
                    <div className="qr-img flex items-center justify-center text-gray-300"><FiSmartphone className="w-12 h-12" /></div>
                  )}
                  {!qrFailed && (
                    <div className="qr-logo-center">
                      <span className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-100 shadow-md flex items-center justify-center text-[var(--primary)] font-black text-lg">A</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scan info */}
          <div className="scan-info">
            <p>{t('scanWithABA')}</p>
          </div>

          {/* Payment status */}
          {checking ? (
            <div className="flex items-center justify-center gap-3 bg-blue-50 border border-blue-100 rounded-xl py-3 text-sm text-[var(--primary)] font-semibold w-full mt-6">
              <Spinner /> {t('waitingPayment')}
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1 mt-6">
              <FiLock className="w-3.5 h-3.5" /> {t('autoCheck')}
            </p>
          )}

          {/* Buttons */}
          <div className="space-y-3 mt-6 w-full">
            <a
              href={payment.checkout_url}
              target="_blank" rel="noreferrer"
              className="block w-full text-center bg-[var(--primary)] hover:brightness-95 text-white font-bold py-3.5 rounded-xl transition shadow-sm"
            >
              {t('payWithABA')} ↗
            </a>
            <button
              onClick={handleAlreadyPaid}
              disabled={checking}
              className="w-full py-3.5 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] font-bold hover:bg-[var(--primary)] hover:text-white transition disabled:opacity-50"
            >
              {t('alreadyPaid')}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">{t('paywayPoweredBy')}</p>
        </div>
      </div>
    );
  }

  // If the shop has not configured ABA Pay, do not show any QR / checkout form.
  if (shop.payment_configured === false) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <FiCreditCard className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">{t('paymentUnavailable')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-3 text-sm">
            {t('paymentUnavailableDesc')}
          </p>
          {shop.contact && <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 whitespace-pre-line">{shop.contact}</p>}
          <a href={`/${shop.username}/products`} className="btn-primary inline-block mt-6 px-6 py-2.5 rounded-xl font-semibold">
            {t('backToProducts')}
          </a>
        </div>
      </div>
    );
  }

  // 🔒 Customer account is REQUIRED before buying — block checkout if not signed in.
  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-8 max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-sky-100 flex items-center justify-center mb-4">
              <FiUser className="w-8 h-8 text-sky-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">{t('signInRequired')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{t('signInRequiredDesc')}</p>
          </div>
          <CustomerAuth />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('checkout')}</h1>
      {/* Logged-in customer banner */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <FiUser className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">{customer?.name}</p>
            <p className="text-xs text-emerald-600">{customer?.phone || customer?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs font-semibold text-emerald-700 hover:underline">{t('logOut')}</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <form onSubmit={handleSubmit} className="md:col-span-3 bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4">
          <h2 className="font-bold text-lg">{t('customerInfo')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('name')} *</label>
              <input value={form.customer_name} onChange={set('customer_name')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Your full name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('emailOpt')}</label>
              <input value={form.customer_email} onChange={set('customer_email')} type="email" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="you@email.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('phone')} *</label>
              <input value={form.customer_phone} onChange={set('customer_phone')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="+855 12 345 678" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('telegramOpt')}</label>
              <input value={form.customer_telegram} onChange={set('customer_telegram')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="@username" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('address')} *</label>
            <input value={form.customer_address} onChange={set('customer_address')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Street, village, district" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('city')} *</label>
              <input value={form.customer_city} onChange={set('customer_city')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phnom Penh" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('country')} *</label>
              <input value={form.customer_country} onChange={set('customer_country')} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Cambodia" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('noteOpt')}</label>
            <textarea value={form.customer_note} onChange={set('customer_note')} rows="3" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="Any special instructions..." />
          </div>
          <button type="submit" disabled={submitting} className="w-full btn-primary py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
            {submitting ? <Spinner /> : <FiLock />} {submitting ? t('placingOrder') : `${t('pay')} ${grandTotal.toFixed(2)} ${shop.currency}`}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center"><FiLock className="inline mr-1" />{t('securedBy')}</p>
        </form>

        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
            <h2 className="font-bold text-lg mb-4">{t('orderSummary')}</h2>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {item.image && <img src={fullUrl(item.image)} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Object.entries(item.variations).map(([k, v]) => `${k}: ${v}`).join(' · ')}{' '}× {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold">{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>{t('subtotal')}</span><span>{totals.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>{t('shipping')}</span><span>{t('free')}</span></div>
              <div className="flex justify-between font-bold text-base mt-2">
                <span>{t('total')}</span><span>{grandTotal.toFixed(2)} {shop.currency}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
