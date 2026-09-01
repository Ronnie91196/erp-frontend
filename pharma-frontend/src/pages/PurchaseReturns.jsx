import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight, Calendar, Search, RefreshCw, Plus,
  Trash2, Eye, X, CheckCircle, AlertTriangle, Printer, Download, Truck, Package
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function PurchaseReturns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Fetch Returns
  const returnsQuery = useQuery({
    queryKey: ['purchase-returns-list', searchTerm, fromDate, toDate],
    queryFn: async () =>
      unwrap(
        await api.get('/purchase-returns', {
          params: {
            search: searchTerm || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
          },
        })
      ),
  });

  const cancelMutation = useMutation({
    mutationFn: async (returnId) =>
      unwrap(await api.post(`/purchase-returns/${returnId}/cancel`)),
    onSuccess: () => {
      window.alert('Purchase return cancelled successfully and inventory restored.');
      queryClient.invalidateQueries({ queryKey: ['purchase-returns-list'] });
      setSelectedReturn(null);
    },
    onError: (error) => {
      window.alert(error?.response?.data?.message || error?.message || 'Failed to cancel return');
    },
  });

  const handleCancelReturn = (returnId) => {
    if (window.confirm('Are you sure you want to cancel this purchase return? Stock will be restored to your inventory and supplier credit reversed.')) {
      cancelMutation.mutate(returnId);
    }
  };

  const returns = returnsQuery.data || [];

  // Summary Metrics
  const summary = useMemo(() => {
    const totalAmount = returns.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);
    const activeReturns = returns.filter((r) => r.status === 'COMPLETED').length;
    const cancelledReturns = returns.filter((r) => r.status === 'CANCELLED').length;
    return {
      totalReturns: returns.length,
      totalAmount,
      activeReturns,
      cancelledReturns,
    };
  }, [returns]);

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'PURCHASE RETURNS & DEBIT NOTES REPORT\n';
    csv += 'Return No,Return Date,Supplier Name,Original Invoice,Items Count,Subtotal,Tax,Total Amount,Status,Reason\n';

    returns.forEach((r) => {
      csv += `"${r.returnNumber}","${r.returnDate ? new Date(r.returnDate).toLocaleDateString('en-IN') : ''}","${r.supplier?.name || '—'}","${r.originalPurchase?.invoiceNumber || '—'}","${r.items?.length || 0}","${Number(r.subtotal || 0).toFixed(2)}","${Number(r.taxAmount || 0).toFixed(2)}","${Number(r.totalAmount || 0).toFixed(2)}","${r.status}","${r.reason || '—'}"\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Purchase_Returns_${new Date().toISOString().split('T')[0]}.csv`);
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
            <ArrowLeftRight size={20} color="#007a70" /> Purchase Returns & Supplier Debit Notes
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleExportCSV}
            style={{
              background: '#fff',
              color: '#007a70',
              border: '1px solid #cadcd7',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => navigate('/modules/create-debit-note')}
            style={{
              background: '#007a70',
              color: '#fff',
              border: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '7px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,122,112,0.28)'
            }}
          >
            <Plus size={15} /> + Create Purchase Return
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Purchase Returns</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
              {summary.totalReturns} Returns
            </div>
            <div style={{ fontSize: '10.5px', color: '#007a70', marginTop: '2px', fontWeight: 600 }}>
              {summary.activeReturns} Active / Processed
            </div>
          </div>

          <div style={{ background: '#fff1f2', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #fecaca' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Debit Notes Total Value</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
              {money(summary.totalAmount)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#991b1b', marginTop: '2px' }}>
              Supplier Balance Adjusted
            </div>
          </div>

          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Cancelled / Reverted</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#68827c', marginTop: '4px' }}>
              {summary.cancelledReturns} Reverted
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Stock Fully Restored
            </div>
          </div>
        </div>

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

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search return # or supplier name..."
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
            {(fromDate || toDate || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setSearchTerm('');
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
              onClick={() => returnsQuery.refetch()}
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
              <RefreshCw size={13} className={returnsQuery.isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Returns Table */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Return No.</th>
                <th>Return Date</th>
                <th>Supplier Name</th>
                <th>Reason</th>
                <th className="right">Subtotal</th>
                <th className="right">Tax Credit</th>
                <th className="right">Debit Note Total</th>
                <th className="center">Status</th>
                <th className="center" style={{ width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnsQuery.isLoading && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading purchase returns...</td></tr>
              )}
              {!returnsQuery.isLoading && returns.length === 0 && (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No purchase returns recorded.</td></tr>
              )}
              {returns.map((ret) => (
                <tr
                  key={ret.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedReturn(ret)}
                  className="hover:bg-teal-50/40"
                >
                  <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>
                    {ret.returnNumber}
                  </td>
                  <td style={{ fontSize: '11px', color: '#555' }}>
                    {ret.returnDate ? new Date(ret.returnDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <b style={{ color: '#133e36' }}>{ret.supplier?.name || '—'}</b>
                  </td>
                  <td style={{ fontSize: '11px', color: '#68827c' }}>
                    {ret.reason || 'Expired / Damaged / Excess Stock'}
                  </td>
                  <td className="right">{money(ret.subtotal)}</td>
                  <td className="right">{money(ret.taxAmount)}</td>
                  <td className="right" style={{ fontWeight: 800, color: '#dc2626' }}>
                    {money(ret.totalAmount)}
                  </td>
                  <td className="center">
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: ret.status === 'COMPLETED' ? '#ecfdf5' : '#fee2e2',
                      color: ret.status === 'COMPLETED' ? '#059669' : '#dc2626',
                      border: '1px solid #cadcd7'
                    }}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="center" onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
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
                      {ret.status === 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => handleCancelReturn(ret.id)}
                          disabled={cancelMutation.isPending}
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
                          title="Undo Return & Restore Stock"
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

      {/* Return Detail Modal */}
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
              width: 'min(760px, 95vw)',
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
                <b style={{ fontSize: '16px', color: '#133e36' }}>Debit Note: {selectedReturn.returnNumber}</b>
                <div style={{ fontSize: '11px', color: '#68827c' }}>
                  Processed on {selectedReturn.returnDate ? `${new Date(selectedReturn.returnDate).toLocaleDateString('en-IN')} ${new Date(selectedReturn.returnDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '-'}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8faf9', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Supplier Info</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36', marginTop: '2px' }}>{selectedReturn.supplier?.name}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>📞 {selectedReturn.supplier?.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Return Reason & Status</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>{selectedReturn.reason || 'General Return'}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>Status: <b>{selectedReturn.status}</b></div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36', marginBottom: '6px' }}>Returned Medicines List</div>
                <table className="pos-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch</th>
                      <th style={{ textAlign: 'center' }}>Qty Returned</th>
                      <th className="right">Rate</th>
                      <th className="right">Total Amount</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReturn.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td><b>{it.product?.name || 'Medicine'}</b></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{it.batch?.batchNumber || '—'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{Number(it.quantity || 0)}</td>
                        <td className="right">{money(it.unitPrice)}</td>
                        <td className="right" style={{ fontWeight: 700 }}>{money(it.totalAmount)}</td>
                        <td style={{ fontSize: '11px', color: '#68827c' }}>{it.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#fff1f2', padding: '14px 16px', borderRadius: '6px', border: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#555' }}>
                  Subtotal: {money(selectedReturn.subtotal)} | Tax Reversal: {money(selectedReturn.taxAmount)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#991b1b' }}>Total Debit Note Amount: </span>
                  <b style={{ fontSize: '18px', color: '#dc2626', marginLeft: '6px' }}>{money(selectedReturn.totalAmount)}</b>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                {selectedReturn.status === 'COMPLETED' && (
                  <button
                    type="button"
                    onClick={() => handleCancelReturn(selectedReturn.id)}
                    style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Undo Return & Restore Stock
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
