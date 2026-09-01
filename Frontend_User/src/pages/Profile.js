import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCalendar, FiEdit2, FiEye, FiEyeOff, FiKey, FiList, FiLogOut, FiSave, FiUser, FiX } from 'react-icons/fi';
import { useShop } from '../contexts/ShopContext';
import { useCustomer } from '../contexts/CustomerContext';
import { useLanguage } from '../i18n';
import { getMyOrders, updateMyProfile, changeMyPassword } from '../api';
import CustomerAuth from '../components/CustomerAuth';

export default function Profile() {
  const { shop } = useShop();
  const { customer, token, isLoggedIn, logout, setSession } = useCustomer();
  const { t } = useLanguage();
  const [ordersCount, setOrdersCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: '', username: '', gender: '', email: '', phone: '',
    telegram_username: '', telegram_phone: '', address: '', city: '', country: '',
  });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    if (!isLoggedIn || !token) return;
    let mounted = true;
    getMyOrders(token)
      .then((res) => { if (mounted) setOrdersCount(res.count || 0); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [isLoggedIn, token]);

  // Prefill the edit form from the current customer profile.
  useEffect(() => {
    if (customer) {
      setProfileForm({
        full_name: customer.name || '',
        username: customer.username || '',
        gender: customer.gender || '',
        email: customer.email || '',
        phone: customer.phone || '',
        telegram_username: customer.telegram_username || '',
        telegram_phone: customer.telegram_phone || '',
        address: customer.address || '',
        city: customer.city || '',
        country: customer.country || '',
      });
    }
  }, [customer]);

  if (!shop) return null;

  // Not signed in → show the login / signup form.
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

  const setProfile = (field) => (e) => setProfileForm({ ...profileForm, [field]: e.target.value });
  const setPw = (field) => (e) => setPwForm({ ...pwForm, [field]: e.target.value });

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name || !profileForm.username) {
      toast.error(t('fillRequired'));
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile(token, profileForm);
      setSession({ access_token: token, customer: updated });
      setEditing(false);
      toast.success(t('profileUpdated'));
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password) {
      toast.error(t('fillRequired'));
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error(t('passwordMismatch'));
      return;
    }
    setChangingPw(true);
    try {
      await changeMyPassword(token, {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success(t('passwordUpdated'));
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const base = `/${shop.username}`;
  const initial = ((customer?.name || customer?.username || 'U')[0] || 'U').toUpperCase();
  const created = customer?.created_at ? new Date(customer.created_at) : null;

  const infoRows = [
    { label: t('username'), value: customer?.username },
    { label: t('fullName'), value: customer?.name },
    { label: t('gender'), value: customer?.gender ? t(customer.gender) : '' },
    { label: t('gmail'), value: customer?.email },
    { label: t('phone'), value: customer?.phone },
    { label: t('telegram'), value: customer?.telegram || customer?.telegram_username || customer?.telegram_phone },
    { label: t('address'), value: customer?.address },
    { label: t('city'), value: customer?.city },
    { label: t('country'), value: customer?.country },
  ].filter((r) => r.value);

  const inputCls = 'mt-1 w-full border rounded-lg px-3 py-2 text-sm';
  const pwInput = (field, showKey) => (
    <div className="relative mt-1">
      <input
        type={showPw[showKey] ? 'text' : 'password'}
        value={pwForm[field]}
        onChange={setPw(field)}
        className="w-full border rounded-lg px-3 py-2 text-sm pr-10"
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={() => setShowPw((p) => ({ ...p, [showKey]: !p[showKey] }))}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400"
        aria-label={showPw[showKey] ? t('hidePassword') : t('showPassword')}
      >
        {showPw[showKey] ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FiUser className="text-primary" /> {t('myProfile')}
        </h1>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-semibold">
          <FiLogOut /> {t('logOut')}
        </button>
      </div>

      {/* Profile header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold">
          {initial}
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold">{customer?.name || customer?.username}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{customer?.username || customer?.name}</p>
          {created && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
              <FiCalendar className="w-3 h-3" /> {t('memberSince')}: {created.toLocaleDateString()}
            </p>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <FiEdit2 /> {t('editProfile')}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={saveProfile} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-6 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">{t('editProfile')}</h3>
            <button type="button" onClick={() => setEditing(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400">
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('fullName')} *</label>
              <input value={profileForm.full_name} onChange={setProfile('full_name')} className={inputCls} autoComplete="name" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('username')} *</label>
              <input value={profileForm.username} onChange={setProfile('username')} className={inputCls} autoCapitalize="none" autoComplete="username" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('gender')}</label>
              <select value={profileForm.gender} onChange={setProfile('gender')} className={inputCls}>
                <option value="">—</option>
                <option value="male">{t('male')}</option>
                <option value="female">{t('female')}</option>
                <option value="other">{t('other')}</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('gmail')}</label>
              <input type="email" value={profileForm.email} onChange={setProfile('email')} className={inputCls} placeholder="you@gmail.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('phone')}</label>
              <input value={profileForm.phone} onChange={setProfile('phone')} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('telegramPhone')}</label>
              <input value={profileForm.telegram_phone} onChange={setProfile('telegram_phone')} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('address')}</label>
              <input value={profileForm.address} onChange={setProfile('address')} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('city')}</label>
              <input value={profileForm.city} onChange={setProfile('city')} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('country')}</label>
              <input value={profileForm.country} onChange={setProfile('country')} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60 flex items-center gap-1.5">
              <FiSave /> {saving ? t('loading') : t('save')}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl border text-gray-600 dark:text-gray-400 font-semibold">
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden mb-6">
          <div className="divide-y divide-gray-100">
          {infoRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
              <span className="text-sm font-semibold text-gray-800 text-right">{row.value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('myOrders')}</span>
            <Link to={`${base}/my-orders`} className="text-sm font-semibold text-primary hover:underline">
              {ordersCount} {t('ordersFound')}
            </Link>
          </div>
        </div>
        </div>
      )}

      {/* Change password */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 mb-6">
        <h3 className="font-bold flex items-center gap-2 mb-4">
          <FiKey className="text-primary" /> {t('changePassword')}
        </h3>
        <form onSubmit={submitPassword} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('currentPassword')}</label>
            {pwInput('current_password', 'current')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('newPassword')}</label>
              {pwInput('new_password', 'next')}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('confirmPassword')} *</label>
              {pwInput('confirm_password', 'confirm')}
            </div>
          </div>
          <button type="submit" disabled={changingPw} className="btn-primary px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60">
            {changingPw ? t('loading') : t('updatePassword')}
          </button>
        </form>
      </div>

      <Link
        to={`${base}/my-orders`}
        className="btn-primary w-full mt-4 py-3 rounded-xl font-semibold text-center block"
      >
        <FiList className="inline mr-1" /> {t('myOrders')}
      </Link>
    </div>
  );
}
