import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiUpload, FiFileText, FiImage } from 'react-icons/fi';
import { backupHistory, createSystemBackup, exportSystemBackup, getBackupDownload, importSystemBackup, fullUrl } from '../api';
import { Empty, Loading, btnPrimary, btnGhost } from '../components/ui';

export default function Backup() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ active: false, percent: 0, label: '' });
  const fileRef = useRef(null);

  const load = () => backupHistory().then(setHistory).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const result = await createSystemBackup('zip');
      toast.success(`Backup created: ${result.filename}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    setProgress({ active: true, percent: 0, label: 'Downloading Excel...' });
    try {
      const blob = await exportSystemBackup('xlsx', (e) => {
        if (e.total) setProgress((p) => ({ ...p, percent: Math.min(99, Math.round((e.loaded / e.total) * 100)) }));
      });
      downloadBlob(blob, `system_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.xlsx`);
      toast.success('Excel backup exported');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
      setProgress({ active: false, percent: 0, label: '' });
    }
  };

  // ZIP backup contains the full JSON data + ALL real image files (product photos,
  // logos, banners, category images, slideshow, QR codes, receipts) inside images/.
  const downloadZip = async () => {
    setExporting(true);
    setProgress({ active: true, percent: 0, label: 'Preparing ZIP (data + images)...' });
    try {
      const blob = await exportSystemBackup('zip', (e) => {
        if (e.total) setProgress((p) => ({ ...p, percent: Math.min(99, Math.round((e.loaded / e.total) * 100)) }));
      });
      downloadBlob(blob, `system_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.zip`);
      toast.success('ZIP backup (with images) downloaded');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
      setProgress({ active: false, percent: 0, label: '' });
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setProgress({ active: true, percent: 0, label: 'Uploading backup file...' });
    try {
      const res = await importSystemBackup(file, (ev) => {
        if (ev.total) setProgress((p) => ({ ...p, percent: Math.min(100, Math.round((ev.loaded / ev.total) * 100)) }));
      });
      setProgress({ active: true, percent: 100, label: 'Restoring data & images...' });
      const dup = res.duplicates_skipped > 0 ? ` · ${res.duplicates_skipped} duplicates skipped` : '';
      const img = res.images_restored > 0 ? ` · ${res.images_restored} images restored` : '';
      toast.success(`Backup imported! ${res.records_restored} records restored.${dup}${img}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    } finally {
      setProcessing(false);
      setProgress({ active: false, percent: 0, label: '' });
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
      <h1 className="text-2xl font-bold mb-6">Backup Management</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div>
          <h2 className="font-bold text-lg">Full System Backup</h2>
          <p className="text-sm text-gray-500 mt-1">
            <b className="text-indigo-600">ZIP backups include the real image files</b> — product photos,
            logos, banners, category images, slideshow, QR codes and receipts are bundled inside the
            <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded"> images/ </span>
            folder of the .zip. Import that same .zip on any other workspace and every image is restored
            automatically. (Admin only)
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={downloadZip} disabled={exporting} className={btnPrimary}>
            <FiImage className="inline mr-1" /> {exporting ? 'Exporting...' : 'Download ZIP (with images)'}
          </button>
          <button onClick={exportExcel} disabled={exporting} className={btnGhost}>
            <FiFileText className="inline mr-1" /> Export Excel
          </button>
          <button onClick={createBackup} disabled={creating} className={btnGhost}>
            <FiDownload className="inline mr-1" /> {creating ? 'Creating...' : 'Create ZIP Backup'}
          </button>
          <button onClick={() => fileRef.current?.click()} className={btnGhost}>
            <FiUpload className="inline mr-1" /> Import Backup (JSON / ZIP / XLSX)
          </button>
          <input ref={fileRef} type="file" accept=".json,.zip,.xlsx" className="hidden" onChange={handleImport} />
        </div>
        {progress.active && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1">
              <span className="flex items-center gap-2">
                {(processing || exporting) && (
                  <span className="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                )}
                {progress.label}
              </span>
              <span className="font-mono">{progress.percent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, progress.percent)}%` }}
              />
            </div>
            {processing && (
              <p className="text-xs text-gray-400 mt-2">
                Restoring the database and copying every image into the uploads folder — please wait…
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b"><h2 className="font-bold">Backup History</h2></div>
        {loading ? <Loading /> : history.length === 0 ? <Empty message="No backups yet" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{item.filename}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.kind === 'system' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {item.kind}
                    </span>
                  </td>
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
