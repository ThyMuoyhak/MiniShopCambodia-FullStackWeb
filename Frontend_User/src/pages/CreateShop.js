import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCheck, FiLoader, FiShoppingBag, FiSmartphone } from 'react-icons/fi';
import { getPlans, registerShop, confirmPlan, fullUrl } from '../api';
import { useOwner } from '../contexts/OwnerContext';
import { useLanguage } from '../i18n';

const fmtPeriod = (d) => d >= 365 ? '1 year' : d >= 60 ? `${Math.round(d / 30)} months` : '1 month';

// The "FREE 1 MONTH" shop-opening offer ends on 07/09/2026 — the countdown is
// the same for everyone and targets that fixed deadline.
const OFFER_END = new Date(2026, 8, 7, 23, 59, 59).getTime();
const getOfferEnd = () => OFFER_END;
const pad = (x) => String(x).padStart(2, '0');

export default function CreateShop() {
  const { t } = useLanguage();
  const { setFromRegistration } = useOwner();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState('starter');
  const [step, setStep] = useState('plan'); // plan | form | pay | done
  const [form, setForm] = useState({
    username: '', shop_name: '', email: '', phone: '', password: '',
    referral_code: params.get('ref') || '',
  });
  const [reg, setReg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [seconds, setSeconds] = useState(180);
  const timer = useRef(null);
  const [offerEnd] = useState(getOfferEnd);
  const [left, setLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    getPlans().then(setPlans).catch(() => setPlans([]));
  }, []);
  useEffect(() => () => clearInterval(timer.current), []);

  // Live 7-day offer countdown.
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, offerEnd - Date.now());
      const s = Math.floor(diff / 1000);
      setLeft({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 });
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [offerEnd]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const startPoll = (orderId, shopId, tx) => {
    let attempts = 0;
    setSeconds(180);
    const c = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
      attempts += 1;
      confirmPlan({ order_id: orderId, shop_id: shopId, transaction_id: tx })
        .then((r) => {
          if (r.ok && r.verified) {
            clearInterval(c);
            setChecking(false);
            toast.success('Payment confirmed! Your shop is active.');
            setStep('done');
          } else if (attempts >= 60) {
            clearInterval(c);
            setChecking(false);
          }
        })
        .catch(() => {});
    }, 3000);
    timer.current = c;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { toast.error('Username and password are required'); return; }
    setBusy(true);
    try {
      const res = await registerShop({ ...form, plan });
      setReg(res);
      if (res.access_token) {
        // Auto-login: the new shop owner is signed in on the storefront, so the
        // "ផ្ទាំងគ្រប់គ្រង" (Dashboard) button shows on their own shop page.
        setFromRegistration(res);
      }
      if (res.free) {
        // 7-day FREE trial — no payment needed, shop is open right away.
        toast.success('Your shop is open! 🎉 7-day free trial started.');
        setStep('done');
      } else if (res.payment && res.payment.qr_code_url) {
        setStep('pay');
        setChecking(true);
        startPoll(res.order_id, res.shop_id, res.payment.transaction_id || '');
      } else {
        setStep('done'); // platform ABA not configured → shop pending admin activation
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  const alreadyPaid = async () => {
    if (!reg) return;
    setChecking(true);
    try {
      const r = await confirmPlan({ order_id: reg.order_id, shop_id: reg.shop_id, transaction_id: reg.payment?.transaction_id || '' });
      if (r.ok && r.verified) { toast.success('Payment confirmed!'); setStep('done'); }
      else toast.error('Not confirmed yet (status: ' + (r.status || 'pending') + ')');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const activePlan = plans.find((p) => p.id === plan) || {};
  const stepIdx = step === 'plan' ? 0 : step === 'done' ? 2 : 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navy hero + step indicator */}
      <div className="bg-[#011F46] text-white">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FB6E08] text-white flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30">
            <FiShoppingBag className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create your own shop</h1>
          <p className="text-blue-200 mt-2 text-sm">Own your online store in minutes — Starter plan is FREE for 7 days, no payment needed.</p>
          <div className="mt-6 flex items-center justify-center gap-2">
            {['Plan', 'Details', 'Done'].map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <span className="w-8 h-0.5 bg-white/25 rounded" />}
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${stepIdx === i ? 'bg-[#FB6E08] text-white' : 'bg-white/15 text-blue-100'}`}>{s}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {step === 'plan' && (
          <div>
            {/* 7-day FREE trial offer banner with live countdown */}
            <div className="mb-6 rounded-xl px-4 py-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 shadow">
              <span>🔥 {t('free7Days')} · {t('free7DaysDesc')}</span>
              <span className="font-mono tracking-wider bg-black/20 rounded-lg px-2 py-0.5">
                {left.d}d {pad(left.h)}:{pad(left.m)}:{pad(left.s)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {plans.map((p) => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                        className={`text-left bg-white rounded-2xl border-2 p-5 transition ${plan === p.id ? 'border-primary shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{p.name}</span>
                    {plan === p.id && <FiCheck className="text-primary" />}
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900 mt-2">${p.price}</p>
                  <p className="text-xs text-gray-500">{p.free ? t('planStarterPeriod') : fmtPeriod(p.days)}</p>
                  {p.free && (
                    <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-block bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {t('free7Days')}
                      </span>
                      <span className="text-sm font-bold text-emerald-600">{t('planStarterFree')} {t('for7Days')}</span>
                      <span className="text-xs text-gray-400 line-through font-semibold">{t('planStarterWas')}</span>
                    </div>
                  )}
                  <ul className="text-xs text-gray-600 mt-3 space-y-1">
                    <li>• {p.max_products} products</li>
                    <li>• {p.max_categories} categories</li>
                  </ul>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep('form')} className="btn-primary px-6 py-3 rounded-xl font-bold">Continue</button>
            </div>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={submit} className="bg-white rounded-2xl shadow p-6 space-y-4">
            <h2 className="font-bold text-lg">Shop details · ព័ត៌មានហាង</h2>
            <input value={form.shop_name} onChange={set('shop_name')} placeholder="Shop name (e.g. My Fashion Store)" className="w-full border rounded-xl px-4 py-3" />
            <input value={form.username} onChange={set('username')} placeholder="Username (your shop link & login)" className="w-full border rounded-xl px-4 py-3" />
            <input value={form.email} onChange={set('email')} placeholder="Email (optional)" className="w-full border rounded-xl px-4 py-3" />
            <input value={form.phone} onChange={set('phone')} placeholder="Phone (optional)" className="w-full border rounded-xl px-4 py-3" />
            <input value={form.password} onChange={set('password')} type="password" placeholder="Password (min 4 characters)" className="w-full border rounded-xl px-4 py-3" />
            <input value={form.referral_code} onChange={set('referral_code')} placeholder="Referral code (optional)" className="w-full border rounded-xl px-4 py-3" />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep('plan')} className="px-5 py-3 rounded-xl border font-semibold text-gray-600">Back</button>
              <button type="submit" disabled={busy} className="flex-1 btn-primary py-3 rounded-xl font-bold disabled:opacity-50">
                {busy ? 'Creating...' : activePlan.free ? `${t('openShopFree')} · ${t('free7Days')}` : `Pay $${activePlan.price} and create shop`}
              </button>
            </div>
          </form>
        )}


        {step === 'pay' && reg && (
          <div className="bg-white rounded-2xl shadow p-6 max-w-sm mx-auto text-center">
            <h2 className="font-bold text-lg mb-1">Pay for your plan</h2>
            <p className="text-sm text-gray-500 mb-4">${reg.plan.price} · {reg.plan.name}</p>
            <div className="qr-area">
              <div className="qr-card-new">
                <div className="qr-top">
                  <span className="w-6 h-6 rounded-full bg-white text-[var(--primary)] flex items-center justify-center font-black text-xs">A</span>
                </div>
                <div className="qr-tab"><div className="qr-tab-tri" /></div>
                <div className="qr-info">
                  <span className="qr-merch">MINI SHOP</span>
                  <div className="qr-amt-row">${reg.plan.price.toFixed(2)} <span className="qr-amt-cur">USD</span></div>
                </div>
                <div className="qr-divider" />
                <div className="qr-box">
                  <div style={{ position: 'relative', width: 195, height: 195 }}>
                    {reg.payment.qr_code_url && !qrFailed ? (
                      <img src={fullUrl(reg.payment.qr_code_url)} alt="KHQR" className="qr-img" onError={() => setQrFailed(true)} />
                    ) : (
                      <div className="qr-img flex items-center justify-center text-gray-300"><FiSmartphone className="w-12 h-12" /></div>
                    )}
                    {!qrFailed && (
                      <div className="qr-logo-center">
                        <span className="w-9 h-9 rounded-full bg-white border border-gray-100 shadow-md flex items-center justify-center text-[var(--primary)] font-black text-lg">A</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <a href={reg.payment.checkout_url} target="_blank" rel="noreferrer"
                 className="block w-full text-center bg-[var(--primary)] hover:brightness-95 text-white font-bold py-3 rounded-xl transition">
                Pay with ABA Pay ↗
              </a>
              <button onClick={alreadyPaid} disabled={checking}
                      className="w-full py-3 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] font-bold hover:bg-[var(--primary)] hover:text-white transition disabled:opacity-50">
                I already paid — confirm
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
              <FiLoader className="w-3 h-3 animate-spin" /> {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} — waiting for payment
            </p>
          </div>
        )}

        {step === 'done' && reg && (
          <div className="bg-white rounded-2xl shadow p-8 max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <FiCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Your shop is ready! 🎉</h2>
            <p className="text-gray-500 mt-2">
              {reg.username} · Plan {reg.plan.name} {reg.free ? `· ${t('free7Days')}` : `($${reg.plan.price})`}
            </p>
            {reg.free && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-sm font-bold text-emerald-700">{t('trialActive')}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {t('trialEndsIn')}:{' '}
                  <span className="font-mono font-bold">{left.d}d {pad(left.h)}:{pad(left.m)}:{pad(left.s)}</span>
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">Login to the dashboard with <b>{reg.username}</b> and your password to add products & categories.</p>
            <div className="space-y-3 mt-6">
              <a href={reg.dashboard_url} target="_blank" rel="noreferrer"
                 className="block w-full text-center bg-[var(--primary)] hover:brightness-95 text-white font-bold py-3.5 rounded-xl transition">
                Open my Dashboard ↗
              </a>
              <Link to={`/${reg.username}`}
                    className="block w-full text-center py-3.5 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] font-bold hover:bg-[var(--primary)] hover:text-white transition">
                View my shop ↗
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

