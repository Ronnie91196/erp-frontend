import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  WalletCards, Calendar, Download, RefreshCw,
  CreditCard, Smartphone, Banknote, Building2, CheckCircle2,
  ArrowDownLeft, Printer, Search, UserCheck, Eye, X, Receipt
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function CollectionReportPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Fetch Collection Report Data
  const reportQuery = useQuery({
    queryKey: ['collection-report', fromDate, toDate, paymentMethod, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (paymentMethod !== 'ALL') params.append('paymentMethod', paymentMethod);
      if (search) params.append('search', search);
      return unwrap(await api.get(`/collection/report?${params.toString()}`));
    },
  });

  const reportData = reportQuery.data || {
    summary: {
      grossCollection: 0,
      totalRefundOutflow: 0,
      netTotalCollection: 0,
      netRegisterCash: 0,
      methodBreakdown: {},
      totalReceiptsCount: 0,
      refundsCount: 0,
    },
    transactions: [],
    refunds: [],
  };

  const { summary, transactions, refunds } = reportData;

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'DAILY COLLECTION & CASH REGISTER REPORT\n';
    csvContent += `Period,"${fromDate} to ${toDate}"\n\n`;
    csvContent += 'Receipt Date,Invoice/Ref,Customer Name,Phone,Payment Method,Ref/Txn No,Category,Amount\n';

    transactions.forEach((tx) => {
      csvContent += `"${tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : ''}","${tx.invoiceNumber}","${tx.customerName}","${tx.customerPhone}","${tx.paymentMethod}","${tx.referenceNumber}","${tx.type}","${tx.amount.toFixed(2)}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Collection_Report_${fromDate}_to_${toDate}.csv`);
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
            <WalletCards size={20} color="#007a70" /> Daily Collection & Cash Register Closing Report
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
            <Printer size={14} /> Print Day-End Sheet
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
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', fontWeight: 600 }}
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">💵 Cash Only</option>
              <option value="UPI">📱 UPI / QR (GPay/PhonePe)</option>
              <option value="CARD">💳 Card (POS Terminal)</option>
              <option value="NET_BANKING">🏦 Net Banking</option>
            </select>

            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice, customer, or phone..."
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
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setFromDate(today);
                setToDate(today);
                setPaymentMethod('ALL');
                setSearch('');
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                background: '#f8faf9',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Today
            </button>
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

        {/* Executive Register Cash & Mode Breakdown Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Net Cash in Register */}
          <div style={{ background: '#ecfdf5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #059669' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Net Cash in Drawer</span>
              <Banknote size={18} color="#059669" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {money(summary.netRegisterCash)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#065f46', marginTop: '2px' }}>
              Total Cash Collected: {money(summary.methodBreakdown?.cash || 0)}
            </div>
          </div>

          {/* Digital UPI Collections */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>UPI / QR Codes</span>
              <Smartphone size={16} color="#007a70" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', marginTop: '4px' }}>
              {money(summary.methodBreakdown?.upi || 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>
              Instant Bank Transfers (GPay/Paytm)
            </div>
          </div>

          {/* POS Card Payments */}
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Card Machine (POS)</span>
              <CreditCard size={16} color="#0284c7" />
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {money(summary.methodBreakdown?.card || 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>
              Debit & Credit Cards
            </div>
          </div>

          {/* Gross Total Collections */}
          <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #007a70' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase' }}>Net Day Collection</span>
              <CheckCircle2 size={18} color="#007a70" />
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#007a70', marginTop: '4px' }}>
              {money(summary.netTotalCollection)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#133e36', marginTop: '2px', fontWeight: 700 }}>
              {summary.totalReceiptsCount} Total Receipt(s)
            </div>
          </div>
        </div>

        {/* Collection Audit Log Table */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8faf9', borderBottom: '1px solid #dbe6e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#133e36', fontSize: '13px' }}>
              Payment Receipts & Cash Register Audit Log ({transactions.length} Transactions)
            </span>
            <span style={{ fontSize: '11px', color: '#68827c' }}>
              Click any receipt row to view full itemized breakdown
            </span>
          </div>

          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Receipt Time</th>
                <th>Bill / Reference No.</th>
                <th>Customer Name</th>
                <th>Payment Mode</th>
                <th>Notes / Txn Ref</th>
                <th>Category</th>
                <th className="right">Amount Received</th>
                <th className="center" style={{ width: '70px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reportQuery.isLoading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    Loading collection receipts...
                  </td>
                </tr>
              )}
              {!reportQuery.isLoading && transactions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    No payments or collections found for the selected period.
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedTransaction(tx)}
                  className="hover:bg-teal-50/40"
                >
                  <td style={{ fontSize: '11px', color: '#555' }}>
                    {tx.date ? new Date(tx.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>
                    {tx.invoiceNumber}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#133e36' }}>{tx.customerName}</div>
                    {tx.customerPhone !== '—' && <div style={{ fontSize: '10px', color: '#68827c' }}>📞 {tx.customerPhone}</div>}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      background: tx.paymentMethod === 'CASH' ? '#ecfdf5' : '#edf7f5',
                      color: tx.paymentMethod === 'CASH' ? '#059669' : '#007a70',
                      border: '1px solid #cadcd7'
                    }}>
                      {tx.paymentMethod}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: '#68827c' }}>
                    {tx.notes} {tx.referenceNumber !== '—' ? `(Ref: ${tx.referenceNumber})` : ''}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: '#f1f5f9',
                      color: '#475569'
                    }}>
                      {tx.type === 'SALE_PAYMENT' ? 'Counter POS' : 'Ledger Settlement'}
                    </span>
                  </td>
                  <td className="right" style={{ fontWeight: 800, color: '#133e36', fontSize: '12.5px' }}>
                    {money(tx.amount)}
                  </td>
                  <td className="center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedTransaction(tx)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
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
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(720px, 95vw)',
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
                <b style={{ fontSize: '16px', color: '#133e36' }}>Collection Receipt: {selectedTransaction.invoiceNumber}</b>
                <div style={{ fontSize: '11px', color: '#68827c' }}>
                  {selectedTransaction.date ? `${new Date(selectedTransaction.date).toLocaleDateString('en-IN')} ${new Date(selectedTransaction.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '-'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8faf9', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Customer Info</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36', marginTop: '2px' }}>{selectedTransaction.customerName}</div>
                  {selectedTransaction.customerPhone !== '—' && <div style={{ fontSize: '11px', color: '#555' }}>📞 {selectedTransaction.customerPhone}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Payment Method & Category</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#007a70', marginTop: '2px' }}>
                    {selectedTransaction.paymentMethod} ({selectedTransaction.type === 'SALE_PAYMENT' ? 'Counter POS' : 'Ledger Settlement'})
                  </div>
                  <div style={{ fontSize: '11px', color: '#555' }}>Notes: {selectedTransaction.notes}</div>
                </div>
              </div>

              {selectedTransaction.items && selectedTransaction.items.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36', marginBottom: '6px' }}>Itemized Bill Breakdown</div>
                  <table className="pos-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Batch</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th className="right">Rate</th>
                        <th className="right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransaction.items.map((it, idx) => (
                        <tr key={idx}>
                          <td><b>{it.productName}</b></td>
                          <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{it.batchNumber}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.quantity} {it.unitName}</td>
                          <td className="right">{money(it.unitPrice)}</td>
                          <td className="right" style={{ fontWeight: 700 }}>{money(it.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '6px', border: '1px solid #b7d6ce', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#133e36' }}>Total Amount Collected:</span>
                <b style={{ fontSize: '18px', color: '#007a70' }}>{money(selectedTransaction.amount)}</b>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
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
