import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Percent, Calendar, Search, RefreshCw, Download, Printer,
  Eye, TrendingUp, Layers, CheckCircle2, ArrowUpRight
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function MarginReportsPage({ defaultTab = 'item' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'item', 'bill-item', 'purchase-analysis'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['margin-reports', activeTab, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', activeTab);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      return unwrap(await api.get(`/comprehensive-reports/margin?${params.toString()}`));
    },
  });

  const reportData = reportsQuery.data || {};
  const items = reportData.items || [];
  const suppliers = reportData.suppliers || [];

  const filteredItems = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (it.drugName && it.drugName.toLowerCase().includes(q)) ||
      (it.generic && it.generic.toLowerCase().includes(q)) ||
      (it.invoiceNumber && it.invoiceNumber.toLowerCase().includes(q)) ||
      (it.customerName && it.customerName.toLowerCase().includes(q))
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    if (!search) return true;
    return s.supplierName && s.supplierName.toLowerCase().includes(search.toLowerCase());
  });

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `PHARMACY MARGIN REPORT (${activeTab.toUpperCase()})\n\n`;

    if (activeTab === 'item') {
      csv += 'Drug Name,Generic,Category,Units Sold,Revenue,Cost,Gross Profit,Margin %\n';
      filteredItems.forEach((it) => {
        csv += `"${it.drugName}","${it.generic}","${it.category}","${it.unitsSold}","${it.totalRevenue.toFixed(2)}","${it.totalCost.toFixed(2)}","${it.profit.toFixed(2)}","${it.marginPct}%"\n`;
      });
    } else if (activeTab === 'bill-item') {
      csv += 'Invoice No,Date,Customer,Medicine,Batch,Qty,Rate,Cost,Revenue,Profit,Margin %\n';
      filteredItems.forEach((it) => {
        csv += `"${it.invoiceNumber}","${it.date ? new Date(it.date).toLocaleDateString('en-IN') : ''}","${it.customerName}","${it.drugName}","${it.batchNumber}","${it.quantity}","${it.unitPrice}","${it.costPrice}","${it.revenue.toFixed(2)}","${it.profit.toFixed(2)}","${it.marginPct}%"\n`;
      });
    } else {
      csv += 'Supplier Name,Bills Count,Procurement Total,Paid,Due Balance,Total Items\n';
      filteredSuppliers.forEach((s) => {
        csv += `"${s.supplierName}","${s.billsCount}","${s.totalAmount.toFixed(2)}","${s.paidAmount.toFixed(2)}","${s.dueAmount.toFixed(2)}","${s.itemsCount}"\n`;
      });
    }

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Margin_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pos-container">
      {/* Top Header */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Percent size={20} color="#007a70" /> Margin & Profitability Reports
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#fff', color: '#007a70', border: '1px solid #cadcd7', padding: '6px 12px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleExportCSV}
            style={{ background: '#007a70', color: '#fff', border: 0, padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,122,112,0.28)' }}
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

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drug, generic, bill #, or customer..."
                style={{ width: '100%', height: '34px', paddingLeft: '30px', paddingRight: '10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(fromDate || toDate || search) && (
              <button
                type="button"
                onClick={() => { setFromDate(''); setToDate(''); setSearch(''); }}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => reportsQuery.refetch()}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              <RefreshCw size={13} className={reportsQuery.isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #dbe6e3' }}>
          {[
            { key: 'item', label: 'Item Wise Margin' },
            { key: 'bill-item', label: 'Bill-Item Wise Margin' },
            { key: 'purchase-analysis', label: 'Purchase Analysis Report' },
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

        {/* Tab 1: Item Wise Margin */}
        {activeTab === 'item' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Generic Salt</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Units Sold</th>
                  <th className="right">Total Revenue</th>
                  <th className="right">COGS (Cost)</th>
                  <th className="right">Gross Profit</th>
                  <th className="right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading margin report...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No margin data recorded for this selection.</td></tr>
                ) : (
                  filteredItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td><b style={{ color: '#133e36' }}>{it.drugName}</b></td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{it.generic}</td>
                      <td>
                        <span style={{ fontSize: '10px', background: '#edf7f5', color: '#007a70', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {it.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.unitsSold}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(it.totalRevenue)}</td>
                      <td className="right" style={{ color: '#68827c' }}>{money(it.totalCost)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#059669' }}>{money(it.profit)}</td>
                      <td className="right">
                        <span style={{
                          fontWeight: 800,
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: it.marginPct >= 20 ? '#ecfdf5' : it.marginPct > 0 ? '#fef3c7' : '#fee2e2',
                          color: it.marginPct >= 20 ? '#059669' : it.marginPct > 0 ? '#b45309' : '#dc2626',
                        }}>
                          {it.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Bill-Item Wise Margin */}
        {activeTab === 'bill-item' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Medicine</th>
                  <th>Batch</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th className="right">Selling Rate</th>
                  <th className="right">Revenue</th>
                  <th className="right">Gross Profit</th>
                  <th className="right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading bill margin report...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No bill items found.</td></tr>
                ) : (
                  filteredItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>{it.invoiceNumber}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{it.date ? new Date(it.date).toLocaleDateString('en-IN') : '—'}</td>
                      <td><b>{it.customerName}</b></td>
                      <td><b>{it.drugName}</b></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{it.batchNumber}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.quantity}</td>
                      <td className="right">{money(it.unitPrice)}</td>
                      <td className="right" style={{ fontWeight: 800 }}>{money(it.revenue)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#059669' }}>{money(it.profit)}</td>
                      <td className="right">
                        <span style={{ fontWeight: 800, color: it.marginPct >= 20 ? '#059669' : '#b45309' }}>
                          {it.marginPct}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Purchase Analysis Report */}
        {activeTab === 'purchase-analysis' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Supplier / Distributor</th>
                  <th style={{ textAlign: 'center' }}>Total Consignments</th>
                  <th style={{ textAlign: 'center' }}>Line Items Received</th>
                  <th className="right">Total Invoiced Amount</th>
                  <th className="right">Amount Paid</th>
                  <th className="right">Pending Due</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading purchase analysis...</td></tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No purchase data recorded.</td></tr>
                ) : (
                  filteredSuppliers.map((s, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td><b style={{ color: '#133e36' }}>{s.supplierName}</b></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.billsCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#007a70' }}>{s.itemsCount}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(s.totalAmount)}</td>
                      <td className="right" style={{ fontWeight: 700, color: '#059669' }}>{money(s.paidAmount)}</td>
                      <td className="right" style={{ fontWeight: 800, color: s.dueAmount > 0 ? '#dc2626' : '#68827c' }}>
                        {money(s.dueAmount)}
                      </td>
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
