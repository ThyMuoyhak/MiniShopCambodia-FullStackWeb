import React, { useCallback, useEffect, useState } from 'react';
import { FiShoppingBag } from 'react-icons/fi';
import { resellerMe } from '../api';
import { Empty, Loading } from '../components/ui';

export default function Shops() {
  const [me, setMe] = useState(null);

  const load = useCallback(() => {
    resellerMe().then(setMe).catch(() => setMe(null));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!me) return <Loading />;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Registered Shops</h1>
      {me.shops.length === 0 ? (
        <Empty message="No shops registered with your code yet." />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {me.shops.map((s) => (
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
                  <td className="px-4 py-3 text-emerald-600">${Number(s.plan_discount || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
