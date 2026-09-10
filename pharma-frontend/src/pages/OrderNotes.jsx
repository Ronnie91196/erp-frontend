import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList, Plus, Trash2, CheckCircle2, Clock,
  Send, RefreshCw, Search, Check, AlertCircle, Sparkles,
  ShoppingBag, Building2, ExternalLink, CheckSquare, Square,
  Package, ChevronRight, X
} from 'lucide-react';
import api, { unwrap } from '../lib/api';
import Pagination from '../components/Pagination';

export default function OrderNotesPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, PENDING, ORDERED
  const [showAddModal, setShowAddModal] = useState(false);

  // Selected item IDs for bulk operations & WhatsApp sharing
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Quick Add / Suggestion bar states
  const [quickSearchInput, setQuickSearchInput] = useState('');
  const [quickQty, setQuickQty] = useState('10');
  const [quickUnit, setQuickUnit] = useState('Strips');
  const [quickDistributor, setQuickDistributor] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);
  const quickSearchRef = useRef(null);

  // Modal Form State
  const [medicineName, setMedicineName] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('Strips');
  const [distributor, setDistributor] = useState('');
  const [note, setNote] = useState('');
  const [modalSearchInput, setModalSearchInput] = useState('');
  const [showModalSuggestions, setShowModalSuggestions] = useState(false);
  const modalSearchRef = useRef(null);

  // Debounce main table search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Product Suggestion Query for Quick Bar
  const quickProductQuery = useQuery({
    queryKey: ['order-notes-product-search', quickSearchInput],
    queryFn: async () => {
      if (!quickSearchInput.trim() || quickSearchInput.trim().length < 2) return [];
      const res = await api.get(`/products?page=1&limit=8&search=${encodeURIComponent(quickSearchInput.trim())}`);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    enabled: quickSearchInput.trim().length >= 2,
  });

  // Product Suggestion Query for Modal
  const modalProductQuery = useQuery({
    queryKey: ['order-notes-modal-product-search', modalSearchInput],
    queryFn: async () => {
      if (!modalSearchInput.trim() || modalSearchInput.trim().length < 2) return [];
      const res = await api.get(`/products?page=1&limit=8&search=${encodeURIComponent(modalSearchInput.trim())}`);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    enabled: modalSearchInput.trim().length >= 2,
  });

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (quickSearchRef.current && !quickSearchRef.current.contains(e.target)) {
        setShowQuickSuggestions(false);
      }
      if (modalSearchRef.current && !modalSearchRef.current.contains(e.target)) {
        setShowModalSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Order Notes
  const notesQuery = useQuery({
    queryKey: ['order-notes', search, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      const res = await api.get(`/order-notes?${params.toString()}`);
      return res.data;
    },
  });

  const rawNotes = Array.isArray(notesQuery.data?.data)
    ? notesQuery.data.data
    : (Array.isArray(notesQuery.data) ? notesQuery.data : []);

  const pagination = notesQuery.data?.pagination || {
    total: rawNotes.length,
    page,
    limit,
    totalPages: Math.ceil(rawNotes.length / limit) || 1,
  };

  const notes = rawNotes;

  // Create Note Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/order-notes', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-notes'] });
      setShowAddModal(false);
      setMedicineName('');
      setModalSearchInput('');
      setQuantity('10');
      setUnit('Strips');
      setDistributor('');
      setNote('');
      // Also clear quick add bar
      setQuickSearchInput('');
      setQuickQty('10');
      setQuickUnit('Strips');
      setQuickDistributor('');
      setQuickNote('');
    },
    onError: (err) => {
      alert(err?.message || 'Failed to record daily requirement');
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return unwrap(await api.put(`/order-notes/${id}`, { status }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-notes'] });
    },
  });

  // Delete Note Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/order-notes/${id}`)),
    onSuccess: (data, id) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['order-notes'] });
    },
  });

  // Clear Completed Mutation
  const clearCompletedMutation = useMutation({
    mutationFn: async () => unwrap(await api.delete('/order-notes/clear-completed')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-notes'] });
      setSelectedIds(new Set());
    },
  });

  // Modal Submit
  const handleCreate = (e) => {
    e.preventDefault();
    const finalName = (medicineName || modalSearchInput).trim();
    if (!finalName) return;
    createMutation.mutate({
      medicineName: finalName,
      quantity: Number(quantity) || 1,
      unit: unit || 'Strips',
      distributor: distributor.trim(),
      note: note.trim(),
      status: 'PENDING',
    });
  };

  // Quick Bar Add
  const handleQuickAdd = (e) => {
    if (e) e.preventDefault();
    if (!quickSearchInput.trim()) return;
    createMutation.mutate({
      medicineName: quickSearchInput.trim(),
      quantity: Number(quickQty) || 1,
      unit: quickUnit || 'Strips',
      distributor: quickDistributor.trim(),
      note: quickNote.trim(),
      status: 'PENDING',
    });
  };

  // Selection handlers
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected = notes.length > 0 && notes.every((n) => selectedIds.has(n.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notes.map((n) => n.id)));
    }
  };

  // WhatsApp Share Generator
  const handleShareWhatsApp = (targetDistributor = null, onlySelected = false) => {
    let itemsToShare = [];

    if (onlySelected && selectedIds.size > 0) {
      itemsToShare = notes.filter((n) => selectedIds.has(n.id));
    } else if (targetDistributor) {
      itemsToShare = notes.filter((n) => {
        return (n.distributor || '').toLowerCase() === targetDistributor.toLowerCase() && n.status === 'PENDING';
      });
    } else {
      itemsToShare = notes.filter((n) => n.status === 'PENDING');
    }

    if (itemsToShare.length === 0) {
      alert(onlySelected ? 'No selected requirements to share. Please check the boxes first.' : 'No pending requirements to share.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    let msg = `📦 *SSDN PHARMAORA BY OTODDY*\n`;
    msg += `📋 *DAILY MEDICINE REQUIREMENT / SHORTAGE ORDER*\n`;
    msg += `📅 *Date:* ${todayStr}\n`;
    if (targetDistributor) {
      msg += `🏢 *Distributor:* ${targetDistributor}\n`;
    }
    msg += `------------------------------------\n`;

    itemsToShare.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.medicineName}* : *${item.quantity} ${item.unit || 'Units'}*`;
      if (item.distributor && !targetDistributor) {
        msg += ` _(Supplier: ${item.distributor})_`;
      }
      if (item.note) {
        msg += ` [Note: ${item.note}]`;
      }
      msg += `\n`;
    });

    msg += `------------------------------------\n`;
    msg += `*Total Items:* ${itemsToShare.length}\n`;
    msg += `*Overall Order Date:* ${todayStr}\n`;
    msg += `⚡ *Please confirm availability and dispatch schedule at the earliest.*\n`;
    msg += `_Generated instantly via SSDN PHARMAORA_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Summary counts
  const pendingCount = useMemo(() => notes.filter((n) => n.status === 'PENDING').length, [notes]);
  const orderedCount = useMemo(() => notes.filter((n) => n.status === 'ORDERED').length, [notes]);

  // Unique distributors list with pending count
  const distributorGroups = useMemo(() => {
    const map = {};
    notes.filter((n) => n.status === 'PENDING').forEach((n) => {
      const dist = n.distributor?.trim() || 'General / Unassigned';
      map[dist] = (map[dist] || 0) + 1;
    });
    return Object.entries(map).map(([distributor, count]) => ({ distributor, count }));
  }, [notes]);

  return (
    <div className="pos-container" style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      
      {/* Header Bar */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ padding: '6px', background: '#edf7f5', color: '#007a70', borderRadius: '8px' }}>
              <ClipboardList size={22} />
            </span>
            <div>
              <h1 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
                Daily Requirements & Order Notes
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                Note urgent customer shortages, out-of-stock inquiries, and share POs with distributors via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => handleShareWhatsApp(null, true)}
              style={{
                background: '#128c7e',
                color: '#fff',
                border: 0,
                borderRadius: '8px',
                padding: '9px 16px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(18,140,126,0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Send size={15} /> Share Selected on WhatsApp ({selectedIds.size})
            </button>
          )}

          <button
            type="button"
            onClick={() => handleShareWhatsApp()}
            disabled={pendingCount === 0}
            style={{
              background: pendingCount > 0 ? '#0f766e' : '#cbd5e1',
              color: '#fff',
              border: 0,
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: pendingCount > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: pendingCount > 0 ? '0 2px 6px rgba(15,118,110,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Send size={15} /> Share All Pending ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setModalSearchInput('');
              setMedicineName('');
              setShowAddModal(true);
            }}
            style={{
              background: '#007a70',
              color: '#fff',
              border: 0,
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,122,112,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={16} /> + Detailed Requirement
          </button>
        </div>
      </div>

      {/* QUICK ADD WITH AUTOCOMPLETE SEARCH BAR */}
      <div style={{
        background: '#ffffff',
        border: '2px solid #007a70',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0,122,112,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Sparkles size={16} color="#007a70" />
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
            Quick Create Order Note / Requirement
          </span>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            — Type medicine name to get instant suggestions, select quantity, and add directly to your list
          </span>
        </div>

        <form onSubmit={handleQuickAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Medicine input with Autocomplete */}
          <div ref={quickSearchRef} style={{ position: 'relative', flex: '2 1 260px', minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '0 10px', background: '#fff' }}>
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                required
                placeholder="Search drug or salt (e.g. Paracetamol, Dolo 650, Telma 40)..."
                value={quickSearchInput}
                onChange={(e) => {
                  setQuickSearchInput(e.target.value);
                  setShowQuickSuggestions(true);
                }}
                onFocus={() => {
                  if (quickSearchInput.trim().length >= 2) setShowQuickSuggestions(true);
                }}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  border: 0,
                  outline: 'none',
                  fontSize: '12.5px',
                  color: '#0f172a',
                  fontWeight: 600
                }}
              />
              {quickSearchInput && (
                <button
                  type="button"
                  onClick={() => { setQuickSearchInput(''); setShowQuickSuggestions(false); }}
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showQuickSuggestions && quickSearchInput.trim().length >= 2 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#fff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                marginTop: '4px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                zIndex: 1000,
                maxHeight: '260px',
                overflowY: 'auto'
              }}>
                {quickProductQuery.isLoading ? (
                  <div style={{ padding: '12px', fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>
                    Searching inventory products...
                  </div>
                ) : (quickProductQuery.data || []).length === 0 ? (
                  <div style={{ padding: '12px', fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>
                    No inventory match for "<strong>{quickSearchInput}</strong>".<br />
                    <span style={{ fontSize: '10.5px', color: '#007a70' }}>Press "Add to Order Notes" to add as a custom requirement.</span>
                  </div>
                ) : (
                  (quickProductQuery.data || []).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setQuickSearchInput(p.name);
                        if (p.baseUnit?.name) setQuickUnit(p.baseUnit.name);
                        setShowQuickSuggestions(false);
                      }}
                      style={{
                        padding: '9px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                    >
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                          {p.genericName ? `Salt: ${p.genericName}` : ''} {p.brandName ? `| ${p.brandName}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#007a70', fontWeight: 700 }}>
                        <span>Select</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Qty */}
          <div style={{ width: '90px' }}>
            <input
              type="number"
              min="1"
              required
              placeholder="Qty"
              value={quickQty}
              onChange={(e) => setQuickQty(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 10px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                outline: 'none',
                textAlign: 'center'
              }}
            />
          </div>

          {/* Unit */}
          <div style={{ width: '105px' }}>
            <select
              value={quickUnit}
              onChange={(e) => setQuickUnit(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 8px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none',
                background: '#fff'
              }}
            >
              <option value="Strips">Strips</option>
              <option value="Boxes">Boxes</option>
              <option value="Units">Units</option>
              <option value="Bottles">Bottles</option>
              <option value="Vials">Vials</option>
              <option value="Injections">Injections</option>
              <option value="Tablet">Tablet</option>
            </select>
          </div>

          {/* Preferred Distributor */}
          <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
            <input
              type="text"
              placeholder="Distributor (Optional)"
              value={quickDistributor}
              onChange={(e) => setQuickDistributor(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 10px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Note */}
          <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
            <input
              type="text"
              placeholder="Customer note / urgent delivery..."
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 10px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Add Button */}
          <button
            type="submit"
            disabled={createMutation.isPending || !quickSearchInput.trim()}
            style={{
              background: quickSearchInput.trim() ? '#007a70' : '#cbd5e1',
              color: '#fff',
              border: 0,
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: quickSearchInput.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: quickSearchInput.trim() ? '0 2px 4px rgba(0,122,112,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Plus size={15} /> {createMutation.isPending ? 'Adding...' : 'Add to Order Notes'}
          </button>
        </form>
      </div>

      {/* KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        
        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Pending Procurement</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{pendingCount} Items</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Needs to be ordered from distributors</div>
          </div>
          <span style={{ padding: '8px', background: '#fef3c7', color: '#d97706', borderRadius: '8px' }}>
            <Clock size={20} />
          </span>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Ordered / Completed</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{orderedCount} Items</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Dispatched or received</div>
          </div>
          <span style={{ padding: '8px', background: '#dcfce7', color: '#059669', borderRadius: '8px' }}>
            <CheckCircle2 size={20} />
          </span>
        </div>

        <div style={{ background: '#fff', padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#007a70', textTransform: 'uppercase' }}>Distributors Tagged</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{distributorGroups.length} Vendors</div>
            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Specific supplier routing ready</div>
          </div>
          <span style={{ padding: '8px', background: '#edf7f5', color: '#007a70', borderRadius: '8px' }}>
            <Building2 size={20} />
          </span>
        </div>

      </div>

      {/* Distributor Specific WhatsApp Quick Dispatch */}
      {distributorGroups.length > 0 && (
        <div style={{
          background: '#f0fdf9',
          border: '1px solid #99f6e4',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#0d9488" />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#134e4a' }}>
              Quick Share By Distributor:
            </span>
            <span style={{ fontSize: '11.5px', color: '#0f766e' }}>
              Send targeted requirement orders to individual suppliers:
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {distributorGroups.map(({ distributor, count }) => (
              <button
                key={distributor}
                type="button"
                onClick={() => handleShareWhatsApp(distributor === 'General / Unassigned' ? null : distributor)}
                style={{
                  background: '#fff',
                  border: '1px solid #14b8a6',
                  color: '#0f766e',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                <Send size={11} color="#128c7e" />
                <span>{distributor}</span>
                <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '1px 5px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        background: '#fff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search medicine, distributor, or note in list..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              border: 0,
              outline: 'none',
              width: '100%',
              fontSize: '12px',
              color: '#0f172a'
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', gap: '2px' }}>
            {[
              { key: 'ALL', label: 'All Requirements' },
              { key: 'PENDING', label: `Pending (${pendingCount})` },
              { key: 'ORDERED', label: `Ordered (${orderedCount})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '4px',
                  border: 0,
                  fontSize: '11px',
                  fontWeight: statusFilter === tab.key ? 800 : 600,
                  cursor: 'pointer',
                  background: statusFilter === tab.key ? '#fff' : 'transparent',
                  color: statusFilter === tab.key ? '#007a70' : '#64748b',
                  boxShadow: statusFilter === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {orderedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all ordered/completed notes?')) {
                  clearCompletedMutation.mutate();
                }
              }}
              style={{
                background: '#fee2e2',
                color: '#ef4444',
                border: 0,
                borderRadius: '6px',
                padding: '5px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={12} /> Clear Completed
            </button>
          )}
        </div>
      </div>

      {/* Floating Selection Bar if items selected */}
      {selectedIds.size > 0 && (
        <div style={{
          background: '#042f2e',
          color: '#fff',
          borderRadius: '8px',
          padding: '10px 16px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 700 }}>
            <span style={{ background: '#0d9488', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
              {selectedIds.size} Selected
            </span>
            <span>You have selected {selectedIds.size} item(s) to order or share.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleShareWhatsApp(null, true)}
              style={{
                background: '#25d366',
                color: '#064e3b',
                border: 0,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Send size={13} /> Share Selected on WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: 'transparent',
                color: '#99f6e4',
                border: '1px solid #115e59',
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table className="pos-table" style={{ width: '100%', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer', accentColor: '#007a70' }}
                  title="Select All"
                />
              </th>
              <th style={{ width: '40px', textAlign: 'center' }}>Status</th>
              <th>Medicine / Requirement</th>
              <th style={{ textAlign: 'center', width: '120px' }}>Quantity</th>
              <th>Preferred Distributor</th>
              <th>Notes / Customer Request</th>
              <th style={{ width: '120px' }}>Date Added</th>
              <th className="center" style={{ width: '130px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {notesQuery.isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  Loading daily requirements...
                </td>
              </tr>
            ) : notes.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '50%', background: '#f8fafc', marginBottom: '8px' }}>
                    <ClipboardList size={28} color="#cbd5e1" />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>No Daily Requirements Logged</div>
                  <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
                    Type above to search products and add items to order notes immediately.
                  </div>
                </td>
              </tr>
            ) : (
              notes.map((item) => {
                const isOrdered = item.status === 'ORDERED';
                const isChecked = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    style={{
                      background: isChecked ? '#f0fdf9' : (isOrdered ? '#f8fafc' : '#fff'),
                      opacity: isOrdered ? 0.75 : 1
                    }}
                  >
                    {/* Selection Checkbox */}
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelectOne(item.id)}
                        style={{ cursor: 'pointer', accentColor: '#007a70' }}
                      />
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleStatusMutation.mutate({ id: item.id, status: isOrdered ? 'PENDING' : 'ORDERED' })}
                        title={isOrdered ? 'Mark as Pending' : 'Mark as Ordered'}
                        style={{
                          background: isOrdered ? '#10b981' : '#fff',
                          border: isOrdered ? '1px solid #10b981' : '1.5px solid #cbd5e1',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#fff',
                          padding: 0
                        }}
                      >
                        {isOrdered && <Check size={12} strokeWidth={3} />}
                      </button>
                    </td>

                    <td>
                      <div style={{ fontWeight: 800, color: isOrdered ? '#64748b' : '#0f172a', textDecoration: isOrdered ? 'line-through' : 'none' }}>
                        {item.medicineName}
                      </div>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: isOrdered ? '#f1f5f9' : '#fef3c7',
                        color: isOrdered ? '#64748b' : '#d97706',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '11px'
                      }}>
                        {item.quantity} {item.unit}
                      </span>
                    </td>

                    <td>
                      {item.distributor ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#334155' }}>
                          <Building2 size={12} color="#007a70" /> {item.distributor}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Any Supplier</span>
                      )}
                    </td>

                    <td style={{ color: '#475569', fontSize: '11.5px' }}>
                      {item.note || '—'}
                    </td>

                    <td style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>

                    <td className="center">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                            const singleMsg = `📦 *SSDN PHARMAORA REQUIREMENT*\n` +
                              `Item: *${item.medicineName}*\n` +
                              `Required Qty: *${item.quantity} ${item.unit}*\n` +
                              (item.distributor ? `Supplier: *${item.distributor}*\n` : '') +
                              (item.note ? `Note: ${item.note}\n` : '') +
                              `Date: ${todayStr}\nPlease dispatch as soon as possible.`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(singleMsg)}`, '_blank');
                          }}
                          title="Share Single Item on WhatsApp"
                          style={{
                            padding: '3px 7px',
                            borderRadius: '4px',
                            border: '1px solid #14b8a6',
                            background: '#f0fdfa',
                            color: '#0d9488',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <Send size={10} /> Share
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete requirement note for "${item.medicineName}"?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          title="Delete note"
                          style={{
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px solid #fee2e2',
                            background: '#fff',
                            color: '#ef4444',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <Pagination
          pagination={pagination}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          pageSizeOptions={[10, 25, 50, 100]}
          itemLabel="daily requirements"
        />
      </div>

      {/* Detailed Add Requirement Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} color="#007a70" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Add Daily Medicine Requirement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 0, color: '#94a3b8', fontSize: '18px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Autocomplete in Modal */}
              <div ref={modalSearchRef} style={{ position: 'relative' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Search Product or Type Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0 10px', background: '#fff' }}>
                  <Search size={14} color="#94a3b8" />
                  <input
                    type="text"
                    required
                    placeholder="Type drug or salt (e.g. Paracetamol, Pantocid DSR)..."
                    value={modalSearchInput}
                    onChange={(e) => {
                      setModalSearchInput(e.target.value);
                      setMedicineName(e.target.value);
                      setShowModalSuggestions(true);
                    }}
                    onFocus={() => {
                      if (modalSearchInput.trim().length >= 2) setShowModalSuggestions(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: 0,
                      outline: 'none',
                      fontSize: '12px',
                      color: '#0f172a'
                    }}
                  />
                  {modalSearchInput && (
                    <button
                      type="button"
                      onClick={() => { setModalSearchInput(''); setMedicineName(''); setShowModalSuggestions(false); }}
                      style={{ background: 'transparent', border: 0, cursor: 'pointer', color: '#94a3b8' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {showModalSuggestions && modalSearchInput.trim().length >= 2 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    marginTop: '4px',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    maxHeight: '180px',
                    overflowY: 'auto'
                  }}>
                    {modalProductQuery.isLoading ? (
                      <div style={{ padding: '8px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>Searching...</div>
                    ) : (modalProductQuery.data || []).length === 0 ? (
                      <div style={{ padding: '8px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>Custom entry: "{modalSearchInput}"</div>
                    ) : (
                      (modalProductQuery.data || []).map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setMedicineName(p.name);
                            setModalSearchInput(p.name);
                            if (p.baseUnit?.name) setUnit(p.baseUnit.name);
                            setShowModalSuggestions(false);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf9')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                        >
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{p.genericName}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Required Quantity <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Packing / Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none',
                      background: '#fff'
                    }}
                  >
                    <option value="Strips">Strips</option>
                    <option value="Boxes">Boxes</option>
                    <option value="Units">Units</option>
                    <option value="Bottles">Bottles</option>
                    <option value="Vials">Vials</option>
                    <option value="Injections">Injections</option>
                    <option value="Tablet">Tablet</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Distributor / Agency (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mahaveer Medico, Apollo Distribution"
                  value={distributor}
                  onChange={(e) => setDistributor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Note / Patient Demand (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer waiting for evening delivery, Urgent"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#64748b',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 0,
                    background: '#007a70',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,122,112,0.2)'
                  }}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Requirement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
