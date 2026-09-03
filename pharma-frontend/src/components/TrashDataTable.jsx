import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, RotateCcw, Search, Trash2, X } from 'lucide-react';
import api, { apiError, unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function TrashDataTable({ entity, entityLabel, icon: Icon = Trash2, getColumns, getRowData }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const trashQuery = useQuery({
    queryKey: ['trash', entity],
    queryFn: async () => unwrap(await api.get(`/trash/${entity}`)),
  });

  const rawItems = trashQuery.data || [];

  const items = useMemo(() => {
    if (!searchTerm.trim()) return rawItems;
    const term = searchTerm.toLowerCase().trim();
    return rawItems.filter((item) => {
      const serialized = JSON.stringify(item).toLowerCase();
      return serialized.includes(term);
    });
  }, [rawItems, searchTerm]);

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((item) => item.id));
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Restore single mutation
  const restoreMutation = useMutation({
    mutationFn: async (id) => unwrap(await api.post(`/trash/${entity}/${id}/restore`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash', entity] });
      queryClient.invalidateQueries({ queryKey: [entity] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  // Purge single mutation
  const purgeMutation = useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/trash/${entity}/${id}/purge`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash', entity] });
    },
  });

  // Restore all mutation
  const restoreAllMutation = useMutation({
    mutationFn: async () => unwrap(await api.post(`/trash/${entity}/restore-all`)),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['trash', entity] });
      queryClient.invalidateQueries({ queryKey: [entity] });
    },
  });

  // Purge all mutation
  const purgeAllMutation = useMutation({
    mutationFn: async () => unwrap(await api.delete(`/trash/${entity}/purge-all`)),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['trash', entity] });
    },
  });

  const handleRestoreSingle = async (id, name) => {
    if (!window.confirm(`Restore "${name || 'this item'}" back to active records?`)) return;
    try {
      await restoreMutation.mutateAsync(id);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (err) {
      window.alert(apiError(err) || 'Failed to restore item');
    }
  };

  const handlePurgeSingle = async (id, name) => {
    if (!window.confirm(`⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to permanently delete "${name || 'this item'}"?\nThis CANNOT be undone!`)) return;
    try {
      await purgeMutation.mutateAsync(id);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (err) {
      window.alert(apiError(err) || 'Failed to permanently delete item');
    }
  };

  const handleRestoreSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Restore ${selectedIds.length} selected ${entityLabel}(s)?`)) return;
    try {
      for (const id of selectedIds) {
        await restoreMutation.mutateAsync(id);
      }
      setSelectedIds([]);
      await trashQuery.refetch();
    } catch (err) {
      window.alert(apiError(err) || 'Failed to restore some items');
    }
  };

  const handlePurgeSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`⚠️ PERMANENT DELETE WARNING:\n\nPermanently delete ${selectedIds.length} selected ${entityLabel}(s)? This CANNOT be undone!`)) return;
    try {
      for (const id of selectedIds) {
        await purgeMutation.mutateAsync(id);
      }
      setSelectedIds([]);
      await trashQuery.refetch();
    } catch (err) {
      window.alert(apiError(err) || 'Failed to permanently delete some items');
    }
  };

  const columns = getColumns ? getColumns() : ['Name / Identifier', 'Deleted Date', 'Actions'];

  return (
    <div className="pos-container" style={{ minHeight: '80vh' }}>
      {/* Top Header Bar */}
      <div className="pos-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pos-top-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#fef2f2', color: '#ef4444', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
            <Icon size={20} />
          </div>
          <div>
            <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0 }}>
              {entityLabel} Recycle Bin / Trash
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#68827c' }}>
              Soft-deleted records. Restore them anytime or purge permanently.
            </p>
          </div>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          {items.length > 0 && (
            <>
              {selectedIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleRestoreSelected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ecfdf5',
                      color: '#059669',
                      border: '1px solid #a7f3d0',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={13} /> Restore Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={handlePurgeSelected}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#fff1f2',
                      color: '#e11d48',
                      border: '1px solid #fecaca',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} /> Purge Selected ({selectedIds.length})
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Restore ALL ${items.length} ${entityLabel}(s)?`)) {
                    restoreAllMutation.mutate();
                  }
                }}
                disabled={restoreAllMutation.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={13} /> Restore All ({items.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`⚠️ DANGER: Permanently delete ALL ${items.length} ${entityLabel}(s) in trash? This cannot be undone!`)) {
                    purgeAllMutation.mutate();
                  }
                }}
                disabled={purgeAllMutation.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #f87171',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} /> Purge All
              </button>
            </>
          )}
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Items in Trash</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#e11d48', marginTop: '4px' }}>
              {items.length}
            </div>
            <div style={{ fontSize: '10.5px', color: '#889f9a', marginTop: '2px' }}>
              Soft-deleted records
            </div>
          </div>

          <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Selected for Batch Action</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#007a70', marginTop: '4px' }}>
              {selectedIds.length}
            </div>
            <div style={{ fontSize: '10.5px', color: '#007a70', marginTop: '2px' }}>
              Selected out of {items.length}
            </div>
          </div>
        </div>

        {/* Search Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ position: 'relative', flex: '1 1 320px' }}>
            <input
              type="text"
              placeholder={`Search deleted ${entityLabel.toLowerCase()}...`}
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
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                background: '#fff1f2',
                color: '#e11d48',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ✕ Clear Search
            </button>
          )}
        </div>

        {/* Data Table */}
        <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
          <table className="pos-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 42, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', accentColor: '#007a70' }}
                    title="Select all"
                  />
                </th>
                {columns.map((col, idx) => (
                  <th key={idx} style={{ textAlign: idx === columns.length - 1 ? 'center' : 'left' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const cells = getRowData
                    ? getRowData(item)
                    : [
                        item.name || item.invoiceNumber || item.id,
                        item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('en-IN') : '—',
                      ];

                  return (
                    <tr
                      key={item.id}
                      style={{ background: isChecked ? '#f0fdf9' : 'transparent' }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectRow(item.id)}
                          style={{ cursor: 'pointer', accentColor: '#007a70' }}
                        />
                      </td>

                      {cells.map((cellContent, cellIdx) => (
                        <td key={cellIdx}>{cellContent}</td>
                      ))}

                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleRestoreSingle(item.id, item.name || item.invoiceNumber || item.id)}
                            disabled={restoreMutation.isPending}
                            style={{
                              border: '1px solid #a7f3d0',
                              background: '#ecfdf5',
                              color: '#059669',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Restore back to active list"
                          >
                            <RotateCcw size={11} /> Restore
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePurgeSingle(item.id, item.name || item.invoiceNumber || item.id)}
                            disabled={purgeMutation.isPending}
                            style={{
                              border: '1px solid #fecaca',
                              background: '#fff1f2',
                              color: '#e11d48',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Permanently remove"
                          >
                            <Trash2 size={11} /> Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '40px 20px', color: '#718a84' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗑️</div>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#133e36', margin: '0 0 4px 0' }}>
                      Trash is empty
                    </h3>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#68827c' }}>
                      No deleted {entityLabel.toLowerCase()} records in the recycle bin.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
