import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ReceiptText, Calendar, Download, RefreshCw,
  Truck, DollarSign, Package, Percent, Printer, Search, Eye, X, Layers
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function PurchasesReportPage() {
  const [activeTab, setActiveTab] = useState('suppliers'); // 'suppliers', 'products', 'daily', 'invoices'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Fetch Purchases Report Data
  const reportQuery = useQuery({
    queryKey: ['purchases-report', fromDate, toDate, search, paymentStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (search) params.append('search', search);
      if (paymentStatus !== 'ALL') params.append('paymentStatus', paymentStatus);
      return unwrap(await api.get(`/purchases-report/report?${params.toString()}`));
    },
  });

  const reportData = reportQuery.data || {
    summary: {
      totalBills: 0,
      totalGrossPurchases: 0,
      totalDiscount: 0,
      totalTaxable: 0,
      totalGst: 0,
      totalNetPurchases: 0,
      totalPaid: 0,
      totalDue: 0,
      totalItemsCount: 0,
    },
    dailyTrends: [],
    supplierBreakdown: [],
    topProducts: [],
    invoices: [],
  };

  const { summary, dailyTrends, supplierBreakdown, topProducts, invoices } = reportData;

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'PHARMACY PURCHASES & PROCUREMENT REPORT\n';
    csvContent += `Generated On,"${new Date().toLocaleString('en-IN')}"\n\n`;

    if (activeTab === 'suppliers') {
      csvContent += 'Supplier Name,Phone,GSTIN,Bills Count,Total Purchases,Paid Amount,Due Balance\n';
      supplierBreakdown.forEach((s) => {
        csvContent += `"${s.supplierName}","${s.phone}","${s.gstin}","${s.invoicesCount}","${s.totalPurchases.toFixed(2)}","${s.paidAmount.toFixed(2)}","${s.dueAmount.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'products') {
      csvContent += 'Medicine Name,Generic Salt,Category,Quantity Procured,Free Goods,Total Cost\n';
      topProducts.forEach((p) => {
        csvContent += `"${p.name}","${p.generic}","${p.category}","${p.quantity}","${p.freeQuantity}","${p.totalCost.toFixed(2)}"\n`;
      });
    } else {
      csvContent += 'Invoice No,Date,Supplier Name,GSTIN,Taxable,Tax,Total Bill,Paid,Due,Status\n';
      invoices.forEach((inv) => {
        csvContent += `"${inv.invoiceNumber}","${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : ''}","${inv.supplierName}","${inv.supplierGstin}","${inv.subtotal}","${inv.taxAmount}","${inv.totalAmount}","${inv.paidAmount}","${inv.dueAmount}","${inv.paymentStatus}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchases_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <ReceiptText size={20} color="#007a70" /> Purchases & Supplier Procurement Report
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
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Filter Bar */}
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
              <option value="PAID">Paid Invoices</option>
              <option value="UNPAID">Unpaid Invoices</option>
              <option value="PARTIAL">Partial Payments</option>
            </select>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice #, supplier, or GSTIN..."
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
            {(fromDate || toDate || search || paymentStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearch('');
                  setPaymentStatus('ALL');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  background: '#fff1f2',
                  color: '#e11d48',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => reportQuery.refetch()}
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
              <RefreshCw size={13} className={reportQuery.isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Executive KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Net Procurement */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Purchases</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
              {money(summary.totalNetPurchases)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#007a70', marginTop: '2px', fontWeight: 600 }}>
              {summary.totalBills} Bills | {summary.totalItemsCount} Units
            </div>
          </div>

          {/* Supplier Payments Paid */}
          <div style={{ background: '#ecfdf5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #059669' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Payments Settled</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {money(summary.totalPaid)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#065f46', marginTop: '2px' }}>
              Paid to Suppliers
            </div>
          </div>

          {/* Accounts Payable / Due */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Accounts Payable (Due)</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: summary.totalDue > 0 ? '#e11d48' : '#133e36', marginTop: '4px' }}>
              {money(summary.totalDue)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#e11d48', marginTop: '2px', fontWeight: 600 }}>
              Pending Supplier Dues
            </div>
          </div>

          {/* GST Input Tax Credit */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>GST Input Tax (ITC)</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
              {money(summary.totalGst)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Eligible for Claim
            </div>
          </div>
        </div>

        {/* Breakdown Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #dbe6e3', paddingBottom: '0' }}>
          {[
            { key: 'suppliers', label: `Supplier Breakdown (${supplierBreakdown.length})` },
            { key: 'products', label: `Top Procured Medicines (${topProducts.length})` },
            { key: 'daily', label: `Daily Purchases (${dailyTrends.length} Days)` },
            { key: 'invoices', label: `Purchases Ledger (${invoices.length})` },
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

        {/* Tab 1: Supplier Breakdown */}
        {activeTab === 'suppliers' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>GSTIN</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'center' }}>Bills</th>
                  <th className="right">Total Purchases</th>
                  <th className="right">Paid Amount</th>
                  <th className="right">Outstanding Balance</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {supplierBreakdown.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No supplier purchases found.</td></tr>
                ) : (
                  supplierBreakdown.map((s, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedEntity({ type: 'SUPPLIER', data: s })}
                      className="hover:bg-teal-50/40"
                    >
                      <td><b style={{ color: '#133e36' }}>{s.supplierName}</b></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#007a70' }}>{s.gstin}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{s.phone}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.invoicesCount}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(s.totalPurchases)}</td>
                      <td className="right" style={{ fontWeight: 700, color: '#059669' }}>{money(s.paidAmount)}</td>
                      <td className="right" style={{ fontWeight: 800, color: s.dueAmount > 0 ? '#e11d48' : '#68827c' }}>{money(s.dueAmount)}</td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntity({ type: 'SUPPLIER', data: s })}
                          style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Top Procured Medicines */}
        {activeTab === 'products' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Medicine Name</th>
                  <th>Generic Salt</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Total Qty Received</th>
                  <th style={{ textAlign: 'center' }}>Free Goods</th>
                  <th className="right">Total Purchase Cost</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No products recorded.</td></tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedEntity({ type: 'PRODUCT', data: p })}
                      className="hover:bg-teal-50/40"
                    >
                      <td style={{ fontWeight: 800, color: '#007a70' }}>#{idx + 1}</td>
                      <td><b>{p.name}</b></td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{p.generic}</td>
                      <td>
                        <span style={{ fontSize: '10px', background: '#edf7f5', color: '#007a70', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {p.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.quantity}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                        {p.freeQuantity > 0 ? `+${p.freeQuantity}` : '—'}
                      </td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(p.totalCost)}</td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntity({ type: 'PRODUCT', data: p })}
                          style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Daily Purchases */}
        {activeTab === 'daily' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Invoices Received</th>
                  <th className="right">Purchase Total</th>
                  <th className="right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrends.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No daily purchases found.</td></tr>
                ) : (
                  dailyTrends.map((d) => (
                    <tr key={d.date}>
                      <td><b>{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</b></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{d.invoices}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(d.totalAmount)}</td>
                      <td className="right" style={{ fontWeight: 700, color: '#059669' }}>{money(d.paidAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Invoices Ledger */}
        {activeTab === 'invoices' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th className="right">Taxable</th>
                  <th className="right">Tax</th>
                  <th className="right">Total Amount</th>
                  <th className="right">Paid</th>
                  <th className="right">Due</th>
                  <th className="center">Status</th>
                  <th className="center" style={{ width: '70px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No purchase invoices found.</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedInvoice(inv)}
                      className="hover:bg-teal-50/40"
                    >
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>{inv.invoiceNumber}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>
                        {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td><b>{inv.supplierName}</b></td>
                      <td className="right">{money(inv.subtotal)}</td>
                      <td className="right">{money(inv.taxAmount)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(inv.totalAmount)}</td>
                      <td className="right" style={{ color: '#059669', fontWeight: 700 }}>{money(inv.paidAmount)}</td>
                      <td className="right" style={{ color: inv.dueAmount > 0 ? '#e11d48' : '#68827c', fontWeight: 800 }}>
                        {money(inv.dueAmount)}
                      </td>
                      <td className="center">
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: inv.paymentStatus === 'PAID' ? '#ecfdf5' : '#fef3c7',
                          color: inv.paymentStatus === 'PAID' ? '#059669' : '#b45309',
                          border: '1px solid #cadcd7'
                        }}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cadcd7',
                            background: '#edf7f5',
                            color: '#007a70',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchase Invoice Details Modal */}
      {selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(780px, 95vw)',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', background: '#f8faf9', borderBottom: '1px solid #dbe6e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: '16px', color: '#133e36' }}>Purchase Invoice: {selectedInvoice.invoiceNumber}</b>
                <div style={{ fontSize: '11px', color: '#68827c' }}>
                  Received on {selectedInvoice.invoiceDate ? `${new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')} ${new Date(selectedInvoice.invoiceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '-'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8faf9', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Supplier Details</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36', marginTop: '2px' }}>{selectedInvoice.supplierName}</div>
                  {selectedInvoice.supplierPhone !== '—' && <div style={{ fontSize: '11px', color: '#555' }}>📞 {selectedInvoice.supplierPhone}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>GSTIN & Payment Status</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#007a70', marginTop: '2px', fontFamily: 'monospace' }}>
                    {selectedInvoice.supplierGstin || 'Unregistered'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#555' }}>Status: <b>{selectedInvoice.paymentStatus}</b></div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36', marginBottom: '6px' }}>Received Medicine Inventory Breakdown</div>
                <table className="pos-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th style={{ textAlign: 'center' }}>Qty Received</th>
                      <th className="right">Purchase Rate</th>
                      <th className="right">MRP</th>
                      <th className="right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <b>{it.name}</b>
                          {it.genericName && it.genericName !== '—' && <div style={{ fontSize: '10px', color: '#68827c' }}>{it.genericName}</div>}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{it.batchNumber}</td>
                        <td style={{ fontSize: '10.5px', color: '#555' }}>{it.expiryDate ? new Date(it.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {it.quantity} {it.unitName} {it.freeQuantity > 0 ? `(+${it.freeQuantity} Free)` : ''}
                        </td>
                        <td className="right">{money(it.unitPrice)}</td>
                        <td className="right">{money(it.mrp)}</td>
                        <td className="right" style={{ fontWeight: 700, color: '#133e36' }}>{money(it.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8faf9', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#555' }}>
                  Taxable: {money(selectedInvoice.subtotal)} | Tax (ITC): {money(selectedInvoice.taxAmount)} | Paid: {money(selectedInvoice.paidAmount)} | Due: <b style={{ color: selectedInvoice.dueAmount > 0 ? '#e11d48' : '#059669' }}>{money(selectedInvoice.dueAmount)}</b>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#68827c' }}>Grand Total Bill: </span>
                  <b style={{ fontSize: '18px', color: '#007a70', marginLeft: '6px' }}>{money(selectedInvoice.totalAmount)}</b>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#fff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier / Product Entity Popup Modal */}
      {selectedEntity && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setSelectedEntity(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(680px, 95vw)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', background: '#f8faf9', borderBottom: '1px solid #dbe6e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: '16px', color: '#133e36' }}>
                  {selectedEntity.type === 'SUPPLIER' && `Supplier Details: ${selectedEntity.data.supplierName}`}
                  {selectedEntity.type === 'PRODUCT' && `Procured Product: ${selectedEntity.data.name}`}
                </b>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedEntity.type === 'SUPPLIER' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '6px', border: '1px solid #cadcd7' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedEntity.data.supplierName}</div>
                    <div style={{ fontSize: '12px', color: '#007a70', marginTop: '2px' }}>GSTIN: {selectedEntity.data.gstin} | Drug Lic: {selectedEntity.data.drugLicenseNo}</div>
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>📞 Phone: {selectedEntity.data.phone}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Purchase Orders</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedEntity.data.invoicesCount} Invoices</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Amount Billed</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{money(selectedEntity.data.totalPurchases)}</div>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '10.5px', color: '#065f46', textTransform: 'uppercase', fontWeight: 700 }}>Payments Settled</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{money(selectedEntity.data.paidAmount)}</div>
                    </div>
                    <div style={{ background: selectedEntity.data.dueAmount > 0 ? '#fff1f2' : '#f8faf9', padding: '12px', borderRadius: '6px', border: selectedEntity.data.dueAmount > 0 ? '1px solid #fecaca' : '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: selectedEntity.data.dueAmount > 0 ? '#e11d48' : '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Pending Supplier Due</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: selectedEntity.data.dueAmount > 0 ? '#e11d48' : '#133e36', marginTop: '2px' }}>{money(selectedEntity.data.dueAmount)}</div>
                    </div>
                  </div>

                  {selectedEntity.data.invoices && selectedEntity.data.invoices.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36', marginBottom: '6px' }}>Consignments from this Supplier</div>
                      <table className="pos-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Invoice No.</th>
                            <th>Date</th>
                            <th className="right">Total</th>
                            <th className="right">Due</th>
                            <th className="center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEntity.data.invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#007a70' }}>{inv.invoiceNumber}</td>
                              <td style={{ fontSize: '11px', color: '#555' }}>{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '-'}</td>
                              <td className="right" style={{ fontWeight: 700 }}>{money(inv.totalAmount)}</td>
                              <td className="right" style={{ color: inv.dueAmount > 0 ? '#e11d48' : '#68827c' }}>{money(inv.dueAmount)}</td>
                              <td className="center">
                                <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#ecfdf5', color: '#059669', fontWeight: 700 }}>
                                  {inv.paymentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {selectedEntity.type === 'PRODUCT' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '6px', border: '1px solid #cadcd7' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedEntity.data.name}</div>
                    <div style={{ fontSize: '12px', color: '#007a70', marginTop: '2px' }}>Salt: {selectedEntity.data.generic}</div>
                    <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>Category: {selectedEntity.data.category}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Quantity Procured</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedEntity.data.quantity} Units</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Free Stock Goods</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>+{selectedEntity.data.freeQuantity} Free Units</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9', gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Purchase Cost</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{money(selectedEntity.data.totalCost)}</div>
                    </div>
                  </div>

                  {selectedEntity.data.batches && selectedEntity.data.batches.length > 0 && (
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36', marginBottom: '6px' }}>Received Consignment Batches</div>
                      <table className="pos-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Batch No.</th>
                            <th>Expiry</th>
                            <th>Supplier</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th className="right">Purchase Rate</th>
                            <th className="right">MRP</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedEntity.data.batches.map((b, idx) => (
                            <tr key={idx}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{b.batchNumber}</td>
                              <td style={{ fontSize: '10.5px', color: '#555' }}>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '-'}</td>
                              <td style={{ fontSize: '11px', color: '#555' }}>{b.supplierName}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{b.quantity}</td>
                              <td className="right">{money(b.unitPrice)}</td>
                              <td className="right" style={{ fontWeight: 700 }}>{money(b.mrp)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#fff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
