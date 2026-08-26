import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, ShoppingBag, WalletCards, PackageCheck } from 'lucide-react';
import api, { unwrap } from '../lib/api';
import { Card, Table, money, Badge } from '../components/ui';

export default function Dashboard() {
  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => unwrap(await api.get('/dashboard')),
  });

  if (q.isLoading) return <div className="loading">Loading dashboard…</div>;
  if (q.isError) return <div className="alert errorBox">{q.error?.response?.data?.message || q.error.message}</div>;

  const d = q.data || {};

  return (
    <div className="dashboardPage">
      <div className="pageIntro">
        <div className="pageTitleWrap">
          <span className="eyebrow">Today</span>
          <h2>Operations dashboard</h2>
          <p className="muted">A live view of sales, purchases, collections and inventory health.</p>
        </div>
        <Badge tone="success">Live</Badge>
      </div>

      <div className="kpis">
        <Kpi icon={DollarSign} label="Sales today" value={money(d.today?.sales)} meta={`${d.today?.salesCount || 0} invoices`} />
        <Kpi icon={ShoppingBag} label="Purchases today" value={money(d.today?.purchases)} meta={`${d.today?.purchaseCount || 0} receipts`} />
        <Kpi icon={WalletCards} label="Collections" value={money(d.today?.collections)} meta="Sale payments" />
        <Kpi icon={PackageCheck} label="Stock value" value={money(d.inventory?.stockValue)} meta={`${d.inventory?.lowStockCount || 0} low stock`} />
      </div>

      <div className="grid2">
        <Card title="Outstanding">
          <div className="metricBig">{money(d.outstanding?.customerDues)}</div>
          <span className="muted">Customer receivables</span>
        </Card>
        <Card title="Expiry watch">
          <div className="metricBig">{d.expiry?.expiringCount || 0}</div>
          <span className="muted">Batches requiring attention</span>
        </Card>
      </div>

      <div className="grid2">
        <Card title="Recent sales">
          <Table
            columns={[
              { key: 'invoiceNumber', label: 'Invoice' },
              { key: 'customer', label: 'Customer', render: (r) => r.customer?.name || 'Walk-in' },
              { key: 'totalAmount', label: 'Amount', render: (r) => money(r.totalAmount) },
              { key: 'paymentStatus', label: 'Status', render: (r) => <Badge tone={r.paymentStatus === 'PAID' ? 'success' : 'warning'}>{r.paymentStatus}</Badge> },
            ]}
            rows={d.recent?.sales || []}
          />
        </Card>

        <Card title="Recent purchases">
          <Table
            columns={[
              { key: 'invoiceNumber', label: 'Invoice' },
              { key: 'supplier', label: 'Supplier', render: (r) => r.supplier?.name },
              { key: 'totalAmount', label: 'Amount', render: (r) => money(r.totalAmount) },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={r.status === 'RECEIVED' ? 'success' : 'warning'}>{r.status}</Badge> },
            ]}
            rows={d.recent?.purchases || []}
          />
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, meta }) {
  return (
    <div className="kpi">
      <div className="iconBox"><Icon size={19} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{meta}</small>
    </div>
  );
}
