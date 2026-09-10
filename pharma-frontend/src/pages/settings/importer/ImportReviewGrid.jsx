import React, { useState } from 'react';
import {
  Receipt, Calendar, Hash, Tag, AlertTriangle, AlertCircle,
  CheckCircle, Layers, Check, Edit2, Users, Building, FileText
} from 'lucide-react';

export default function ImportReviewGrid({
  analysis,
  activeBillIndex,
  setActiveBillIndex,
  onUpdateBillHeader,
  onUpdateBillItem,
  onUpdateRecordField,
}) {
  if (!analysis) return null;

  const { detectedEntity = 'PURCHASE', bills = [], records = [] } = analysis;

  // ----------------------------------------------------
  // NON-PURCHASE ENTITY REVIEW GRID (Flat Records)
  // ----------------------------------------------------
  if (detectedEntity !== 'PURCHASE') {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">
              Review & Edit Extracted {detectedEntity} Records
            </span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
              {records.length} Records
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Click any cell to edit before committing to database
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="import-review-table w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-12 text-center">#</th>
                <th className="p-2.5">Name / Title</th>
                {detectedEntity === 'CUSTOMER' && (
                  <>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">GSTIN</th>
                    <th className="p-2.5">City / Address</th>
                    <th className="p-2.5">Credit Limit</th>
                    <th className="p-2.5">Opening Bal</th>
                  </>
                )}
                {detectedEntity === 'SUPPLIER' && (
                  <>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">DL No</th>
                    <th className="p-2.5">GSTIN</th>
                    <th className="p-2.5">Contact Person</th>
                    <th className="p-2.5">Opening Bal</th>
                  </>
                )}
                {detectedEntity === 'PRODUCT' && (
                  <>
                    <th className="p-2.5">Generic / Salt</th>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Barcode</th>
                    <th className="p-2.5">Rack</th>
                    <th className="p-2.5">GST %</th>
                  </>
                )}
                {detectedEntity === 'DOCTOR' && (
                  <>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">Specialization</th>
                    <th className="p-2.5">Reg No</th>
                    <th className="p-2.5">Hospital / Clinic</th>
                  </>
                )}
                <th className="p-2.5 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {records.map((rec, rIdx) => {
                const isReady = rec.itemStatus === 'READY';
                return (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-2.5 text-center text-slate-400 font-mono">{rIdx + 1}</td>
                    <td className="p-1">
                      <input
                        type="text"
                        value={rec.name?.value ?? rec.name?.raw ?? ''}
                        onChange={(e) => onUpdateRecordField(rIdx, 'name', e.target.value)}
                        className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-semibold text-slate-800"
                      />
                    </td>

                    {detectedEntity === 'CUSTOMER' && (
                      <>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.phone?.value ?? rec.phone?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'phone', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.gstin?.value ?? rec.gstin?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'gstin', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.city?.value ?? rec.city?.raw ?? rec.address?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'city', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={rec.creditLimit?.value ?? rec.creditLimit?.raw ?? 0}
                            onChange={(e) => onUpdateRecordField(rIdx, 'creditLimit', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={rec.openingBalance?.value ?? rec.openingBalance?.raw ?? 0}
                            onChange={(e) => onUpdateRecordField(rIdx, 'openingBalance', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                      </>
                    )}

                    {detectedEntity === 'SUPPLIER' && (
                      <>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.phone?.value ?? rec.phone?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'phone', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.drugLicenseNo?.value ?? rec.drugLicenseNo?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'drugLicenseNo', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.gstin?.value ?? rec.gstin?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'gstin', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.contactPerson?.value ?? rec.contactPerson?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'contactPerson', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={rec.openingBalance?.value ?? rec.openingBalance?.raw ?? 0}
                            onChange={(e) => onUpdateRecordField(rIdx, 'openingBalance', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                      </>
                    )}

                    {detectedEntity === 'PRODUCT' && (
                      <>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.genericName?.value ?? rec.genericName?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'genericName', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.sku?.value ?? rec.sku?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'sku', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.barcode?.value ?? rec.barcode?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'barcode', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.rack?.value ?? rec.rack?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'rack', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={rec.gstPercent?.value ?? rec.gstPercent?.raw ?? 12}
                            onChange={(e) => onUpdateRecordField(rIdx, 'gstPercent', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                      </>
                    )}

                    {detectedEntity === 'DOCTOR' && (
                      <>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.phone?.value ?? rec.phone?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'phone', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.specialization?.value ?? rec.specialization?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'specialization', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.registrationNo?.value ?? rec.registrationNo?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'registrationNo', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={rec.hospital?.value ?? rec.hospital?.raw ?? ''}
                            onChange={(e) => onUpdateRecordField(rIdx, 'hospital', e.target.value)}
                            className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs"
                          />
                        </td>
                      </>
                    )}

                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.itemStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // MULTI-BILL PURCHASE REVIEW GRID
  // ----------------------------------------------------
  const currentBill = bills[activeBillIndex] || bills[0];
  if (!currentBill) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Multi-Bill Horizontal Tab Selector */}
      {bills.length > 1 && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 pt-3 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 whitespace-nowrap">
            Detected Bills ({bills.length}):
          </span>
          {bills.map((bill, bIdx) => {
            const isActive = bIdx === activeBillIndex;
            const isDup = bill.isDuplicate;
            return (
              <button
                key={bill.billKey || bIdx}
                onClick={() => setActiveBillIndex(bIdx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold transition-all border-t-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-indigo-700 border-indigo-600 shadow-sm'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{bill.invoiceNumber || `Bill #${bIdx + 1}`}</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                  {bill.itemCount} items
                </span>
                {isDup && (
                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Already exists in database"></span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Bill Header Info Card */}
      <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Bill / Invoice Number:
          </label>
          <div className="relative">
            <input
              type="text"
              value={currentBill.invoiceNumber || ''}
              onChange={(e) => onUpdateBillHeader('invoiceNumber', e.target.value)}
              placeholder="e.g. CR25001460"
              className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
          {currentBill.isDuplicate && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold mt-1">
              <AlertTriangle className="w-3 h-3" /> Exists in DB (ID: {currentBill.existingPurchaseId})
            </span>
          )}
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Invoice Date:
          </label>
          <div className="relative">
            <input
              type="text"
              value={currentBill.invoiceDate || ''}
              onChange={(e) => onUpdateBillHeader('invoiceDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Items in this Bill:
          </label>
          <div className="text-sm font-bold text-slate-800 py-1.5 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{currentBill.itemCount || 0} Line Items</span>
          </div>
        </div>

        <div className="text-right bg-white p-2.5 rounded-xl border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Bill Grand Total</div>
          <div className="text-lg font-extrabold text-indigo-700">
            ₹{Number(currentBill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400">
            Tax: ₹{Number(currentBill.taxTotal || 0).toFixed(2)} | Disc: ₹{Number(currentBill.discountTotal || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Bill Items Editable Grid Table */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="import-review-table w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="p-2.5 w-10 text-center">#</th>
              <th className="p-2.5 min-w-[200px]">Product / Medicine Name</th>
              <th className="p-2.5 w-24">Pack</th>
              <th className="p-2.5 w-28">Batch No</th>
              <th className="p-2.5 w-24">Expiry</th>
              <th className="p-2.5 w-16 text-right">Qty</th>
              <th className="p-2.5 w-16 text-right">Free</th>
              <th className="p-2.5 w-20 text-right">Rate (₹)</th>
              <th className="p-2.5 w-20 text-right">MRP (₹)</th>
              <th className="p-2.5 w-16 text-right">Disc%</th>
              <th className="p-2.5 w-16 text-right">Tax%</th>
              <th className="p-2.5 w-24 text-right">Amount (₹)</th>
              <th className="p-2.5 w-20 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {(currentBill.items || []).map((it, idx) => {
              const isReady = it.itemStatus === 'READY';
              const lineTotal = it.calculatedAmount ?? 0;

              return (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>

                  {/* Product Name */}
                  <td className="p-1">
                    <input
                      type="text"
                      value={it.productName?.value ?? it.productName?.raw ?? ''}
                      onChange={(e) => onUpdateBillItem(idx, 'productName', e.target.value)}
                      className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-semibold text-slate-900 truncate"
                    />
                  </td>

                  {/* Pack */}
                  <td className="p-1">
                    <input
                      type="text"
                      value={it.pack?.value?.rawPack ?? it.pack?.raw ?? ''}
                      onChange={(e) => onUpdateBillItem(idx, 'pack', e.target.value)}
                      className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono text-slate-700"
                    />
                  </td>

                  {/* Batch */}
                  <td className="p-1">
                    <input
                      type="text"
                      value={it.batchNumber?.value ?? it.batchNumber?.raw ?? ''}
                      onChange={(e) => onUpdateBillItem(idx, 'batchNumber', e.target.value)}
                      className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono font-semibold text-slate-800 uppercase"
                    />
                  </td>

                  {/* Expiry */}
                  <td className="p-1">
                    <input
                      type="text"
                      value={it.expiryDate?.value?.display ?? it.expiryDate?.raw ?? ''}
                      onChange={(e) => onUpdateBillItem(idx, 'expiryDate', e.target.value)}
                      className="w-full px-2 py-1 bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-mono text-slate-700"
                    />
                  </td>

                  {/* Qty */}
                  <td className="p-1">
                    <input
                      type="number"
                      value={it.quantity?.value ?? it.quantity?.raw ?? ''}
                      onChange={(e) => onUpdateBillItem(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-bold text-slate-900"
                    />
                  </td>

                  {/* Free Qty */}
                  <td className="p-1">
                    <input
                      type="number"
                      value={it.freeQuantity?.value ?? it.freeQuantity?.raw ?? 0}
                      onChange={(e) => onUpdateBillItem(idx, 'freeQuantity', e.target.value)}
                      className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs text-slate-500"
                    />
                  </td>

                  {/* Purchase Rate */}
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      value={it.purchaseRate?.value ?? it.purchaseRate?.raw ?? ''}
                      onChange={(e) => onUpdateBillItem(idx, 'purchaseRate', e.target.value)}
                      className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs font-semibold text-indigo-700"
                    />
                  </td>

                  {/* MRP */}
                  <td className="p-1">
                    <input
                      type="number"
                      step="0.01"
                      value={it.mrp?.value ?? it.mrp?.raw ?? ''}
                      onChange={(e) => onUpdateBillItem(idx, 'mrp', e.target.value)}
                      className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs text-slate-700"
                    />
                  </td>

                  {/* Disc % */}
                  <td className="p-1">
                    <input
                      type="number"
                      value={it.discountPercent?.value ?? it.discountPercent?.raw ?? 0}
                      onChange={(e) => onUpdateBillItem(idx, 'discountPercent', e.target.value)}
                      className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs text-slate-600"
                    />
                  </td>

                  {/* Tax % */}
                  <td className="p-1">
                    <input
                      type="number"
                      value={it.gstPercent?.value ?? it.gstPercent?.raw ?? 0}
                      onChange={(e) => onUpdateBillItem(idx, 'gstPercent', e.target.value)}
                      className="w-full px-2 py-1 text-right bg-transparent hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded text-xs text-slate-600"
                    />
                  </td>

                  {/* Line Total */}
                  <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                    ₹{Number(lineTotal).toFixed(2)}
                  </td>

                  {/* Status Badge */}
                  <td className="p-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {it.itemStatus || 'READY'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
