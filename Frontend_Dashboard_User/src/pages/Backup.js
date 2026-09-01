import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiUpload, FiFileText } from 'react-icons/fi';
import { backupHistory, createShopBackup, exportShopBackup, getBackupDownload, importShopBackup, fullUrl } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { Empty, Loading, btnPrimary, btnGhost } from '../components/ui';

export default function Backup() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef(null);

  const load = () => backupHistory(user.shop_id).then(setHistory).finally(() => setLoading(false));
  useEffect(() => { load(); }, [user.shop_id]);

  const createZipBackup = async () => {
    setCreating(true);
    try {
      const result = await createShopBackup(user.shop_id, 'zip');
      toast.success(`Full ZIP backup created: ${result.filename}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const blob = await exportShopBackup(user.shop_id, 'xlsx');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shop_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Shop exported to Excel');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importShopBackup(user.shop_id, file);
      const dup = res.duplicates_skipped > 0 ? ` · ${res.duplicates_skipped} duplicates skipped` : '';
      toast.success(`Backup imported! ${res.records_restored} records restored.${dup}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    }
    e.target.value = '';
  };

  const download = async (item) => {
    try {
      const res = await getBackupDownload(item.filename);
      window.open(fullUrl(res.url), '_blank');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Download failed');
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Backup & Import</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Shop Data Backup</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create a full <strong>ZIP</strong> backup of your products, categories, orders, customers and shop
            settings, export to Excel, or import a backup (<strong>.zip</strong>, .json or .xlsx) to restore.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={createZipBackup} disabled={creating} className={btnPrimary}>
            <FiDownload className="inline mr-1" /> {creating ? 'Creating...' : 'Backup ZIP (Full)'}
          </button>
          <button onClick={exportExcel} disabled={exporting} className={btnGhost}>
            <FiFileText className="inline mr-1" /> {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          <button onClick={() => fileRef.current?.click()} className={btnGhost}>
            <FiUpload className="inline mr-1" /> Import ZIP / JSON / Excel
          </button>
          <input ref={fileRef} type="file" accept=".zip,.json,.xlsx" className="hidden" onChange={handleImport} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-bold">Backup History</h2></div>
        {loading ? <Loading /> : history.length === 0 ? <Empty message="No backups yet" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{item.filename}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => download(item)} className="text-indigo-600 hover:underline text-xs font-semibold">Download</button>
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
