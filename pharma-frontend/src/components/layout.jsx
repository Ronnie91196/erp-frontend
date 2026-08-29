import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Pill,
  Users,
  Package,
  ReceiptText,
  ShoppingCart,
  Truck,
  Search,
  Bell,
  ChevronDown,
  CircleDot,
  LogOut,
  Menu,
  X,
  FileText,
  ArrowLeftRight,
  BadgeDollarSign,
  NotebookPen,
  Trash2,
  WalletCards,
  Plus,
} from 'lucide-react';

const menuGroups = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    standalone: true,
    items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
  },
  {
    key: 'drugs',
    label: 'Drugs',
    icon: Pill,
    items: [
      { label: 'Drug List', to: '/products', icon: Package },
      { label: 'Billing Notes', to: '/modules/billing-notes', icon: NotebookPen },
      { label: 'Trash', to: '/modules/drugs-trash', icon: Trash2 },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    items: [
      { label: 'Customer List', to: '/customers', icon: Users },
      { label: 'Ledger', to: '/customers/ledger', icon: WalletCards },
      { label: 'Trash', to: '/modules/customers-trash', icon: Trash2 },
    ],
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    icon: Truck,
    items: [
      { label: 'Supplier List', to: '/suppliers', icon: Truck },
      { label: 'Ledger', to: '/suppliers/ledger', icon: BadgeDollarSign },
      { label: 'Trash', to: '/modules/suppliers-trash', icon: Trash2 },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    items: [
      { label: 'Sales List', to: '/sales', icon: ReceiptText },
      { label: 'Add Sale', to: '/sales/add', icon: Plus },
      { label: 'Returned', to: '/modules/sales-returned', icon: ArrowLeftRight },
      { label: 'Drafts', to: '/modules/sales-drafts', icon: FileText },
    ],
  },
  {
    key: 'purchases',
    label: 'Purchases',
    icon: BadgeDollarSign,
    items: [
      { label: 'Purchase List', to: '/purchases', icon: ReceiptText },
      { label: 'Purchase Orders', to: '/modules/purchase-orders', icon: FileText },
      { label: 'Purchase Returns', to: '/modules/create-debit-note', icon: ArrowLeftRight },
      { label: 'Add Purchase', to: '/purchases/add', icon: Plus },
      { label: 'Restocks', to: '/modules/restocks', icon: Truck },
      { label: 'Trash', to: '/modules/purchases-trash', icon: Trash2 },
      { label: 'Drafts', to: '/modules/purchase-drafts', icon: FileText },
    ],
  },
  {
    key: 'bulk-invoicing',
    label: 'Bulk Invoicing',
    icon: FileText,
    items: [{ label: 'Sales Invoice', to: '/modules/sales-invoice', icon: ReceiptText }],
  },
  {
    key: 'advanced-reports',
    label: 'Advanced Reports',
    icon: NotebookPen,
    items: [
      { label: 'Sales Report', to: '/modules/advanced-sales-report', icon: ReceiptText },
      { label: 'Collection Report', to: '/modules/collection-report', icon: WalletCards },
      { label: 'GST Returns', to: '/modules/gst-returns', icon: FileText },
      { label: 'Ayushman Sales', to: '/modules/ayushman-sales', icon: BadgeDollarSign },
    ],
  },
  {
    key: 'reports-old',
    label: 'Reports (old)',
    icon: FileText,
    items: [
      { label: 'NRX', to: '/modules/nrx', icon: FileText },
      { label: 'Sales Report', to: '/modules/old-sales-report', icon: ReceiptText },
      { label: 'Purchases Report', to: '/modules/purchases-report', icon: ReceiptText },
      { label: 'Schedule Drug Reports', to: '/modules/schedule-drug-reports', icon: NotebookPen },
    ],
  },
];

export default function Layout({ children }) {
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState([]);
  const user = JSON.parse(localStorage.getItem('pharma_user') || 'null');

  const isPurchaseAddRoute = location.pathname === '/purchases/add' || location.pathname.startsWith('/purchases/add/') || location.pathname === '/modules/create-debit-note';

  React.useEffect(() => {
    if (isPurchaseAddRoute) {
      setOpen(false);
    }
  }, [isPurchaseAddRoute]);

  const logout = () => {
    localStorage.clear();
    nav('/login');
  };

  const toggleMenu = (key) => {
    setExpandedMenus((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  return (
    <div className="app-shell">
      <aside className={isPurchaseAddRoute ? 'sidebar compact' : open ? 'sidebar open' : 'sidebar'}>
        <div className="brand-wrap">
          <div className="brand-badge">M</div>
          <div className="brand-copy">
            <b>Mediflux</b>
            <small>ERP</small>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map(({ key, label, icon: Icon, items, standalone }) => {
            const isOpen = expandedMenus.includes(key);

            if (standalone) {
              return (
                <NavLink
                  key={key}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `nav-link standalone-link ${isActive ? 'active' : ''}`}
                  to={items[0].to}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              );
            }

            return (
              <div className="nav-section" key={key}>
                <button type="button" className="section-toggle" onClick={() => toggleMenu(key)}>
                  <span className="section-left">
                    <Icon size={16} />
                    <span>{label}</span>
                  </span>
                  <ChevronDown className={isOpen ? 'chevron open' : 'chevron'} size={15} />
                </button>

                <div className={isOpen ? 'accordion open' : 'accordion'}>
                  <div className="accordion-inner">
                    {items.map(({ label: itemLabel, to, icon: ItemIcon }) => (
                      <NavLink
                        key={to + itemLabel}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        to={to}
                      >
                        <span className="nav-dot"><CircleDot size={8} /></span>
                        <ItemIcon size={14} />
                        <span>{itemLabel}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-mini">
            <div className="profile-avatar">{user?.name?.[0] || 'U'}</div>
            <div>
              <b>{user?.name || 'User Name'}</b>
              <small>{user?.role?.name || 'Manager'}</small>
            </div>
          </div>
          <button type="button" className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className={isPurchaseAddRoute ? 'main-shell compact-shell' : 'main-shell'}>
        <header className="topbar">
          <button type="button" className="menu-button" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>

          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Global Search" />
          </div>

          <div className="header-actions">
            <button type="button" className="icon-btn" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="user-pill">
              <div className="mini-avatar">{user?.name?.[0] || 'U'}</div>
              <div className="user-meta">
                <strong>{user?.name || 'User Name'}</strong>
                <small>{user?.role?.name || 'Manager'}</small>
              </div>
              <ChevronDown size={16} />
            </div>
          </div>
        </header>

        <div className="content-shell">{children}</div>
      </main>
    </div>
  );
}

