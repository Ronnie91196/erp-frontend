import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgePercent, Calendar, Download, Printer, RefreshCw,
  WalletCards, Truck, TrendingUp, ShieldCheck, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function AccountingReportsPage() {
  const reportsQuery = useQuery({
    queryKey: ['accounting-reports'],
    queryFn: async () => {
      return unwrap(await api.get('/comprehensive-reports/accounting'));
    },
  });

  const reportData = reportsQuery.data || {
    receivables: { totalCustomerDue: 0, unpaidBillsCount: 0 },
    payables: { totalSupplierDue: 0, pendingInvoicesCount: 0 },
    plSummary: { totalRevenue: 0, totalProcurementCost: 0, grossProfit: 0, gstCollected: 0, itcClaimable: 0 },
  };

  const { receivables, payables, plSummary } = reportData;

  return (
    <div className="pos-container">
      {/* Top Header */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BadgePercent size={20} color="#007a70" /> Accounting, Balances & Financial Ledger Reports
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#fff', color: '#007a70', border: '1px solid #cadcd7', padding: '6px 12px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Print Balance Sheet
          </button>
          <button
            type="button"
            onClick={() => reportsQuery.refetch()}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
          >
            <RefreshCw size={13} className={reportsQuery.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Executive Balance Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          {/* Customer Receivables */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Accounts Receivable</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
              {money(receivables.totalCustomerDue)}
            </div>
            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px', fontWeight: 600 }}>
              {receivables.unpaidBillsCount} Unsettled Customer Bills
            </div>
          </div>

          {/* Supplier Payables */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Accounts Payable (Liabilities)</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
              {money(payables.totalSupplierDue)}
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px', fontWeight: 600 }}>
              {payables.pendingInvoicesCount} Pending Distributor Consignments
            </div>
          </div>

          {/* Gross Profit Generated */}
          <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1.5px solid #059669' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Gross Trading Profit</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {money(plSummary.grossProfit)}
            </div>
            <div style={{ fontSize: '11px', color: '#065f46', marginTop: '2px' }}>
              Revenue minus Procurement
            </div>
          </div>

          {/* Net GST Position */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>GST Input Tax vs Output</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0284c7', marginTop: '4px' }}>
              {money(plSummary.gstCollected)}
            </div>
            <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>
              ITC Available: {money(plSummary.itcClaimable)}
            </div>
          </div>
        </div>

        {/* Profit & Loss Summary Statement Card */}
        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', padding: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36', marginBottom: '14px', borderBottom: '1px solid #e2ece9', paddingBottom: '8px' }}>
            Executive Profit & Loss / Financial Summary Statement
          </div>

          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Financial Ledger Line Item</th>
                <th className="right">Ledger Amount</th>
                <th>Accounting Classification</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Gross Sales Revenue (Turnover)</b></td>
                <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(plSummary.totalRevenue)}</td>
                <td><span style={{ fontSize: '10.5px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Inflow / Income</span></td>
              </tr>
              <tr>
                <td><b>Total Consignment Procurement (COGS)</b></td>
                <td className="right" style={{ fontWeight: 700, color: '#68827c' }}>{money(plSummary.totalProcurementCost)}</td>
                <td><span style={{ fontSize: '10.5px', background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Direct Cost</span></td>
              </tr>
              <tr style={{ background: '#f0fdfa' }}>
                <td><b style={{ color: '#007a70' }}>Net Gross Trading Profit</b></td>
                <td className="right" style={{ fontWeight: 900, color: '#007a70', fontSize: '15px' }}>{money(plSummary.grossProfit)}</td>
                <td><span style={{ fontSize: '10.5px', background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>Operating Gross Margin</span></td>
              </tr>
              <tr>
                <td><b>Output GST Collected on Counter Bills</b></td>
                <td className="right">{money(plSummary.gstCollected)}</td>
                <td><span style={{ fontSize: '10.5px', background: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>Tax Liability</span></td>
              </tr>
              <tr>
                <td><b>Input Tax Credit (ITC) Eligible on Purchases</b></td>
                <td className="right">{money(plSummary.itcClaimable)}</td>
                <td><span style={{ fontSize: '10.5px', background: '#f8fafc', color: '#0284c7', padding: '2px 8px', borderRadius: '4px' }}>Tax Asset (Credit)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
