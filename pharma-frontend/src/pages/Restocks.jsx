import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Truck, AlertOctagon, CheckCircle, RefreshCw,
  Search, ShoppingCart, ArrowRight, Download, Package, Filter
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function RestocksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(true);
  const [selectedItems, setSelectedItems] = useState({}); // { [productId]: { quantity, packagingId, unitPrice, etc. } }

  // Fetch Restock Suggestions
  const restockQuery = useQuery({
    queryKey: ['restock-suggestions', search, supplierFilter, lowStockOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (supplierFilter !== 'ALL') params.append('supplierId', supplierFilter);
      params.append('lowStockOnly', String(lowStockOnly));
      return unwrap(await api.get(`/restocks/suggestions?${params.toString()}`));
    },
  });

  // Fetch Suppliers for filter dropdown
  const suppliersQuery = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: async () => {
      const res = unwrap(await api.get('/suppliers'));
      return Array.isArray(res) ? res : [];
    },
  });

  const suppliers = suppliersQuery.data || [];
  const restockData = restockQuery.data || {
    summary: { totalRestockItems: 0, outOfStockCount: 0, criticalCount: 0, estTotalReorderValue: 0 },
    items: [],
  };

  const { summary, items } = restockData;

  // Toggle selection for PO draft creation
  const handleToggleSelect = (item) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[item.productId]) {
        delete next[item.productId];
      } else {
        next[item.productId] = {
          productId: item.productId,
          name: item.name,
          supplierId: item.preferredSupplier?.id || null,
          supplierName: item.preferredSupplier?.name || 'Unassigned',
          quantity: item.suggestedPackQty,
          packagingId: item.packagingId,
          conversionToBase: item.conversionToBase,
          unitPrice: item.estUnitPrice,
        };
      }
      return next;
    });
  };

  const handleQtyChange = (productId, qty) => {
    setSelectedItems((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: Math.max(1, Number(qty) || 1),
        },
      };
    });
  };

  const selectedList = Object.values(selectedItems);
  const selectedTotalCost = useMemo(() => {
    return selectedList.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
  }, [selectedList]);

  // Create PO Mutation
  const createPoMutation = useMutation({
    mutationFn: async ({ supplierId, items }) => {
      return unwrap(await api.post('/restocks/orders/draft', { supplierId, items }));
    },
    onSuccess: () => {
      window.alert('Purchase Order Draft created successfully! You can view and finalize it in Purchase Drafts.');
      setSelectedItems({});
      navigate('/modules/purchase-drafts');
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to create purchase order');
    },
  });

  const handleCreatePurchaseOrder = () => {
    if (selectedList.length === 0) {
      return window.alert('Please select at least one medicine to generate a purchase order.');
    }

    // Group items by supplier
    const supplierId = selectedList[0].supplierId;
    const sameSupplier = selectedList.every((it) => it.supplierId === supplierId);

    if (!supplierId) {
      return window.alert('Please assign a preferred supplier to the selected products first, or select a supplier.');
    }

    if (!sameSupplier) {
      return window.alert('Selected products belong to different suppliers. Please filter by a single supplier to generate a specific purchase order.');
    }

    createPoMutation.mutate({
      supplierId,
      items: selectedList,
    });
  };

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={20} color="#007a70" /> Auto-Restock & Purchase Order Generator
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => navigate('/purchases/add')}
            style={{
              background: '#fff',
              color: '#007a70',
              border: '1px solid #cadcd7',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            + Manual Purchase
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Out of Stock</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#e11d48', marginTop: '4px' }}>
              {summary.outOfStockCount} Medicines
            </div>
            <div style={{ fontSize: '10.5px', color: '#e11d48', marginTop: '2px', fontWeight: 600 }}>
              Immediate Stockout Risk
            </div>
          </div>

          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Critical / Below Min</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#b45309', marginTop: '4px' }}>
              {summary.criticalCount} Medicines
            </div>
            <div style={{ fontSize: '10.5px', color: '#b45309', marginTop: '2px', fontWeight: 600 }}>
              Below Reorder Level
            </div>
          </div>

          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Restock Queue</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              {summary.totalRestockItems} Items Total
            </div>
            <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
              Est. Value: {money(summary.estTotalReorderValue)}
            </div>
          </div>

          <div style={{ background: '#edf7f5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #007a70' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase' }}>Selected for PO</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#007a70', marginTop: '4px' }}>
              {selectedList.length} Item(s)
            </div>
            <div style={{ fontSize: '10.5px', color: '#133e36', marginTop: '2px', fontWeight: 700 }}>
              PO Total: {money(selectedTotalCost)}
            </div>
          </div>
        </div>

        {/* Filter Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', fontWeight: 600 }}
            >
              <option value="ALL">All Preferred Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search low-stock medicine, salt, or SKU..."
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

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#133e36', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              Show Low Stock Only
            </label>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={handleCreatePurchaseOrder}
                disabled={createPoMutation.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 0,
                  background: '#007a70',
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,122,112,0.28)'
                }}
              >
                <ShoppingCart size={14} /> {createPoMutation.isPending ? 'Generating...' : `Generate PO Draft (${selectedList.length})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => restockQuery.refetch()}
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
              <RefreshCw size={13} className={restockQuery.isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Restock Items Table */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>Select</th>
                <th>Medicine Name & Formulation</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Current Stock</th>
                <th style={{ textAlign: 'center' }}>Min / Reorder</th>
                <th>Preferred Supplier</th>
                <th style={{ textAlign: 'center', width: '130px' }}>Reorder Qty</th>
                <th className="right">Est. Unit Rate</th>
                <th className="right">Est. Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {restockQuery.isLoading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    Analyzing inventory thresholds...
                  </td>
                </tr>
              )}
              {!restockQuery.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎉</div>
                    <b style={{ color: '#133e36' }}>All stock levels are optimal!</b>
                    <p style={{ fontSize: '11px', margin: '4px 0 0' }}>No medicines are currently below reorder thresholds.</p>
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const isSelected = Boolean(selectedItems[item.productId]);
                const curQty = selectedItems[item.productId]?.quantity || item.suggestedPackQty;

                return (
                  <tr
                    key={item.productId}
                    style={{ background: isSelected ? '#edf7f5' : '#fff' }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(item)}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#133e36', fontSize: '12px' }}>{item.name}</div>
                      <div style={{ fontSize: '10.5px', color: '#68827c' }}>{item.genericName} (SKU: {item.sku})</div>
                    </td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: item.status === 'OUT_OF_STOCK' ? '#fff1f2' : item.status === 'CRITICAL' ? '#fef3c7' : '#edf7f5',
                        color: item.status === 'OUT_OF_STOCK' ? '#e11d48' : item.status === 'CRITICAL' ? '#b45309' : '#007a70',
                        border: item.status === 'OUT_OF_STOCK' ? '1px solid #fecaca' : item.status === 'CRITICAL' ? '1px solid #fde68a' : '1px solid #cadcd7'
                      }}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: item.currentStock === 0 ? '#e11d48' : '#133e36' }}>
                      {item.currentStock} {item.baseUnit}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '11px', color: '#68827c' }}>
                      Min: {item.minimumStock} | Reorder: {item.reorderLevel}
                    </td>
                    <td>
                      {item.preferredSupplier ? (
                        <div>
                          <div style={{ fontWeight: 700, color: '#007a70', fontSize: '11.5px' }}>{item.preferredSupplier.name}</div>
                          {item.preferredSupplier.phone !== '—' && (
                            <div style={{ fontSize: '10px', color: '#68827c' }}>📞 {item.preferredSupplier.phone}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#aaa', fontStyle: 'italic' }}>No Supplier Set</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          min="1"
                          value={curQty}
                          disabled={!isSelected}
                          onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                          style={{
                            width: '60px',
                            height: '28px',
                            textAlign: 'center',
                            fontWeight: 700,
                            borderRadius: '4px',
                            border: isSelected ? '1.5px solid #007a70' : '1px solid #cadcd7',
                            background: isSelected ? '#fff' : '#f8faf9'
                          }}
                        />
                        <span style={{ fontSize: '11px', color: '#68827c' }}>{item.packageName}</span>
                      </div>
                    </td>
                    <td className="right" style={{ fontSize: '11.5px', color: '#444' }}>
                      {money(item.estUnitPrice)}
                    </td>
                    <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>
                      {money(curQty * item.estUnitPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
