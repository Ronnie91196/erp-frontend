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
  ChevronLeft,
  ChevronRight,
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
  Stethoscope,
  Percent,
  Layers,
  PieChart,
  Award,
  TrendingUp,
  BarChart3,
  Settings,
  RefreshCw,
  UserCheck,
  Shield,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  CalendarCheck,
  Calendar,
  Phone,
  MessageSquare,
  Check,
} from 'lucide-react';
import api, { unwrap } from '../lib/api';

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
    key: 'doctors',
    label: 'Doctors',
    icon: Stethoscope,
    items: [
      { label: 'Doctor List', to: '/doctors', icon: Stethoscope },
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
      { label: 'Refill Reminders', to: '/sales/refill-reminders', icon: CalendarCheck },
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
      { label: 'Purchase Returns', to: '/modules/purchase-returns', icon: ArrowLeftRight },
      { label: 'Add Purchase', to: '/purchases/add', icon: Plus },
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
    key: 'reports-hub',
    label: 'Reports Hub',
    icon: BarChart3,
    standalone: true,
    items: [{ label: 'Reports Hub', to: '/modules/reports-hub', icon: BarChart3 }],
  },
];

export default function Layout({ children }) {
  const nav = useNavigate();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [expandedMenus, setExpandedMenus] = React.useState([]);
  const user = JSON.parse(localStorage.getItem('pharma_user') || 'null');

  // Global Search State
  const [globalSearchInput, setGlobalSearchInput] = React.useState('');
  const [globalSearchResults, setGlobalSearchResults] = React.useState(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const searchContainerRef = React.useRef(null);
  const debounceTimerRef = React.useRef(null);

  // Profile & Role Switcher Dropdown State
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const profileDropdownRef = React.useRef(null);

  // Notifications State & Dropdown
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [readNotificationIds, setReadNotificationIds] = React.useState([]);
  const notificationDropdownRef = React.useRef(null);

  // Live notifications query
  const [notificationsData, setNotificationsData] = React.useState([]);
  const [isNotifLoading, setIsNotifLoading] = React.useState(false);

  const fetchLiveNotifications = React.useCallback(async () => {
    try {
      setIsNotifLoading(true);
      const res = unwrap(await api.get('/notifications'));
      const items = res?.notifications || [];
      setNotificationsData(items);
      // Synchronize already-read IDs from backend
      const readIds = items.filter((n) => n.isRead).map((n) => n.id);
      setReadNotificationIds((prev) => Array.from(new Set([...prev, ...readIds])));
    } catch (e) {
      console.warn('Notifications fetch warning:', e);
    } finally {
      setIsNotifLoading(false);
    }
  }, []);

  const handleMarkNotificationRead = async (item) => {
    setReadNotificationIds((prev) => [...prev, item.id]);
    try {
      await api.post('/notifications/read', {
        referenceId: item.referenceId || item.id,
        type: item.type,
        title: item.title,
        message: item.message,
      });
    } catch (err) {
      console.warn('Could not persist read status:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const allIds = notificationsData.map((n) => n.referenceId || n.id);
    setReadNotificationIds(allIds);
    try {
      await api.post('/notifications/read-all', {
        referenceIds: allIds,
      });
    } catch (err) {
      console.warn('Could not persist mark-all-read:', err);
    }
  };

  React.useEffect(() => {
    fetchLiveNotifications();
    const interval = setInterval(fetchLiveNotifications, 45000); // refresh every 45s
    return () => clearInterval(interval);
  }, [fetchLiveNotifications]);

  const unreadCount = React.useMemo(() => {
    return notificationsData.filter((n) => !readNotificationIds.includes(n.id)).length;
  }, [notificationsData, readNotificationIds]);

  // Reminders Widget State
  const [isRemindersOpen, setIsRemindersOpen] = React.useState(false);
  const [remindersData, setRemindersData] = React.useState([]);
  const [reminderFilterTab, setReminderFilterTab] = React.useState('TODAY'); // 'TODAY', 'UPCOMING', 'ALL'
  const [reminderStats, setReminderStats] = React.useState({ todayCount: 0, totalPendingCount: 0 });
  const [isRemindersLoading, setIsRemindersLoading] = React.useState(false);
  const remindersDropdownRef = React.useRef(null);

  const fetchReminders = React.useCallback(async () => {
    try {
      setIsRemindersLoading(true);
      const res = unwrap(await api.get('/reminders', { params: { filter: reminderFilterTab } }));
      setRemindersData(res?.reminders || []);
      if (res?.stats) {
        setReminderStats(res.stats);
      }
    } catch (e) {
      console.warn('Reminders fetch warning:', e);
    } finally {
      setIsRemindersLoading(false);
    }
  }, [reminderFilterTab]);

  React.useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const handleUpdateReminderStatus = async (id, status) => {
    try {
      await api.patch(`/reminders/${id}/status`, { status });
      fetchReminders();
    } catch (err) {
      console.warn('Failed to update reminder status:', err);
    }
  };

  const isPurchaseAddRoute = location.pathname === '/purchases/add' || location.pathname.startsWith('/purchases/add/') || location.pathname === '/modules/create-debit-note' || location.pathname === '/sales/add' || location.pathname.startsWith('/sales/add/');

  React.useEffect(() => {
    if (isPurchaseAddRoute) {
      setIsCollapsed(true);
      setOpen(false);
    } else {
      setIsCollapsed(false);
    }
  }, [isPurchaseAddRoute]);

  // Click outside to close global search dropdown, profile dropdown, notifications dropdown, and reminders dropdown
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (remindersDropdownRef.current && !remindersDropdownRef.current.contains(event.target)) {
        setIsRemindersOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 500ms Debounced Global Search API query
  React.useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = globalSearchInput.trim();
    if (!trimmed) {
      setGlobalSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsSearchOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = unwrap(await api.get('/search', { params: { q: trimmed } }));
        setGlobalSearchResults(res);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [globalSearchInput]);

  const handleSelectResult = (path) => {
    setIsSearchOpen(false);
    setGlobalSearchInput('');
    nav(path);
  };

  const logout = () => {
    localStorage.clear();
    nav('/login');
  };

  const toggleMenu = (key) => {
    setExpandedMenus((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  const sidebarClass = isCollapsed ? 'sidebar hidden-sidebar' : open ? 'sidebar open' : 'sidebar';
  const mainClass = isCollapsed ? 'main-shell full-shell' : 'main-shell';

  const hasResults = globalSearchResults && (
    (globalSearchResults.products?.length || 0) > 0 ||
    (globalSearchResults.customers?.length || 0) > 0 ||
    (globalSearchResults.suppliers?.length || 0) > 0 ||
    (globalSearchResults.sales?.length || 0) > 0 ||
    (globalSearchResults.purchases?.length || 0) > 0
  );

  return (
    <div className="app-shell">
      {/* Floating Toggle Button on the screen edge */}
      <button
        type="button"
        className={`sidebar-floating-toggle ${isCollapsed ? 'collapsed' : 'expanded'}`}
        onClick={() => setIsCollapsed((prev) => !prev)}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <aside className={sidebarClass}>
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

        <div className="sidebar-footer" ref={profileDropdownRef} style={{ position: 'relative' }}>
          {/* Clickable Profile Card */}
          <div
            className="profile-mini"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            style={{
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              background: isProfileOpen ? 'rgba(255, 255, 255, 0.16)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
              border: isProfileOpen ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
            }}
            title="Click to switch profile or view account settings"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="profile-avatar">{user?.name?.[0] || 'P'}</div>
              <div>
                <b>{user?.name || 'Pharmacy Admin'}</b>
                <small style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {user?.role?.name || user?.role || 'ADMIN'}
                </small>
              </div>
            </div>
            <ChevronDown
              size={15}
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>

          {/* Floating Dropdown Popover Menu */}
          {isProfileOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: '6px',
                right: '6px',
                background: '#ffffff',
                borderRadius: '10px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
                border: '1px solid #d0e2dd',
                zIndex: 999999,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease',
              }}
            >
              {/* Header with active user info */}
              <div style={{ padding: '12px 14px', background: '#f4faf8', borderBottom: '1px solid #e5f0ec' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Signed in as
                </div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#133e36', marginTop: '2px' }}>
                  {user?.name || 'Pharmacy Admin'}
                </div>
                <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={11} color="#007a70" /> {user?.role?.name || user?.role || 'Administrator'}
                </div>
              </div>

              {/* Action List */}
              <div style={{ padding: '6px' }}>
                {/* Switch to Staff Profile */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...user, role: { name: 'STAFF' } };
                    localStorage.setItem('pharma_user', JSON.stringify(updated));
                    setIsProfileOpen(false);
                    window.location.reload();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 0,
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#335049',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eef8f5';
                    e.currentTarget.style.color = '#007a70';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#335049';
                  }}
                >
                  <RefreshCw size={14} color="#007a70" />
                  <span>Switch to Staff Profile</span>
                </button>

                {/* Switch to Cashier Profile */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...user, role: { name: 'CASHIER' } };
                    localStorage.setItem('pharma_user', JSON.stringify(updated));
                    setIsProfileOpen(false);
                    window.location.reload();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 0,
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#335049',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eef8f5';
                    e.currentTarget.style.color = '#007a70';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#335049';
                  }}
                >
                  <UserCheck size={14} color="#007a70" />
                  <span>Switch to Cashier Profile</span>
                </button>

                {/* Switch back to Admin Profile if in Staff/Cashier mode */}
                {(user?.role?.name === 'STAFF' || user?.role?.name === 'CASHIER' || user?.role === 'STAFF' || user?.role === 'CASHIER') && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...user, role: { name: 'ADMIN' } };
                      localStorage.setItem('pharma_user', JSON.stringify(updated));
                      setIsProfileOpen(false);
                      window.location.reload();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: '8px 10px',
                      background: 'transparent',
                      border: 0,
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: '#007a70',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#eef8f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Shield size={14} color="#007a70" />
                    <span>Switch to Admin Profile</span>
                  </button>
                )}

                {/* Divider */}
                <div style={{ height: '1px', background: '#edf4f2', margin: '4px 0' }} />

                {/* Account Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    nav('/users');
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 0,
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#335049',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eef8f5';
                    e.currentTarget.style.color = '#007a70';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#335049';
                  }}
                >
                  <Settings size={14} color="#68827c" />
                  <span>Account Settings</span>
                </button>

                {/* Logout Option in Dropdown */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '8px 10px',
                    background: 'transparent',
                    border: 0,
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#e11d48',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff1f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <LogOut size={14} color="#e11d48" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}

          <button type="button" className="logout-btn" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className={mainClass}>
        <header className="topbar">
          <div
            className="search-box"
            ref={searchContainerRef}
            style={{
              position: 'relative',
              maxWidth: '460px',
              background: '#ffffff',
              border: isSearchOpen && globalSearchInput.trim() ? '1.5px solid #007a70' : '1px solid #c8ddd7',
              boxShadow: isSearchOpen && globalSearchInput.trim() ? '0 0 0 3px rgba(0, 122, 112, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)',
              borderRadius: '10px',
              transition: 'all 0.2s ease',
            }}
          >
            <Search size={16} color={isSearchOpen && globalSearchInput.trim() ? '#007a70' : '#6b7f7b'} />
            <input
              type="text"
              placeholder="Search medicines, batches, customers, invoices..."
              value={globalSearchInput}
              onChange={(e) => setGlobalSearchInput(e.target.value)}
              onFocus={() => {
                if (globalSearchInput.trim()) setIsSearchOpen(true);
              }}
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#133e36',
              }}
            />
            {globalSearchInput ? (
              <button
                type="button"
                onClick={() => {
                  setGlobalSearchInput('');
                  setGlobalSearchResults(null);
                  setIsSearchOpen(false);
                }}
                style={{
                  background: '#f0f5f3',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: '#68827c',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e1ebe7'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f0f5f3'}
              >
                <X size={12} />
              </button>
            ) : (
              <kbd style={{ fontSize: '10px', background: '#f0f5f3', color: '#68827c', padding: '1px 5px', borderRadius: '4px', border: '1px solid #d8e5e1', fontWeight: 600 }}>
                ⌘K
              </kbd>
            )}

            {/* Global Search Dropdown Overlay */}
            {isSearchOpen && globalSearchInput.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '560px',
                  maxWidth: '92vw',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 18px 48px rgba(19, 62, 54, 0.22)',
                  border: '1px solid #c2ded7',
                  zIndex: 99999,
                  maxHeight: '480px',
                  overflowY: 'auto',
                  padding: '8px 0',
                }}
              >
                {isSearching && (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: '#007a70', fontSize: '12px', fontWeight: 600 }}>
                    <div className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid #007a70', borderTopColor: 'transparent', marginRight: 8, verticalAlign: 'middle' }} />
                    Searching database...
                  </div>
                )}

                {!isSearching && !hasResults && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#68827c' }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔍</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#133e36' }}>No results found</div>
                    <div style={{ fontSize: '11px', color: '#889f9a', marginTop: '2px' }}>
                      No medicines, customers, suppliers or invoices matched "<strong>{globalSearchInput}</strong>"
                    </div>
                  </div>
                )}

                {!isSearching && hasResults && (
                  <div>
                    {/* Products / Drugs */}
                    {globalSearchResults.products?.length > 0 && (
                      <div style={{ borderBottom: '1px solid #edf4f2', paddingBottom: '4px' }}>
                        <div style={{ padding: '6px 14px', fontSize: '10.5px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', background: '#f4faf8' }}>
                          <Pill size={12} /> Drugs & Medicines ({globalSearchResults.products.length})
                        </div>
                        {globalSearchResults.products.map((p) => {
                          const stockCount = (p.batches || []).reduce((acc, b) => acc + (b.stocks || []).reduce((sAcc, s) => sAcc + Number(s.quantity || 0), 0), 0);
                          return (
                            <div
                              key={p.id}
                              onClick={() => handleSelectResult('/products')}
                              style={{
                                padding: '9px 14px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #f8faf9',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf9'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#133e36' }}>{p.name}</div>
                                <div style={{ fontSize: '10.5px', color: '#68827c' }}>
                                  {p.genericName ? `${p.genericName} • ` : ''}{p.dosageForm || 'Tablet'} {p.rack ? `• Rack: ${p.rack}` : ''}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: stockCount > 0 ? '#ecfdf5' : '#fee2e2', color: stockCount > 0 ? '#059669' : '#dc2626', border: stockCount > 0 ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
                                  {stockCount > 0 ? `${stockCount} in stock` : 'Out of stock'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Customers */}
                    {globalSearchResults.customers?.length > 0 && (
                      <div style={{ borderBottom: '1px solid #edf4f2', paddingBottom: '4px' }}>
                        <div style={{ padding: '6px 14px', fontSize: '10.5px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', background: '#f4faf8' }}>
                          <Users size={12} /> Customers ({globalSearchResults.customers.length})
                        </div>
                        {globalSearchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectResult('/customers')}
                            style={{
                              padding: '9px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f8faf9',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#133e36' }}>{c.name}</div>
                              <div style={{ fontSize: '10.5px', color: '#68827c' }}>
                                {c.phone ? `${c.phone} • ` : ''}{c.city || 'Customer'}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#007a70', fontWeight: 700 }}>
                              View Ledger →
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Suppliers */}
                    {globalSearchResults.suppliers?.length > 0 && (
                      <div style={{ borderBottom: '1px solid #edf4f2', paddingBottom: '4px' }}>
                        <div style={{ padding: '6px 14px', fontSize: '10.5px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', background: '#f4faf8' }}>
                          <Truck size={12} /> Suppliers & Distributors ({globalSearchResults.suppliers.length})
                        </div>
                        {globalSearchResults.suppliers.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleSelectResult('/suppliers')}
                            style={{
                              padding: '9px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f8faf9',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#133e36' }}>{s.name}</div>
                              <div style={{ fontSize: '10.5px', color: '#68827c' }}>
                                {s.phone ? `${s.phone} • ` : ''}{s.contactPerson ? `Attn: ${s.contactPerson}` : (s.city || 'Supplier')}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#007a70', fontWeight: 700 }}>
                              View Account →
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sales Invoices */}
                    {globalSearchResults.sales?.length > 0 && (
                      <div style={{ borderBottom: '1px solid #edf4f2', paddingBottom: '4px' }}>
                        <div style={{ padding: '6px 14px', fontSize: '10.5px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', background: '#f4faf8' }}>
                          <ShoppingCart size={12} /> Sales Invoices ({globalSearchResults.sales.length})
                        </div>
                        {globalSearchResults.sales.map((sale) => (
                          <div
                            key={sale.id}
                            onClick={() => handleSelectResult(`/sales`)}
                            style={{
                              padding: '9px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f8faf9',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#007a70', fontFamily: 'monospace' }}>
                                {sale.invoiceNumber}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#68827c' }}>
                                {sale.customer?.name || 'Walk-in Customer'} • {sale.invoiceDate ? new Date(sale.invoiceDate).toLocaleDateString('en-IN') : ''}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#133e36' }}>
                                ₹{Number(sale.totalAmount || 0).toFixed(2)}
                              </div>
                              <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: Number(sale.dueAmount || 0) > 0 ? '#fff1f2' : '#ecfdf5', color: Number(sale.dueAmount || 0) > 0 ? '#e11d48' : '#059669' }}>
                                {Number(sale.dueAmount || 0) > 0 ? 'DUE' : 'PAID'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Purchase Invoices */}
                    {globalSearchResults.purchases?.length > 0 && (
                      <div style={{ paddingBottom: '4px' }}>
                        <div style={{ padding: '6px 14px', fontSize: '10.5px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', background: '#f4faf8' }}>
                          <ReceiptText size={12} /> Purchase Invoices ({globalSearchResults.purchases.length})
                        </div>
                        {globalSearchResults.purchases.map((pur) => (
                          <div
                            key={pur.id}
                            onClick={() => handleSelectResult(`/purchases/${pur.id}`)}
                            style={{
                              padding: '9px 14px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid #f8faf9',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#007a70', fontFamily: 'monospace' }}>
                                {pur.invoiceNumber}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#68827c' }}>
                                {pur.supplier?.name || 'Supplier'} • {pur.invoiceDate ? new Date(pur.invoiceDate).toLocaleDateString('en-IN') : ''}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#133e36' }}>
                                ₹{Number(pur.totalAmount || 0).toFixed(2)}
                              </div>
                              <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: Number(pur.dueAmount || 0) > 0 ? '#fff1f2' : '#ecfdf5', color: Number(pur.dueAmount || 0) > 0 ? '#e11d48' : '#059669' }}>
                                {Number(pur.dueAmount || 0) > 0 ? 'DUE' : 'SETTLED'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="header-actions">
            {/* Interactive Notification Bell */}
            <div ref={notificationDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-btn"
                aria-label="Notifications"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  background: isNotificationsOpen ? '#e0f2fe' : '#edf5f1',
                  color: isNotificationsOpen ? '#007a70' : '#12392f',
                  border: isNotificationsOpen ? '1px solid #b7d6ce' : 'none',
                  transition: 'all 0.2s ease',
                }}
                title="Store Alerts & Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Floating Notifications Dropdown Menu */}
              {isNotificationsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '380px',
                    maxWidth: '92vw',
                    background: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 16px 40px rgba(19, 62, 54, 0.2)',
                    border: '1px solid #c8ddd7',
                    zIndex: 999999,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  <div style={{ padding: '12px 16px', background: '#f4faf8', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#133e36' }}>Store Notifications</strong>
                      <div style={{ fontSize: '10.5px', color: '#68827c' }}>
                        {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All caught up'}
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'transparent',
                          border: 0,
                          color: '#007a70',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '6px' }}>
                    {isNotifLoading && notificationsData.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#68827c', fontSize: '12px' }}>
                        Loading notifications...
                      </div>
                    ) : notificationsData.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#68827c' }}>
                        <div style={{ fontSize: '26px', marginBottom: '4px' }}>🔔</div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#133e36' }}>No active alerts</div>
                        <div style={{ fontSize: '11px', color: '#889f9a' }}>Your inventory and billing are healthy.</div>
                      </div>
                    ) : (
                      notificationsData.map((item) => {
                        const isRead = readNotificationIds.includes(item.id) || item.isRead;
                        const styleMap = {
                          warning: { bg: '#fff1f2', text: '#e11d48', icon: AlertTriangle },
                          alert: { bg: '#fffbeb', text: '#d97706', icon: Clock },
                          danger: { bg: '#fef2f2', text: '#dc2626', icon: AlertTriangle },
                          info: { bg: '#ecfdf5', text: '#059669', icon: CheckCircle2 },
                          neutral: { bg: '#f0f9ff', text: '#0284c7', icon: Bell },
                        }[item.category] || { bg: '#f4faf8', text: '#007a70', icon: Bell };

                        const IconComp = styleMap.icon;

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (!isRead) {
                                handleMarkNotificationRead(item);
                              }
                              if (item.link) {
                                setIsNotificationsOpen(false);
                                nav(item.link);
                              }
                            }}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              marginBottom: '4px',
                              background: isRead ? 'transparent' : '#f9fdfc',
                              border: isRead ? '1px solid transparent' : '1px solid #e1f0ec',
                              cursor: 'pointer',
                              display: 'flex',
                              gap: '10px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9f7'}
                            onMouseLeave={(e) => e.currentTarget.style.background = isRead ? 'transparent' : '#f9fdfc'}
                          >
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                background: styleMap.bg,
                                color: styleMap.text,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <IconComp size={15} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '11.5px', fontWeight: isRead ? 600 : 800, color: '#133e36' }}>
                                {item.title}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#55726c', marginTop: '2px', lineHeight: 1.3 }}>
                                {item.message}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Reminders Clock / Calendar Widget */}
            <div ref={remindersDropdownRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="icon-btn"
                aria-label="Medication Reminders"
                onClick={() => setIsRemindersOpen((prev) => !prev)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  background: isRemindersOpen ? '#fef3c7' : '#edf5f1',
                  color: isRemindersOpen ? '#b45309' : '#12392f',
                  border: isRemindersOpen ? '1px solid #fde68a' : 'none',
                  transition: 'all 0.2s ease',
                }}
                title="Patient Medication Reminders"
              >
                <CalendarCheck size={18} />
                {reminderStats.todayCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-3px',
                      background: '#d97706',
                      color: '#ffffff',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 5px rgba(217, 119, 6, 0.4)',
                    }}
                  >
                    {reminderStats.todayCount > 9 ? '9+' : reminderStats.todayCount}
                  </span>
                )}
              </button>

              {/* Floating Reminders Dropdown Popover */}
              {isRemindersOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '420px',
                    maxWidth: '92vw',
                    background: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 16px 40px rgba(19, 62, 54, 0.22)',
                    border: '1px solid #c8ddd7',
                    zIndex: 999999,
                    overflow: 'hidden',
                  }}
                >
                  {/* Popover Header */}
                  <div style={{ padding: '12px 16px', background: '#f4faf8', borderBottom: '1px solid #e2ece9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#133e36', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarCheck size={16} color="#007a70" /> Refill Reminders
                      </strong>
                      <div style={{ fontSize: '10.5px', color: '#68827c' }}>
                        {reminderStats.todayCount} due today • {reminderStats.totalPendingCount} active scheduled
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRemindersOpen(false);
                        nav('/sales/refill-reminders');
                      }}
                      style={{
                        border: 0,
                        background: 'transparent',
                        color: '#007a70',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        textDecoration: 'underline',
                      }}
                    >
                      View All <ChevronRight size={12} />
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div style={{ display: 'flex', background: '#eef6f3', padding: '4px', gap: '4px', borderBottom: '1px solid #dcebe6' }}>
                    {[
                      { key: 'TODAY', label: `Today (${reminderStats.todayCount})` },
                      { key: 'UPCOMING', label: 'Upcoming' },
                      { key: 'ALL', label: 'All Active' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setReminderFilterTab(tab.key)}
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          border: 0,
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: reminderFilterTab === tab.key ? '#ffffff' : 'transparent',
                          color: reminderFilterTab === tab.key ? '#007a70' : '#52726c',
                          boxShadow: reminderFilterTab === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Reminders List */}
                  <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px' }}>
                    {isRemindersLoading && remindersData.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#68827c', fontSize: '12px' }}>
                        Loading patient reminders...
                      </div>
                    ) : remindersData.length === 0 ? (
                      <div style={{ padding: '36px 16px', textAlign: 'center', color: '#68827c' }}>
                        <div style={{ fontSize: '28px', marginBottom: '6px' }}>🎉</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#133e36' }}>No Reminders in this list</div>
                        <div style={{ fontSize: '11px', color: '#889f9a', marginTop: '2px' }}>
                          Create medication reminders during POS billing for registered customers.
                        </div>
                      </div>
                    ) : (
                      remindersData.map((rem) => {
                        const isCompleted = rem.status === 'COMPLETED';
                        const mealText = {
                          AFTER_MEAL: 'After Meals',
                          BEFORE_MEAL: 'Before Meals',
                          WITH_FOOD: 'With Food',
                          ANYTIME: 'Anytime',
                        }[rem.mealTiming] || (rem.mealTiming || 'After Meals');

                        return (
                          <div
                            key={rem.id}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              marginBottom: '6px',
                              background: isCompleted ? '#f8faf9' : '#ffffff',
                              border: isCompleted ? '1px solid #e2ece9' : '1px solid #c9ded9',
                              boxShadow: isCompleted ? 'none' : '0 1px 4px rgba(0,0,0,0.03)',
                              opacity: isCompleted ? 0.75 : 1,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#133e36' }}>
                                  {rem.drugName}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#007a70', fontWeight: 700, marginTop: '2px' }}>
                                  👤 {rem.customer?.name || 'Customer'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isCompleted ? '#ecfdf5' : '#fef3c7',
                                    color: isCompleted ? '#059669' : '#b45309',
                                    border: isCompleted ? '1px solid #a7f3d0' : '1px solid #fde68a',
                                  }}
                                >
                                  {isCompleted ? 'COMPLETED' : rem.reminderTime}
                                </span>
                              </div>
                            </div>

                            {/* Schedule & Dosage Info */}
                            <div style={{ fontSize: '10.5px', color: '#446059', marginTop: '6px', background: '#f4faf8', padding: '5px 8px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                              <span>📅 {new Date(rem.reminderDate).toLocaleDateString('en-IN')}</span>
                              <span>💊 {rem.timesPerDay}x Daily ({mealText})</span>
                            </div>

                            {rem.dosageInstructions && (
                              <div style={{ fontSize: '10px', color: '#68827c', marginTop: '4px', fontStyle: 'italic' }}>
                                ℹ️ {rem.dosageInstructions}
                              </div>
                            )}

                            {/* Actions (Call / WhatsApp / Mark Complete) */}
                            <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #eef4f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {rem.customer?.phone && (
                                  <>
                                    <a
                                      href={`tel:${rem.customer.phone}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: '#007a70',
                                        textDecoration: 'none',
                                        background: '#eef8f5',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                      }}
                                      title="Call Patient"
                                    >
                                      <Phone size={10} /> Call
                                    </a>
                                    <a
                                      href={`https://wa.me/91${rem.customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${rem.customer.name}! Thank you for your visit. View your digital bill and medication dosage tracker here: ${window.location.origin}/p/bill/${rem.saleId || rem.id}`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: '#16a34a',
                                        textDecoration: 'none',
                                        background: '#ecfdf5',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                      }}
                                      title="Send WhatsApp Reminder & Digital Tracker"
                                    >
                                      <MessageSquare size={10} /> WhatsApp
                                    </a>
                                  </>
                                )}
                              </div>

                              <div>
                                {isCompleted ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReminderStatus(rem.id, 'PENDING')}
                                    style={{
                                      border: 0,
                                      background: 'transparent',
                                      color: '#68827c',
                                      fontSize: '10px',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                    }}
                                  >
                                    Reopen
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateReminderStatus(rem.id, 'COMPLETED')}
                                    style={{
                                      border: 0,
                                      background: '#007a70',
                                      color: '#ffffff',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      borderRadius: '4px',
                                      padding: '3px 8px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    <Check size={11} /> Mark Done
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

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


