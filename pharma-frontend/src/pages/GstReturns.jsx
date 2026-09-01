import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Calendar, Download, RefreshCw, Layers,
  Receipt, ArrowUpRight, ArrowDownLeft, ShieldCheck, Printer, CheckCircle
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function GstReturnsPage() {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'gstr1', 'gstr3b', 'hsn'
  const [filterType, setFilterType] = useState('month'); // 'month' or 'custom'

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Fetch GST Report
  const gstQuery = useQuery({
    queryKey: ['gst-report', filterType, selectedYear, selectedMonth, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType === 'month') {
        params.append('year', selectedYear);
        params.append('month', selectedMonth);
      } else {
        if (fromDate) params.append('fromDate', fromDate);
        if (toDate) params.append('toDate', toDate);
      }
      return unwrap(await api.get(`/gst/report?${params.toString()}`));
    },
  });

  const reportData = gstQuery.data || {
    summary: {
      outwardSupplies: {},
      creditNotes: {},
      inputTaxCredit: {},
      netLiability: {},
    },
    rateWiseSummary: [],
    hsnSummary: [],
    b2bInvoices: [],
    b2cInvoices: [],
    creditNotes: [],
  };

  const { summary, rateWiseSummary, hsnSummary, b2bInvoices, b2cInvoices, creditNotes } = reportData;

  // Export to CSV Function
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'gstr1' || activeTab === 'summary') {
      csvContent += 'GSTR-1 OUTWARD SUPPLIES (B2B & B2C)\n';
      csvContent += 'Invoice No,Date,Customer,GSTIN,Taxable Value,CGST,SGST,IGST,Total Tax,Invoice Value\n';
      [...b2bInvoices, ...b2cInvoices].forEach((row) => {
        csvContent += `"${row.invoiceNumber}","${row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString('en-IN') : ''}","${row.customerName}","${row.customerGstin}","${row.taxableValue.toFixed(2)}","${row.cgst.toFixed(2)}","${row.sgst.toFixed(2)}","${row.igst.toFixed(2)}","${row.totalTax.toFixed(2)}","${row.invoiceValue.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'hsn') {
      csvContent += 'GSTR-1 HSN SUMMARY\n';
      csvContent += 'HSN Code,Description,UQC,Total Qty,Taxable Value,CGST,SGST,IGST,Total Value\n';
      hsnSummary.forEach((row) => {
        csvContent += `"${row.hsn}","${row.description}","${row.uqc}","${row.totalQty}","${row.taxable.toFixed(2)}","${row.cgst.toFixed(2)}","${row.sgst.toFixed(2)}","${row.igst.toFixed(2)}","${row.total.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'gstr3b') {
      csvContent += 'GSTR-3B TAX SUMMARY\n';
      csvContent += `Outward Supplies Taxable,"${summary.outwardSupplies?.taxable || 0}"\n`;
      csvContent += `Outward Tax Total,"${summary.outwardSupplies?.totalTax || 0}"\n`;
      csvContent += `Input Tax Credit (ITC),"${summary.inputTaxCredit?.totalItc || 0}"\n`;
      csvContent += `Net GST Payable,"${summary.netLiability?.totalPayable || 0}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GST_Report_${filterType === 'month' ? `${selectedYear}_${selectedMonth}` : 'Custom'}.csv`);
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
            <FileText size={20} color="#007a70" /> GST Returns & Tax Filing Hub (GSTR-1 / GSTR-3B)
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{
              background: '#fff',
              color: '#007a70',
              border: '1px solid #cadcd7',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} /> Print Report
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              background: '#007a70',
              color: '#fff',
              border: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,122,112,0.28)'
            }}
          >
            <Download size={14} /> Export CSV / Excel
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Period Selector Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', background: '#edf7f5', padding: '3px', borderRadius: '6px', border: '1px solid #cadcd7' }}>
              <button
                type="button"
                onClick={() => setFilterType('month')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 0,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterType === 'month' ? '#007a70' : 'transparent',
                  color: filterType === 'month' ? '#fff' : '#133e36',
                }}
              >
                Monthly Filing
              </button>
              <button
                type="button"
                onClick={() => setFilterType('custom')}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 0,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterType === 'custom' ? '#007a70' : 'transparent',
                  color: filterType === 'custom' ? '#fff' : '#133e36',
                }}
              >
                Custom Date Range
              </button>
            </div>

            {filterType === 'month' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', fontWeight: 600 }}
                >
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', fontWeight: 600 }}
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            ) : (
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
            )}
          </div>

          <button
            type="button"
            onClick={() => gstQuery.refetch()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cadcd7',
              background: '#f8faf9',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={gstQuery.isFetching ? 'animate-spin' : ''} /> Refresh Data
          </button>
        </div>

        {/* GST Overview Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {/* Outward Taxable */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Outward Taxable (Sales)</span>
              <ArrowUpRight size={16} color="#007a70" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', marginTop: '4px' }}>
              {money(summary.outwardSupplies?.taxable || 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#007a70', marginTop: '2px', fontWeight: 600 }}>
              Tax: {money(summary.outwardSupplies?.totalTax || 0)} ({summary.outwardSupplies?.invoiceCount || 0} Bills)
            </div>
          </div>

          {/* Inward Purchases / ITC */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Input Tax Credit (ITC)</span>
              <ArrowDownLeft size={16} color="#0284c7" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {money(summary.inputTaxCredit?.totalItc || 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>
              Purchases: {money(summary.inputTaxCredit?.taxable || 0)} ({summary.inputTaxCredit?.purchaseCount || 0} Invoices)
            </div>
          </div>

          {/* Credit Notes / Returns */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Credit Notes (Sales Returns)</span>
              <Receipt size={16} color="#e11d48" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#e11d48', marginTop: '4px' }}>
              {money(summary.creditNotes?.totalValue || 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>
              Tax Reversal: {money(summary.creditNotes?.totalTax || 0)} ({summary.creditNotes?.count || 0} Returns)
            </div>
          </div>

          {/* Net GST Liability */}
          <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #007a70' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase' }}>Net GST Payable (GSTR-3B)</span>
              <ShieldCheck size={18} color="#007a70" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#007a70', marginTop: '4px' }}>
              {money(summary.netLiability?.totalPayable || 0)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#133e36', marginTop: '2px', fontWeight: 700 }}>
              CGST: {money(summary.netLiability?.cgst || 0)} | SGST: {money(summary.netLiability?.sgst || 0)}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #dbe6e3', paddingBottom: '0' }}>
          {[
            { key: 'summary', label: 'Rate-wise Tax Summary' },
            { key: 'gstr1', label: `GSTR-1 Outward Supplies (${b2bInvoices.length + b2cInvoices.length})` },
            { key: 'hsn', label: `HSN Summary (${hsnSummary.length})` },
            { key: 'returns', label: `Credit Notes / Returns (${creditNotes.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 16px',
                border: 0,
                borderBottom: activeTab === tab.key ? '2.5px solid #007a70' : '2.5px solid transparent',
                background: 'transparent',
                color: activeTab === tab.key ? '#007a70' : '#68827c',
                fontWeight: activeTab === tab.key ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                marginBottom: '-2px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Rate-wise Tax Summary */}
        {activeTab === 'summary' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>GST Tax Slab</th>
                  <th className="right">Taxable Value</th>
                  <th className="right">CGST</th>
                  <th className="right">SGST</th>
                  <th className="right">IGST</th>
                  <th className="right">Total GST</th>
                  <th className="right">Total Invoiced Value</th>
                </tr>
              </thead>
              <tbody>
                {rateWiseSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                      No tax transactions found for the selected period.
                    </td>
                  </tr>
                ) : (
                  rateWiseSummary.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <span style={{ fontWeight: 800, color: '#007a70', background: '#edf7f5', padding: '2px 8px', borderRadius: '4px' }}>
                          {row.rate}
                        </span>
                      </td>
                      <td className="right" style={{ fontWeight: 700 }}>{money(row.taxable)}</td>
                      <td className="right">{money(row.cgst)}</td>
                      <td className="right">{money(row.sgst)}</td>
                      <td className="right">{money(row.igst)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#007a70' }}>{money(row.cgst + row.sgst + row.igst)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: GSTR-1 Invoices */}
        {activeTab === 'gstr1' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#f8faf9', borderBottom: '1px solid #dbe6e3', fontWeight: 800, color: '#133e36', fontSize: '13px' }}>
                B2B (Registered Taxpayers with GSTIN) & B2C Invoices
              </div>
              <table className="pos-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Date</th>
                    <th>Customer Name</th>
                    <th>GSTIN</th>
                    <th className="right">Taxable Value</th>
                    <th className="right">CGST</th>
                    <th className="right">SGST</th>
                    <th className="right">IGST</th>
                    <th className="right">Invoice Value</th>
                  </tr>
                </thead>
                <tbody>
                  {[...b2bInvoices, ...b2cInvoices].length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                        No sales invoices recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    [...b2bInvoices, ...b2cInvoices].map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>{inv.invoiceNumber}</td>
                        <td style={{ fontSize: '11px', color: '#555' }}>
                          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>{inv.customerName}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: inv.customerGstin !== '—' ? '#007a70' : '#888' }}>
                          {inv.customerGstin}
                        </td>
                        <td className="right" style={{ fontWeight: 600 }}>{money(inv.taxableValue)}</td>
                        <td className="right">{money(inv.cgst)}</td>
                        <td className="right">{money(inv.sgst)}</td>
                        <td className="right">{money(inv.igst)}</td>
                        <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(inv.invoiceValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: HSN Summary */}
        {activeTab === 'hsn' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>HSN Code</th>
                  <th>Description</th>
                  <th>UQC</th>
                  <th style={{ textAlign: 'center' }}>Total Qty</th>
                  <th className="right">Taxable Value</th>
                  <th className="right">CGST</th>
                  <th className="right">SGST</th>
                  <th className="right">IGST</th>
                  <th className="right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {hsnSummary.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                      No HSN summary data found.
                    </td>
                  </tr>
                ) : (
                  hsnSummary.map((hsn, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>{hsn.hsn}</td>
                      <td><b>{hsn.description}</b></td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{hsn.uqc}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{hsn.totalQty}</td>
                      <td className="right">{money(hsn.taxable)}</td>
                      <td className="right">{money(hsn.cgst)}</td>
                      <td className="right">{money(hsn.sgst)}</td>
                      <td className="right">{money(hsn.igst)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(hsn.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Credit Notes / Sales Returns */}
        {activeTab === 'returns' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Credit Note #</th>
                  <th>Date</th>
                  <th>Original Invoice</th>
                  <th>Customer</th>
                  <th className="right">Taxable Reversal</th>
                  <th className="right">CGST Reversal</th>
                  <th className="right">SGST Reversal</th>
                  <th className="right">Total Credit Issued</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                      No credit notes/sales returns recorded in this period.
                    </td>
                  </tr>
                ) : (
                  creditNotes.map((cn) => (
                    <tr key={cn.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#e11d48' }}>{cn.returnNumber}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>
                        {cn.returnDate ? new Date(cn.returnDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{cn.originalInvoice}</td>
                      <td><b>{cn.customerName}</b></td>
                      <td className="right">{money(cn.taxableValue)}</td>
                      <td className="right">{money(cn.cgst)}</td>
                      <td className="right">{money(cn.sgst)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#e11d48' }}>{money(cn.totalRefund)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
