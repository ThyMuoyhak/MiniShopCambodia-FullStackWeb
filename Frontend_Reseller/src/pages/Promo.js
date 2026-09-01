import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCopy, FiPercent, FiSave, FiTag } from 'react-icons/fi';
import { resellerMe, resellerPromo } from '../api';
import { Loading, inputCls } from '../components/ui';

const STORE_URL = process.env.REACT_APP_STORE_URL || 'http://localhost:3000';

export default function Promo() {
  const [me, setMe] = useState(null);
  const [discount, setDiscount] = useState('0');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    resellerMe().then((m) => {
      setMe(m);
      setDiscount(String(m.promo_discount || 0));
    }).catch(() => setMe(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!me) return <Loading />;

  const cap = Number(me.discount_max || 1);
  const discountNum = Math.max(0, Math.min(Number(discount) || 0, cap));
  const signupLink = `${STORE_URL}/create-shop?ref=${me.referral_code}`;

  const save = async () => {
    setSaving(true);
    try {
      const r = await resellerPromo({ promo_discount: discountNum });
      setMe((m) => ({ ...m, promo_discount: r.promo_discount }));
      setDiscount(String(r.promo_discount));
      toast.success(`Promo discount saved: $${r.promo_discount.toFixed(2)} off`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const copy = (text, msg = 'Copied') => {
    navigator.clipboard?.writeText(text).then(() => toast.success(msg)).catch(() => {});
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Promo Code & Discount</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><FiTag /></span>
            <h2 className="font-bold text-lg">Your promo code</h2>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border-2 border-dashed border-emerald-300 rounded-xl px-4 py-4">
            <span className="font-mono font-extrabold text-2xl text-emerald-600 tracking-widest">{me.referral_code}</span>
            <button onClick={() => copy(me.referral_code)} className="ml-auto p-2 rounded-lg hover:bg-white text-gray-500" title="Copy code"><FiCopy /></button>
          </div>
          <button
            onClick={() => copy(signupLink, 'Promo link copied')}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold transition"
          >
            Copy signup link with code
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center break-all">{signupLink}</p>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><FiPercent /></span>
              <h3 className="font-bold">Set your discount (saved automatically)</h3>
            </div>
            <div className="flex items-end gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Discount $ (0 – {cap.toFixed(2)})</label>
                <input type="number" min="0" max={cap} step="0.1" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputCls + ' w-32'} />
              </div>
              <button onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-1 disabled:opacity-50">
                <FiSave /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              When a customer uses your code, <b>${discountNum.toFixed(2)}</b> is applied to their plan automatically.
              Your commission is {me.commission_rate}% of the final price.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><FiTag /></span>
            <h2 className="font-bold text-lg">Your 3 plans & commission</h2>
          </div>
          <div className="space-y-3">
            {(me.plans || []).map((p) => {
              const final = Math.max(0.01, p.price - discountNum);
              const earn = (final * Number(me.commission_rate || 0)) / 100;
              return (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-bold capitalize">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.max_products} products · {p.max_categories} categories · {p.days} days</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${final.toFixed(2)} {discountNum > 0 && <span className="text-xs text-gray-400 line-through">${p.price.toFixed(2)}</span>}</p>
                    <p className="text-xs font-semibold text-emerald-600">you earn ${earn.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Example: $9.99 Starter − ${discountNum.toFixed(2)} discount = ${Math.max(0.01, 9.99 - discountNum).toFixed(2)} paid → you earn ${(Math.max(0.01, 9.99 - discountNum) * Number(me.commission_rate || 0) / 100).toFixed(2)} ({me.commission_rate}%).
          </p>
        </div>
      </div>
    </div>
  );
}
