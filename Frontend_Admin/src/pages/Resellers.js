import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiCopy, FiEdit2, FiEye, FiPercent, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi';
import { createReseller, deleteReseller, listResellers, resellerCustomers, updateReseller } from '../api';
import { Empty, Loading, btnGhost, btnPrimary, inputCls } from '../components/ui';

const STORE_URL = process.env.REACT_APP_STORE_URL || 'http://localhost:3000';

const empty = { username: '', email: '', password: '', referral_code: '', commission_rate: '10', discount_max: '1' };

export default function Resellers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [paidFilter, setPaidFilter] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [customers, setCustomers] = useState({}); // id -> {loading, data}
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(empty);

  const load = useCallback(() => {
    listResellers().then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await updateReseller(editing.id, {
          email: form.email, referral_code: form.referral_code,
          commission_rate: Number(form.commission_rate), discount_max: Number(form.discount_max),
          status: form.status, password: form.password || undefined,
        });
        toast.success(`Reseller ${editing.username} updated`);
      } else {
        if (!form.username || !form.password) { toast.error('Username and password are required'); return; }
        await createReseller(form);
        toast.success('Reseller created');
      }
      setModal(false); setEditing(null); setForm(empty);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to save reseller');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ username: r.username, email: r.email || '', password: '',
              referral_code: r.referral_code || '', commission_rate: String(r.commission_rate || 10),
              discount_max: String(r.discount_max ?? 1), status: r.status || 'active' });
    setModal(true);
  };

  const openCreate = () => { setEditing(null); setForm(empty); setModal(true); };

  const remove = async (r) => {
    if (!window.confirm(`Delete reseller ${r.username}? Their shops stay but are unlinked.`)) return;
    try {
      await deleteReseller(r.id);
      toast.success('Reseller deleted');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Delete failed');
    }
  };

  const toggleCustomers = async (r) => {
    if (customers[r.id]) { setCustomers((c) => { const n = { ...c }; delete n[r.id]; return n; }); return; }
    setCustomers((c) => ({ ...c, [r.id]: { loading: true, data: [] } }));
    try {
      const data = await resellerCustomers(r.id);
      setCustomers((c) => ({ ...c, [r.id]: { loading: false, data: data.customers || [] } }));
    } catch {
      setCustomers((c) => ({ ...c, [r.id]: { loading: false, data: [] } }));
    }
  };

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => {});
  };

  const setPaid = async (r, value) => {
    try {
      await updateReseller(r.id, { commission_paid: value });
      toast.success(`${r.username} commission marked ${value === 'paid' ? 'PAID' : 'NOT YET'}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Update failed');
    }
  };

  const filteredRows = (rows || []).filter((r) => paidFilter === 'all' || (r.commission_paid || 'not_yet') === paidFilter);

  const totals = (rows || []).reduce(
    (acc, r) => ({
      resellers: acc.resellers + 1,
      shops: acc.shops + (r.shop_count || 0),
      customers: acc.customers + (r.customer_count || 0),
      commission: acc.commission + (r.commission || 0),
      sales: acc.sales + (r.sales || 0),
      paid: acc.paid + ((r.commission_paid || 'not_yet') === 'paid' ? 1 : 0),
    }),
    { resellers: 0, shops: 0, customers: 0, commission: 0, sales: 0, paid: 0 }
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><FiPercent /></span>
          Resellers & Commission
        </h1>
        <div className="flex items-center gap-2">
          <select value={paidFilter} onChange={(e) => setPaidFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium">
            <option value="all">All payment status</option>
            <option value="not_yet">Not yet paid</option>
            <option value="paid">Paid</option>
          </select>
          <button onClick={openCreate} className={btnPrimary + ' flex items-center gap-2'}><FiPlus /> Add Reseller</button>
        </div>
      </div>

      {rows && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-extrabold text-indigo-600">{totals.resellers}</p>
            <p className="text-xs text-gray-500 uppercase">Resellers</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-extrabold">{totals.shops}</p>
            <p className="text-xs text-gray-500 uppercase">Shops</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-extrabold">{totals.customers}</p>
            <p className="text-xs text-gray-500 uppercase">Customers</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-extrabold">${totals.sales.toFixed(2)}</p>
            <p className="text-xs text-gray-500 uppercase">Plan Sales</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">${totals.commission.toFixed(2)}</p>
            <p className="text-xs text-gray-500 uppercase">{totals.paid}/{totals.resellers} paid</p>
          </div>
        </div>
      )}

      {!rows ? (
        <Loading />
      ) : filteredRows.length === 0 ? (
        <Empty message="No resellers match this payment filter." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRows.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold"><FiUsers /></div>
                  <div>
                    <p className="font-bold">{r.username}</p>
                    <p className="text-xs text-gray-400">{r.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600" title="Edit"><FiEdit2 /></button>
                  <button onClick={() => remove(r)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="Delete"><FiTrash2 /></button>
                </div>
              </div>

              <button
                onClick={() => copy(`${STORE_URL}/create-shop?ref=${r.referral_code}`)}
                className="mt-4 w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono hover:bg-slate-100 transition"
              >
                <span className="text-indigo-700 font-bold">REF: {r.referral_code}</span>
                <FiCopy className="text-gray-400" />
              </button>
              <p className="text-[11px] text-gray-400 mt-1 text-center">{STORE_URL}/create-shop?ref={r.referral_code}</p>

              {/* Commission payment status */}
              <div className="mt-4 flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-gray-700">Commission ${r.commission.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">{r.commission_paid === 'paid' && r.commission_paid_at ? `Paid on ${new Date(r.commission_paid_at).toLocaleDateString()}` : 'Payment status'}</p>
                </div>
                <select
                  value={r.commission_paid || 'not_yet'}
                  onChange={(e) => setPaid(r, e.target.value)}
                  className={`text-xs font-bold rounded-lg px-2 py-1.5 border ${r.commission_paid === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                >
                  <option value="not_yet">Not yet</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-lg font-extrabold text-gray-900">{r.shop_count}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Shops</p>
                </div>
                <div className="bg-gray-50 rounded-lg py-2">
                  <p className="text-lg font-extrabold text-gray-900">{r.customer_count}</p>
                  <p className="text-[10px] text-gray-400 uppercase">Customers</p>
                </div>
                <div className="bg-emerald-50 rounded-lg py-2">
                  <p className="text-lg font-extrabold text-emerald-600">${r.commission.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 uppercase">{r.commission_rate}%</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
                <span className="bg-sky-50 text-sky-700 rounded-full px-2 py-0.5">Max disc ${Number(r.discount_max || 1).toFixed(2)}</span>
                <span className="bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">Promo ${Number(r.promo_discount || 0).toFixed(2)}</span>
                <span className="bg-gray-50 rounded-full px-2 py-0.5">Sales ${r.sales.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => navigate(`/resellers/${r.id}`)} className={btnPrimary + ' flex-1 flex items-center justify-center gap-1'}>
                  <FiEye /> View all shops & details
                </button>
                <button onClick={() => toggleCustomers(r)} className={btnGhost + ' flex-1 flex items-center justify-center gap-1'}>
                  <FiUsers /> Customers ({r.customer_count})
                </button>
              </div>

              {customers[r.id] && (
                <div className="mt-3 max-h-56 overflow-y-auto bg-slate-50 rounded-xl p-2">
                  {customers[r.id].loading ? (
                    <p className="text-xs text-gray-400 text-center py-3">Loading...</p>
                  ) : customers[r.id].data.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No customers yet.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <tbody className="divide-y">
                        {customers[r.id].data.map((c) => (
                          <tr key={c.id || c.phone || c.name}>
                            <td className="py-1.5 pr-2">
                              <p className="font-semibold">{c.name || '—'}</p>
                              <p className="text-[10px] text-gray-400">{c.phone || c.telegram || c.email || ''}</p>
                            </td>
                            <td className="text-right text-gray-400 py-1.5">@{c.shop_username}</td>
                            <td className="text-right py-1.5 pl-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.type === 'registered' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {c.type === 'registered' ? 'Account' : 'Guest'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}


      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setModal(false); setEditing(null); }}>
          <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg">{editing ? `Edit ${editing.username}` : 'Add Reseller'}</h2>
            {!editing && <input value={form.username} onChange={set('username')} placeholder="Username (login)" className={inputCls} required />}
            <input value={form.email} onChange={set('email')} placeholder="Email (optional)" className={inputCls} />
            <input value={form.password} onChange={set('password')} type="password" placeholder={editing ? 'New password (blank = keep)' : 'Password'} className={inputCls} />
            <input value={form.referral_code} onChange={set('referral_code')} placeholder="Referral code (auto if blank)" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Commission %</label>
                <input value={form.commission_rate} onChange={set('commission_rate')} type="number" step="0.1" min="0" max="100" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Max discount $</label>
                <input value={form.discount_max} onChange={set('discount_max')} type="number" step="0.1" min="0" className={inputCls} />
              </div>
            </div>
            {editing && (
              <select value={form.status} onChange={set('status')} className={inputCls}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setModal(false); setEditing(null); }} className={btnGhost + ' flex-1'}>Cancel</button>
              <button type="submit" disabled={busy} className={btnPrimary + ' flex-1 disabled:opacity-50'}>
                {busy ? 'Saving...' : editing ? 'Save changes' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

