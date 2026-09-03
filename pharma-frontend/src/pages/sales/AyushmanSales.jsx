import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ShieldPlus, Search, RotateCcw, Filter, Eye, Plus, CheckCircle2, Clock, XCircle, AlertCircle
} from 'lucide-react';
import api, { unwrap, apiError } from '../../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function AyushmanSales() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED
  const [selectedSale, setSelectedSale] = useState(null);

  // Fetch sales
  const salesQuery = useQuery({
    queryKey: ['sales-list'],
    queryFn: async () => unwrap(await api.get('/sales')),
  });

  const allSales = salesQuery.data || [];

  // Filter only Ayushman Sales
  const ayushmanSales = useMemo(() => {
    return allSales.filter((s) => Boolean(s.isAyushman));
  }, [allSales]);

  // Filter by search & claim status
  const filteredSales = useMemo(() => {
    return ayushmanSales.filter((s) => {
      const matchesStatus = statusFilter === 'ALL' || (s.claimStatus || 'PENDING') === statusFilter;
      const searchStr = `${s.invoiceNumber || ''} ${s.customer?.name || ''} ${s.ayushmanCardNo || ''} ${s.beneficiaryId || ''}`.toLowerCase();
      const matchesSearch = !searchTerm.trim() || searchStr.includes(searchTerm.toLowerCase().trim());
      return matchesStatus && matchesSearch;
    });
  }, [ayushmanSales, statusFilter, searchTerm]);

  // Total KPIs
  const totalAmountSum = useMemo(() => {
    return ayushmanSales.reduce((acc, s) => acc + Number(s.totalAmount || 0), 0);
  }, [ayushmanSales]);

  const pendingClaims = useMemo(() => {
    return ayushmanSales.filter((s) => (s.claimStatus || 'PENDING') === 'PENDING').length;
  }, [ayushmanSales]);

  const approvedClaims = useMemo(() => {
    return ayushmanSales.filter((s) => s.claimStatus === 'APPROVED').length;
  }, [ayushmanSales]);

  return (
    <div className="pos-container" style={{ minHeight: '85vh' }}>
      {/* Top Header Bar */}
      <div className="pos-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pos-top-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#ecfdf5', color: '#007a70', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <ShieldPlus size={22} />
          </div>
          <div>
            <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0 }}>
              Ayushman Bharat Sales & Claims Hub
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#68827c' }}>
              Government health scheme beneficiary bills, PM-JAY card tracking, and claim reconciliations.
            </p>
          </div>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => navigate('/sales/add')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: '#007a70',
              color: '#fff',
              border: 0,
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '7px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 122, 112, 0.25)'
            }}
          >
            <Plus size={14} /> New Ayushman Bill
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Scheme Invoices</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
              {ayushmanSales.length}
            </div>
            <div style={{ fontSize: '10.5px', color: '#889f9a', marginTop: '2px' }}>
              Total Value: <strong>{money(totalAmountSum)}</strong>
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Pending Claims</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
              {pendingClaims}
            </div>
            <div style={{ fontSize: '10.5px', color: '#d97706', marginTop: '2px' }}>
              Awaiting verification / approval
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Approved Claims</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {approvedClaims}
            </div>
            <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px' }}>
              Settled by Health Authority
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <input
              type="text"
              placeholder="Search by Invoice #, Beneficiary ID, Card Number, Patient Name..."
              style={{
                width: '100%',
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                fontSize: '11.5px',
                background: '#fcfdfd',
                outline: 'none',
              }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: statusFilter === st ? '1px solid #007a70' : '1px solid #d5e3df',
                  background: statusFilter === st ? '#007a70' : '#fff',
                  color: statusFilter === st ? '#fff' : '#435e58',
                }}
              >
                {st === 'ALL' ? 'All Claims' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>INVOICE #</th>
                <th>DATE & TIME</th>
                <th>PATIENT / CUSTOMER</th>
                <th>AYUSHMAN CARD NO.</th>
                <th>BENEFICIARY ID</th>
                <th>TOTAL AMOUNT</th>
                <th style={{ textAlign: 'center' }}>CLAIM STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const status = sale.claimStatus || 'PENDING';
                  const badgeStyle = {
                    APPROVED: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', icon: CheckCircle2 },
                    REJECTED: { bg: '#fff1f2', color: '#e11d48', border: '#fecaca', icon: XCircle },
                    PENDING: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', icon: Clock },
                  }[status] || { bg: '#f4f8f7', color: '#555', border: '#ddd', icon: AlertCircle };

                  const IconComp = badgeStyle.icon;

                  return (
                    <tr key={sale.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>
                          {sale.invoiceNumber}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '11.5px', color: '#333' }}>
                          {new Date(sale.invoiceDate).toLocaleDateString('en-IN')}
                        </div>
                        <div style={{ fontSize: '10px', color: '#889f9a' }}>
                          {new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: '#133e36', fontSize: '12px' }}>
                          {sale.customer?.name || 'Walk-in Patient'}
                        </strong>
                        {sale.customer?.phone && (
                          <div style={{ fontSize: '10px', color: '#68827c' }}>📞 {sale.customer.phone}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 700, color: '#0f766e' }}>
                          {sale.ayushmanCardNo || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 700, color: '#435e58' }}>
                          {sale.beneficiaryId || '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#133e36' }}>
                          {money(sale.totalAmount || 0)}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: badgeStyle.bg,
                            color: badgeStyle.color,
                            border: `1px solid ${badgeStyle.border}`,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                          }}
                        >
                          <IconComp size={12} />
                          {status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          style={{
                            border: '1px solid #b7d6ce',
                            background: '#f4faf8',
                            color: '#007a70',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={12} /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#718a84' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏥</div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#133e36', margin: '0 0 4px 0' }}>
                      No Ayushman Scheme Sales Found
                    </h3>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#68827c' }}>
                      Ayushman scheme invoices created in the POS will automatically appear here for verification and claim reconciliation.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
          }}
          onMouseDown={() => setSelectedSale(null)}
        >
          <div
            style={{
              background: '#fff',
              width: '560px',
              maxWidth: '92vw',
              borderRadius: '10px',
              border: '1px solid #cce5df',
              boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ background: '#007a70', color: '#fff', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldPlus size={18} />
                <strong style={{ fontSize: '14px' }}>Ayushman Scheme Invoice: {selectedSale.invoiceNumber}</strong>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                style={{ background: 'transparent', border: 0, color: '#fff', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f4faf8', padding: '10px', borderRadius: '6px', border: '1px solid #d2eae4' }}>
                <div>
                  <small style={{ color: '#68827c', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Ayushman Card No.</small>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#007a70', fontFamily: 'monospace' }}>
                    {selectedSale.ayushmanCardNo || 'Not Specified'}
                  </div>
                </div>
                <div>
                  <small style={{ color: '#68827c', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Beneficiary ID</small>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#133e36', fontFamily: 'monospace' }}>
                    {selectedSale.beneficiaryId || 'Not Specified'}
                  </div>
                </div>
                <div>
                  <small style={{ color: '#68827c', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Patient Name</small>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#133e36' }}>
                    {selectedSale.customer?.name || 'Walk-in Patient'}
                  </div>
                </div>
                <div>
                  <small style={{ color: '#68827c', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}>Claim Status</small>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                    {selectedSale.claimStatus || 'PENDING'}
                  </div>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '11.5px', color: '#133e36', display: 'block', marginBottom: '6px' }}>
                  Dispensed Items ({selectedSale.items?.length || 0})
                </strong>
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #e2ece9', borderRadius: '6px' }}>
                  <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8faf9', borderBottom: '1px solid #e2ece9' }}>
                      <tr>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item Name</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>Batch</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedSale.items || []).map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f0f6f4' }}>
                          <td style={{ padding: '6px 8px' }}>{item.product?.name || 'Medicine'}</td>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{item.batch?.batchNumber || '—'}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>
                            {money(item.totalAmount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #e2ece9' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#68827c' }}>Total Invoice Amount:</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#133e36' }}>
                  {money(selectedSale.totalAmount || 0)}
                </span>
              </div>
            </div>

            <div style={{ background: '#f8faf9', padding: '10px 18px', display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2ece9' }}>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                style={{
                  border: '1px solid #cadcd7',
                  background: '#fff',
                  color: '#446059',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
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
