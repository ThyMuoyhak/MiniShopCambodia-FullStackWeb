import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiEdit, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
import {
  createCategory, createProduct, deleteCategory, deleteCustomer, deleteOrder,
  deleteProduct, exportShopBackup, fullUrl, getOrder, getShopDetail,
  listShopCategories, listShopCustomers, listShopOrders, listShopProducts,
  setShopExpiry, setShopLimits, updateCategory, updateOrderStatus, updateProduct, updateShopStatus,
} from '../api';
import { Empty, Loading, Modal, btnDanger, btnGhost, btnPrimary, inputCls } from '../components/ui';

const TABS = ['Overview', 'Products', 'Orders', 'Customers', 'Categories'];
const isExpired = (shop) => !!shop?.expires_at && new Date(shop.expires_at) < new Date();

export default function ShopDetail() {
  const { id } = useParams();
  const shopId = Number(id);
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  const loadShop = () => getShopDetail(shopId).then(setShop).catch((e) => toast.error(e?.response?.data?.detail || 'Failed to load shop'));
  useEffect(() => { loadShop().finally(() => setLoading(false)); }, [shopId]);

  const toggleStatus = async () => {
    const next = shop.status === 'active' ? 'suspended' : 'active';
    try { await updateShopStatus(shopId, next); toast.success(`Shop ${next}`); loadShop(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const setExpiry = async (days) => {
    try {
      await setShopExpiry(shopId, days);
      toast.success(days > 0 ? `Expiry set (+${days} days)` : 'Expiry cleared');
      loadShop();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to set expiry'); }
  };

  const exportExcel = async () => {
    try {
      const blob = await exportShopBackup(shopId, 'xlsx');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop_${shopId}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Shop Excel exported');
    } catch (e) { toast.error(e?.response?.data?.detail || 'Export failed'); }
  };

  if (loading) return <Loading />;
  if (!shop) return <Empty message="Shop not found" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/shops')} className="p-2 rounded-lg hover:bg-slate-100" title="Back">
            <FiArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{shop.shop_name} <span className="text-gray-400 font-normal">@{shop.username}</span></h1>
            <p className="text-sm text-gray-500">
              {shop.product_count} products · {shop.order_count} orders · {shop.user_count} users
              {shop.expires_at ? ` · Expires ${new Date(shop.expires_at).toLocaleDateString()}${isExpired(shop) ? ' (EXPIRED)' : ''}` : ' · No expiry'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className={btnGhost}>Export Excel</button>
          {shop.status === 'active'
            ? <button onClick={toggleStatus} className={btnGhost}>Suspend</button>
            : <button onClick={toggleStatus} className={btnPrimary}>Activate</button>}
          <a href={`http://localhost:3000/${shop.username}`} target="_blank" rel="noreferrer" className={btnGhost}>Visit ↗</a>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-slate-50'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab shop={shop} setExpiry={setExpiry} toggleStatus={toggleStatus} onSaved={loadShop} />}
      {tab === 'Products' && <ProductsTab shopId={shopId} />}
      {tab === 'Orders' && <OrdersTab shopId={shopId} />}
      {tab === 'Customers' && <CustomersTab shopId={shopId} />}
      {tab === 'Categories' && <CategoriesTab shopId={shopId} />}
    </div>
  );
}

function OverviewTab({ shop, setExpiry, toggleStatus, onSaved }) {
  const [pLimit, setPLimit] = useState(shop.max_products ?? '');
  const [cLimit, setCLimit] = useState(shop.max_categories ?? '');

  const saveLimits = async () => {
    try {
      const data = {
        max_products: pLimit === '' || Number(pLimit) === 0 ? 0 : Number(pLimit),
        max_categories: cLimit === '' || Number(cLimit) === 0 ? 0 : Number(cLimit),
      };
      await setShopLimits(shop.id, data);
      toast.success('Limits saved');
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save limits');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4"><p className="text-2xl font-bold">{shop.product_count}</p><p className="text-xs text-gray-500">Products</p></div>
        <div className="bg-slate-50 rounded-lg p-4"><p className="text-2xl font-bold">{shop.order_count}</p><p className="text-xs text-gray-500">Orders</p></div>
        <div className="bg-slate-50 rounded-lg p-4"><p className="text-2xl font-bold">{shop.user_count}</p><p className="text-xs text-gray-500">Users</p></div>
        <div className="bg-slate-50 rounded-lg p-4"><p className="text-2xl font-bold">{shop.currency || 'USD'}</p><p className="text-xs text-gray-500">Currency</p></div>
      </div>
      <div className="space-y-4 text-sm">
        <div><p className="font-semibold mb-1">Bio</p><p className="text-gray-600">{shop.bio || '—'}</p></div>
        <div><p className="font-semibold mb-1">Contact</p><p className="text-gray-600">{shop.contact || '—'}</p></div>
        <div><p className="font-semibold mb-1">Status</p>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${shop.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{shop.status}</span>
        </div>
        <div>
          <p className="font-semibold mb-2">Subscription / Expiry</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setExpiry(30)} className={btnGhost}>+ 1 Month</button>
            <button onClick={() => setExpiry(365)} className={btnGhost}>+ 1 Year</button>
            <button onClick={() => setExpiry(0)} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50">Clear expiry</button>
          </div>
        </div>
        <div>
          <p className="font-semibold mb-2">Creation Limits (0 = unlimited)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Products</label>
              <input type="number" min="0" value={pLimit} onChange={(e) => setPLimit(e.target.value)} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">{shop.product_count} used{shop.max_products ? ` / ${shop.max_products}` : ''}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max Categories</label>
              <input type="number" min="0" value={cLimit} onChange={(e) => setCLimit(e.target.value)} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">{shop.category_count} used{shop.max_categories ? ` / ${shop.max_categories}` : ''}</p>
            </div>
          </div>
          <button onClick={saveLimits} className={`${btnPrimary} mt-3`}>Save Limits</button>
        </div>
        <div><p className="font-semibold mb-1">ABA Pay</p>
          <p className="text-gray-600">{shop.aba_settings?.profile_id ? `Profile: ${shop.aba_settings.profile_id}` : 'Not configured'}{shop.aba_settings?.test_mode ? ' · Sandbox mode' : ''}</p>
        </div>
      </div>
    </div>
  );
}

function ProductsTab({ shopId }) {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', quantity: '', category_id: '', status: 'active', featured: false });

  const load = () => Promise.all([listShopProducts(shopId), listShopCategories(shopId)])
    .then(([p, c]) => { setProducts(p); setCats(c); })
    .finally(() => setLoading(false));
  useEffect(() => { load(); }, [shopId]);

  const openCreate = () => { setEditing(null); setForm({ name: '', price: '', quantity: '', category_id: '', status: 'active', featured: false }); setModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, price: p.price ?? '', quantity: p.quantity ?? '', category_id: p.category_id ?? '', status: p.status || 'active', featured: !!p.featured });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Name is required'); return; }
    const payload = {
      shop_id: shopId, name: form.name, description: '',
      price: Number(form.price) || 0, quantity: Number(form.quantity) || 0,
      category_id: form.category_id ? Number(form.category_id) : null,
      status: form.status, featured: form.featured,
    };
    try {
      if (editing) { await updateProduct(editing.id, payload); toast.success('Product updated'); }
      else { await createProduct(payload); toast.success('Product created'); }
      setModal(false); load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed to save product'); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete product "${p.name}"?`)) return;
    try { await deleteProduct(p.id); toast.success('Product deleted'); load(); }
    catch (err) { toast.error(err?.response?.data?.detail || 'Failed to delete'); }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b flex items-center justify-between">
        <h2 className="font-bold">Products ({products.length})</h2>
        <button className={btnPrimary} onClick={openCreate}><FiPlus className="inline mr-1" /> Add Product</button>
      </div>
      {products.length === 0 ? <Empty message="No products" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.images?.[0] && <img src={fullUrl(p.images[0])} alt="" className="w-8 h-8 rounded object-cover" />}
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{Number(p.sale_price ?? p.price).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.quantity ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => updateProduct(p.id, { status: p.status === 'active' ? 'draft' : 'active' }).then(() => { toast.success('Status updated'); load(); }).catch((e) => toast.error(e?.response?.data?.detail))}
                        className="p-2 rounded-lg hover:bg-slate-100 text-xs font-semibold">{p.status === 'active' ? 'Draft' : 'Activate'}</button>
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Edit"><FiEdit /></button>
                      <button onClick={() => remove(p)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ProductModal modal={modal} editing={editing} form={form} setForm={setForm} submit={submit} setModal={setModal} cats={cats} />
    </div>
  );
}

function ProductModal({ modal, editing, form, setForm, submit, setModal, cats }) {
  return (
    <Modal open={modal} title={editing ? `Edit ${editing.name}` : 'Add Product'} onClose={() => setModal(false)}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block">Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block">Price</label>
            <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block">Quantity</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Category</label>
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls}>
            <option value="">None</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Featured
        </label>
        <div className="flex gap-2 pt-2">
          <button type="submit" className={btnPrimary}>{editing ? 'Save Changes' : 'Create Product'}</button>
          <button type="button" onClick={() => setModal(false)} className={btnGhost}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function OrdersTab({ shopId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(null);

  const load = () => listShopOrders(shopId).then(setOrders).finally(() => setLoading(false));
  useEffect(() => { load(); }, [shopId]);

  const setStatus = async (o, status) => {
    try {
      await updateOrderStatus(o.id, { order_status: status });
      toast.success(`Order #${o.order_number} → ${status}`);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to update'); }
  };

  const remove = async (o) => {
    if (!window.confirm(`Delete order #${o.order_number}?`)) return;
    try { await deleteOrder(o.id); toast.success('Order deleted'); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed to delete'); }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b"><h2 className="font-bold">Orders ({orders.length})</h2></div>
      {orders.length === 0 ? <Empty message="No orders" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                  <td className="px-4 py-3">{o.customer_name || '—'}</td>
                  <td className="px-4 py-3">{Number(o.total).toFixed(2)} {o.currency}</td>
                  <td className="px-4 py-3 capitalize">{o.payment_method || 'aba'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${(o.order_status || 'pending') === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{o.order_status || 'pending'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => getOrder(o.id).then(setView)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="View"><FiEye /></button>
                      <select value={o.order_status || 'pending'}
                        onChange={(e) => setStatus(o, e.target.value)}
                        className="border rounded-lg px-2 py-1 text-xs">
                        <option value="pending">pending</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="delivered">delivered</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                      <button onClick={() => remove(o)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!view} title={view ? `Order #${view.order_number}` : ''} onClose={() => setView(null)}>
        {view && (
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Customer:</span> {view.customer_name || '—'}</p>
            <p><span className="text-gray-500">Phone:</span> {view.customer_phone || '—'}</p>
            <p><span className="text-gray-500">Payment:</span> {view.payment_status} via {view.payment_method}</p>
            <p><span className="text-gray-500">Transaction:</span> {view.transaction_id || '—'}</p>
            <div className="border-t pt-2 mt-2">
              {(view.items || []).map((it, i) => (
                <p key={i} className="flex justify-between"><span>{it.product_name} × {it.quantity}</span><span>{(Number(it.price) * Number(it.quantity)).toFixed(2)}</span></p>
              ))}
            </div>
            <p className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{Number(view.total).toFixed(2)} {view.currency}</span></p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function CustomersTab({ shopId }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => listShopCustomers(shopId, search).then(setCustomers).finally(() => setLoading(false));
  useEffect(() => { load(); }, [shopId, search]);

  const remove = async (c) => {
    if (!window.confirm(`Delete customer "${c.name || c.telegram}"?`)) return;
    try { await deleteCustomer(c.id); toast.success('Customer deleted'); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed to delete'); }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold">Customers ({customers.length})</h2>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / phone / telegram..."
          className="border rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      {customers.length === 0 ? <Empty message="No customers" /> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Telegram</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Total Spent</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">{c.name || '—'}</td>
                <td className="px-4 py-3">{c.phone || '—'}</td>
                <td className="px-4 py-3">{c.telegram || '—'}</td>
                <td className="px-4 py-3">{c.order_count ?? 0}</td>
                <td className="px-4 py-3">{Number(c.total_spent || 0).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CategoriesTab({ shopId }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);

  const load = () => listShopCategories(shopId).then(setCats).finally(() => setLoading(false));
  useEffect(() => { load(); }, [shopId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editing) { await updateCategory(editing.id, { name: name.trim() }); toast.success('Category renamed'); }
      else { await createCategory({ shop_id: shopId, name: name.trim(), slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') }); toast.success('Category created'); }
      setName(''); setEditing(null); load();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Failed to save category'); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try { await deleteCategory(c.id); toast.success('Category deleted'); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Failed to delete'); }
  };

  if (loading) return <Loading />;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-5 border-b">
        <h2 className="font-bold mb-3">Categories ({cats.length})</h2>
        <form onSubmit={submit} className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={editing ? `Rename "${editing.name}"` : 'New category name'}
            className="border rounded-lg px-3 py-2 text-sm flex-1 max-w-sm" />
          <button type="submit" className={btnPrimary}><FiPlus className="inline mr-1" /> {editing ? 'Rename' : 'Add'}</button>
          {editing && <button type="button" onClick={() => { setEditing(null); setName(''); }} className={btnGhost}>Cancel</button>}
        </form>
      </div>
      {cats.length === 0 ? <Empty message="No categories" /> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cats.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-3">{c.product_count ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(c); setName(c.name); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" title="Rename"><FiEdit /></button>
                    <button onClick={() => remove(c)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
