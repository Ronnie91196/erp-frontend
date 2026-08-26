import React from 'react';

const supplierOptions = [
  'Apex Pharma Distributors',
  'MediCare Wholesale Ltd.',
  'Northstar Healthcare',
  'CuraLife Solutions',
  'Prime Med Supply'
];

const productOptions = [
  'Paracetamol 500mg',
  'Cefixime 200mg',
  'Amoxicillin 250mg',
  'Vitamin C 500mg',
  'Aspirin 75mg',
  'Omeprazole 20mg'
];

const packingOptions = ['10S', '20S', '30S', '60S', '100ML', '200ML', '1X10', '1X20'];

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const createRow = (id) => ({
  id,
  productName: '',
  packing: '',
  hsn: '',
  batchNo: '',
  expiry: '',
  qty: 1,
  free: 0,
  mrp: '',
  nmrp: '',
  rate: '',
  discountPercent: 0,
  gstPercent: 12,
  amount: 0,
});

const recalcRow = (row) => {
  const qty = Number(row.qty) || 0;
  const rate = Number(row.rate) || 0;
  const taxPercent = Number(row.gstPercent) || 0;
  const discountPercent = Number(row.discountPercent) || 0;

  const taxable = qty * rate;
  const discountAmount = taxable * (discountPercent / 100);
  const gstAmount = (taxable - discountAmount) * (taxPercent / 100);
  const amount = taxable - discountAmount + gstAmount;

  return {
    ...row,
    amount: Number(amount.toFixed(2)),
  };
};

export default function Purchases() {
  const [header, setHeader] = React.useState({
    supplier: '',
    billNo: '',
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    lrNo: '',
    status: 'Credit',
  });

  const [rows, setRows] = React.useState([createRow(Date.now())]);
  const [roundOff, setRoundOff] = React.useState(0);

  const updateHeader = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return recalcRow({ ...row, [field]: value });
      })
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createRow(Date.now() + Math.random())]);
  };

  const deleteRow = (id) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  };

  const totals = React.useMemo(() => {
    const subtotal = rows.reduce((sum, row) => sum + (Number(row.qty) || 0) * (Number(row.rate) || 0), 0);
    const discountAmount = rows.reduce((sum, row) => {
      const taxable = (Number(row.qty) || 0) * (Number(row.rate) || 0);
      return sum + taxable * ((Number(row.discountPercent) || 0) / 100);
    }, 0);

    const gstAmount = rows.reduce((sum, row) => {
      const taxable = (Number(row.qty) || 0) * (Number(row.rate) || 0);
      const discount = taxable * ((Number(row.discountPercent) || 0) / 100);
      return sum + (taxable - discount) * ((Number(row.gstPercent) || 0) / 100);
    }, 0);

    const cgstAmount = gstAmount / 2;
    const sgstAmount = gstAmount / 2;
    const grandTotal = subtotal - discountAmount + gstAmount + Number(roundOff || 0);

    return {
      subtotal,
      discountAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      grandTotal,
    };
  }, [rows, roundOff]);

  const handleTableKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addRow();
    }
  };

  return (
    <div className="purchase-entry-page">
      <div className="purchase-entry-card">
        <div className="purchase-header-grid">
          <label className="field-block">
            <span>Supplier / Party Name</span>
            <input
              list="supplier-list"
              value={header.supplier}
              onChange={(e) => updateHeader('supplier', e.target.value)}
            />
            <datalist id="supplier-list">
              {supplierOptions.map((supplier) => (
                <option key={supplier} value={supplier} />
              ))}
            </datalist>
          </label>

          <label className="field-block">
            <span>Invoice / Bill No.</span>
            <input
              value={header.billNo}
              onChange={(e) => updateHeader('billNo', e.target.value)}
            />
          </label>

          <label className="field-block">
            <span>Bill Date</span>
            <input
              type="date"
              value={header.billDate}
              onChange={(e) => updateHeader('billDate', e.target.value)}
            />
          </label>

          <label className="field-block">
            <span>Due Date</span>
            <input
              type="date"
              value={header.dueDate}
              onChange={(e) => updateHeader('dueDate', e.target.value)}
            />
          </label>

          <label className="field-block">
            <span>Transport / L.R. No.</span>
            <input
              value={header.lrNo}
              onChange={(e) => updateHeader('lrNo', e.target.value)}
            />
          </label>

          <label className="field-block status-field">
            <span>Status</span>
            <select
              value={header.status}
              onChange={(e) => updateHeader('status', e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
            </select>
          </label>
        </div>

        <div className="purchase-table-wrap">
          <table className="purchase-table">
            <thead>
              <tr>
                <th style={{ width: 52 }}>SN.</th>
                <th>Product Name</th>
                <th>Packing</th>
                <th>HSN</th>
                <th>Batch No.</th>
                <th>Exp.</th>
                <th>Qty</th>
                <th>Free</th>
                <th>MRP</th>
                <th>NMRP</th>
                <th>Rate</th>
                <th>Disc %</th>
                <th>GST %</th>
                <th>Amount</th>
                <th style={{ width: 44 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      list="product-list"
                      value={row.productName}
                      onChange={(e) => updateRow(row.id, 'productName', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                    <datalist id="product-list">
                      {productOptions.map((product) => (
                        <option key={product} value={product} />
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      list="packing-list"
                      value={row.packing}
                      onChange={(e) => updateRow(row.id, 'packing', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                    <datalist id="packing-list">
                      {packingOptions.map((pack) => (
                        <option key={pack} value={pack} />
                      ))}
                    </datalist>
                  </td>
                  <td>
                    <input
                      value={row.hsn}
                      onChange={(e) => updateRow(row.id, 'hsn', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td>
                    <input
                      value={row.batchNo}
                      onChange={(e) => updateRow(row.id, 'batchNo', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td>
                    <input
                      value={row.expiry}
                      onChange={(e) => updateRow(row.id, 'expiry', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                      placeholder="MM/YY"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={row.qty}
                      onChange={(e) => updateRow(row.id, 'qty', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={row.free}
                      onChange={(e) => updateRow(row.id, 'free', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.mrp}
                      onChange={(e) => updateRow(row.id, 'mrp', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.nmrp}
                      onChange={(e) => updateRow(row.id, 'nmrp', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                      placeholder=""
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.rate}
                      onChange={(e) => updateRow(row.id, 'rate', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.discountPercent}
                      onChange={(e) => updateRow(row.id, 'discountPercent', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.gstPercent}
                      onChange={(e) => updateRow(row.id, 'gstPercent', e.target.value)}
                      onKeyDown={handleTableKeyDown}
                    />
                  </td>
                  <td className="amount-cell">
                    {money(row.amount)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="row-delete"
                      onClick={() => deleteRow(row.id)}
                      aria-label="Delete row"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="purchase-actions">
          <button type="button" className="add-row-btn" onClick={addRow}>
            + Add Row
          </button>
        </div>

        <div className="purchase-summary">
          <div className="summary-row">
            <span>SUB TOTAL</span>
            <strong>{money(totals.subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>DISCOUNT AMOUNT</span>
            <strong>{money(totals.discountAmount)}</strong>
          </div>
          <div className="summary-row">
            <span>CGST Amount</span>
            <strong>{money(totals.cgstAmount)}</strong>
          </div>
          <div className="summary-row">
            <span>SGST Amount</span>
            <strong>{money(totals.sgstAmount)}</strong>
          </div>
          <div className="summary-row">
            <span>ROUND OFF</span>
            <input
              type="number"
              step="0.01"
              value={roundOff}
              onChange={(e) => setRoundOff(Number(e.target.value) || 0)}
              className="roundoff-input"
            />
          </div>
          <div className="summary-row grand-total">
            <span>GRAND TOTAL</span>
            <strong>{money(totals.grandTotal)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}