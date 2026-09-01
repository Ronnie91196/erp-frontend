import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Calendar, Search, RefreshCw, Download, Printer,
  Stethoscope, UserCheck, Receipt, DollarSign, Layers
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function OthersReportsPage({ defaultTab = 'doctor-summary' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'doctor-summary', 'staff-activity', 'sales-summary'
  const [search, setSearch] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['others-reports', activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('subType', activeTab);
      return unwrap(await api.get(`/comprehensive-reports/others?${params.toString()}`));
    },
  });

  const reportData = reportsQuery.data || {};
  const doctors = reportData.doctors || [];
  const staff = reportData.staff || [];
  const sales = reportData.sales || [];

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `PHARMACY REPORTS (${activeTab.toUpperCase()})\n\n`;

    if (activeTab === 'doctor-summary') {
      csv += 'Doctor Name,Medical Reg No,Specialization,Hospital,Phone,Prescription Count,Prescribed Units,Total Rx Revenue\n';
      doctors.forEach((d) => {
        csv += `"${d.doctorName}","${d.regNo}","${d.specialization}","${d.hospital}","${d.phone}","${d.rxCount}","${d.totalPrescribedUnits}","${d.totalRxValue.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'staff-activity') {
      csv += 'Staff Name,Email,Phone,Role,Status,Activity\n';
      staff.forEach((s) => {
        csv += `"${s.name}","${s.email}","${s.phone}","${s.role}","${s.status}","${s.lastActive}"\n`;
      });
    } else {
      csv += 'Invoice No,Date,Customer,Total,Paid,Due,Status\n';
      sales.forEach((s) => {
        csv += `"${s.invoiceNumber}","${s.invoiceDate}","${s.customer?.name || 'Walk-in'}","${s.totalAmount}","${s.paidAmount}","${s.dueAmount}","${s.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pos-container">
      {/* Top Header */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#007a70" /> Operational & Medical Practice Reports
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{ background: '#fff', color: '#007a70', border: '1px solid #cadcd7', padding: '6px 12px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={14} /> Print
          </button>
          <button
            onClick={handleExportCSV}
            style={{ background: '#007a70', color: '#fff', border: 0, padding: '6px 14px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,122,112,0.28)' }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #dbe6e3', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { key: 'doctor-summary', label: 'Doctor - Item Summary' },
              { key: 'staff-activity', label: 'Staff Wise Activity Summary (NEW)' },
              { key: 'sales-summary', label: 'Sales Summary Report (NEW)' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px',
                  border: 0,
                  borderBottom: activeTab === tab.key ? '2.5px solid #007a70' : '2.5px solid transparent',
                  background: 'transparent',
                  color: activeTab === tab.key ? '#007a70' : '#68827c',
                  fontWeight: activeTab === tab.key ? 800 : 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginBottom: '-2px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => reportsQuery.refetch()}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '11px', fontWeight: 700, cursor: 'pointer', marginBottom: '4px' }}
          >
            <RefreshCw size={13} className={reportsQuery.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Tab 1: Doctor - Item Summary */}
        {activeTab === 'doctor-summary' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Prescribing Doctor</th>
                  <th>Medical Reg. No</th>
                  <th>Specialization</th>
                  <th>Hospital / Clinic</th>
                  <th style={{ textAlign: 'center' }}>Prescriptions Filled</th>
                  <th style={{ textAlign: 'center' }}>Units Dispensed</th>
                  <th className="right">Total Rx Sales Value</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading doctor referrals...</td></tr>
                ) : doctors.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No doctor prescriptions recorded.</td></tr>
                ) : (
                  doctors.map((doc, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td><b style={{ color: '#133e36' }}>Dr. {doc.doctorName}</b></td>
                      <td style={{ fontFamily: 'monospace', color: '#007a70', fontWeight: 700 }}>{doc.regNo}</td>
                      <td>{doc.specialization}</td>
                      <td>{doc.hospital}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{doc.rxCount} Rx</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#007a70' }}>{doc.totalPrescribedUnits}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#059669' }}>{money(doc.totalRxValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Staff Activity */}
        {activeTab === 'staff-activity' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Email</th>
                  <th>Contact Phone</th>
                  <th>Role</th>
                  <th className="center">System Status</th>
                  <th>Activity Log</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading staff records...</td></tr>
                ) : staff.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No staff members found.</td></tr>
                ) : (
                  staff.map((s, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td><b style={{ color: '#133e36' }}>{s.name}</b></td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{s.email}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{s.phone}</td>
                      <td>
                        <span style={{ fontSize: '10px', background: '#edf7f5', color: '#007a70', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {s.role}
                        </span>
                      </td>
                      <td className="center">
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: '#ecfdf5', color: '#059669', fontWeight: 800 }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>{s.lastActive}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Sales Summary */}
        {activeTab === 'sales-summary' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th className="right">Total Bill</th>
                  <th className="right">Paid</th>
                  <th className="right">Due</th>
                  <th className="center">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.isLoading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading sales summary...</td></tr>
                ) : sales.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No sales records found.</td></tr>
                ) : (
                  sales.map((s, idx) => (
                    <tr key={idx} className="hover:bg-teal-50/40">
                      <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>{s.invoiceNumber}</td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{new Date(s.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td><b>{s.customer?.name || 'Walk-in'}</b></td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(s.totalAmount)}</td>
                      <td className="right" style={{ fontWeight: 700, color: '#059669' }}>{money(s.paidAmount)}</td>
                      <td className="right" style={{ fontWeight: 800, color: Number(s.dueAmount) > 0 ? '#dc2626' : '#68827c' }}>{money(s.dueAmount)}</td>
                      <td className="center">
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: '#ecfdf5', color: '#059669', fontWeight: 800 }}>
                          {s.paymentStatus || 'PAID'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
