import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Printer, Download, CheckSquare, Square,
  Calendar, Search, Filter, RefreshCw, Layers, CheckCircle, ArrowRight
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function BulkInvoicingPage() {
  const queryClient = useQueryClient();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [selectedInvoices, setSelectedInvoices] = useState({}); // { [saleId]: true }
  const [activePrintPreview, setActivePrintPreview] = useState(null);

  // Fetch sales for bulk operations
  const salesQuery = useQuery({
    queryKey: ['bulk-sales-list', fromDate, toDate, search, paymentStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (search) params.append('search', search);
      if (paymentStatus !== 'ALL') params.append('paymentStatus', paymentStatus);
      params.append('status', 'COMPLETED');
      const res = unwrap(await api.get(`/sales?${params.toString()}`));
      return Array.isArray(res) ? res : [];
    },
  });

  const sales = salesQuery.data || [];

  // Toggle selection
  const handleToggleSelect = (id) => {
    setSelectedInvoices((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const handleSelectAll = () => {
    if (Object.keys(selectedInvoices).length === sales.length && sales.length > 0) {
      setSelectedInvoices({});
    } else {
      const all = {};
      sales.forEach((s) => { all[s.id] = true; });
      setSelectedInvoices(all);
    }
  };

  const selectedCount = Object.keys(selectedInvoices).length;
  const selectedSaleObjects = useMemo(() => {
    return sales.filter((s) => selectedInvoices[s.id]);
  }, [sales, selectedInvoices]);

  const selectedTotalRevenue = useMemo(() => {
    return selectedSaleObjects.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  }, [selectedSaleObjects]);

  // Bulk Print Generator
  const handleBulkPrint = () => {
    if (selectedSaleObjects.length === 0) {
      return window.alert('Please select at least one invoice to print.');
    }

    const printWin = window.open('', '_blank');
    let invoiceHtmls = selectedSaleObjects.map((sale) => `
      <div style="page-break-after: always; padding: 24px; font-family: sans-serif; max-width: 780px; margin: 0 auto; border-bottom: 2px dashed #ccc;">
        <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #007a70; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; color: #007a70; font-size: 20px;">PHARMA ERP TAX INVOICE</h2>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">Licensed Retail Chemist & Druggist</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 15px; font-weight: bold; font-family: monospace;">${sale.invoiceNumber}</div>
            <div style="font-size: 11px; color: #555;">Date: ${sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString('en-IN') : '-'}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin: 14px 0; font-size: 12px;">
          <div>
            <div style="font-weight: bold; color: #333;">Customer Details:</div>
            <div>${sale.customer?.name || 'Walk-in / Cash Sale'}</div>
            <div>Phone: ${sale.customer?.phone || '—'}</div>
            ${sale.customer?.gstin ? `<div>GSTIN: ${sale.customer.gstin}</div>` : ''}
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; color: #333;">Prescribed By:</div>
            <div>${sale.doctorRel?.name || sale.doctor || 'Registered Medical Practitioner'}</div>
            ${sale.doctorRel?.registrationNo ? `<div>Reg No: ${sale.doctorRel.registrationNo}</div>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin: 14px 0;">
          <thead>
            <tr style="background: #edf7f5; border-top: 1px solid #cadcd7; border-bottom: 1px solid #cadcd7;">
              <th style="padding: 6px; text-align: left;">#</th>
              <th style="padding: 6px; text-align: left;">Medicine / Description</th>
              <th style="padding: 6px; text-align: left;">Batch</th>
              <th style="padding: 6px; text-align: center;">Qty</th>
              <th style="padding: 6px; text-align: right;">MRP</th>
              <th style="padding: 6px; text-align: right;">Disc</th>
              <th style="padding: 6px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(sale.items || []).map((it, idx) => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 5px;">${idx + 1}</td>
                <td style="padding: 5px;"><b>${it.product?.name || 'Medicine'}</b></td>
                <td style="padding: 5px; font-family: monospace;">${it.batch?.batchNumber || '—'}</td>
                <td style="padding: 5px; text-align: center;">${it.quantity}</td>
                <td style="padding: 5px; text-align: right;">₹${Number(it.unitPrice || 0).toFixed(2)}</td>
                <td style="padding: 5px; text-align: right;">${Number(it.discountPercent || 0)}%</td>
                <td style="padding: 5px; text-align: right; font-weight: bold;">₹${Number(it.totalAmount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
          <div style="width: 240px; font-size: 12px; line-height: 1.6;">
            <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>GST Tax:</span><span>₹${(Number(sale.cgstAmount || 0) + Number(sale.sgstAmount || 0) + Number(sale.igstAmount || 0)).toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; color: #007a70; border-top: 1px solid #ddd; padding-top: 4px;">
              <span>Grand Total:</span><span>₹${Number(sale.totalAmount || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666;">
              <span>Paid: ₹${Number(sale.paidAmount || 0).toFixed(2)}</span>
              <span>Due: ₹${Number(sale.dueAmount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; font-size: 10px; color: #888; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 6px;">
          Thank you for your visit! Medicines once sold cannot be returned without original batch verification.
        </div>
      </div>
    `).join('');

    printWin.document.write(`
      <html>
        <head>
          <title>Bulk Invoices Print (${selectedSaleObjects.length} Bills)</title>
          <style>
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body onload="window.print();">
          ${invoiceHtmls}
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Bulk Export to CSV
  const handleBulkExportCSV = () => {
    if (selectedSaleObjects.length === 0) {
      return window.alert('Please select at least one invoice to export.');
    }

    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'BULK SALES INVOICES EXPORT\n';
    csv += 'Invoice Number,Date,Customer Name,Phone,Doctor,Items Count,Subtotal,Tax Amount,Total Amount,Paid Amount,Due Amount,Payment Status\n';

    selectedSaleObjects.forEach((s) => {
      const tax = Number(s.cgstAmount || 0) + Number(s.sgstAmount || 0) + Number(s.igstAmount || 0);
      csv += `"${s.invoiceNumber}","${s.invoiceDate ? new Date(s.invoiceDate).toLocaleDateString('en-IN') : ''}","${s.customer?.name || 'Walk-in'}","${s.customer?.phone || '—'}","${s.doctorRel?.name || s.doctor || '—'}","${s.items?.length || 0}","${Number(s.subtotal || 0).toFixed(2)}","${tax.toFixed(2)}","${Number(s.totalAmount || 0).toFixed(2)}","${Number(s.paidAmount || 0).toFixed(2)}","${Number(s.dueAmount || 0).toFixed(2)}","${s.paymentStatus}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bulk_Invoices_${selectedSaleObjects.length}_Bills.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={20} color="#007a70" /> Bulk Invoicing & Batch Operations
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleBulkPrint}
            disabled={selectedCount === 0}
            style={{
              background: selectedCount > 0 ? '#007a70' : '#e2ece9',
              color: selectedCount > 0 ? '#fff' : '#889f9a',
              border: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '7px 16px',
              borderRadius: '6px',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: selectedCount > 0 ? '0 2px 6px rgba(0,122,112,0.28)' : 'none'
            }}
          >
            <Printer size={14} /> Bulk Print Invoices ({selectedCount})
          </button>
          <button
            onClick={handleBulkExportCSV}
            disabled={selectedCount === 0}
            style={{
              background: '#fff',
              color: '#007a70',
              border: '1px solid #cadcd7',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '7px 14px',
              borderRadius: '6px',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            <Download size={14} /> Export Selected ({selectedCount})
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Available Invoices</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#133e36', marginTop: '4px' }}>
              {sales.length} Invoices
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Completed & Ready for Batch Action
            </div>
          </div>

          <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #007a70' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase' }}>Selected for Batch Operation</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#007a70', marginTop: '4px' }}>
              {selectedCount} Selected
            </div>
            <div style={{ fontSize: '10.5px', color: '#133e36', marginTop: '2px', fontWeight: 700 }}>
              Batch Total: {money(selectedTotalRevenue)}
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#007a70" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd' }}
                title="From Date"
              />
              <span style={{ fontSize: '11px', color: '#889f9a' }}>to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd' }}
                title="To Date"
              />
            </div>

            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', fontWeight: 600 }}
            >
              <option value="ALL">All Payment Status</option>
              <option value="PAID">Fully Paid</option>
              <option value="UNPAID">Unpaid / Credit</option>
              <option value="PARTIAL">Partially Paid</option>
            </select>

            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, customer name..."
                style={{
                  width: '100%',
                  height: '34px',
                  paddingLeft: '30px',
                  paddingRight: '10px',
                  borderRadius: '6px',
                  border: '1px solid #cadcd7',
                  fontSize: '11.5px',
                  background: '#fcfdfd',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                background: '#f8faf9',
                fontSize: '11px',
                fontWeight: 700,
                color: '#133e36',
                cursor: 'pointer'
              }}
            >
              {selectedCount === sales.length && sales.length > 0 ? (
                <>
                  <CheckSquare size={14} color="#007a70" /> Deselect All
                </>
              ) : (
                <>
                  <Square size={14} color="#68827c" /> Select All ({sales.length})
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => salesQuery.refetch()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                background: '#edf7f5',
                color: '#007a70',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} className={salesQuery.isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Invoices Selection Table */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedCount === sales.length && sales.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Invoice No.</th>
                <th>Date</th>
                <th>Customer Name</th>
                <th>Doctor</th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th className="right">Subtotal</th>
                <th className="right">Tax</th>
                <th className="right">Total Amount</th>
                <th className="center">Payment</th>
              </tr>
            </thead>
            <tbody>
              {salesQuery.isLoading && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    Loading invoices...
                  </td>
                </tr>
              )}
              {!salesQuery.isLoading && sales.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    No completed sales invoices found matching criteria.
                  </td>
                </tr>
              )}
              {sales.map((sale) => {
                const isSelected = Boolean(selectedInvoices[sale.id]);
                const tax = Number(sale.cgstAmount || 0) + Number(sale.sgstAmount || 0) + Number(sale.igstAmount || 0);

                return (
                  <tr
                    key={sale.id}
                    style={{ background: isSelected ? '#edf7f5' : '#fff', cursor: 'pointer' }}
                    onClick={() => handleToggleSelect(sale.id)}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(sale.id)}
                      />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>
                      {sale.invoiceNumber}
                    </td>
                    <td style={{ fontSize: '11px', color: '#555' }}>
                      {sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#133e36' }}>{sale.customer?.name || 'Walk-in / Cash'}</div>
                      {sale.customer?.phone && <div style={{ fontSize: '10px', color: '#68827c' }}>📞 {sale.customer.phone}</div>}
                    </td>
                    <td style={{ fontSize: '11px', color: '#555' }}>
                      {sale.doctorRel?.name || sale.doctor || '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {sale.items?.length || 0}
                    </td>
                    <td className="right">{money(sale.subtotal)}</td>
                    <td className="right">{money(tax)}</td>
                    <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>
                      {money(sale.totalAmount)}
                    </td>
                    <td className="center">
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: sale.paymentStatus === 'PAID' ? '#ecfdf5' : '#fef3c7',
                        color: sale.paymentStatus === 'PAID' ? '#059669' : '#b45309',
                        border: '1px solid #cadcd7'
                      }}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
