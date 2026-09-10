import React, { useState, useEffect, useRef } from 'react';
import { Save, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import api, { unwrap } from '../../../lib/api';
import ImportUpload from './ImportUpload';
import ImportAnalysisSummary from './ImportAnalysisSummary';
import ImportReviewGrid from './ImportReviewGrid';
import ImportProgress from './ImportProgress';

export default function ImportWorkspace() {
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [activeBillIndex, setActiveBillIndex] = useState(0);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);

  // Background Job & Real Progress Polling
  const [activeJob, setActiveJob] = useState(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    fetchSuppliers();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

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

  const handleFileUpload = async (file) => {
    if (!file) return;

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
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to analyze document');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ---------------------------------------------------------
  // INLINE EDITING HANDLERS — PRESERVES USER EDITS IN COMMIT
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
  // COMMIT HANDLER WITH REAL BACKGROUND JOB POLLING
  // ---------------------------------------------------------
  const handleCommit = async () => {
    if (!analysisResult) return;

    const itemCount = analysisResult.detectedEntity === 'PURCHASE'
      ? (analysisResult.summary?.totalItems || 0)
      : (analysisResult.records?.length || 0);
    if (!window.confirm(`Save ${itemCount} reviewed ${analysisResult.detectedEntity || 'data'} record(s) to the database now?`)) return;

    const isPurchase = analysisResult.detectedEntity === 'PURCHASE';

    let effectiveSupplier = selectedSupplierId;
    let finalBills = analysisResult.bills || [];

    if (isPurchase) {
      if (!finalBills || finalBills.length === 0) return;
      if (!effectiveSupplier && suppliers.length > 0) {
        effectiveSupplier = suppliers[0].id;
      }

      // Ensure every bill has a valid invoice number
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

      // Post the CURRENT edited state with stable idempotency key
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
        jobId,
        status: 'QUEUED',
        percent: 0,
        totalRecords: commitRes.totalRecords,
        totalBills: commitRes.totalBills,
        currentEntity: analysisResult.detectedEntity,
      });

      // Start authoritative progress polling every 400ms
      pollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await unwrap(await api.get(`/import/jobs/${jobId}`));
          if (pollRes) {
            setActiveJob(pollRes);

            // Terminate polling on terminal states
            if (
              pollRes.status === 'COMPLETED' ||
              pollRes.status === 'COMPLETED_WITH_ERRORS' ||
              pollRes.status === 'FAILED'
            ) {
              clearInterval(pollTimerRef.current);
              setIsCommitting(false);
            }
          }
        } catch (pollErr) {
          console.error('Job polling error:', pollErr);
        }
      }, 400);
    } catch (err) {
      console.error('Import commit initiation failed:', err);
      setIsCommitting(false);
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to start import commit');
    }
  };

  const handleReset = () => {
    if (analysisResult && !activeJob && !window.confirm('Discard this analyzed file and all edits before importing a new file?')) return;
    setAnalysisResult(null);
    setActiveJob(null);
    setIsCommitting(false);
    setErrorMessage(null);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  };

  return (
    <div className="import-workflow-shell">
      <div className="import-step-rail" aria-label="Import progress steps">
        {[
          ['1', 'Upload', !analysisResult && !activeJob],
          ['2', 'Analyze', isAnalyzing || Boolean(analysisResult)],
          ['3', 'Review & edit', Boolean(analysisResult) && !activeJob],
          ['4', 'Save & verify', Boolean(activeJob)],
        ].map(([number, label, active], index) => (
          <div key={label} className={`import-step ${active ? 'active' : ''} ${index === 0 && (analysisResult || activeJob) ? 'done' : ''}`}>
            <strong>{number}</strong><span className="import-step-label">{label}</span>
          </div>
        ))}
      </div>
      {/* Upload & Entity Selection Box */}
      <ImportUpload
        onFileUpload={handleFileUpload}
        isAnalyzing={isAnalyzing}
        selectedEntityType={selectedEntityType}
        setSelectedEntityType={setSelectedEntityType}
      />

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

      {/* Real Progress Banner during / after commit */}
      {activeJob && (
        <ImportProgress
          job={activeJob}
          onReset={handleReset}
        />
      )}

      {/* Analysis Summary & Column Mappings */}
      {analysisResult && !activeJob && (
        <>
          <ImportAnalysisSummary
            analysis={analysisResult}
            suppliers={suppliers}
            selectedSupplierId={selectedSupplierId}
            onSupplierChange={setSelectedSupplierId}
          />

          {/* Editable Review Grid */}
          <ImportReviewGrid
            analysis={analysisResult}
            activeBillIndex={activeBillIndex}
            setActiveBillIndex={setActiveBillIndex}
            onUpdateBillHeader={updateActiveBillHeader}
            onUpdateBillItem={updateActiveBillItem}
            onUpdateRecordField={updateRecordField}
          />

          {/* Action Bar (Commit Button) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">
                {analysisResult.detectedEntity === 'PURCHASE'
                  ? `${analysisResult.bills?.length || 0} Bills (${analysisResult.summary?.totalItems || 0} items)`
                  : `${analysisResult.records?.length || 0} Records`}
              </span>{' '}
              ready for atomic database insertion.
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                disabled={isCommitting}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Discard & Upload New
              </button>

              <button
                onClick={handleCommit}
                disabled={isCommitting}
                className="flex items-center gap-2 px-6 py-2 bg-[#087c83] hover:bg-[#06666b] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
              >
                {isCommitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Committing to Database...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Commit Import to Database
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
