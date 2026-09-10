import React, { useState, useEffect } from 'react';
import { History, RefreshCw, CheckCircle2, AlertTriangle, XCircle, FileText, Calendar } from 'lucide-react';
import api, { unwrap } from '../../../lib/api';

export default function ImportHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await unwrap(await api.get('/import/history'));
      setHistory(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch import history:', err);
      setError(err?.response?.data?.message || err?.message || 'Could not load import history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Import Audit Trail & History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all data import jobs processed in this pharmacy store.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading && history.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading audit logs...
        </div>
      ) : history.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          No previous imports found in this store.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Entity</th>
                <th className="p-3">File Name</th>
                <th className="p-3">Committed By</th>
                <th className="p-3 text-center">Bills / Records</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Job ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {history.map((log) => {
                const summary = log.summary || {};
                const committed = summary.committedCount || 0;
                const failed = summary.failedCount || 0;
                const skipped = summary.skippedCount || 0;
                const total = summary.totalBills || summary.totalRecords || committed + failed + skipped;

                const isFullSuccess = failed === 0 && committed > 0;
                const isPartial = failed > 0 && committed > 0;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.committedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[11px]">
                        {log.entityType}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800 truncate max-w-[180px]">
                      {log.fileName}
                    </td>
                    <td className="p-3 text-slate-500">
                      {log.userEmail}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono">
                        <span className="text-emerald-700 font-bold">{committed} saved</span>
                        {failed > 0 && <span className="text-rose-600 font-bold">/ {failed} failed</span>}
                        {skipped > 0 && <span className="text-amber-600 font-bold">/ {skipped} dup</span>}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isFullSuccess
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isFullSuccess ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : isPartial ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {isFullSuccess ? 'SUCCESS' : isPartial ? 'PARTIAL' : 'FAILED'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                      {log.jobId}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
