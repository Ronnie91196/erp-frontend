import React, { useEffect, useState } from 'react';
import {
  X, CheckCircle2, AlertTriangle, XCircle, Clock, FileText,
  Copy, Check, Layers, RotateCcw, RefreshCw, Hash, Database,
  ShieldCheck, ShieldAlert, ChevronDown, ChevronUp, User, Building
} from 'lucide-react';

export default function ImportDetailsModal({
  job,
  onClose,
  onOpenRetry,
  onOpenUndo,
}) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [showJsonAudit, setShowJsonAudit] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  const {
    id,
    jobId = id,
    status = 'COMPLETED',
    entityType = 'PURCHASE',
    fileName = 'Import Document',
    fileHashSHA256,
    totalBills = 0,
    totalRows = 0,
    totalRecords = totalRows,
    totalUniqueProducts = 0,
    savedBills = 0,
    successfulRecords = savedBills,
    failedBills = 0,
    failedRecords = failedBills,
    skippedBills = 0,
    duplicateBills = 0,
    createdAt,
    startedAt,
    completedAt,
    undoneAt,
    durationSeconds,
    userEmail = 'Admin / System',
    userName,
    errors = [],
    summary = {},
    payloadData,
    records = [],
  } = job;

  const duration = durationSeconds !== null && durationSeconds !== undefined
    ? `${durationSeconds}s`
    : startedAt && completedAt
    ? `${((new Date(completedAt) - new Date(startedAt)) / 1000).toFixed(1)}s`
    : null;

  const copyHash = () => {
    if (fileHashSHA256) {
      navigator.clipboard.writeText(fileHashSHA256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'COMPLETED':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, text: 'COMPLETED' };
      case 'PARTIAL':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle, text: 'PARTIAL IMPORT' };
      case 'FAILED':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle, text: 'FAILED' };
      case 'UNDONE':
        return { bg: 'bg-slate-100 text-slate-700 border-slate-300', icon: RotateCcw, text: 'UNDONE (ROLLED BACK)' };
      case 'ROLLING_BACK':
        return { bg: 'bg-orange-50 text-orange-700 border-orange-200', icon: RefreshCw, text: 'ROLLING BACK' };
      case 'RETRYING':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: RefreshCw, text: 'RETRYING' };
      case 'IMPORTING':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: Database, text: 'IMPORTING' };
      case 'VALIDATING':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Layers, text: 'VALIDATING' };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, text: st };
    }
  };

  const statusInfo = getStatusBadge(status);
  const StatusIcon = statusInfo.icon;

  // Extract bill-level results from summary or payloadData if available
  const billResults = summary.billResults || payloadData?.bills?.map((b) => ({
    invoiceNumber: b.invoiceNumber,
    rowsCount: b.items?.length || 0,
    totalAmount: b.totalAmount || 0,
    status: failedBills > 0 ? (b.isDuplicate ? 'SKIPPED' : 'SAVED') : 'SAVED',
    retryable: true,
  })) || [];

  const isUndoable = (status === 'COMPLETED' || status === 'PARTIAL') && savedBills > 0;
  const isRetryable = (status === 'PARTIAL' || status === 'FAILED') && failedBills > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-details-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-xs text-slate-700">
              <FileText className="w-5 h-5 text-[#087c83]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="import-details-title" className="text-base font-bold text-slate-900">
                  Import Job Details
                </h2>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.text}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                ID: {jobId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-slate-400 font-medium block text-[11px]">File Name</span>
              <span className="text-slate-800 font-bold block mt-0.5 truncate" title={fileName}>
                {fileName}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-slate-400 font-medium block text-[11px]">Target Entity</span>
              <span className="text-slate-800 font-bold block mt-0.5">
                {entityType}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-slate-400 font-medium block text-[11px]">Created At</span>
              <span className="text-slate-800 font-bold block mt-0.5 font-mono">
                {createdAt ? new Date(createdAt).toLocaleString('en-IN') : '—'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <span className="text-slate-400 font-medium block text-[11px]">Duration</span>
              <span className="text-slate-800 font-bold block mt-0.5 font-mono">
                {duration || '—'}
              </span>
            </div>
          </div>

          {/* User & SHA-256 Info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 font-medium">Committed By:</span>
              <span className="font-bold text-slate-800">{userEmail}</span>
            </div>

            {fileHashSHA256 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">SHA-256:</span>
                <code className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-700 max-w-[220px] truncate" title={fileHashSHA256}>
                  {fileHashSHA256}
                </code>
                <button
                  onClick={copyHash}
                  className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer"
                  title="Copy full SHA-256 fingerprint"
                >
                  {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Authoritative Metrics Breakdown */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Execution Metrics Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-slate-500 font-medium block">Total Bills</span>
                <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
                  {totalBills}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {savedBills} saved / {failedBills} failed
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-slate-500 font-medium block">Source Rows</span>
                <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
                  {totalRows || totalRecords}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {summary.totalItems || totalRows} line items
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-slate-500 font-medium block">Unique Products</span>
                <div className="text-lg font-extrabold text-[#087c83] font-mono mt-1">
                  {totalUniqueProducts || summary.uniqueProductsCount || '—'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Distinct master items
                </div>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                <span className="text-slate-500 font-medium block">Total Quantity</span>
                <div className="text-lg font-extrabold text-slate-900 font-mono mt-1">
                  {summary.totalQuantity || '—'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Units inwarded
                </div>
              </div>
            </div>
          </div>

          {/* Bill-Level Breakdown (if present) */}
          {billResults && billResults.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Inward Bills Breakdown ({billResults.length})
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="p-2.5">Invoice #</th>
                      <th className="p-2.5 text-center">Rows</th>
                      <th className="p-2.5 text-right">Bill Total</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Details / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {billResults.map((bill, bIdx) => (
                      <tr key={bIdx} className="hover:bg-slate-50/70">
                        <td className="p-2.5 font-bold text-slate-900 font-mono">
                          {bill.invoiceNumber || `Bill #${bIdx + 1}`}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {bill.rowsCount || bill.itemsCount || '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold">
                          ₹{Number(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              bill.status === 'SAVED' || bill.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : bill.status === 'SKIPPED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {bill.status || 'SAVED'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500 truncate max-w-[200px]">
                          {bill.error || bill.message || (bill.status === 'SAVED' ? 'Committed to database' : '—')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Structured Errors Section */}
          {errors && errors.length > 0 && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Encountered Issues ({errors.length})</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {errors.map((err, eIdx) => (
                  <div key={eIdx} className="p-2.5 bg-white rounded-lg border border-rose-100 text-xs text-rose-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-rose-900">
                        {err.invoiceNumber ? `Invoice ${err.invoiceNumber}` : err.bill ? `Bill ${err.bill}` : `Item #${eIdx + 1}`}
                      </span>
                      {err.code && (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-mono rounded">
                          {err.code}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-slate-700">{err.message || err.error}</p>
                    {err.suggestion && (
                      <p className="mt-1 text-indigo-700 font-medium text-[11px]">
                        💡 Suggestion: {err.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Developer Diagnostics */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowJsonAudit(!showJsonAudit)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              <span>Developer Audit & Diagnostics (JSON)</span>
              {showJsonAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showJsonAudit && (
              <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60">
                <pre>{JSON.stringify({ job, summary, errors }, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isRetryable && onOpenRetry && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRetry(job);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Failed Bills ({failedBills})
              </button>
            )}

            {isUndoable && onOpenUndo && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUndo(job);
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Undo Import
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
