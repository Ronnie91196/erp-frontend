import React, { useState, useEffect } from 'react';
import {
  X, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2,
  AlertCircle, Receipt, ArrowRight
} from 'lucide-react';
import api, { unwrap, apiError } from '../../../lib/api';

export default function RetryModal({
  job,
  onClose,
  onStartRetry,
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRetrying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isRetrying]);

  if (!job) return null;

  const {
    id,
    jobId = id,
    fileName = 'Import Document',
    failedBills = 0,
    savedBills = 0,
    totalBills = 0,
    errors = [],
  } = job;

  const retryableCount = failedBills > 0 ? failedBills : errors.length || 1;

  const handleExecuteRetry = async () => {
    try {
      setIsRetrying(true);
      setErrorMessage(null);

      const response = await api.post(`/import/jobs/${jobId}/retry`, {});
      const resultData = unwrap(response);

      if (onStartRetry) {
        onStartRetry(jobId, resultData);
      }
      onClose();
    } catch (err) {
      console.error('Retry initiation failed:', err);
      setErrorMessage(apiError(err) || 'Failed to retry import job.');
      setIsRetrying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="retry-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 id="retry-modal-title" className="text-base font-bold text-amber-950">
                Retry Failed Bills?
              </h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Targeted, idempotent bill-level retry
              </p>
            </div>
          </div>

          {!isRetrying && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-400 font-medium block text-[11px]">Import Job</span>
            <span className="text-slate-800 font-bold block mt-0.5 font-mono">
              {jobId} ({fileName})
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-slate-700 font-medium leading-relaxed">
              <strong className="text-amber-800">{retryableCount} failed bill(s)</strong> will be re-attempted for atomic insertion into the database.
            </p>

            {/* Idempotency Protection Box */}
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Idempotent Protection</span>
                <span className="text-[11.5px] text-emerald-800">
                  The {savedBills} already successful bill(s) will <strong className="underline">NOT</strong> be re-imported, preventing any duplicate purchase invoices or ledger entries.
                </span>
              </div>
            </div>
          </div>

          {/* Error List Preview */}
          {errors && errors.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-1.5">
              <span className="text-slate-500 font-bold block text-[11px]">
                Failed Items to Re-attempt:
              </span>
              <ul className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {errors.map((err, eIdx) => (
                  <li key={eIdx} className="text-slate-700 bg-white p-2 rounded border border-slate-200 flex items-center justify-between text-[11.5px]">
                    <span className="font-bold font-mono">
                      {err.invoiceNumber || err.bill || `Bill #${eIdx + 1}`}
                    </span>
                    <span className="text-rose-600 truncate max-w-[200px]" title={err.message}>
                      {err.message || 'Validation error'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Error Alert if retry failed to trigger */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isRetrying}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleExecuteRetry}
            disabled={isRetrying}
            className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Initiating Retry...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Start Retry ({retryableCount} Bills)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
