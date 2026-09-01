import React, { useEffect, useState } from 'react';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import { generateReceipt, listOrders, fullUrl } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Empty, Loading, btnGhost } from '../components/ui';

export default function Receipts() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOrders(user.shop_id).then(setOrders).finally(() => setLoading(false));
  }, [user.shop_id]);

  const makeReceipt = async (id) => {
    try {
      const res = await generateReceipt(id);
      window.open(fullUrl(res.receipt_url), '_blank');
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, receipt_url: res.receipt_url } : o)));
    } catch (err) {
      alert(err?.response?.data?.detail || 'Receipt generation failed');
    }
  };

  const print = (order) => {
    if (order.receipt_url) {
      const win = window.open(fullUrl(order.receipt_url), '_blank');
      if (win) win.onload = () => win.print();
    } else {
      makeReceipt(order.id);
    }
  };

  const paidOrders = orders.filter((o) => o.payment_status === 'paid');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Receipts</h1>
      <p className="text-sm text-gray-500 mb-4">PDF receipts for paid orders, with your shop logo, customer info and item list.</p>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? <Loading /> : paidOrders.length === 0 ? <Empty message="No paid orders yet. Receipts appear here once an order is paid." /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paidOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">#{o.order_number}</td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3 font-semibold">{o.total.toFixed(2)} {o.currency}</td>
                  <td className="px-4 py-3">
                    {o.receipt_url ? (
                      <a href={fullUrl(o.receipt_url)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-xs font-semibold">View PDF</a>
                    ) : (
                      <span className="text-gray-400 text-xs">Not generated</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => makeReceipt(o.id)} className={btnGhost}><FiDownload className="inline mr-1" /> PDF</button>
                      <button onClick={() => print(o)} className={btnGhost}><FiPrinter className="inline mr-1" /> Print</button>
                    </div>
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
