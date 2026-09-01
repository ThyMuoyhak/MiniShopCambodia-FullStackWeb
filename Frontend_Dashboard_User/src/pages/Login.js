import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiShoppingBag, FiLock } from 'react-icons/fi';
import { login } from '../api';
import { useAuth } from '../contexts/AuthContext';

const MAX_FAILED = 3;
const BASE_LOCK_MIN = 5;

const fmt = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function Login() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(0);
  const [lockLevel, setLockLevel] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockUntil) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [lockUntil]);

  const lockRemaining = lockUntil ? Math.max(0, Math.ceil((lockUntil - now) / 1000)) : 0;
  const locked = lockRemaining > 0;
  const attemptsLeft = Math.max(0, MAX_FAILED - failed);

  const submit = async (e) => {
    e.preventDefault();
    if (locked) return;
    setLoading(true);
    try {
      const data = await login(form);
      if (data.user.role !== 'shop_owner' && data.user.role !== 'staff') {
        toast.error('This panel is for shop owners only');
        return;
      }
      if (!data.user.shop_id) {
        toast.error('Your account is not linked to a shop. Contact admin via Telegram @your_telegram');
        return;
      }
      setAuth(data.access_token, data.user);
      toast.success(`Welcome, ${data.user.username}!`);
      navigate('/');
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || 'Login failed';
      if (status === 429) {
        const m = detail.match(/(\d+) min/);
        const s = detail.match(/(\d+) sec/);
        let wait = BASE_LOCK_MIN * 60;
        if (m) wait = parseInt(m[1], 10) * 60;
        if (s) wait += parseInt(s[1], 10);
        setLockUntil(Date.now() + wait * 1000);
        setNow(Date.now());
        setFailed(0);
        toast.error(detail);
      } else if (status === 401) {
        const next = failed + 1;
        setFailed(next);
        if (next >= MAX_FAILED) {
          const level = lockLevel + 1;
          setLockLevel(level);
          const mins = BASE_LOCK_MIN * level;
          setLockUntil(Date.now() + mins * 60000);
          setNow(Date.now());
          setFailed(0);
          toast.error(`Too many failed attempts. Account locked for ${mins} minutes.`);
        } else {
          toast.error(`${detail}`);
        }
      } else {
        toast.error(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-2">
            <FiShoppingBag className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Shop Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your Mini Shop store</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          {locked && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
              <FiLock className="inline text-red-500 mr-1" />
              <span className="text-sm font-semibold text-red-600">Account locked</span>
              <p className="text-sm text-red-500 mt-1 font-mono">
                Try again in {fmt(lockRemaining)}
              </p>
            </div>
          )}
          {!locked && attemptsLeft < MAX_FAILED && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-center text-sm text-amber-700">
              ⚠ {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left before your account is locked
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700">Shop Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={locked}
              className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
              placeholder="e.g. demo"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Your username determines which shop dashboard loads.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={locked}
              className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-slate-100"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading || locked} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60">
            {locked ? `Locked ${fmt(lockRemaining)}` : loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="text-xs text-center text-gray-400">
            No self-registration. Need an account? Contact <span className="font-semibold text-indigo-600">@your_telegram</span>
          </p>
        </form>
      </div>
    </div>
  );
}
