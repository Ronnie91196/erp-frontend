import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { unwrap } from '../../lib/api';

export default function PurchaseDraftsPage() {
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
