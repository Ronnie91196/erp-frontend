import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ReactDOM from 'react-dom';
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

const defaultHeader = () => ({
  supplier: '',
  supplierId: '',
  billNo: '',
  billDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  lrNo: '',
  status: 'Credit',
});

const packCategories = [
  { label: 'Pack Types (Forms)', options: ['Blister', 'Alu-Alu', 'Strip', 'Bottle', 'Lami Tube', 'Aluminium Tube', 'Vial', 'Ampoule', 'Pre-Filled Syringe (PFS)', 'Sachet', 'IV Bag', 'Inhaler', 'Rotacap', 'Suppository', 'Box', 'Jar'] },
  { label: 'Tablets & Capsules (Multipliers)', options: ['1x1', '1x6', '1x10', '1x15', '1x20', '1x30', '10x10'] },
  { label: 'Liquids, Drops & Injections (Volume)', options: ['1 ml', '5 ml', '10 ml', '15 ml', '30 ml', '50 ml', '60 ml', '100 ml', '200 ml', '500 ml'] },
  { label: 'Creams, Ointments & Powders (Weight)', options: ['5 gm', '10 gm', '15 gm', '20 gm', '30 gm', '50 gm', '100 gm'] },
];

function PurchaseList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const purchasesQuery = useQuery({
    queryKey: ['purchases-list', searchTerm, fromDate, toDate],
    queryFn: async () => unwrap(await api.get('/purchases', {
      params: {
        search: searchTerm || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      },
    })),
  });

  const purchases = purchasesQuery.data || [];

  return (
    <div className="purchase-list-page">
      <div className="page-header">
        <div>
          <p className="section-kicker">Purchase Ledger</p>
          <h1 className="page-title">Purchase List</h1>
        </div>
        <button type="button" className="primary-action-btn" onClick={() => navigate('/purchases/add')}>
          + Add Purchase
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search Invoice / Supplier"
          className="filter-input"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <label className="filter-date-field">
          <span>From Date</span>
          <input type="date" className="filter-input" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label className="filter-date-field">
          <span>To Date</span>
          <input type="date" className="filter-input" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <button type="button" className="clear-filter-btn" onClick={() => { setSearchTerm(''); setFromDate(''); setToDate(''); }}>
          Clear Filters
        </button>
      </div>

      <div className="list-table-panel">
        <div className="list-table-wrap">
          <table className="full-width-table">
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {purchases.length ? purchases.map((purchase) => (
                <tr key={purchase.id} className="clickable-row" onClick={() => navigate(`/purchases/${purchase.id}`)}>
                  <td className="font-medium">{purchase.invoiceNumber || purchase.id}</td>
                  <td>{purchase.supplier?.name || '—'}</td>
                  <td>{purchase.invoiceDate ? new Date(purchase.invoiceDate).toLocaleDateString('en-GB') : '—'}</td>
                  <td className="font-bold">{money(purchase.totalAmount || 0)}</td>
                  <td><span className="status-badge received">{purchase.status || 'RECEIVED'}</span></td>
                  <td className="text-right text-gray" aria-hidden="true">➔</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="purchase-list-empty">No purchases match the selected filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function AddPurchaseForm() {
  const location = useLocation();
  const draftIdFromQuery = new URLSearchParams(location.search).get('draft');
  const [header, setHeader] = useState(defaultHeader());
  const [rows, setRows] = useState([createRow(Date.now())]);
  const [entryRow, setEntryRow] = useState(createRow(Date.now() + 1));
  const [roundOff, setRoundOff] = useState(0);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [draftId, setDraftId] = useState(null);
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
    const finalized = recalcRow({ ...entryRow, id: Date.now() + Math.random() });
    setRows((prev) => [...prev, finalized]);
    setEntryRow(createRow(Date.now() + 2));
    setTimeout(() => focusEntryField('productName'), 20);
  };

  const handleEntryKeyDown = (event, field) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const order = ['productName', 'packing', 'hsn', 'batchNo', 'expiry', 'qty', 'free', 'mrp', 'nmrp', 'rate', 'discountPercent', 'gstPercent'];
    const index = order.indexOf(field);
    const isLast = index === order.length - 1;

    if (isLast) {
      submitEntryRow();
      return;
    }

    const nextField = order[index + 1];
    focusEntryField(nextField);
  };

  const loadDraft = (draft) => {
    const nextHeader = {
      ...defaultHeader(),
      supplier: draft?.supplier?.name || '',
      supplierId: draft?.supplierId || draft?.supplier?.id || '',
      billNo: draft?.invoiceNumber || '',
      billDate: draft?.invoiceDate ? new Date(draft.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      dueDate: '',
      lrNo: draft?.notes || '',
      status: 'Credit',
    };

    const safeRows = Array.isArray(draft?.items) && draft.items.length
      ? draft.items.map((item, index) => ({
          ...createRow(Date.now() + index),
          id: `${item.id || Date.now() + index}`,
          productId: item.productId || '',
          productName: item.product?.name || '',
          packing: item.product?.packaging?.[0]?.name || '',
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
    setRoundOff(Number(draft?.roundOff || 0));
    setDraftId(draft?.id || null);
    setSupplierSearch(nextHeader.supplier || '');
  };

  const draftsQuery = useQuery({
    queryKey: ['purchase-drafts'],
    queryFn: async () => unwrap(await api.get('/purchases/drafts')),
  });

  useEffect(() => {
    if (!draftIdFromQuery) return;
    const selectedDraft = (draftsQuery.data || []).find((draft) => String(draft.id) === String(draftIdFromQuery));
    if (selectedDraft) {
      loadDraft(selectedDraft);
    }
  }, [draftIdFromQuery, draftsQuery.data]);

  const suppliersQuery = useQuery({
    queryKey: ['purchase-suppliers'],
    queryFn: async () => unwrap(await api.get('/suppliers')),
  });

  const productsQuery = useQuery({
    queryKey: ['purchase-products'],
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
            packing: product.packaging?.[0]?.name || '1X10',
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
            packing: product.packaging?.[0]?.name || '1X10',
            hsn: product.hsnCode || '',
            batchNo: '',
            expiry: '',
            mrp: 0,
            rate: 0,
            gstPercent: Number(product.gstPercent || 12),
          }];
    });
  }, [productsQuery.data]);

  const saveDraft = async () => {
    if (!window.confirm('Save this purchase as a draft?')) return;

    const payload = {
      supplierId: header.supplierId,
      invoiceNumber: header.billNo || `PO-${Date.now()}`,
      invoiceDate: header.billDate || new Date().toISOString().slice(0, 10),
      notes: header.lrNo || '',
      status: 'DRAFT',
      items: rows.filter((row) => row.productId && Number(row.qty || 0) > 0).map((row) => ({
        productId: row.productId,
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
        expiryDate: row.expiry || new Date(Date.now() + 31536000000).toISOString().slice(0, 10),
        packagingId: null,
        hsnCode: row.hsn || '',
      })),
    };

    try {
      let response;
      if (draftId) {
        response = await unwrap(await api.patch(`/purchases/${draftId}`, payload));
      } else {
        response = await unwrap(await api.post('/purchases', payload));
      }
      setDraftId(response?.id || draftId || null);
      await draftsQuery.refetch();
      window.alert('Draft saved to database');
    } catch (error) {
      window.alert(error?.message || 'Unable to save draft');
    }
  };

  const savePurchase = useMutation({
    mutationFn: async () => {
      const validRows = rows.filter((row) => row.productId && Number(row.qty || 0) > 0);
      if (!header.supplierId) throw new Error('Please select a supplier');
      if (!validRows.length) throw new Error('Add at least one purchase item');

      const payload = {
        supplierId: header.supplierId,
        invoiceNumber: header.billNo || `PO-${Date.now()}`,
        invoiceDate: header.billDate || new Date().toISOString().slice(0, 10),
        notes: header.lrNo || '',
        items: validRows.map((row) => ({
          productId: row.productId,
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
          expiryDate: row.expiry || new Date(Date.now() + 31536000000).toISOString().slice(0, 10),
          packagingId: null,
          hsnCode: row.hsn || '',
        })),
      };

      if (draftId) {
        return unwrap(await api.patch(`/purchases/${draftId}`, { ...payload, status: 'RECEIVED' }));
      }

      return unwrap(await api.post('/purchases', { ...payload, status: 'RECEIVED' }));
    },
    onSuccess: () => {
      window.alert('Purchase saved successfully');
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
    setEntryRow((prev) => recalcRow({
      ...prev,
      productId: product.productId,
      productName: product.label,
      packing: product.packing,
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
      } else if (selected.type === 'packing') {
        setEntryRow((prev) => ({ ...prev, packing: selected.value }));
        entryFieldRefs.current.hsn?.focus();
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
              <col style={{ width: '4%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className="action-column-head">Action</th>
                <th>Product Name</th>
                <th>Packing</th>
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
                    onChange={(event) => setEntryRow((prev) => ({ ...prev, productName: event.target.value }))}
                    onKeyDown={(event) => handleSuggestionKeyDown(event, 'product')}
                    onFocus={() => updateSuggestionPosition('productName', 'product')}
                    onBlur={() => setActiveSuggestion(null)}
                    placeholder="Product name"
                    className="entry-input highlight-input"
                  />
                </td>
                <td className="product-cell">
                  <input
                    ref={(node) => {
                      entryFieldRefs.current.packing = node;
                    }}
                    value={entryRow.packing || ''}
                    onChange={(event) => setEntryRow((prev) => ({ ...prev, packing: event.target.value }))}
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
                      onChange={(e) => updateRow(row.id, 'packing', e.target.value)}
                      onKeyDown={(event) => handleTableKeyDown(event, row.id, index)}
                    />
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
                        setEntryRow((prev) => ({ ...prev, packing: option }));
                        setShowPackingSuggestions(false);
                        setActiveSuggestion(null);
                        entryFieldRefs.current.hsn?.focus();
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
                    setShowPackingSuggestions(false);
                    setActiveSuggestion(null);
                    entryFieldRefs.current.hsn?.focus();
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
        <button type="button" className="clear-filter-btn" onClick={() => navigate('/purchases')}>Back to Purchase List</button>
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
      navigate(`/purchases/${purchase.id}`);
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
        <button type="button" className="clear-filter-btn" onClick={() => navigate('/purchases')}>Back to Purchases</button>
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
          <div className="purchase-table-wrap">
            <table className="full-width-table purchase-detail-table">
              <thead><tr><th>Product</th><th>Batch</th><th>Purchased Qty</th><th>Rate</th><th>Return Qty</th></tr></thead>
              <tbody>{(purchase.items || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.product?.name || '—'}</td>
                  <td>{item.batch?.batchNumber || '—'}</td>
                  <td>{item.quantity || 0}</td>
                  <td>{money(item.purchasePrice || 0)}</td>
                  <td><input className="return-quantity-input" type="number" min="0" max={Number(item.quantity || 0)} step="0.001" value={returnQuantities[item.id] || ''} onChange={(event) => updateQuantity(item.id, event.target.value)} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="purchase-return-empty">Select an original purchase to view its batches and return quantities.</div>}

        <div className="purchase-return-actions">
          <button type="button" className="clear-filter-btn" onClick={() => navigate('/purchases')}>Cancel</button>
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

  const drafts = (draftsQuery.data || []).filter((draft) => draft?.status === 'DRAFT');

  const removeDraft = async (draftId) => {
    try {
      await unwrap(await api.delete(`/purchases/${draftId}`));
      await draftsQuery.refetch();
    } catch (error) {
      window.alert(error?.message || 'Unable to delete draft');
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
          <a href="/purchases/add" className="primary-action-btn">
            + New Draft
          </a>
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
            <strong>{drafts.length ? new Date(drafts[0].updatedAt || drafts[0].createdAt).toLocaleDateString('en-GB') : '—'}</strong>
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
                    <tr key={draft.id}>
                      <td>{draft.supplier?.name || 'Unknown supplier'}</td>
                      <td>{draft.invoiceNumber || '—'}</td>
                      <td>{draft.invoiceDate ? new Date(draft.invoiceDate).toLocaleDateString('en-GB') : '—'}</td>
                      <td>{draft.items?.length || 0}</td>
                      <td>{draft.updatedAt ? new Date(draft.updatedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
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
