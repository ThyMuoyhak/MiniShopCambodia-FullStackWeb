import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, Filler, Legend,
  LinearScale, LineElement, PointElement, Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FiBox, FiDollarSign, FiPercent, FiShoppingBag, FiShoppingCart, FiUsers } from 'react-icons/fi';
import { getActivity, getPlatformCharts, getStats } from '../api';
import { StatCard, Loading } from '../components/ui';

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, Legend, LinearScale, LineElement, PointElement, Tooltip);

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getPlatformCharts(), getActivity({ limit: 10 })])
      .then(([s, c, a]) => { setStats(s); setCharts(c); setActivity(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !charts) return <Loading />;

  const shortDays = (charts.revenue_days || []).map((d) => d.slice(5));

  const revenue = {
    labels: shortDays,
    datasets: [{
      label: 'Revenue ($)',
      data: charts.revenue_series,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      fill: true,
      tension: 0.35,
    }],
  };

  const ordersStatus = {
    labels: (charts.orders_by_status || []).map((o) => o.status),
    datasets: [{ data: (charts.orders_by_status || []).map((o) => o.count), backgroundColor: PALETTE }],
  };

  const shopsPlan = {
    labels: (charts.shops_by_plan || []).map((p) => p.plan),
    datasets: [{ label: 'Shops', data: (charts.shops_by_plan || []).map((p) => p.count), backgroundColor: PALETTE }],
  };

  const signups = {
    labels: charts.signup_months,
    datasets: [{
      label: 'New shops', data: charts.signup_series,
      borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', fill: true, tension: 0.3,
    }],
  };

  const topShops = {
    labels: (charts.top_shops || []).map((s) => s.username),
    datasets: [{ label: 'Revenue ($)', data: (charts.top_shops || []).map((s) => s.revenue), backgroundColor: '#0ea5e9' }],
  };

  const resellerCommission = {
    labels: (charts.resellers || []).map((r) => r.username),
    datasets: [{
      label: 'Commission ($)',
      data: (charts.resellers || []).map((r) => r.commission),
      backgroundColor: (charts.resellers || []).map((r) => (r.commission_paid === 'paid' ? '#10b981' : '#f59e0b')),
    }],
  };

  const paidCount = (charts.resellers || []).filter((r) => r.commission_paid === 'paid').length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Platform Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Shops" value={stats.shops} icon={<FiBox />} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Resellers" value={stats.resellers} icon={<FiPercent />} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Customers" value={stats.customers} icon={<FiUsers />} color="bg-sky-100 text-sky-600" />
        <StatCard label="Total Products" value={stats.products} icon={<FiShoppingCart />} color="bg-amber-100 text-amber-600" />
        <StatCard label="Total Orders" value={stats.orders} icon={<FiShoppingBag />} color="bg-purple-100 text-purple-600" />
        <StatCard label="Total Revenue" value={`$${stats.revenue.toLocaleString()}`} icon={<FiDollarSign />} color="bg-rose-100 text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Revenue — last 30 days</h2>
          <div className="h-64"><Line data={revenue} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Orders by payment status</h2>
          <div className="h-64 flex items-center justify-center"><Doughnut data={ordersStatus} options={{ maintainAspectRatio: false }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">New shops by month</h2>
          <div className="h-56"><Line data={signups} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Shops by plan</h2>
          <div className="h-56"><Bar data={shopsPlan} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Top shops by revenue</h2>
          <div className="h-56"><Bar data={topShops} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold mb-4">Reseller commissions <span className="text-xs text-gray-400">({paidCount}/{charts.resellers.length} paid)</span></h2>
          {charts.resellers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No resellers yet.</p>
          ) : (
            <div className="h-56"><Bar data={resellerCommission} options={{ indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm mt-2 overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold">Recent Activity</h2>
          <a href="/activity" className="text-sm text-indigo-600 hover:underline">View all</a>
        </div>
        <div className="divide-y">
          {activity.length === 0 && <p className="p-5 text-gray-400 text-center">No activity yet</p>}
          {activity.map((log) => (
            <div key={log.id} className="px-5 py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold uppercase shrink-0">
                {log.username?.[0] || 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{log.description || log.action}</p>
                <p className="text-xs text-gray-400">{log.username} · {new Date(log.created_at).toLocaleString()}</p>
              </div>
              <span className="text-xs bg-slate-100 px-2 py-1 rounded-full capitalize">{log.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

