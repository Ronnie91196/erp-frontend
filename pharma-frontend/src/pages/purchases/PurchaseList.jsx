import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, Edit3, Filter, Trash2, X, ReceiptText, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import Pagination from '../../components/Pagination';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function PurchaseList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const openFilterDrawer = () => {
    setTempFilters({ ...filters });
    setShowFilterDrawer(true);
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
    setPage(1);
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
    setPage(1);
    setShowFilterDrawer(false);
  };

  const purchasesQuery = useQuery({
    queryKey: ['purchases-list', searchTerm, filters.fromDate, filters.toDate, page, limit],
    queryFn: async () => {
      const res = await api.get('/purchases', {
        params: {
          search: searchTerm || undefined,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          page,
          limit,
        },
      });
      return res.data;
    },
  });

  const rawPurchases = Array.isArray(purchasesQuery.data?.data)
    ? purchasesQuery.data.data
    : (Array.isArray(purchasesQuery.data) ? purchasesQuery.data : []);

  const pagination = purchasesQuery.data?.pagination || {
    total: rawPurchases.length,
    page,
    limit,
    totalPages: Math.ceil(rawPurchases.length / limit) || 1,
  };

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

  const allFilteredSelected = purchases.length > 0 && purchases.every((p) => selectedPurchaseIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedPurchaseIds([]);
    } else {
      setSelectedPurchaseIds(purchases.map((p) => p.id));
    }
  };

  const toggleSelectRow = (id, event) => {
    if (event) event.stopPropagation();
    setSelectedPurchaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSingle = async (purchase, event) => {
    if (event) event.stopPropagation();
    if (!window.confirm(`Move purchase "${purchase.invoiceNumber || purchase.id}" to Trash?\n\nIts attributable stock and ledger effects will be safely reversed.`)) return;
    try {
      showToast(`Moving purchase ${purchase.invoiceNumber || purchase.id} to Trash...`, 'info');
      const res = await api.delete(`/purchases/${purchase.id}`);
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      queryClient.invalidateQueries({ queryKey: ['trash', 'purchases'] });
      setSelectedPurchaseIds((prev) => prev.filter((id) => id !== purchase.id));
      showToast(res.data?.message || 'Purchase moved to Trash', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to move purchase to Trash';
      showToast(msg, 'error');
      alert(`Cannot delete purchase: ${msg}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedPurchaseIds.length) return;
    if (!window.confirm(`Move ${selectedPurchaseIds.length} selected purchase(s) to Trash?\n\nAttributable stock and ledger effects will be safely reversed.`)) return;
    try {
      showToast(`Moving ${selectedPurchaseIds.length} purchase(s) to Trash...`, 'info');
      const res = await api.post('/purchases/bulk-trash', { purchaseIds: selectedPurchaseIds });
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      queryClient.invalidateQueries({ queryKey: ['trash', 'purchases'] });
      setSelectedPurchaseIds([]);
      const summary = res.data?.data;
      if (summary?.blockedCount > 0) {
        showToast(`${summary.successCount} purchase(s) moved to Trash, ${summary.blockedCount} blocked (see alerts)`, 'warning');
        const blockedReasons = summary.results.filter((r) => !r.success).map((r) => r.message).join('\n• ');
        alert(`Some purchases could not be moved to Trash:\n• ${blockedReasons}`);
      } else {
        showToast(res.data?.message || `${selectedPurchaseIds.length} purchases moved to Trash`, 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to move purchases to Trash';
      showToast(msg, 'error');
      alert(`Bulk delete failed: ${msg}`);
    }
  };

  return (
    <div className="pos-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'warning' ? '#f59e0b' : '#10b981',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '13px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
      )}

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
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Filter size={13} /> Filters {hasActiveFilters && '(Active)'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/purchases/add')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: '#007a70',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            + Add Purchase
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Inward Invoices</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
              {metrics.count}
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Total Bills Recorded
            </div>
          </div>

          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Gross Purchases</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#007a70', marginTop: '4px' }}>
              {money(metrics.totalPurchases)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Cumulative Value
            </div>
          </div>

          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Amount Settled</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {money(metrics.totalPaid)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#065f46', marginTop: '2px' }}>
              Paid to Suppliers
            </div>
          </div>
          
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Pending Due</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: metrics.totalDue > 0 ? '#e11d48' : '#133e36', marginTop: '4px' }}>
              {money(metrics.totalDue)}
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Accounts Payable
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 320px' }}>
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
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            {selectedPurchaseIds.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '4px 12px', borderRadius: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#065f46' }}>
                  {selectedPurchaseIds.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Move selected purchases to Trash"
                >
                  <Trash2 size={12} /> Delete Selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPurchaseIds([])}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Deselect
                </button>
              </div>
            )}
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
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all visible purchases"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Invoice No.</th>
                <th>Supplier Name</th>
                <th>Date</th>
                <th style={{ textAlign: 'center' }}>Items</th>
                <th className="right">Total Amount</th>
                <th className="right">Paid</th>
                <th className="right">Due Balance</th>
                <th className="center">Status</th>
                <th className="center" style={{ width: '180px' }}>Actions</th>
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
                    <td onClick={(e) => e.stopPropagation()} style={{ width: '36px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedPurchaseIds.includes(purchase.id)}
                        onChange={(e) => toggleSelectRow(purchase.id, e)}
                        aria-label={`Select purchase ${purchase.invoiceNumber || purchase.id}`}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
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
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSingle(purchase, e)}
                          style={{
                            border: '1px solid #fecaca',
                            background: '#fff1f2',
                            color: '#dc2626',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Move purchase to Trash"
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    No purchases match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            pagination={pagination}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="purchase invoices"
          />
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
