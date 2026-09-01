import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiKey, FiUpload } from 'react-icons/fi';
import { changePassword, getShopDetail, updateShop, uploadImage, fullUrl } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Loading, btnPrimary, inputCls } from '../components/ui';

export default function ShopSettings() {
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const changePw = async (e) => {
    e.preventDefault();
    if (!pw.current_password || !pw.new_password || !pw.confirm_password) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (pw.new_password !== pw.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    setPwBusy(true);
    try {
      await changePassword({ current_password: pw.current_password, new_password: pw.new_password });
      toast.success('Password updated!');
      setPw({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to change password');
    } finally {
      setPwBusy(false);
    }
  };

  const pwField = (field, showKey) => (
    <div className="relative mt-1">
      <input
        type={showPw[showKey] ? 'text' : 'password'}
        value={pw[field]}
        onChange={(e) => setPw({ ...pw, [field]: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 text-sm pr-10"
        placeholder="••••••••"
      />
      <button
        type="button"
        onClick={() => setShowPw((p) => ({ ...p, [showKey]: !p[showKey] }))}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {showPw[showKey] ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
      </button>
    </div>
  );

  useEffect(() => {
    getShopDetail(user.shop_id).then(setShop).finally(() => setLoading(false));
  }, [user.shop_id]);

  if (loading) return <Loading />;
  if (!shop) return <div className="text-gray-400 py-16 text-center">Shop not found</div>;

  const set = (field) => (e) => setShop({ ...shop, [field]: e.target.value });
  const setTheme = (field) => (e) => setShop({ ...shop, theme: { ...(shop.theme || {}), [field]: e.target.value } });
  const setSocial = (field) => (e) => setShop({ ...shop, social_media: { ...(shop.social_media || {}), [field]: e.target.value } });

  const handleUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadImage(file);
      setShop({ ...shop, [field]: res.url });
      toast.success('Uploaded!');
    } catch (err) { toast.error(err?.response?.data?.detail || 'Upload failed'); }
  };

  const handleSlide = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const urls = [];
    try {
      for (const f of files) {
        const res = await uploadImage(f);
        urls.push(res.url);
      }
      setShop({ ...shop, slideshow: [...(shop.slideshow || []), ...urls] });
      toast.success('Slideshow images uploaded');
    } catch (err) { toast.error(err?.response?.data?.detail || 'Upload failed'); }
  };

  const removeSlide = (idx) => {
    setShop({ ...shop, slideshow: (shop.slideshow || []).filter((_, i) => i !== idx) });
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateShop(user.shop_id, {
        shop_name: shop.shop_name, logo: shop.logo, banner: shop.banner,
        bio: shop.bio, description: shop.description,
        slideshow: shop.slideshow || [],
        social_media: shop.social_media || {},
        theme: shop.theme || {},
        contact: shop.contact, currency: shop.currency,
      });
      toast.success('Shop settings saved!');
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shop Settings</h1>
        <button onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold">Shop Identity</h2>
        <div className="flex items-center gap-6">
          <div>
            {shop.logo ? (
              <img src={fullUrl(shop.logo)} alt="Logo" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-2xl">🖼️</div>
            )}
            <label className="block text-center mt-1 text-xs text-indigo-600 cursor-pointer hover:underline">
              Upload logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'logo')} />
            </label>
          </div>
          <div>
            {shop.banner ? (
              <img src={fullUrl(shop.banner)} alt="Banner" className="w-56 h-20 object-cover rounded-lg" />
            ) : (
              <div className="w-56 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs">Banner</div>
            )}
            <label className="block text-center mt-1 text-xs text-indigo-600 cursor-pointer hover:underline">
              Upload banner
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'banner')} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block">Shop Name</label>
            <input value={shop.shop_name} onChange={set('shop_name')} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Username</label>
            <input value={shop.username} disabled className={`${inputCls} bg-gray-50`} />
            <p className="text-xs text-gray-400 mt-1">Storefront URL: /{shop.username}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Currency</label>
            <select value={shop.currency} onChange={set('currency')} className={inputCls}>
              <option value="USD">USD</option>
              <option value="KHR">KHR (Riel)</option>
              <option value="THB">THB (Baht)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Contact / Address</label>
            <input value={shop.contact || ''} onChange={set('contact')} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Bio (short tagline)</label>
          <input value={shop.bio || ''} onChange={set('bio')} className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Full Description</label>
          <textarea value={shop.description || ''} onChange={set('description')} rows="4" className={inputCls} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Slideshow Banners</h2>
          <label className="flex items-center gap-1 text-indigo-600 text-sm font-semibold cursor-pointer hover:underline">
            <FiUpload /> Add slideshow images
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleSlide} />
          </label>
        </div>
        {(shop.slideshow || []).length === 0 ? (
          <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4 text-center">No slideshow images yet.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {shop.slideshow.map((img, i) => (
              <div key={i} className="relative group">
                <img src={fullUrl(img)} alt="" className="w-full h-24 object-cover rounded-lg border" />
                <button onClick={() => removeSlide(i)} className="absolute top-1 right-1 p-1.5 bg-white rounded-full shadow text-red-500 opacity-0 group-hover:opacity-100 transition">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold">Social Media</h2>
        <div className="grid grid-cols-2 gap-4">
          {['facebook', 'instagram', 'twitter', 'telegram', 'whatsapp', 'tiktok', 'youtube'].map((s) => (
            <div key={s}>
              <label className="text-sm font-medium text-gray-700 block capitalize">{s}</label>
              <input value={shop.social_media?.[s] || ''} onChange={setSocial(s)} className={inputCls} placeholder={`https://${s}.com/...`} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold">Theme Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={shop.theme?.primary || '#6366f1'} onChange={setTheme('primary')} className="w-12 h-9 border rounded-lg" />
              <input value={shop.theme?.primary || '#6366f1'} onChange={setTheme('primary')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={shop.theme?.secondary || '#ec4899'} onChange={setTheme('secondary')} className="w-12 h-9 border rounded-lg" />
              <input value={shop.theme?.secondary || '#ec4899'} onChange={setTheme('secondary')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Font Family</label>
            <select value={shop.theme?.font_family || 'Inter'} onChange={setTheme('font_family')} className={inputCls}>
              {['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Open Sans', 'Lato', 'Nunito'].map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2"><FiKey /> Change Password</h2>
        <form onSubmit={changePw} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block">Current Password</label>
            {pwField('current_password', 'current')}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block">New Password</label>
              {pwField('new_password', 'next')}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block">Confirm New Password</label>
              {pwField('confirm_password', 'confirm')}
            </div>
          </div>
          <button type="submit" disabled={pwBusy} className={btnPrimary}>
            {pwBusy ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
