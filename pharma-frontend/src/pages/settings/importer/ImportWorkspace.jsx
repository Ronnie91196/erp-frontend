import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, AlertCircle, RefreshCw, Layers, RotateCcw,
  CheckCircle2, FileSpreadsheet, Database, Eye, ArrowLeft
} from 'lucide-react';
import api, { unwrap, apiError } from '../../../lib/api';
import ImportUpload from './ImportUpload';
import ImportReviewStudio from './ImportReviewStudio';
import ImportProgress from './ImportProgress';
import ImportConfirmationModal from './ImportConfirmationModal';
import ImportDetailsModal from './ImportDetailsModal';
import UndoModal from './UndoModal';
import RetryModal from './RetryModal';

const ACTIVE_JOB_KEY = 'pharma_active_import_job_id';

export default function ImportWorkspace({ onReviewModeChange }) {
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeBillIndex, setActiveBillIndex] = useState(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  // Background Job & Authoritative Polling State
  const [activeJob, setActiveJob] = useState(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Modal Triggers
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);

  const pollTimerRef = useRef(null);

  // Notify parent and app shell of review mode state for true full-width layout
  const isReviewMode = Boolean(analysisResult && !activeJob);
  useEffect(() => {
    onReviewModeChange?.(isReviewMode);
    if (isReviewMode) {
      document.body.classList.add('import-studio-active');
      window.dispatchEvent(new CustomEvent('pharma:collapse-sidebar', { detail: true }));
    } else {
      document.body.classList.remove('import-studio-active');
      window.dispatchEvent(new CustomEvent('pharma:collapse-sidebar', { detail: false }));
    }
    return () => {
      document.body.classList.remove('import-studio-active');
      window.dispatchEvent(new CustomEvent('pharma:collapse-sidebar', { detail: false }));
    };
  }, [isReviewMode, onReviewModeChange]);

  // ---------------------------------------------------------
  // 1. INITIALIZATION & REFRESH RECOVERY
  // ---------------------------------------------------------
  useEffect(() => {
    fetchSuppliers();

    // Check URL search params or localStorage for active job recovery
    const urlParams = new URLSearchParams(window.location.search);
    const urlJobId = urlParams.get('jobId') || localStorage.getItem(ACTIVE_JOB_KEY);

    if (urlJobId) {
      resumeJobTracking(urlJobId);
    }

    return () => {
      stopPolling();
    };
  }, []);

  // Window Focus / Visibility Change Handler for Immediate Sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeJob?.id) {
        pollJobStatus(activeJob.id);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [activeJob?.id]);

  // Synchronize supplier selection when suppliers list loads or analysis completes
  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      if (analysisResult?.resolvedSupplier?.supplierId) {
        setSelectedSupplierId(analysisResult.resolvedSupplier.supplierId);
      } else {
        setSelectedSupplierId(suppliers[0].id);
      }
    }
  }, [suppliers, analysisResult, selectedSupplierId]);

  const fetchSuppliers = async () => {
    try {
      const res = await unwrap(await api.get('/import/suppliers'));
      if (Array.isArray(res)) {
        setSuppliers(res);
      }
    } catch (err) {
      console.warn('Could not fetch suppliers:', err);
    }
  };

  // ---------------------------------------------------------
  // 2. AUTHORITATIVE POLLING ENGINE (750–1000ms, strictly backend)
  // ---------------------------------------------------------
  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const pollJobStatus = async (jobId) => {
    try {
      const jobData = await unwrap(await api.get(`/import/jobs/${jobId}`));
      if (jobData) {
        setActiveJob(jobData);

        // Terminal states check: Stop polling when job is done
        const terminalStates = ['COMPLETED', 'PARTIAL', 'FAILED', 'UNDONE'];
        if (terminalStates.includes(jobData.status)) {
          stopPolling();
          setIsCommitting(false);
        }
      }
    } catch (pollErr) {
      console.warn('Job polling notification:', pollErr?.message);
      if (pollErr?.response?.status === 404) {
        stopPolling();
        localStorage.removeItem(ACTIVE_JOB_KEY);
      }
    }
  };

  const startAuthoritativePolling = (jobId) => {
    stopPolling();
    localStorage.setItem(ACTIVE_JOB_KEY, jobId);

    // Update URL param without full page reload
    const url = new URL(window.location);
    url.searchParams.set('jobId', jobId);
    window.history.replaceState({}, '', url);

    // 1. Immediate fetch
    pollJobStatus(jobId);

    // 2. Continuous 850ms interval polling
    pollTimerRef.current = setInterval(() => {
      pollJobStatus(jobId);
    }, 850);
  };

  const resumeJobTracking = async (jobId) => {
    try {
      const jobData = await unwrap(await api.get(`/import/jobs/${jobId}`));
      if (jobData) {
        setActiveJob(jobData);
        const terminalStates = ['COMPLETED', 'PARTIAL', 'FAILED', 'UNDONE'];
        if (!terminalStates.includes(jobData.status)) {
          startAuthoritativePolling(jobId);
        }
      }
    } catch (err) {
      console.warn('Could not resume job tracking:', err);
      localStorage.removeItem(ACTIVE_JOB_KEY);
    }
  };

  // ---------------------------------------------------------
  // 3. FILE ANALYSIS HANDLER
  // ---------------------------------------------------------
  const handleFileUpload = async (fileOrAnalysis) => {
    if (!fileOrAnalysis) return;

    if (fileOrAnalysis.bills || fileOrAnalysis.detectedEntity) {
      setAnalysisResult(fileOrAnalysis);
      setActiveBillIndex(0);
      if (fileOrAnalysis.resolvedSupplier?.supplierId) {
        setSelectedSupplierId(fileOrAnalysis.resolvedSupplier.supplierId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }
      return;
    }

    const file = fileOrAnalysis;
    const formData = new FormData();
    formData.append('file', file);
    if (selectedEntityType) {
      formData.append('entityType', selectedEntityType);
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setAnalysisResult(null);
      setActiveJob(null);
      stopPolling();
      localStorage.removeItem(ACTIVE_JOB_KEY);

      const response = await api.post('/import/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const analysis = unwrap(response);
      setAnalysisResult(analysis);
      setActiveBillIndex(0);

      // Auto-assign supplier if matched or fallback to first supplier
      if (analysis.resolvedSupplier?.supplierId) {
        setSelectedSupplierId(analysis.resolvedSupplier.supplierId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }
    } catch (err) {
      console.error('Document analysis failed:', err);
      setErrorMessage(apiError(err) || 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadSample = async () => {
    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setAnalysisResult(null);
      setActiveJob(null);
      stopPolling();
      localStorage.removeItem(ACTIVE_JOB_KEY);

      const response = await api.post('/import/analyze-sample');
      const analysis = unwrap(response);
      setAnalysisResult(analysis);
      setActiveBillIndex(0);

      if (analysis.resolvedSupplier?.supplierId) {
        setSelectedSupplierId(analysis.resolvedSupplier.supplierId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }
    } catch (err) {
      console.error('Sample analysis failed:', err);
      setErrorMessage(apiError(err) || 'Failed to analyze sample document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ---------------------------------------------------------
  // 4. INLINE EDITING HANDLERS — PRESERVES USER EDITS IN COMMIT
  // ---------------------------------------------------------
  const updateActiveBillHeader = (field, value) => {
    setAnalysisResult((prev) => {
      if (!prev || !prev.bills) return prev;
      const updatedBills = [...prev.bills];
      const targetBill = { ...updatedBills[activeBillIndex], [field]: value };
      updatedBills[activeBillIndex] = targetBill;
      return { ...prev, bills: updatedBills };
    });
  };

  const updateActiveBillItem = (itemIdx, field, rawValue) => {
    setAnalysisResult((prev) => {
      if (!prev || !prev.bills) return prev;
      const updatedBills = [...prev.bills];
      const targetBill = { ...updatedBills[activeBillIndex] };
      const updatedItems = [...targetBill.items];
      const targetItem = { ...updatedItems[itemIdx] };

      if (field === 'productName') {
        targetItem.productName = {
          ...targetItem.productName,
          raw: rawValue,
          value: rawValue.trim(),
          status: rawValue.trim().length > 0 ? 'VALID' : 'INVALID',
        };
      } else if (field === 'pack') {
        targetItem.pack = {
          ...targetItem.pack,
          raw: rawValue,
          value: {
            rawPack: rawValue,
            dosageForm: targetItem.pack?.value?.dosageForm || 'Tablet',
            conversionToBase: 1,
          },
        };
      } else if (field === 'batchNumber') {
        targetItem.batchNumber = {
          ...targetItem.batchNumber,
          raw: rawValue,
          value: rawValue.trim(),
          status: rawValue.trim().length > 0 ? 'VALID' : 'INVALID',
        };
      } else if (field === 'expiryDate') {
        const clean = rawValue.trim();
        targetItem.expiryDate = {
          ...targetItem.expiryDate,
          raw: rawValue,
          value: { display: clean, rawDisplay: clean },
          status: clean.length >= 4 ? 'VALID' : 'AMBIGUOUS',
        };
      } else if (field === 'quantity') {
        const num = parseFloat(rawValue) || 0;
        targetItem.quantity = {
          ...targetItem.quantity,
          raw: rawValue,
          value: num,
          status: num > 0 ? 'VALID' : 'INVALID',
        };
      } else if (field === 'freeQuantity') {
        const num = parseFloat(rawValue) || 0;
        targetItem.freeQuantity = {
          ...targetItem.freeQuantity,
          raw: rawValue,
          value: num,
          status: 'VALID',
        };
      } else if (field === 'mrp') {
        const num = parseFloat(rawValue) || 0;
        targetItem.mrp = {
          ...targetItem.mrp,
          raw: rawValue,
          value: num,
          status: num >= 0 ? 'VALID' : 'INVALID',
        };
      } else if (field === 'purchaseRate') {
        const num = parseFloat(rawValue) || 0;
        targetItem.purchaseRate = {
          ...targetItem.purchaseRate,
          raw: rawValue,
          value: num,
          status: num >= 0 ? 'VALID' : 'INVALID',
        };
      } else if (field === 'discountPercent') {
        const num = parseFloat(rawValue) || 0;
        targetItem.discountPercent = {
          ...targetItem.discountPercent,
          raw: rawValue,
          value: num,
          status: 'VALID',
        };
      } else if (field === 'gstPercent') {
        const num = parseFloat(rawValue) || 0;
        targetItem.gstPercent = {
          ...targetItem.gstPercent,
          raw: rawValue,
          value: num,
          status: 'VALID',
        };
      } else if (field === 'hsnCode' || field === 'hsn') {
        targetItem.hsnCode = {
          ...targetItem.hsnCode,
          raw: rawValue,
          value: rawValue.trim(),
          status: 'VALID',
        };
      }

      // Re-evaluate line item readiness
      const isReady =
        (targetItem.productName?.value?.length > 0) &&
        (targetItem.batchNumber?.value?.length > 0) &&
        (Number(targetItem.quantity?.value) > 0) &&
        (Number(targetItem.mrp?.value) >= 0) &&
        (Number(targetItem.purchaseRate?.value) >= 0);

      targetItem.itemStatus = isReady ? 'READY' : 'NEEDS_REVIEW';
      updatedItems[itemIdx] = targetItem;
      targetBill.items = updatedItems;

      // Recalculate bill totals live
      let newSubtotal = 0;
      let newDiscTotal = 0;
      let newTaxTotal = 0;
      let newGrandTotal = 0;

      updatedItems.forEach((it) => {
        const qty = Number(it.quantity?.value ?? it.quantity?.raw ?? 0);
        const rate = Number(it.purchaseRate?.value ?? it.purchaseRate?.raw ?? 0);
        const disc = Number(it.discountPercent?.value ?? it.discountPercent?.raw ?? 0);
        const tax = Number(it.gstPercent?.value ?? it.gstPercent?.raw ?? 0);

        const lineTaxable = qty * rate;
        const lineDisc = lineTaxable * (disc / 100);
        const lineTax = (lineTaxable - lineDisc) * (tax / 100);
        const lineTotal = lineTaxable - lineDisc + lineTax;

        it.calculatedAmount = Number(lineTotal.toFixed(2));
        newSubtotal += lineTaxable;
        newDiscTotal += lineDisc;
        newTaxTotal += lineTax;
        newGrandTotal += lineTotal;
      });

      targetBill.subtotal = Number(newSubtotal.toFixed(2));
      targetBill.discountTotal = Number(newDiscTotal.toFixed(2));
      targetBill.taxTotal = Number(newTaxTotal.toFixed(2));
      targetBill.totalAmount = Number(newGrandTotal.toFixed(2));

      updatedBills[activeBillIndex] = targetBill;
      return { ...prev, bills: updatedBills };
    });
  };

  const updateRecordField = (rIdx, field, value) => {
    setAnalysisResult((prev) => {
      if (!prev || !prev.records) return prev;
      const updatedRecords = [...prev.records];
      const targetRecord = { ...updatedRecords[rIdx] };

      targetRecord[field] = {
        ...targetRecord[field],
        raw: value,
        value: value.trim() || null,
        status: value.trim().length > 0 ? 'VALID' : 'MISSING',
      };

      updatedRecords[rIdx] = targetRecord;
      return { ...prev, records: updatedRecords };
    });
  };

  // ---------------------------------------------------------
  // 5. COMMIT HANDLER WITH CONFIRMATION MODAL & IDEMPOTENCY
  // ---------------------------------------------------------
  const handleOpenConfirm = () => {
    setShowConfirmModal(true);
  };

  const handleExecuteCommit = async () => {
    if (!analysisResult) return;

    const isPurchase = analysisResult.detectedEntity === 'PURCHASE';
    let effectiveSupplier = selectedSupplierId;
    let finalBills = analysisResult.bills || [];

    if (isPurchase) {
      if (!finalBills || finalBills.length === 0) return;
      if (!effectiveSupplier && suppliers.length > 0) {
        effectiveSupplier = suppliers[0].id;
      }

      finalBills = finalBills.map((bill, bIdx) => ({
        ...bill,
        invoiceNumber: bill.invoiceNumber?.trim() || `BILL-${Date.now().toString().slice(-6)}-${bIdx + 1}`,
      }));
    } else {
      if (!analysisResult.records || analysisResult.records.length === 0) return;
    }

    try {
      setIsCommitting(true);
      setErrorMessage(null);
      setShowConfirmModal(false);

      const idempotencyKey = analysisResult.fileInfo?.hash || `commit_${analysisResult.detectedEntity}_${Date.now()}`;
      const response = await api.post('/import/commit', {
        entityType: analysisResult.detectedEntity || 'PURCHASE',
        supplierId: effectiveSupplier || selectedSupplierId || null,
        bills: finalBills,
        records: analysisResult.records,
        fileName: analysisResult.fileInfo?.fileName || 'Import Document',
        idempotencyKey,
      });

      const commitRes = unwrap(response);
      const jobId = commitRes.jobId;

      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      // Initialize active job state
      setActiveJob({
        id: jobId,
        jobId,
        status: 'IMPORTING',
        percent: 0,
        progressPercent: 0,
        totalBills: commitRes.totalBills || finalBills.length,
        totalRows: commitRes.totalRows || analysisResult.fileInfo?.totalSourceRows || 0,
        currentEntity: analysisResult.detectedEntity,
      });

      // Start authoritative progress polling
      startAuthoritativePolling(jobId);
    } catch (err) {
      console.error('Import commit initiation failed:', err);
      setIsCommitting(false);
      setErrorMessage(apiError(err) || 'Failed to start import commit');
    }
  };

  const handleReset = () => {
    if (analysisResult && !activeJob && !window.confirm('Discard this analyzed file and all edits before importing a new file?')) return;
    setAnalysisResult(null);
    setActiveJob(null);
    setIsCommitting(false);
    setErrorMessage(null);
    stopPolling();
    localStorage.removeItem(ACTIVE_JOB_KEY);

    const url = new URL(window.location);
    url.searchParams.delete('jobId');
    window.history.replaceState({}, '', url);
  };

  // Resolve active supplier object
  const selectedSupplierObj = suppliers.find((s) => s.id === selectedSupplierId);

  // If in Review & Edit mode, render the dedicated ImportReviewStudio
  if (analysisResult && !activeJob) {
    return (
      <div className="import-studio-wrapper">
        <ImportReviewStudio
          analysis={analysisResult}
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          onSupplierChange={setSelectedSupplierId}
          activeBillIndex={activeBillIndex}
          setActiveBillIndex={setActiveBillIndex}
          onUpdateBillHeader={updateActiveBillHeader}
          onUpdateBillItem={updateActiveBillItem}
          onUpdateRecordField={updateRecordField}
          onReset={handleReset}
          onCommit={handleOpenConfirm}
          isCommitting={isCommitting}
        />

        {/* CONFIRMATION MODAL */}
        {showConfirmModal && (
          <ImportConfirmationModal
            analysis={analysisResult}
            selectedSupplier={selectedSupplierObj}
            isCommitting={isCommitting}
            onConfirm={handleExecuteCommit}
            onClose={() => setShowConfirmModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="import-workflow-shell text-slate-800">
      {/* 5-Step Visual Rail */}
      <div className="import-step-rail" aria-label="Import workflow steps">
        {[
          ['1', 'Select File', !analysisResult && !activeJob],
          ['2', 'Analyze', isAnalyzing],
          ['3', 'Review & Edit', Boolean(analysisResult) && !activeJob],
          ['4', 'Live Progress', Boolean(activeJob) && activeJob.status !== 'COMPLETED' && activeJob.status !== 'UNDONE'],
          ['5', 'Result & Audit', Boolean(activeJob) && (activeJob.status === 'COMPLETED' || activeJob.status === 'UNDONE')],
        ].map(([number, label, active], index) => {
          const isPassed =
            (index === 0 && (analysisResult || activeJob)) ||
            (index === 1 && (analysisResult || activeJob)) ||
            (index === 2 && activeJob) ||
            (index === 3 && activeJob && (activeJob.status === 'COMPLETED' || activeJob.status === 'UNDONE'));

          return (
            <div
              key={label}
              className={`import-step ${active ? 'active' : ''} ${isPassed ? 'done' : ''}`}
            >
              <strong>{number}</strong>
              <span className="import-step-label">{label}</span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload Box (when no analysis and no active job) */}
      {!analysisResult && !activeJob && (
        <ImportUpload
          onFileUpload={handleFileUpload}
          onLoadSample={handleLoadSample}
          isAnalyzing={isAnalyzing}
          selectedEntityType={selectedEntityType}
          setSelectedEntityType={setSelectedEntityType}
        />
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <span className="font-bold block">Error:</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* STEP 4 & 5: Live Progress & Result Panel */}
      {activeJob && (
        <ImportProgress
          job={activeJob}
          onReset={handleReset}
          onOpenDetails={() => setShowDetailsModal(true)}
          onOpenRetry={() => setShowRetryModal(true)}
          onOpenUndo={() => setShowUndoModal(true)}
        />
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && activeJob && (
        <ImportDetailsModal
          job={activeJob}
          onClose={() => setShowDetailsModal(false)}
          onOpenRetry={() => setShowRetryModal(true)}
          onOpenUndo={() => setShowUndoModal(true)}
        />
      )}

      {/* UNDO MODAL */}
      {showUndoModal && activeJob && (
        <UndoModal
          job={activeJob}
          onClose={() => setShowUndoModal(false)}
          onSuccess={(undoRes) => {
            pollJobStatus(activeJob.id || activeJob.jobId);
          }}
        />
      )}

      {/* RETRY MODAL */}
      {showRetryModal && activeJob && (
        <RetryModal
          job={activeJob}
          onClose={() => setShowRetryModal(false)}
          onStartRetry={(jobId) => {
            startAuthoritativePolling(jobId);
          }}
        />
      )}
    </div>
  );
}
