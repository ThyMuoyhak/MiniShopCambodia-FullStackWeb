import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBox, FiDollarSign, FiPackage, FiShoppingBag, FiUsers,
} from 'react-icons/fi';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend,
} from 'chart.js';
import { getOverview, getSalesReport } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { StatCard, Loading } from '../components/ui';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const { user } = useAuth();
  const shopId = user.shop_id;
  const [overview, setOverview] = useState(null);
  const [sales, setSales] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');

  useEffect(() => {
    setLoading(true);
    Promise.all([getOverview(shopId), getSalesReport(shopId, period, 14)])
      .then(([ov, sl]) => { setOverview(ov); setSales(sl); })
      .finally(() => setLoading(false));
  }, [shopId, period]);

  const loadPeriod = (p) => setPeriod(p);

  if (loading) return <Loading />;

  const chartData = {
    labels: (sales?.data || []).map((d) => d.date),
    datasets: [
      {
        label: 'Revenue',
        data: (sales?.data || []).map((d) => d.revenue),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79,70,229,0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <a href={`http://localhost:3000/${user.username}`} target="_blank" rel="noreferrer"
           className="bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium">
          View my storefront ↗
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Today's Orders" value={overview.today_orders} icon={<FiShoppingBag />} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Today's Revenue" value={`${overview.today_revenue.toFixed(2)}`} icon={<FiDollarSign />} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Total Products" value={overview.total_products} icon={<FiPackage />} color="bg-amber-100 text-amber-600" />
        <StatCard label="Total Customers" value={overview.total_customers} icon={<FiUsers />} color="bg-rose-100 text-rose-600" />
        <StatCard label="Total Revenue" value={`${overview.total_revenue.toFixed(2)}`} icon={<FiBox />} color="bg-purple-100 text-purple-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Sales Chart</h2>
          <div className="flex gap-2">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                onClick={() => loadPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        {(sales?.data || []).length > 0 ? (
          <div className="h-64"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /></div>
        ) : (
          <p className="text-center text-gray-400 py-10">No sales data yet for this period.</p>
        )}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h2 className="font-bold">Recent Orders</h2>
          <Link to="/orders" className="text-sm text-indigo-600 hover:underline">View all</Link>
        </div>
        {overview.recent_orders.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {overview.recent_orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">#{o.order_number}</td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3 font-semibold">{o.total.toFixed(2)} {o.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[o.order_status] || STATUS_COLORS.pending}`}>
                      {o.order_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
