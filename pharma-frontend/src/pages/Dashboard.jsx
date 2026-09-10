import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Pill, TrendingUp, AlertTriangle, AlertCircle,
  Package, DollarSign, Clock, Calendar, ChevronRight,
  TrendingDown, Percent, ArrowUpRight, ArrowDownRight,
  CheckCircle2, RefreshCw, ShoppingCart, Truck, ShieldAlert,
  ClipboardList, Send, Check, Plus
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts';
import api, { unwrap } from '../lib/api';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function Dashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30d');
  const [alertTab, setAlertTab] = useState('expired');
  const [movementTab, setMovementTab] = useState('fast');

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const user = JSON.parse(localStorage.getItem('pharma_user') || '{}');
  const userName = user.name || user.username || 'Pharmacist';

  const queryClient = useQueryClient();
  const [quickOrderInput, setQuickOrderInput] = useState('');
  const [quickOrderQty, setQuickOrderQty] = useState('10');
  const [addedItemIds, setAddedItemIds] = useState([]);

  const { data: dashboardData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard-summary', timeRange],
    queryFn: async () => {
      return unwrap(await api.get(`/dashboard?timeRange=${timeRange}`));
    },
    refetchInterval: 30000,
  });

  // Live Order Notes for Dashboard USP section
  const { data: orderNotes = [], refetch: refetchOrderNotes } = useQuery({
    queryKey: ['order-notes-dashboard'],
    queryFn: async () => {
      return unwrap(await api.get('/order-notes'));
    },
  });

  const addOrderNoteMutation = useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/order-notes', payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-notes-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['order-notes'] });
    },
  });

  const toggleOrderNoteMutation = useMutation({
    mutationFn: async ({ id, status }) => unwrap(await api.put(`/order-notes/${id}`, { status })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-notes-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['order-notes'] });
    },
  });

  const handleAddLowStockToOrder = (item, idx) => {
    const defaultQty = Math.max(10, (item.minStock || 10) - (item.quantity || 0));
    addOrderNoteMutation.mutate({
      medicineName: item.drugName,
      quantity: defaultQty,
      unit: item.unit || 'Units',
      distributor: '',
      note: `Stock Alert: current ${item.quantity} ${item.unit || 'units'} vs min ${item.minStock}`,
      status: 'PENDING',
    });
    setAddedItemIds((prev) => [...prev, idx]);
  };

  const handleAddQuickCustomOrder = (e) => {
    e.preventDefault();
    if (!quickOrderInput.trim()) return;
    addOrderNoteMutation.mutate({
      medicineName: quickOrderInput.trim(),
      quantity: Number(quickOrderQty) || 10,
      unit: 'Strips',
      distributor: '',
      note: 'Counter shortage note',
      status: 'PENDING',
    });
    setQuickOrderInput('');
    setQuickOrderQty('10');
  };

  const handleShareDashboardOrdersWhatsApp = () => {
    const pending = orderNotes.filter((n) => n.status === 'PENDING');
    if (pending.length === 0) {
      alert('No pending requirements to share on WhatsApp.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    let msg = `📦 *SSDN PHARMAORA BY OTODDY*\n`;
    msg += `📋 *DAILY MEDICINE REQUIREMENT / SHORTAGE ORDER*\n`;
    msg += `📅 Date: ${todayStr}\n`;
    msg += `------------------------------------\n`;

    pending.forEach((item, idx) => {
      msg += `${idx + 1}. *${item.medicineName}* - ${item.quantity} ${item.unit || 'Units'}`;
      if (item.distributor) {
        msg += ` _(${item.distributor})_`;
      }
      if (item.note) {
        msg += ` [Note: ${item.note}]`;
      }
      msg += `\n`;
    });

    msg += `------------------------------------\n`;
    msg += `Total Items: ${pending.length}\n`;
    msg += `⚡ *Please confirm availability and dispatch schedule.*\n`;
    msg += `_Generated via SSDN PHARMAORA_`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const kpi = dashboardData?.kpi || {
    totalDrugsCount: 0,
    inventoryValue: 0,
    todaySales: 0,
    todayOrdersCount: 0,
    needToCollect: 0,
    needToPay: 0,
    expiringIn30DaysCount: 0,
    expiredCount: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
  };

  const alerts = dashboardData?.alerts || {
    expiredItems: [],
    expiringIn30DaysItems: [],
    lowStockItems: [],
  };

  const financialOverview = dashboardData?.financialOverview || {
    totalSales: 0,
    collected: 0,
    onCredit: 0,
    collectionRatePercent: 0,
  };

  const chartData = dashboardData?.chart?.data || [];
  const drugMovement = dashboardData?.drugMovement || {
    fastMoving: [],
    slowMoving: [],
    highMargin: [],
  };

  return (
    <div className="pos-container" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* PHASE 1: TOP GREETING & CLOCK BAR */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Enterprise Pharmacy ERP
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Welcome back, {userName}! 👋
          </h1>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Here is your live financial snapshot & pharmacy operations overview.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '8px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={16} color="#007a70" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e' }}>
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#115e59', fontFamily: 'monospace' }}>
                <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            style={{
              background: '#fff',
              border: '1px solid #cbd5e1',
              padding: '8px 12px',
              borderRadius: '8px',
              color: '#334155',
              fontWeight: 700,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} color="#007a70" /> Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1600px', width: '100%', margin: '0 auto' }}>

        {/* PHASE 1: KPI CARDS (6 HIGH DENSITY WIDGETS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          
          {/* 1. Total Drugs & Value */}
          <div
            onClick={() => navigate('/products')}
            style={{
              background: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            className="hover:shadow-md hover:-translate-y-0.5"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Inventory Value</div>
              <span style={{ padding: '4px', borderRadius: '6px', background: '#f0fdfa', color: '#007a70' }}><Pill size={16} /></span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '6px' }}>
              {isLoading ? '...' : money(kpi.inventoryValue)}
            </div>
            <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 700, marginTop: '4px' }}>
              📦 {kpi.totalDrugsCount} Active Catalog Drugs
            </div>
          </div>

          {/* 2. Today's Sales */}
          <div
            onClick={() => navigate('/sales')}
            style={{
              background: '#ecfdf5',
              borderRadius: '10px',
              border: '1.5px solid #a7f3d0',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 3px rgba(5,150,105,0.08)'
            }}
            className="hover:shadow-md hover:-translate-y-0.5"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>Today's Sales</div>
              <span style={{ padding: '4px', borderRadius: '6px', background: '#d1fae5', color: '#059669' }}><TrendingUp size={16} /></span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#065f46', marginTop: '6px' }}>
              {isLoading ? '...' : money(kpi.todaySales)}
            </div>
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '4px' }}>
              ⚡ {kpi.todayOrdersCount} Counter Invoices Billed
            </div>
          </div>

          {/* 3. Need to Collect (Receivables) */}
          <div
            onClick={() => navigate('/customers')}
            style={{
              background: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            className="hover:shadow-md hover:-translate-y-0.5"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Need to Collect</div>
              <span style={{ padding: '4px', borderRadius: '6px', background: '#fff1f2', color: '#e11d48' }}><ArrowDownRight size={16} /></span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: kpi.needToCollect > 0 ? '#e11d48' : '#0f172a', marginTop: '6px' }}>
              {isLoading ? '...' : money(kpi.needToCollect)}
            </div>
            <div style={{ fontSize: '11px', color: '#e11d48', fontWeight: 700, marginTop: '4px' }}>
              Customer Ledger Receivables
            </div>
          </div>

          {/* 4. Need to Pay (Payables) */}
          <div
            onClick={() => navigate('/suppliers')}
            style={{
              background: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            className="hover:shadow-md hover:-translate-y-0.5"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Need to Pay</div>
              <span style={{ padding: '4px', borderRadius: '6px', background: '#fef3c7', color: '#d97706' }}><Truck size={16} /></span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: kpi.needToPay > 0 ? '#b45309' : '#0f172a', marginTop: '6px' }}>
              {isLoading ? '...' : money(kpi.needToPay)}
            </div>
            <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, marginTop: '4px' }}>
              Supplier / Distributor Dues
            </div>
          </div>

          {/* 5. Expiring in 30 Days */}
          <div
            onClick={() => setAlertTab('expired')}
            style={{
              background: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            className="hover:shadow-md hover:-translate-y-0.5"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Expiring ≤ 30 Days</div>
              <span style={{ padding: '4px', borderRadius: '6px', background: '#fffbeb', color: '#f59e0b' }}><AlertTriangle size={16} /></span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: kpi.expiringIn30DaysCount > 0 ? '#d97706' : '#0f172a', marginTop: '6px' }}>
              {isLoading ? '...' : `${kpi.expiringIn30DaysCount} Batches`}
            </div>
            <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 700, marginTop: '4px' }}>
              ⚠️ Early Return / Clearance Action
            </div>
          </div>

          {/* 6. Out of Stock */}
          <div
            onClick={() => setAlertTab('lowstock')}
            style={{
              background: '#fff',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
            className="hover:shadow-md hover:-translate-y-0.5"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Critical Stock Alert</div>
              <span style={{ padding: '4px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626' }}><ShieldAlert size={16} /></span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: (kpi.outOfStockCount + kpi.lowStockCount) > 0 ? '#dc2626' : '#0f172a', marginTop: '6px' }}>
              {isLoading ? '...' : `${kpi.outOfStockCount + kpi.lowStockCount} Items`}
            </div>
            <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700, marginTop: '4px' }}>
              🚨 {kpi.outOfStockCount} Out | {kpi.lowStockCount} Low Reorder
            </div>
          </div>

        </div>

        {/* PHASE 2: ACTIONABLE ALERTS & FINANCIAL OVERVIEW (2-COLUMN GRID) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px' }}>
          
          {/* Left Column: Action Required Alerts Table */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} color="#007a70" /> Action Required
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Urgent shelf management and stock reorders</div>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', gap: '2px' }}>
                <button
                  type="button"
                  onClick={() => setAlertTab('expired')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 0,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: alertTab === 'expired' ? '#fff' : 'transparent',
                    color: alertTab === 'expired' ? '#007a70' : '#64748b',
                    boxShadow: alertTab === 'expired' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  Expiring / Expired ({alerts.expiredItems.length + alerts.expiringIn30DaysItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAlertTab('lowstock')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 0,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: alertTab === 'lowstock' ? '#fff' : 'transparent',
                    color: alertTab === 'lowstock' ? '#007a70' : '#64748b',
                    boxShadow: alertTab === 'lowstock' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  Low & Out of Stock ({alerts.lowStockItems.length})
                </button>
              </div>
            </div>

            {/* Alert List Items */}
            <div style={{ overflowX: 'auto' }}>
              {alertTab === 'expired' && (
                <table className="pos-table" style={{ width: '100%', fontSize: '11.5px' }}>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch</th>
                      <th>Expiry</th>
                      <th>MRP</th>
                      <th className="center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.expiredItems.length === 0 && alerts.expiringIn30DaysItems.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>✅ No expired or near-expiry batches detected.</td></tr>
                    ) : (
                      [...alerts.expiredItems, ...alerts.expiringIn30DaysItems].slice(0, 6).map((item, idx) => {
                        const isExp = new Date(item.expiryDate) < new Date();
                        return (
                          <tr key={idx} style={{ background: isExp ? '#fff1f2' : '#fffbeb' }}>
                            <td>
                              <b style={{ color: isExp ? '#e11d48' : '#b45309' }}>{item.drugName}</b>
                              <div style={{ fontSize: '10px', color: '#64748b' }}>{item.generic}</div>
                            </td>
                            <td style={{ fontFamily: 'monospace' }}>{item.batchNumber}</td>
                            <td>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 800,
                                background: isExp ? '#fee2e2' : '#fef3c7',
                                color: isExp ? '#ef4444' : '#d97706'
                              }}>
                                {new Date(item.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                {isExp ? ' EXPIRED' : ' EXPIRING'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600 }}>{money(item.mrp)}</td>
                            <td className="center">
                              <button
                                type="button"
                                onClick={() => navigate('/modules/create-debit-note')}
                                style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '10px', fontWeight: 700, color: '#007a70', cursor: 'pointer' }}
                              >
                                Return
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {alertTab === 'lowstock' && (
                <table className="pos-table" style={{ width: '100%', fontSize: '11.5px' }}>
                  <thead>
                    <tr>
                      <th>Medicine Name</th>
                      <th>Batch</th>
                      <th style={{ textAlign: 'center' }}>Current Stock</th>
                      <th style={{ textAlign: 'center' }}>Min Level</th>
                      <th className="center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.lowStockItems.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>✅ All inventory is well stocked above minimum thresholds.</td></tr>
                    ) : (
                      alerts.lowStockItems.slice(0, 6).map((item, idx) => (
                        <tr key={idx} style={{ background: item.quantity <= 0 ? '#fff1f2' : '#f8fafc' }}>
                          <td>
                            <b style={{ color: item.quantity <= 0 ? '#e11d48' : '#0f172a' }}>{item.drugName}</b>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{item.generic}</div>
                          </td>
                          <td style={{ fontFamily: 'monospace' }}>{item.batchNumber}</td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: item.quantity <= 0 ? '#e11d48' : '#d97706' }}>
                            {item.quantity} {item.unit}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '10.5px', color: '#64748b' }}>
                            {item.minStock}
                          </td>
                          <td className="center">
                            <button
                              type="button"
                              onClick={() => handleAddLowStockToOrder(item, idx)}
                              disabled={addedItemIds.includes(idx)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: addedItemIds.includes(idx) ? '1px solid #a7f3d0' : '1px solid #007a70',
                                background: addedItemIds.includes(idx) ? '#ecfdf5' : '#f0fdf9',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                color: addedItemIds.includes(idx) ? '#059669' : '#007a70',
                                cursor: addedItemIds.includes(idx) ? 'default' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              {addedItemIds.includes(idx) ? (
                                <>
                                  <Check size={11} strokeWidth={3} /> Noted
                                </>
                              ) : (
                                <>
                                  <Plus size={11} strokeWidth={3} /> + Order Note
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Financial Overview & Collections on Sales */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Percent size={16} color="#007a70" /> % Collection on Sales
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Cash drawer efficiency vs customer credit ratio</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#007a70' }}>
                    {financialOverview.collectionRatePercent}%
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700 }}>COLLECTION RATIO</div>
                </div>
              </div>

              {/* Progress Bar Visualizer */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ height: '14px', borderRadius: '999px', background: '#fee2e2', overflow: 'hidden', display: 'flex' }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, financialOverview.collectionRatePercent))}%`,
                      background: 'linear-gradient(90deg, #059669, #10b981)',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
                  <span>Collected ({financialOverview.collectionRatePercent}%)</span>
                  <span>On Credit ({financialOverview.collectionRatePercent > 0 ? (100 - financialOverview.collectionRatePercent).toFixed(1) : 0}%)</span>
                </div>
              </div>

              {/* Summary Numbers Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '16px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Billed</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{money(financialOverview.totalSales)}</div>
                </div>
                <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                  <div style={{ fontSize: '10px', color: '#065f46', textTransform: 'uppercase', fontWeight: 800 }}>Collected</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>{money(financialOverview.collected)}</div>
                </div>
                <div style={{ background: '#fff1f2', padding: '10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '10px', color: '#991b1b', textTransform: 'uppercase', fontWeight: 800 }}>On Credit</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#e11d48', marginTop: '2px' }}>{money(financialOverview.onCredit)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Want detailed counter receipt ledger?</span>
              <button
                type="button"
                onClick={() => navigate('/modules/collection-report')}
                style={{ background: 'transparent', border: 0, color: '#007a70', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Open Collection Report <ChevronRight size={13} />
              </button>
            </div>
          </div>

        </div>

        {/* SSDN PHARMAORA UNIQUE USP: ORDER NOTES & DAILY REQUIREMENTS WITH WHATSAPP DISPATCH */}
        <div style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfdfc 100%)',
          borderRadius: '12px',
          border: '1.5px solid #ccebe6',
          boxShadow: '0 4px 16px rgba(0, 122, 112, 0.05)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f0fdf9', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #007a70 0%, #005a52 100%)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 3px 8px rgba(0,122,112,0.25)'
              }}>
                <ClipboardList size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px' }}>
                    Daily Requirements & Order Notes
                  </h3>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    background: '#edf7f5',
                    color: '#007a70',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid #99f6e4'
                  }}>
                    PharmaOra USP
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                  Note down daily counter requirements & medicine shortages. Share direct purchase orders via WhatsApp to distributors!
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleShareDashboardOrdersWhatsApp}
                disabled={orderNotes.filter((n) => n.status === 'PENDING').length === 0}
                style={{
                  background: orderNotes.filter((n) => n.status === 'PENDING').length > 0 ? '#128c7e' : '#cbd5e1',
                  color: '#fff',
                  border: 0,
                  borderRadius: '8px',
                  padding: '7px 15px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: orderNotes.filter((n) => n.status === 'PENDING').length > 0 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: orderNotes.filter((n) => n.status === 'PENDING').length > 0 ? '0 2px 8px rgba(18,140,126,0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Send size={14} /> Share Order on WhatsApp ({orderNotes.filter((n) => n.status === 'PENDING').length})
              </button>

              <button
                type="button"
                onClick={() => navigate('/order-notes')}
                style={{
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  color: '#007a70',
                  borderRadius: '8px',
                  padding: '7px 13px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View Full Manager <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Quick Add Bar & List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Quick Add Box */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} color="#007a70" /> Quick Add Requirement
              </div>
              <form onSubmit={handleAddQuickCustomOrder} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Type medicine name (e.g. Telma 40mg, Augmentin 625)"
                  value={quickOrderInput}
                  onChange={(e) => setQuickOrderInput(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none',
                    background: '#fff'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={quickOrderQty}
                    onChange={(e) => setQuickOrderQty(e.target.value)}
                    style={{
                      width: '80px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none',
                      background: '#fff'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!quickOrderInput.trim() || addOrderNoteMutation.isPending}
                    style={{
                      flex: 1,
                      background: '#007a70',
                      color: '#fff',
                      border: 0,
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: quickOrderInput.trim() ? 'pointer' : 'not-allowed',
                      opacity: quickOrderInput.trim() ? 1 : 0.6
                    }}
                  >
                    {addOrderNoteMutation.isPending ? 'Adding...' : '+ Add to Today’s Order'}
                  </button>
                </div>
              </form>
              <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '8px' }}>
                💡 Tip: Click <b>"+ Order Note"</b> in the Low Stock table above to 1-click import low items.
              </div>
            </div>

            {/* Active Items Mini Tracker */}
            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px 16px', maxHeight: '200px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  Today's Active List ({orderNotes.length} Items)
                </span>
                <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700 }}>
                  {orderNotes.filter(n => n.status === 'PENDING').length} Pending
                </span>
              </div>

              {orderNotes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8', fontSize: '11.5px' }}>
                  No requirement items logged yet today. Add medicines above or from the Low Stock alerts.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {orderNotes.slice(0, 10).map((noteItem) => {
                    const isOrdered = noteItem.status === 'ORDERED';
                    return (
                      <div
                        key={noteItem.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: isOrdered ? '#f8fafc' : '#f0fdf9',
                          border: isOrdered ? '1px solid #e2e8f0' : '1px solid #ccfbf1'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => toggleOrderNoteMutation.mutate({ id: noteItem.id, status: isOrdered ? 'PENDING' : 'ORDERED' })}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: isOrdered ? '1px solid #10b981' : '1.5px solid #cbd5e1',
                              background: isOrdered ? '#10b981' : '#fff',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0
                            }}
                            title={isOrdered ? 'Mark Pending' : 'Mark Completed'}
                          >
                            {isOrdered && <Check size={10} strokeWidth={3} />}
                          </button>
                          <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: isOrdered ? '#94a3b8' : '#0f172a', textDecoration: isOrdered ? 'line-through' : 'none' }}>
                              {noteItem.medicineName}
                            </span>
                            {noteItem.note && (
                              <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px' }}>
                                ({noteItem.note})
                              </span>
                            )}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: isOrdered ? '#f1f5f9' : '#fef3c7',
                          color: isOrdered ? '#64748b' : '#d97706'
                        }}>
                          {noteItem.quantity} {noteItem.unit || 'Units'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* PHASE 3: ANALYTICS & REVENUE/PROFIT LINE GRAPH */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#007a70" /> Sales & Net Margin Trends
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Revenue performance, COGS recovery, and gross profitability</div>
            </div>

            {/* Time Filtering Tabs */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
              {[
                { key: 'today', label: 'Today' },
                { key: '7d', label: '7 Days' },
                { key: '30d', label: '30 Days' },
                { key: '90d', label: '90 Days' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTimeRange(t.key)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '6px',
                    border: 0,
                    fontSize: '11.5px',
                    fontWeight: timeRange === t.key ? 800 : 600,
                    cursor: 'pointer',
                    background: timeRange === t.key ? '#007a70' : 'transparent',
                    color: timeRange === t.key ? '#fff' : '#64748b',
                    boxShadow: timeRange === t.key ? '0 2px 4px rgba(0,122,112,0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Area/Line Graph */}
          <div style={{ width: '100%', height: '280px', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007a70" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#007a70" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
                />
                <Tooltip
                  formatter={(value, name) => [money(value), name === 'sales' ? 'Revenue' : name === 'profit' ? 'Gross Profit' : 'COGS']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '11.5px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#007a70" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" name="sales" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', fontSize: '11px', color: '#64748b' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#007a70' }} /> Revenue (Sales)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} /> Net Gross Profit
            </span>
          </div>
        </div>

        {/* PHASE 3 (BOTTOM): DRUG MOVEMENT (FAST & SLOW MOVING) */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={17} color="#007a70" /> Drug Movement & Velocity Rankings
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>Top moving pharmaceuticals and velocity distribution</div>
            </div>

            {/* Movement Tabs: Fast & Slow Moving */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setMovementTab('fast')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 0,
                  fontSize: '11.5px',
                  fontWeight: movementTab === 'fast' ? 800 : 600,
                  cursor: 'pointer',
                  background: movementTab === 'fast' ? '#007a70' : 'transparent',
                  color: movementTab === 'fast' ? '#fff' : '#64748b',
                }}
              >
                ⚡ Fast Moving
              </button>
              <button
                type="button"
                onClick={() => setMovementTab('slow')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 0,
                  fontSize: '11.5px',
                  fontWeight: movementTab === 'slow' ? 800 : 600,
                  cursor: 'pointer',
                  background: movementTab === 'slow' ? '#007a70' : 'transparent',
                  color: movementTab === 'slow' ? '#fff' : '#64748b',
                }}
              >
                🐢 Slow Moving
              </button>
            </div>
          </div>

          {/* Compact Top-5 List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {(movementTab === 'fast' ? drugMovement.fastMoving : drugMovement.slowMoving).length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                No movement sales recorded yet for this period.
              </div>
            ) : (
              (movementTab === 'fast' ? drugMovement.fastMoving : drugMovement.slowMoving).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'border-color 0.15s, transform 0.15s'
                  }}
                  className="hover:border-teal-400 hover:bg-teal-50/20"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#edf7f5', color: '#007a70', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '11px' }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <b style={{ fontSize: '12.5px', color: '#0f172a' }}>{item.name}</b>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>{item.generic}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#007a70' }}>
                      {`${item.unitsSold} Units`}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                      {money(item.totalRevenue)} Billed
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
