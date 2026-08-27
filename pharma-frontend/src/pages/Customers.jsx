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
  const q = useQuery({
    queryKey: ["customers"],
    queryFn: async () => unwrap(await api.get("/customers")),
  });
  const [edit, setEdit] = React.useState(null);
  const [history, setHistory] = React.useState(null);
  const [show, setShow] = React.useState(false);
  const [menu, setMenu] = React.useState(null);
  const [share, setShare] = React.useState(null);
  const blank = Object.fromEntries(fields.map(([k]) => [k, ""]));
  const [f, setF] = React.useState(blank);
  const customers = q.data || [];
  const outstanding = customers.reduce(
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
      setShow(false);
      setEdit(null);
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
          onClick={() => {
            setEdit(null);
            setF(blank);
            setShow(!show);
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
      {show && (
        <Card title={edit ? "Edit customer" : "Create customer"}>
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
            <div className="formActions">
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
                onClick={() => setShow(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
          {save.isError && (
            <div className="alert errorBox">{apiError(save.error)}</div>
          )}
        </Card>
      )}
      <Card title="Customer directory">
        <Table
          columns={[
            {
              key: "name",
              label: "Customer",
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
              label: "Outstanding",
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
              label: "Last payment",
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
                    <div className="customer-action-menu">
                      <button type="button" onClick={() => open(r)}>
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenu(null);
                          setHistory(r);
                        }}
                      >
                        <History size={14} /> Purchase history
                      </button>
                      <button type="button" onClick={() => shareLedger(r)}>
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
      </Card>
      {history && (
        <CustomerSales customer={history} onClose={() => setHistory(null)} />
      )}
      {share && <ShareLedgerDialog share={share} onClose={() => setShare(null)} />}
    </div>
  );
}
