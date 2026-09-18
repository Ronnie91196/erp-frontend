import React, { useState, useEffect, useCallback } from 'react';
import {
  History, RefreshCw, CheckCircle2, AlertTriangle, XCircle, FileText,
  Calendar, RotateCcw, Eye, Search, Filter, ChevronLeft, ChevronRight,
  Database, Clock, DownloadCloud, Tag, Layers
} from 'lucide-react';
import api, { unwrap, apiError } from '../../../lib/api';
import ImportDetailsModal from './ImportDetailsModal';
import UndoModal from './UndoModal';
import RetryModal from './RetryModal';

const STATUS_FILTERS = [
  { id: '', label: 'All Statuses' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'PARTIAL', label: 'Partial' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'UNDONE', label: 'Undone' },
  { id: 'IMPORTING', label: 'Importing' },
];

const ENTITY_FILTERS = [
  { id: '', label: 'All Entities' },
  { id: 'PURCHASE', label: 'Purchases' },
  { id: 'CUSTOMER', label: 'Customers' },
  { id: 'SUPPLIER', label: 'Suppliers' },
  { id: 'PRODUCT', label: 'Products' },
  { id: 'DOCTOR', label: 'Doctors' },
];

export default function ImportHistory({ onTrackJob }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Active Modals
  const [selectedJobForDetails, setSelectedJobForDetails] = useState(null);
  const [selectedJobForUndo, setSelectedJobForUndo] = useState(null);
  const [selectedJobForRetry, setSelectedJobForRetry] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 15,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(entityFilter ? { entityType: entityFilter } : {}),
      };

      const res = await api.get('/import/history', { params });
      const unwrapped = unwrap(res);

      if (Array.isArray(unwrapped)) {
        setHistory(unwrapped);
        setTotalCount(unwrapped.length);
        setTotalPages(1);
      } else if (unwrapped && Array.isArray(unwrapped.data || res.data?.data)) {
        const jobsList = unwrapped.data || res.data?.data || [];
        setHistory(jobsList);
        const pag = res.data?.pagination || unwrapped.pagination || {};
        setTotalCount(pag.total ?? jobsList.length);
        setTotalPages(pag.totalPages ?? 1);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error('Failed to fetch import history:', err);
      setError(apiError(err) || 'Could not load import history');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, entityFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleExportErrorsCsv = (job) => {
    const errors = job.errors || [];
    if (errors.length === 0) return;

    const headers = ['Invoice / Bill', 'Error Code', 'Message', 'Suggestion'];
    const rows = errors.map((e) => [
      e.invoiceNumber || e.bill || 'General',
      e.code || 'VALIDATION_ERROR',
      `"${(e.message || e.error || '').replace(/"/g, '""')}"`,
      `"${(e.suggestion || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `import_errors_${job.id || job.jobId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'COMPLETED':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, text: 'COMPLETED' };
      case 'PARTIAL':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle, text: 'PARTIAL' };
      case 'FAILED':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle, text: 'FAILED' };
      case 'UNDONE':
        return { bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: RotateCcw, text: 'UNDONE' };
      case 'ROLLING_BACK':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: RefreshCw, text: 'ROLLING BACK' };
      case 'RETRYING':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: RefreshCw, text: 'RETRYING' };
      case 'IMPORTING':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: Database, text: 'IMPORTING' };
      case 'VALIDATING':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Layers, text: 'VALIDATING' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, text: st || 'CREATED' };
    }
  };

  // Local search filter
  const filteredHistory = history.filter((job) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fName = (job.fileName || '').toLowerCase();
    const jId = (job.id || job.jobId || '').toLowerCase();
    const uEmail = (job.userEmail || '').toLowerCase();
    return fName.includes(term) || jId.includes(term) || uEmail.includes(term);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-slate-800 animate-fadeIn">
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#087c83]" />
              Import Audit Trail &amp; Control Center
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authoritative PostgreSQL records of all data movements, bill commits, and rollbacks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search file, job ID, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#087c83] text-slate-800"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#087c83] text-slate-700 cursor-pointer"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#087c83] text-slate-700 cursor-pointer"
            >
              {ENTITY_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      {loading && history.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500">
          <div className="w-7 h-7 border-2 border-[#087c83] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading authoritative import history...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          No import jobs match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-[11px] tracking-wide">
              <tr>
                <th className="p-3">Date &amp; Time</th>
                <th className="p-3">File / Fingerprint</th>
                <th className="p-3">Entity</th>
                <th className="p-3 text-center">Bills</th>
                <th className="p-3 text-center">Rows</th>
                <th className="p-3 text-center">Saved</th>
                <th className="p-3 text-center">Failed</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Duration</th>
                <th className="p-3">User</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {filteredHistory.map((job) => {
                const jobId = job.id || job.jobId;
                const status = job.status || 'COMPLETED';
                const statusInfo = getStatusBadge(status);
                const StatusIcon = statusInfo.icon;

                const bills = job.totalBills || job.summary?.billsCount || (job.entityType === 'PURCHASE' ? 5 : '—');
                const rows = job.totalRows || job.totalRecords || job.summary?.totalItems || 0;
                const saved = job.savedBills !== undefined ? job.savedBills : job.summary?.committedCount || 0;
                const failed = job.failedBills !== undefined ? job.failedBills : job.summary?.failedCount || 0;
                const skipped = job.skippedBills !== undefined ? job.skippedBills : job.summary?.skippedCount || 0;

                const duration = job.durationSeconds !== null && job.durationSeconds !== undefined
                  ? `${job.durationSeconds}s`
                  : job.startedAt && job.completedAt
                  ? `${((new Date(job.completedAt) - new Date(job.startedAt)) / 1000).toFixed(1)}s`
                  : '—';

                const isUndoable = (status === 'COMPLETED' || status === 'PARTIAL') && saved > 0;
                const isRetryable = (status === 'PARTIAL' || status === 'FAILED') && failed > 0;
                const hasErrors = (job.errors && job.errors.length > 0) || failed > 0;

                return (
                  <tr key={jobId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date/Time */}
                    <td className="p-3 text-slate-600 font-mono whitespace-nowrap">
                      {new Date(job.createdAt || job.committedAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* File & SHA-256 */}
                    <td className="p-3 font-semibold text-slate-900 max-w-[170px]">
                      <div className="truncate" title={job.fileName}>
                        {job.fileName || 'Document'}
                      </div>
                      {job.fileHashSHA256 && (
                        <span className="text-[10px] text-slate-400 font-mono block truncate" title={job.fileHashSHA256}>
                          {job.fileHashSHA256.slice(0, 12)}...
                        </span>
                      )}
                    </td>

                    {/* Entity */}
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10.5px]">
                        {job.entityType || 'PURCHASE'}
                      </span>
                    </td>

                    {/* Bills */}
                    <td className="p-3 text-center font-mono font-semibold">
                      {bills}
                    </td>

                    {/* Rows */}
                    <td className="p-3 text-center font-mono text-slate-600">
                      {rows}
                    </td>

                    {/* Saved */}
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">
                      {saved}
                    </td>

                    {/* Failed */}
                    <td className="p-3 text-center font-mono font-bold">
                      {failed > 0 ? (
                        <span className="text-rose-600">{failed}</span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.bg}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.text}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                      {duration}
                    </td>

                    {/* User */}
                    <td className="p-3 text-slate-500 truncate max-w-[120px]" title={job.userEmail}>
                      {job.userEmail || 'Admin'}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedJobForDetails(job)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          title="View detailed job telemetry and bill results"
                        >
                          Details
                        </button>

                        {isRetryable && (
                          <button
                            onClick={() => setSelectedJobForRetry(job)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                            title="Retry failed bills in this job"
                          >
                            Retry
                          </button>
                        )}

                        {isUndoable && (
                          <button
                            onClick={() => setSelectedJobForUndo(job)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                            title="Safely reverse records created by this job"
                          >
                            Undo
                          </button>
                        )}

                        {hasErrors && (
                          <button
                            onClick={() => handleExportErrorsCsv(job)}
                            className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors cursor-pointer"
                            title="Download error CSV report"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total jobs)
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals Integration */}
      {selectedJobForDetails && (
        <ImportDetailsModal
          job={selectedJobForDetails}
          onClose={() => setSelectedJobForDetails(null)}
          onOpenRetry={(job) => setSelectedJobForRetry(job)}
          onOpenUndo={(job) => setSelectedJobForUndo(job)}
        />
      )}

      {selectedJobForUndo && (
        <UndoModal
          job={selectedJobForUndo}
          onClose={() => setSelectedJobForUndo(null)}
          onSuccess={() => {
            fetchHistory();
          }}
        />
      )}

      {selectedJobForRetry && (
        <RetryModal
          job={selectedJobForRetry}
          onClose={() => setSelectedJobForRetry(null)}
          onStartRetry={(jobId) => {
            if (onTrackJob) {
              onTrackJob(jobId);
            } else {
              fetchHistory();
            }
          }}
        />
      )}
    </div>
  );
}
