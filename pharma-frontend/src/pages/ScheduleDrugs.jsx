import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  NotebookPen, ShieldAlert, Calendar, Download,
  RefreshCw, Search, Eye, Filter, UserCheck, Stethoscope, Pill, X
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function ScheduleDrugsPage({ initialType = 'ALL' }) {
  const [activeTab, setActiveTab] = useState('register'); // 'register', 'drugs', 'doctors', 'patients'
  const [scheduleType, setScheduleType] = useState(initialType);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);

  // Fetch statutory schedule drug register data
  const reportQuery = useQuery({
    queryKey: ['schedule-drugs-report', fromDate, toDate, scheduleType, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (scheduleType && scheduleType !== 'ALL') params.append('scheduleType', scheduleType);
      if (search) params.append('search', search);
      return unwrap(await api.get(`/schedule-drugs/report?${params.toString()}`));
    },
  });

  const reportData = reportQuery.data || {
    summary: {
      totalEntries: 0,
      totalDispensedQty: 0,
      scheduleH1Count: 0,
      scheduleHCount: 0,
      scheduleXCount: 0,
      nrxCount: 0,
    },
    doctorBreakdown: [],
    patientBreakdown: [],
    drugBreakdown: [],
    entries: [],
  };

  const { summary, doctorBreakdown, patientBreakdown, drugBreakdown, entries } = reportData;

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'SCHEDULE DRUG (H/H1/X/NRX) STATUTORY REGISTER\n';
    csvContent += `Generated On,"${new Date().toLocaleString('en-IN')}"\n\n`;

    if (activeTab === 'register') {
      csvContent += 'Invoice No,Dispense Date,Patient Name,Phone,Address,Prescribing Doctor,Doctor Reg No,Drug Name,Generic Salt,Schedule Type,Batch No,Expiry Date,Dispensed Qty,Unit,Total Amount\n';
      entries.forEach((e) => {
        csvContent += `"${e.invoiceNumber}","${e.dispenseDate ? new Date(e.dispenseDate).toLocaleDateString('en-IN') : ''}","${e.patientName}","${e.patientPhone}","${e.patientAddress}","${e.doctorName}","${e.doctorRegNo}","${e.drugName}","${e.genericName}","${e.scheduleType}","${e.batchNumber}","${e.expiryDate ? new Date(e.expiryDate).toLocaleDateString('en-IN') : ''}","${e.quantity}","${e.unit}","${e.totalPrice.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'drugs') {
      csvContent += 'Drug Name,Generic Salt,Schedule,Total Dispenses,Units Dispensed,Total Revenue\n';
      drugBreakdown.forEach((d) => {
        csvContent += `"${d.drugName}","${d.genericName}","${d.scheduleType}","${d.dispenseCount}","${d.unitsDispensed}","${d.totalValue.toFixed(2)}"\n`;
      });
    } else if (activeTab === 'doctors') {
      csvContent += 'Doctor Name,Registration No,Prescriptions Count,Units Dispensed,Total Value\n';
      doctorBreakdown.forEach((doc) => {
        csvContent += `"${doc.doctorName}","${doc.doctorRegNo}","${doc.prescriptionsCount}","${doc.unitsDispensed}","${doc.totalValue.toFixed(2)}"\n`;
      });
    } else {
      csvContent += 'Patient Name,Phone,Address,Bills Count,Units Dispensed,Total Amount\n';
      patientBreakdown.forEach((p) => {
        csvContent += `"${p.patientName}","${p.phone}","${p.address}","${p.billsCount}","${p.unitsDispensed}","${p.totalValue.toFixed(2)}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Schedule_Drugs_Register_${scheduleType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScheduleBadge = (type) => {
    const t = String(type || '').toUpperCase();
    if (t.includes('H1')) return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', label: 'Schedule H1' };
    if (t.includes('X')) return { bg: '#fef3c7', color: '#d97706', border: '#fde68a', label: 'Schedule X' };
    if (t.includes('NRX')) return { bg: '#f3e8ff', color: '#9333ea', border: '#d8b4fe', label: 'NRx Narcotic' };
    return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: 'Schedule H' };
  };

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <h1 className="pos-top-title" style={{ fontSize: '18px', fontWeight: 800, color: '#133e36', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="#e11d48" /> Schedule Drugs (H / H1 / X) & NRx Statutory Register
          </h1>
        </div>

        <div className="pos-top-actions" style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
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
            Print Register
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              background: '#007a70',
              color: '#fff',
              border: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '11.5px',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,122,112,0.28)'
            }}
          >
            <Download size={14} /> Export Statutory CSV
          </button>
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Filter Bar */}
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbe6e3', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} color="#007a70" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd' }}
                title="From Date"
              />
              <span style={{ fontSize: '11px', color: '#889f9a' }}>to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11px', background: '#fcfdfd' }}
                title="To Date"
              />
            </div>

            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value)}
              style={{ height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid #cadcd7', fontSize: '11.5px', background: '#fcfdfd', fontWeight: 700 }}
            >
              <option value="ALL">All Statutory Schedules</option>
              <option value="H1">🔴 Schedule H1 (Narcotics/Anti-TB/Antibiotics)</option>
              <option value="H">🟢 Schedule H (Prescription Drugs)</option>
              <option value="X">🟡 Schedule X (Psychotropic Substances)</option>
              <option value="NRX">🟣 NRx (Narcotics & Controlled Drugs)</option>
            </select>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search drug, patient, doctor reg no, batch..."
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
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => reportQuery.refetch()}
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
              <RefreshCw size={13} className={reportQuery.isFetching ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Regulatory KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #dbe6e3' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#68827c', textTransform: 'uppercase' }}>Total Schedule Dispenses</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#133e36', marginTop: '4px' }}>
              {summary.totalEntries} Entries
            </div>
            <div style={{ fontSize: '10.5px', color: '#007a70', marginTop: '2px', fontWeight: 600 }}>
              {summary.totalDispensedQty} Total Units Dispensed
            </div>
          </div>

          <div style={{ background: '#fee2e2', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #ef4444' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Schedule H1 Records</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
              {summary.scheduleH1Count} Dispenses
            </div>
            <div style={{ fontSize: '10.5px', color: '#991b1b', marginTop: '2px' }}>
              Mandatory Prescriber & Patient Log
            </div>
          </div>

          <div style={{ background: '#fef3c7', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #f59e0b' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Schedule X (Psychotropic)</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#d97706', marginTop: '4px' }}>
              {summary.scheduleXCount} Dispenses
            </div>
            <div style={{ fontSize: '10.5px', color: '#92400e', marginTop: '2px' }}>
              3-Year Mandatory Storage Register
            </div>
          </div>

          <div style={{ background: '#ecfdf5', padding: '14px 16px', borderRadius: '8px', border: '1.5px solid #10b981' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Schedule H Dispenses</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>
              {summary.scheduleHCount} Dispenses
            </div>
            <div style={{ fontSize: '10.5px', color: '#065f46', marginTop: '2px' }}>
              Prescription Only Verified
            </div>
          </div>
        </div>

        {/* Breakdown Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #dbe6e3', paddingBottom: '0' }}>
          {[
            { key: 'register', label: `Statutory Register (${entries.length})` },
            { key: 'drugs', label: `Drug-wise Summary (${drugBreakdown.length})` },
            { key: 'doctors', label: `Doctor Prescribers (${doctorBreakdown.length})` },
            { key: 'patients', label: `Patient Records (${patientBreakdown.length})` },
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

        {/* Tab 1: Statutory Register Table */}
        {activeTab === 'register' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Dispense Date</th>
                  <th>Patient Name & Address</th>
                  <th>Prescribing Doctor & Reg No.</th>
                  <th>Drug Name & Salt</th>
                  <th>Schedule</th>
                  <th>Batch / Expiry</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th className="center" style={{ width: '70px' }}>Rx Action</th>
                </tr>
              </thead>
              <tbody>
                {reportQuery.isLoading && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>Loading statutory drug records...</td></tr>
                )}
                {!reportQuery.isLoading && entries.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No Schedule H/H1/X drug dispenses found for the selected period.</td></tr>
                )}
                {entries.map((entry) => {
                  const badge = getScheduleBadge(entry.scheduleType);
                  return (
                    <tr
                      key={entry.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedEntry(entry)}
                      className="hover:bg-teal-50/40"
                    >
                      <td style={{ fontSize: '11px', color: '#555' }}>
                        <div><b>{entry.dispenseDate ? new Date(entry.dispenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</b></div>
                        <div style={{ fontFamily: 'monospace', color: '#007a70', fontSize: '10.5px' }}>{entry.invoiceNumber}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#133e36' }}>{entry.patientName}</div>
                        <div style={{ fontSize: '10.5px', color: '#68827c' }}>📞 {entry.patientPhone} | 📍 {entry.patientAddress}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#007a70' }}>{entry.doctorName}</div>
                        <div style={{ fontSize: '10.5px', color: '#555' }}>Reg: <b style={{ fontFamily: 'monospace' }}>{entry.doctorRegNo}</b></div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#133e36' }}>{entry.drugName}</div>
                        <div style={{ fontSize: '10.5px', color: '#68827c' }}>{entry.genericName}</div>
                      </td>
                      <td>
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
                      </td>
                      <td>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{entry.batchNumber}</div>
                        <div style={{ fontSize: '10px', color: '#888' }}>
                          Exp: {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : '—'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#133e36' }}>
                        {entry.quantity} {entry.unit}
                      </td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntry(entry)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid #cadcd7',
                            background: '#edf7f5',
                            color: '#007a70',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          View Rx
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Drug-wise Summary */}
        {activeTab === 'drugs' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Drug / Medicine Name</th>
                  <th>Generic Salt Composition</th>
                  <th>Schedule</th>
                  <th style={{ textAlign: 'center' }}>Dispense Events</th>
                  <th style={{ textAlign: 'center' }}>Total Units Dispensed</th>
                  <th className="right">Turnover</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {drugBreakdown.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No drug records available.</td></tr>
                ) : (
                  drugBreakdown.map((d, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedEntity({ type: 'DRUG', data: d })}
                      className="hover:bg-teal-50/40"
                    >
                      <td><b style={{ color: '#133e36' }}>{d.drugName}</b></td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{d.genericName}</td>
                      <td>
                        <span style={{ fontSize: '10px', fontWeight: 800, background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px' }}>
                          {d.scheduleType}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{d.dispenseCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#007a70' }}>{d.unitsDispensed}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(d.totalValue)}</td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntity({ type: 'DRUG', data: d })}
                          style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Doctor Prescribers */}
        {activeTab === 'doctors' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Prescribing Doctor</th>
                  <th>Medical Registration No.</th>
                  <th style={{ textAlign: 'center' }}>Prescriptions Issued</th>
                  <th style={{ textAlign: 'center' }}>Schedule Units Dispensed</th>
                  <th className="right">Total Value</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {doctorBreakdown.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No doctor prescriber data.</td></tr>
                ) : (
                  doctorBreakdown.map((doc, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedEntity({ type: 'DOCTOR', data: doc })}
                      className="hover:bg-teal-50/40"
                    >
                      <td><b style={{ color: '#133e36' }}>{doc.doctorName}</b></td>
                      <td style={{ fontFamily: 'monospace', color: '#007a70', fontWeight: 700 }}>{doc.doctorRegNo}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{doc.prescriptionsCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#007a70' }}>{doc.unitsDispensed}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(doc.totalValue)}</td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntity({ type: 'DOCTOR', data: doc })}
                          style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Patient Records */}
        {activeTab === 'patients' && (
          <div className="pos-table-card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #dbe6e3', overflow: 'hidden' }}>
            <table className="pos-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'center' }}>Bills Count</th>
                  <th style={{ textAlign: 'center' }}>Total Units Received</th>
                  <th className="right">Total Amount</th>
                  <th className="center" style={{ width: '60px' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {patientBreakdown.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#718a84' }}>No patient records available.</td></tr>
                ) : (
                  patientBreakdown.map((p, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedEntity({ type: 'PATIENT', data: p })}
                      className="hover:bg-teal-50/40"
                    >
                      <td><b style={{ color: '#133e36' }}>{p.patientName}</b></td>
                      <td style={{ fontSize: '11px', color: '#555' }}>{p.phone}</td>
                      <td style={{ fontSize: '11px', color: '#68827c' }}>{p.address}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.billsCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#007a70' }}>{p.unitsDispensed}</td>
                      <td className="right" style={{ fontWeight: 800, color: '#133e36' }}>{money(p.totalValue)}</td>
                      <td className="center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedEntity({ type: 'PATIENT', data: p })}
                          style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cadcd7', background: '#edf7f5', color: '#007a70', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Statutory Rx Dispense Verification Modal */}
      {selectedEntry && (
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
          onClick={() => setSelectedEntry(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(640px, 95vw)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', background: '#f8faf9', borderBottom: '1px solid #dbe6e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b style={{ fontSize: '16px', color: '#133e36' }}>Statutory Rx Dispense Record</b>
                <div style={{ fontSize: '11px', color: '#68827c' }}>
                  Invoice: {selectedEntry.invoiceNumber} | Dispensed: {selectedEntry.dispenseDate ? `${new Date(selectedEntry.dispenseDate).toLocaleDateString('en-IN')} ${new Date(selectedEntry.dispenseDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` : '-'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8faf9', padding: '12px 16px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Patient Details</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36', marginTop: '2px' }}>{selectedEntry.patientName}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>📞 {selectedEntry.patientPhone}</div>
                  <div style={{ fontSize: '11px', color: '#68827c' }}>📍 {selectedEntry.patientAddress}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Prescribing Doctor</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#007a70', marginTop: '2px' }}>{selectedEntry.doctorName}</div>
                  <div style={{ fontSize: '11.5px', color: '#555', marginTop: '2px' }}>
                    Registration No: <b style={{ fontFamily: 'monospace' }}>{selectedEntry.doctorRegNo}</b>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff1f2', padding: '14px 16px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Controlled Substance Dispensed</div>
                <div style={{ fontSize: '16px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedEntry.drugName}</div>
                <div style={{ fontSize: '11.5px', color: '#68827c' }}>Generic Composition: {selectedEntry.genericName}</div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #fca5a5' }}>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#68827c' }}>Batch No: </span>
                    <b style={{ fontFamily: 'monospace', color: '#133e36' }}>{selectedEntry.batchNumber}</b>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#68827c' }}>Expiry: </span>
                    <b>{selectedEntry.expiryDate ? new Date(selectedEntry.expiryDate).toLocaleDateString('en-IN') : '—'}</b>
                  </div>
                  <div>
                    <span style={{ fontSize: '10.5px', color: '#68827c' }}>Quantity Dispensed: </span>
                    <b style={{ color: '#007a70' }}>{selectedEntry.quantity} {selectedEntry.unit}</b>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#fff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Popup Modal (Drug / Doctor / Patient) */}
      {selectedEntity && (
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
          onClick={() => setSelectedEntity(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(560px, 95vw)',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', background: '#f8faf9', borderBottom: '1px solid #dbe6e3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontSize: '15px', color: '#133e36' }}>
                {selectedEntity.type === 'DRUG' && `Schedule Drug: ${selectedEntity.data.drugName}`}
                {selectedEntity.type === 'DOCTOR' && `Prescriber Profile: ${selectedEntity.data.doctorName}`}
                {selectedEntity.type === 'PATIENT' && `Patient Log: ${selectedEntity.data.patientName}`}
              </b>
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                style={{ border: 0, background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#68827c' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedEntity.type === 'DRUG' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '12px 14px', borderRadius: '6px', border: '1px solid #cadcd7' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedEntity.data.drugName}</div>
                    <div style={{ fontSize: '12px', color: '#007a70' }}>Salt: {selectedEntity.data.genericName}</div>
                    <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, marginTop: '2px' }}>Schedule: {selectedEntity.data.scheduleType}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Dispense Events</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedEntity.data.dispenseCount} Times</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Total Units Dispensed</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{selectedEntity.data.unitsDispensed} Units</div>
                    </div>
                  </div>
                </>
              )}

              {selectedEntity.type === 'DOCTOR' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '12px 14px', borderRadius: '6px', border: '1px solid #cadcd7' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedEntity.data.doctorName}</div>
                    <div style={{ fontSize: '12px', color: '#007a70', fontFamily: 'monospace' }}>Medical Reg: {selectedEntity.data.doctorRegNo}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Prescriptions Logged</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedEntity.data.prescriptionsCount} Rx</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Units Dispensed</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{selectedEntity.data.unitsDispensed} Units</div>
                    </div>
                  </div>
                </>
              )}

              {selectedEntity.type === 'PATIENT' && (
                <>
                  <div style={{ background: '#edf7f5', padding: '12px 14px', borderRadius: '6px', border: '1px solid #cadcd7' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#133e36' }}>{selectedEntity.data.patientName}</div>
                    <div style={{ fontSize: '12px', color: '#007a70' }}>📞 {selectedEntity.data.phone}</div>
                    <div style={{ fontSize: '11px', color: '#68827c' }}>📍 {selectedEntity.data.address}</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Invoices Dispensed</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#133e36', marginTop: '2px' }}>{selectedEntity.data.billsCount} Bills</div>
                    </div>
                    <div style={{ background: '#f8faf9', padding: '12px', borderRadius: '6px', border: '1px solid #e2ece9' }}>
                      <div style={{ fontSize: '10.5px', color: '#68827c', textTransform: 'uppercase', fontWeight: 700 }}>Units Received</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#007a70', marginTop: '2px' }}>{selectedEntity.data.unitsDispensed} Units</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2ece9', background: '#f8faf9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedEntity(null)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cadcd7', background: '#fff', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
