import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw, Search, Calendar, FileText, ArrowLeft,
  DollarSign, Check, X, Printer, Package, ChevronRight
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function SalesReturnsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showNewReturnModal, setShowNewReturnModal] = useState(false);

  // Return Creation Modal State
  const [searchInvoice, setSearchInvoice] = useState('');
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');

  // Fetch Sales Returns List
  const returnsQuery = useQuery({
    queryKey: ['sales-returns-list', search, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      return unwrap(await api.get(`/sales-returns?${params.toString()}`));
    },
  });

  const returns = returnsQuery.data || [];

  // Query completed sales to initiate a return (loads all recent sales by default)
  const salesSearchQuery = useQuery({
    queryKey: ['sales-for-return', searchInvoice],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('status', 'COMPLETED');
      if (searchInvoice.trim()) {
        params.append('search', searchInvoice.trim());
      }
      const res = unwrap(await api.get(`/sales?${params.toString()}`));
      return Array.isArray(res) ? res : [];
    },
    enabled: showNewReturnModal,
  });

  const salesSearchResults = salesSearchQuery.data || [];

  // Mutation to Submit Sales Return
  const createReturnMutation = useMutation({
    mutationFn: async ({ saleId, items, reason }) => {
      return unwrap(await api.post(`/sales/${saleId}/return`, { items, reason }));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales-returns-list'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      window.alert('Sales return processed successfully! Stock has been returned to inventory and customer ledger updated.');
      setShowNewReturnModal(false);
      setSelectedSaleForReturn(null);
      setReturnItems([]);
      setReturnReason('');
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to process sales return');
    },
  });

  // Mutation to Undo / Cancel a Sales Return
  const cancelReturnMutation = useMutation({
    mutationFn: async (returnId) => {
      return unwrap(await api.post(`/sales-returns/${returnId}/cancel`));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales-returns-list'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      setSelectedReturn(null);
      window.alert('Sales return undone successfully! Stock has been deducted back out of inventory and customer ledger corrected.');
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to undo sales return');
    },
  });

  const handleSelectSaleForReturn = (sale) => {
    setSelectedSaleForReturn(sale);
    // Initialize returnable items
    const items = (sale.items || []).map((it) => ({
      saleItemId: it.id,
      productId: it.productId,
      productName: it.product?.name || 'Medicine',
      batchNumber: it.batch?.batchNumber || '—',
      soldQty: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || it.mrp || 0),
      returnQty: 0,
      reason: '',
    }));
    setReturnItems(items);
  };

  const handleReturnQtyChange = (saleItemId, qty) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.saleItemId === saleItemId) {
          const validQty = Math.max(0, Math.min(item.soldQty, Number(qty) || 0));
          return { ...item, returnQty: validQty };
        }
        return item;
      })
    );
  };

  const totalReturnRefund = useMemo(() => {
    return returnItems.reduce((sum, item) => sum + (item.returnQty * item.unitPrice), 0);
  }, [returnItems]);

  const handleSubmitReturn = () => {
    const activeReturns = returnItems
      .filter((it) => it.returnQty > 0)
      .map((it) => ({
        saleItemId: it.saleItemId,
        quantity: it.returnQty,
        reason: it.reason || returnReason || 'Customer Return',
      }));

    if (!activeReturns.length) {
      return window.alert('Please enter a return quantity greater than 0 for at least one item.');
    }

    createReturnMutation.mutate({
      saleId: selectedSaleForReturn.id,
      items: activeReturns,
      reason: returnReason,
    });
  };

  const stats = useMemo(() => {
    const totalCount = returns.length;
    const totalRefund = returns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const totalItems = returns.reduce((sum, r) => sum + (r.items?.length || 0), 0);
    return { totalCount, totalRefund, totalItems };
  }, [returns]);

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={20} color="#007a70" /> Sales Returns (Credit Notes)
          </h1>
        </div>
        <div className="pos-top-actions">
          <button
            onClick={() => setShowNewReturnModal(true)}
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
            <RotateCcw size={16} /> + Process Sale Return
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#edf7f5', color: '#007a70', display: 'grid', placeItems: 'center' }}>
              <RotateCcw size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Returns</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#133e36' }}>{stats.totalCount}</div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fff1f2', color: '#e11d48', display: 'grid', placeItems: 'center' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Returned Amount</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#e11d48' }}>{money(stats.totalRefund)}</div>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }}>
              <Package size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Restocked Units</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>{stats.totalItems} line(s)</div>
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search return #, original invoice, customer..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} color="#007a70" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd', outline: 'none' }}
              title="From Date"
            />
            <span style={{ fontSize: '11px', color: '#889f9a' }}>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd', outline: 'none' }}
              title="To Date"
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

        {/* Returns Table */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Return No.</th>
                <th>Return Date</th>
                <th>Original Invoice</th>
                <th>Customer</th>
                <th>Items Returned</th>
                <th className="right">Refund Amount</th>
                <th className="center">Status</th>
                <th className="center" style={{ width: '90px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {returnsQuery.isLoading && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading sales returns...</td>
                </tr>
              )}
              {!returnsQuery.isLoading && !returns.length && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔄</div>
                    <b style={{ color: '#133e36' }}>No sales returns recorded</b>
                    <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Click <strong>+ Process Sale Return</strong> to accept returned items from customers.</p>
                  </td>
                </tr>
              )}
              {returns.map((ret) => (
                <tr key={ret.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedReturn(ret)}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>{ret.returnNumber}</td>
                  <td style={{ fontSize: '11px', color: '#555' }}>
                    {ret.returnDate ? new Date(ret.returnDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {ret.sale?.invoiceNumber || '—'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: '#133e36', fontSize: '11.5px' }}>{ret.customer?.name || 'Cash Sale / Walk-in'}</div>
                    {ret.customer?.phone && <div style={{ fontSize: '10px', color: '#68827c' }}>📞 {ret.customer.phone}</div>}
                  </td>
                  <td style={{ fontSize: '11px', fontWeight: 600, color: '#133e36' }}>
                    {ret.items?.length || 0} item(s)
                  </td>
                  <td className="right" style={{ fontWeight: 800, color: '#e11d48', fontSize: '12.5px' }}>
                    {money(ret.totalAmount)}
                  </td>
                  <td className="center">
                    <span style={{
                      display: 'inline-flex',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: '#edf7f5',
                      color: '#007a70',
                      border: '1px solid #b7d6ce'
                    }}>
                      {ret.status || 'COMPLETED'}
                    </span>
                  </td>
                  <td className="center" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedReturn(ret)}
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
                      {ret.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Undo sales return ${ret.returnNumber}? Returned stock will be deducted back and customer ledger adjusted.`)) {
                              cancelReturnMutation.mutate(ret.id);
                            }
                          }}
                          disabled={cancelReturnMutation.isPending}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            background: '#fff1f2',
                            color: '#e11d48',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Undo this return"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Wizard Modal */}
      {showNewReturnModal && (
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
          onClick={() => {
            setShowNewReturnModal(false);
            setSelectedSaleForReturn(null);
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(880px, 95vw)',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8faf9' }}>
              <div>
                <b style={{ fontSize: '16px', color: '#133e36' }}>Process Customer Sale Return</b>
                <div style={{ fontSize: '11px', color: '#68827c' }}>Return full or partial items back to stock</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewReturnModal(false);
                  setSelectedSaleForReturn(null);
                }}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Step 1: Search & Pick Invoice */}
              {!selectedSaleForReturn ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36' }}>
                      1. Select Sale Bill ({salesSearchResults.length} available)
                    </label>
                    <span style={{ fontSize: '11px', color: '#68827c' }}>Pick from recent bills below or filter by typing</span>
                  </div>

                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
                    <input
                      type="text"
                      value={searchInvoice}
                      onChange={(e) => setSearchInvoice(e.target.value)}
                      placeholder="Filter sales by invoice # (e.g. INV-377917), customer name or phone..."
                      style={{
                        width: '100%',
                        height: '38px',
                        paddingLeft: '34px',
                        paddingRight: '12px',
                        borderRadius: '6px',
                        border: '1px solid #cadcd7',
                        fontSize: '12px',
                        outline: 'none',
                        background: '#fcfdfd'
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Matching & All Invoices List Suggestions */}
                  <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                    {salesSearchQuery.isLoading && (
                      <div style={{ fontSize: '12px', color: '#718a84', padding: '24px 0', textAlign: 'center' }}>Loading sale bills...</div>
                    )}
                    {!salesSearchQuery.isLoading && salesSearchResults.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: '#718a84' }}>
                        No completed sales found matching "{searchInvoice}".
                      </div>
                    )}
                    {salesSearchResults.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => handleSelectSaleForReturn(sale)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #cadcd7',
                          background: '#fcfdfd',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                        className="hover:border-teal-600 hover:bg-teal-50/50"
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70', fontSize: '12.5px' }}>{sale.invoiceNumber}</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>({sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'})</span>
                            <span style={{ fontSize: '10px', background: '#edf7f5', color: '#007a70', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {sale.items?.length || 0} item(s)
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#133e36', marginTop: '3px' }}>
                            Customer: <b>{sale.customer?.name || 'Walk-in / Cash Sale'}</b> {sale.customer?.phone ? `(${sale.customer.phone})` : ''}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#7a8f89', marginTop: '2px' }}>
                            {(sale.items || []).map((it) => `${it.product?.name || 'Medicine'} (×${it.quantity})`).slice(0, 3).join(', ')}
                            {(sale.items || []).length > 3 ? ` +${sale.items.length - 3} more` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: '#133e36', fontSize: '13px' }}>{money(sale.totalAmount)}</div>
                          <div style={{ fontSize: '11px', color: '#007a70', fontWeight: 700, marginTop: '2px' }}>Select Bill →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Step 2: Itemize Return Quantities */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#edf7f5', padding: '10px 14px', borderRadius: '6px', border: '1px solid #b7d6ce' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#68827c' }}>Returning from invoice: </span>
                      <b style={{ fontFamily: 'monospace', color: '#007a70' }}>{selectedSaleForReturn.invoiceNumber}</b>
                      <span style={{ fontSize: '11.5px', color: '#133e36', marginLeft: '8px' }}>({selectedSaleForReturn.customer?.name || 'Cash Sale'})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSaleForReturn(null)}
                      style={{ border: '1px solid #cadcd7', background: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Change Invoice
                    </button>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36', display: 'block', marginBottom: '6px' }}>
                      2. Select Return Quantities for each medicine
                    </label>
                    <table className="pos-table" style={{ width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Batch</th>
                          <th style={{ textAlign: 'center' }}>Sold Qty</th>
                          <th className="right">Rate</th>
                          <th style={{ textAlign: 'center', width: '120px' }}>Return Qty</th>
                          <th className="right">Refund Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnItems.map((item) => (
                          <tr key={item.saleItemId}>
                            <td>
                              <b>{item.productName}</b>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{item.batchNumber}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.soldQty}</td>
                            <td className="right">{money(item.unitPrice)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                max={item.soldQty}
                                step="any"
                                value={item.returnQty}
                                onChange={(e) => handleReturnQtyChange(item.saleItemId, e.target.value)}
                                style={{
                                  width: '80px',
                                  height: '30px',
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  borderRadius: '4px',
                                  border: item.returnQty > 0 ? '1.5px solid #007a70' : '1px solid #cadcd7',
                                  background: item.returnQty > 0 ? '#edf7f5' : '#fff',
                                  outline: 'none'
                                }}
                              />
                            </td>
                            <td className="right" style={{ fontWeight: 800, color: item.returnQty > 0 ? '#e11d48' : '#68827c' }}>
                              {money(item.returnQty * item.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36', display: 'block', marginBottom: '4px' }}>
                      Return Reason / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Expired seal, customer requested dosage change, leftover strips..."
                      style={{
                        width: '100%',
                        height: '34px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: '1px solid #cadcd7',
                        fontSize: '11.5px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            {selectedSaleForReturn && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px' }}>
                  <span style={{ color: '#68827c' }}>Total Return Refund: </span>
                  <b style={{ color: '#e11d48', fontSize: '15px' }}>{money(totalReturnRefund)}</b>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewReturnModal(false);
                      setSelectedSaleForReturn(null);
                    }}
                    style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#fff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitReturn}
                    disabled={createReturnMutation.isPending || totalReturnRefund <= 0}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '6px',
                      border: 0,
                      background: totalReturnRefund > 0 ? '#007a70' : '#889f9a',
                      color: '#fff',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: totalReturnRefund > 0 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {createReturnMutation.isPending ? 'Processing...' : 'Confirm Return & Restock'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Detail View Modal */}
      {selectedReturn && (
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
          onClick={() => setSelectedReturn(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(780px, 95vw)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8faf9' }}>
              <div>
                <b style={{ fontSize: '16px', color: '#133e36' }}>Return Credit Note: {selectedReturn.returnNumber}</b>
                <div style={{ fontSize: '11px', color: '#68827c' }}>
                  Original Invoice: <b>{selectedReturn.sale?.invoiceNumber || '—'}</b> | {selectedReturn.returnDate ? new Date(selectedReturn.returnDate).toLocaleDateString('en-IN') : '-'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8faf9', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                <div style={{ fontSize: '11px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Customer Info</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36', marginTop: '2px' }}>{selectedReturn.customer?.name || 'Cash Sale / Walk-in'}</div>
                {selectedReturn.customer?.phone && <div style={{ fontSize: '11px', color: '#555' }}>📞 {selectedReturn.customer.phone}</div>}
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36', marginBottom: '6px' }}>Returned Medicines</div>
                <table className="pos-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th style={{ textAlign: 'center' }}>Returned Qty</th>
                      <th className="right">Price</th>
                      <th className="right">Total Refund</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReturn.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td><b>{it.product?.name || 'Medicine'}</b></td>
                        <td style={{ fontFamily: 'monospace' }}>{it.batch?.batchNumber || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.quantity}</td>
                        <td className="right">{money(it.unitPrice)}</td>
                        <td className="right" style={{ fontWeight: 800, color: '#e11d48' }}>{money(it.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8faf9', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#133e36' }}>Total Credit Issued:</span>
                <b style={{ fontSize: '15px', color: '#e11d48' }}>{money(selectedReturn.totalAmount)}</b>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {selectedReturn.status !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Undo and cancel sales return ${selectedReturn.returnNumber}? This will deduct returned stock back out of inventory and adjust customer balance.`)) {
                        cancelReturnMutation.mutate(selectedReturn.id);
                      }
                    }}
                    disabled={cancelReturnMutation.isPending}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                      background: '#fff1f2',
                      color: '#e11d48',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {cancelReturnMutation.isPending ? 'Undoing...' : 'Undo Return & Revert Stock'}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedReturn(null)}
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
