import React from 'react';
import { ReceiptText } from 'lucide-react';
import TrashDataTable from '../../components/TrashDataTable';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function PurchasesTrash() {
  const getColumns = () => [
    'Invoice #',
    'Supplier Name',
    'Items',
    'Total Amount',
    'Deleted On',
    'Actions',
  ];

  const getRowData = (item) => [
    <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#007a70' }}>
      {item.invoiceNumber || item.id}
    </div>,
    <div>
      <b style={{ color: '#133e36', fontSize: '12px' }}>{item.supplier?.name || '—'}</b>
      {item.supplier?.phone && item.supplier?.phone !== '—' && (
        <span style={{ fontSize: '10.5px', color: '#777', marginLeft: '6px' }}>
          ({item.supplier.phone})
        </span>
      )}
    </div>,
    <div style={{ fontSize: '11px', color: '#007a70', fontWeight: 700 }}>
      {item.items?.length || 0} item(s)
    </div>,
    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#133e36' }}>
      {money(item.totalAmount || 0)}
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
      entity="purchases"
      entityLabel="Inward Purchase"
      icon={ReceiptText}
      getColumns={getColumns}
      getRowData={getRowData}
    />
  );
}
