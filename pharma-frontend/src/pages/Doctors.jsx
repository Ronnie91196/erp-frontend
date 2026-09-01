import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { unwrap, apiError } from '../lib/api';
import { Card, Table, Button, Input, Badge, money, date } from '../components/ui';
import {
  Stethoscope,
  Search,
  Plus,
  Edit3,
  Trash2,
  Phone,
  Mail,
  Building2,
  FileBadge,
  MapPin,
  FileText,
  UserCheck,
} from 'lucide-react';

const doctorFields = [
  { key: 'name', label: 'Doctor Name', required: true, placeholder: 'Dr. John Doe' },
  { key: 'registrationNo', label: 'Registration / License No', placeholder: 'e.g. MCI-12345' },
  { key: 'specialization', label: 'Specialization', placeholder: 'e.g. Cardiologist, General Physician' },
  { key: 'phone', label: 'Phone Number', placeholder: 'e.g. 9876543210' },
  { key: 'email', label: 'Email Address', placeholder: 'e.g. doctor@clinic.com' },
  { key: 'hospital', label: 'Hospital / Clinic Name', placeholder: 'e.g. City Hospital & Research Centre' },
  { key: 'address', label: 'Address / Chamber', placeholder: 'e.g. 2nd Floor, Apollo Clinic' },
  { key: 'notes', label: 'Notes', placeholder: 'Special instructions or notes...' },
];

function DoctorFormModal({ initial, onClose, onSave, isPending }) {
  const [form, setForm] = useState(
    initial || {
      name: '',
      registrationNo: '',
      specialization: '',
      phone: '',
      email: '',
      hospital: '',
      address: '',
      notes: '',
      isActive: true,
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      window.alert('Doctor name is required');
      return;
    }
    onSave(form);
  };

  return (
    <div className="drawerBackdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modalCard"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '95%',
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e6f4f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007a70' }}>
              <Stethoscope size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#133e36', fontWeight: 800 }}>
                {initial?.id ? 'Edit Doctor Profile' : 'Add New Doctor'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#627a75' }}>
                {initial?.id ? 'Update doctor registration and contact details' : 'Register a doctor for prescription tracking and sales'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 0, background: 'none', fontSize: '24px', cursor: 'pointer', color: '#889e98' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Doctor Name <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Full Name"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Registration / License No
              </label>
              <input
                type="text"
                value={form.registrationNo || ''}
                onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
                placeholder="e.g. MCI-12345"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Specialization
              </label>
              <input
                type="text"
                value={form.specialization || ''}
                onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                placeholder="e.g. General Physician"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. doc@clinic.com"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Hospital / Clinic Name
              </label>
              <input
                type="text"
                value={form.hospital || ''}
                onChange={(e) => setForm({ ...form, hospital: e.target.value })}
                placeholder="e.g. City Care Hospital"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Address / Chamber
              </label>
              <input
                type="text"
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. Room 102, Health Complex, Main St."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Notes
              </label>
              <textarea
                rows={2}
                value={form.notes || ''}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Special notes or remarks..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 0,
                background: '#007a70',
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {isPending ? 'Saving...' : initial?.id ? 'Update Doctor' : 'Create Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DoctorDetailsModal({ doctorId, onClose, onEdit }) {
  const q = useQuery({
    queryKey: ['doctor-detail', doctorId],
    queryFn: async () => unwrap(await api.get(`/doctors/${doctorId}`)),
  });

  const doc = q.data;

  return (
    <div className="drawerBackdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modalCard"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '720px',
          width: '95%',
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Doctor Details
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: 800, color: '#133e36' }}>
              {doc?.name || 'Loading Doctor...'}
            </h2>
            {doc?.specialization && (
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#007a70', fontWeight: 600 }}>
                {doc.specialization}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {doc && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(doc);
                }}
                style={{
                  border: '1px solid #cadcd7',
                  background: '#f8faf9',
                  color: '#007a70',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Edit3 size={13} /> Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ border: 0, background: 'none', fontSize: '24px', cursor: 'pointer', color: '#889e98' }}
            >
              ×
            </button>
          </div>
        </div>

        {q.isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#627a75' }}>Loading doctor details...</div>
        ) : !doc ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#e11d48' }}>Doctor not found</div>
        ) : (
          <div>
            {/* Info Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                background: '#f8faf9',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2ece9',
                marginBottom: '20px',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#627a75', fontWeight: 600, display: 'block' }}>Registration No</span>
                <strong style={{ fontSize: '13px', color: '#133e36' }}>{doc.registrationNo || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#627a75', fontWeight: 600, display: 'block' }}>Phone</span>
                <strong style={{ fontSize: '13px', color: '#133e36' }}>{doc.phone || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#627a75', fontWeight: 600, display: 'block' }}>Email</span>
                <strong style={{ fontSize: '13px', color: '#133e36' }}>{doc.email || '—'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#627a75', fontWeight: 600, display: 'block' }}>Hospital / Clinic</span>
                <strong style={{ fontSize: '13px', color: '#133e36' }}>{doc.hospital || '—'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', color: '#627a75', fontWeight: 600, display: 'block' }}>Address / Chamber</span>
                <strong style={{ fontSize: '13px', color: '#133e36' }}>{doc.address || '—'}</strong>
              </div>
              {doc.notes && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '11px', color: '#627a75', fontWeight: 600, display: 'block' }}>Notes</span>
                  <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>{doc.notes}</p>
                </div>
              )}
            </div>

            {/* Recent Prescriptions and Sales */}
            <div>
              <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700, color: '#133e36' }}>
                Recent Sales Linked ({doc._count?.sales || 0})
              </h4>
              {(!doc.sales || doc.sales.length === 0) ? (
                <p style={{ fontSize: '12px', color: '#889e98', fontStyle: 'italic' }}>No sales linked to this doctor yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="pos-table" style={{ width: '100%', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th className="right">Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.sales.map((s) => (
                        <tr key={s.id}>
                          <td className="font-mono font-bold text-slate-800">{s.invoiceNumber}</td>
                          <td>{new Date(s.invoiceDate).toLocaleDateString('en-IN')}</td>
                          <td>{s.customer?.name || 'Walk-in Customer'}</td>
                          <td className="right font-bold">{money(s.totalAmount)}</td>
                          <td>
                            <Badge variant={s.status === 'COMPLETED' ? 'success' : 'neutral'}>
                              {s.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Doctors() {
  const [search, setSearch] = useState('');
  const [modalDoctor, setModalDoctor] = useState(null); // { id: ... } or { new: true }
  const [detailDoctorId, setDetailDoctorId] = useState(null);

  const queryClient = useQueryClient();

  const doctorsQuery = useQuery({
    queryKey: ['doctors-list', search],
    queryFn: async () => {
      const res = unwrap(await api.get(`/doctors${search ? `?search=${encodeURIComponent(search)}` : ''}`));
      return Array.isArray(res) ? res : [];
    },
  });

  const doctors = doctorsQuery.data || [];

  const createMutation = useMutation({
    mutationFn: async (data) => unwrap(await api.post('/doctors', data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      setModalDoctor(null);
    },
    onError: (err) => window.alert(err?.message || 'Failed to create doctor'),
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => unwrap(await api.put(`/doctors/${data.id}`, data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-detail'] });
      setModalDoctor(null);
    },
    onError: (err) => window.alert(err?.message || 'Failed to update doctor'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/doctors/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
    },
    onError: (err) => window.alert(err?.message || 'Failed to delete doctor'),
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete doctor "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f5f7f6', minHeight: '100vh' }}>
      <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid #dce8e4', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#007a70', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>
              Doctor Directory
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#133e36', margin: '2px 0 0' }}>
              Doctors & Prescribers
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setModalDoctor({ new: true })}
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
              gap: '6px',
            }}
          >
            <Plus size={15} /> Add Doctor
          </button>
        </div>

        {/* Stats KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Total Doctors</span>
            <strong style={{ fontSize: '20px', color: '#133e36' }}>{doctors.length}</strong>
          </div>
          <div style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>Prescriptions / Sales Linked</span>
            <strong style={{ fontSize: '20px', color: '#007a70' }}>
              {doctors.reduce((sum, d) => sum + (d._count?.sales || 0), 0)}
            </strong>
          </div>
          <div style={{ background: '#f8faf9', border: '1px solid #e2ece9', borderRadius: '8px', padding: '12px 14px' }}>
            <span style={{ display: 'block', fontSize: '11px', color: '#627a75', fontWeight: 600 }}>With License / Reg No</span>
            <strong style={{ fontSize: '20px', color: '#133e36' }}>
              {doctors.filter((d) => d.registrationNo).length}
            </strong>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8faf9', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2ece9', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: '1' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a8e89' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search doctors by name, license no, hospital, specialization or phone..."
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: '6px',
                border: '1px solid #cadcd7',
                fontSize: '12.5px',
                background: '#fff',
              }}
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                border: '1px solid #cadcd7',
                background: '#fff',
                color: '#627a75',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Doctors Table */}
        {doctorsQuery.isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#627a75' }}>Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fcfdfd', borderRadius: '8px', border: '1px dashed #cadcd7' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🩺</div>
            <h3 style={{ fontSize: '15px', color: '#133e36', margin: '0 0 4px' }}>No doctors found</h3>
            <p style={{ fontSize: '12px', color: '#68827c', margin: '0 0 14px' }}>
              {search ? 'Try adjusting your search criteria.' : 'Add your first doctor to tag on sales and prescriptions.'}
            </p>
            <button
              type="button"
              onClick={() => setModalDoctor({ new: true })}
              style={{
                background: '#007a70',
                color: '#fff',
                border: 0,
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Add Doctor
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="pos-table" style={{ width: '100%', minWidth: '760px' }}>
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Reg / License</th>
                  <th>Specialization</th>
                  <th>Hospital / Clinic</th>
                  <th>Contact</th>
                  <th className="center">Sales Linked</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div
                        onClick={() => setDetailDoctorId(doc.id)}
                        style={{ fontWeight: 700, color: '#007a70', cursor: 'pointer' }}
                      >
                        {doc.name}
                      </div>
                      {doc.address && (
                        <div style={{ fontSize: '11px', color: '#7a8f89', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <MapPin size={10} /> {doc.address}
                        </div>
                      )}
                    </td>
                    <td>
                      {doc.registrationNo ? (
                        <span style={{ background: '#eef2f6', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                          {doc.registrationNo}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#334155' }}>{doc.specialization || '—'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#334155' }}>{doc.hospital || '—'}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '11.5px', color: '#334155' }}>
                        {doc.phone && <div>📞 {doc.phone}</div>}
                        {doc.email && <div style={{ color: '#64748b' }}>✉️ {doc.email}</div>}
                        {!doc.phone && !doc.email && <span style={{ color: '#94a3b8' }}>—</span>}
                      </div>
                    </td>
                    <td className="center">
                      <span style={{ fontWeight: 700, color: '#133e36', fontSize: '12px' }}>
                        {doc._count?.sales || 0}
                      </span>
                    </td>
                    <td className="center" style={{ whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => setDetailDoctorId(doc.id)}
                        style={{
                          border: '1px solid #cadcd7',
                          background: '#f8faf9',
                          color: '#007a70',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          marginRight: '5px',
                        }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalDoctor(doc)}
                        style={{
                          border: '1px solid #b7d6ce',
                          background: '#edf7f5',
                          color: '#007a70',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '3px 8px',
                          cursor: 'pointer',
                          marginRight: '5px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.id, doc.name)}
                        style={{
                          border: '1px solid #fecaca',
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          padding: '3px 8px',
                          cursor: 'pointer',
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

      {/* Modal Dialogs */}
      {modalDoctor && (
        <DoctorFormModal
          initial={modalDoctor.new ? null : modalDoctor}
          onClose={() => setModalDoctor(null)}
          isPending={createMutation.isPending || updateMutation.isPending}
          onSave={(data) => {
            if (modalDoctor.id) {
              updateMutation.mutate({ ...data, id: modalDoctor.id });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}

      {detailDoctorId && (
        <DoctorDetailsModal
          doctorId={detailDoctorId}
          onClose={() => setDetailDoctorId(null)}
          onEdit={(doc) => setModalDoctor(doc)}
        />
      )}
    </div>
  );
}
