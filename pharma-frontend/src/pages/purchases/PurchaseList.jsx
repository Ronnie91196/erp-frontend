import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Check, Edit3, Filter, Trash2, X, ReceiptText } from 'lucide-react';
import api, { unwrap } from '../../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function PurchaseList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Filter state matching screenshot
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    minAmount: '',
    maxAmount: '',
    sortField: 'purchaseDate', // purchaseDate, totalAmount, invoiceNumber, outstanding
    sortOrder: 'desc', // desc, asc
  });

  // Draft filters before applying
  const [tempFilters, setTempFilters] = useState({ ...filters });

  const openFilterDrawer = () => {
    setTempFilters({ ...filters });
    setShowFilterDrawer(true);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setShowFilterDrawer(false);
  };

  const clearFilters = () => {
    const blank = {
      fromDate: '',
      toDate: '',
      minAmount: '',
      maxAmount: '',
      sortField: 'purchaseDate',
      sortOrder: 'desc',
    };
    setTempFilters(blank);
    setFilters(blank);
    setShowFilterDrawer(false);
  };

  const purchasesQuery = useQuery({
    queryKey: ['purchases-list', searchTerm, filters.fromDate, filters.toDate],
    queryFn: async () => unwrap(await api.get('/purchases', {
      params: {
        search: searchTerm || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      },
    })),
  });

  const rawPurchases = purchasesQuery.data || [];

  // Client-side filtering & sorting for amount ranges & custom order
  const purchases = useMemo(() => {
    let list = [...rawPurchases];

    // Filter by Min Amount
    if (filters.minAmount !== '') {
      list = list.filter((p) => Number(p.totalAmount || 0) >= Number(filters.minAmount));
    }

    // Filter by Max Amount
    if (filters.maxAmount !== '') {
      list = list.filter((p) => Number(p.totalAmount || 0) <= Number(filters.maxAmount));
    }

    // Sorting
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (filters.sortField === 'purchaseDate') {
        valA = new Date(a.invoiceDate || a.createdAt || 0).getTime();
        valB = new Date(b.invoiceDate || b.createdAt || 0).getTime();
      } else if (filters.sortField === 'totalAmount') {
        valA = Number(a.totalAmount || 0);
        valB = Number(b.totalAmount || 0);
      } else if (filters.sortField === 'invoiceNumber') {
        return filters.sortOrder === 'asc'
          ? String(a.invoiceNumber || '').localeCompare(String(b.invoiceNumber || ''))
          : String(b.invoiceNumber || '').localeCompare(String(a.invoiceNumber || ''));
      } else if (filters.sortField === 'outstanding') {
        const paidA = (a.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        const paidB = (b.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
        valA = Number(a.totalAmount || 0) - paidA;
        valB = Number(b.totalAmount || 0) - paidB;
      }

      return filters.sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [rawPurchases, filters]);

  const hasActiveFilters = Boolean(
    filters.fromDate || filters.toDate || filters.minAmount || filters.maxAmount || filters.sortField !== 'purchaseDate' || filters.sortOrder !== 'desc'
  );

  const metrics = useMemo(() => {
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
    const totalDue = purchases.reduce((sum, p) => sum + Number(p.dueAmount || 0), 0);
    return {
      count: purchases.length,
      totalPurchases,
      totalPaid,
      totalDue,
    };
  }, [purchases]);

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ReceiptText size={20} color="#007a70" /> Inward Purchases & Procurement Ledger
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={openFilterDrawer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: hasActiveFilters ? '1.5px solid #007a70' : '1px solid #c9ded9',
              background: hasActiveFilters ? '#e6f4f0' : '#fff',
              color: hasActiveFilters ? '#007a70' : '#29433e',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            <Filter size={13} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span style={{ background: '#007a70', color: '#fff', fontSize: '9px', borderRadius: '50%', width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                •
              </span>
            )}
          </button>
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => navigate('/purchases/add')}
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
            + Add Purchase
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Purchases Logged</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
              {money(metrics.totalPurchases)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#007a70', marginTop: '2px', fontWeight: 600 }}>
              {metrics.count} Consignments Received
            </div>
          </div>

          <div style={{ background: '#ecfdf5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #059669' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Payments Settled</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {money(metrics.totalPaid)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#065f46', marginTop: '2px' }}>
              Paid to Suppliers
            </div>
          </div>

          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Pending Supplier Due</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: metrics.totalDue > 0 ? '#e11d48' : '#133e36', marginTop: '4px' }}>
              {money(metrics.totalDue)}
            </div>
            <div style={{ fontSize: '10.5px', color: metrics.totalDue > 0 ? '#e11d48' : '#68827c', marginTop: '2px', fontWeight: 600 }}>
              Accounts Payable
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <input
              type="text"
              placeholder="Search Invoice #, Supplier name, or GSTIN..."
              style={{
                width: '100%',
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                fontSize: '11.5px',
                background: '#fcfdfd',
                outline: 'none'
              }}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
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
              ✕ Reset Filters
            </button>
          )}
        </div>

        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Supplier Name</th>
                <th>Date</th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th className="right">Total Amount</th>
                <th className="right">Paid</th>
                <th className="right">Due Balance</th>
                <th className="center">Status</th>
                <th className="center" style={{ width: '130px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length ? purchases.map((purchase) => {
                const paid = (purchase.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
                const total = Number(purchase.totalAmount || 0);
                const due = Math.max(0, total - paid);

                return (
                  <tr
                    key={purchase.id}
                    className="clickable-row hover:bg-teal-50/40"
                    onClick={() => navigate(`/purchases/${purchase.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>
                      {purchase.invoiceNumber || purchase.id}
                    </td>
                    <td>
                      <b style={{ color: '#133e36' }}>{purchase.supplier?.name || '—'}</b>
                      {purchase.supplier?.phone && purchase.supplier?.phone !== '—' && (
                        <span style={{ fontSize: '10.5px', color: '#777', marginLeft: '6px' }}>({purchase.supplier.phone})</span>
                      )}
                    </td>
                    <td style={{ fontSize: '11px', color: '#555', whiteSpace: 'nowrap' }}>
                      <div>{purchase.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString('en-IN') : '—'}</div>
                      {purchase.createdAt && (
                        <div style={{ fontSize: '9.5px', color: '#889f9a' }}>
                          {new Date(purchase.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#007a70' }}>
                      {purchase.items?.length || 0}
                    </td>
                    <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>
                      {money(total)}
                    </td>
                    <td className="right" style={{ fontWeight: 700, color: '#059669' }}>
                      {money(paid)}
                    </td>
                    <td className="right" style={{ fontWeight: 800, color: due > 0 ? '#dc2626' : '#68827c' }}>
                      {money(due)}
                    </td>
                    <td className="center">
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: due <= 0 ? '#ecfdf5' : paid > 0 ? '#fef3c7' : '#fee2e2',
                        color: due <= 0 ? '#059669' : paid > 0 ? '#b45309' : '#dc2626',
                        border: '1px solid #cadcd7'
                      }}>
                        {due <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID'}
                      </span>
                    </td>
                    <td className="center" style={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/purchases/${purchase.id}`)}
                          style={{
                            border: '1px solid #cadcd7',
                            background: '#edf7f5',
                            color: '#007a70',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/purchases/add?edit=${purchase.id}`)}
                          style={{
                            border: '1px solid #c9ded9',
                            background: '#f4f8f7',
                            color: '#007a70',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Edit this purchase"
                        >
                          <Edit3 size={11} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    No purchases match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Drawer / Sidebar matching user design */}
      {showFilterDrawer && (
        <div className="filter-drawer-backdrop" onClick={() => setShowFilterDrawer(false)}>
          <div className="filter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="filter-drawer-header">
              <h2 className="filter-drawer-title">
                <Filter size={17} /> Purchases Filters
              </h2>
              <button
                type="button"
                className="filter-drawer-close"
                onClick={() => setShowFilterDrawer(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="filter-drawer-body">
              {/* Date Range */}
              <div>
                <div className="drawer-section-title">
                  <CalendarDays size={13} /> Date Range
                </div>
                <div className="drawer-row">
                  <div className="drawer-field">
                    <span className="drawer-label">From Date</span>
                    <div className="drawer-input-wrap">
                      <input
                        type="date"
                        value={tempFilters.fromDate}
                        onChange={(e) => setTempFilters({ ...tempFilters, fromDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="drawer-field">
                    <span className="drawer-label">To Date</span>
                    <div className="drawer-input-wrap">
                      <input
                        type="date"
                        value={tempFilters.toDate}
                        onChange={(e) => setTempFilters({ ...tempFilters, toDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Range */}
              <div>
                <div className="drawer-section-title">
                  <span style={{ fontSize: '13px', fontWeight: 800 }}>$</span> Amount Range
                </div>
                <div className="drawer-row">
                  <div className="drawer-field">
                    <span className="drawer-label">Min Amount</span>
                    <div className="drawer-input-wrap has-prefix">
                      <span className="drawer-prefix">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={tempFilters.minAmount}
                        onChange={(e) => setTempFilters({ ...tempFilters, minAmount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="drawer-field">
                    <span className="drawer-label">Max Amount</span>
                    <div className="drawer-input-wrap has-prefix">
                      <span className="drawer-prefix">₹</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={tempFilters.maxAmount}
                        onChange={(e) => setTempFilters({ ...tempFilters, maxAmount: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <div className="drawer-section-title">
                  <span style={{ fontSize: '13px' }}>≡</span> Sort By
                </div>
                <div className="drawer-row">
                  <div className="drawer-field" style={{ flex: 1.6 }}>
                    <span className="drawer-label">Sort Field</span>
                    <div className="drawer-input-wrap">
                      <select
                        value={tempFilters.sortField}
                        onChange={(e) => setTempFilters({ ...tempFilters, sortField: e.target.value })}
                      >
                        <option value="purchaseDate">Purchase Date</option>
                        <option value="totalAmount">Total Amount</option>
                        <option value="invoiceNumber">Invoice Number</option>
                        <option value="outstanding">Outstanding</option>
                      </select>
                    </div>
                  </div>
                  <div className="drawer-field" style={{ flex: 1 }}>
                    <span className="drawer-label">Order</span>
                    <div className="drawer-input-wrap">
                      <select
                        value={tempFilters.sortOrder}
                        onChange={(e) => setTempFilters({ ...tempFilters, sortOrder: e.target.value })}
                      >
                        <option value="desc">Desc</option>
                        <option value="asc">Asc</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="filter-drawer-footer">
              <button
                type="button"
                className="drawer-btn-clear"
                onClick={clearFilters}
              >
                <Trash2 size={13} /> Clear
              </button>
              <button
                type="button"
                className="drawer-btn-apply"
                onClick={applyFilters}
              >
                <Check size={14} /> Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
