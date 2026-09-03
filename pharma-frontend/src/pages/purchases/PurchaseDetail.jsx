import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Edit3 } from 'lucide-react';
import api, { unwrap } from '../../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export function PurchaseDetail() {
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

export function PurchaseReturnPage() {
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
