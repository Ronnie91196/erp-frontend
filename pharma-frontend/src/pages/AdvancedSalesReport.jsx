import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, Calendar, Download, RefreshCw,
  Printer, Search, Eye, X, FileText, Stethoscope,
  User, Package, Truck, Layers, DollarSign, Filter
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function AdvancedSalesReportPage() {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'products', 'customers', 'suppliers', 'doctors', 'categories', 'invoices'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);

  // Fetch Report Data
  const reportQuery = useQuery({
    queryKey: ['advanced-sales-report', fromDate, toDate, search, paymentStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (search) params.append('search', search);
      if (paymentStatus !== 'ALL') params.append('paymentStatus', paymentStatus);
      return unwrap(await api.get(`/sales-report/advanced?${params.toString()}`));
    },
  });

  const reportData = reportQuery.data || {
    summary: {
      totalInvoices: 0,
      totalGrossRevenue: 0,
      totalDiscount: 0,
      totalTaxable: 0,
      totalGst: 0,
      totalNetRevenue: 0,
      totalPaid: 0,
      totalDue: 0,
      totalCostOfGoods: 0,
      grossProfit: 0,
      profitMarginPercent: 0,
      avgOrderValue: 0,
      totalItemsSold: 0,
    },
    dailyTrends: [],
    topProducts: [],
    customerPerformance: [],
    supplierPerformance: [],
    doctorPerformance: [],
    categoryBreakdown: [],
    invoices: [],
  };

  const {
    summary,
    dailyTrends,
    topProducts,
    customerPerformance,
    supplierPerformance,
    doctorPerformance,
    categoryBreakdown,
    invoices,
  } = reportData;

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'PHARMACY ADVANCED SALES & PROFIT REPORT\n';
    csvContent += `Generated On,"${new Date().toLocaleString('en-IN')}"\n\n`;

    if (activeTab === 'daily') {
      csvContent += 'Date,Invoices Count,Net Revenue,Gross Profit\n';
      dailyTrends.forEach((d) => {
        csvContent += `"${d.date}","${d.invoices}","${d.revenue.toFixed(2)}","${d.profit.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'products') {
      csvContent += 'Medicine Name,Generic Salt,Category,Units Sold,Revenue,Cost,Gross Profit,Margin %\n';
      topProducts.forEach((p) => {
        const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0;
        csvContent += `"${p.name}","${p.generic}","${p.category}","${p.quantity}","${p.revenue.toFixed(2)}","${p.cost.toFixed(2)}","${p.profit.toFixed(2)}","${margin}%"\n`;
      });
    } else if (activeTab === 'customers') {
      csvContent += 'Customer Name,Phone,Bills Count,Total Purchases,Amount Paid,Due Balance\n';
      customerPerformance.forEach((c) => {
        csvContent += `"${c.name}","${c.phone}","${c.invoices}","${c.revenue.toFixed(2)}","${c.paid.toFixed(2)}","${c.due.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'suppliers') {
      csvContent += 'Supplier / Distributor,GSTIN,Quantity Sold,Sales Revenue,Procurement Cost,Gross Profit Margin\n';
      supplierPerformance.forEach((s) => {
        csvContent += `"${s.supplierName}","${s.gstin}","${s.quantitySold}","${s.salesRevenue.toFixed(2)}","${s.procurementCost.toFixed(2)}","${s.grossMargin.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'doctors') {
      csvContent += 'Doctor Name,Prescriptions Count,Total Revenue Generated\n';
      doctorPerformance.forEach((doc) => {
        csvContent += `"${doc.doctor}","${doc.invoices}","${doc.revenue.toFixed(2)}"\n`;
      });
    } else {
      csvContent += 'Invoice No,Date,Customer,Doctor,Taxable,Tax,Total Amount,Paid,Due,Status\n';
      invoices.forEach((inv) => {
        csvContent += `"${inv.invoiceNumber}","${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : ''}","${inv.customerName}","${inv.doctorName}","${inv.subtotal}","${inv.taxAmount}","${inv.totalAmount}","${inv.paidAmount}","${inv.dueAmount}","${inv.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <TrendingUp size={20} color="#007a70" /> Comprehensive Sales & Profit Analytics
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
              <option value="UNPAID">Unpaid / Credit Due</option>
              <option value="PARTIAL">Partially Paid</option>
            </select>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, customer, doctor..."
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
          {/* Net Sales Revenue */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Net Sales Revenue</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
              {money(summary.totalNetRevenue)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#007a70', marginTop: '2px', fontWeight: 600 }}>
              {summary.totalInvoices} Invoices | {summary.totalItemsSold} Units Sold
            </div>
          </div>

          {/* Gross Profit & Margin */}
          <div style={{ background: '#ecfdf5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #059669' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Gross Profit & Margin</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {money(summary.grossProfit)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#065f46', marginTop: '2px', fontWeight: 700 }}>
              Margin: {summary.profitMarginPercent}% (Cost: {money(summary.totalCostOfGoods)})
            </div>
          </div>

          {/* Average Bill Value */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Average Bill Size (AOV)</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
              {money(summary.avgOrderValue)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Per Customer Transaction
            </div>
          </div>

          {/* Outstanding Receivables */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Outstanding Customer Due</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: summary.totalDue > 0 ? '#e11d48' : '#133e36', marginTop: '4px' }}>
              {money(summary.totalDue)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Collected: {money(summary.totalPaid)}
            </div>
          </div>
        </div>

        {/* 7 Analytical Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #dbe6e3', paddingBottom: '0', overflowX: 'auto' }}>
          {[
            { key: 'daily', label: `Daily Trends (${dailyTrends.length} Days)` },
            { key: 'products', label: `Medicine-wise (${topProducts.length})` },
            { key: 'customers', label: `Customer-wise (${customerPerformance.length})` },
            { key: 'suppliers', label: `Supplier-wise (${supplierPerformance.length})` },
            { key: 'doctors', label: `Doctor Referrals (${doctorPerformance.length})` },
            { key: 'categories', label: `Categories (${categoryBreakdown.length})` },
            { key: 'invoices', label: `Invoices Ledger (${invoices.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 14px',
                border: 0,
                borderBottom: activeTab === tab.key ? '2.5px solid #007a70' : '2.5px solid transparent',
                background: 'transparent',
                color: activeTab === tab.key ? '#007a70' : '#68827c',
                fontWeight: activeTab === tab.key ? 800 : 600,
                fontSize: '12px',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Daily Trends */}
        {activeTab === 'daily' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style={{ textAlign: 'center' }}>Invoices Billed</th>
                  <th className="right">Net Sales Revenue</th>
                  <th className="right">Gross Profit</th>
                  <th className="right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {dailyTrends.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No daily sales recorded.</td></tr>
                ) : (
                  dailyTrends.map((d) => {
                    const margin = d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) : 0;
                    return (
                      <tr key={d.date}>
                        <td><b>{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</b></td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{d.invoices}</td>
                        <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(d.revenue)}</td>
                        <td className="right" style={{ fontWeight: 800, color: '#059669' }}>{money(d.profit)}</td>
                        <td className="right" style={{ fontWeight: 700, color: '#007a70' }}>{margin}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Medicine-wise Breakdown */}
        {activeTab === 'products' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Medicine Name</th>
                  <th>Generic Salt</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th className="right">Revenue</th>
                  <th className="right">Procurement Cost</th>
                  <th className="right">Gross Margin</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No product sales recorded.</td></tr>
                ) : (
                  topProducts.map((p, idx) => {
                    const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : 0;
                    return (
                      <tr
                        key={idx}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedItemDetail({ type: 'MEDICINE', data: p })}
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
                        <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(p.revenue)}</td>
                        <td className="right" style={{ color: '#68827c' }}>{money(p.cost)}</td>
                        <td className="right" style={{ fontWeight: 800, color: '#059669' }}>
                          {money(p.profit)} <span style={{ fontSize: '10px', color: '#007a70' }}>({margin}%)</span>
                        </td>
                        <td className="center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedItemDetail({ type: 'MEDICINE', data: p })}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Customer-wise Sales Breakdown */}
        {activeTab === 'customers' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>GSTIN</th>
                  <th style={{ textAlign: 'center' }}>Invoices Billed</th>
                  <th className="right">Total Purchases</th>
                  <th className="right">Amount Paid</th>
                  <th className="right">Outstanding Balance</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {customerPerformance.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No customer sales found.</td></tr>
                ) : (
                  customerPerformance.map((c, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedItemDetail({ type: 'CUSTOMER', data: c })}
                      className="hover:bg-teal-50/40"
                    >
                      <td><b style={{ color: '#133e36' }}>{c.name}</b></td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{c.phone}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#007a70' }}>{c.gstin}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.invoices}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(c.revenue)}</td>
                      <td className="right" style={{ fontWeight: 700, color: '#059669' }}>{money(c.paid)}</td>
                      <td className="right" style={{ fontWeight: 800, color: c.due > 0 ? '#e11d48' : '#68827c' }}>
                        {money(c.due)}
                      </td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedItemDetail({ type: 'CUSTOMER', data: c })}
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

        {/* Tab 4: Supplier-wise Sales Contribution */}
        {activeTab === 'suppliers' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Supplier / Distributor</th>
                  <th>GSTIN</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th className="right">Sales Turnover</th>
                  <th className="right">Cost of Goods</th>
                  <th className="right">Gross Margin</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {supplierPerformance.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No supplier distribution data found.</td></tr>
                ) : (
                  supplierPerformance.map((s, idx) => {
                    const margin = s.salesRevenue > 0 ? ((s.grossMargin / s.salesRevenue) * 100).toFixed(1) : 0;
                    return (
                      <tr
                        key={idx}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedItemDetail({ type: 'SUPPLIER', data: s })}
                        className="hover:bg-teal-50/40"
                      >
                        <td><b style={{ color: '#133e36' }}>{s.supplierName}</b></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#007a70' }}>{s.gstin}</td>
                        <td style={{ fontSize: '11px', color: '#555' }}>{s.phone}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.quantitySold}</td>
                        <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(s.salesRevenue)}</td>
                        <td className="right" style={{ color: '#68827c' }}>{money(s.procurementCost)}</td>
                        <td className="right" style={{ fontWeight: 800, color: '#059669' }}>
                          {money(s.grossMargin)} <span style={{ fontSize: '10px', color: '#007a70' }}>({margin}%)</span>
                        </td>
                        <td className="center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setSelectedItemDetail({ type: 'SUPPLIER', data: s })}
                            style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Doctor Referrals */}
        {activeTab === 'doctors' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Prescribing Doctor</th>
                  <th>Reg. Number</th>
                  <th>Phone</th>
                  <th style={{ textAlign: 'center' }}>Prescriptions / Bills</th>
                  <th style={{ textAlign: 'center' }}>Medicines Dispensed</th>
                  <th className="right">Total Revenue Generated</th>
                  <th className="right">Avg Value / Rx</th>
                </tr>
              </thead>
              <tbody>
                {doctorPerformance.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No doctor performance data available.</td></tr>
                ) : (
                  doctorPerformance.map((doc, idx) => (
                    <tr key={idx}>
                      <td><b style={{ color: '#133e36' }}>{doc.doctor}</b></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#007a70' }}>{doc.registrationNo}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{doc.phone}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{doc.invoices}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{doc.medicinesSold}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#007a70' }}>{money(doc.revenue)}</td>
                      <td className="right" style={{ fontWeight: 600 }}>{money(doc.invoices > 0 ? doc.revenue / doc.invoices : 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 6: Categories */}
        {activeTab === 'categories' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Total Quantity Sold</th>
                  <th className="right">Category Turnover</th>
                  <th className="right">Gross Margin</th>
                </tr>
              </thead>
              <tbody>
                {categoryBreakdown.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No category data available.</td></tr>
                ) : (
                  categoryBreakdown.map((cat, idx) => (
                    <tr key={idx}>
                      <td><b style={{ color: '#133e36' }}>{cat.category}</b></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{cat.quantity}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(cat.revenue)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#059669' }}>{money(cat.profit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 7: Invoices List */}
        {activeTab === 'invoices' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Doctor</th>
                  <th className="right">Taxable</th>
                  <th className="right">Tax</th>
                  <th className="right">Total</th>
                  <th className="right">Paid</th>
                  <th className="right">Due</th>
                  <th className="center" style={{ width: '70px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No sales invoices found.</td></tr>
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
                      <td><b>{inv.customerName}</b></td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{inv.doctorName}</td>
                      <td className="right">{money(inv.subtotal)}</td>
                      <td className="right">{money(inv.taxAmount)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(inv.totalAmount)}</td>
                      <td className="right" style={{ color: '#059669', fontWeight: 700 }}>{money(inv.paidAmount)}</td>
                      <td className="right" style={{ color: inv.dueAmount > 0 ? '#e11d48' : '#68827c', fontWeight: 800 }}>
                        {money(inv.dueAmount)}
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

      {/* Invoice Details Modal */}
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
                <b style={{ fontSize: '16px', color: '#133e36' }}>Tax Invoice: {selectedInvoice.invoiceNumber}</b>
                <div style={{ fontSize: '11px', color: '#68827c' }}>
                  Billed on {selectedInvoice.invoiceDate ? `${new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN')} ${new Date(selectedInvoice.invoiceDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '-'}
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
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Customer Details</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36', marginTop: '2px' }}>{selectedInvoice.customerName}</div>
                  {selectedInvoice.customerPhone !== '—' && <div style={{ fontSize: '11px', color: '#555' }}>📞 {selectedInvoice.customerPhone}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Prescribing Doctor</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#007a70', marginTop: '2px' }}>{selectedInvoice.doctorName}</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36', marginBottom: '6px' }}>Itemized Medicine Breakdown</div>
                <table className="pos-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th className="right">MRP</th>
                      <th className="right">Disc</th>
                      <th className="right">Total</th>
                      <th className="right">Profit Margin</th>
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
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.quantity} {it.unitName}</td>
                        <td className="right">{money(it.unitPrice)}</td>
                        <td className="right">{it.discountPercent}%</td>
                        <td className="right" style={{ fontWeight: 700, color: '#133e36' }}>{money(it.totalAmount)}</td>
                        <td className="right" style={{ color: '#059669', fontWeight: 800 }}>+{money(it.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8faf9', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#555' }}>
                  Status: <b style={{ color: selectedInvoice.dueAmount > 0 ? '#e11d48' : '#059669' }}>{selectedInvoice.status}</b> | Paid: {money(selectedInvoice.paidAmount)} | Due: {money(selectedInvoice.dueAmount)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#68827c' }}>Total Invoice Amount: </span>
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

      {/* Entity Details Modal (Medicine / Customer / Supplier) */}
      {selectedItemDetail && (
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
          onClick={() => setSelectedItemDetail(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(640px, 95vw)',
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
                  {selectedItemDetail.type === 'MEDICINE' && `Medicine Details: ${selectedItemDetail.data.name}`}
                  {selectedItemDetail.type === 'CUSTOMER' && `Customer Performance: ${selectedItemDetail.data.name}`}
                  {selectedItemDetail.type === 'SUPPLIER' && `Supplier Distribution: ${selectedItemDetail.data.supplierName}`}
                </b>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {selectedItemDetail.type === 'MEDICINE' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '6px', border: '1px solid #b7d6ce' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedItemDetail.data.name}</div>
                    <div style={{ fontSize: '12px', color: '#007a70', marginTop: '2px' }}>Salt Composition: {selectedItemDetail.data.generic}</div>
                    <div style={{ fontSize: '11px', color: '#68827c', marginTop: '4px' }}>Category: {selectedItemDetail.data.category}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Units Sold</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedItemDetail.data.quantity} Units</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Sales Revenue</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{money(selectedItemDetail.data.revenue)}</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Procurement Cost</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#68827c', marginTop: '2px' }}>{money(selectedItemDetail.data.cost)}</div>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '10.5px', color: '#065f46', textTransform: 'uppercase', fontWeight: 700 }}>Net Gross Profit Margin</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{money(selectedItemDetail.data.profit)}</div>
                    </div>
                  </div>
                </>
              )}

              {selectedItemDetail.type === 'CUSTOMER' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '6px', border: '1px solid #b7d6ce' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedItemDetail.data.name}</div>
                    <div style={{ fontSize: '12px', color: '#007a70', marginTop: '2px' }}>📞 Phone: {selectedItemDetail.data.phone}</div>
                    {selectedItemDetail.data.gstin !== '—' && <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>GSTIN: {selectedItemDetail.data.gstin}</div>}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Bills / Invoices</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedItemDetail.data.invoices} Billed</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Lifetime Revenue</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{money(selectedItemDetail.data.revenue)}</div>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '10.5px', color: '#065f46', textTransform: 'uppercase', fontWeight: 700 }}>Total Amount Paid</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{money(selectedItemDetail.data.paid)}</div>
                    </div>
                    <div style={{ background: selectedItemDetail.data.due > 0 ? '#fff1f2' : '#f8faf9', padding: '12px', borderRadius: '6px', border: selectedItemDetail.data.due > 0 ? '1px solid #fecaca' : '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: selectedItemDetail.data.due > 0 ? '#e11d48' : '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Pending Due Balance</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: selectedItemDetail.data.due > 0 ? '#e11d48' : '#133e36', marginTop: '2px' }}>{money(selectedItemDetail.data.due)}</div>
                    </div>
                  </div>
                </>
              )}

              {selectedItemDetail.type === 'SUPPLIER' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '6px', border: '1px solid #b7d6ce' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedItemDetail.data.supplierName}</div>
                    <div style={{ fontSize: '12px', color: '#007a70', marginTop: '2px' }}>GSTIN: {selectedItemDetail.data.gstin}</div>
                    <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>📞 Phone: {selectedItemDetail.data.phone}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Quantity Sold</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedItemDetail.data.quantitySold} Units</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Turnover Generated</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{money(selectedItemDetail.data.salesRevenue)}</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Procurement COGS</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#68827c', marginTop: '2px' }}>{money(selectedItemDetail.data.procurementCost)}</div>
                    </div>
                    <div style={{ background: '#ecfdf5', padding: '12px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '10.5px', color: '#065f46', textTransform: 'uppercase', fontWeight: 700 }}>Gross Profit Earned</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{money(selectedItemDetail.data.grossMargin)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
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
