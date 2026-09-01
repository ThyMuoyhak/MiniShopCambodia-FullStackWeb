import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiSend } from 'react-icons/fi';
import { getShopDetail, testPayment, updateShop } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Loading, btnPrimary, btnGhost, inputCls } from '../components/ui';

export default function PaymentSettings() {
  const { user } = useAuth();
  const [aba, setAba] = useState({ profile_id: '', secret_key: '', test_mode: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getShopDetail(user.shop_id).then((s) => {
      setAba({
        profile_id: s.aba_settings?.profile_id || '',
        secret_key: s.aba_settings?.secret_key || '',
        test_mode: s.aba_settings?.test_mode ?? true,
      });
    }).finally(() => setLoading(false));
  }, [user.shop_id]);

  const save = async () => {
    setSaving(true);
    try {
      await updateShop(user.shop_id, { aba_settings: aba });
      toast.success('Payment settings saved!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const res = await testPayment(user.shop_id);
      toast.success('ABA configuration valid!');
      setTestResult(res);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Test failed');
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  };

  const [testResult, setTestResult] = useState(null);

  if (loading) return <Loading />;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Settings (ABA Pay)</h1>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </div>

      {/* Contact Telegram to request ABA Payway for the shop */}
      <div className="bg-[#011F46] text-white rounded-xl shadow-sm p-5 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px]">
          <p className="font-bold text-base">
            ទំនាក់ទំនងទៅកាន់ Telegram សម្រាប់ការស្នើសុំ ABA Payway សម្រាប់ហាង
          </p>
          <p className="text-sm text-blue-200 mt-1">
            Contact us on Telegram to request / set up <b className="text-white">ABA Payway (KHQR)</b> for your shop — we will help you get the Profile ID & Secret Key.
          </p>
        </div>
        <a
          href="https://t.me/your_telegram"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-[#FB6E08] hover:bg-[#e05f03] text-white font-bold px-5 py-3 rounded-xl transition"
        >
          <FiSend /> t.me/your_telegram
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold">ABA Pay (KHQR) Configuration</h2>
        <p className="text-sm text-gray-500">
          Each shop uses its own ABA Pay profile (KHQRcc gateway). Enter the Profile ID and Secret Key from
          KHQRcc Settings. Until a valid Profile ID + Secret Key are saved, customers will NOT see a QR code —
          the checkout page shows "Online payment unavailable" instead.
        </p>
        <div>
          <label className="text-sm font-medium text-gray-700 block">ABA Pay Profile ID (Merchant ID)</label>
          <input value={aba.profile_id} onChange={(e) => setAba({ ...aba, profile_id: e.target.value })} className={inputCls} placeholder="e.g. 102001234567890" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">ABA Pay Secret Key</label>
          <input type="password" value={aba.secret_key} onChange={(e) => setAba({ ...aba, secret_key: e.target.value })} className={inputCls} placeholder="Your ABA secret key" />
          <p className="text-xs text-gray-400 mt-1">Hash format: sha1(secret + transaction_id + amount + success_url + remark)</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={aba.test_mode} onChange={(e) => setAba({ ...aba, test_mode: e.target.checked })} className="w-4 h-4" />
          Sandbox / test mode (payments auto-succeed)
        </label>

        <div className="flex items-center gap-3 pt-2 border-t">
          <button onClick={runTest} disabled={testing} className={btnGhost}>{testing ? 'Testing...' : '🔌 Test Payment Settings'}</button>
        </div>

        {testResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-emerald-700 mb-1">✅ Test successful</p>
            <p className="text-emerald-700 break-all">Transaction: {testResult.transaction_id}</p>
            <p className="text-emerald-700 break-all text-xs mt-1">Hash: {testResult.hash}</p>
            <a href={testResult.checkout_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs block mt-2">Open test checkout URL ↗</a>
          </div>
        )}

        <div className="bg-slate-50 rounded-lg p-4 text-xs text-gray-500 space-y-1">
          <p><strong>Payment flow:</strong> customer places order → sees KHQR code / redirect URL → pays via ABA Mobile → webhook + verify confirm payment → Telegram notification + PDF receipt.</p>
        </div>
      </div>
    </div>
  );
}
