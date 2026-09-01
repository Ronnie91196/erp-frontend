import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ReactDOM from 'react-dom';
import { CalendarDays, Check, Edit3, Filter, Trash2, X, ReceiptText } from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const createRow = (id) => ({
  id,
  productId: '',
  productName: '',
  packing: '',
  dosageForm: 'Tablet',
  hsn: '',
  batchNo: '',
  expiry: '',
  qty: 1,
  free: 0,
  mrp: '',
  nmrp: '',
  rate: '',
  discountPercent: 0,
  gstPercent: 12,
  amount: 0,
});

const recalcRow = (row) => {
  const qty = Number(row.qty) || 0;
  const rate = Number(row.rate) || 0;
  const taxPercent = Number(row.gstPercent) || 0;
  const discountPercent = Number(row.discountPercent) || 0;

  const taxable = qty * rate;
  const discountAmount = taxable * (discountPercent / 100);
  const gstAmount = (taxable - discountAmount) * (taxPercent / 100);
  const amount = taxable - discountAmount + gstAmount;

  return {
    ...row,
    amount: Number(amount.toFixed(2)),
  };
};

const parseExpiryToIso = (expiry) => {
  if (!expiry || !String(expiry).trim()) {
    return new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2).toISOString();
  }
  const clean = String(expiry).trim();
  if (clean.includes('/')) {
    const parts = clean.split('/').map(Number);
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      const month = parts[0];
      const year = parts[1] < 100 ? 2000 + parts[1] : parts[1];
      // Set to the end of the month or 1st of month
      const date = new Date(year, month, 0, 23, 59, 59);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 2).toISOString();
};

const findMatchingProduct = (productName, productOptions) => {
  const normalizedName = String(productName || '').trim();
  if (!normalizedName) return null;

  return productOptions.find((product) => {
    const label = String(product?.label || '').trim();
    return label.toLowerCase() === normalizedName.toLowerCase();
  }) || null;
};

const defaultHeader = () => ({
  supplier: '',
  supplierId: '',
  billNo: '',
  billDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  lrNo: '',
  status: 'Credit',
});

const dosageFormOptions = [
  'Tablet',
  'Capsule',
  'Liquid',
  'Injection',
  'Cream',
  'Gel',
  'Drops',
  'Inhaler',
  'Inhalation',
  'Bar',
  'Suppository',
  'Sachet',
];

const inferDosageFormFromPacking = (packing) => {
  const raw = String(packing || '').trim();
  const lower = raw.toLowerCase();
  if (!lower) return 'Tablet';

  // 1. Inhalers & Rotacaps
  if (lower.includes('inhaler') || lower.includes('rotacap') || lower.includes('inhalation') || lower.includes('respule')) {
    return 'Inhaler';
  }

  // 2. Injections & Vials
  if (lower.includes('vial') || lower.includes('ampoule') || lower.includes('pfs') || lower.includes('syringe') || lower.includes('iv bag') || lower.includes('injection')) {
    return 'Injection';
  }

  // 3. Liquids, Syrups, Drops
  if (lower.includes('syrup') || lower.includes('suspension') || lower.includes('liquid') || lower.includes('bottle') || lower.endsWith('ml')) {
    return 'Liquid';
  }
  if (lower.includes('drop')) return 'Drops';

  // 4. Creams, Ointments, Gels
  if (lower.includes('tube') || lower.includes('ointment') || lower.includes('cream') || lower.endsWith('gm')) {
    return lower.includes('gel') ? 'Gel' : 'Cream';
  }

  // 5. Capsules
  if (lower.includes('capsule') || lower.includes('cap')) return 'Capsule';

  // 6. Sachets & Suppositories
  if (lower.includes('sachet')) return 'Sachet';
  if (lower.includes('suppository')) return 'Suppository';
  if (lower.includes('bar')) return 'Bar';

  // 7. Multipliers like 1x10, 12x10, 10x10, 1x15, 1x30, 10s, 10's -> default to Tablet
  if (/\d+\s*[x*×]\s*\d+/i.test(lower) || /^\d+/.test(lower)) {
    return 'Tablet';
  }

  return 'Tablet';
};

const packCategories = [
  { label: 'Tablets & Capsules (Multipliers)', options: ['1x10', '1x15', '1x6', '1x20', '1x30', '10x10', '1x1'] },
  { label: 'Liquids & Injections (Volume/Unit)', options: ['100 ml', '200 ml', '60 ml', '30 ml', '15 ml', '10 ml', '5 ml', '1 ml', 'Vial', 'Ampoule', 'Pre-Filled Syringe (PFS)'] },
  { label: 'Creams, Gels & Ointments (Weight)', options: ['10 gm', '15 gm', '20 gm', '30 gm', '50 gm', '100 gm', '5 gm'] },
  { label: 'Inhalers & Special', options: ['Inhaler', 'Rotacap', 'Sachet'] },
];

export function PurchaseList() {
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

function AddPurchaseForm() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const queryParams = new URLSearchParams(location.search);
  const draftIdFromQuery = queryParams.get('draft');
  const editIdFromQuery = queryParams.get('edit');
  const [header, setHeader] = useState(defaultHeader());
  const [rows, setRows] = useState([createRow(Date.now())]);
  const [entryRow, setEntryRow] = useState(createRow(Date.now() + 1));
  const [roundOff, setRoundOff] = useState(0);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [draftId, setDraftId] = useState(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [showPackingSuggestions, setShowPackingSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const rowRefs = useRef({});
  const entryFieldRefs = useRef({});

  const updateSuggestionPosition = (field, kind) => {
    const input = entryFieldRefs.current[field];
    if (!input) return;

    const rect = input.getBoundingClientRect();
    setActiveSuggestion({
      kind,
      rect: {
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      },
    });
  };

  useEffect(() => {
    if (!activeSuggestion) return undefined;

    const reposition = () => {
      const field = activeSuggestion.kind === 'packing' ? 'packing' : 'productName';
      updateSuggestionPosition(field, activeSuggestion.kind);
    };

    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [activeSuggestion]);

  const focusEntryField = (field) => {
    const node = entryFieldRefs.current[field];
    if (node) {
      node.focus();
      node.select?.();
    }
  };

  const submitEntryRow = () => {
    if (!entryRow.productName && !entryRow.productId) return;

    const matchingProduct = findMatchingProduct(entryRow.productName, productOptions);
    const finalized = recalcRow({
      ...entryRow,
      id: Date.now() + Math.random(),
      productId: matchingProduct ? matchingProduct.productId : '',
      productName: String(entryRow.productName || '').trim(),
    });

    if (!Number(entryRow.qty || 0) > 0) {
      window.alert('Quantity must be greater than 0');
      return;
    }

    if (!Number.isFinite(Number(entryRow.rate || 0)) || Number(entryRow.rate || 0) < 0) {
      window.alert('Please enter a valid rate');
      return;
    }

    setRows((prev) => [...prev, finalized]);
    setEntryRow(createRow(Date.now() + 2));
    setTimeout(() => focusEntryField('productName'), 20);
  };

  const handleEntryKeyDown = (event, field) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const order = ['productName', 'packing', 'dosageForm', 'hsn', 'batchNo', 'expiry', 'qty', 'free', 'mrp', 'nmrp', 'rate', 'discountPercent', 'gstPercent'];
    const index = order.indexOf(field);
    const isLast = index === order.length - 1;

    if (isLast) {
      submitEntryRow();
      return;
    }

    const nextField = order[index + 1];
    focusEntryField(nextField);
  };

  const loadPurchaseData = (purchaseData, isEdit = false) => {
    const nextHeader = {
      ...defaultHeader(),
      supplier: purchaseData?.supplier?.name || '',
      supplierId: purchaseData?.supplierId || purchaseData?.supplier?.id || '',
      billNo: purchaseData?.invoiceNumber || '',
      billDate: purchaseData?.invoiceDate ? new Date(purchaseData.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      dueDate: purchaseData?.dueDate ? new Date(purchaseData.dueDate).toISOString().slice(0, 10) : '',
      lrNo: purchaseData?.notes || '',
      status: purchaseData?.paymentStatus === 'PAID' || purchaseData?.paymentMethod === 'CASH' ? 'Cash' : 'Credit',
    };

    const safeRows = Array.isArray(purchaseData?.items) && purchaseData.items.length
      ? purchaseData.items.map((item, index) => ({
          ...createRow(Date.now() + index),
          id: `${item.id || Date.now() + index}`,
          productId: item.productId || '',
          productName: item.product?.name || '',
          packing: item.product?.packaging?.[0]?.name || '',
          dosageForm: item.product?.dosageForm || 'Tablet',
          hsn: item.product?.hsnCode || '',
          batchNo: item.batch?.batchNumber || '',
          expiry: item.batch?.expiryDate ? new Date(item.batch.expiryDate).toISOString().slice(0, 10) : '',
          qty: Number(item.quantity || 1),
          free: Number(item.freeQuantity || 0),
          mrp: String(item.mrp || 0),
          nmrp: String(item.sellingPrice || item.mrp || 0),
          rate: String(item.purchasePrice || 0),
          discountPercent: Number(item.discountPercent || 0),
          gstPercent: Number(item.cgstPercent || 0) + Number(item.sgstPercent || 0) || 12,
        }))
      : [createRow(Date.now())];

    setHeader(nextHeader);
    setRows(safeRows.map((row) => recalcRow(row)));
    setRoundOff(Number(purchaseData?.roundOff || 0));
    if (isEdit) {
      setEditingPurchaseId(purchaseData?.id || null);
    } else {
      setDraftId(purchaseData?.id || null);
    }
    setSupplierSearch(nextHeader.supplier || '');
  };

  const draftsQuery = useQuery({
    queryKey: ['purchase-drafts'],
    queryFn: async () => unwrap(await api.get('/purchases/drafts')),
  });

  const editPurchaseQuery = useQuery({
    queryKey: ['edit-purchase-detail', editIdFromQuery],
    queryFn: async () => unwrap(await api.get(`/purchases/${editIdFromQuery}`)),
    enabled: Boolean(editIdFromQuery),
  });

  useEffect(() => {
    if (editIdFromQuery && editPurchaseQuery.data) {
      loadPurchaseData(editPurchaseQuery.data, true);
    } else if (draftIdFromQuery && draftsQuery.data) {
      const selectedDraft = (draftsQuery.data || []).find((draft) => String(draft.id) === String(draftIdFromQuery));
      if (selectedDraft) {
        loadPurchaseData(selectedDraft, false);
      }
    }
  }, [draftIdFromQuery, draftsQuery.data, editIdFromQuery, editPurchaseQuery.data]);

  const suppliersQuery = useQuery({
    queryKey: ['purchase-suppliers'],
    queryFn: async () => unwrap(await api.get('/suppliers')),
  });

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => unwrap(await api.get('/products')),
  });

  const supplierOptions = suppliersQuery.data || [];
  const productOptions = useMemo(() => {
    return (productsQuery.data || []).flatMap((product) => {
      const safeBatches = Array.isArray(product.batches) ? product.batches : [];
      return safeBatches.length
        ? safeBatches.map((batch) => ({
            productId: product.id,
            value: `${product.name} ${batch.batchNumber || ''}`.trim(),
            label: product.name,
            packing: product.packaging?.[0]?.name || '1x10',
            dosageForm: product.dosageForm || 'Tablet',
            hsn: product.hsnCode || '',
            batchNo: batch.batchNumber || '',
            expiry: batch.expiryDate ? batch.expiryDate.slice(0, 10) : '',
            mrp: Number(batch.sellingPrice || batch.mrp || 0),
            rate: Number(batch.purchasePrice || product.purchasePrice || 0),
            gstPercent: Number(product.gstPercent || 12),
          }))
        : [{
            productId: product.id,
            value: product.name,
            label: product.name,
            packing: product.packaging?.[0]?.name || '1x10',
            dosageForm: product.dosageForm || 'Tablet',
            hsn: product.hsnCode || '',
            batchNo: '',
            expiry: '',
            mrp: 0,
            rate: 0,
            gstPercent: Number(product.gstPercent || 12),
          }];
    });
  }, [productsQuery.data]);

  const getAllValidRows = () => {
    let currentRows = [...rows];
    // If user filled entryRow but didn't hit '+' or Enter
    if ((entryRow.productName || entryRow.productId) && Number(entryRow.qty || 0) > 0) {
      const matchingProduct = findMatchingProduct(entryRow.productName, productOptions);
      currentRows.push(recalcRow({
        ...entryRow,
        id: Date.now() + Math.random(),
        productId: matchingProduct ? matchingProduct.productId : '',
        productName: String(entryRow.productName || '').trim(),
      }));
    }
    return currentRows.filter((row) => (row.productId || row.productName) && Number(row.qty || 0) > 0);
  };

  const [autoSaveState, setAutoSaveState] = useState({ status: 'idle', time: null });
  const isInitialMount = useRef(true);
  const autoSaveTimerRef = useRef(null);

  const buildDraftPayload = (customRows = null) => {
    const validRows = customRows || getAllValidRows();
    const isCash = String(header.status || '').toLowerCase() === 'cash';
    return {
      supplierId: header.supplierId || null,
      invoiceNumber: header.billNo || `PO-${Date.now()}`,
      invoiceDate: header.billDate || new Date().toISOString().slice(0, 10),
      dueDate: header.dueDate || null,
      paymentMethod: isCash ? 'CASH' : 'OTHER',
      paymentStatus: isCash ? 'PAID' : 'UNPAID',
      notes: header.lrNo || '',
      status: 'DRAFT',
      items: validRows.map((row) => ({
        productId: row.productId || null,
        productName: row.productName || null,
        packing: row.packing || null,
        dosageForm: row.dosageForm || null,
        quantity: Number(row.qty || 0),
        freeQuantity: Number(row.free || 0),
        purchasePrice: Number(row.rate || 0),
        mrp: Number(row.mrp || row.rate || 0),
        sellingPrice: Number(row.nmrp || row.mrp || row.rate || 0),
        discountPercent: Number(row.discountPercent || 0),
        cgstPercent: Number(row.gstPercent || 0) / 2,
        sgstPercent: Number(row.gstPercent || 0) / 2,
        igstPercent: 0,
        batchNumber: row.batchNo || 'N/A',
        expiryDate: parseExpiryToIso(row.expiry),
        packagingId: null,
        hsnCode: row.hsn || '',
      })),
    };
  };

  const silentAutoSaveDraft = async () => {
    // Only auto-save if editing a new draft (not editing a finalized purchase)
    if (editingPurchaseId) return;

    const validRows = getAllValidRows();
    const hasSupplier = Boolean(header.supplierId || (header.supplier && header.supplier.trim()));
    const hasRows = validRows.length > 0;

    // Must have at least some meaningful data to draft
    if (!hasSupplier && !hasRows) return;

    try {
      setAutoSaveState((prev) => ({ ...prev, status: 'saving' }));
      const payload = buildDraftPayload(validRows);
      let response;
      if (draftId) {
        response = await unwrap(await api.patch(`/purchases/${draftId}`, payload));
      } else {
        response = await unwrap(await api.post('/purchases', payload));
      }
      if (response?.id && response.id !== draftId) {
        setDraftId(response.id);
      }
      queryClient.invalidateQueries({ queryKey: ['purchase-drafts'] });
      setAutoSaveState({
        status: 'saved',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      });
    } catch (err) {
      console.warn('Silent auto-save purchase draft failed:', err);
      setAutoSaveState((prev) => ({ ...prev, status: 'idle' }));
    }
  };

  // 2-second debounced background auto-save hook
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (editingPurchaseId) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      silentAutoSaveDraft();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [header, rows, entryRow, roundOff]);

  const saveDraft = async () => {
    if (!window.confirm('Save this purchase as a draft?')) return;

    const payload = buildDraftPayload();

    try {
      let response;
      if (draftId) {
        response = await unwrap(await api.patch(`/purchases/${draftId}`, payload));
      } else {
        response = await unwrap(await api.post('/purchases', payload));
      }
      setDraftId(response?.id || draftId || null);
      await draftsQuery.refetch();
      setAutoSaveState({
        status: 'saved',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      });
      window.alert('Draft saved to database');
    } catch (error) {
      window.alert(error?.message || 'Unable to save draft');
    }
  };

  const savePurchase = useMutation({
    mutationFn: async () => {
      const validRows = getAllValidRows();
      let resolvedSupplierId = header.supplierId;
      if (!resolvedSupplierId && header.supplier) {
        const matchedSupplier = supplierOptions.find(
          (s) => s.name?.toLowerCase().trim() === header.supplier.toLowerCase().trim()
        );
        if (matchedSupplier) {
          resolvedSupplierId = matchedSupplier.id;
        }
      }

      if (!resolvedSupplierId) throw new Error('Please select a supplier from the list');
      if (!validRows.length) {
        throw new Error('Add at least one purchase item with product name and quantity');
      }

      const isCash = String(header.status || '').toLowerCase() === 'cash';
      const payload = {
        supplierId: resolvedSupplierId,
        invoiceNumber: header.billNo || `PO-${Date.now()}`,
        invoiceDate: header.billDate || new Date().toISOString().slice(0, 10),
        dueDate: header.dueDate || null,
        paymentMethod: isCash ? 'CASH' : 'OTHER',
        paymentStatus: isCash ? 'PAID' : 'UNPAID',
        notes: header.lrNo || '',
        items: validRows.map((row) => ({
          productId: row.productId || null,
          productName: row.productName || null,
          packing: row.packing || null,
          dosageForm: row.dosageForm || null,
          quantity: Number(row.qty || 0),
          freeQuantity: Number(row.free || 0),
          purchasePrice: Number(row.rate || 0),
          mrp: Number(row.mrp || row.rate || 0),
          sellingPrice: Number(row.nmrp || row.mrp || row.rate || 0),
          discountPercent: Number(row.discountPercent || 0),
          cgstPercent: Number(row.gstPercent || 0) / 2,
          sgstPercent: Number(row.gstPercent || 0) / 2,
          igstPercent: 0,
          batchNumber: row.batchNo || 'N/A',
          expiryDate: parseExpiryToIso(row.expiry),
          packagingId: null,
          hsnCode: row.hsn || '',
        })),
      };

      if (editingPurchaseId) {
        return unwrap(await api.patch(`/purchases/${editingPurchaseId}`, { ...payload, status: 'RECEIVED' }));
      }

      if (draftId) {
        return unwrap(await api.patch(`/purchases/${draftId}`, { ...payload, status: 'RECEIVED' }));
      }

      return unwrap(await api.post('/purchases', { ...payload, status: 'RECEIVED' }));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      await productsQuery.refetch();
      window.alert(editingPurchaseId ? 'Purchase updated successfully' : 'Purchase saved successfully');
      window.location.href = '/purchases';
    },
    onError: (error) => {
      window.alert(error?.message || 'Unable to save purchase');
    },
  });

  const updateHeader = (field, value) => {
    setHeader((prev) => ({ ...prev, [field]: value }));
  };

  const supplierSuggestions = useMemo(() => {
    const term = (supplierSearch || header.supplier).trim().toLowerCase();
    if (!term) return supplierOptions.slice(0, 6);
    return supplierOptions.filter((supplier) => {
      const haystack = `${supplier.name || ''} ${supplier.phone || ''} ${supplier.gstin || ''}`.toLowerCase();
      return haystack.includes(term);
    }).slice(0, 6);
  }, [header.supplier, supplierOptions, supplierSearch]);

  const updateRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;

        const next = { ...row, [field]: value };
        if (field === 'productName') {
          const matchingProduct = findMatchingProduct(value, productOptions);
          next.productId = matchingProduct ? matchingProduct.productId : '';
        }

        return recalcRow(next);
      })
    );
  };

  const addRow = () => {
    const newId = Date.now() + Math.random();
    setRows((prev) => [...prev, createRow(newId)]);
    setTimeout(() => {
      const target = rowRefs.current[`product-${newId}`];
      if (target) target.focus();
    }, 20);
  };

  const deleteRow = (id) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== id));
  };

  const applySuggestedProduct = (rowId, product) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const next = {
          ...row,
          productId: product.productId,
          productName: product.label,
          packing: product.packing,
          dosageForm: product.dosageForm || inferDosageFormFromPacking(product.packing),
          hsn: product.hsn,
          batchNo: product.batchNo,
          expiry: product.expiry,
          mrp: String(product.mrp || 0),
          rate: String(product.rate || 0),
          gstPercent: Number(product.gstPercent || 12),
        };
        return recalcRow(next);
      })
    );
  };

  const applyEntrySuggestion = (product) => {
    const inferredDosage = product.dosageForm || inferDosageFormFromPacking(product.packing);
    setEntryRow((prev) => recalcRow({
      ...prev,
      productId: product.productId,
      productName: product.label,
      packing: product.packing,
      dosageForm: inferredDosage,
      hsn: product.hsn,
      batchNo: product.batchNo,
      expiry: product.expiry,
      mrp: String(product.mrp || 0),
      rate: String(product.rate || 0),
      gstPercent: Number(product.gstPercent || 12),
    }));
  };

  const suggestionOptions = useMemo(() => {
    if (!activeSuggestion) return [];

    if (activeSuggestion.kind === 'product') {
      return productOptions
        .filter((item) => `${item.label} ${item.batchNo}`.toLowerCase().includes((entryRow.productName || '').toLowerCase()))
        .slice(0, 5)
        .map((item) => ({ type: 'product', value: item }));
    }

    const options = packCategories.flatMap((category) => category.options
      .filter((option) => option.toLowerCase().includes((entryRow.packing || '').toLowerCase()))
      .map((option) => ({ type: 'packing', value: option })));

    if ((entryRow.packing || '').trim()) {
      options.push({ type: 'custom-packing', value: entryRow.packing });
    }

    return options;
  }, [activeSuggestion, entryRow.packing, entryRow.productName, productOptions]);

  useEffect(() => {
    setHighlightedSuggestionIndex(-1);
  }, [activeSuggestion?.kind, entryRow.packing, entryRow.productName]);

  const handleSuggestionKeyDown = (event, kind) => {
    const isActive = activeSuggestion?.kind === kind;
    if (!isActive || !suggestionOptions.length) {
      handleEntryKeyDown(event, kind === 'product' ? 'productName' : 'packing');
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedSuggestionIndex((current) => (current + direction + suggestionOptions.length) % suggestionOptions.length);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setActiveSuggestion(null);
      setShowPackingSuggestions(false);
      return;
    }

    if (event.key === 'Enter' && highlightedSuggestionIndex >= 0) {
      event.preventDefault();
      const selected = suggestionOptions[highlightedSuggestionIndex];
      if (selected.type === 'product') {
        applyEntrySuggestion(selected.value);
      } else if (selected.type === 'packing' || selected.type === 'custom-packing') {
        const val = selected.value;
        const inferredDosage = inferDosageFormFromPacking(val);
        setEntryRow((prev) => ({ ...prev, packing: val, dosageForm: inferredDosage }));
        entryFieldRefs.current.dosageForm?.focus();
      }
      setShowPackingSuggestions(false);
      setActiveSuggestion(null);
    }
  };

  const totals = useMemo(() => {
    const subtotal = rows.reduce((sum, row) => sum + (Number(row.qty) || 0) * (Number(row.rate) || 0), 0);
    const discountAmount = rows.reduce((sum, row) => {
      const taxable = (Number(row.qty) || 0) * (Number(row.rate) || 0);
      return sum + taxable * ((Number(row.discountPercent) || 0) / 100);
    }, 0);

    const gstAmount = rows.reduce((sum, row) => {
      const taxable = (Number(row.qty) || 0) * (Number(row.rate) || 0);
      const discount = taxable * ((Number(row.discountPercent) || 0) / 100);
      return sum + (taxable - discount) * ((Number(row.gstPercent) || 0) / 100);
    }, 0);

    const cgstAmount = gstAmount / 2;
    const sgstAmount = gstAmount / 2;
    const grandTotal = subtotal - discountAmount + gstAmount + Number(roundOff || 0);

    return {
      subtotal,
      discountAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      grandTotal,
    };
  }, [rows, roundOff]);

  const handleTableKeyDown = (event, rowId, index) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const current = rows[index];
      const hasValidRow = current && (current.productName || current.productId) && Number(current.qty || 0) > 0 && Number(current.rate || 0) >= 0;
      if (hasValidRow) {
        if (index === rows.length - 1) {
          addRow();
        } else {
          const nextRow = rows[index + 1];
          const target = rowRefs.current[`product-${nextRow.id}`];
          target?.focus();
        }
      }
    }
  };

  return (
    <div className="purchase-entry-page">
      <div className="purchase-entry-card">
        <div className="purchase-header-grid">
          <div className="field-block" style={{ position: 'relative' }}>
            <span>Supplier / Party Name</span>
            <input
              value={header.supplier}
              onFocus={() => {
                setSupplierSearch(header.supplier);
                setShowSupplierSuggestions(true);
              }}
              onBlur={() => setShowSupplierSuggestions(false)}
              onChange={(event) => {
                const nextValue = event.target.value;
                setHeader((prev) => ({ ...prev, supplier: nextValue, supplierId: '' }));
                setSupplierSearch(nextValue);
                setShowSupplierSuggestions(true);
              }}
            />
            {showSupplierSuggestions && supplierSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', zIndex: 8, border: '1px solid #dfeae5', borderRadius: 8, boxShadow: '0 12px 26px rgba(9, 40, 40, 0.12)', marginTop: 6, overflow: 'hidden' }}>
                {supplierSuggestions.map((supplier) => (
                  <button
                    key={supplier.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setHeader((prev) => ({ ...prev, supplier: supplier.name, supplierId: supplier.id }));
                      setSupplierSearch('');
                      setShowSupplierSuggestions(false);
                    }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, background: '#fff', color: '#1c332f', cursor: 'pointer', fontSize: 12 }}
                  >
                    <div style={{ fontWeight: 700 }}>{supplier.name}</div>
                    <small style={{ color: '#5a726d' }}>{supplier.phone || supplier.email || supplier.gstin || 'Supplier'}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="field-block">
            <span>Invoice / Bill No.</span>
            <input
              value={header.billNo}
              onChange={(e) => updateHeader('billNo', e.target.value)}
            />
          </label>

          <label className="field-block">
            <span>Bill Date</span>
            <input
              type="date"
              value={header.billDate}
              onChange={(e) => updateHeader('billDate', e.target.value)}
            />
          </label>

          <label className="field-block">
            <span>Due Date</span>
            <input
              type="date"
              value={header.dueDate}
              onChange={(e) => updateHeader('dueDate', e.target.value)}
            />
          </label>

          <label className="field-block">
            <span>Transport / L.R. No.</span>
            <input
              value={header.lrNo}
              onChange={(e) => updateHeader('lrNo', e.target.value)}
            />
          </label>

          <label className="field-block status-field">
            <span>Status</span>
            <select value={header.status} onChange={(e) => updateHeader('status', e.target.value)}>
              <option value="Cash">Cash</option>
              <option value="Credit">Credit</option>
            </select>
          </label>
        </div>

        <div className="purchase-table-wrap purchase-fast-table-wrap">
          <table className="purchase-table purchase-fast-table">
            <colgroup>
              <col style={{ width: '32px' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '6.5%' }} />
              <col style={{ width: '7.5%' }} />
              <col style={{ width: '6.5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '4.5%' }} />
              <col style={{ width: '6.5%' }} />
              <col style={{ width: '6.5%' }} />
              <col style={{ width: '6.5%' }} />
              <col style={{ width: '5.5%' }} />
              <col style={{ width: '5.5%' }} />
              <col style={{ width: '7%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="action-column-head">Action</th>
                <th>Product Name</th>
                <th>Packing</th>
                <th>Dosage Form</th>
                <th>HSN</th>
                <th>Batch No.</th>
                <th>Exp.</th>
                <th>Qty</th>
                <th>Free</th>
                <th>MRP</th>
                <th>NMRP</th>
                <th>Rate</th>
                <th>Disc %</th>
                <th>GST %</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="purchase-entry-row active-entry">
                <td className="action-cell left-action-cell">
                  <button type="button" className="line-add-btn" onClick={submitEntryRow} aria-label="Add line">+</button>
                </td>
                <td className="product-cell">
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.productName = node;
                    }}
                    value={entryRow.productName || ''}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setEntryRow((prev) => {
                        const matchingProduct = findMatchingProduct(nextValue, productOptions);
                        return recalcRow({
                          ...prev,
                          productName: nextValue,
                          productId: matchingProduct ? matchingProduct.productId : '',
                        });
                      });
                    }}
                    onKeyDown={(event) => handleSuggestionKeyDown(event, 'product')}
                    onFocus={() => updateSuggestionPosition('productName', 'product')}
                    onBlur={() => setActiveSuggestion(null)}
                    placeholder="Enter or select product name"
                    className="entry-input highlight-input"
                  />
                </td>
                <td className="product-cell">
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.packing = node;
                    }}
                    value={entryRow.packing || ''}
                    onChange={(event) => {
                      const val = event.target.value;
                      const inferred = inferDosageFormFromPacking(val);
                      setEntryRow((prev) => ({ ...prev, packing: val, dosageForm: inferred }));
                    }}
                    onKeyDown={(event) => handleSuggestionKeyDown(event, 'packing')}
                    onFocus={() => {
                      setShowPackingSuggestions(true);
                      updateSuggestionPosition('packing', 'packing');
                    }}
                    onBlur={() => {
                      setShowPackingSuggestions(false);
                      setActiveSuggestion(null);
                    }}
                    placeholder="Pack"
                    className="entry-input"
                  />
                </td>
                <td>
                  <select
                    ref={(node) => {
                      entryFieldRefs.current.dosageForm = node;
                    }}
                    value={entryRow.dosageForm || 'Tablet'}
                    onChange={(event) => setEntryRow((prev) => ({ ...prev, dosageForm: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'dosageForm')}
                    className="entry-input entry-select"
                  >
                    {dosageFormOptions.map((form) => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.hsn = node;
                    }}
                    value={entryRow.hsn || ''}
                    onChange={(event) => setEntryRow((prev) => ({ ...prev, hsn: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'hsn')}
                    placeholder="HSN"
                    className="entry-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.batchNo = node;
                    }}
                    value={entryRow.batchNo || ''}
                    onChange={(event) => setEntryRow((prev) => ({ ...prev, batchNo: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'batchNo')}
                    placeholder="Batch"
                    className="entry-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.expiry = node;
                    }}
                    value={entryRow.expiry || ''}
                    onChange={(event) => {
                      let value = event.target.value.replace(/\D/g, '');
                      if (value.length > 4) value = value.slice(0, 4);
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + (value.length > 2 ? `/${value.slice(2)}` : '/');
                      }
                      setEntryRow((prev) => ({ ...prev, expiry: value }));
                    }}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'expiry')}
                    placeholder="MM/YY"
                    className="entry-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.qty = node;
                    }}
                    type="number"
                    min="0"
                    value={entryRow.qty || ''}
                    onChange={(event) => setEntryRow((prev) => recalcRow({ ...prev, qty: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'qty')}
                    placeholder="0"
                    className="entry-input num-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.free = node;
                    }}
                    type="number"
                    min="0"
                    value={entryRow.free || ''}
                    onChange={(event) => setEntryRow((prev) => ({ ...prev, free: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'free')}
                    placeholder="0"
                    className="entry-input num-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.mrp = node;
                    }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryRow.mrp || ''}
                    onChange={(event) => setEntryRow((prev) => recalcRow({ ...prev, mrp: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'mrp')}
                    placeholder="0.00"
                    className="entry-input num-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.nmrp = node;
                    }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryRow.nmrp || ''}
                    onChange={(event) => setEntryRow((prev) => recalcRow({ ...prev, nmrp: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'nmrp')}
                    placeholder="0.00"
                    className="entry-input num-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.rate = node;
                    }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryRow.rate || ''}
                    onChange={(event) => setEntryRow((prev) => recalcRow({ ...prev, rate: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'rate')}
                    placeholder="0.00"
                    className="entry-input num-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.discountPercent = node;
                    }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryRow.discountPercent || ''}
                    onChange={(event) => setEntryRow((prev) => recalcRow({ ...prev, discountPercent: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'discountPercent')}
                    placeholder="0"
                    className="entry-input num-input"
                  />
                </td>
                <td>
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.gstPercent = node;
                    }}
                    type="number"
                    min="0"
                    step="0.01"
                    value={entryRow.gstPercent || ''}
                    onChange={(event) => setEntryRow((prev) => recalcRow({ ...prev, gstPercent: event.target.value }))}
                    onKeyDown={(event) => handleEntryKeyDown(event, 'gstPercent')}
                    placeholder="12"
                    className="entry-input num-input"
                  />
                </td>
                <td className="amount-cell">
                  <span>₹{((entryRow.qty || 0) * (entryRow.rate || 0)).toFixed(2)}</span>
                </td>
              </tr>
              {rows.map((row, index) => (
                <tr key={row.id} className="purchase-row">
                  <td className="action-cell left-action-cell">
                    <button type="button" className="line-delete-btn" onClick={() => deleteRow(row.id)} aria-label="Delete row">×</button>
                  </td>
                  <td style={{ position: 'relative' }}>
                    <input
                      ref={(node) => {
                        rowRefs.current[`product-${row.id}`] = node;
                      }}
                      value={row.productName}
                      onChange={(event) => updateRow(row.id, 'productName', event.target.value)}
                      onKeyDown={(event) => handleTableKeyDown(event, row.id, index)}
                    />
                    {row.productName && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9, background: '#fff', border: '1px solid #dfeae5', borderRadius: 8, boxShadow: '0 12px 26px rgba(9, 40, 40, 0.12)', overflow: 'hidden' }}>
                        {productOptions.filter((item) => `${item.label} ${item.batchNo}`.toLowerCase().includes(row.productName.toLowerCase())).slice(0, 5).map((item) => (
                          <button
                            key={`${item.productId}-${item.batchNo || 'plain'}`}
                            type="button"
                            onClick={() => applySuggestedProduct(row.id, item)}
                            style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', border: 0, color: '#1c332f', cursor: 'pointer', fontSize: 12 }}
                          >
                            <span>{item.label}</span>
                            <small style={{ color: '#5a726d' }}>{item.batchNo || 'No batch'}</small>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      value={row.packing}
                      onChange={(e) => {
                        const val = e.target.value;
                        const inferred = inferDosageFormFromPacking(val);
                        updateRow(row.id, 'packing', val);
                        updateRow(row.id, 'dosageForm', inferred);
                      }}
                      onKeyDown={(event) => handleTableKeyDown(event, row.id, index)}
                    />
                  </td>
                  <td>
                    <select
                      value={row.dosageForm || 'Tablet'}
                      onChange={(e) => updateRow(row.id, 'dosageForm', e.target.value)}
                      onKeyDown={(event) => handleTableKeyDown(event, row.id, index)}
                      className="table-select-input"
                    >
                      {dosageFormOptions.map((form) => (
                        <option key={form} value={form}>{form}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input value={row.hsn} onChange={(e) => updateRow(row.id, 'hsn', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input value={row.batchNo} onChange={(e) => updateRow(row.id, 'batchNo', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input value={row.expiry} onChange={(e) => updateRow(row.id, 'expiry', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} placeholder="MM/YY" />
                  </td>
                  <td>
                    <input type="number" min="0" value={row.qty} onChange={(e) => updateRow(row.id, 'qty', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input type="number" min="0" value={row.free} onChange={(e) => updateRow(row.id, 'free', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" value={row.mrp} onChange={(e) => updateRow(row.id, 'mrp', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" value={row.nmrp} onChange={(e) => updateRow(row.id, 'nmrp', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" value={row.rate} onChange={(e) => updateRow(row.id, 'rate', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" value={row.discountPercent} onChange={(e) => updateRow(row.id, 'discountPercent', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td>
                    <input type="number" min="0" step="0.01" value={row.gstPercent} onChange={(e) => updateRow(row.id, 'gstPercent', e.target.value)} onKeyDown={(event) => handleTableKeyDown(event, row.id, index)} />
                  </td>
                  <td className="amount-cell">{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {activeSuggestion && (activeSuggestion.kind !== 'packing' || showPackingSuggestions) && typeof document !== 'undefined' && ReactDOM.createPortal(
          <div
            className="suggestion-panel portaled-suggestion-panel"
            style={{
              position: 'fixed',
              top: activeSuggestion.rect.top,
              left: activeSuggestion.rect.left,
              minWidth: activeSuggestion.kind === 'packing' ? '220px' : activeSuggestion.rect.width,
              zIndex: 9999,
              ...(activeSuggestion.kind === 'packing' ? { maxHeight: '250px', overflowY: 'auto' } : {}),
            }}
          >
            {activeSuggestion.kind === 'product' && (entryRow.productName || '').trim() && productOptions
              .filter((item) => `${item.label} ${item.batchNo}`.toLowerCase().includes((entryRow.productName || '').toLowerCase()))
              .slice(0, 5)
              .map((item, itemIndex) => (
                <button
                  key={`${item.productId}-${item.batchNo || 'plain'}`}
                  type="button"
                  className={highlightedSuggestionIndex === itemIndex ? 'suggestion-highlighted' : ''}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applyEntrySuggestion(item);
                    setActiveSuggestion(null);
                  }}
                >
                  <span>{item.label}</span>
                  <small>{item.batchNo || 'No batch'}</small>
                </button>
              ))}

            {activeSuggestion.kind === 'packing' && packCategories.map((category, catIdx) => {
              const filteredOptions = category.options.filter((option) => option.toLowerCase().includes((entryRow.packing || '').toLowerCase()));
              if (!filteredOptions.length) return null;

              return (
                <div key={catIdx}>
                  <div className="packing-category-label">{category.label}</div>
                  {filteredOptions.map((option, optIdx) => {
                    const optionIndex = packCategories
                      .slice(0, catIdx)
                      .reduce((total, currentCategory) => total + currentCategory.options.filter((candidate) => candidate.toLowerCase().includes((entryRow.packing || '').toLowerCase())).length, 0) + optIdx;

                    return (
                    <button
                      key={optIdx}
                      type="button"
                      className={highlightedSuggestionIndex === optionIndex ? 'suggestion-highlighted' : ''}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        const inferredDosage = inferDosageFormFromPacking(option);
                        setEntryRow((prev) => ({ ...prev, packing: option, dosageForm: inferredDosage }));
                        setShowPackingSuggestions(false);
                        setActiveSuggestion(null);
                        entryFieldRefs.current.dosageForm?.focus();
                      }}
                    >
                      {option}
                    </button>
                    );
                  })}
                </div>
              );
            })}

            {activeSuggestion.kind === 'packing' && (entryRow.packing || '').trim() !== '' && (
              <div className="packing-custom-option">
                <button
                  type="button"
                  className={highlightedSuggestionIndex === suggestionOptions.length - 1 ? 'suggestion-highlighted' : ''}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    const inferredDosage = inferDosageFormFromPacking(entryRow.packing);
                    setEntryRow((prev) => ({ ...prev, dosageForm: inferredDosage }));
                    setShowPackingSuggestions(false);
                    setActiveSuggestion(null);
                    entryFieldRefs.current.dosageForm?.focus();
                  }}
                >
                  + Use "{entryRow.packing}"
                </button>
              </div>
            )}
          </div>,
          document.body
        )}

        <div className="purchase-summary-align">
          <div className="purchase-summary purchase-summary-panel">
            <div className="summary-row">
              <span>SUB TOTAL</span>
              <strong>{money(totals.subtotal)}</strong>
            </div>
            <div className="summary-row">
              <span>DISCOUNT AMOUNT</span>
              <strong>{money(totals.discountAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>CGST Amount</span>
              <strong>{money(totals.cgstAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>SGST Amount</span>
              <strong>{money(totals.sgstAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>ROUND OFF</span>
              <input type="number" step="0.01" value={roundOff} onChange={(e) => setRoundOff(Number(e.target.value) || 0)} className="roundoff-input" />
            </div>
            <div className="summary-row grand-total">
              <span>GRAND TOTAL</span>
              <strong>{money(totals.grandTotal)}</strong>
            </div>
            <div className="purchase-bottom-actions">
              {autoSaveState.status === 'saving' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008b8b', fontWeight: 600 }}>
                  <span className="animate-spin" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '2px solid #008b8b', borderTopColor: 'transparent' }} />
                  <span>Auto-saving draft...</span>
                </div>
              )}
              {autoSaveState.status === 'saved' && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                  <span>✓ Auto-saved {autoSaveState.time ? `at ${autoSaveState.time}` : 'to drafts'}</span>
                </div>
              )}
              <button type="button" className="add-row-btn draft-action-button" onClick={saveDraft}>
                Save as Draft
              </button>
              <button
                type="button"
                className="add-row-btn purchase-action-button"
                onClick={() => {
                  if (window.confirm('Add this purchase to inventory?')) savePurchase.mutate();
                }}
                disabled={savePurchase.isPending}
              >
                {savePurchase.isPending ? 'Saving...' : 'Add Purchase'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PurchaseDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const purchaseId = location.pathname.split('/').filter(Boolean).pop();
  const purchaseQuery = useQuery({
    queryKey: ['purchase-detail', purchaseId],
    queryFn: async () => unwrap(await api.get(`/purchases/${purchaseId}`)),
    enabled: Boolean(purchaseId),
  });
  const purchase = purchaseQuery.data;

  if (purchaseQuery.isLoading) return <div className="purchase-detail-page"><div className="purchase-entry-card">Loading purchase details...</div></div>;
  if (purchaseQuery.isError || !purchase) return <div className="purchase-detail-page"><div className="purchase-entry-card">Unable to load this purchase.</div></div>;

  return (
    <div className="purchase-detail-page">
      <div className="purchase-detail-header">
        <div>
          <p className="section-kicker">Purchase Ledger</p>
          <h1 className="page-title">Purchase Details</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="primary-action-btn"
            onClick={() => navigate(`/purchases/add?edit=${purchase.id}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Edit3 size={13} /> Edit Purchase
          </button>
          <button type="button" className="clear-filter-btn" onClick={() => navigate('/purchases')}>Back to Purchase List</button>
        </div>
      </div>

      <div className="purchase-detail-card">
        <div className="purchase-detail-meta">
          <div><span>Invoice</span><strong>{purchase.invoiceNumber || purchase.id}</strong></div>
          <div><span>Supplier</span><strong>{purchase.supplier?.name || '—'}</strong></div>
          <div><span>Invoice Date</span><strong>{purchase.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString('en-GB') : '—'}</strong></div>
          <div><span>Status</span><strong>{purchase.status || 'RECEIVED'}</strong></div>
          <div><span>Total</span><strong>{money(purchase.totalAmount || 0)}</strong></div>
        </div>

        <div className="purchase-table-wrap">
          <table className="full-width-table purchase-detail-table">
            <thead>
              <tr><th>Product</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>Rate</th><th>MRP</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {(purchase.items || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.product?.name || '—'}</td>
                  <td>{item.batch?.batchNumber || item.batchNumber || '—'}</td>
                  <td>{item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('en-GB') : '—'}</td>
                  <td>{item.quantity || 0}</td>
                  <td>{money(item.purchasePrice || 0)}</td>
                  <td>{money(item.mrp || 0)}</td>
                  <td>{money(item.totalAmount || (Number(item.quantity || 0) * Number(item.purchasePrice || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PurchaseReturnPage() {
  const navigate = useNavigate();
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [returnQuantities, setReturnQuantities] = useState({});

  const purchasesQuery = useQuery({
    queryKey: ['purchase-return-purchases'],
    queryFn: async () => unwrap(await api.get('/purchases')),
  });
  const purchases = purchasesQuery.data || [];
  const purchase = purchases.find((item) => String(item.id) === String(selectedPurchaseId));

  const updateQuantity = (itemId, value) => {
    setReturnQuantities((current) => ({ ...current, [itemId]: value }));
  };

  const submitReturn = async (event) => {
    event.preventDefault();
    if (!purchase) return window.alert('Select an original purchase first');

    const items = (purchase.items || []).map((item) => ({
      productId: item.productId,
      batchNo: item.batch?.batchNumber,
      returnQty: Number(returnQuantities[item.id] || 0),
      rate: Number(item.purchasePrice || 0),
      taxPercent: Number(item.cgstPercent || 0) + Number(item.sgstPercent || 0),
    })).filter((item) => item.returnQty > 0);

    if (!items.length) return window.alert('Enter a return quantity for at least one item');
    if (!window.confirm('Create this purchase return and reduce stock?')) return;

    try {
      await unwrap(await api.post(`/purchases/${purchase.id}/return`, {
        originalPurchaseId: purchase.id,
        supplierId: purchase.supplierId,
        returnDate,
        reason: reason || undefined,
        items,
      }));
      window.alert('Purchase return created successfully');
      navigate('/modules/purchase-returns');
    } catch (error) {
      window.alert(error?.response?.data?.message || error?.message || 'Unable to create purchase return');
    }
  };

  return (
    <div className="purchase-return-page">
      <div className="purchase-detail-header">
        <div>
          <p className="section-kicker">Purchases</p>
          <h1 className="page-title">Purchase Return / Debit Note</h1>
        </div>
        <button type="button" className="clear-filter-btn" onClick={() => navigate('/modules/purchase-returns')}>Back to Returns</button>
      </div>

      <form className="purchase-return-card" onSubmit={submitReturn}>
        <div className="purchase-return-fields">
          <label className="filter-date-field">
            <span>Original Purchase</span>
            <select className="filter-input" value={selectedPurchaseId} onChange={(event) => { setSelectedPurchaseId(event.target.value); setReturnQuantities({}); }}>
              <option value="">Select invoice</option>
              {purchases.map((item) => <option key={item.id} value={item.id}>{item.invoiceNumber || item.id} - {item.supplier?.name || 'Supplier'}</option>)}
            </select>
          </label>
          <label className="filter-date-field">
            <span>Return Date</span>
            <input className="filter-input" type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
          </label>
          <label className="filter-date-field return-reason-field">
            <span>Reason</span>
            <input className="filter-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Damaged, expired, excess stock" />
          </label>
        </div>

        {purchase ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#335049' }}>
                Invoice Items ({purchase.items?.length || 0})
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const allQuantities = {};
                    (purchase.items || []).forEach((item) => {
                      allQuantities[item.id] = item.quantity || 0;
                    });
                    setReturnQuantities(allQuantities);
                  }}
                  className="clear-filter-btn"
                  style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
                >
                  ✓ Select All (Max Qty)
                </button>
                <button
                  type="button"
                  onClick={() => setReturnQuantities({})}
                  className="clear-filter-btn"
                  style={{ fontSize: '11px', padding: '4px 10px', height: '28px' }}
                >
                  ✕ Unselect All
                </button>
              </div>
            </div>

            <div className="purchase-table-wrap">
              <table className="full-width-table purchase-detail-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Batch</th>
                    <th>Purchased Qty</th>
                    <th>Rate</th>
                    <th>Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchase.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.product?.name || '—'}</td>
                      <td>{item.batch?.batchNumber || '—'}</td>
                      <td>{item.quantity || 0}</td>
                      <td>{money(item.purchasePrice || 0)}</td>
                      <td>
                        <input
                          className="return-quantity-input"
                          type="number"
                          min="0"
                          max={Number(item.quantity || 0)}
                          step="1"
                          value={returnQuantities[item.id] || ''}
                          onChange={(event) => updateQuantity(item.id, event.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="purchase-return-empty">Select an original purchase to view its batches and return quantities.</div>
        )}

        <div className="purchase-return-actions">
          <button type="button" className="clear-filter-btn" onClick={() => navigate('/modules/purchase-returns')}>Cancel</button>
          <button type="submit" className="primary-action-btn" disabled={!purchase || purchasesQuery.isLoading}>Create Purchase Return</button>
        </div>
      </form>
    </div>
  );
}

function DraftsPage() {
  const draftsQuery = useQuery({
    queryKey: ['purchase-drafts'],
    queryFn: async () => unwrap(await api.get('/purchases/drafts')),
  });

  const [selectedDraftIds, setSelectedDraftIds] = useState([]);

  const drafts = (draftsQuery.data || []).filter((draft) => draft?.status === 'DRAFT');

  const allSelected = drafts.length > 0 && selectedDraftIds.length === drafts.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDraftIds([]);
    } else {
      setSelectedDraftIds(drafts.map((d) => d.id));
    }
  };

  const toggleSelectDraft = (id) => {
    setSelectedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this purchase draft? This action cannot be undone.')) {
      return;
    }
    try {
      await unwrap(await api.delete(`/purchases/${draftId}`));
      setSelectedDraftIds((prev) => prev.filter((id) => id !== draftId));
      await draftsQuery.refetch();
    } catch (error) {
      window.alert(error?.message || 'Unable to delete draft');
    }
  };

  const removeSelectedDrafts = async () => {
    if (!selectedDraftIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedDraftIds.length} selected purchase draft(s)? This action cannot be undone.`)) {
      return;
    }
    try {
      for (const id of selectedDraftIds) {
        await unwrap(await api.delete(`/purchases/${id}`));
      }
      setSelectedDraftIds([]);
      await draftsQuery.refetch();
    } catch (error) {
      window.alert(error?.message || 'Failed to delete some drafts');
      await draftsQuery.refetch();
    }
  };

  const removeAllDrafts = async () => {
    if (!drafts.length) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${drafts.length} purchase draft(s)? This action cannot be undone.`)) {
      return;
    }
    try {
      for (const d of drafts) {
        await unwrap(await api.delete(`/purchases/${d.id}`));
      }
      setSelectedDraftIds([]);
      await draftsQuery.refetch();
    } catch (error) {
      window.alert(error?.message || 'Failed to delete all drafts');
      await draftsQuery.refetch();
    }
  };

  return (
    <div className="purchase-entry-page drafts-page">
      <div className="purchase-entry-card drafts-shell">
        <div className="drafts-topbar">
          <div>
            <p className="section-kicker">Purchase Ledger</p>
            <h2 className="drafts-title">Saved Drafts</h2>
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
            <a href="/purchases/add" className="primary-action-btn">
              + New Draft
            </a>
          </div>
        </div>

        <div className="drafts-stat-grid">
          <div className="draft-stat-card">
            <span className="draft-stat-label">Total Drafts</span>
            <strong>{drafts.length}</strong>
          </div>
          <div className="draft-stat-card">
            <span className="draft-stat-label">Items in Drafts</span>
            <strong>{drafts.reduce((sum, draft) => sum + (draft.items?.length || 0), 0)}</strong>
          </div>
          <div className="draft-stat-card">
            <span className="draft-stat-label">Last Updated</span>
            <strong>{drafts.length ? `${new Date(drafts[0].updatedAt || drafts[0].createdAt).toLocaleDateString('en-IN')} ${new Date(drafts[0].updatedAt || drafts[0].createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}</strong>
          </div>
        </div>

        {drafts.length === 0 ? (
          <div className="empty-drafts-state">
            <div className="empty-drafts-icon">📝</div>
            <h3>No purchase draft saved yet</h3>
            <p>Create your first saved draft and continue later from this section.</p>
            <a href="/purchases/add" className="primary-action-btn">Create Draft</a>
          </div>
        ) : (
          <div className="drafts-table-panel">
            <div className="drafts-table-wrap">
              <table className="purchase-table drafts-table" style={{ minWidth: 760 }}>
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
                    <th>Supplier</th>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Saved</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr key={draft.id} style={{ background: selectedDraftIds.includes(draft.id) ? '#f0fdf9' : 'transparent' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedDraftIds.includes(draft.id)}
                          onChange={() => toggleSelectDraft(draft.id)}
                          style={{ cursor: 'pointer', accentColor: '#008b8b' }}
                        />
                      </td>
                      <td>{draft.supplier?.name || 'Unknown supplier'}</td>
                      <td>{draft.invoiceNumber || '—'}</td>
                      <td>{draft.invoiceDate ? new Date(draft.invoiceDate).toLocaleDateString('en-IN') : '—'}</td>
                      <td>{draft.items?.length || 0}</td>
                      <td>{draft.updatedAt ? `${new Date(draft.updatedAt).toLocaleDateString('en-IN')} ${new Date(draft.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}</td>
                      <td className="draft-action-cell">
                        <a href={`/purchases/add?draft=${draft.id}`} className="draft-edit-btn">
                          Edit
                        </a>
                        <button type="button" className="draft-delete-btn" onClick={() => removeDraft(draft.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Purchases() {
  const location = useLocation();
  if (location.pathname === '/modules/purchase-drafts') return <DraftsPage />;
  if (location.pathname === '/modules/create-debit-note') return <PurchaseReturnPage />;
  if (location.pathname.endsWith('/add')) return <AddPurchaseForm />;
  if (/^\/purchases\/[^/]+$/.test(location.pathname)) return <PurchaseDetail />;
  return <PurchaseList />;
}
