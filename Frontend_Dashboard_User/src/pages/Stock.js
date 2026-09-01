import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiBell, FiMinus, FiPackage, FiPlus } from 'react-icons/fi';
import { getStockReport, sendStockAlert, updateStock, fullUrl } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Empty, Loading, Modal, btnPrimary, btnGhost, inputCls } from '../components/ui';

const GROUP_META = {
  out_of_stock: { label: 'Out of stock', badge: 'bg-red-100 text-red-700', icon: 'bg-red-50 text-red-500' },
  low_stock: { label: 'Low stock', badge: 'bg-amber-100 text-amber-700', icon: 'bg-amber-50 text-amber-500' },
  normal: { label: 'In stock', badge: 'bg-green-100 text-green-700', icon: 'bg-green-50 text-green-500' },
  high_stock: { label: 'High stock', badge: 'bg-blue-100 text-blue-700', icon: 'bg-blue-50 text-blue-500' },
};

export default function Stock() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [low, setLow] = useState(5);
  const [high, setHigh] = useState(50);
  const [sending, setSending] = useState(false);
  const [stockModal, setStockModal] = useState(null);
  const [tab, setTab] = useState('out_of_stock');

  const load = (l = low, h = high) => {
    setLoading(true);
    getStockReport(user.shop_id, l, h).then(setReport).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [user.shop_id]);

  const applyThresholds = () => {
    const l = Math.max(0, Number(low) || 0);
    const h = Math.max(1, Number(high) || 1);
    setLow(l);
    setHigh(h);
    load(l, h);
  };

  const openAddModal = (product) => setStockModal({ product, qty: 0, mode: 'add' });
  const openSetModal = (product) => setStockModal({ product, qty: product.quantity || 0, mode: 'set' });

  const saveStock = async () => {
    if (!stockModal) return;
    try {
      const res = await updateStock(stockModal.product.id, stockModal.qty, stockModal.mode);
      toast.success(`${stockModal.mode === 'add' ? 'Added' : 'Set'} stock → ${res.quantity}`);
      setStockModal(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update stock');
    }
  };

  const alertTelegram = async () => {
    setSending(true);
    try {
      const res = await sendStockAlert(user.shop_id);
      toast.success(res.detail || 'Alert sent!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send alert');
    } finally {
      setSending(false);
    }
  };

  const groups = report?.groups || {};
  const counts = report?.counts || {};
  const order = ['out_of_stock', 'low_stock', 'normal', 'high_stock'];

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Stock Management</h1>
        <div className="flex items-center gap-2">
          <div className="bg-white border rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Low ≤</span>
            <input value={low} onChange={(e) => setLow(e.target.value)} className="w-12 text-center outline-none" />
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">High ≥</span>
            <input value={high} onChange={(e) => setHigh(e.target.value)} className="w-12 text-center outline-none" />
          </div>
          <button onClick={applyThresholds} className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">Apply</button>
          <button onClick={alertTelegram} disabled={sending} className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-60">
            <FiBell className="inline mr-1" /> {sending ? 'Sending...' : 'Telegram Alert'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {order.map((k) => (
          <div key={k} className={`bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 border-l-4 ${k === 'out_of_stock' ? 'border-red-500' : k === 'low_stock' ? 'border-amber-500' : k === 'high_stock' ? 'border-blue-500' : 'border-green-500'}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${GROUP_META[k].icon}`}>
              <FiPackage className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{GROUP_META[k].label}</p>
              <p className="text-2xl font-bold">{counts[k] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {order.map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === k ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {GROUP_META[k].label} ({counts[k] ?? 0})
          </button>
        ))}
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {groups[tab]?.length === 0 ? (
          <Empty message={`No ${GROUP_META[tab].label.toLowerCase()} products`} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Current Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups[tab].map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={fullUrl(p.images[0])} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><FiPackage /></div>
                      )}
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category_name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${p.quantity <= 0 ? 'text-red-600' : p.quantity <= low ? 'text-amber-600' : 'text-green-600'}`}>
                      {p.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${GROUP_META[tab].badge}`}>{GROUP_META[tab].label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openAddModal(p)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold" title="Add stock">
                        <FiPlus className="inline mr-0.5" /> Add
                      </button>
                      <button onClick={() => openSetModal(p)} className="bg-slate-100 hover:bg-slate-200 text-gray-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold" title="Set stock">
                        Set
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Set stock modal */}
      <Modal open={!!stockModal} title={stockModal?.mode === 'add' ? `Add Stock — ${stockModal?.product?.name}` : `Set Stock — ${stockModal?.product?.name}`} onClose={() => setStockModal(null)}>
        {stockModal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <span className="text-sm text-gray-600">Current stock</span>
              <span className="text-xl font-bold">{stockModal.product.quantity}</span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {stockModal.mode === 'add' ? 'Quantity to add' : 'New quantity'}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setStockModal({ ...stockModal, qty: Math.max(0, (Number(stockModal.qty) || 0) - 1) })} className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-gray-50">
                  <FiMinus />
                </button>
                <input
                  type="number"
                  value={stockModal.qty}
                  onChange={(e) => setStockModal({ ...stockModal, qty: e.target.value })}
                  className={`${inputCls} text-center text-lg font-bold`}
                />
                <button onClick={() => setStockModal({ ...stockModal, qty: (Number(stockModal.qty) || 0) + 1 })} className="w-10 h-10 border rounded-lg flex items-center justify-center hover:bg-gray-50">
                  <FiPlus />
                </button>
              </div>
              {stockModal.mode === 'add' && stockModal.qty > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Result: <strong>{(stockModal.product.quantity || 0) + (Number(stockModal.qty) || 0)}</strong>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={saveStock} className={btnPrimary}>Save</button>
              <button onClick={() => setStockModal(null)} className={btnGhost}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}