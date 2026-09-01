import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, FileText, Percent, Boxes, PieChart, BadgeDollarSign,
  WalletCards, ReceiptText, Truck, ArrowLeftRight, Package, Stethoscope,
  Users, Layers, Award, TrendingUp, Search, ArrowRight, Sparkles,
  ShieldCheck, FileSpreadsheet, Clock, ChevronRight
} from 'lucide-react';

const reportCategories = [
  {
    id: 'advanced',
    title: 'Advanced & Regulatory Reports',
    description: 'Financial collections, payment reconciliations, and tax returns filing.',
    icon: FileText,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    color: '#059669',
    bgColor: '#ecfdf5',
    reports: [
      {
        title: 'Collection Report',
        desc: 'Daily payment modes (Cash, UPI, Card, NetBanking) & live settlements',
        to: '/modules/collection-report',
        icon: WalletCards,
        tag: 'Essential',
      },
      {
        title: 'GST Returns (GSTR-1 / GSTR-3B)',
        desc: 'B2B & B2C tax breakdowns, HSN summaries, and outward supply invoices',
        to: '/modules/gst-returns',
        icon: FileSpreadsheet,
        tag: 'Tax',
      },
    ],
  },
  {
    id: 'margin',
    title: 'Margin & Profitability',
    description: 'Track margins, product profits, cost prices vs selling prices.',
    icon: Percent,
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    color: '#007a70',
    bgColor: '#edf7f5',
    reports: [
      {
        title: 'Item wise Margin',
        desc: 'Catalog profitability, COGS vs gross revenue margins (%)',
        to: '/modules/item-wise-margin',
        icon: Percent,
      },
      {
        title: 'Bill-Item wise Margin',
        desc: 'Transaction level margin analysis across customer bills',
        to: '/modules/bill-item-wise-margin',
        icon: ReceiptText,
      },
      {
        title: 'Purchase Analysis Report',
        desc: 'Distributor spend analysis, volume rates, and paid vs due balances',
        to: '/modules/purchase-analysis',
        icon: Truck,
      },
    ],
  },
  {
    id: 'stock',
    title: 'Stock & Inventory Reports',
    description: 'Monitor stock levels, expiry dates, stagnant items, and audits.',
    icon: Boxes,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    reports: [
      {
        title: 'Item-Batch wise Stock',
        desc: 'Real-time inventory quantities, batch numbers, and stock valuation (₹)',
        to: '/modules/item-batch-wise-stock',
        icon: Layers,
        tag: 'Realtime',
      },
      {
        title: 'Expiry Report',
        desc: 'Near-expiry batches (≤30d, ≤90d) and expired drugs tracking',
        to: '/modules/expiry-report',
        icon: Clock,
        tag: 'Alerts',
      },
      {
        title: 'Non-Moving Items',
        desc: 'Dead stock identification with 60+ days zero sales velocity',
        to: '/modules/non-moving-items',
        icon: Package,
      },
      {
        title: 'Inventory Ageing',
        desc: 'Holding duration brackets (0-30d, 31-60d, 61-90d, 90+d) analysis',
        to: '/modules/inventory-ageing',
        icon: Clock,
        tag: 'NEW',
      },
      {
        title: 'Item Wise Stock Movement',
        desc: 'Inward purchase flow vs outward dispensing movement',
        to: '/modules/item-wise-stock-movement',
        icon: ArrowLeftRight,
      },
      {
        title: 'Schedule Drug Reports (H, H1, X, NRX)',
        desc: 'Controlled drug registers with doctor prescriptions & patient details',
        to: '/modules/schedule-drug-reports',
        icon: ShieldCheck,
        tag: 'Compliant',
      },
    ],
  },
  {
    id: 'entelligent',
    title: 'eNtelligent Business Intelligence',
    description: 'High-level analytics, turnover overview, customer and supplier rankings.',
    icon: PieChart,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    color: '#d97706',
    bgColor: '#fffbeb',
    reports: [
      {
        title: 'Monthly Sales Overview',
        desc: 'Month-on-month revenue turnover, invoice counts, and collection ratios',
        to: '/modules/monthly-sales-overview',
        icon: TrendingUp,
      },
      {
        title: 'Top Selling Items',
        desc: 'High velocity best-sellers ranked by unit volume and revenue',
        to: '/modules/top-selling-items',
        icon: Award,
        tag: 'Popular',
      },
      {
        title: 'Top Customers',
        desc: 'Customer lifetime spend (LTV) and purchase frequency leaderboards',
        to: '/modules/top-customers',
        icon: Users,
      },
      {
        title: 'Top Distributors',
        desc: 'Key supplier procurement volumes and outstanding ledger positions',
        to: '/modules/top-distributors',
        icon: Truck,
      },
    ],
  },
  {
    id: 'accounting',
    title: 'Financial Accounting & Ledger',
    description: 'Executive balance sheets, receivables, payables, and P&L summaries.',
    icon: BadgeDollarSign,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    reports: [
      {
        title: 'Ledger Balances & P&L Statement',
        desc: 'Accounts Receivable, Supplier Payables, Net Gross Profit, and Tax ITC',
        to: '/modules/accounting-reports',
        icon: WalletCards,
        tag: 'Executive',
      },
    ],
  },
  {
    id: 'operational',
    title: 'Practice & Operational Audits',
    description: 'Doctor prescription analytics, staff operations, and sales summaries.',
    icon: Stethoscope,
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    color: '#e11d48',
    bgColor: '#fff1f2',
    reports: [
      {
        title: 'Doctor - Item Summary',
        desc: 'Prescription counts, medical registration numbers, and doctor referral value',
        to: '/modules/doctor-item-summary',
        icon: Stethoscope,
      },
      {
        title: 'Staff Wise Activity Summary',
        desc: 'Billing operator activity logs and system access records',
        to: '/modules/staff-wise-activity',
        icon: Users,
        tag: 'NEW',
      },
      {
        title: 'Sales Summary Report',
        desc: 'Chronological sales register with settlement and status audit',
        to: '/modules/sales-summary-report',
        icon: ReceiptText,
      },
    ],
  },
];

export default function ReportsHub() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredCategories = reportCategories
    .map((cat) => {
      const filteredReports = cat.reports.filter((r) => {
        const matchesSearch =
          !searchTerm ||
          r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.desc.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || selectedCategory === cat.id;
        return matchesSearch && matchesCategory;
      });
      return { ...cat, reports: filteredReports };
    })
    .filter((cat) => cat.reports.length > 0);

  return (
    <div className="pos-container" style={{ background: '#f8faf9', minHeight: '100vh' }}>
      {/* Top Banner Header */}
      <div className="pos-top-bar" style={{ background: '#fff', borderBottom: '1px solid #dbe6e3', padding: '16px 24px' }}>
        <div className="pos-top-left" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#edf7f5', display: 'grid', placeItems: 'center', color: '#007a70' }}>
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#133e36', margin: 0 }}>
                Reports & Analytics Hub
              </h1>
              <p style={{ margin: 0, fontSize: '12px', color: '#68827c', fontWeight: 500 }}>
                Centralized intelligence center for sales, margins, inventory, taxes, and accounting.
              </p>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ position: 'relative', width: '360px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#7a928c' }} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search all 20+ reports by name or keyword..."
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '36px',
              paddingRight: '12px',
              borderRadius: '8px',
              border: '1.5px solid #cadcd7',
              fontSize: '12px',
              background: '#fcfdfd',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          />
        </div>
      </div>

      <div className="pos-main-body" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Quick Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid',
              borderColor: selectedCategory === 'all' ? '#007a70' : '#dbe6e3',
              background: selectedCategory === 'all' ? '#007a70' : '#fff',
              color: selectedCategory === 'all' ? '#fff' : '#475569',
              boxShadow: selectedCategory === 'all' ? '0 2px 6px rgba(0,122,112,0.25)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            All Reports ({reportCategories.reduce((acc, c) => acc + c.reports.length, 0)})
          </button>

          {reportCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: isSelected ? cat.color : '#dbe6e3',
                  background: isSelected ? cat.color : '#fff',
                  color: isSelected ? '#fff' : '#475569',
                  boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                {cat.title} ({cat.reports.length})
              </button>
            );
          })}
        </div>

        {/* Categories & Report Cards Grid */}
        {filteredCategories.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', border: '1px solid #dbe6e3' }}>
            <Search size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>No matching reports found</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Try adjusting your search terms or filter selection.</p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Category Section Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: cat.bgColor, display: 'grid', placeItems: 'center', color: cat.color }}>
                    <CatIcon size={16} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {cat.title}
                    </h2>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>{cat.description}</span>
                  </div>
                </div>

                {/* Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {cat.reports.map((report, idx) => {
                    const ReportIcon = report.icon;
                    return (
                      <div
                        key={idx}
                        onClick={() => navigate(report.to)}
                        style={{
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = cat.color;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: cat.bgColor, display: 'grid', placeItems: 'center', color: cat.color, flexShrink: 0 }}>
                              <ReportIcon size={18} />
                            </div>
                            <div>
                              <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
                                {report.title}
                              </h3>
                              {report.tag && (
                                <span style={{
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: report.tag === 'NEW' ? '#fef2f2' : cat.bgColor,
                                  color: report.tag === 'NEW' ? '#ef4444' : cat.color,
                                  border: `1px solid ${report.tag === 'NEW' ? '#fecaca' : '#cadcd7'}`
                                }}>
                                  {report.tag}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={18} color="#94a3b8" />
                        </div>

                        <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0, lineHeight: 1.45 }}>
                          {report.desc}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: cat.color, marginTop: '2px' }}>
                          <span>Open Report</span>
                          <ArrowRight size={13} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
