import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import api, { unwrap } from '../../lib/api';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function SalesDraftsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDraftIds, setSelectedDraftIds] = useState([]);

  const draftsQuery = useQuery({
    queryKey: ['sales-drafts-page'],
    queryFn: async () => {
      const res = unwrap(await api.get('/sales?status=DRAFT'));
      return Array.isArray(res) ? res : [];
    },
  });

  const drafts = draftsQuery.data || [];

  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      const matchesSearch =
        !search ||
        (draft.invoiceNumber && draft.invoiceNumber.toLowerCase().includes(search.toLowerCase())) ||
        (draft.customer?.name && draft.customer.name.toLowerCase().includes(search.toLowerCase())) ||
        (draft.customer?.phone && draft.customer.phone.includes(search));

      const draftDateStr = draft.invoiceDate ? new Date(draft.invoiceDate).toISOString().slice(0, 10) : '';
      const matchesFrom = !fromDate || (draftDateStr && draftDateStr >= fromDate);
      const matchesTo = !toDate || (draftDateStr && draftDateStr <= toDate);

      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [drafts, search, fromDate, toDate]);

  const allSelected = filteredDrafts.length > 0 && selectedDraftIds.length === filteredDrafts.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDraftIds([]);
    } else {
      setSelectedDraftIds(filteredDrafts.map((d) => d.id));
    }
  };

  const toggleSelectDraft = (id) => {
    setSelectedDraftIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const removeDraft = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this sales draft? This action cannot be undone.')) return;
    try {
      await unwrap(await api.delete(`/sales/${draftId}`));
      setSelectedDraftIds((prev) => prev.filter((id) => id !== draftId));
      await draftsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    } catch (error) {
      window.alert(error?.message || 'Unable to delete draft');
    }
  };

  const removeSelectedDrafts = async () => {
    if (!selectedDraftIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedDraftIds.length} selected sales draft(s)? This action cannot be undone.`)) {
      return;
    }
    try {
      for (const id of selectedDraftIds) {
        await unwrap(await api.delete(`/sales/${id}`));
      }
      setSelectedDraftIds([]);
      await draftsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    } catch (error) {
      window.alert(error?.message || 'Failed to delete some drafts');
      await draftsQuery.refetch();
    }
  };

  const removeAllDrafts = async () => {
    if (!drafts.length) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${drafts.length} sales draft(s)? This action cannot be undone.`)) {
      return;
    }
    try {
      for (const d of drafts) {
        await unwrap(await api.delete(`/sales/${d.id}`));
      }
      setSelectedDraftIds([]);
      await draftsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    } catch (error) {
      window.alert(error?.message || 'Failed to delete all drafts');
      await draftsQuery.refetch();
    }
  };

  const totalDraftItems = filteredDrafts.reduce((sum, draft) => sum + (draft.items?.length || 0), 0);
  const totalDraftValue = filteredDrafts.reduce((sum, draft) => sum + Number(draft.totalAmount || 0), 0);

  return (
    <div className="purchase-entry-page drafts-page" style={{ padding: '16px 20px', minHeight: '100vh', background: '#f5f7f6' }}>
      <div className="purchase-entry-card drafts-shell" style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid #dce8e4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="drafts-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <p className="section-kicker" style={{ fontSize: '11px', fontWeight: 700, color: '#007a70', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
              Sales Ledger
            </p>
            <h2 className="drafts-title" style={{ fontSize: '20px', fontWeight: 800, color: '#133e36', margin: '2px 0 0' }}>
              Saved Sales Drafts
            </h2>
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
            <button
              type="button"
              onClick={() => navigate('/sales/add')}
              className="primary-action-btn"
              style={{
                background: '#007a70',
                color: '#fff',
                border: 0,
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              + New Sale Draft
            </button>
          </div>
        </div>

        {/* Stats KPIs */}
        <div className="drafts-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Total Drafts</span>
            <strong style={{ fontSize: '18px', color: '#133e36' }}>{filteredDrafts.length}</strong>
          </div>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Total Medicines</span>
            <strong style={{ fontSize: '18px', color: '#133e36' }}>{totalDraftItems}</strong>
          </div>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Estimated Value</span>
            <strong style={{ fontSize: '18px', color: '#007a70' }}>{money(totalDraftValue)}</strong>
          </div>
          <div className="draft-stat-card" style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span className="draft-stat-label" style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Last Updated</span>
            <strong style={{ fontSize: '15px', color: '#133e36' }}>
              {drafts.length ? `${new Date(drafts[0].updatedAt || drafts[0].createdAt).toLocaleDateString('en-IN')} ${new Date(drafts[0].updatedAt || drafts[0].createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}
            </strong>
          </div>
        </div>

        {/* Date and Search Filter Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#f8faf9', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2ece9', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a8e89' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice, customer or phone..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                fontSize: '12px',
                background: '#fff'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#446059' }}>From Date:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fff' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#446059' }}>To Date:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fff' }}
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
                border: '1px solid #cadcd7',
                background: '#fff',
                color: '#627a75',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Drafts List Table */}
        {filteredDrafts.length === 0 ? (
          <div className="empty-drafts-state" style={{ textAlign: 'center', padding: '40px 20px', background: '#fcfdfd', borderRadius: '8px', border: '1px dashed #cadcd7' }}>
            <div className="empty-drafts-icon" style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
            <h3 style={{ fontSize: '15px', color: '#133e36', margin: '0 0 4px' }}>No sales drafts found</h3>
            <p style={{ fontSize: '12px', color: '#68827c', margin: '0 0 14px' }}>
              {search || fromDate || toDate ? 'Try adjusting your search or date filters.' : 'Save in-progress bills as drafts to resume and bill them later.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/sales/add')}
              className="primary-action-btn"
              style={{
                background: '#007a70',
                color: '#fff',
                border: 0,
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Create New Draft
            </button>
          </div>
        ) : (
          <div className="drafts-table-panel" style={{ overflowX: 'auto' }}>
            <table className="pos-table" style={{ width: '100%', minWidth: '700px' }}>
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
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Bill Date</th>
                  <th>Medicines</th>
                  <th className="right">Total Value</th>
                  <th>Saved At</th>
                  <th className="center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => (
                  <tr key={draft.id} style={{ background: selectedDraftIds.includes(draft.id) ? '#f0fdf9' : 'transparent' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedDraftIds.includes(draft.id)}
                        onChange={() => toggleSelectDraft(draft.id)}
                        style={{ cursor: 'pointer', accentColor: '#008b8b' }}
                      />
                    </td>
                    <td className="font-mono font-bold text-slate-800">{draft.invoiceNumber}</td>
                    <td>
                      <div className="font-semibold text-slate-800">{draft.customer?.name || 'Walk-in Customer'}</div>
                      {draft.customer?.phone && <div style={{ fontSize: '10px', color: '#7a8f89' }}>📞 {draft.customer.phone}</div>}
                    </td>
                    <td className="text-slate-600">
                      {draft.invoiceDate ? new Date(draft.invoiceDate).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="text-slate-700 font-semibold">{draft.items?.length || 0} item(s)</td>
                    <td className="right font-bold text-slate-900">{money(draft.totalAmount)}</td>
                    <td className="text-slate-500 text-xs">
                      {draft.updatedAt ? `${new Date(draft.updatedAt).toLocaleDateString('en-IN')} ${new Date(draft.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '—'}
                    </td>
                    <td className="center" style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/sales/add?draft=${draft.id}`)}
                        style={{
                          border: '1px solid #b7d6ce',
                          background: '#edf7f5',
                          color: '#007a70',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '4px 10px',
                          cursor: 'pointer',
                          marginRight: '6px'
                        }}
                      >
                        Edit / Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDraft(draft.id)}
                        style={{
                          border: '1px solid #fecaca',
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '4px 10px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
