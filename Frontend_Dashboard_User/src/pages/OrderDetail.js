import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiDownload, FiPrinter } from 'react-icons/fi';
import { generateReceipt, getOrder, updateOrderStatus, fullUrl } from '../api';
import { Loading, btnPrimary, btnGhost } from '../components/ui';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => getOrder(id).then(setOrder).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const setOrderStatus = async (val) => {
    try {
      await updateOrderStatus(id, { order_status: val });
      toast.success(`Order status: ${val}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update');
    }
  };

  const setPaymentStatus = async (val) => {
    try {
      await updateOrderStatus(id, { payment_status: val });
      toast.success(`Payment status: ${val}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update');
    }
  };

  const makeReceipt = async () => {
    try {
      const res = await generateReceipt(id);
      toast.success('Receipt generated!');
      window.open(fullUrl(res.receipt_url), '_blank');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Receipt generation failed');
    }
  };

  const printReceipt = () => {
    if (order?.receipt_url) {
      const win = window.open(fullUrl(order.receipt_url), '_blank');
      if (win) win.onload = () => win.print();
    } else {
      toast.error('Generate a receipt first');
    }
  };

  if (loading) return <Loading />;
  if (!order) return <div className="text-gray-400 py-16 text-center">Order not found</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.order_number}</h1>
          <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={makeReceipt} className={btnPrimary}><FiDownload className="inline mr-1" /> Generate PDF Receipt</button>
          {order.receipt_url && (
            <button onClick={printReceipt} className={btnGhost}><FiPrinter className="inline mr-1" /> Print</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">Customer</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Name</dt><dd className="font-medium">{order.customer_name}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd>{order.customer_phone}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Telegram</dt><dd>{order.customer_telegram || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Email</dt><dd>{order.customer_email || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Address</dt><dd className="text-right max-w-[60%]">{order.customer_address}, {order.customer_city}, {order.customer_country}</dd></div>
            {order.customer_note && <div className="flex justify-between"><dt className="text-gray-500">Note</dt><dd className="text-right max-w-[60%]">{order.customer_note}</dd></div>}
          </dl>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold mb-4">Status</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Order Status</label>
              <select value={order.order_status} onChange={(e) => setOrderStatus(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm capitalize">
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Payment Status</label>
              <select value={order.payment_status} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm capitalize">
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="text-sm space-y-1 pt-2 border-t">
              <p className="flex justify-between"><span className="text-gray-500">Transaction</span><span className="font-mono text-xs">{order.transaction_id || '—'}</span></p>
              {order.receipt_url && (
                <p className="flex justify-between items-center">
                  <span className="text-gray-500">Receipt</span>
                  <a href={fullUrl(order.receipt_url)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">View PDF</a>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-bold">Items</h2></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Variations</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium">{item.product_name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {item.variations && Object.keys(item.variations).length > 0
                    ? Object.entries(item.variations).map(([k, v]) => `${k}: ${v}`).join(' · ')
                    : '—'}
                </td>
                <td className="px-4 py-3">{item.price.toFixed(2)}</td>
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-semibold">{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-5 border-t space-y-2 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{order.items_total.toFixed(2)}</span></div>
          {order.shipping_fee > 0 && <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{order.shipping_fee.toFixed(2)}</span></div>}
          {order.discount > 0 && <div className="flex justify-between text-gray-500"><span>Discount</span><span>-{order.discount.toFixed(2)}</span></div>}
          <div className="flex justify-between font-bold text-lg pt-2">
            <span>Total</span><span>{order.total.toFixed(2)} {order.currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
