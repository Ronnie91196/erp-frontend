import React, { useRef } from 'react';
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle2, ChevronDown } from 'lucide-react';

const ENTITY_OPTIONS = [
  { id: '', label: '⚡ Auto-Detect Entity (Recommended)' },
  { id: 'PURCHASE', label: '🧾 Purchase Bills (Inward Invoices)' },
  { id: 'CUSTOMER', label: '👥 Customers & Patients' },
  { id: 'SUPPLIER', label: '🏢 Suppliers & Distributors' },
  { id: 'PRODUCT', label: '💊 Products & Drug Master' },
  { id: 'DOCTOR', label: '🩺 Doctors & Prescribers' },
];

export default function ImportUpload({
  onFileUpload,
  isAnalyzing,
  selectedEntityType,
  setSelectedEntityType,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
            Universal Data Import Center
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Upload CSV or Excel (XLSX/XLS) spreadsheets. Multi-bill purchase files, customers, suppliers, and items are parsed seamlessly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">Target Entity:</label>
          <div className="relative min-w-[240px]">
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 appearance-none cursor-pointer"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
        className={`mt-5 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isAnalyzing
            ? 'border-indigo-300 bg-indigo-50/40 cursor-wait'
            : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
          disabled={isAnalyzing}
        />

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-sm font-semibold text-indigo-900">
              Analyzing Document Structure & Detecting Schema...
            </div>
            <div className="text-xs text-indigo-600">
              Classifying rows, detecting bill boundaries, and extracting fields
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drag & drop spreadsheet
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports <span className="font-semibold text-slate-700">.CSV</span>,{' '}
                <span className="font-semibold text-slate-700">.XLSX</span>, and{' '}
                <span className="font-semibold text-slate-700">.XLS</span> (Up to 50MB)
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Automatic multi-bill splitting supported
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
