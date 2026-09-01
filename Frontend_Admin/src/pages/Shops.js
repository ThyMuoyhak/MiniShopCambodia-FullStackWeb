import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCalendar, FiEye, FiSettings, FiTrash2 } from 'react-icons/fi';
import { createShop, deleteShop, listShops, setShopExpiry, updateShopStatus, fullUrl } from '../api';
import { Empty, Loading, Modal, btnDanger, btnPrimary, btnGhost, inputCls } from '../components/ui';

const isExpired = (shop) => !!shop.expires_at && new Date(shop.expires_at) < new Date();

export default function Shops() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [detailShop, setDetailShop] = useState(null);
  const [form, setForm] = useState({ username: '', shop_name: '', email: '', password: '' });
  const [expiryDays, setExpiryDays] = useState(30);

  const load = () => listShops().then(setShops).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const setExpiry = async (shop, days) => {
    try {
      await setShopExpiry(shop.id, days);
      toast.success(days > 0 ? `Expiry set (+${days} days)` : 'Expiry cleared');
      setDetailShop(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to set expiry');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Username and password are required');
      return;
    }
    try {
      await createShop(form);
      toast.success('Shop created!');
      setModal(false);
      setForm({ username: '', shop_name: '', email: '', password: '' });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create shop');
    }
  };

  const toggleStatus = async (shop) => {
    const next = shop.status === 'active' ? 'suspended' : 'active';
    try {
      await updateShopStatus(shop.id, next);
      toast.success(`Shop ${next}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed');
    }
  };

  const remove = async (shop) => {
    if (!window.confirm(`Delete shop "${shop.shop_name}" and all its data? This cannot be undone.`)) return;
    try {
      await deleteShop(shop.id);
      toast.success('Shop deleted');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Shops</h1>
        <button className={btnPrimary} onClick={() => setModal(true)}>+ Create Shop</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {shops.length === 0 ? (
          <Empty message="No shops yet. Create your first shop!" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Limits</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shops.map((shop) => (
                <tr key={shop.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {shop.logo ? (
                        <img src={fullUrl(shop.logo)} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {(shop.shop_name || 'S')[0]}
                        </div>
                      )}
                      <span className="font-semibold">{shop.shop_name || shop.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">@{shop.username}</td>
                  <td className="px-4 py-3">{shop.product_count}</td>
                  <td className="px-4 py-3">{shop.order_count}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    P: {shop.product_count}{shop.max_products ? `/${shop.max_products}` : ''} ·
                    C: {shop.category_count}{shop.max_categories ? `/${shop.max_categories}` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-bold capitalize">{shop.plan || '—'}</span>
                    {shop.plan_price > 0 && <span className="text-gray-500"> ${Number(shop.plan_price).toFixed(2)}</span>}
                    {shop.reseller_id && <span className="block text-[10px] text-indigo-500 font-semibold">via reseller</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${isExpired(shop) ? 'text-red-600' : 'text-gray-600'}`}>
                      {shop.expires_at ? new Date(shop.expires_at).toLocaleDateString() : 'Never'}
                      {isExpired(shop) && <span className="ml-1 text-red-600 font-bold">· Expired</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${shop.status === 'active' && !isExpired(shop) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isExpired(shop) ? 'expired' : shop.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/shops/${shop.id}`)} className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600" title="Manage shop data">
                        <FiSettings />
                      </button>
                      <button onClick={() => setDetailShop(shop)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="View">
                        <FiEye />
                      </button>
                      <button onClick={() => toggleStatus(shop)} className="p-2 rounded-lg hover:bg-slate-100 text-amber-600 text-xs font-semibold" title="Toggle status">
                        {shop.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => remove(shop)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      <Modal open={modal} title="Create New Shop" onClose={() => setModal(false)}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block">Username *</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={inputCls} placeholder="shop-username" />
            <p className="text-xs text-gray-400 mt-1">Customers visit your shop at /{form.username}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Shop Name</label>
            <input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} className={inputCls} placeholder="My Awesome Shop" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Owner Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="owner@shop.com" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Owner Password *</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="Create a strong password" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className={btnPrimary}>Create Shop</button>
            <button type="button" onClick={() => setModal(false)} className={btnGhost}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailShop} title="Shop Details" onClose={() => setDetailShop(null)} wide>
        {detailShop && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {detailShop.logo && <img src={fullUrl(detailShop.logo)} alt="" className="w-16 h-16 rounded-full object-cover" />}
              <div>
                <h3 className="font-bold text-lg">{detailShop.shop_name}</h3>
                <p className="text-gray-500 text-sm">@{detailShop.username} · {detailShop.currency}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${detailShop.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {detailShop.status}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-xl font-bold">{detailShop.product_count}</p><p className="text-xs text-gray-500">Products</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-xl font-bold">{detailShop.order_count}</p><p className="text-xs text-gray-500">Orders</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-xl font-bold">{detailShop.user_count}</p><p className="text-xs text-gray-500">Users</p></div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Plan</p>
              <p className="text-sm text-gray-600 capitalize">
                {detailShop.plan || 'No plan'} {detailShop.plan_price > 0 ? `· $${Number(detailShop.plan_price).toFixed(2)}` : ''}
                {detailShop.reseller_id ? ' · referred by reseller' : ''}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Bio</p>
              <p className="text-sm text-gray-600">{detailShop.bio || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">Theme</p>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border" style={{ background: detailShop.theme?.primary }} />
                <span className="w-6 h-6 rounded-full border" style={{ background: detailShop.theme?.secondary }} />
                <span className="text-sm text-gray-600">{detailShop.theme?.font_family || 'Inter'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1">ABA Pay</p>
              <p className="text-sm text-gray-600">
                {detailShop.aba_settings?.profile_id ? `Profile: ${detailShop.aba_settings.profile_id}` : 'Not configured'}
                {detailShop.aba_settings?.test_mode ? ' · Sandbox mode' : ''}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-1"><FiCalendar /> Subscription / Expiry</p>
              <p className="text-sm text-gray-600 mb-3">
                {detailShop.expires_at
                  ? `Expires: ${new Date(detailShop.expires_at).toLocaleString()}${isExpired(detailShop) ? ' · EXPIRED' : ''}`
                  : 'No expiry (permanent).'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setExpiry(detailShop, 30)} className={btnGhost}>+ 1 Month</button>
                <button onClick={() => setExpiry(detailShop, 365)} className={btnGhost}>+ 1 Year</button>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="1"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value) || 1)}
                    className="w-20 border rounded-lg px-2 py-1.5 text-sm"
                  />
                  <button onClick={() => setExpiry(detailShop, expiryDays)} className={btnGhost}>+ Custom days</button>
                </div>
                <button onClick={() => setExpiry(detailShop, 0)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50">
                  Clear expiry
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { toggleStatus(detailShop); setDetailShop(null); }} className={btnGhost}>
                {detailShop.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
              <a href={`http://localhost:3000/${detailShop.username}`} target="_blank" rel="noreferrer" className={btnGhost}>Visit storefront ↗</a>
              <button onClick={() => remove(detailShop)} className={btnDanger}>Delete Shop</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
