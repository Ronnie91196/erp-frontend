import React from 'react';
import {
  AlertTriangle, AlertCircle, CheckCircle, Tag, Hash, FileText
} from 'lucide-react';

export default function ImportReviewGrid({
  analysis,
  activeBillIndex,
  setActiveBillIndex,
  onUpdateBillHeader,
  onUpdateBillItem,
  onUpdateRecordField,
  activeFilter = 'ALL',
  searchQuery = '',
}) {
  if (!analysis) return null;

  const { detectedEntity = 'PURCHASE', bills = [], records = [] } = analysis;

  // ----------------------------------------------------
  // NON-PURCHASE ENTITY REVIEW GRID (Flat Records)
  // ----------------------------------------------------
  if (detectedEntity !== 'PURCHASE') {
    const filteredRecords = records.filter((rec, idx) => {
      const isReady = rec.itemStatus === 'READY';
      if (activeFilter === 'NEEDS_REVIEW' && isReady) return false;
      if (activeFilter === 'READY' && !isReady) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (rec.name?.value || rec.name?.raw || '').toLowerCase();
        const phone = (rec.phone?.value || rec.phone?.raw || '').toLowerCase();
        const gstin = (rec.gstin?.value || rec.gstin?.raw || '').toLowerCase();
        return name.includes(query) || phone.includes(query) || gstin.includes(query);
      }
      return true;
    });

    return (
      <div className="import-studio-table-container">
        <table className="import-studio-table">
          <thead>
            <tr className="import-studio-th-group-row">
              <th colSpan={2} className="import-studio-th-group text-left">ENTITY IDENTITY</th>
              {detectedEntity === 'CUSTOMER' && <th colSpan={5} className="import-studio-th-group text-left">CUSTOMER ATTRIBUTES</th>}
              {detectedEntity === 'SUPPLIER' && <th colSpan={5} className="import-studio-th-group text-left">SUPPLIER ATTRIBUTES</th>}
              {detectedEntity === 'PRODUCT' && <th colSpan={5} className="import-studio-th-group text-left">PRODUCT ATTRIBUTES</th>}
              {detectedEntity === 'DOCTOR' && <th colSpan={4} className="import-studio-th-group text-left">PRACTITIONER DETAILS</th>}
              <th className="import-studio-th-group text-center">STATUS</th>
            </tr>
            <tr className="import-studio-th-cols-row">
              <th className="import-studio-th w-10 text-center">#</th>
              <th className="import-studio-th text-left">Name / Title</th>
              {detectedEntity === 'CUSTOMER' && (
                <>
                  <th className="import-studio-th text-left">Phone</th>
                  <th className="import-studio-th text-left">GSTIN</th>
                  <th className="import-studio-th text-left">City / Address</th>
                  <th className="import-studio-th text-right">Credit Limit (₹)</th>
                  <th className="import-studio-th text-right">Opening Bal (₹)</th>
                </>
              )}
              {detectedEntity === 'SUPPLIER' && (
                <>
                  <th className="import-studio-th text-left">Phone</th>
                  <th className="import-studio-th text-left">Drug License (DL)</th>
                  <th className="import-studio-th text-left">GSTIN</th>
                  <th className="import-studio-th text-left">Contact Person</th>
                  <th className="import-studio-th text-right">Opening Bal (₹)</th>
                </>
              )}
              {detectedEntity === 'PRODUCT' && (
                <>
                  <th className="import-studio-th text-left">Generic / Salt</th>
                  <th className="import-studio-th text-left">SKU Code</th>
                  <th className="import-studio-th text-left">Barcode</th>
                  <th className="import-studio-th text-left">Rack</th>
                  <th className="import-studio-th text-right">GST %</th>
                </>
              )}
              {detectedEntity === 'DOCTOR' && (
                <>
                  <th className="import-studio-th text-left">Phone</th>
                  <th className="import-studio-th text-left">Specialization</th>
                  <th className="import-studio-th text-left">Reg No</th>
                  <th className="import-studio-th text-left">Hospital / Clinic</th>
                </>
              )}
              <th className="import-studio-th w-20 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((rec, rIdx) => {
              const isReady = rec.itemStatus === 'READY';
              return (
                <tr key={rIdx} className="import-studio-tr">
                  <td className="import-studio-td import-studio-td--idx text-center">{rIdx + 1}</td>
                  <td className="import-studio-td">
                    <input
                      type="text"
                      value={rec.name?.value ?? rec.name?.raw ?? ''}
                      onChange={(e) => onUpdateRecordField(rIdx, 'name', e.target.value)}
                      className="import-studio-cell-input font-semibold text-slate-900"
                    />
                  </td>

                  {detectedEntity === 'CUSTOMER' && (
                    <>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.phone?.value ?? rec.phone?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'phone', e.target.value)}
                          className="import-studio-cell-input font-mono"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.gstin?.value ?? rec.gstin?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'gstin', e.target.value)}
                          className="import-studio-cell-input font-mono uppercase"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.city?.value ?? rec.city?.raw ?? rec.address?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'city', e.target.value)}
                          className="import-studio-cell-input"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="number"
                          value={rec.creditLimit?.value ?? rec.creditLimit?.raw ?? 0}
                          onChange={(e) => onUpdateRecordField(rIdx, 'creditLimit', e.target.value)}
                          className="import-studio-cell-input text-right font-mono"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="number"
                          value={rec.openingBalance?.value ?? rec.openingBalance?.raw ?? 0}
                          onChange={(e) => onUpdateRecordField(rIdx, 'openingBalance', e.target.value)}
                          className="import-studio-cell-input text-right font-mono"
                        />
                      </td>
                    </>
                  )}

                  {detectedEntity === 'SUPPLIER' && (
                    <>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.phone?.value ?? rec.phone?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'phone', e.target.value)}
                          className="import-studio-cell-input font-mono"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.drugLicenseNo?.value ?? rec.drugLicenseNo?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'drugLicenseNo', e.target.value)}
                          className="import-studio-cell-input"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.gstin?.value ?? rec.gstin?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'gstin', e.target.value)}
                          className="import-studio-cell-input font-mono uppercase"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.contactPerson?.value ?? rec.contactPerson?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'contactPerson', e.target.value)}
                          className="import-studio-cell-input"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="number"
                          value={rec.openingBalance?.value ?? rec.openingBalance?.raw ?? 0}
                          onChange={(e) => onUpdateRecordField(rIdx, 'openingBalance', e.target.value)}
                          className="import-studio-cell-input text-right font-mono"
                        />
                      </td>
                    </>
                  )}

                  {detectedEntity === 'PRODUCT' && (
                    <>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.genericName?.value ?? rec.genericName?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'genericName', e.target.value)}
                          className="import-studio-cell-input"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.sku?.value ?? rec.sku?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'sku', e.target.value)}
                          className="import-studio-cell-input font-mono"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.barcode?.value ?? rec.barcode?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'barcode', e.target.value)}
                          className="import-studio-cell-input font-mono"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.rack?.value ?? rec.rack?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'rack', e.target.value)}
                          className="import-studio-cell-input"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="number"
                          value={rec.gstPercent?.value ?? rec.gstPercent?.raw ?? 12}
                          onChange={(e) => onUpdateRecordField(rIdx, 'gstPercent', e.target.value)}
                          className="import-studio-cell-input text-right font-mono"
                        />
                      </td>
                    </>
                  )}

                  {detectedEntity === 'DOCTOR' && (
                    <>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.phone?.value ?? rec.phone?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'phone', e.target.value)}
                          className="import-studio-cell-input font-mono"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.specialization?.value ?? rec.specialization?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'specialization', e.target.value)}
                          className="import-studio-cell-input"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.registrationNo?.value ?? rec.registrationNo?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'registrationNo', e.target.value)}
                          className="import-studio-cell-input font-mono"
                        />
                      </td>
                      <td className="import-studio-td">
                        <input
                          type="text"
                          value={rec.hospital?.value ?? rec.hospital?.raw ?? ''}
                          onChange={(e) => onUpdateRecordField(rIdx, 'hospital', e.target.value)}
                          className="import-studio-cell-input"
                        />
                      </td>
                    </>
                  )}

                  <td className="import-studio-td text-center">
                    <span className={`import-studio-badge ${isReady ? 'import-studio-badge--ready' : 'import-studio-badge--review'}`}>
                      {rec.itemStatus || 'READY'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ----------------------------------------------------
  // EXACT 14-COLUMN PURCHASE REVIEW GRID
  // ----------------------------------------------------
  const currentBill = bills[activeBillIndex] || bills[0];
  if (!currentBill) return null;

  const rawItems = currentBill.items || [];

  // Filter & Search Line Items
  const filteredItems = rawItems.map((item, originalIdx) => ({ item, originalIdx })).filter(({ item }) => {
    const isReady = item.itemStatus === 'READY';
    if (activeFilter === 'NEEDS_REVIEW' && isReady) return false;
    if (activeFilter === 'READY' && !isReady) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const pName = (item.productName?.value || item.productName?.raw || '').toLowerCase();
      const bNo = (item.batchNumber?.value || item.batchNumber?.raw || '').toLowerCase();
      const hsn = (item.hsnCode?.value || item.hsnCode?.raw || item.hsn?.value || item.hsn?.raw || '').toLowerCase();
      return pName.includes(q) || bNo.includes(q) || hsn.includes(q);
    }
    return true;
  });

  return (
    <div className="import-studio-table-container">
      <table className="import-studio-table" role="grid" aria-label="Purchase Inward Bill Items">
        <thead>
          {/* GROUPED HEADER ROW (6 GROUPS OVER 14 COLUMNS) */}
          <tr className="import-studio-th-group-row">
            <th colSpan={3} className="import-studio-th-group text-left">
              ITEM IDENTITY
            </th>
            <th colSpan={2} className="import-studio-th-group text-left">
              BATCH &amp; EXPIRY
            </th>
            <th colSpan={2} className="import-studio-th-group text-right">
              QUANTITY
            </th>
            <th colSpan={3} className="import-studio-th-group text-right">
              PRICING (₹)
            </th>
            <th colSpan={2} className="import-studio-th-group text-left">
              TAX &amp; CODE
            </th>
            <th colSpan={2} className="import-studio-th-group text-right">
              AMOUNT &amp; STATUS
            </th>
          </tr>

          {/* 14 INDIVIDUAL 2-LINE COLUMN HEADERS */}
          <tr className="import-studio-th-cols-row">
            {/* 1. # */}
            <th className="import-studio-th import-studio-th--idx text-center" title="Row Index">
              <span className="import-studio-th-l1">#</span>
            </th>

            {/* 2. Product / Medicine Name */}
            <th className="import-studio-th import-studio-th--product text-left" title="Product / Medicine Name">
              <span className="import-studio-th-l1">Product / Medicine</span>
              <span className="import-studio-th-l2">Trade Name</span>
            </th>

            {/* 3. Pack */}
            <th className="import-studio-th import-studio-th--pack text-center" title="Packaging Size">
              <span className="import-studio-th-l1">Pack</span>
              <span className="import-studio-th-l2">Size</span>
            </th>

            {/* 4. Batch No */}
            <th className="import-studio-th import-studio-th--batch text-left" title="Batch / Lot Number">
              <span className="import-studio-th-l1">Batch</span>
              <span className="import-studio-th-l2">Number</span>
            </th>

            {/* 5. Expiry */}
            <th className="import-studio-th import-studio-th--expiry text-center" title="Expiry Date">
              <span className="import-studio-th-l1">Expiry</span>
              <span className="import-studio-th-l2">MM/YY</span>
            </th>

            {/* 6. Billed Qty */}
            <th className="import-studio-th import-studio-th--qty text-right" title="Billed Quantity">
              <span className="import-studio-th-l1">Billed</span>
              <span className="import-studio-th-l2">Qty</span>
            </th>

            {/* 7. Free Qty */}
            <th className="import-studio-th import-studio-th--free text-right" title="Free / Bonus Quantity">
              <span className="import-studio-th-l1">Free</span>
              <span className="import-studio-th-l2">Qty</span>
            </th>

            {/* 8. Purchase Rate (₹) */}
            <th className="import-studio-th import-studio-th--rate text-right" title="Purchase Rate per unit">
              <span className="import-studio-th-l1">Purchase</span>
              <span className="import-studio-th-l2">Rate (₹)</span>
            </th>

            {/* 9. MRP (₹) */}
            <th className="import-studio-th import-studio-th--mrp text-right" title="Maximum Retail Price">
              <span className="import-studio-th-l1">Max Retail</span>
              <span className="import-studio-th-l2">MRP (₹)</span>
            </th>

            {/* 10. Discount % */}
            <th className="import-studio-th import-studio-th--disc text-right" title="Discount Percentage">
              <span className="import-studio-th-l1">Disc</span>
              <span className="import-studio-th-l2">%</span>
            </th>

            {/* 11. GST % */}
            <th className="import-studio-th import-studio-th--gst text-right" title="Goods & Services Tax %">
              <span className="import-studio-th-l1">GST</span>
              <span className="import-studio-th-l2">Tax %</span>
            </th>

            {/* 12. HSN Code */}
            <th className="import-studio-th import-studio-th--hsn text-center" title="Harmonized System of Nomenclature">
              <span className="import-studio-th-l1">HSN</span>
              <span className="import-studio-th-l2">Code</span>
            </th>

            {/* 13. Net Amount (₹) */}
            <th className="import-studio-th import-studio-th--amount text-right" title="Calculated Net Line Total">
              <span className="import-studio-th-l1">Net</span>
              <span className="import-studio-th-l2">Amount (₹)</span>
            </th>

            {/* 14. Status */}
            <th className="import-studio-th import-studio-th--status text-center" title="Line Validation Status">
              <span className="import-studio-th-l1">Line</span>
              <span className="import-studio-th-l2">Status</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredItems.map(({ item: it, originalIdx }) => {
            const isReady = it.itemStatus === 'READY';
            const lineTotal = it.calculatedAmount ?? 0;
            const hsnDisplay = it.hsnCode?.value ?? it.hsnCode?.raw ?? it.hsn?.value ?? it.hsn?.raw ?? '';

            return (
              <tr key={originalIdx} className="import-studio-tr">
                {/* 1. Row Index */}
                <td className="import-studio-td import-studio-td--idx text-center">
                  <span className="import-studio-idx-num">{originalIdx + 1}</span>
                </td>

                {/* 2. Product Name */}
                <td className="import-studio-td import-studio-td--product">
                  <input
                    type="text"
                    value={it.productName?.value ?? it.productName?.raw ?? ''}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'productName', e.target.value)}
                    placeholder="Product / Medicine Name"
                    className="import-studio-cell-input font-bold text-slate-900"
                  />
                </td>

                {/* 3. Pack */}
                <td className="import-studio-td import-studio-td--pack text-center">
                  <input
                    type="text"
                    value={it.pack?.value?.rawPack ?? it.pack?.raw ?? ''}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'pack', e.target.value)}
                    placeholder="10*10"
                    className="import-studio-cell-input text-center font-mono"
                  />
                </td>

                {/* 4. Batch No */}
                <td className="import-studio-td import-studio-td--batch">
                  <input
                    type="text"
                    value={it.batchNumber?.value ?? it.batchNumber?.raw ?? ''}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'batchNumber', e.target.value)}
                    placeholder="BATCH"
                    className="import-studio-cell-input font-mono font-semibold uppercase text-slate-800"
                  />
                </td>

                {/* 5. Expiry */}
                <td className="import-studio-td import-studio-td--expiry text-center">
                  <input
                    type="text"
                    value={it.expiryDate?.value?.display ?? it.expiryDate?.raw ?? ''}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'expiryDate', e.target.value)}
                    placeholder="MM/YY"
                    className="import-studio-cell-input text-center font-mono"
                  />
                </td>

                {/* 6. Billed Qty */}
                <td className="import-studio-td import-studio-td--qty text-right">
                  <input
                    type="number"
                    value={it.quantity?.value ?? it.quantity?.raw ?? ''}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'quantity', e.target.value)}
                    placeholder="0"
                    className="import-studio-cell-input text-right font-mono font-bold text-slate-900"
                  />
                </td>

                {/* 7. Free Qty */}
                <td className="import-studio-td import-studio-td--free text-right">
                  <input
                    type="number"
                    value={it.freeQuantity?.value ?? it.freeQuantity?.raw ?? 0}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'freeQuantity', e.target.value)}
                    placeholder="0"
                    className="import-studio-cell-input text-right font-mono text-slate-500"
                  />
                </td>

                {/* 8. Purchase Rate (₹) */}
                <td className="import-studio-td import-studio-td--rate text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={it.purchaseRate?.value ?? it.purchaseRate?.raw ?? ''}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'purchaseRate', e.target.value)}
                    placeholder="0.00"
                    className="import-studio-cell-input text-right font-mono font-semibold text-teal-700"
                  />
                </td>

                {/* 9. MRP (₹) */}
                <td className="import-studio-td import-studio-td--mrp text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={it.mrp?.value ?? it.mrp?.raw ?? ''}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'mrp', e.target.value)}
                    placeholder="0.00"
                    className="import-studio-cell-input text-right font-mono text-slate-700"
                  />
                </td>

                {/* 10. Discount % */}
                <td className="import-studio-td import-studio-td--disc text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={it.discountPercent?.value ?? it.discountPercent?.raw ?? 0}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'discountPercent', e.target.value)}
                    placeholder="0"
                    className="import-studio-cell-input text-right font-mono text-slate-600"
                  />
                </td>

                {/* 11. GST % */}
                <td className="import-studio-td import-studio-td--gst text-right">
                  <input
                    type="number"
                    step="0.01"
                    value={it.gstPercent?.value ?? it.gstPercent?.raw ?? 0}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'gstPercent', e.target.value)}
                    placeholder="0"
                    className="import-studio-cell-input text-right font-mono text-slate-600"
                  />
                </td>

                {/* 12. HSN Code */}
                <td className="import-studio-td import-studio-td--hsn text-center">
                  <input
                    type="text"
                    value={hsnDisplay}
                    onChange={(e) => onUpdateBillItem(originalIdx, 'hsnCode', e.target.value)}
                    placeholder="HSN"
                    className="import-studio-cell-input text-center font-mono text-[11px] text-slate-600"
                  />
                </td>

                {/* 13. Net Amount (₹) - Derived & Bold */}
                <td className="import-studio-td import-studio-td--amount text-right font-mono font-bold text-slate-900">
                  ₹{Number(lineTotal).toFixed(2)}
                </td>

                {/* 14. Status Badge */}
                <td className="import-studio-td import-studio-td--status text-center">
                  <span className={`import-studio-badge ${isReady ? 'import-studio-badge--ready' : 'import-studio-badge--review'}`}>
                    {it.itemStatus || 'READY'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
