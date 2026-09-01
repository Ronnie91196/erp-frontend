import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  NotebookPen, Plus, Trash2, AlertTriangle, Info,
  Tag, ShieldAlert, Sparkles, CheckCircle, Search
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

export default function BillingNotesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [drugOrSalt, setDrugOrSalt] = useState('');
  const [isImportant, setIsImportant] = useState(false);

  // Fetch Billing Notes
  const notesQuery = useQuery({
    queryKey: ['billing-notes', search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      return unwrap(await api.get(`/billing-notes?${params.toString()}`));
    },
  });

  const notes = notesQuery.data || [];

  // Create Note Mutation
  const createNoteMutation = useMutation({
    mutationFn: async (payload) => {
      return unwrap(await api.post('/billing-notes', payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-notes'] });
      setShowAddModal(false);
      setTitle('');
      setText('');
      setCategory('GENERAL');
      setDrugOrSalt('');
      setIsImportant(false);
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to create billing note');
    },
  });

  // Delete Note Mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id) => {
      return unwrap(await api.delete(`/billing-notes/${id}`));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-notes'] });
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to delete note');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      return window.alert('Please provide both a title and instruction text.');
    }

    createNoteMutation.mutate({
      title: title.trim(),
      text: text.trim(),
      category,
      drugOrSalt: drugOrSalt.trim(),
      isImportant,
    });
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'ALERT':
        return { bg: '#fff1f2', color: '#e11d48', border: '#fecaca', label: '⚠️ High Priority Alert' };
      case 'PRESCRIPTION_MANDATORY':
        return { bg: '#fef3c7', color: '#b45309', border: '#fde68a', label: '📋 Rx Mandatory Rule' };
      case 'DISCOUNT_RULE':
        return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: '🏷️ Discount / Promo' };
      default:
        return { bg: '#edf7f5', color: '#007a70', border: '#cadcd7', label: 'ℹ️ General Counter Note' };
    }
  };

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NotebookPen size={20} color="#007a70" /> Billing Notes & Counter Alerts
          </h1>
        </div>

        <div className="pos-top-actions">
          <button
            onClick={() => setShowAddModal(true)}
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
            <Plus size={16} /> + New Billing Note
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Search Strip */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search billing notes, drug warnings, or cashier instructions..."
              style={{
                width: '100%',
                height: '34px',
                paddingLeft: '32px',
                paddingRight: '10px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                fontSize: '11.5px',
                background: '#fcfdfd',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Notes Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {notesQuery.isLoading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: '#718a84' }}>
              Loading billing instructions...
            </div>
          )}
          {!notesQuery.isLoading && notes.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 0', background: '#fff', borderRadius: '8px', border: '1px dashed #cadcd7' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
              <b style={{ color: '#133e36', fontSize: '14px' }}>No Billing Notes Created Yet</b>
              <p style={{ fontSize: '11.5px', color: '#68827c', margin: '4px 0 12px' }}>
                Add billing instructions, dispensing precautions, or discount reminders for cashiers.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                style={{
                  background: '#007a70',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 0,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                + Add First Note
              </button>
            </div>
          )}

          {notes.map((note) => {
            const badge = getCategoryBadge(note.category);

            return (
              <div
                key={note.id}
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  border: note.isImportant ? '1.5px solid #e11d48' : '1px solid #dbe6e3',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`
                    }}>
                      {badge.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this billing note?')) {
                          deleteNoteMutation.mutate(note.id);
                        }
                      }}
                      style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                      title="Delete note"
                    >
                      <Trash2 size={14} className="hover:text-red-600" />
                    </button>
                  </div>

                  <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#133e36', margin: '0 0 6px' }}>
                    {note.title}
                  </h3>

                  <p style={{ fontSize: '12px', color: '#445a55', lineHeight: '1.45', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>
                    {note.text}
                  </p>

                  {note.drugOrSalt && (
                    <div style={{ fontSize: '11px', color: '#007a70', fontWeight: 600, background: '#edf7f5', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                      Target: <b>{note.drugOrSalt}</b>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '12px', fontSize: '10.5px', color: '#94a3b8' }}>
                  Posted {note.createdAt ? new Date(note.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Billing Note Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(520px, 95vw)',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '14px 20px', background: '#f8faf9', borderBottom: '1px solid #dbe6e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: '14px', color: '#133e36' }}>Create New Billing Note / POS Alert</b>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ border: 0, background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36', display: 'block', marginBottom: '4px' }}>
                  Note Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule H1 Mandatory Doctor Reg, 10% Senior Citizen Discount..."
                  style={{
                    width: '100%',
                    height: '34px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #cadcd7',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid #cadcd7',
                      fontSize: '11.5px',
                      background: '#fff'
                    }}
                  >
                    <option value="GENERAL">ℹ️ General Note</option>
                    <option value="ALERT">⚠️ High Priority Alert</option>
                    <option value="PRESCRIPTION_MANDATORY">📋 Rx Mandatory Rule</option>
                    <option value="DISCOUNT_RULE">🏷️ Discount / Promo</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36', display: 'block', marginBottom: '4px' }}>
                    Target Drug / Salt (Optional)
                  </label>
                  <input
                    type="text"
                    value={drugOrSalt}
                    onChange={(e) => setDrugOrSalt(e.target.value)}
                    placeholder="e.g. Tramadol, Azithromycin"
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #cadcd7',
                      fontSize: '11.5px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36', display: 'block', marginBottom: '4px' }}>
                  Detailed Instruction / Message *
                </label>
                <textarea
                  required
                  rows={3}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type the full note or precaution instructions for the pharmacy counter..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cadcd7',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#e11d48', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isImportant}
                  onChange={(e) => setIsImportant(e.target.checked)}
                />
                Mark as Critical / Flash in Red
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cadcd7',
                    background: '#fff',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createNoteMutation.isPending}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 0,
                    background: '#007a70',
                    color: '#fff',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {createNoteMutation.isPending ? 'Saving...' : 'Save Billing Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
