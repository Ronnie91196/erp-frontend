import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarCheck,
  Search,
  Plus,
  Phone,
  MessageSquare,
  Check,
  Trash2,
  Calendar,
  Clock,
  Pill,
  User,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import api, { unwrap } from '../../lib/api';

export default function RefillReminders() {
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState('ALL'); // 'TODAY', 'UPCOMING', 'OVERDUE', 'COMPLETED', 'ALL'
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Reminder Form State
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    drugName: '',
    reminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    timesPerDay: '2',
    reminderTimes: ['08:00 AM', '08:00 PM'],
    mealTiming: 'AFTER_MEAL',
    dosageInstructions: '1 tablet with water',
    notes: '',
  });

  // Queries
  const { data: remindersRes, isLoading, refetch } = useQuery({
    queryKey: ['refill-reminders-page', filterTab],
    queryFn: async () => {
      const params = {};
      if (filterTab === 'TODAY') {
        params.filter = 'TODAY';
      } else if (filterTab === 'UPCOMING') {
        params.filter = 'UPCOMING';
      } else if (filterTab === 'OVERDUE') {
        params.filter = 'OVERDUE';
      } else if (filterTab === 'COMPLETED') {
        params.status = 'COMPLETED';
      } else if (filterTab === 'ALL') {
        params.status = 'ALL';
      }
      return unwrap(await api.get('/reminders', { params }));
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['refill-reminders-customers'],
    queryFn: async () => {
      const res = unwrap(await api.get('/customers'));
      return Array.isArray(res) ? res : [];
    },
  });

  const rawReminders = remindersRes?.reminders || [];
  const stats = remindersRes?.stats || { todayCount: 0, totalPendingCount: 0 };

  const reminders = useMemo(() => {
    if (!search.trim()) return rawReminders;
    const q = search.toLowerCase().trim();
    return rawReminders.filter(
      (r) =>
        r.drugName?.toLowerCase().includes(q) ||
        r.customer?.name?.toLowerCase().includes(q) ||
        r.customer?.phone?.includes(q) ||
        r.sale?.invoiceNumber?.toLowerCase().includes(q)
    );
  }, [rawReminders, search]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/reminders/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refill-reminders-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (id) => api.delete(`/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refill-reminders-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: async (payload) => api.post('/reminders', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refill-reminders-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setShowAddModal(false);
      setFormData({
        customerId: '',
        customerName: '',
        drugName: '',
        reminderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        timesPerDay: '2',
        reminderTimes: ['08:00 AM', '08:00 PM'],
        mealTiming: 'AFTER_MEAL',
        dosageInstructions: '1 tablet with water',
        notes: '',
      });
      window.alert('Patient Refill Reminder scheduled successfully!');
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to create reminder');
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      window.alert('Please select a registered patient/customer');
      return;
    }
    if (!formData.drugName) {
      window.alert('Please enter medicine name');
      return;
    }
    createReminderMutation.mutate({
      customerId: formData.customerId,
      drugName: formData.drugName,
      reminderDate: formData.reminderDate,
      reminderTime: formData.reminderTimes.filter(Boolean).join(', ') || '08:00 AM, 08:00 PM',
      timesPerDay: Number(formData.timesPerDay) || 1,
      mealTiming: formData.mealTiming,
      dosageInstructions: formData.dosageInstructions,
      notes: formData.notes,
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e6f4f1', color: '#007a70', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarCheck size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#133e36', margin: 0 }}>
                Patient Refill & Medication Reminders
              </h1>
              <p style={{ fontSize: '12px', color: '#55726c', margin: '2px 0 0' }}>
                Track patient dosage timelines, scheduled refill dates, and trigger instant WhatsApp/Phone notifications.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #cadcd7',
              background: '#ffffff',
              color: '#446059',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 0,
              background: '#007a70',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 122, 112, 0.25)',
            }}
          >
            <Plus size={16} /> New Refill Reminder
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #dce8e4', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Due Today</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
            {stats.todayCount}
          </div>
          <div style={{ fontSize: '11px', color: '#889f9a', marginTop: '2px' }}>Patients needing refills today</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #dce8e4', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Active Reminders</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#007a70', marginTop: '4px' }}>
            {stats.totalPendingCount}
          </div>
          <div style={{ fontSize: '11px', color: '#889f9a', marginTop: '2px' }}>Total scheduled pending refills</div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '10px', border: '1px solid #dce8e4', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Registered Patients</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
            {customers.length}
          </div>
          <div style={{ fontSize: '11px', color: '#889f9a', marginTop: '2px' }}>Available customer directory</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #dce8e4', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#edf5f2', padding: '4px', borderRadius: '8px' }}>
          {[
            { key: 'ALL', label: 'All Reminders' },
            { key: 'TODAY', label: `Due Today (${stats.todayCount})` },
            { key: 'UPCOMING', label: 'Upcoming' },
            { key: 'OVERDUE', label: 'Overdue' },
            { key: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterTab(tab.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 0,
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: filterTab === tab.key ? '#ffffff' : 'transparent',
                color: filterTab === tab.key ? '#007a70' : '#52726c',
                boxShadow: filterTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={14} color="#68827c" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search patient, medicine, or bill #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: '6px',
              border: '1px solid #cadcd7',
              fontSize: '11.5px',
              outline: 'none',
              background: '#ffffff',
            }}
          />
        </div>
      </div>

      {/* Reminders Table Card */}
      <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #dce8e4', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f6faf9', borderBottom: '1px solid #dce8e4', color: '#133e36', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                <th style={{ padding: '12px 16px' }}>Patient / Customer</th>
                <th style={{ padding: '12px 16px' }}>Medicine & Pack</th>
                <th style={{ padding: '12px 16px' }}>Schedule & Timings</th>
                <th style={{ padding: '12px 16px' }}>Refill Date</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#68827c' }}>
                    Loading patient refill reminders...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 16px', textAlign: 'center', color: '#68827c' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>No Reminders Found</div>
                    <div style={{ fontSize: '11.5px', color: '#889f9a', marginTop: '2px' }}>
                      Schedule new patient medication and refill reminders above or during POS checkout.
                    </div>
                  </td>
                </tr>
              ) : (
                reminders.map((rem) => {
                  const isCompleted = rem.status === 'COMPLETED';
                  const mealText = {
                    AFTER_MEAL: 'After Meals',
                    BEFORE_MEAL: 'Before Meals',
                    WITH_FOOD: 'With Food',
                    ANYTIME: 'Anytime',
                  }[rem.mealTiming] || rem.mealTiming;

                  const isDue = new Date(rem.reminderDate).toDateString() === new Date().toDateString();
                  const isOverdue = new Date(rem.reminderDate) < new Date() && !isCompleted && !isDue;

                  const shareUrl = rem.saleId ? `${window.location.origin}/p/bill/${rem.saleId}` : window.location.origin;
                  const waMessage = `Hello ${rem.customer?.name || 'Customer'}! This is a gentle reminder from Main Pharmacy for your medicine: ${rem.drugName} (${rem.timesPerDay}x daily - ${mealText}). Track here: ${shareUrl}`;

                  return (
                    <tr
                      key={rem.id}
                      style={{
                        borderBottom: '1px solid #eef4f2',
                        background: isCompleted ? '#fafcfb' : isDue ? '#fffdfa' : '#ffffff',
                        opacity: isCompleted ? 0.75 : 1,
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#133e36', fontSize: '12.5px' }}>
                          {rem.customer?.name || 'Walk-in Customer'}
                        </div>
                        {rem.customer?.phone && (
                          <div style={{ fontSize: '11px', color: '#007a70', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            📞 {rem.customer.phone}
                          </div>
                        )}
                        {rem.sale?.invoiceNumber && (
                          <div style={{ fontSize: '10px', color: '#889f9a', marginTop: '2px' }}>
                            Bill: #{rem.sale.invoiceNumber}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#133e36', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Pill size={14} color="#007a70" /> {rem.drugName}
                        </div>
                        {rem.dosageInstructions && (
                          <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '3px', fontStyle: 'italic' }}>
                            {rem.dosageInstructions}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#133e36', fontSize: '11.5px' }}>
                          {rem.timesPerDay}x Daily ({mealText})
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#007a70', marginTop: '2px', fontWeight: 600 }}>
                          ⏰ {rem.reminderTime || '08:00 AM'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: isOverdue ? '#e11d48' : isDue ? '#d97706' : '#133e36' }}>
                          {new Date(rem.reminderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '10px', color: isOverdue ? '#e11d48' : isDue ? '#d97706' : '#68827c', fontWeight: 600 }}>
                          {isOverdue ? '⚠️ Overdue' : isDue ? '🔔 Due Today' : 'Upcoming'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 800,
                            background: isCompleted ? '#ecfdf5' : isOverdue ? '#fff1f2' : isDue ? '#fef3c7' : '#eef8f5',
                            color: isCompleted ? '#059669' : isOverdue ? '#e11d48' : isDue ? '#b45309' : '#007a70',
                            border: isCompleted ? '1px solid #a7f3d0' : isOverdue ? '1px solid #fecaca' : isDue ? '1px solid #fde68a' : '1px solid #c8e6df',
                          }}
                        >
                          {isCompleted ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                          {rem.status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {rem.customer?.phone && (
                            <>
                              <a
                                href={`tel:${rem.customer.phone}`}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  border: '1px solid #cde4de',
                                  background: '#ffffff',
                                  color: '#007a70',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Call Patient"
                              >
                                <Phone size={12} /> Call
                              </a>
                              <a
                                href={`https://wa.me/91${rem.customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '5px',
                                  border: '1px solid #a7f3d0',
                                  background: '#ecfdf5',
                                  color: '#16a34a',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                                title="Send WhatsApp Dosage Alert"
                              >
                                <MessageSquare size={12} /> WhatsApp
                              </a>
                            </>
                          )}

                          {isCompleted ? (
                            <button
                              type="button"
                              onClick={() => updateStatusMutation.mutate({ id: rem.id, status: 'PENDING' })}
                              style={{
                                border: 0,
                                background: 'transparent',
                                color: '#68827c',
                                fontSize: '11px',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                              }}
                            >
                              Reopen
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => updateStatusMutation.mutate({ id: rem.id, status: 'COMPLETED' })}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '5px',
                                border: 0,
                                background: '#007a70',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Check size={12} /> Mark Done
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this reminder?')) {
                                deleteReminderMutation.mutate(rem.id);
                              }
                            }}
                            style={{
                              border: '1px solid #fecaca',
                              background: '#fff1f2',
                              color: '#e11d48',
                              padding: '4px 6px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                            }}
                            title="Delete reminder"
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
        </div>
      </div>

      {/* New Refill Reminder Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', zIndex: 99999, display: 'grid', placeItems: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: 'min(480px, 94vw)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid #cadcd7', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: '#f4faf8', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarCheck size={18} color="#007a70" />
                <strong style={{ fontSize: '14px', color: '#133e36' }}>New Patient Refill Reminder</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ border: 0, background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: '20px', display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#446059', marginBottom: '4px' }}>
                  Select Registered Patient *
                </label>
                <select
                  required
                  value={formData.customerId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '12px', outline: 'none' }}
                >
                  <option value="">-- Choose Patient / Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#446059', marginBottom: '4px' }}>
                  Medicine / Drug Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Metformin 500mg"
                  value={formData.drugName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, drugName: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#446059', marginBottom: '4px' }}>
                    Refill Target Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.reminderDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reminderDate: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '12px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#446059', marginBottom: '4px' }}>
                    Meal Timing *
                  </label>
                  <select
                    value={formData.mealTiming}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mealTiming: e.target.value }))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="AFTER_MEAL">After Meals</option>
                    <option value="BEFORE_MEAL">Before Meals</option>
                    <option value="WITH_FOOD">With Food</option>
                    <option value="ANYTIME">Anytime</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#446059', marginBottom: '4px' }}>
                  Frequency (Times / Day) *
                </label>
                <select
                  value={formData.timesPerDay}
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    const defaultPresets = [
                      ['08:00 AM'],
                      ['08:00 AM', '08:00 PM'],
                      ['08:00 AM', '01:00 PM', '08:00 PM'],
                      ['08:00 AM', '01:00 PM', '05:00 PM', '09:30 PM'],
                    ];
                    setFormData((prev) => ({
                      ...prev,
                      timesPerDay: e.target.value,
                      reminderTimes: defaultPresets[count - 1] || ['08:00 AM'],
                    }));
                  }}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '12px', outline: 'none' }}
                >
                  <option value="1">1 Time a Day (OD)</option>
                  <option value="2">2 Times a Day (BD)</option>
                  <option value="3">3 Times a Day (TDS)</option>
                  <option value="4">4 Times a Day (QID)</option>
                </select>
              </div>

              {/* Multi-Time Slots */}
              <div style={{ background: '#f4faf8', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d0e6df' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#007a70', marginBottom: '6px' }}>
                  ⏰ Dosage Consumption Times
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: Number(formData.timesPerDay) > 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px' }}>
                  {Array.from({ length: Number(formData.timesPerDay) || 1 }).map((_, idx) => (
                    <div key={idx}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#55726c' }}>Dose #{idx + 1}:</span>
                      <select
                        value={formData.reminderTimes[idx] || (idx === 0 ? '08:00 AM' : idx === 1 ? '08:00 PM' : idx === 2 ? '01:00 PM' : '05:00 PM')}
                        onChange={(e) => {
                          const updated = [...formData.reminderTimes];
                          updated[idx] = e.target.value;
                          setFormData((prev) => ({ ...prev, reminderTimes: updated }));
                        }}
                        style={{ width: '100%', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cadcd7', fontSize: '11px', outline: 'none', background: '#fff' }}
                      >
                        <option value="07:00 AM">07:00 AM (Early Morning)</option>
                        <option value="08:00 AM">08:00 AM (Morning)</option>
                        <option value="09:00 AM">09:00 AM (Breakfast)</option>
                        <option value="12:00 PM">12:00 PM (Noon)</option>
                        <option value="01:00 PM">01:00 PM (Lunch)</option>
                        <option value="05:00 PM">05:00 PM (Evening)</option>
                        <option value="07:00 PM">07:00 PM (Pre-Dinner)</option>
                        <option value="08:00 PM">08:00 PM (Dinner)</option>
                        <option value="09:30 PM">09:30 PM (Bedtime)</option>
                        <option value="10:00 PM">10:00 PM (Late Night)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#446059', marginBottom: '4px' }}>
                  Dosage Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 tablet with warm milk"
                  value={formData.dosageInstructions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dosageInstructions: e.target.value }))}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#f8faf9', color: '#55726c', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReminderMutation.isPending}
                  style={{ padding: '6px 16px', borderRadius: '6px', border: 0, background: '#007a70', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {createReminderMutation.isPending ? 'Scheduling...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
