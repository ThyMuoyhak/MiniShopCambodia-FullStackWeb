import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiKey, FiPercent, FiTag, FiUser } from 'react-icons/fi';
import { changePassword, resellerMe } from '../api';
import { Loading, btnPrimary, inputCls } from '../components/ui';

export default function Settings() {
  const [me, setMe] = useState(null);
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    resellerMe().then(setMe).catch(() => setMe(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!me) return <Loading />;

  const submitPw = async (e) => {
    e.preventDefault();
    if (pw.new_password.length < 4) { toast.error('New password must be at least 4 characters'); return; }
    setBusy(true);
    try {
      await changePassword(pw);
      toast.success('Password updated');
      setPw({ current_password: '', new_password: '' });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center"><FiUser /></span>
            <h2 className="font-bold text-lg">Profile</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Username</span><span className="font-semibold">{me.username}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-semibold">{me.email || '—'}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1"><FiTag /> Promo code</span>
              <span className="font-mono font-bold text-emerald-600">{me.referral_code}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><FiPercent /> Commission rate</span><span className="font-semibold">{me.commission_rate}%</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Max discount</span><span className="font-semibold">${Number(me.discount_max).toFixed(2)}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><FiKey /></span>
            <h2 className="font-bold text-lg">Change password</h2>
          </div>
          <form onSubmit={submitPw} className="space-y-3">
            <input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
                   placeholder="Current password" className={inputCls} required />
            <input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
                   placeholder="New password" className={inputCls} required />
            <button type="submit" disabled={busy} className={btnPrimary + ' disabled:opacity-50'}>
              {busy ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
