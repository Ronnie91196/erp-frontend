import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Calendar, Search, RefreshCw, Download, Printer,
  AlertTriangle, Clock, Layers, ShieldAlert, ArrowRightLeft
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function StockReportsPage({ defaultTab = 'item-batch' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'item-batch', 'expiry', 'non-moving', 'inventory-ageing'
  const [search, setSearch] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['stock-reports', activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('subType', activeTab);
      return unwrap(await api.get(`/comprehensive-reports/stock?${params.toString()}`));
    },
  });

  const reportData = reportsQuery.data || {};
  const items = reportData.items || [];

  const filteredItems = items.filter((it) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (it.drugName && it.drugName.toLowerCase().includes(q)) ||
      (it.generic && it.generic.toLowerCase().includes(q)) ||
      (it.batchNumber && it.batchNumber.toLowerCase().includes(q)) ||
      (it.category && it.category.toLowerCase().includes(q))
    );
  });

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `PHARMACY STOCK REPORT (${activeTab.toUpperCase()})\n\n`;

    if (activeTab === 'expiry') {
      csv += 'Drug Name,Generic,Batch,Expiry Date,MRP,Purchase Price,Stock Qty,Status,Days Left\n';
      filteredItems.forEach((it) => {
        csv += `"${it.drugName}","${it.generic}","${it.batchNumber}","${it.expiryDate ? new Date(it.expiryDate).toLocaleDateString('en-IN') : ''}","${it.mrp}","${it.purchasePrice}","${it.stockQty}","${it.status}","${it.daysLeft}"\n`;
      });
    } else if (activeTab === 'non-moving') {
      csv += 'Drug Name,Generic,Batch,Stock Qty,Cost Price,MRP,Valuation,Movement Status\n';
      filteredItems.forEach((it) => {
        csv += `"${it.drugName}","${it.generic}","${it.batchNumber}","${it.quantity}","${it.purchasePrice}","${it.mrp}","${it.totalValue.toFixed(2)}","${it.lastMovement}"\n`;
      });
    } else if (activeTab === 'inventory-ageing') {
      csv += 'Drug Name,Batch,Stock Qty,Age Days,Age Bracket,Cost Price,Total Valuation\n';
      filteredItems.forEach((it) => {
        csv += `"${it.drugName}","${it.batchNumber}","${it.stockQty}","${it.ageDays}","${it.ageBracket}","${it.purchasePrice}","${it.totalValuation.toFixed(2)}"\n`;
      });
    } else {
      csv += 'Drug Name,Generic,Category,Batch,Expiry,Quantity,Cost Price,MRP,Total Value\n';
      filteredItems.forEach((it) => {
        csv += `"${it.drugName}","${it.generic}","${it.category}","${it.batchNumber}","${it.expiryDate ? new Date(it.expiryDate).toLocaleDateString('en-IN') : ''}","${it.quantity}","${it.costPrice}","${it.mrp}","${it.totalValue.toFixed(2)}"\n`;
      });
    }

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Boxes size={20} color="#007a70" /> Comprehensive Stock & Inventory Reports
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
        {/* Search Bar */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '380px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search drug name, generic salt, or batch #..."
              style={{ width: '100%', height: '34px', paddingLeft: '30px', paddingRight: '10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', outline: 'none' }}
            />
          </div>

          <button
            type="button"
            onClick={() => reportsQuery.refetch()}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
          >
            <RefreshCw size={13} className={reportsQuery.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #dbe6e3', flexWrap: 'wrap' }}>
          {[
            { key: 'item-batch', label: 'Item-Batch Wise Stock' },
            { key: 'expiry', label: 'Expiry Report (Near & Expired)' },
            { key: 'non-moving', label: 'Non-Moving Items (60+ Days)' },
            { key: 'inventory-ageing', label: 'Inventory Ageing (NEW)' },
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

        {/* Tab 1: Item-Batch Wise Stock */}
        {activeTab === 'item-batch' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Generic Salt</th>
                  <th>Category</th>
                  <th>Batch No.</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'center' }}>Live Stock Qty</th>
                  <th className="right">Cost Price</th>
                  <th className="right">MRP</th>
                  <th className="right">Stock Valuation</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading stock levels...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No inventory matches found.</td></tr>
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
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{it.batchNumber}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>
                        {it.expiryDate ? new Date(it.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: it.quantity <= 0 ? '#dc2626' : '#007a70' }}>
                        {it.quantity}
                      </td>
                      <td className="right">{money(it.costPrice)}</td>
                      <td className="right">{money(it.mrp)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(it.totalValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Expiry Report */}
        {activeTab === 'expiry' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Generic Salt</th>
                  <th>Batch No.</th>
                  <th>Expiry Date</th>
                  <th style={{ textAlign: 'center' }}>Remaining Days</th>
                  <th style={{ textAlign: 'center' }}>Stock on Shelf</th>
                  <th className="right">Cost Rate</th>
                  <th className="right">MRP</th>
                  <th className="center">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading expiry tracking...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No batches found.</td></tr>
                ) : (
                  filteredItems.map((it, idx) => (
                    <tr key={idx} style={{ background: it.isExpired ? '#fff1f2' : it.daysLeft <= 30 ? '#fffbeb' : '#fff' }} className="hover:opacity-90">
                      <td><b style={{ color: it.isExpired ? '#dc2626' : '#133e36' }}>{it.drugName}</b></td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{it.generic}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{it.batchNumber}</td>
                      <td style={{ fontSize: '11px', fontWeight: 700, color: it.isExpired ? '#dc2626' : '#b45309' }}>
                        {it.expiryDate ? new Date(it.expiryDate).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: it.daysLeft < 0 ? '#dc2626' : it.daysLeft <= 30 ? '#d97706' : '#059669' }}>
                        {it.daysLeft < 0 ? `Expired (${Math.abs(it.daysLeft)}d ago)` : `${it.daysLeft} Days`}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}>{it.stockQty}</td>
                      <td className="right">{money(it.purchasePrice)}</td>
                      <td className="right">{money(it.mrp)}</td>
                      <td className="center">
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: it.isExpired ? '#fee2e2' : it.daysLeft <= 30 ? '#fef3c7' : '#ecfdf5',
                          color: it.isExpired ? '#dc2626' : it.daysLeft <= 30 ? '#b45309' : '#059669',
                          border: '1px solid #cadcd7'
                        }}>
                          {it.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Non-Moving Items */}
        {activeTab === 'non-moving' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Generic Salt</th>
                  <th>Batch No.</th>
                  <th style={{ textAlign: 'center' }}>Stagnant Stock Qty</th>
                  <th className="right">Cost Price</th>
                  <th className="right">MRP</th>
                  <th className="right">Dead Stock Valuation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Analyzing movement velocity...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>✅ Great! All inventory items have active sales velocity.</td></tr>
                ) : (
                  filteredItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td><b style={{ color: '#133e36' }}>{it.drugName}</b></td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{it.generic}</td>
                      <td style={{ fontFamily: 'monospace' }}>{it.batchNumber}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#b45309' }}>{it.quantity}</td>
                      <td className="right">{money(it.purchasePrice)}</td>
                      <td className="right">{money(it.mrp)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#dc2626' }}>{money(it.totalValue)}</td>
                      <td>
                        <span style={{ fontSize: '10.5px', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {it.lastMovement}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Inventory Ageing */}
        {activeTab === 'inventory-ageing' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Batch No.</th>
                  <th style={{ textAlign: 'center' }}>Stock Qty</th>
                  <th style={{ textAlign: 'center' }}>Holding Days</th>
                  <th className="center">Ageing Bracket</th>
                  <th className="right">Unit Cost</th>
                  <th className="right">Locked Capital</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Computing stock ageing...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No aged batches found.</td></tr>
                ) : (
                  filteredItems.map((it, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td><b style={{ color: '#133e36' }}>{it.drugName}</b></td>
                      <td style={{ fontFamily: 'monospace' }}>{it.batchNumber}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.stockQty}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800 }}>{it.ageDays} Days</td>
                      <td className="center">
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: it.ageDays > 90 ? '#fee2e2' : it.ageDays > 60 ? '#fef3c7' : '#ecfdf5',
                          color: it.ageDays > 90 ? '#dc2626' : it.ageDays > 60 ? '#b45309' : '#059669',
                        }}>
                          {it.ageBracket}
                        </span>
                      </td>
                      <td className="right">{money(it.purchasePrice)}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(it.totalValuation)}</td>
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
