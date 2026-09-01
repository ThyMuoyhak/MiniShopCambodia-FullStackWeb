import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload } from 'react-icons/fi';
import { getCustomerReport, getProductReport, getSalesReport } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Loading, Empty, btnGhost } from '../components/ui';

export default function Reports() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [sales, setSales] = useState(null);
  const [products, setProducts] = useState(null);
  const [customers, setCustomers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sales');

  useEffect(() => {
    setLoading(true);
    Promise.all([getSalesReport(user.shop_id, period, 30), getProductReport(user.shop_id), getCustomerReport(user.shop_id)])
      .then(([s, p, c]) => { setSales(s); setProducts(p); setCustomers(c); })
      .finally(() => setLoading(false));
  }, [user.shop_id, period]);

  const exportCsv = (rows, name) => {
    if (rows.length === 0) { toast.error('Nothing to export'); return; }
    const header = Object.keys(rows[0]);
    const csv = [header, ...rows.map((r) => header.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loading />;

  const tabs = [
    { key: 'sales', label: 'Sales Report' },
    { key: 'products', label: 'Product Performance' },
    { key: 'customers', label: 'Customer Report' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        {tab === 'sales' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-white border rounded-lg p-1">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize ${period === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => exportCsv(sales?.data || [], 'sales_report')} className={btnGhost}><FiDownload className="inline mr-1" /> CSV</button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === t.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-bold">Sales — {period}</h2>
            <span className="text-sm text-gray-500">
              <strong className="text-lg text-indigo-600">{sales.totals.revenue.toFixed(2)}</strong> revenue · {sales.totals.orders} orders
            </span>
          </div>
          {sales.data.length === 0 ? <Empty message="No sales data in this period" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sales.data.map((row) => (
                  <tr key={row.date} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{row.date}</td>
                    <td className="px-4 py-3">{row.orders}</td>
                    <td className="px-4 py-3 font-semibold">{row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-bold">Product Performance</h2>
            <button onClick={() => exportCsv(products || [], 'product_report')} className={btnGhost}><FiDownload className="inline mr-1" /> CSV</button>
          </div>
          {products.length === 0 ? <Empty message="No product sales yet" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Units Sold</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.units}</td>
                    <td className="px-4 py-3 font-semibold">{row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'customers' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-bold">Customer Report</h2>
            <button onClick={() => exportCsv((customers || []).map((c) => ({ name: c.name, phone: c.phone, orders: c.order_count, total_spent: c.total_spent })), 'customer_report')} className={btnGhost}><FiDownload className="inline mr-1" /> CSV</button>
          </div>
          {customers.length === 0 ? <Empty message="No customers yet" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.phone}</td>
                    <td className="px-4 py-3">{c.order_count}</td>
                    <td className="px-4 py-3 font-semibold">{c.total_spent.toFixed(2)}</td>
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
