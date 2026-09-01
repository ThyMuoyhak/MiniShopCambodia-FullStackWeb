import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend,
  LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FiDollarSign, FiPercent, FiShoppingBag, FiTag } from 'react-icons/fi';
import { resellerMe } from '../api';
import { Loading } from '../components/ui';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

const PALETTE = ['#10b981', '#0ea5e9', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard() {
  const [me, setMe] = useState(null);

  const load = useCallback(() => {
    resellerMe().then(setMe).catch(() => setMe(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!me) return <Loading />;

  const c = me.charts || {};
  const statusLabels = Object.keys(c.shops_by_status || {});
  const planLabels = Object.keys(c.shops_by_plan || {});
  const commLabels = (c.commission_by_shop || []).map((s) => s.username);

  const signups = {
    labels: c.signup_months || [],
    datasets: [{ label: 'New shops', data: c.signup_series || [], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3 }],
  };
  const statusChart = {
    labels: statusLabels,
    datasets: [{ data: statusLabels.map((k) => c.shops_by_status[k]), backgroundColor: PALETTE }],
  };
  const planChart = {
    labels: planLabels,
    datasets: [{ label: 'Shops', data: planLabels.map((k) => c.shops_by_plan[k]), backgroundColor: PALETTE }],
  };
  const commChart = {
    labels: commLabels,
    datasets: [{ label: 'Commission ($)', data: (c.commission_by_shop || []).map((s) => s.commission), backgroundColor: '#10b981' }],
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reseller Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3"><FiShoppingBag /></div>
          <p className="text-2xl font-extrabold">{me.shop_count}</p>
          <p className="text-xs text-gray-500 uppercase">Registered Shops</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3"><FiDollarSign /></div>
          <p className="text-2xl font-extrabold">${me.sales.toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase">Plan Sales</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3"><FiPercent /></div>
          <p className="text-2xl font-extrabold">${me.commission.toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase">
            Commission ({me.commission_rate}%) · <span className={me.commission_paid === 'paid' ? 'text-emerald-600' : 'text-amber-600'}>{me.commission_paid === 'paid' ? 'PAID' : 'NOT YET'}</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3"><FiTag /></div>
          <p className="text-2xl font-extrabold text-sky-600">{me.referral_code}</p>
          <p className="text-xs text-gray-500 uppercase">Promo Code (up to ${me.discount_max} off)</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">New shop signups by month</h2>
          <div className="h-56"><Line data={signups} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Shops by status</h2>
          <div className="h-56 flex items-center justify-center"><Doughnut data={statusChart} options={{ maintainAspectRatio: false }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Shops by plan</h2>
          <div className="h-56"><Bar data={planChart} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Commission by shop</h2>
          {commLabels.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No active shops yet.</p>
          ) : (
            <div className="h-56"><Bar data={commChart} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Your Shops</h2>
            <Link to="/shops" className="text-emerald-600 text-sm font-semibold hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {me.shops.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No shops yet — share your promo code!</p>}
            {me.shops.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                <div>
                  <p className="font-semibold text-sm">{s.shop_name || s.username}</p>
                  <p className="text-xs text-gray-400">@{s.username} · {s.plan || '—'} plan</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">${Number(s.plan_price || 0).toFixed(2)}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/promo" className="block bg-emerald-50 border border-emerald-100 rounded-xl p-4 hover:bg-emerald-100 transition">
              <p className="font-bold text-emerald-700">Get your promo link</p>
              <p className="text-xs text-emerald-600 mt-1">Share {me.referral_code} — customers get up to ${me.discount_max} off, you earn {me.commission_rate}% commission</p>
            </Link>
            <Link to="/commissions" className="block bg-indigo-50 border border-indigo-100 rounded-xl p-4 hover:bg-indigo-100 transition">
              <p className="font-bold text-indigo-700">View commissions</p>
              <p className="text-xs text-indigo-600 mt-1">Total ${me.commission.toFixed(2)} across {me.shop_count} shops</p>
            </Link>
            <Link to="/backup" className="block bg-sky-50 border border-sky-100 rounded-xl p-4 hover:bg-sky-100 transition">
              <p className="font-bold text-sky-700">Backup your data</p>
              <p className="text-xs text-sky-600 mt-1">Export your shops & commissions (ZIP / JSON / Excel)</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

