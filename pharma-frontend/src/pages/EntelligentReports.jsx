import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Calendar, Search, RefreshCw, Download, Printer,
  TrendingUp, Users, Truck, DollarSign, Award, Layers
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function EntelligentReportsPage({ defaultTab = 'monthly-overview' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'monthly-overview', 'top-selling', 'top-customers', 'top-distributors'
  const [search, setSearch] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['entelligent-reports', activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('subType', activeTab);
      return unwrap(await api.get(`/comprehensive-reports/entelligent?${params.toString()}`));
    },
  });

  const reportData = reportsQuery.data || {};
  const monthlyData = reportData.monthlyData || [];
  const items = reportData.items || [];
  const customers = reportData.customers || [];
  const distributors = reportData.distributors || [];

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `ENTELLIGENT ANALYTICS REPORT (${activeTab.toUpperCase()})\n\n`;

    if (activeTab === 'monthly-overview') {
      csv += 'Month,Invoices Billed,Total Sales,Collected (Cash/UPI),Due (Credit)\n';
      monthlyData.forEach((m) => {
        csv += `"${m.label}","${m.count}","${m.totalSales.toFixed(2)}","${m.collected.toFixed(2)}","${m.due.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'top-customers') {
      csv += 'Customer Name,Phone,Email,Total Invoices,Total Amount Spent\n';
      customers.forEach((c) => {
        csv += `"${c.name}","${c.phone}","${c.email}","${c.billsCount}","${c.totalSpent.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'top-distributors') {
      csv += 'Supplier / Distributor,Phone,GSTIN,Consignments,Total Purchases,Paid,Due Balance\n';
      distributors.forEach((d) => {
        csv += `"${d.name}","${d.phone}","${d.gstin}","${d.ordersCount}","${d.totalPurchases.toFixed(2)}","${d.paid.toFixed(2)}","${d.due.toFixed(2)}"\n`;
      });
    } else {
      csv += 'Medicine Name,Generic Salt,Category,Units Sold,Total Revenue\n';
      items.forEach((it) => {
        csv += `"${it.name}","${it.generic}","${it.category}","${it.unitsSold}","${it.totalRevenue.toFixed(2)}"\n`;
      });
    }

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `eNtelligent_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <PieChart size={20} color="#007a70" /> eNtelligent Business Intelligence Reports
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
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #dbe6e3', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { key: 'monthly-overview', label: 'Monthly Sales Overview' },
              { key: 'top-selling', label: 'Top Selling Items (NEW)' },
              { key: 'top-customers', label: 'Top Customers' },
              { key: 'top-distributors', label: 'Top Distributors' },
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

          <button
            type="button"
            onClick={() => reportsQuery.refetch()}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '11px', fontWeight: 700, cursor: 'pointer', marginBottom: '4px' }}
          >
            <RefreshCw size={13} className={reportsQuery.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Tab 1: Monthly Sales Overview */}
        {activeTab === 'monthly-overview' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'center' }}>Invoices Billed</th>
                  <th className="right">Gross Sales Turnover</th>
                  <th className="right">Collected Revenue</th>
                  <th className="right">Credit / Unpaid Due</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading monthly aggregation...</td></tr>
                ) : monthlyData.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No monthly transactions found.</td></tr>
                ) : (
                  monthlyData.map((m, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td><b style={{ color: '#133e36' }}>{m.label}</b></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{m.count} Bills</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(m.totalSales)}</td>
                      <td className="right" style={{ fontWeight: 700, color: '#059669' }}>{money(m.collected)}</td>
                      <td className="right" style={{ fontWeight: 800, color: m.due > 0 ? '#dc2626' : '#68827c' }}>
                        {money(m.due)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Top Selling Items */}
        {activeTab === 'top-selling' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Medicine Name</th>
                  <th>Generic Salt</th>
                  <th>Therapeutic Category</th>
                  <th style={{ textAlign: 'center' }}>Total Units Sold</th>
                  <th className="right">Total Invoiced Sales</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Ranking products...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No sales records found.</td></tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td style={{ fontWeight: 800, color: '#007a70' }}>#{idx + 1}</td>
                      <td><b>{it.name}</b></td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{it.generic}</td>
                      <td>
                        <span style={{ fontSize: '10px', background: '#edf7f5', color: '#007a70', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {it.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#007a70' }}>{it.unitsSold} Units</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(it.totalRevenue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Top Customers */}
        {activeTab === 'top-customers' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Customer Name</th>
                  <th>Contact Phone</th>
                  <th style={{ textAlign: 'center' }}>Total Purchases Count</th>
                  <th className="right">Lifetime Value (LTV)</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Ranking customers...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No customer data recorded.</td></tr>
                ) : (
                  customers.map((c, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td style={{ fontWeight: 800, color: '#007a70' }}>#{idx + 1}</td>
                      <td><b>{c.name}</b></td>
                      <td style={{ fontSize: '11px', color: '#555' }}>📞 {c.phone}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.billsCount} Invoices</td>
                      <td className="right" style={{ fontWeight: 800, color: '#059669' }}>{money(c.totalSpent)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Top Distributors */}
        {activeTab === 'top-distributors' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Distributor / Supplier</th>
                  <th>Contact</th>
                  <th>GSTIN</th>
                  <th style={{ textAlign: 'center' }}>Consignments</th>
                  <th className="right">Total Invoiced</th>
                  <th className="right">Paid</th>
                  <th className="right">Due Balance</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Ranking distributors...</td></tr>
                ) : distributors.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No distributor purchases found.</td></tr>
                ) : (
                  distributors.map((d, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td style={{ fontWeight: 800, color: '#007a70' }}>#{idx + 1}</td>
                      <td><b>{d.name}</b></td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{d.phone}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '11px', color: '#007a70' }}>{d.gstin}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{d.ordersCount}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(d.totalPurchases)}</td>
                      <td className="right" style={{ fontWeight: 700, color: '#059669' }}>{money(d.paid)}</td>
                      <td className="right" style={{ fontWeight: 800, color: d.due > 0 ? '#dc2626' : '#68827c' }}>
                        {money(d.due)}
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
