import React, { useCallback, useEffect, useState } from 'react';
import { FiBarChart2, FiDollarSign } from 'react-icons/fi';
import { resellerMe } from '../api';
import { Empty, Loading } from '../components/ui';

export default function Commissions() {
  const [me, setMe] = useState(null);

  const load = useCallback(() => {
    resellerMe().then(setMe).catch(() => setMe(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!me) return <Loading />;

  const rows = me.shops
    .filter((s) => s.status === 'active')
    .map((s) => ({
      shop: s,
      earned: (Number(s.plan_price || 0) * Number(me.commission_rate || 0)) / 100,
    }))
    .sort((a, b) => b.earned - a.earned);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><FiBarChart2 /></span>
          Commissions
        </h1>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total commission</p>
          <p className="text-3xl font-extrabold text-emerald-600">${me.commission.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold">{me.shop_count}</p>
          <p className="text-xs text-gray-500 uppercase">Registered shops</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold">${me.sales.toFixed(2)}</p>
          <p className="text-xs text-gray-500 uppercase">Active plan sales</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-2xl font-extrabold">{me.commission_rate}%</p>
          <p className="text-xs text-gray-500 uppercase">Commission rate</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Empty message="No active shops yet — commissions appear once a referred shop is active." />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Plan price</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.shop.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.shop.shop_name || r.shop.username}</p>
                    <p className="text-xs text-gray-400">@{r.shop.username}</p>
                  </td>
                  <td className="px-4 py-3"><FiDollarSign className="inline w-3.5 h-3.5 text-gray-400" /> {Number(r.shop.plan_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{me.commission_rate}%</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">${r.earned.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-emerald-50">
              <tr>
                <td className="px-4 py-3 font-bold">Total</td>
                <td />
                <td />
                <td className="px-4 py-3 font-extrabold text-emerald-700">${me.commission.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
