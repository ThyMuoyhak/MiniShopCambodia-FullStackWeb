import React, { useEffect, useState } from 'react';
import { getActivity } from '../api';
import { Empty, Loading, inputCls } from '../components/ui';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [shopId, setShopId] = useState('');
  const [applied, setApplied] = useState({});

  const load = (filters = {}) => {
    setLoading(true);
    getActivity(filters)
      .then(setLogs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const apply = (e) => {
    e.preventDefault();
    const filters = {};
    if (username.trim()) filters.username = username.trim();
    if (shopId.trim()) filters.shop_id = Number(shopId);
    setApplied(filters);
    load(filters);
  };

  const exportCsv = () => {
    const header = ['ID', 'Username', 'Action', 'Description', 'Created At'];
    const rows = logs.map((l) => [l.id, l.username, l.action, `"${(l.description || '').replace(/"/g, '""')}"`, l.created_at]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <button onClick={exportCsv} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Export CSV
        </button>
      </div>

      <form onSubmit={apply} className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={`${inputCls} w-48`} placeholder="Filter by user" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Shop ID</label>
          <input value={shopId} onChange={(e) => setShopId(e.target.value)} className={`${inputCls} w-28`} placeholder="Shop id" />
        </div>
        <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">Apply Filters</button>
        {(applied.username || applied.shop_id) && (
          <button type="button" onClick={() => { setUsername(''); setShopId(''); setApplied({}); load(); }} className="text-indigo-600 text-sm hover:underline">
            Clear
          </button>
        )}
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? <Loading /> : logs.length === 0 ? <Empty message="No activity logs found" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold">{log.username || 'system'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 px-2 py-1 rounded-full text-xs capitalize">{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-md truncate">{log.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
