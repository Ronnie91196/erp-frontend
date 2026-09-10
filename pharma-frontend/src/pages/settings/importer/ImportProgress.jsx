import React from 'react';
import {
  Database, CheckCircle2, AlertTriangle, XCircle, Clock,
  Layers, Receipt, Box, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';

export default function ImportProgress({
  job,
  onReset,
}) {
  if (!job) return null;

  const {
    jobId,
    status = 'PROCESSING',
    percent = 0,
    totalRecords = 0,
    processedRecords = 0,
    successfulRecords = 0,
    failedRecords = 0,
    totalBills = 0,
    completedBills = 0,
    currentBill = '',
    currentEntity = 'PURCHASE',
    createdPurchases = 0,
    createdItems = 0,
    createdBatches = 0,
    createdStockMovements = 0,
    createdLedgerEntries = 0,
    errors = [],
    results = [],
  } = job;

  const isCompleted = status === 'COMPLETED' || status === 'COMPLETED_WITH_ERRORS';
  const isFailed = status === 'FAILED';
  const isRunning = !isCompleted && !isFailed;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 mb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-600'
                : isFailed
                ? 'bg-rose-50 text-rose-600'
                : 'bg-[#e9f7f3] text-[#087c83] animate-pulse'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isFailed ? (
              <XCircle className="w-6 h-6" />
            ) : (
              <Database className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Database Save Pipeline
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : isFailed
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-[#d8f0ea] text-[#087c83]'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {isCompleted
                ? 'Import & Verification Complete!'
                : isFailed
                ? 'Import Failed'
                : `Saving ${currentEntity} Records to Database...`}
            </h3>
          </div>
        </div>

        {isCompleted && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            Start New Import
          </button>
        )}
      </div>

      {/* Progress Bar with Exact Percentage */}
      <div className="my-5">
        <div className="flex justify-between items-center text-xs font-semibold mb-2">
          <span className="text-slate-700">
            {isRunning && (
                <span className="inline-flex items-center gap-1.5 text-[#087c83]">
                <span className="w-2 h-2 rounded-full bg-[#087c83] animate-ping"></span>
                Processing: <span className="font-mono font-bold">{currentBill || 'Records'}</span>
              </span>
            )}
            {isCompleted && <span className="text-emerald-700 font-bold">Successfully Verified in Database</span>}
            {isFailed && <span className="text-rose-700 font-bold">Transaction Aborted</span>}
          </span>
          <span className="font-mono text-sm font-extrabold text-slate-800">{percent}%</span>
        </div>

        <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isCompleted
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : isFailed
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-[#087c83] to-[#16a477]'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, percent))}%` }}
          ></div>
        </div>
      </div>

      {/* Authoritative Live Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-5">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <span className="text-slate-400 font-medium block">Records Processed</span>
          <div className="text-base font-extrabold text-slate-800 mt-1 font-mono">
            {processedRecords} / {totalRecords}
          </div>
        </div>

        {totalBills > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-slate-400 font-medium block">Bills Completed</span>
            <div className="text-base font-extrabold text-slate-800 mt-1 font-mono">
              {completedBills} / {totalBills}
            </div>
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <span className="text-emerald-600 font-medium block">Successful Saved</span>
          <div className="text-base font-extrabold text-emerald-800 mt-1 font-mono">
            {successfulRecords}
          </div>
        </div>

        <div
          className={`rounded-xl p-3 border ${
            failedRecords > 0
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
        >
          <span className="font-medium block">Failed / Skipped</span>
          <div className="text-base font-extrabold mt-1 font-mono">
            {failedRecords}
          </div>
        </div>
      </div>

      {/* Persistence Audit Breakdown for Purchases */}
      {currentEntity === 'PURCHASE' && (
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 text-xs">
          <span className="font-bold text-slate-700 block mb-2.5">
            Database Persistence Effects (Live Audit)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Purchases Created</span>
              <span className="text-sm font-extrabold text-indigo-700 font-mono mt-0.5 block">{createdPurchases}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Line Items</span>
              <span className="text-sm font-extrabold text-slate-800 font-mono mt-0.5 block">{createdItems}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Batches Created</span>
              <span className="text-sm font-extrabold text-slate-800 font-mono mt-0.5 block">{createdBatches}</span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Stock Movements</span>
              <span className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5 block">
                {createdPurchases > 0 ? `${createdItems} INWARD` : '0'}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier Ledger</span>
              <span className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5 block">
                {createdPurchases > 0 ? `${createdPurchases} Entries` : '0'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Errors / Warnings List (Partial Failure Safety) */}
      {errors && errors.length > 0 && (
        <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Encountered Issues ({errors.length})</span>
          </div>
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {errors.map((err, eIdx) => (
              <li key={eIdx} className="text-rose-800 flex items-start gap-2 bg-white/60 p-2 rounded border border-rose-100">
                <span className="font-bold text-rose-900 whitespace-nowrap">
                  {err.bill ? `Bill ${err.bill}:` : err.record ? `Record ${err.record}:` : 'Error:'}
                </span>
                <span className="text-rose-700">{err.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
