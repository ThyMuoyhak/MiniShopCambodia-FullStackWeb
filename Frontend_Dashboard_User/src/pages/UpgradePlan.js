import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiTrendingUp, FiLoader, FiSmartphone } from 'react-icons/fi';
import { confirmPlan, fullUrl, getPlans, getShopDetail, upgradePlan } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/ui';

const fmtPeriod = (d) => (d >= 365 ? '1 year' : d >= 60 ? `${Math.round(d / 30)} months` : '1 month');

export default function UpgradePlan() {
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [pay, setPay] = useState(null);
  const [checking, setChecking] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    Promise.all([getShopDetail(user.shop_id), getPlans()])
      .then(([s, p]) => { setShop(s); setPlans(p); })
      .finally(() => setLoading(false));
    return () => clearInterval(timer.current);
  }, [user.shop_id]);

  const loadShop = () => getShopDetail(user.shop_id).then(setShop).catch(() => {});

  const doUpgrade = async (planId) => {
    setBusy(planId);
    try {
      const res = await upgradePlan({ shop_id: user.shop_id, plan: planId });
      if (res.applied) {
        toast.success(`Plan ${res.plan.name} applied (FREE)! Your shop is extended by 1 month.`);
        loadShop();
        return;
      }
      setQrFailed(false);
      setPay(res);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Upgrade failed');
    } finally {
      setBusy(null);
    }
  };

  const startPoll = (orderId) => {
    let attempts = 0;
    setChecking(true);
    const c = setInterval(() => {
      attempts += 1;
      confirmPlan({ order_id: orderId, shop_id: user.shop_id, transaction_id: pay?.payment?.transaction_id || '' })
        .then((r) => {
          if (r.ok && r.verified) {
            clearInterval(c);
            setChecking(false);
            setPay(null);
            toast.success('Payment confirmed! Your plan is upgraded.');
            loadShop();
          } else if (attempts >= 60) {
            clearInterval(c);
            setChecking(false);
          }
        })
        .catch(() => {});
    }, 3000);
    timer.current = c;
  };

  const alreadyPaid = async () => {
    if (!pay) return;
    setChecking(true);
    try {
      const r = await confirmPlan({ order_id: pay.order_id, shop_id: user.shop_id, transaction_id: pay.payment?.transaction_id || '' });
      if (r.ok && r.verified) {
        setPay(null);
        toast.success('Payment confirmed! Your plan is upgraded.');
        loadShop();
      } else {
        toast.error('Not confirmed yet (status: ' + (r.status || 'pending') + ')');
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Upgrade Plan</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-wrap items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#011F46] text-white flex items-center justify-center">
          <FiTrendingUp className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Current Plan</p>
          <p className="text-xl font-bold text-gray-900">
            {shop.plan ? (shop.plan.charAt(0).toUpperCase() + shop.plan.slice(1)) : '—'}
            {shop.plan_price > 0 && <span className="text-sm text-gray-500 font-normal"> · ${shop.plan_price}</span>}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {shop.expires_at
              ? `Expires: ${new Date(shop.expires_at).toLocaleDateString()}`
              : 'No expiry set'}
            {' · '}{shop.max_products || 0} products · {shop.max_categories || 0} categories
          </p>
        </div>
      </div>

      {/* Plan options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const active = shop.plan === p.id;
          return (
            <div key={p.id} className={`bg-white rounded-xl shadow-sm p-6 flex flex-col border-2 ${active ? 'border-[#FB6E08]' : 'border-transparent'}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">{p.name}</span>
                {active && <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">CURRENT</span>}
              </div>
              <p className="text-2xl font-extrabold text-gray-900 mt-2">
                ${p.price} <span className="text-sm text-gray-400 font-normal">/{fmtPeriod(p.days)}</span>
              </p>
              {p.free && (
                <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="inline-block bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">FREE 1 MONTH</span>
                  <span className="text-sm font-bold text-emerald-600">$0 for 1 month</span>
                </div>
              )}
              <ul className="text-xs text-gray-600 mt-3 space-y-1 flex-1">
                <li>• {p.max_products} products</li>
                <li>• {p.max_categories} categories</li>
                <li>• {fmtPeriod(p.days)} plan duration</li>
              </ul>
              <button
                onClick={() => doUpgrade(p.id)}
                disabled={busy || active}
                className={`mt-4 py-2.5 rounded-xl font-bold transition disabled:opacity-50 ${active ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-[#011F46] hover:bg-[#0a2f5c] text-white'}`}
              >
                {busy === p.id ? 'Processing...' : active ? 'Current plan' : p.free ? 'Apply FREE 1 month' : 'Pay & Upgrade'}
              </button>
            </div>
          );
        })}
      </div>


      {/* ABA payment modal */}
      {pay && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
            <h2 className="font-bold text-lg">Pay for {pay.plan.name}</h2>
            <p className="text-sm text-gray-500 mb-4">${pay.amount} · {fmtPeriod(pay.plan.days)}</p>
            <div className="bg-gray-50 rounded-xl p-4">
              {pay.payment?.qr_code_url && !qrFailed ? (
                <img
                  src={fullUrl(pay.payment.qr_code_url)}
                  alt="KHQR"
                  className="w-48 h-48 mx-auto rounded-xl"
                  onError={() => setQrFailed(true)}
                />
              ) : (
                <div className="w-48 h-48 mx-auto rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
                  <FiSmartphone className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {pay.payment?.checkout_url && (
                <a
                  href={pay.payment.checkout_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center bg-[#011F46] hover:brightness-110 text-white font-bold py-3 rounded-xl transition"
                >
                  Pay with ABA Pay ↗
                </a>
              )}
              <button
                onClick={alreadyPaid}
                disabled={checking}
                className="w-full py-3 rounded-xl border-2 border-[#011F46] text-[#011F46] font-bold hover:bg-[#011F46] hover:text-white transition disabled:opacity-50"
              >
                {checking ? 'Checking...' : 'I already paid — confirm'}
              </button>
              <button
                onClick={() => { clearInterval(timer.current); setPay(null); setChecking(false); }}
                className="w-full py-2 text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
            {checking && (
              <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                <FiLoader className="w-3 h-3 animate-spin" /> waiting for payment…
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

