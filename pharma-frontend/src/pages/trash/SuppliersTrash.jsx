import React from 'react';
import { Truck } from 'lucide-react';
import TrashDataTable from '../../components/TrashDataTable';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function SuppliersTrash() {
  const getColumns = () => [
    'Supplier Name',
    'Phone & Email',
    'City / DL No.',
    'Opening Balance',
    'Deleted On',
    'Actions',
  ];

  const getRowData = (item) => [
    <div>
      <strong style={{ color: '#133e36', fontSize: '12px' }}>{item.name}</strong>
      {item.contactPerson && (
        <div style={{ fontSize: '10.5px', color: '#68827c' }}>Attn: {item.contactPerson}</div>
      )}
      {item.gstin && (
        <div style={{ fontSize: '9.5px', color: '#889f9a' }}>GSTIN: {item.gstin}</div>
      )}
    </div>,
    <div style={{ fontSize: '11px', color: '#444' }}>
      <div>{item.phone || '—'}</div>
      {item.email && <div style={{ fontSize: '10px', color: '#68827c' }}>{item.email}</div>}
    </div>,
    <div style={{ fontSize: '11px', color: '#555' }}>
      <div>{item.city || '—'}</div>
      {item.drugLicenseNo && (
        <div style={{ fontSize: '9.5px', color: '#889f9a' }}>DL: {item.drugLicenseNo}</div>
      )}
    </div>,
    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#133e36' }}>
      {money(item.openingBalance || 0)}
    </div>,
    <div style={{ fontSize: '11px', color: '#555' }}>
      <div>{item.deletedAt ? new Date(item.deletedAt).toLocaleDateString('en-IN') : '—'}</div>
      {item.deletedAt && (
        <div style={{ fontSize: '9.5px', color: '#889f9a' }}>
          {new Date(item.deletedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>
      )}
    </div>,
  ];

  return (
    <TrashDataTable
      entity="suppliers"
      entityLabel="Supplier"
      icon={Truck}
      getColumns={getColumns}
      getRowData={getRowData}
    />
  );
}
