import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, RotateCcw, Printer,
  Calendar, Clock, DollarSign, CreditCard,
  FileText, Share2, MessageSquare
} from 'lucide-react';
import api, { unwrap } from '../../lib/api';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function SalesList() {
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
                          {isCompleted && (
                            <button
                              type="button"
                              onClick={() => {
                                const shareUrl = `${window.location.origin}/p/bill/${sale.id}`;
                                const customerName = sale.customer?.name || 'Valued Customer';
                                const msg = `Hello ${customerName}, here is your digital receipt for Bill #${sale.invoiceNumber}: ${shareUrl}`;
                                const phone = (sale.customer?.phone || '').replace(/[^0-9]/g, '');
                                if (phone) {
                                  window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                                } else {
                                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                              }}
                              style={{
                                padding: '3px 7px',
                                borderRadius: '4px',
                                border: '1px solid #a7f3d0',
                                background: '#ecfdf5',
                                color: '#16a34a',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title="Share on WhatsApp"
                            >
                              <MessageSquare size={12} />
                            </button>
                          )}
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
                {selectedSale.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/p/bill/${selectedSale.id}`;
                      const customerName = selectedSale.customer?.name || 'Valued Customer';
                      const msg = `Hello ${customerName}, here is your digital receipt for Bill #${selectedSale.invoiceNumber}: ${shareUrl}`;
                      const phone = (selectedSale.customer?.phone || '').replace(/[^0-9]/g, '');
                      if (phone) {
                        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                      } else {
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }
                    }}
                    style={{
                      border: '1px solid #a7f3d0',
                      background: '#ecfdf5',
                      color: '#059669',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <MessageSquare size={13} /> Share on WhatsApp
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePrint(selectedSale)}
                  style={{
                    border: '1px solid #cadcd7',
                    background: '#edf7f5',
                    color: '#007a70',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Printer size={13} /> Print Bill
                </button>
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
