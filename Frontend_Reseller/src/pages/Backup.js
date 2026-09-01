import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText, FiUpload } from 'react-icons/fi';
import { resellerExport, resellerImport } from '../api';
import { btnGhost, btnPrimary } from '../components/ui';

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Backup() {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [busyImport, setBusyImport] = useState(false);

  const doExport = async (format) => {
    setBusy(true);
    try {
      const blob = await resellerExport(format);
      const ext = format === 'xlsx' ? 'xlsx' : format === 'json' ? 'json' : 'zip';
      downloadBlob(blob, `reseller_backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.${ext}`);
      toast.success(`Exported ${ext.toUpperCase()} backup`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyImport(true);
    try {
      const r = await resellerImport(file);
      toast.success(`Imported! ${r.records_restored} records restored, ${r.duplicates_skipped} skipped`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Import failed');
    } finally {
      setBusyImport(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Backup & Import</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><FiDownload /></span>
            <h2 className="font-bold text-lg">Export your data</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Download all your referred shops, plans, prices and commissions — as a ZIP (full data), JSON or Excel report.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => doExport('zip')} disabled={busy} className={btnPrimary + ' disabled:opacity-50'}>
              {busy ? 'Exporting...' : '⬇ ZIP (full backup)'}
            </button>
            <button onClick={() => doExport('json')} disabled={busy} className={btnGhost + ' disabled:opacity-50'}>
              JSON
            </button>
            <button onClick={() => doExport('xlsx')} disabled={busy} className={btnGhost + ' disabled:opacity-50'}>
              <FiFileText className="inline mr-1" /> Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><FiUpload /></span>
            <h2 className="font-bold text-lg">Import your backup</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Restore a reseller <strong>.zip</strong> or <strong>.json</strong> backup into your shops (only shops registered with your code).
          </p>
          <button onClick={() => fileRef.current?.click()} disabled={busyImport} className={btnPrimary + ' disabled:opacity-50'}>
            <FiUpload className="inline mr-1" /> {busyImport ? 'Importing...' : 'Import ZIP / JSON'}
          </button>
          <input ref={fileRef} type="file" accept=".zip,.json" className="hidden" onChange={handleImport} />
        </div>
      </div>
    </div>
  );
}
