import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiCopy, FiDollarSign, FiPercent, FiShoppingBag, FiTag, FiUsers } from 'react-icons/fi';
import { getReseller } from '../api';
import { Loading } from '../components/ui';

const STORE_URL = process.env.REACT_APP_STORE_URL || 'http://localhost:3000';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

export default function ResellerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState(null);
  const [tab, setTab] = useState('overview'); // overview | shops | customers

  const load = useCallback(() => {
    getReseller(id).then(setR).catch(() => setR(null));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const copy = (text) => {
    navigator.clipboard?.writeText(text).then(() => toast.success('Copied')).catch(() => {});
  };

  if (!r) return <Loading />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/resellers')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><FiArrowLeft /></button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><FiPercent /></span>
            Reseller · {r.username}
          </h1>
          <p className="text-sm text-gray-500">{r.email || '—'} · Code <b>{r.referral_code}</b></p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold">{r.shop_count}</p>
          <p className="text-xs text-gray-500 uppercase">Shops</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold">{r.customer_count}</p>
          <p className="text-xs text-gray-500 uppercase">Customers</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold">${r.sales.toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase">Plan Sales</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-600">${r.commission.toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase">{r.commission_rate}% Commission</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-600">${Number(r.discount_max).toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase">Max discount</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold text-sky-600">${Number(r.promo_discount).toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase">Active promo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[['overview', 'Overview'], ['shops', `Shops (${r.shop_count})`], ['customers', `Customers (${r.customer_count})`]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === k ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-lg mb-4">Reseller profile</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Username</span><span className="font-semibold">{r.username}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-semibold">{r.email || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><FiPercent /> Commission rate</span><span className="font-semibold">{r.commission_rate}%</span></div>
              <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><FiTag /> Promo code</span><span className="font-mono font-bold text-emerald-600">{r.referral_code}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Max discount</span><span className="font-semibold">${Number(r.discount_max).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Active promo discount</span><span className="font-semibold text-sky-600">${Number(r.promo_discount).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Joined</span><span className="font-semibold">{fmtDate(r.created_at)}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-lg mb-4">Referral link</h2>
            <div className="flex items-center gap-2 bg-slate-50 border-2 border-dashed border-emerald-300 rounded-xl px-4 py-3">
              <span className="font-mono text-xs text-emerald-700 break-all flex-1">{r.signup_link}</span>
              <button onClick={() => copy(r.signup_link)} className="p-2 rounded-lg hover:bg-white text-gray-500 shrink-0"><FiCopy /></button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Customers who sign up through this link get <b>${Number(r.promo_discount).toFixed(2)} off</b> automatically;
              you earn <b>{r.commission_rate}%</b> commission on the final price.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xl font-extrabold text-gray-900">${r.sales.toFixed(2)}</p>
                <p className="text-[10px] text-gray-400 uppercase">Plan sales</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-xl font-extrabold text-emerald-600">${r.commission.toFixed(2)}</p>
                <p className="text-[10px] text-gray-400 uppercase">Commission earned</p>
              </div>
            </div>
          </div>
        </div>
      )}


      {tab === 'shops' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {r.shops.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No shops registered with this code yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Shop</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Customers</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.shops.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold"><FiShoppingBag /></span>
                        <div>
                          <p className="font-semibold">{s.shop_name || s.username}</p>
                          <p className="text-xs text-gray-400">@{s.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{s.plan || '—'}</td>
                    <td className="px-4 py-3 font-bold">${Number(s.plan_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">{s.product_count}</td>
                    <td className="px-4 py-3">{s.order_count}</td>
                    <td className="px-4 py-3">{s.customer_count}</td>
                    <td className="px-4 py-3 font-semibold">${s.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmtDate(s.expires_at)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/shops/${s.id}`} className="text-indigo-600 text-xs font-semibold hover:underline">Manage →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}


      {tab === 'customers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {r.customers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No customers yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Shop</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {r.customers.map((c) => (
                  <tr key={c.id || c.phone || c.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{c.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.phone || c.telegram || c.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">@{c.shop_username}</td>
                    <td className="px-4 py-3">{c.orders}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'registered' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
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
  );
}

