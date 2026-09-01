import React, { useEffect, useState } from 'react';
import { getPlatformSettings } from '../api';
import { Loading, inputCls } from '../components/ui';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformSettings().then(setSettings).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">Contact & Account Creation</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block">Telegram Contact</label>
              <input value={settings.contact_telegram} readOnly className={`${inputCls} bg-gray-50`} />
              <p className="text-xs text-gray-400 mt-1">Users contact this Telegram account to get shop accounts created.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block">Default Admin Username</label>
              <input value={settings.default_admin} readOnly className={`${inputCls} bg-gray-50`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">Default Telegram Bot</h2>
          <p className="text-sm text-gray-500 mb-3">
            Used for platform-level notifications. Each shop configures its own bot token and chat ID in the Shop Dashboard.
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Bot Token</label>
            <input
              value="•••••••••••••••• (configured securely on the server)"
              readOnly
              className={`${inputCls} bg-gray-50 font-mono text-xs`}
            />
            <p className="text-xs text-gray-400 mt-1">Tokens are stored on the server and never exposed in the frontend bundle.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">Security</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex justify-between border-b pb-2">
              <span>JWT authentication</span>
              <span className="text-green-600 font-semibold">✓ Enabled</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span>Rate limiting</span>
              <span className="text-green-600 font-semibold">✓ 60 req/min</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span>Password hashing</span>
              <span className="text-green-600 font-semibold">✓ bcrypt</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span>Self-registration</span>
              <span className="text-red-600 font-semibold">✗ Disabled</span>
            </li>
            <li className="flex justify-between">
              <span>File upload restrictions</span>
              <span className="text-green-600 font-semibold">✓ Images only (max 8MB)</span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-lg mb-4">Payment</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex justify-between border-b pb-2">
              <span>ABA Pay Integration</span>
              <span className="text-green-600 font-semibold">✓ Active</span>
            </p>
            <p className="flex justify-between border-b pb-2">
              <span>Per-shop profile ID & secret key</span>
              <span className="text-green-600 font-semibold">✓ Supported</span>
            </p>
            <p className="flex justify-between">
              <span>Sandbox mode (no credentials)</span>
              <span className="text-amber-600 font-semibold">✓ Auto-enabled</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <strong>Note:</strong> For security, secret values (ABA secret keys, Telegram tokens) are stored per-shop in the
        Shop Dashboard and never exposed through the public admin API. Rate-limit tuning is done in the backend config
        (<code className="font-mono">Backend_API/config.py</code>).
      </div>
    </div>
  );
}
