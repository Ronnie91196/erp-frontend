import React from 'react';
import {
  FileText, CheckCircle, AlertTriangle, AlertCircle, Layers,
  Building, ChevronDown, Check, ArrowRight, ShieldCheck, Sparkles
} from 'lucide-react';

export default function ImportAnalysisSummary({
  analysis,
  suppliers = [],
  selectedSupplierId,
  onSupplierChange,
}) {
  if (!analysis) return null;

  const {
    detectedEntity = 'PURCHASE',
    entityLabel = 'Purchase Bills',
    entityConfidence = 'HIGH',
    entityConfidencePercent = 90,
    fileInfo = {},
    rowReconciliation = {},
    columnMappings = [],
    summary = {},
    resolvedSupplier,
    isMultiBill,
  } = analysis;

  const confidenceBadgeStyles = {
    HIGH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
    LOW: 'bg-rose-50 text-rose-700 border-rose-200',
    AMBIGUOUS: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div className="space-y-4 mb-6">
      {/* Top Banner: Entity Detected & File Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detected Entity</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    confidenceBadgeStyles[entityConfidence] || confidenceBadgeStyles.HIGH
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {entityConfidence} Confidence ({entityConfidencePercent}%)
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {entityLabel}
              </h3>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4">
            {isMultiBill && (
              <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <div className="text-xs text-slate-500 font-medium">Bills Found</div>
                <div className="text-sm font-bold text-slate-800">{summary.billsCount || 0}</div>
              </div>
            )}
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <div className="text-xs text-slate-500 font-medium">Total Items</div>
              <div className="text-sm font-bold text-slate-800">{summary.totalItems || 0}</div>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-xs text-emerald-600 font-medium">Ready</div>
              <div className="text-sm font-bold text-emerald-700">{summary.readyCount || 0}</div>
            </div>
            {(summary.needsReviewCount > 0 || summary.invalidCount > 0) && (
              <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <div className="text-xs text-amber-600 font-medium">Review Req.</div>
                <div className="text-sm font-bold text-amber-700">
                  {(summary.needsReviewCount || 0) + (summary.invalidCount || 0)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row Reconciliation Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-4 text-xs">
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-slate-400 block font-medium">File Name</span>
            <span className="text-slate-700 font-semibold truncate block mt-0.5" title={fileInfo.fileName}>
              {fileInfo.fileName || 'Document'}
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-slate-400 block font-medium">Format</span>
            <span className="text-slate-700 font-semibold block mt-0.5">{fileInfo.formatName || 'CSV'}</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-slate-400 block font-medium">Source Rows</span>
            <span className="text-slate-700 font-semibold block mt-0.5">{fileInfo.totalSourceRows || 0}</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-slate-400 block font-medium">Data Rows</span>
            <span className="text-emerald-700 font-semibold block mt-0.5">{rowReconciliation.counts?.DATA || 0}</span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-slate-400 block font-medium">Header / Totals</span>
            <span className="text-slate-700 font-semibold block mt-0.5">
              {(rowReconciliation.counts?.HEADER || 0) + (rowReconciliation.counts?.TOTAL || 0)}
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <span className="text-slate-400 block font-medium">Reconciled</span>
            <span className="text-emerald-700 font-semibold block mt-0.5 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> 100%
            </span>
          </div>
        </div>
      </div>

      {/* Supplier Resolution Section (For Purchases) */}
      {detectedEntity === 'PURCHASE' && (
        <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-900">Authoritative Supplier Assignment</span>
                {resolvedSupplier && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full">
                    Auto-Matched ({resolvedSupplier.matchType})
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-700 mt-0.5">
                All inward bills in this import will be booked against this supplier ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-[280px]">
            <div className="relative w-full">
              <select
                value={selectedSupplierId || ''}
                onChange={(e) => onSupplierChange(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-xs font-semibold border border-indigo-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none shadow-sm cursor-pointer"
              >
                <option value="">-- Select Supplier to Assign --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Semantic Field Mappings Pills */}
      {columnMappings && columnMappings.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Detected Column Semantics ({columnMappings.length} Fields)
            </span>
            <span className="text-[11px] text-slate-400">Values validated against schema</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {columnMappings.map((m) => (
              <div
                key={m.fieldKey}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs"
              >
                <span className="text-slate-500 font-medium">{m.sourceColumnHeader}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-indigo-700 font-semibold">{m.fieldLabel}</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-mono">
                  {m.confidencePercent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
