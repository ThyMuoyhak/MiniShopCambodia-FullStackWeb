import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiCopy, FiLink, FiMessageCircle, FiRefreshCw, FiSend } from 'react-icons/fi';
import { getShopDetail, getTelegramSettings, setTelegramWebhook, testTelegram, updateShop } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Loading, btnPrimary, btnGhost, inputCls } from '../components/ui';

export default function TelegramSettings() {
  const { user } = useAuth();
  const [tg, setTg] = useState({ bot_token: '', chat_id: '', enabled: false });
  const [profile, setProfile] = useState({ profile_id: '', secret_key: '', linked_chats: [], bot_username: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [webhookBusy, setWebhookBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getShopDetail(user.shop_id),
      getTelegramSettings(user.shop_id).catch(() => null),
    ]).then(([s, st]) => {
      setTg({
        bot_token: s.telegram_settings?.bot_token || '',
        chat_id: s.telegram_settings?.chat_id || '',
        enabled: s.telegram_settings?.enabled ?? false,
      });
      if (st) setProfile({
        profile_id: st.profile_id || '',
        secret_key: st.secret_key || '',
        linked_chats: st.linked_chats || [],
        bot_username: st.bot_username || '',
      });
    }).finally(() => setLoading(false));
  };

  useEffect(load, [user.shop_id]);

  const save = async () => {
    setSaving(true);
    try {
      await updateShop(user.shop_id, { telegram_settings: tg });
      toast.success('Telegram settings saved!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const res = await testTelegram({ shop_id: user.shop_id });
      if (res.ok) toast.success('Test notification sent! Check your Telegram chat.');
      else toast.error(res.detail || 'Failed to send');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const runWebhook = async () => {
    setWebhookBusy(true);
    try {
      await setTelegramWebhook(user.shop_id);
      toast.success('Webhook registered! You can now /start the bot and LINK this shop.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'setWebhook failed');
    } finally {
      setWebhookBusy(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  if (loading) return <Loading />;

  const linkCommand = profile.profile_id && profile.secret_key
    ? `LINK ${profile.profile_id} ${profile.secret_key}`
    : '';

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Telegram Bot</h1>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      </div>


      {/* Bot profile + chat linking */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2"><FiLink /> Link Your Shop to a Telegram Chat</h2>
          <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <FiRefreshCw /> Refresh
          </button>
        </div>
        <p className="text-sm text-gray-500">
          The shop bot receives <b>order & payment notifications</b> in any chat that links to this shop.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="font-semibold text-sm">How to link your group (3 steps):</p>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>
              Add the bot to your group from Telegram:{' '}
              {profile.bot_username ? (
                <a href={`https://t.me/${profile.bot_username}`} target="_blank" rel="noreferrer"
                   className="text-sky-600 font-semibold hover:underline">
                  @{profile.bot_username}
                </a>
              ) : 'save the Bot Token below first, then refresh'}
            </li>
            <li>In that group, press <b>Start</b> (or send <code className="bg-slate-100 px-1 rounded">/start</code>).</li>
            <li>Send the command below in the group (or copy it):</li>
          </ol>

          {linkCommand ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-slate-900 text-emerald-300 text-xs px-3 py-2 rounded-lg break-all">{linkCommand}</code>
              <button onClick={() => copy(linkCommand)} className="p-2 rounded-lg border hover:bg-white" title="Copy command">
                <FiCopy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Profile ID / Secret Key will appear here once the bot token is saved.</p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="text-xs font-semibold text-gray-500 block">Profile ID</label>
              <div className="flex items-center gap-1">
                <code className="flex-1 text-xs font-mono text-gray-700 bg-white border rounded px-2 py-1 truncate">{profile.profile_id || '—'}</code>
                {profile.profile_id && (
                  <button onClick={() => copy(profile.profile_id)} className="p-1.5 hover:bg-slate-100 rounded"><FiCopy className="w-3.5 h-3.5 text-gray-400" /></button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block">Secret Key</label>
              <div className="flex items-center gap-1">
                <code className="flex-1 text-xs font-mono text-gray-700 bg-white border rounded px-2 py-1 truncate">{profile.secret_key || '—'}</code>
                {profile.secret_key && (
                  <button onClick={() => copy(profile.secret_key)} className="p-1.5 hover:bg-slate-100 rounded"><FiCopy className="w-3.5 h-3.5 text-gray-400" /></button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <button onClick={runWebhook} disabled={webhookBusy} className={btnGhost}>
              {webhookBusy ? 'Registering...' : '🌐 Register Webhook (enables /start + LINK)'}
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Required before any chat can link. Press it again after any update to re-register
              (also enables the bot to auto-reply with LINK instructions when added to a group).
            </p>
          </div>
        </div>

        {/* Linked chats */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Linked chats ({profile.linked_chats.length})</h3>
          {profile.linked_chats.length === 0 ? (
            <p className="text-xs text-gray-400">No chats linked yet. Follow the steps above to link the first one.</p>
          ) : (
            <ul className="space-y-1.5">
              {profile.linked_chats.map((cid) => (
                <li key={cid} className="flex items-center gap-2 text-sm bg-gray-50 border rounded-lg px-3 py-2">
                  <FiMessageCircle className="w-4 h-4 text-sky-500" />
                  <span className="font-mono">{cid}</span>
                  <span className="ml-auto text-xs text-emerald-600 font-semibold">● linked</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold">Payment & Order Alerts</h2>
        <p className="text-sm text-gray-500">
          Receive automatic notifications when a customer places an order or pays successfully.
          Create a bot with @BotFather and add it to your group to get the chat ID.
        </p>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Bot Token</label>
          <input
            value={tg.bot_token}
            onChange={(e) => setTg({ ...tg, bot_token: e.target.value })}
            className={inputCls}
            placeholder="123456789:ABCdefGHI..."
          />
          <p className="text-xs text-gray-400 mt-1">Create your bot with @BotFather, then paste its token here. Tokens are stored per-shop on the server.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Chat ID (group / channel)</label>
          <input value={tg.chat_id} onChange={(e) => setTg({ ...tg, chat_id: e.target.value })} className={inputCls} placeholder="-1001234567890" />
          <p className="text-xs text-gray-400 mt-1">Negative IDs are supergroups; private chats use positive IDs.</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={tg.enabled} onChange={(e) => setTg({ ...tg, enabled: e.target.checked })} className="w-4 h-4" />
          Enable Telegram notifications
        </label>

        <div className="pt-2 border-t">
          <button onClick={runTest} disabled={testing || (!tg.bot_token || (!tg.chat_id && profile.linked_chats.length === 0))} className={btnGhost}>
            {testing ? 'Sending...' : <span className="inline-flex items-center gap-1"><FiSend /> Send Test Notification</span>}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">What gets sent:</p>
        <p>🛒 New order notification when a customer checks out.</p>
        <p>✅ Payment-success notification (with order number, amount, customer) once ABA Pay confirms.</p>
      </div>
    </div>
  );
}
