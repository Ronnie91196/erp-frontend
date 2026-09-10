import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { unwrap, apiError } from "../lib/api";
import {
  Card,
  Table,
  Button,
  Input,
  Badge,
  money,
  date,
} from "../components/ui";
import Pagination from "../components/Pagination";
import {
  Share2,
  Users,
  IndianRupee,
  MapPin,
  MoreVertical,
  History,
  Edit3,
  Copy,
  MessageCircle,
  Mail,
  Facebook,
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
const fields = [
  ["name", "Name"],
  ["phone", "Phone"],
  ["alternatePhone", "Alternate phone"],
  ["email", "Email"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "Pincode"],
  ["creditLimit", "Credit limit"],
  ["creditDays", "Credit days"],
  ["openingBalance", "Opening balance"],
];
function CustomerSales({ customer, onClose }) {
  const [selected, setSelected] = React.useState(null);
  const [medicineSearch, setMedicineSearch] = React.useState("");
  const q = useQuery({
    queryKey: ["customer-sales", customer.id],
    queryFn: async () =>
      unwrap(await api.get(`/customers/${customer.id}/sales`)),
  });
  const sales = q.data || [];
  const searchValue = medicineSearch.trim().toLowerCase();
  const filteredSales = sales.filter(
    (sale) =>
      !searchValue ||
      (sale.items || []).some((item) =>
        String(item.product?.name || "").toLowerCase().includes(searchValue),
      ),
  );
  return (
    <div className="drawerBackdrop" onClick={onClose}>
      <aside
        className="drawer customer-history-drawer"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawerHead">
          <div>
            <span className="eyebrow">Customer history</span>
            <h2>{customer.name}</h2>
            <p className="muted">Recent products sold to this customer</p>
          </div>
          <button className="iconBtn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="customer-history-search">
          <Search size={16} />
          <input
            value={medicineSearch}
            onChange={(event) => setMedicineSearch(event.target.value)}
            placeholder="Search medicine in transactions..."
            aria-label="Search medicine in transactions"
          />
        </div>
        <div className="customer-history-count">
          {searchValue
            ? `${filteredSales.length} matching transaction${filteredSales.length === 1 ? "" : "s"}`
            : `${sales.length} transaction${sales.length === 1 ? "" : "s"}`}
        </div>
        <div className="customer-history-list">
          {q.isLoading ? (
            <p className="muted">Loading sales history...</p>
          ) : filteredSales.length ? (
            filteredSales.map((sale) => (
              <button
                type="button"
                key={sale.id}
                className="customer-sale-row"
                onClick={() => setSelected(sale)}
              >
                <span>
                  <strong>{sale.invoiceNumber}</strong>
                  <small>
                    {date(sale.invoiceDate)} · {(sale.items || []).length}{" "}
                    product(s)
                  </small>
                </span>
                <b>{money(sale.totalAmount)}</b>
              </button>
            ))
          ) : (
            <p className="muted">
              {searchValue
                ? "No transaction contains this medicine."
                : "No sales found for this customer."}
            </p>
          )}
        </div>
        {selected && (
          <div
            className="customer-sale-popup"
            role="presentation"
            onClick={() => setSelected(null)}
          >
            <section
              className="customer-sale-detail"
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-sale-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="drawerHead">
                <div>
                  <span className="eyebrow">Sale details</span>
                  <h2 id="customer-sale-title">{selected.invoiceNumber}</h2>
                </div>
                <button className="iconBtn" onClick={() => setSelected(null)}>
                  ×
                </button>
              </div>
              <div className="detailGrid">
                <div>
                  <span>Date</span>
                  <b>{date(selected.invoiceDate)}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{selected.paymentStatus}</b>
                </div>
                <div>
                  <span>Total</span>
                  <b>{money(selected.totalAmount)}</b>
                </div>
                <div>
                  <span>Due</span>
                  <b>{money(selected.dueAmount)}</b>
                </div>
              </div>
              <div className="customer-sale-items">
                {(selected.items || []).map((item) => (
                  <div key={item.id}>
                    <strong>{item.product?.name || "Product"}</strong>
                    <span>
                      {item.batch?.batchNumber || "No batch"} · Qty{" "}
                      {item.quantity} · {money(item.unitPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function ShareLedgerDialog({ share, onClose }) {
  const { customer, url } = share;
  const message = `${customer.name} ledger\nOutstanding: ${money(customer.outstandingBalance)}\nView ledger: ${url}`;
  const open = (target) => window.open(target, "_blank", "noopener,noreferrer");
  const copy = async () => {
    await navigator.clipboard?.writeText(message);
    window.alert("Ledger link copied");
  };
  const channels = [
    ["WhatsApp", MessageCircle, `https://wa.me/?text=${encodeURIComponent(message)}`],
    ["Message", MessageCircle, `sms:${customer.phone || ""}?body=${encodeURIComponent(message)}`],
    ["Email", Mail, `mailto:${customer.email || ""}?subject=${encodeURIComponent(`${customer.name} ledger`)}&body=${encodeURIComponent(message)}`],
    ["Facebook", Facebook, `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ["X / Twitter", Share2, `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`],
  ];
  return (
    <div className="share-dialog-backdrop" onClick={onClose}>
      <section className="share-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="drawerHead">
          <div><span className="eyebrow">Share ledger</span><h2>{customer.name}</h2></div>
          <button className="iconBtn" onClick={onClose}>×</button>
        </div>
        <div className="share-link-box"><input readOnly value={url} /><button type="button" onClick={copy}><Copy size={15} /> Copy</button></div>
        <div className="share-channel-grid">
          {channels.map(([label, Icon, target]) => <button type="button" key={label} onClick={() => open(target)}><Icon size={16} /> {label}</button>)}
          <button type="button" onClick={copy}><Copy size={16} /> Instagram / Copy</button>
        </div>
      </section>
    </div>
  );
}

export default function Customers() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(25);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const q = useQuery({
    queryKey: ["customers", search, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      const res = await api.get(`/customers?${params.toString()}`);
      return res.data;
    },
  });
  const [edit, setEdit] = React.useState(null);
  const [history, setHistory] = React.useState(null);
  const [show, setShow] = React.useState(false);
  const [menu, setMenu] = React.useState(null);
  const [share, setShare] = React.useState(null);
  const blank = Object.fromEntries(fields.map(([k]) => [k, ""]));
  const [f, setF] = React.useState(blank);

  const [sortConfig, setSortConfig] = React.useState({ key: 'name', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const rawCustomers = Array.isArray(q.data?.data)
    ? q.data.data
    : (Array.isArray(q.data) ? q.data : []);

  const pagination = q.data?.pagination || {
    total: rawCustomers.length,
    page,
    limit,
    totalPages: Math.ceil(rawCustomers.length / limit) || 1,
  };

  const sortedCustomers = React.useMemo(() => {
    let sortableItems = [...rawCustomers];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue;
        let bValue;

        if (sortConfig.key === 'outstanding' || sortConfig.key === 'outstandingBalance') {
          aValue = Number(a.outstandingBalance ?? a.outstanding ?? 0);
          bValue = Number(b.outstandingBalance ?? b.outstanding ?? 0);
        } else if (sortConfig.key === 'lastPayment') {
          aValue = Number(a.lastPaymentAmount ?? 0);
          bValue = Number(b.lastPaymentAmount ?? 0);
        } else {
          aValue = String(a[sortConfig.key] || '').toLowerCase();
          bValue = String(b[sortConfig.key] || '').toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [rawCustomers, sortConfig]);

  const customers = sortedCustomers;
  const outstanding = rawCustomers.reduce(
    (total, customer) =>
      total + Math.max(0, Number(customer.outstandingBalance || 0)),
    0,
  );
  const open = (c) => {
    setMenu(null);
    setEdit(c);
    setF(Object.fromEntries(fields.map(([k]) => [k, c[k] ?? ""])));
    setShow(true);
  };
  const closeForm = () => {
    setShow(false);
    setEdit(null);
    setF(blank);
  };
  const shareLedger = async (customer) => {
    setMenu(null);
    try {
      const result = await unwrap(await api.post(`/customers/${customer.id}/ledger-shares`));
      const url = `${window.location.origin}/shared/customer-ledger/${result.token}`;
      setShare({ customer, url });
    } catch (error) {
      window.alert(apiError(error));
    }
  };
  const save = useMutation({
    mutationFn: (x) =>
      edit ? api.patch(`/customers/${edit.id}`, x) : api.post("/customers", x),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      closeForm();
    },
  });
  const submit = (e) => {
    e.preventDefault();
    save.mutate({
      ...f,
      creditLimit: Number(f.creditLimit || 0),
      creditDays: Number(f.creditDays || 0),
      openingBalance: Number(f.openingBalance || 0),
    });
  };
  return (
    <div onClick={() => setMenu(null)}>
      <div className="pageIntro">
        <div>
          <span className="eyebrow">CRM</span>
          <h2>Customers</h2>
          <p className="muted">
            Customer accounts, credit terms and receivables.
          </p>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            setEdit(null);
            setF(blank);
            setShow(true);
          }}
        >
          + New customer
        </Button>
      </div>
      <div className="customer-summary-grid">
        <div className="customer-summary-card blue">
          <div>
            <Users size={17} />
          </div>
          <span>Total Customers</span>
          <strong>{customers.length}</strong>
        </div>
        <div className="customer-summary-card red">
          <div>
            <IndianRupee size={17} />
          </div>
          <span>Outstanding</span>
          <strong>{money(outstanding)}</strong>
        </div>
        <div className="customer-summary-card orange">
          <div>
            <MapPin size={17} />
          </div>
          <span>Local Customers</span>
          <strong>{customers.length}</strong>
        </div>
      </div>

      <Card title="Customer directory">
        <div style={{ padding: '0 0 16px 0', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search customer by name, phone, email, city..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#f8fafc',
              }}
            />
          </div>
        </div>
        <Table
          columns={[
            {
              key: "name",
              label: (
                <div
                  className="flex items-center gap-2 cursor-pointer select-none group"
                  onClick={() => handleSort('name')}
                >
                  <span>Customer</span>
                  <span className="text-slate-400 group-hover:text-slate-600">
                    {sortConfig.key === 'name' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} />
                    )}
                  </span>
                </div>
              ),
              render: (r) => (
                <button
                  type="button"
                  className="customer-name-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistory(r);
                  }}
                >
                  {r.name}
                </button>
              ),
            },
            { key: "phone", label: "Phone" },
            {
              key: "outstandingBalance",
              label: (
                <div
                  className="flex items-center gap-2 cursor-pointer select-none group"
                  onClick={() => handleSort('outstanding')}
                >
                  <span>Outstanding</span>
                  <span className="text-slate-400 group-hover:text-slate-600">
                    {sortConfig.key === 'outstanding' || sortConfig.key === 'outstandingBalance' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} />
                    )}
                  </span>
                </div>
              ),
              render: (r) => (
                <span
                  className={
                    Number(r.outstandingBalance) > 0
                      ? "customer-outstanding"
                      : ""
                  }
                >
                  {money(r.outstandingBalance)}
                </span>
              ),
            },
            {
              key: "lastPayment",
              label: (
                <div
                  className="flex items-center gap-2 cursor-pointer select-none group"
                  onClick={() => handleSort('lastPayment')}
                >
                  <span>Last payment</span>
                  <span className="text-slate-400 group-hover:text-slate-600">
                    {sortConfig.key === 'lastPayment' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} />
                    )}
                  </span>
                </div>
              ),
              render: (r) => (
                <div className="customer-last-payment">
                  <strong>{r.lastPaymentAmount ? money(r.lastPaymentAmount) : "No payment"}</strong>
                  <small>{r.lastPaymentDate ? date(r.lastPaymentDate) : "—"}</small>
                </div>
              ),
            },
            {
              key: "createdAt",
              label: "Created",
              render: (r) => date(r.createdAt),
            },
            {
              key: "actions",
              label: "Actions",
              render: (r) => (
                <div className="customer-action-wrap">
                  <button
                    type="button"
                    className="customer-action-button"
                    aria-label={`Actions for ${r.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(menu === r.id ? null : r.id);
                    }}
                  >
                    <MoreVertical size={17} />
                  </button>
                  {menu === r.id && (
                    <div className="customer-action-menu" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          open(r);
                        }}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenu(null);
                          setHistory(r);
                        }}
                      >
                        <History size={14} /> Purchase history
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareLedger(r);
                        }}
                      >
                        <Share2 size={14} /> Share ledger
                      </button>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
          rows={customers}
        />
        <Pagination
          pagination={pagination}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
          pageSizeOptions={[10, 25, 50, 100]}
          itemLabel="customers"
        />
      </Card>
      {history && (
        <CustomerSales customer={history} onClose={() => setHistory(null)} />
      )}
      {share && <ShareLedgerDialog share={share} onClose={() => setShare(null)} />}

      {/* --- MODAL OVERLAY FOR ADD/EDIT (z-[9999]) --- */}
      {show && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          role="dialog"
          aria-modal="true"
        >
          {/* Dark blur backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
            onClick={closeForm}
          ></div>
          
          {/* Modal Content Box */}
          <div
            className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ position: 'relative', zIndex: 10, backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '672px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}
          >
            
            {/* Modal Header */}
            <div
              className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}
            >
              <h2 className="text-xl font-bold text-slate-800" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                {edit ? 'Edit Customer Details' : 'Add New Customer'}
              </h2>
              <button 
                type="button"
                onClick={closeForm}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', color: '#94a3b8', borderRadius: '8px' }}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div
              className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]"
              style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 130px)' }}
            >
              <form className="formGrid" onSubmit={submit}>
                {fields.map(([k, l]) => (
                  <Input
                    key={k}
                    label={l}
                    value={f[k]}
                    onChange={(e) => setF({ ...f, [k]: e.target.value })}
                  />
                ))}
                <label className="field">
                  <span>Status</span>
                  <select
                    value={f.status || edit?.status || "ACTIVE"}
                    onChange={(e) => setF({ ...f, status: e.target.value })}
                  >
                    <option>ACTIVE</option>
                    <option>INACTIVE</option>
                    <option>BLOCKED</option>
                  </select>
                </label>
                <div className="formActions mt-4" style={{ marginTop: '16px' }}>
                  <Button>
                    {save.isPending
                      ? "Saving…"
                      : edit
                        ? "Save changes"
                        : "Create customer"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={closeForm}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
              {save.isError && (
                <div className="alert errorBox mt-4">{apiError(save.error)}</div>
              )}
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
