import React from 'react';
import { Pill } from 'lucide-react';
import TrashDataTable from '../../components/TrashDataTable';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function DrugsTrash() {
  const getColumns = () => [
    'Drug Name',
    'Category / Form',
    'Rack / HSN',
    'Batches',
    'Deleted On',
    'Actions',
  ];

  const getRowData = (item) => [
    <div>
      <strong style={{ color: '#133e36', fontSize: '12px' }}>{item.name}</strong>
      {item.genericName && (
        <div style={{ fontSize: '10.5px', color: '#68827c' }}>{item.genericName}</div>
      )}
    </div>,
    <div>
      <span style={{ fontSize: '11px', color: '#335049', fontWeight: 600 }}>
        {item.dosageForm || 'Tablet'}
      </span>
      {item.category?.name && (
        <div style={{ fontSize: '10px', color: '#889f9a' }}>{item.category.name}</div>
      )}
    </div>,
    <div style={{ fontSize: '11px', color: '#555' }}>
      <div>Rack: {item.rack || '—'}</div>
      <div style={{ fontSize: '10px', color: '#889f9a' }}>HSN: {item.hsnCode || '—'}</div>
    </div>,
    <div style={{ fontSize: '11px', color: '#007a70', fontWeight: 700 }}>
      {item.batches?.length || 0} batch(es)
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
      entity="drugs"
      entityLabel="Drugs & Medicines"
      icon={Pill}
      getColumns={getColumns}
      getRowData={getRowData}
    />
  );
}
