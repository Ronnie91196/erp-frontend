import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
    key: 'home',
    label: 'Home',
    icon: Home,
    items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
  },
  {
    key: 'drugs',
    label: 'Drugs',
    icon: Pill,
    items: [
      { label: 'Drug List', to: '/products', icon: Package },
      { label: 'Billing Notes', to: '/products', icon: NotebookPen },
      { label: 'Create Debit Note', to: '/products', icon: FileText },
      { label: 'Trash', to: '/products', icon: Trash2 },
    ],
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: Users,
    items: [
      { label: 'Customer List', to: '/customers', icon: Users },
      { label: 'Ledger', to: '/customers/ledger', icon: WalletCards },
      { label: 'Trash', to: '/customers', icon: Trash2 },
    ],
  },
  {
    key: 'suppliers',
    label: 'Suppliers',
    icon: Truck,
    items: [
      { label: 'Supplier List', to: '/suppliers', icon: Truck },
      { label: 'Ledger', to: '/suppliers/ledger', icon: BadgeDollarSign },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    items: [
      { label: 'Sales List', to: '/sales', icon: ReceiptText },
      { label: 'Add Sale', to: '/sales', icon: Plus },
      { label: 'Returned', to: '/sales', icon: ArrowLeftRight },
      { label: 'Drafts', to: '/sales', icon: FileText },
    ],
  },
  {
    key: 'purchases',
    label: 'Purchases',
    icon: BadgeDollarSign,
    items: [
      { label: 'Purchase List', to: '/purchases', icon: ReceiptText },
      { label: 'Purchase Orders', to: '/purchases', icon: FileText },
      { label: 'Add Purchase', to: '/purchases', icon: Plus },
      { label: 'Restocks', to: '/purchases', icon: Truck },
    ],
  },
];

export default function Layout({ children }) {
  const nav = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState('home');
  const user = JSON.parse(localStorage.getItem('pharma_user') || 'null');

  const logout = () => {
    localStorage.clear();
    nav('/login');
  };

  const toggleMenu = (key) => {
    setOpenMenu((current) => (current === key ? '' : key));
  };

  return (
    <div className="app-shell">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
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
          {menuGroups.map(({ key, label, icon: Icon, items }) => {
            const isOpen = openMenu === key;

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

      <main className="main-shell">
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

