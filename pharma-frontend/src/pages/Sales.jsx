import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Trash2, RotateCcw, Save, Printer, ArrowLeft,
  User, Calendar, Clock, DollarSign, CreditCard,
  FileText, ChevronRight, Hash, ShieldCheck, Upload, ChevronLeft
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function createEmptyRow(id = Date.now()) {
  return {
    id,
    productId: '',
    batchId: '',
    packagingId: '',
    type: 'Rx',
    itemName: '',
    batch: '',
    expiry: '',
    qty: 1,
    tabs: 0,
    mrp: 0,
    disc: 0,
    total: 0,
    gstPercent: 12,
    conversionToBase: 10,
    stock: 0,
  };
}

function recalcRow(row) {
  const packQty = Math.max(0, Number(row.qty || 0));
  const looseQty = Math.max(0, Number(row.tabs || 0));
  const conversion = Math.max(1, Number(row.conversionToBase || 1));
  const unitMrp = Number(row.mrp || 0);

  const grossAmount = (packQty * unitMrp) + (looseQty * (unitMrp / conversion));
  const discPercent = Math.max(0, Math.min(100, Number(row.disc || 0)));
  const discAmount = grossAmount * (discPercent / 100);
  const total = grossAmount - discAmount;

  return {
    ...row,
    total,
  };
}

function SalesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const salesQuery = useQuery({
    queryKey: ['sales-list', search, statusFilter, paymentFilter, paymentMethodFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (paymentFilter !== 'ALL') params.append('paymentStatus', paymentFilter);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      return unwrap(await api.get(`/sales?${params.toString()}`));
    },
  });

  const rawSales = salesQuery.data || [];
  const sales = useMemo(() => {
    if (paymentMethodFilter === 'ALL') return rawSales;
    return rawSales.filter((s) => (s.payments?.[0]?.paymentMethod || 'CASH').toUpperCase() === paymentMethodFilter);
  }, [rawSales, paymentMethodFilter]);

  const deleteSaleMutation = useMutation({
    mutationFn: (id) => api.delete(`/sales/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      setSelectedSale(null);
      window.alert('Sale deleted successfully!');
    },
    onError: (err) => window.alert(err?.message || 'Failed to delete sale'),
  });

  // Calculate high-level KPIs
  const stats = useMemo(() => {
    const totalSalesCount = sales.length;
    const completedSales = sales.filter((s) => s.status === 'COMPLETED');
    const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
    const totalPaid = completedSales.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);
    const totalDue = completedSales.reduce((sum, s) => sum + Number(s.dueAmount || 0), 0);
    return { totalSalesCount, totalRevenue, totalPaid, totalDue, completedCount: completedSales.length };
  }, [sales]);

  const handlePrint = (sale) => {
    const printWin = window.open('', '_blank');
    if (!printWin) return window.alert('Pop-up blocked. Allow pop-ups to print invoices.');
    const dateStr = sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString('en-IN') : '-';
    const itemsHtml = (sale.items || []).map((item, idx) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">
          <b>${item.product?.name || 'Medicine'}</b>
          <div style="font-size: 10px; color: #666;">Batch: ${item.batch?.batchNumber || '—'} | Exp: ${item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : '—'}</div>
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(item.unitPrice || 0).toFixed(2)}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;">${item.discountPercent || 0}%</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right;"><b>₹${Number(item.totalAmount || 0).toFixed(2)}</b></td>
      </tr>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${sale.invoiceNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; font-size: 12px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #007a70; padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: bold; color: #007a70; }
            .inv-meta { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #f0f7f5; color: #133e36; padding: 8px; text-align: left; font-size: 11px; }
            .summary { width: 280px; margin-left: auto; margin-top: 16px; font-size: 12px; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #ddd; }
            .net-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; font-weight: bold; border-top: 2px solid #007a70; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">PHARMA CARE</div>
              <div>Retail & Clinical Pharmacy</div>
              <div style="font-size: 11px; color: #555; margin-top: 4px;">Customer: <b>${sale.customer?.name || 'Cash Sale'}</b> ${sale.customer?.phone ? `(${sale.customer.phone})` : ''}</div>
              ${sale.doctor ? `<div style="font-size: 11px; color: #555;">Doctor: <b>${sale.doctor}</b></div>` : ''}
            </div>
            <div class="inv-meta">
              <div style="font-size: 16px; font-weight: bold; color: #111;">INVOICE</div>
              <div style="font-family: monospace; font-weight: bold; margin-top: 2px;"># ${sale.invoiceNumber}</div>
              <div style="color: #666; font-size: 11px; margin-top: 2px;">Date: ${dateStr}</div>
              <div style="color: #666; font-size: 11px;">Status: <b>${sale.status}</b> | ${sale.paymentStatus}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th>Item & Batch</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th style="width: 80px; text-align: right;">Price</th>
                <th style="width: 60px; text-align: right;">Disc</th>
                <th style="width: 90px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row"><span>Sub Total:</span><span>₹${Number(sale.subtotal || 0).toFixed(2)}</span></div>
            <div class="summary-row"><span>Discount:</span><span>- ₹${Number(sale.discountAmount || 0).toFixed(2)}</span></div>
            <div class="summary-row"><span>GST (CGST+SGST):</span><span>+ ₹${(Number(sale.cgstAmount || 0) + Number(sale.sgstAmount || 0)).toFixed(2)}</span></div>
            ${Number(sale.roundOff || 0) !== 0 ? `<div class="summary-row"><span>Round Off:</span><span>₹${Number(sale.roundOff || 0).toFixed(2)}</span></div>` : ''}
            <div class="net-row"><span>Grand Total:</span><span>₹${Number(sale.totalAmount || 0).toFixed(2)}</span></div>
            <div class="summary-row" style="color: #047857; font-weight: 600;"><span>Paid Amount:</span><span>₹${Number(sale.paidAmount || 0).toFixed(2)}</span></div>
            ${Number(sale.dueAmount || 0) > 0 ? `<div class="summary-row" style="color: #e11d48; font-weight: 700;"><span>Due Amount:</span><span>₹${Number(sale.dueAmount || 0).toFixed(2)}</span></div>` : ''}
          </div>

          <div style="margin-top: 36px; text-align: center; font-size: 10px; color: #888; border-top: 1px solid #eee; padding-top: 12px;">
            Thank you for your visit! Medicines once sold cannot be returned without original cash memo.
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#007a70" /> Sales & Billing Invoices
          </h1>
        </div>
        <div className="pos-top-actions">
          <button
            onClick={() => navigate('/sales/add')}
            className="pos-bar-btn-add"
            style={{
              background: '#007a70',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: '6px',
              border: 0,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,122,112,0.28)'
            }}
          >
            <Plus size={16} /> + New Sale Bill
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Cards Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#edf7f5', color: '#007a70', display: 'grid', placeItems: 'center' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Invoices</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#133e36' }}>{stats.totalSalesCount}</div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'grid', placeItems: 'center' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Revenue</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{money(stats.totalRevenue)}</div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Collected / Paid</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>{money(stats.totalPaid)}</div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: stats.totalDue > 0 ? '#fff1f2' : '#f8faf9', color: stats.totalDue > 0 ? '#e11d48' : '#718a84', display: 'grid', placeItems: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Outstanding Due</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: stats.totalDue > 0 ? '#e11d48' : '#68827c' }}>{money(stats.totalDue)}</div>
            </div>
          </div>
        </div>

        {/* Enhanced Multi-Filter Control Panel */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          {/* Universal Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, customer name, mobile, doctor..."
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '32px',
                paddingRight: '10px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                background: '#fcfdfd',
                fontSize: '11.5px',
                outline: 'none',
                color: '#133e36'
              }}
            />
          </div>

          {/* Date Filter Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="#007a70" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd', color: '#133e36', outline: 'none' }}
              title="From Date"
            />
            <span style={{ fontSize: '11px', color: '#889f9a' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd', color: '#133e36', outline: 'none' }}
              title="To Date"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', fontWeight: 600, background: '#fcfdfd', color: '#133e36', outline: 'none' }}
          >
            <option value="ALL">All Status</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="DRAFT">Drafts Only</option>
          </select>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', fontWeight: 600, background: '#fcfdfd', color: '#133e36', outline: 'none' }}
          >
            <option value="ALL">All Payment Status</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="UNPAID">Unpaid</option>
          </select>

          {/* Payment Method Filter */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', fontWeight: 600, background: '#fcfdfd', color: '#133e36', outline: 'none' }}
          >
            <option value="ALL">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="CREDIT">Credit</option>
          </select>

          {/* Reset Filters */}
          {(search || fromDate || toDate || statusFilter !== 'ALL' || paymentFilter !== 'ALL' || paymentMethodFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFromDate('');
                setToDate('');
                setStatusFilter('ALL');
                setPaymentFilter('ALL');
                setPaymentMethodFilter('ALL');
              }}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                background: '#fff1f2',
                color: '#e11d48',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Invoices List Table Card */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div className="overflow-x-auto">
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Invoice No.</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Doctor</th>
                  <th>Items Summary</th>
                  <th className="right">Net Bill</th>
                  <th className="right">Paid / Due</th>
                  <th className="center">Status</th>
                  <th className="center">Payment</th>
                  <th className="center" style={{ width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesQuery.isLoading && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">Loading invoices...</td>
                  </tr>
                )}
                {!salesQuery.isLoading && !sales.length && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🧾</div>
                      <b style={{ color: '#133e36' }}>No sales invoices found</b>
                      <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Try changing search/date filters or click <strong>+ New Sale Bill</strong> to create one.</p>
                    </td>
                  </tr>
                )}
                {sales.map((sale) => {
                  const isCompleted = sale.status === 'COMPLETED';
                  const isPaid = sale.paymentStatus === 'PAID';
                  const isPartial = sale.paymentStatus === 'PARTIAL';

                  return (
                    <tr
                      key={sale.id}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setSelectedSale(sale)}
                      className="hover:bg-teal-50/40"
                    >
                      <td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSale(sale);
                          }}
                          style={{
                            background: 'none',
                            border: 0,
                            padding: 0,
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '12px',
                            color: '#007a70',
                            textAlign: 'left',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {sale.invoiceNumber}
                        </button>
                      </td>
                      <td className="text-slate-500" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                        <div>{sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</div>
                        <div style={{ fontSize: '9.5px', color: '#889f9a' }}>{sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#133e36', fontSize: '11.5px' }}>{sale.customer?.name || 'Cash Sale / Walk-in'}</div>
                        {sale.customer?.phone && <div style={{ fontSize: '10px', color: '#68827c' }}>📞 {sale.customer.phone}</div>}
                      </td>
                      <td style={{ fontSize: '11px', color: '#405b55' }}>
                        {sale.doctor ? (
                          <div style={{ fontWeight: 600 }}>{sale.doctor}</div>
                        ) : sale.doctorRel ? (
                          <div style={{ fontWeight: 600 }}>Dr. {sale.doctorRel.name}</div>
                        ) : (
                          <span style={{ color: '#9bb0ab' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#133e36', fontSize: '11px' }}>{sale.items?.length || 0} medicine(s)</div>
                        <div style={{ fontSize: '9.5px', color: '#7a8f89', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                          {(sale.items || []).map((it) => it.product?.name).filter(Boolean).slice(0, 2).join(', ')}
                          {(sale.items || []).length > 2 ? ` +${sale.items.length - 2} more` : ''}
                        </div>
                      </td>
                      <td className="right" style={{ fontWeight: 800, fontSize: '12.5px', color: '#133e36' }}>
                        {money(sale.totalAmount)}
                      </td>
                      <td className="right" style={{ fontSize: '11px' }}>
                        <div style={{ fontWeight: 700, color: '#059669' }}>{money(sale.paidAmount)}</div>
                        {Number(sale.dueAmount || 0) > 0 && (
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#e11d48' }}>Due: {money(sale.dueAmount)}</div>
                        )}
                      </td>
                      <td className="center">
                        <span style={{
                          display: 'inline-flex',
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: isCompleted ? '#edf7f5' : '#fef3c7',
                          color: isCompleted ? '#007a70' : '#b45309',
                          border: isCompleted ? '1px solid #b7d6ce' : '1px solid #fde68a'
                        }}>
                          {sale.status}
                        </span>
                      </td>
                      <td className="center">
                        <span style={{
                          display: 'inline-flex',
                          borderRadius: '999px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: isPaid ? '#ecfdf5' : isPartial ? '#fffbeb' : '#fff1f2',
                          color: isPaid ? '#047857' : isPartial ? '#b45309' : '#e11d48',
                          border: isPaid ? '1px solid #a7f3d0' : isPartial ? '1px solid #fde68a' : '1px solid #fecaca'
                        }}>
                          {sale.paymentStatus}
                        </span>
                      </td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedSale(sale)}
                            style={{
                              padding: '3px 7px',
                              borderRadius: '4px',
                              border: '1px solid #cadcd7',
                              background: '#edf7f5',
                              color: '#007a70',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="View full invoice details"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(sale)}
                            style={{
                              padding: '3px 7px',
                              borderRadius: '4px',
                              border: '1px solid #cadcd7',
                              background: '#fff',
                              color: '#405b55',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Print Invoice"
                          >
                            <Printer size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Full Details Modal / Drawer */}
      {selectedSale && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.48)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setSelectedSale(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(900px, 96vw)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #dbe6e3',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8faf9',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: '#133e36' }}>Invoice: {selectedSale.invoiceNumber}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: selectedSale.status === 'COMPLETED' ? '#edf7f5' : '#fef3c7',
                    color: selectedSale.status === 'COMPLETED' ? '#007a70' : '#b45309',
                    border: '1px solid #cadcd7'
                  }}>
                    {selectedSale.status}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px' }}>
                  Billed on {selectedSale.invoiceDate ? new Date(selectedSale.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedSale.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/modules/sales-returned');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#e11d48',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={13} /> Return Medicines
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePrint(selectedSale)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cadcd7',
                    background: '#fff',
                    color: '#007a70',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={13} /> Print Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  style={{
                    border: 0,
                    background: 'transparent',
                    fontSize: '22px',
                    cursor: 'pointer',
                    color: '#68827d',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Customer & Doctor Summary Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', background: '#f8faf9', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2ece9' }}>
                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#68827c', textTransform: 'uppercase', marginBottom: '4px' }}>CUSTOMER DETAILS</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36' }}>{selectedSale.customer?.name || 'Walk-in / Cash Sale'}</div>
                  {selectedSale.customer?.phone && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>📞 {selectedSale.customer.phone}</div>}
                  {selectedSale.customer?.email && <div style={{ fontSize: '11px', color: '#555' }}>✉️ {selectedSale.customer.email}</div>}
                </div>

                <div>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#68827c', textTransform: 'uppercase', marginBottom: '4px' }}>DOCTOR / CLINIC INFO</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36' }}>
                    {selectedSale.doctor || (selectedSale.doctorRel ? `Dr. ${selectedSale.doctorRel.name}` : 'Self / Over The Counter')}
                  </div>
                  {selectedSale.doctorRel?.specialization && (
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Specialization: {selectedSale.doctorRel.specialization}</div>
                  )}
                  {selectedSale.doctorRel?.hospital && (
                    <div style={{ fontSize: '11px', color: '#555' }}>Hospital: {selectedSale.doctorRel.hospital}</div>
                  )}
                </div>
              </div>

              {/* Medicines & Items Table */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#133e36', marginBottom: '8px' }}>
                  Billed Medicines & Products ({selectedSale.items?.length || 0})
                </div>
                <table className="pos-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px', textAlign: 'center' }}>#</th>
                      <th>Medicine Name</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th className="right">MRP / Rate</th>
                      <th className="right">Disc %</th>
                      <th className="right">GST %</th>
                      <th className="right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedSale.items || []).map((item, idx) => {
                      const cgst = Number(item.cgstPercent || 0);
                      const sgst = Number(item.sgstPercent || 0);
                      const totalGst = cgst + sgst;
                      return (
                        <tr key={item.id || idx}>
                          <td style={{ textAlign: 'center', color: '#889f9a' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 800, color: '#133e36' }}>{item.product?.name || 'Medicine'}</div>
                            {item.product?.genericName && (
                              <div style={{ fontSize: '9.5px', color: '#68827c' }}>{item.product.genericName}</div>
                            )}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{item.batch?.batchNumber || 'DEFAULT'}</td>
                          <td style={{ color: '#68827c' }}>
                            {item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800 }}>{item.quantity || 1}</td>
                          <td className="right">{money(item.unitPrice || item.mrp)}</td>
                          <td className="right">{Number(item.discountPercent || 0)}%</td>
                          <td className="right">{totalGst > 0 ? `${totalGst}%` : '12%'}</td>
                          <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(item.totalAmount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial Math Breakdown & Attached Prescriptions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Notes and Prescriptions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedSale.notes && (
                    <div style={{ background: '#f8faf9', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#68827c', textTransform: 'uppercase' }}>CLINICAL / BILLING NOTES</div>
                      <div style={{ fontSize: '11.5px', color: '#274740', marginTop: '4px' }}>{selectedSale.notes}</div>
                    </div>
                  )}

                  {Array.isArray(selectedSale.prescriptions) && selectedSale.prescriptions.length > 0 && (
                    <div style={{ background: '#f8faf9', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#68827c', textTransform: 'uppercase', marginBottom: '8px' }}>
                        ATTACHED PRESCRIPTIONS ({selectedSale.prescriptions.length})
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedSale.prescriptions.map((url, i) => (
                          <div
                            key={i}
                            style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cadcd7', cursor: 'pointer' }}
                            onClick={() => window.open(url, '_blank')}
                            title="Click to view full image"
                          >
                            <img src={url} alt={`Prescription ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accounting & Math Pill Box */}
                <div style={{ background: '#f8faf9', padding: '14px 18px', borderRadius: '8px', border: '1px solid #e2ece9' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', color: '#68827c' }}>
                      <span>Sub Total</span>
                      <b>{money(selectedSale.subtotal)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#68827c' }}>
                      <span>Discount</span>
                      <b>- {money(selectedSale.discountAmount)}</b>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#68827c' }}>
                      <span>Tax (CGST + SGST)</span>
                      <b>+ {money(Number(selectedSale.cgstAmount || 0) + Number(selectedSale.sgstAmount || 0))}</b>
                    </div>
                    {Number(selectedSale.roundOff || 0) !== 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#68827c' }}>
                        <span>Round Off</span>
                        <b>{money(selectedSale.roundOff)}</b>
                      </div>
                    )}
                    <div style={{ height: '1px', background: '#dbe6e3', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#133e36' }}>
                      <span>Grand Total</span>
                      <span>{money(selectedSale.totalAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                      <span>Amount Paid</span>
                      <span>{money(selectedSale.paidAmount)}</span>
                    </div>
                    {Number(selectedSale.dueAmount || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, color: '#e11d48' }}>
                        <span>Balance Due</span>
                        <span>{money(selectedSale.dueAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid #dbe6e3',
              background: '#f8faf9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete sale ${selectedSale.invoiceNumber}? Stock will be adjusted back.`)) {
                      deleteSaleMutation.mutate(selectedSale.id);
                    }
                  }}
                  disabled={deleteSaleMutation.isPending}
                  style={{
                    border: '1px solid #fecaca',
                    background: '#fff1f2',
                    color: '#e11d48',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Delete Invoice
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  style={{
                    border: '1px solid #cadcd7',
                    background: '#fff',
                    color: '#405b55',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSalePos() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const queryParams = new URLSearchParams(location.search);
  const draftIdFromQuery = queryParams.get('draft');
  const editIdFromQuery = queryParams.get('edit');

  // Header state matching screenshot
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState('Paid'); // Paid, Unpaid, Partial
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, UPI, Card
  const [paidAmount, setPaidAmount] = useState('95');
  const [discountPercent, setDiscountPercent] = useState('12');
  const [customerName, setCustomerName] = useState('Cash Sale');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('Cash Sale');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });

  // Right card fields & Doctor selection
  const [doctor, setDoctor] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorLicense, setDoctorLicense] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [newDoctorData, setNewDoctorData] = useState({ name: '', phone: '', specialization: '', registrationNo: '' });

  // Table rows & fast entry
  const [rows, setRows] = useState([]);
  const [entryRow, setEntryRow] = useState(createEmptyRow());
  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Notes & Documents
  const [notes, setNotes] = useState('');
  const [prescriptionImages, setPrescriptionImages] = useState([]);

  // Field refs
  const entryRefs = useRef({});

  // Queries
  const productsQuery = useQuery({
    queryKey: ['sale-products'],
    queryFn: async () => unwrap(await api.get('/products')),
  });

  const customersQuery = useQuery({
    queryKey: ['sale-customers'],
    queryFn: async () => unwrap(await api.get('/customers')),
  });

  const doctorsQuery = useQuery({
    queryKey: ['sale-doctors'],
    queryFn: async () => {
      const res = unwrap(await api.get('/doctors'));
      return Array.isArray(res) ? res : [];
    },
  });

  const doctorsList = doctorsQuery.data || [];

  const draftsQuery = useQuery({
    queryKey: ['sale-drafts'],
    queryFn: async () => {
      const allSales = unwrap(await api.get('/sales?status=DRAFT'));
      return Array.isArray(allSales) ? allSales : [];
    },
  });

  const saleDrafts = draftsQuery.data || [];

  const loadDraftIntoPos = (draft) => {
    if (!draft) return;
    setActiveDraftId(draft.id);
    setBillDate(draft.invoiceDate ? new Date(draft.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setCustomerName(draft.customer?.name || 'Cash Sale');
    setSelectedCustomerId(draft.customerId || '');
    let rawDoc = draft.doctor || draft.doctorRel?.name || '';
    let parsedLic = draft.doctorRel?.registrationNo || '';
    let parsedCase = '';

    if (rawDoc.includes(' - OPD: ')) {
      const [left, opd] = rawDoc.split(' - OPD: ');
      parsedCase = opd || '';
      rawDoc = left || '';
    }
    if (rawDoc.includes(' (') && rawDoc.endsWith(')')) {
      const match = rawDoc.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        rawDoc = match[1];
        if (!parsedLic) parsedLic = match[2];
      }
    }

    setDoctor(rawDoc);
    setSelectedDoctorId(draft.doctorId || '');
    setDoctorSearch(rawDoc);
    setDoctorLicense(parsedLic);
    setCaseNumber(parsedCase);
    setDiscountPercent(String(draft.discountPercent || 0));
    setPaymentStatus(draft.paymentStatus === 'PAID' ? 'Paid' : draft.paymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid');
    setPaymentMethod(draft.paymentMethod === 'UPI' ? 'UPI' : draft.paymentMethod === 'CARD' ? 'Card' : 'Cash');
    setPaidAmount(String(draft.paidAmount || 0));
    setNotes(draft.notes || '');
    setPrescriptionImages(Array.isArray(draft.prescriptions) ? draft.prescriptions : []);

    const loadedRows = (draft.items || []).map((item, idx) => {
      const conversion = Number(item.packaging?.conversionToBase || 10);
      const totalUnits = Number(item.baseQuantity || item.quantity || 0);
      const packQty = Math.floor(totalUnits / conversion);
      const tabs = totalUnits % conversion;

      return recalcRow({
        id: item.id || Date.now() + idx,
        productId: item.productId,
        batchId: item.batchId,
        packagingId: item.packagingId || '',
        type: 'Rx',
        itemName: item.product?.name || 'Medicine',
        batch: item.batch?.batchNumber || 'DEFAULT',
        expiry: item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : '-',
        qty: packQty,
        tabs,
        mrp: Number(item.unitPrice || item.mrp || 0),
        disc: Number(item.discountPercent || 0),
        total: Number(item.totalAmount || 0),
        gstPercent: Number(item.cgstPercent || 0) + Number(item.sgstPercent || 0) || 12,
        conversionToBase: conversion,
        stock: 999,
      });
    });

    setRows(loadedRows);
    setShowDraftsModal(false);
  };

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/sales/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to delete draft');
    }
  });

  // Auto load draft from query param if available
  useEffect(() => {
    const targetId = draftIdFromQuery || editIdFromQuery;
    if (targetId && saleDrafts.length > 0) {
      const found = saleDrafts.find((d) => String(d.id) === String(targetId));
      if (found) {
        loadDraftIntoPos(found);
      }
    }
  }, [draftIdFromQuery, editIdFromQuery, saleDrafts]);

  // Quick Customer Creation Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/customers', payload)),
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: ['sale-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomerId(newCust.id);
      setCustomerName(newCust.name);
      setCustomerPhone(newCust.phone || '');
      setCustomerSearch(newCust.name);
      setShowCustomerModal(false);
      setNewCustomerData({ name: '', phone: '' });
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to create customer');
    }
  });

  const handleQuickCreateCustomer = (e) => {
    e.preventDefault();
    if (!newCustomerData.name.trim()) {
      window.alert('Please enter a customer name');
      return;
    }
    createCustomerMutation.mutate({
      name: newCustomerData.name.trim(),
      phone: newCustomerData.phone.trim() || undefined,
    });
  };

  // Quick Doctor Creation Mutation
  const createDoctorMutation = useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/doctors', payload)),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['sale-doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      setSelectedDoctorId(newDoc.id);
      setDoctor(newDoc.name);
      setDoctorSearch(newDoc.name);
      setDoctorLicense(newDoc.registrationNo || '');
      setShowDoctorModal(false);
      setNewDoctorData({ name: '', phone: '', specialization: '', registrationNo: '' });
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to create doctor');
    },
  });

  const handleQuickCreateDoctor = (e) => {
    e.preventDefault();
    if (!newDoctorData.name.trim()) {
      window.alert('Please enter doctor name');
      return;
    }
    createDoctorMutation.mutate({
      name: newDoctorData.name.trim(),
      phone: newDoctorData.phone.trim() || undefined,
      specialization: newDoctorData.specialization.trim() || undefined,
      registrationNo: newDoctorData.registrationNo.trim() || undefined,
    });
  };

  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const customers = Array.isArray(customersQuery.data) ? customersQuery.data : [];

  // Grouped products and their batches sorted by FEFO (First Expiry, First Out)
  const productBatchesMap = useMemo(() => {
    const map = new Map();
    const now = new Date();

    products.forEach((product) => {
      const safeBatches = Array.isArray(product.batches) ? product.batches : [];
      const primaryPkg = product.packaging?.[0] || null;
      const conversionToBase = primaryPkg ? Math.max(1, Number(primaryPkg.conversionToBase || 10)) : 10;

      let batchList = safeBatches.map((batch) => {
        const stockQty = (batch.stocks || []).reduce((sum, s) => sum + Number(s.quantity || 0), 0);
        return {
          productId: product.id,
          productName: product.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber || 'DEFAULT',
          expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : '-',
          rawExpiry: batch.expiryDate ? new Date(batch.expiryDate) : null,
          mrp: Number(batch.sellingPrice || batch.mrp || product.mrp || 0),
          stock: stockQty,
          dosageForm: product.dosageForm || 'Tablet',
          packagingId: primaryPkg?.id || null,
          conversionToBase,
          gstPercent: Number(product.gstPercent || 12),
        };
      });

      // Sort batches: closest expiry with available stock first (FEFO principle)
      batchList.sort((a, b) => {
        // Priority 1: positive stock batches first
        if (a.stock > 0 && b.stock <= 0) return -1;
        if (a.stock <= 0 && b.stock > 0) return 1;

        // Priority 2: unexpired batches with closest expiry date
        if (a.rawExpiry && b.rawExpiry) {
          return a.rawExpiry.getTime() - b.rawExpiry.getTime();
        }
        if (a.rawExpiry && !b.rawExpiry) return -1;
        if (!a.rawExpiry && b.rawExpiry) return 1;
        return 0;
      });

      if (batchList.length === 0) {
        batchList.push({
          productId: product.id,
          productName: product.name,
          batchId: product.id,
          batchNumber: 'STANDARD',
          expiryDate: '-',
          rawExpiry: null,
          mrp: Number(product.mrp || 0),
          stock: 999,
          dosageForm: product.dosageForm || 'Tablet',
          packagingId: primaryPkg?.id || null,
          conversionToBase,
          gstPercent: Number(product.gstPercent || 12),
        });
      }

      map.set(product.id, {
        productId: product.id,
        productName: product.name,
        dosageForm: product.dosageForm || 'Tablet',
        batches: batchList,
        totalStock: batchList.reduce((sum, b) => sum + Number(b.stock || 0), 0),
      });
    });
    return map;
  }, [products]);

  // Drug search suggestions showing batch count badge (+1, +2 etc.)
  const filteredDrugSuggestions = useMemo(() => {
    const term = drugSearch.trim().toLowerCase();
    const allGroups = Array.from(productBatchesMap.values());
    if (!term) return allGroups.slice(0, 10);
    return allGroups
      .filter((g) => g.productName.toLowerCase().includes(term) || g.batches.some((b) => b.batchNumber.toLowerCase().includes(term)))
      .slice(0, 10);
  }, [productBatchesMap, drugSearch]);

  const [showBatchDropdown, setShowBatchDropdown] = useState(false);

  const focusEntry = (field) => {
    const el = entryRefs.current[field];
    if (el) {
      el.focus();
      el.select?.();
    }
  };

  const applySelectedBatch = (batch) => {
    setEntryRow(recalcRow({
      ...entryRow,
      productId: batch.productId,
      batchId: batch.batchId,
      packagingId: batch.packagingId,
      itemName: batch.productName,
      batch: batch.batchNumber,
      expiry: batch.expiryDate,
      conversionToBase: batch.conversionToBase,
      mrp: batch.mrp,
      stock: batch.stock,
      gstPercent: batch.gstPercent,
      qty: 1,
      tabs: 0,
      disc: 0,
    }));
    setDrugSearch(batch.productName);
    setShowDrugDropdown(false);
    setShowBatchDropdown(false);
    setTimeout(() => focusEntry('qty'), 20);
  };

  const submitEntryRow = () => {
    if (!entryRow.productId || !entryRow.batchId) {
      window.alert('Please select a medicine batch from the dropdown');
      return;
    }

    const totalUnits = (Number(entryRow.qty || 0) * Number(entryRow.conversionToBase || 1)) + Number(entryRow.tabs || 0);
    if (totalUnits <= 0) {
      window.alert('Quantity must be greater than 0');
      return;
    }

    if (totalUnits > entryRow.stock) {
      window.alert(`Insufficient stock! Available: ${entryRow.stock} units, requested: ${totalUnits}`);
      return;
    }

    setRows((prev) => [...prev, recalcRow({ ...entryRow, id: Date.now() })]);
    setEntryRow(createEmptyRow());
    setDrugSearch('');
    setTimeout(() => focusEntry('search'), 20);
  };

  const [activeBatchRowId, setActiveBatchRowId] = useState(null);

  const switchExistingRowBatch = (rowId, batch) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated = {
          ...row,
          batchId: batch.batchId,
          batch: batch.batchNumber,
          expiry: batch.expiryDate,
          mrp: batch.mrp,
          stock: batch.stock,
          conversionToBase: batch.conversionToBase,
        };
        return recalcRow(updated);
      })
    );
    setActiveBatchRowId(null);
  };

  const updateExistingRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        return recalcRow(updated);
      })
    );
  };

  const handleEntryKeyDown = (event, field) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const order = ['qty', 'tabs', 'disc'];
      const index = order.indexOf(field);
      if (index === -1) return;

      if (index === order.length - 1) {
        submitEntryRow();
      } else {
        focusEntry(order[index + 1]);
      }
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((curr) => (curr + 1) % filteredDrugSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((curr) => (curr - 1 + filteredDrugSuggestions.length) % filteredDrugSuggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const targetGroup = highlightedIndex >= 0 && filteredDrugSuggestions[highlightedIndex]
        ? filteredDrugSuggestions[highlightedIndex]
        : filteredDrugSuggestions[0];

      if (targetGroup && targetGroup.batches && targetGroup.batches.length > 0) {
        applySelectedBatch(targetGroup.batches[0]);
      }
    } else if (event.key === 'Escape') {
      setShowDrugDropdown(false);
    }
  };

  // Calculations for bottom formula bar: Sub Total - Disc + Tax = Net
  const calculations = useMemo(() => {
    const allRows = [...rows];
    if (entryRow.productId && entryRow.batchId && (Number(entryRow.qty || 0) > 0 || Number(entryRow.tabs || 0) > 0)) {
      allRows.push(recalcRow(entryRow));
    }

    const subTotal = allRows.reduce((sum, r) => {
      const packQty = Math.max(0, Number(r.qty || 0));
      const looseQty = Math.max(0, Number(r.tabs || 0));
      const conversion = Math.max(1, Number(r.conversionToBase || 1));
      const unitMrp = Number(r.mrp || 0);
      return sum + (packQty * unitMrp) + (looseQty * (unitMrp / conversion));
    }, 0);

    const discountAmount = allRows.reduce((sum, r) => {
      const packQty = Math.max(0, Number(r.qty || 0));
      const looseQty = Math.max(0, Number(r.tabs || 0));
      const conversion = Math.max(1, Number(r.conversionToBase || 1));
      const unitMrp = Number(r.mrp || 0);
      const gross = (packQty * unitMrp) + (looseQty * (unitMrp / conversion));
      const d = Math.max(0, Math.min(100, Number(r.disc || 0)));
      return sum + (gross * (d / 100));
    }, 0);

    // Also account for overall discount % if set
    const overallDiscPercent = Math.max(0, Math.min(100, Number(discountPercent || 0)));
    const overallDiscAmount = (subTotal - discountAmount) * (overallDiscPercent / 100);
    const totalDiscount = discountAmount + overallDiscAmount;

    const taxable = Math.max(0, subTotal - totalDiscount);
    const tax = taxable * 0.12; // 12% standard GST
    const rawGrandTotal = taxable + tax;
    const grandTotal = Math.round(rawGrandTotal);

    return {
      subTotal: Number(subTotal.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      grandTotal,
    };
  }, [rows, entryRow, discountPercent]);

  // Save Sale Mutation
  const saveSaleMutation = useMutation({
    mutationFn: async ({ isDraft = false }) => {
      const activeRows = [...rows];
      if (entryRow.productId && entryRow.batchId && (Number(entryRow.qty || 0) > 0 || Number(entryRow.tabs || 0) > 0)) {
        activeRows.push(recalcRow(entryRow));
      }

      if (!isDraft && !activeRows.length) {
        throw new Error('Please add at least one medicine to complete the sale');
      }

      const isUnpaid = paymentStatus === 'Unpaid';
      const isPartial = paymentStatus === 'Partial';
      const resolvedPaid = isUnpaid
        ? 0
        : isPartial
          ? Math.max(0, Math.min(calculations.grandTotal, Number(paidAmount || 0)))
          : calculations.grandTotal;

      const payload = {
        customerId: selectedCustomerId || null,
        customerName: customerName || 'Cash Sale',
        customerPhone: customerPhone || null,
        doctorId: selectedDoctorId || null,
        doctorName: doctor || null,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: billDate,
        dueDate: null,
        doctor: doctor ? `${doctor}${doctorLicense ? ` (${doctorLicense})` : ''}${caseNumber ? ` - OPD: ${caseNumber}` : ''}` : null,
        discountPercent: Number(discountPercent || 0),
        paymentMethod: isUnpaid ? 'CREDIT' : paymentMethod.toUpperCase(),
        paymentStatus: isUnpaid ? 'UNPAID' : isPartial ? 'PARTIAL' : 'PAID',
        paidAmount: resolvedPaid,
        status: isDraft ? 'DRAFT' : 'COMPLETED',
        notes,
        prescriptions: prescriptionImages,
        items: activeRows.map((r) => ({
          productId: r.productId,
          batchId: r.batchId,
          packagingId: r.packagingId || null,
          qty: Number(r.qty || 0),
          tabs: Number(r.tabs || 0),
          mrp: Number(r.mrp || 0),
          unitPrice: Number(r.mrp || 0),
          disc: Number(r.disc || 0),
          gstPercent: Number(r.gstPercent || 12),
        })),
      };

      const res = unwrap(await api.post('/sales', payload));

      // If this sale was resumed from an existing draft, delete the old draft so it doesn't stay in drafts list
      if (!isDraft && activeDraftId) {
        try {
          await unwrap(await api.delete(`/sales/${activeDraftId}`));
        } catch (e) {
          console.warn('Could not delete resumed draft:', e);
        }
      }

      return res;
    },
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['sale-products'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-drafts-page'] });
      window.alert(vars.isDraft ? 'Sale saved as Draft' : 'Sale bill generated successfully!');
      navigate('/sales');
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to save sale');
    },
  });

  // Auto-Save Draft State & Logic
  const [autoSaveState, setAutoSaveState] = useState({ status: 'idle', time: null });
  const isInitialMount = useRef(true);
  const autoSaveTimerRef = useRef(null);

  const silentAutoSaveSaleDraft = async () => {
    const activeRows = [...rows];
    if (entryRow.productId && entryRow.batchId && (Number(entryRow.qty || 0) > 0 || Number(entryRow.tabs || 0) > 0)) {
      activeRows.push(recalcRow(entryRow));
    }

    const hasCustomer = Boolean(selectedCustomerId || (customerName && customerName.trim() && customerName !== 'Cash Sale'));
    const hasRows = activeRows.length > 0;

    if (!hasCustomer && !hasRows) return;

    const isUnpaid = paymentStatus === 'Unpaid';
    const isPartial = paymentStatus === 'Partial';
    const resolvedPaid = isUnpaid
      ? 0
      : isPartial
        ? Math.max(0, Math.min(calculations.grandTotal, Number(paidAmount || 0)))
        : calculations.grandTotal;

    const payload = {
      saleId: activeDraftId || null,
      customerId: selectedCustomerId || null,
      customerName: customerName || 'Cash Sale',
      customerPhone: customerPhone || null,
      doctorId: selectedDoctorId || null,
      doctorName: doctor || null,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: billDate,
      dueDate: null,
      doctor: doctor ? `${doctor}${doctorLicense ? ` (${doctorLicense})` : ''}${caseNumber ? ` - OPD: ${caseNumber}` : ''}` : null,
      discountPercent: Number(discountPercent || 0),
      paymentMethod: isUnpaid ? 'CREDIT' : paymentMethod.toUpperCase(),
      paymentStatus: isUnpaid ? 'UNPAID' : isPartial ? 'PARTIAL' : 'PAID',
      paidAmount: resolvedPaid,
      status: 'DRAFT',
      notes,
      prescriptions: prescriptionImages,
      items: activeRows.map((r) => ({
        productId: r.productId,
        batchId: r.batchId,
        packagingId: r.packagingId || null,
        qty: Number(r.qty || 0),
        tabs: Number(r.tabs || 0),
        mrp: Number(r.mrp || 0),
        unitPrice: Number(r.mrp || 0),
        disc: Number(r.disc || 0),
        gstPercent: Number(r.gstPercent || 12),
      })),
    };

    try {
      setAutoSaveState((prev) => ({ ...prev, status: 'saving' }));
      const res = unwrap(await api.post('/sales', payload));
      if (res?.id && res.id !== activeDraftId) {
        setActiveDraftId(res.id);
      }
      queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['sales-drafts-page'] });
      setAutoSaveState({
        status: 'saved',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      });
    } catch (err) {
      console.warn('Silent auto-save sale draft failed:', err);
      setAutoSaveState((prev) => ({ ...prev, status: 'idle' }));
    }
  };

  // 2-second debounced background auto-save for Sales
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      silentAutoSaveSaleDraft();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [rows, entryRow, selectedCustomerId, customerName, customerPhone, doctor, notes, discountPercent, paymentMethod, paymentStatus]);

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="pos-back-btn"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="pos-top-title">Add Sale</h1>
        </div>

        <div className="pos-top-actions">
          {autoSaveState.status === 'saving' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008b8b', fontWeight: 600, paddingRight: 6 }}>
              <span className="animate-spin" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '2px solid #008b8b', borderTopColor: 'transparent' }} />
              <span>Auto-saving draft...</span>
            </div>
          )}
          {autoSaveState.status === 'saved' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981', fontWeight: 600, paddingRight: 6 }}>
              <span>✓ Auto-saved {autoSaveState.time ? `at ${autoSaveState.time}` : 'to drafts'}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setRows([]);
              setEntryRow(createEmptyRow());
              setDrugSearch('');
              setActiveDraftId(null);
            }}
            className="pos-btn-ghost"
          >
            <RotateCcw size={13} /> Clear
          </button>
          <button
            type="button"
            onClick={() => setShowDraftsModal(true)}
            className="pos-btn-ghost"
            style={{
              position: 'relative',
              background: saleDrafts.length > 0 ? '#e0f2fe' : '#fff',
              color: saleDrafts.length > 0 ? '#0369a1' : '#435b55',
              borderColor: saleDrafts.length > 0 ? '#bae6fd' : '#d5e3df',
              fontWeight: 700
            }}
          >
            <Save size={13} /> Drafts {saleDrafts.length > 0 && `(${saleDrafts.length})`}
          </button>
          <button
            type="button"
            onClick={() => saveSaleMutation.mutate({ isDraft: true })}
            className="pos-btn-ghost"
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              borderColor: '#bbf7d0',
              fontWeight: 700
            }}
            title="Save current sale as a draft"
          >
            + Save Draft
          </button>
          <span className="pos-mode-badge">Retail</span>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="pos-main-body">
        {/* 3 Header Information Cards */}
        <div className="pos-header-cards">
          {/* Card 1: Customer Selection & Quick Add Card */}
          <div className="pos-cust-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="pos-cust-top">
                <User size={15} />
                <span>CUSTOMER</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerName('Walk-in Customer');
                    setCustomerPhone('');
                    setCustomerSearch('Walk-in Customer');
                  }}
                  style={{
                    border: '1px solid #c9e6de',
                    background: !selectedCustomerId && customerName === 'Walk-in Customer' ? '#007a70' : '#fff',
                    color: !selectedCustomerId && customerName === 'Walk-in Customer' ? '#fff' : '#0e695d',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                  title="Quick Walk-in Customer"
                >
                  Walk-in
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  style={{
                    border: '1px solid #007a70',
                    background: '#007a70',
                    color: '#fff',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                  title="Add new customer to database"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Customer Search & Picker */}
            <div style={{ marginTop: '8px', position: 'relative' }}>
              <input
                value={customerSearch}
                onFocus={() => setShowCustomerDropdown(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerSearch(val);
                  setCustomerName(val || 'Cash Sale');
                  setSelectedCustomerId('');
                  setShowCustomerDropdown(true);
                }}
                placeholder="Search or enter customer name..."
                style={{
                  width: '100%',
                  border: '1px solid #b7d6ce',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#133e36',
                  background: '#fff',
                }}
              />

              {showCustomerDropdown && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: '#fff',
                  border: '1px solid #b7d6ce',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 9999,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedCustomerId('');
                      setCustomerName('Cash Sale / Walk-in');
                      setCustomerPhone('');
                      setCustomerSearch('Cash Sale / Walk-in');
                      setShowCustomerDropdown(false);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid #eef5f3',
                      cursor: 'pointer',
                      background: !selectedCustomerId ? '#eef7f5' : '#fff',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#0e695d'
                    }}
                  >
                    🚶 Cash Sale / Walk-in Customer
                  </div>

                  {customers
                    .filter((c) => (c.name || '').toLowerCase().includes(customerSearch.trim().toLowerCase()) || (c.phone || '').includes(customerSearch.trim()))
                    .slice(0, 8)
                    .map((c) => (
                      <div
                        key={c.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedCustomerId(c.id);
                          setCustomerName(c.name);
                          setCustomerPhone(c.phone || '');
                          setCustomerSearch(c.name);
                          setShowCustomerDropdown(false);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #f0f6f4',
                          cursor: 'pointer',
                          background: selectedCustomerId === c.id ? '#eef7f5' : '#fff',
                          fontSize: '11px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#164e43' }}>{c.name}</strong>
                          {c.phone && <div style={{ fontSize: '9px', color: '#68827c' }}>📞 {c.phone}</div>}
                        </div>
                        {c.outstandingBalance > 0 && (
                          <div style={{ fontSize: '9px', color: '#d97706', fontWeight: 600 }}>
                            Due: {money(c.outstandingBalance)}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '6px', fontSize: '9.5px', color: '#52726c', display: 'flex', justifyContent: 'space-between' }}>
              <span>{selectedCustomerId ? 'Registered Customer' : 'Walk-in Mode'}</span>
              {customerPhone && <span>📞 {customerPhone}</span>}
            </div>
          </div>

          {/* Quick Add Customer Modal */}
          {showCustomerModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 99999,
              display: 'grid',
              placeItems: 'center'
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '16px 20px',
                width: 'min(380px, 92vw)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                border: '1px solid #c9ded9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ color: '#0d5c52', fontSize: '14px' }}>Add New Customer</strong>
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    style={{ border: 0, background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#666' }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleQuickCreateCustomer} style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      CUSTOMER NAME *
                    </label>
                    <input
                      required
                      autoFocus
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. John Doe"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      PHONE NUMBER (OPTIONAL)
                    </label>
                    <input
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(false)}
                      style={{
                        border: '1px solid #cadcd7',
                        background: '#f4f8f7',
                        color: '#446059',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createCustomerMutation.isPending}
                      style={{
                        border: 0,
                        background: '#007a70',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {createCustomerMutation.isPending ? 'Saving...' : 'Save & Select'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Card 2: Payment Status, Method, and Amounts */}
          <div className="pos-center-card">
            <div className="pos-date-bar">
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#435e58' }}>Date:</span>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="pos-date-input"
              />
            </div>

            <div>
              <div className="pos-pay-status-label">SELECT PAYMENT STATUS</div>
              <div className="pos-pay-status-tabs">
                {['Paid', 'Unpaid', 'Partial'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setPaymentStatus(status)}
                    className={`pos-pay-tab ${paymentStatus === status ? 'active' : ''}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="pos-pay-details-row">
              <div className="pos-input-group" style={{ flex: 1.2 }}>
                <span>Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={paymentStatus === 'Unpaid'}
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </div>

              <div className="pos-input-group" style={{ flex: 1 }}>
                <span>Paid Amount</span>
                <input
                  type="number"
                  value={paymentStatus === 'Paid' ? calculations.grandTotal : paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  disabled={paymentStatus === 'Paid' || paymentStatus === 'Unpaid'}
                />
              </div>

              <div className="pos-input-group" style={{ flex: 1 }}>
                <span>Discount %</span>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontSize: '10px', color: '#7a9690', marginTop: '2px' }}>
              No bank accounts available
            </div>
          </div>

          {/* Card 3: Doctor, License, OPD with Search & Add Doctor */}
          <div className="pos-right-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#133e36', textTransform: 'uppercase' }}>
                Prescribed Doctor
              </span>
              <button
                type="button"
                onClick={() => setShowDoctorModal(true)}
                style={{
                  border: 0,
                  background: '#007a70',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                + Add Doctor
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                value={doctorSearch}
                onFocus={() => setShowDoctorDropdown(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setDoctorSearch(val);
                  setDoctor(val);
                  setSelectedDoctorId('');
                  setShowDoctorDropdown(true);
                }}
                placeholder="Search or enter doctor name..."
                style={{
                  width: '100%',
                  border: '1px solid #cadcd7',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#133e36',
                  background: '#fff'
                }}
              />

              {showDoctorDropdown && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: '#fff',
                  border: '1px solid #b7d6ce',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 9999,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedDoctorId('');
                      setDoctor('');
                      setDoctorSearch('');
                      setDoctorLicense('');
                      setShowDoctorDropdown(false);
                    }}
                    style={{
                      padding: '5px 8px',
                      borderBottom: '1px solid #eef5f3',
                      cursor: 'pointer',
                      background: !selectedDoctorId && !doctor ? '#eef7f5' : '#fff',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: '#0e695d'
                    }}
                  >
                    🚫 No Doctor / Self Prescribed
                  </div>

                  {doctorsList
                    .filter((d) => !doctorSearch || d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || (d.specialization && d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())))
                    .map((d) => (
                      <div
                        key={d.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedDoctorId(d.id);
                          setDoctor(d.name);
                          setDoctorSearch(d.name);
                          setDoctorLicense(d.registrationNo || '');
                          setShowDoctorDropdown(false);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #f0f4f3',
                          cursor: 'pointer',
                          background: selectedDoctorId === d.id ? '#e6f4f1' : '#fff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#164e43' }}>{d.name}</strong>
                          {d.specialization && <span style={{ fontSize: '9.5px', color: '#007a70', marginLeft: '4px' }}>({d.specialization})</span>}
                          {d.hospital && <div style={{ fontSize: '9px', color: '#68827c' }}>🏥 {d.hospital}</div>}
                        </div>
                        {d.registrationNo && (
                          <div style={{ fontSize: '9px', color: '#475569', background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>
                            {d.registrationNo}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <input
              value={doctorLicense}
              onChange={(e) => setDoctorLicense(e.target.value)}
              placeholder="Doctor License / Reg No."
              style={{
                width: '100%',
                border: '1px solid #cadcd7',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px'
              }}
            />
            <input
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="OPD / Case Number"
              style={{
                width: '100%',
                border: '1px solid #cadcd7',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px'
              }}
            />
          </div>

          {/* Quick Add Doctor Modal */}
          {showDoctorModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 99999,
              display: 'grid',
              placeItems: 'center'
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '16px 20px',
                width: 'min(380px, 92vw)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                border: '1px solid #c9ded9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ color: '#0d5c52', fontSize: '14px' }}>Add New Doctor</strong>
                  <button
                    type="button"
                    onClick={() => setShowDoctorModal(false)}
                    style={{ border: 0, background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#666' }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleQuickCreateDoctor} style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      DOCTOR NAME *
                    </label>
                    <input
                      required
                      autoFocus
                      value={newDoctorData.name}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Dr. Ramesh Gupta"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      SPECIALIZATION (OPTIONAL)
                    </label>
                    <input
                      value={newDoctorData.specialization}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, specialization: e.target.value }))}
                      placeholder="e.g. Physician, Pediatrician"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      REGISTRATION / LICENSE NO. (OPTIONAL)
                    </label>
                    <input
                      value={newDoctorData.registrationNo}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, registrationNo: e.target.value }))}
                      placeholder="e.g. MCI-98765"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      PHONE (OPTIONAL)
                    </label>
                    <input
                      type="tel"
                      value={newDoctorData.phone}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowDoctorModal(false)}
                      style={{
                        border: '1px solid #cadcd7',
                        background: '#f4f8f7',
                        color: '#446059',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createDoctorMutation.isPending}
                      style={{
                        border: 0,
                        background: '#007a70',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {createDoctorMutation.isPending ? 'Saving...' : 'Save & Select'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Medicines Table Card */}
        <div className="pos-table-card" style={{ overflow: 'visible' }}>
          <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
            <table className="pos-table">
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '60px' }} />
                <col style={{ width: '280px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '40px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="center">S.No</th>
                  <th>Type</th>
                  <th>DRUG</th>
                  <th>BATCH</th>
                  <th>EXPIRY</th>
                  <th className="center">QTY</th>
                  <th className="center">TABS</th>
                  <th className="right">MRP</th>
                  <th className="center">DISC%</th>
                  <th className="right">TOTAL</th>
                  <th className="center"></th>
                </tr>
              </thead>
              <tbody>
                {/* Active fast-entry row matching table style */}
                <tr style={{ background: '#f6fbf9' }}>
                  <td className="center font-bold text-slate-500">
                    <button
                      type="button"
                      onClick={submitEntryRow}
                      style={{ border: 0, background: '#007a70', color: '#fff', borderRadius: '4px', width: '20px', height: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                      title="Add line"
                    >
                      +
                    </button>
                  </td>
                  <td>
                    <select
                      value={entryRow.type}
                      onChange={(e) => setEntryRow({ ...entryRow, type: e.target.value })}
                      style={{ height: '26px', padding: '0 4px' }}
                    >
                      <option>Rx</option>
                      <option>OTC</option>
                    </select>
                  </td>
                  <td style={{ position: 'relative' }}>
                    <input
                      ref={(el) => { entryRefs.current.search = el; }}
                      value={drugSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDrugSearch(val);
                        setShowDrugDropdown(true);
                      }}
                      onFocus={() => setShowDrugDropdown(true)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search drug / medicine..."
                      style={{ width: '100%', fontWeight: 600 }}
                    />
                    {showDrugDropdown && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(100% + 4px)',
                        background: '#ffffff',
                        border: '1px solid #b7d6ce',
                        borderRadius: '6px',
                        boxShadow: '0 12px 28px rgba(10, 45, 40, 0.22)',
                        zIndex: 9999,
                        maxHeight: '260px',
                        overflowY: 'auto'
                      }}>
                        {filteredDrugSuggestions.length === 0 ? (
                          <div style={{ padding: '10px', fontSize: '11px', color: '#7a8e89', textAlign: 'center' }}>
                            No matching drug found in stock.
                          </div>
                        ) : (
                          filteredDrugSuggestions.map((group, idx) => {
                            const primaryBatch = group.batches[0];
                            const extraBatchesCount = group.batches.length - 1;
                            return (
                              <div
                                key={group.productId}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  applySelectedBatch(primaryBatch);
                                }}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  width: '100%',
                                  padding: '8px 10px',
                                  background: highlightedIndex === idx ? '#e2f2ee' : '#fff',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #edf4f2',
                                  fontSize: '11px'
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ color: '#1a3832' }}>{group.productName}</strong>
                                    {extraBatchesCount > 0 && (
                                      <span style={{
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        padding: '1px 5px',
                                        borderRadius: '10px',
                                        border: '1px solid #bae6fd'
                                      }}>
                                        +{extraBatchesCount} batches
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '9.5px', color: '#68827c', marginTop: '2px' }}>
                                    Batch: {primaryBatch.batchNumber} • Exp: {primaryBatch.expiryDate}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <b style={{ color: '#007a70' }}>{money(primaryBatch.mrp)}</b>
                                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#15806e' }}>
                                    Total Stock: {group.totalStock}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        value={entryRow.batch}
                        readOnly
                        placeholder="Batch"
                        onClick={() => {
                          if (entryRow.productId) setShowBatchDropdown(!showBatchDropdown);
                        }}
                        style={{
                          width: '100%',
                          background: entryRow.productId ? '#ffffff' : '#f4f8f7',
                          cursor: entryRow.productId ? 'pointer' : 'default',
                          fontWeight: 600
                        }}
                      />
                      {(() => {
                        const currentGroup = productBatchesMap.get(entryRow.productId);
                        const otherBatchesCount = currentGroup ? currentGroup.batches.length - 1 : 0;
                        if (otherBatchesCount > 0) {
                          return (
                            <button
                              type="button"
                              onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                              style={{
                                marginLeft: '-24px',
                                background: '#0284c7',
                                color: '#fff',
                                border: 0,
                                borderRadius: '10px',
                                fontSize: '8.5px',
                                fontWeight: 'bold',
                                padding: '1px 4px',
                                cursor: 'pointer',
                                zIndex: 2
                              }}
                              title="Switch batch"
                            >
                              +{otherBatchesCount}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Batch Picker Dropdown */}
                    {showBatchDropdown && entryRow.productId && (() => {
                      const currentGroup = productBatchesMap.get(entryRow.productId);
                      const batches = currentGroup ? currentGroup.batches : [];
                      return (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 'calc(100% + 4px)',
                          background: '#fff',
                          border: '1px solid #94d3c3',
                          borderRadius: '6px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                          zIndex: 9999,
                          minWidth: '220px',
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}>
                          <div style={{ padding: '5px 8px', background: '#e6f4f0', fontSize: '9px', fontWeight: 'bold', color: '#0d695b', borderBottom: '1px solid #cce8e0' }}>
                            SELECT BATCH
                          </div>
                          {batches.map((b) => (
                            <div
                              key={b.batchId}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applySelectedBatch(b);
                              }}
                              style={{
                                padding: '6px 8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #f0f6f4',
                                cursor: 'pointer',
                                background: entryRow.batchId === b.batchId ? '#eef7f5' : '#fff'
                              }}
                            >
                              <div>
                                <strong style={{ color: '#164e43', fontSize: '10.5px' }}>{b.batchNumber}</strong>
                                <div style={{ fontSize: '9px', color: '#68827c' }}>Exp: {b.expiryDate}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#007a70', fontWeight: 'bold', fontSize: '10.5px' }}>{money(b.mrp)}</div>
                                <div style={{ fontSize: '9px', color: '#16a34a' }}>Stock: {b.stock}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <input
                      value={entryRow.expiry}
                      readOnly
                      placeholder="MM/YY"
                      style={{ width: '100%', background: '#f4f8f7' }}
                    />
                  </td>
                  <td className="center" style={{ position: 'relative' }}>
                    {entryRow.productId && (
                      <div style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#007a70',
                        color: '#fff',
                        fontSize: '8.5px',
                        fontWeight: 'bold',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        zIndex: 10
                      }}>
                        {entryRow.stock} in stock
                      </div>
                    )}
                    <input
                      ref={(el) => { entryRefs.current.qty = el; }}
                      type="number"
                      min="0"
                      value={entryRow.qty}
                      onChange={(e) => setEntryRow(recalcRow({ ...entryRow, qty: Math.max(0, Number(e.target.value || 0)) }))}
                      onKeyDown={(e) => handleEntryKeyDown(e, 'qty')}
                      style={{ width: '54px', textAlign: 'center', fontWeight: 'bold' }}
                    />
                  </td>
                  <td className="center">
                    <input
                      ref={(el) => { entryRefs.current.tabs = el; }}
                      type="number"
                      min="0"
                      value={entryRow.tabs}
                      onChange={(e) => setEntryRow(recalcRow({ ...entryRow, tabs: Math.max(0, Number(e.target.value || 0)) }))}
                      onKeyDown={(e) => handleEntryKeyDown(e, 'tabs')}
                      style={{ width: '54px', textAlign: 'center' }}
                    />
                  </td>
                  <td className="right font-semibold">
                    {money(entryRow.mrp)}
                  </td>
                  <td className="center">
                    <input
                      ref={(el) => { entryRefs.current.disc = el; }}
                      type="number"
                      min="0"
                      max="100"
                      value={entryRow.disc}
                      onChange={(e) => setEntryRow(recalcRow({ ...entryRow, disc: Number(e.target.value || 0) }))}
                      onKeyDown={(e) => handleEntryKeyDown(e, 'disc')}
                      style={{ width: '46px', textAlign: 'center' }}
                    />
                  </td>
                  <td className="right font-bold text-slate-800">
                    {money(entryRow.total)}
                  </td>
                  <td className="center"></td>
                </tr>

                {/* Entered Items */}
                {rows.map((row, idx) => {
                  const currentGroup = productBatchesMap.get(row.productId);
                  const batches = currentGroup ? currentGroup.batches : [];
                  const otherBatchesCount = batches.length - 1;

                  return (
                    <tr key={row.id}>
                      <td className="center text-slate-500 font-semibold">{idx + 1}</td>
                      <td>
                        <select
                          value={row.type || 'Rx'}
                          onChange={(e) => updateExistingRow(row.id, 'type', e.target.value)}
                          style={{ height: '24px', padding: '0 2px', fontSize: '10px' }}
                        >
                          <option>Rx</option>
                          <option>OTC</option>
                        </select>
                      </td>
                      <td className="font-bold text-slate-800">{row.itemName}</td>
                      <td style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBatchRowId(activeBatchRowId === row.id ? null : row.id);
                            }}
                            style={{
                              border: '1px solid #d0deda',
                              background: '#fff',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: '#164e43',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: '100%',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{row.batch}</span>
                            {otherBatchesCount > 0 && (
                              <span
                                style={{
                                  background: '#0284c7',
                                  color: '#fff',
                                  borderRadius: '8px',
                                  fontSize: '8px',
                                  fontWeight: 'bold',
                                  padding: '0 4px',
                                }}
                              >
                                +{otherBatchesCount}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Batch Selector Dropdown for Existing Row */}
                        {activeBatchRowId === row.id && batches.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 'calc(100% + 4px)',
                            background: '#fff',
                            border: '1px solid #94d3c3',
                            borderRadius: '6px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            zIndex: 9999,
                            minWidth: '220px',
                            maxHeight: '180px',
                            overflowY: 'auto'
                          }}>
                            <div style={{ padding: '5px 8px', background: '#e6f4f0', fontSize: '9px', fontWeight: 'bold', color: '#0d695b', borderBottom: '1px solid #cce8e0' }}>
                              SWITCH BATCH
                            </div>
                            {batches.map((b) => (
                              <div
                                key={b.batchId}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  switchExistingRowBatch(row.id, b);
                                }}
                                style={{
                                  padding: '6px 8px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: '1px solid #f0f6f4',
                                  cursor: 'pointer',
                                  background: row.batchId === b.batchId ? '#eef7f5' : '#fff'
                                }}
                              >
                                <div>
                                  <strong style={{ color: '#164e43', fontSize: '10.5px' }}>{b.batchNumber}</strong>
                                  <div style={{ fontSize: '9px', color: '#68827c' }}>Exp: {b.expiryDate}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#007a70', fontWeight: 'bold', fontSize: '10.5px' }}>{money(b.mrp)}</div>
                                  <div style={{ fontSize: '9px', color: '#16a34a' }}>Stock: {b.stock}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-slate-600">{row.expiry}</td>
                      <td className="center">
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={(e) => updateExistingRow(row.id, 'qty', Math.max(0, Number(e.target.value || 0)))}
                          style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', height: '24px', padding: '2px 4px' }}
                        />
                      </td>
                      <td className="center">
                        <input
                          type="number"
                          min="0"
                          value={row.tabs}
                          onChange={(e) => updateExistingRow(row.id, 'tabs', Math.max(0, Number(e.target.value || 0)))}
                          style={{ width: '50px', textAlign: 'center', height: '24px', padding: '2px 4px' }}
                        />
                      </td>
                      <td className="right font-semibold">{money(row.mrp)}</td>
                      <td className="center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.disc}
                          onChange={(e) => updateExistingRow(row.id, 'disc', Math.max(0, Math.min(100, Number(e.target.value || 0))))}
                          style={{ width: '42px', textAlign: 'center', height: '24px', padding: '2px 4px' }}
                        />
                      </td>
                      <td className="right font-bold text-slate-900">{money(row.total)}</td>
                      <td className="center">
                        <button
                          type="button"
                          onClick={() => setRows((curr) => curr.filter((r) => r.id !== row.id))}
                          style={{ border: 0, background: 'transparent', color: '#c44242', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Notes & Document Upload Section */}
        <div className="pos-bottom-section">
          <div className="pos-notes-card">
            <div className="pos-notes-label">ADDITIONAL NOTES</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Enter any specific instructions, clinical notes, or delivery remarks here..."
            />
          </div>

          <div className="pos-docs-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="pos-upload-box" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const formData = new FormData();
                    files.forEach((f) => formData.append('files', f));

                    try {
                      const res = unwrap(await api.post('/upload/prescription', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      }));
                      if (Array.isArray(res)) {
                        setPrescriptionImages((prev) => [...prev, ...res]);
                      }
                    } catch (err) {
                      // Fallback to local Base64 reading if Cloudinary keys are not yet configured
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (reader.result) {
                            setPrescriptionImages((prev) => [...prev, reader.result]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                    e.target.value = '';
                  }}
                />
                <Upload size={14} />
                <span>+ Upload Prescription</span>
              </label>

              <label className="pos-upload-box" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const formData = new FormData();
                    files.forEach((f) => formData.append('files', f));

                    try {
                      const res = unwrap(await api.post('/upload/prescription', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      }));
                      if (Array.isArray(res)) {
                        setPrescriptionImages((prev) => [...prev, ...res]);
                      }
                    } catch (err) {
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (reader.result) {
                            setPrescriptionImages((prev) => [...prev, reader.result]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                    e.target.value = '';
                  }}
                />
                <Plus size={14} />
                <span>+ Add More Files</span>
              </label>
            </div>

            {/* Prescription Thumbnails & Attachments List */}
            {prescriptionImages.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {prescriptionImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '64px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #cadcd7',
                      background: '#fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Prescription ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => {
                        const win = window.open(imgUrl, '_blank');
                        if (!win) {
                          window.alert('Pop-up blocked. Please allow pop-ups to view full prescription.');
                        }
                      }}
                      title="Click to view full size"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (typeof imgUrl === 'string' && imgUrl.includes('cloudinary.com')) {
                          try {
                            await api.delete('/upload/prescription', { data: { url: imgUrl } });
                          } catch (e) {
                            console.warn('Cloudinary delete error:', e);
                          }
                        }
                        setPrescriptionImages((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'rgba(225, 29, 72, 0.9)',
                        color: '#fff',
                        border: 0,
                        fontSize: '11px',
                        lineHeight: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove from sale and delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Billing Summary Bar matching formula in screenshot */}
      <div className="pos-bottom-bar">
        <div className="pos-math-formula">
          <div className="pos-math-pill">
            <span>Sub Total</span>
            <b>{money(calculations.subTotal)}</b>
          </div>
          <span>-</span>
          <div className="pos-math-pill">
            <span>Disc</span>
            <b>{money(calculations.discount)}</b>
          </div>
          <span>+</span>
          <div className="pos-math-pill">
            <span>Tax</span>
            <b>{money(calculations.tax)}</b>
          </div>
          <span>=</span>
          <div className="pos-final-net">
            <span>NET BILL</span>
            <b>{money(calculations.grandTotal)}</b>
          </div>
        </div>

        <div className="pos-bar-buttons">
          <button
            type="button"
            onClick={() => saveSaleMutation.mutate({ isDraft: true })}
            disabled={saveSaleMutation.isPending}
            className="pos-bar-btn-draft"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => saveSaleMutation.mutate({ isDraft: false })}
            disabled={saveSaleMutation.isPending}
            className="pos-bar-btn-add"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Sale Drafts Modal / Drawer */}
      {showDraftsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
          }}
          onClick={() => setShowDraftsModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(780px, 95vw)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2ece9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8faf9',
            }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#133e36' }}>Saved Sales Drafts</strong>
                <div style={{ fontSize: '11px', color: '#627a75' }}>Resume or delete pending draft bills</div>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                style={{ border: 0, background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#68827d' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {saleDrafts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#718a84' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                  <strong style={{ fontSize: '14px', color: '#274740' }}>No saved sales drafts</strong>
                  <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Save any in-progress bill as draft to resume it later from this section.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Are you sure you want to delete ALL ${saleDrafts.length} sales draft(s)? This action cannot be undone.`)) return;
                        for (const d of saleDrafts) {
                          try {
                            await unwrap(await api.delete(`/sales/${d.id}`));
                          } catch (e) {
                            console.warn('Failed to delete draft', d.id, e);
                          }
                        }
                        queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
                        queryClient.invalidateQueries({ queryKey: ['sales-list'] });
                        queryClient.invalidateQueries({ queryKey: ['sales-drafts-page'] });
                      }}
                      style={{
                        border: '1px solid #fed7aa',
                        background: '#fff7ed',
                        color: '#c2410c',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Delete All Drafts ({saleDrafts.length})
                    </button>
                  </div>
                  <table className="pos-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th className="right">Total</th>
                        <th className="center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleDrafts.map((draft) => (
                        <tr key={draft.id}>
                          <td className="font-mono font-bold text-slate-800">{draft.invoiceNumber}</td>
                          <td className="text-slate-500">
                            {draft.invoiceDate ? new Date(draft.invoiceDate).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td>
                            <div className="font-semibold text-slate-800">{draft.customer?.name || 'Walk-in / Cash Sale'}</div>
                            {draft.customer?.phone && <div style={{ fontSize: '9px', color: '#7a8f89' }}>📞 {draft.customer.phone}</div>}
                          </td>
                          <td className="text-slate-600 font-semibold">{draft.items?.length || 0} items</td>
                          <td className="right font-bold text-slate-900">{money(draft.totalAmount)}</td>
                          <td className="center" style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => loadDraftIntoPos(draft)}
                              style={{
                                border: '1px solid #b7d6ce',
                                background: '#edf7f5',
                                color: '#007a70',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                borderRadius: '4px',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                marginRight: '6px'
                              }}
                            >
                              Resume
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this sales draft? This action cannot be undone.')) {
                                  deleteDraftMutation.mutate(draft.id);
                                }
                              }}
                              style={{
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                color: '#e11d48',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                borderRadius: '4px',
                                padding: '3px 8px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div style={{
              padding: '10px 20px',
              borderTop: '1px solid #e2ece9',
              background: '#f8faf9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '11px', color: '#68827c' }}>Total Drafts: <b>{saleDrafts.length}</b></span>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                style={{
                  border: '1px solid #cadcd7',
                  background: '#fff',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
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

function SalesDraftsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDraftIds, setSelectedDraftIds] = useState([]);

  const draftsQuery = useQuery({
    queryKey: ['sales-drafts-page'],
    queryFn: async () => {
      const res = unwrap(await api.get('/sales?status=DRAFT'));
      return Array.isArray(res) ? res : [];
    },
  });

  const drafts = draftsQuery.data || [];

  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      const matchesSearch =
        !search ||
        (draft.invoiceNumber && draft.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
        (draft.customer?.name && draft.customer.name.toLowerCase().includes(search.toLowerCase())) ||
        (draft.customer?.phone && draft.customer.phone.includes(search));

      const draftDateStr = draft.invoiceDate ? new Date(draft.invoiceDate).toISOString().slice(0, 10) : '';
      const matchesFrom = !fromDate || (draftDateStr && draftDateStr >= fromDate);
      const matchesTo = !toDate || (draftDateStr && draftDateStr <= toDate);

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [drafts, search, fromDate, toDate]);

  const allSelected = filteredDrafts.length > 0 && selectedDraftIds.length === filteredDrafts.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDraftIds([]);
    } else {
      setSelectedDraftIds(filteredDrafts.map((d) => d.id));
    }
  };

  const toggleSelectDraft = (id) => {
    setSelectedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this sales draft? This action cannot be undone.')) return;
    try {
      await unwrap(await api.delete(`/sales/${draftId}`));
      setSelectedDraftIds((prev) => prev.filter((id) => id !== draftId));
      await draftsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    } catch (error) {
      window.alert(error?.message || 'Unable to delete draft');
    }
  };

  const removeSelectedDrafts = async () => {
    if (!selectedDraftIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedDraftIds.length} selected sales draft(s)? This action cannot be undone.`)) {
      return;
    }
    try {
      for (const id of selectedDraftIds) {
        await unwrap(await api.delete(`/sales/${id}`));
      }
      setSelectedDraftIds([]);
      await draftsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    } catch (error) {
      window.alert(error?.message || 'Failed to delete some drafts');
      await draftsQuery.refetch();
    }
  };

  const removeAllDrafts = async () => {
    if (!drafts.length) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${drafts.length} sales draft(s)? This action cannot be undone.`)) {
      return;
    }
    try {
      for (const d of drafts) {
        await unwrap(await api.delete(`/sales/${d.id}`));
      }
      setSelectedDraftIds([]);
      await draftsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    } catch (error) {
      window.alert(error?.message || 'Failed to delete all drafts');
      await draftsQuery.refetch();
    }
  };

  const totalDraftItems = filteredDrafts.reduce((sum, draft) => sum + (draft.items?.length || 0), 0);
  const totalDraftValue = filteredDrafts.reduce((sum, draft) => sum + Number(draft.totalAmount || 0), 0);

  return (
    <div className="purchase-entry-page drafts-page" style={{ padding: '16px 20px', minHeight: '100vh', background: '#f5f7f6' }}>
      <div className="purchase-entry-card drafts-shell" style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid #dce8e4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="drafts-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <p className="section-kicker" style={{ fontSize: '11px', fontWeight: 700, color: '#007a70', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
              Sales Ledger
            </p>
            <h2 className="drafts-title" style={{ fontSize: '20px', fontWeight: 800, color: '#133e36', margin: '2px 0 0' }}>
              Saved Sales Drafts
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {drafts.length > 0 && (
              <>
                {selectedDraftIds.length > 0 && (
                  <button
                    type="button"
                    onClick={removeSelectedDrafts}
                    style={{
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#e11d48',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    🗑️ Delete Selected ({selectedDraftIds.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={removeAllDrafts}
                  style={{
                    border: '1px solid #fed7aa',
                    background: '#fff7ed',
                    color: '#c2410c',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Delete All ({drafts.length})
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => navigate('/sales/add')}
              className="primary-action-btn"
              style={{
                background: '#007a70',
                color: '#fff',
                border: 0,
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              + New Sale Draft
            </button>
          </div>
        </div>

        {/* Stats KPIs */}
        <div className="drafts-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Total Drafts</span>
            <strong style={{ fontSize: '18px', color: '#133e36' }}>{filteredDrafts.length}</strong>
          </div>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Total Medicines</span>
            <strong style={{ fontSize: '18px', color: '#133e36' }}>{totalDraftItems}</strong>
          </div>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Estimated Value</span>
            <strong style={{ fontSize: '18px', color: '#007a70' }}>{money(totalDraftValue)}</strong>
          </div>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Last Updated</span>
            <strong style={{ fontSize: '15px', color: '#133e36' }}>
              {drafts.length ? `${new Date(drafts[0].updatedAt || drafts[0].createdAt).toLocaleDateString('en-IN')} ${new Date(drafts[0].updatedAt || drafts[0].createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}
            </strong>
          </div>
        </div>

        {/* Date and Search Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#f8faf9', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2ece9', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a8e89' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, customer or phone..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                fontSize: '12px',
                background: '#fff'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#446059' }}>From Date:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#446059' }}>To Date:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fff' }}
            />
          </div>

          {(search || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFromDate('');
                setToDate('');
              }}
              style={{
                border: '1px solid #cadcd7',
                background: '#fff',
                color: '#627a75',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Drafts List Table */}
        {filteredDrafts.length === 0 ? (
          <div className="empty-drafts-state" style={{ textAlign: 'center', padding: '40px 20px', background: '#fcfdfd', borderRadius: '8px', border: '1px dashed #cadcd7' }}>
            <div className="empty-drafts-icon" style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
            <h3 style={{ fontSize: '15px', color: '#133e36', margin: '0 0 4px' }}>No sales drafts found</h3>
            <p style={{ fontSize: '12px', color: '#68827c', margin: '0 0 14px' }}>
              {search || fromDate || toDate ? 'Try adjusting your search or date filters.' : 'Save in-progress bills as drafts to resume and bill them later.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/sales/add')}
              className="primary-action-btn"
              style={{
                background: '#007a70',
                color: '#fff',
                border: 0,
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Create New Draft
            </button>
          </div>
        ) : (
          <div className="drafts-table-panel" style={{ overflowX: 'auto' }}>
            <table className="pos-table" style={{ width: '100%', minWidth: '700px' }}>
              <thead>
                <tr>
                  <th style={{ width: 42, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: '#008b8b' }}
                      title="Select all drafts"
                    />
                  </th>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Bill Date</th>
                  <th>Medicines</th>
                  <th className="right">Total Value</th>
                  <th>Saved At</th>
                  <th className="center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => (
                  <tr key={draft.id} style={{ background: selectedDraftIds.includes(draft.id) ? '#f0fdf9' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedDraftIds.includes(draft.id)}
                        onChange={() => toggleSelectDraft(draft.id)}
                        style={{ cursor: 'pointer', accentColor: '#008b8b' }}
                      />
                    </td>
                    <td className="font-mono font-bold text-slate-800">{draft.invoiceNumber}</td>
                    <td>
                      <div className="font-semibold text-slate-800">{draft.customer?.name || 'Walk-in Customer'}</div>
                      {draft.customer?.phone && <div style={{ fontSize: '10px', color: '#7a8f89' }}>📞 {draft.customer.phone}</div>}
                    </td>
                    <td className="text-slate-600">
                      {draft.invoiceDate ? new Date(draft.invoiceDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="text-slate-700 font-semibold">{draft.items?.length || 0} item(s)</td>
                    <td className="right font-bold text-slate-900">{money(draft.totalAmount)}</td>
                    <td className="text-slate-500 text-xs">
                      {draft.updatedAt ? `${new Date(draft.updatedAt).toLocaleDateString('en-IN')} ${new Date(draft.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}
                    </td>
                    <td className="center" style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/sales/add?draft=${draft.id}`)}
                        style={{
                          border: '1px solid #b7d6ce',
                          background: '#edf7f5',
                          color: '#007a70',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '4px 10px',
                          cursor: 'pointer',
                          marginRight: '6px'
                        }}
                      >
                        Edit / Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDraft(draft.id)}
                        style={{
                          border: '1px solid #fecaca',
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '4px 10px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sales() {
  const location = useLocation();
  if (location.pathname === '/modules/sales-drafts') return <SalesDraftsPage />;
  return location.pathname.endsWith('/add') ? <AddSalePos /> : <SalesList />;
}

