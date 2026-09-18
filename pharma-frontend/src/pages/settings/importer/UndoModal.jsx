import React, { useState, useEffect } from 'react';
import {
  X, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2,
  RefreshCw, AlertCircle, Package, Receipt, Database
} from 'lucide-react';
import api, { unwrap, apiError } from '../../../lib/api';

export default function UndoModal({
  job,
  onClose,
  onSuccess,
}) {
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [undoResult, setUndoResult] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isRollingBack) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isRollingBack]);

  if (!job) return null;

  const {
    id,
    jobId = id,
    fileName = 'Import Document',
    savedBills = 0,
    successfulRecords = savedBills,
    totalRows = 0,
    totalRecords = totalRows,
    summary = {},
  } = job;

  const estimatedPurchases = savedBills || summary.committedBills || summary.committedCount || 1;
  const estimatedRows = totalRows || totalRecords || summary.totalItems || 'All';

  const handleExecuteUndo = async () => {
    try {
      setIsRollingBack(true);
      setErrorMessage(null);

      const response = await api.post(`/import/jobs/${jobId}/undo`);
      const resData = unwrap(response);
      setUndoResult(resData);

      if (onSuccess) {
        onSuccess(resData);
      }
    } catch (err) {
      console.error('Undo execution failed:', err);
      setErrorMessage(apiError(err) || 'Failed to rollback import job. The database state remains safe.');
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="undo-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 id="undo-modal-title" className="text-base font-bold text-rose-950">
                Undo Import Job?
              </h2>
              <p className="text-xs text-rose-700 mt-0.5">
                Safe, ownership-aware rollback
              </p>
            </div>
          </div>

          {!isRollingBack && (
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
          {undoResult ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-emerald-900">
                Import Successfully Undone!
              </h3>
              <p className="text-xs text-emerald-700">
                All inward purchases, batches, stock movements, and ledger entries created exclusively by this job have been safely reversed.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Return to Import Control Center
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-400 font-medium block text-[11px]">Selected Job</span>
                <span className="text-slate-800 font-bold block mt-0.5 font-mono">
                  {jobId} ({fileName})
                </span>
              </div>

              <div>
                <p className="text-slate-700 font-medium leading-relaxed">
                  Executing Undo will safely reverse the following database records created during this import:
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Purchases</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                      {estimatedPurchases} Inward Bills
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Stock Movements</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                      Reversed
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier Ledgers</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                      Reversed
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Batches & Items</span>
                    <span className="text-sm font-extrabold text-slate-900 font-mono mt-0.5 block">
                      Owned Only
                    </span>
                  </div>
                </div>
              </div>

              {/* Preservation Notice */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-indigo-900">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Integrity Guarantee</span>
                  <span className="text-[11.5px] text-indigo-800">
                    Existing and reused records (such as pre-existing suppliers or products shared with other transactions) will be strictly preserved.
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Rollback Prevented:</span>
                    <span className="text-[11.5px]">{errorMessage}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!undoResult && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isRollingBack}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleExecuteUndo}
              disabled={isRollingBack}
              className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              {isRollingBack ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Rolling Back Records...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Confirm & Execute Undo
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
