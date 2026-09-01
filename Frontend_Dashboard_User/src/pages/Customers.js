import React, { useEffect, useState } from 'react';
import { listCustomers } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Empty, Loading, Modal } from '../components/ui';

export default function Customers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = () => listCustomers(user.shop_id, search).then(setCustomers).finally(() => setLoading(false));
  useEffect(() => { load(); }, [user.shop_id, search]);

  const openCustomer = (c) => setSelected(c);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, telegram..."
          className="bg-white border rounded-lg px-3 py-2 text-sm w-72"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? <Loading /> : customers.length === 0 ? <Empty message="No customers found" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Telegram</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">First Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => openCustomer(c)}>
                  <td className="px-4 py-3 font-semibold">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.telegram || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.city || '—'}</td>
                  <td className="px-4 py-3">{c.order_count}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!selected} title="Customer Details" onClose={() => setSelected(null)} wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-semibold">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Phone</p><p>{selected.phone}</p></div>
              <div><p className="text-xs text-gray-500">Telegram</p><p>{selected.telegram || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p>{selected.email || '—'}</p></div>
              <div><p className="text-xs text-gray-500">Address</p><p>{selected.address || '—'}</p></div>
              <div><p className="text-xs text-gray-500">City / Country</p><p>{selected.city}, {selected.country}</p></div>
            </div>
            <div>
              <h3 className="font-bold text-sm mb-2">Order History ({selected.orders?.length || 0})</h3>
              <div className="space-y-2">
                {selected.orders && selected.orders.length > 0 ? selected.orders.map((o) => (
                  <div key={o.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm">
                    <span className="font-mono text-xs font-semibold">#{o.order_number}</span>
                    <span className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{o.payment_status}</span>
                    <span className="font-bold">{o.total.toFixed(2)} {o.currency}</span>
                  </div>
                )) : <p className="text-sm text-gray-400">No orders yet.</p>}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
