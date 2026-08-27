import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import api, { unwrap, apiError } from "../lib/api";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Badge,
  money,
  date,
} from "../components/ui";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Eye,
  MoreVertical,
  Search,
  Store,
  Wallet,
  Download,
  Upload,
  Check,
  ChevronDown,
  X,
} from "lucide-react";

const fields = [
  ["name", "Name"],
  ["contactPerson", "Contact person"],
  ["phone", "Phone"],
  ["alternatePhone", "Alternate phone"],
  ["email", "Email"],
  ["gstin", "GSTIN"],
  ["drugLicenseNo", "Drug licence"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["pincode", "Pincode"],
  ["creditLimit", "Credit limit"],
  ["creditDays", "Credit days"],
  ["openingBalance", "Opening balance"],
];

const importColumns = ['name', 'phone', 'alternatePhone', 'email', 'gstin', 'drugLicenseNo', 'address', 'city', 'state', 'pincode', 'creditLimit', 'creditDays', 'openingBalance', 'status'];
const importLabels = { name: 'Name', phone: 'Phone', alternatePhone: 'Alternate Phone', email: 'Email', gstin: 'GSTIN', drugLicenseNo: 'DL', address: 'Address', city: 'City', state: 'State', pincode: 'Pincode', creditLimit: 'Credit Limit', creditDays: 'Credit Days', openingBalance: 'Opening Balance', status: 'Status' };

function parseCsv(text) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) { const character = text[index]; const next = text[index + 1]; if (character === '"' && quoted && next === '"') { value += '"'; index += 1; } else if (character === '"') quoted = !quoted; else if (character === ',' && !quoted) { row.push(value.trim()); value = ''; } else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && next === '\n') index += 1; row.push(value.trim()); if (row.some(Boolean)) rows.push(row); row = []; value = ''; } else value += character; }
  if (value || row.length) { row.push(value.trim()); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const aliases = { name: 'name', supplier: 'name', contactname: 'contactPerson', contactperson: 'contactPerson', alternatephone: 'alternatePhone', druglicence: 'drugLicenseNo', druglicense: 'drugLicenseNo', dl: 'drugLicenseNo', creditlimit: 'creditLimit', creditdays: 'creditDays', openingbalance: 'openingBalance' };
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [aliases[header] || importColumns.find((column) => column.toLowerCase() === header), cells[index] || '']).filter(([key]) => key)));
}

export default function Suppliers() {
  const qc = useQueryClient();
  const [selected, setSelected] = React.useState(null);
  const [edit, setEdit] = React.useState(null);
  const [show, setShow] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [showOutstanding, setShowOutstanding] = React.useState(false);
  const [visibleMetrics, setVisibleMetrics] = React.useState({});
  const [visibleColumns, setVisibleColumns] = React.useState({ margin: false, outstanding: false });
  const [sort, setSort] = React.useState({ key: "name", direction: "asc" });
  const [menuId, setMenuId] = React.useState(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportColumns, setExportColumns] = React.useState(['name', 'phone', 'email', 'address', 'gstin', 'outstanding']);
  const blank = Object.fromEntries(fields.map(([key]) => [key, ""]));
  const [form, setForm] = React.useState(blank);
  const query = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => unwrap(await api.get("/suppliers")),
  });
  const save = useMutation({
    mutationFn: (data) =>
      edit
        ? api.patch(`/suppliers/${edit.id}`, data)
        : api.post("/suppliers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      setShow(false);
      setEdit(null);
    },
  });
  const openEdit = (supplier) => {
    setEdit(supplier);
    setForm(
      Object.fromEntries(fields.map(([key]) => [key, supplier[key] ?? ""])),
    );
    setShow(true);
  };
  const submit = (event) => {
    event.preventDefault();
    save.mutate({
      ...form,
      creditLimit: Number(form.creditLimit || 0),
      creditDays: Number(form.creditDays || 0),
      openingBalance: Number(form.openingBalance || 0),
      status: form.status || edit?.status || "ACTIVE",
    });
  };
  const suppliers = query.data || [];
  const filteredSuppliers = suppliers
    .filter((supplier) => {
      const haystack =
        `${supplier.name} ${supplier.phone || ""} ${supplier.email || ""} ${supplier.address || ""}`.toLowerCase();
      return (
        haystack.includes(search.toLowerCase().trim()) &&
        (filter === "all" ||
          (filter === "outstanding"
            ? Number(supplier.outstanding || 0) > 0
            : filter === "clear"
              ? Number(supplier.outstanding || 0) <= 0
              : String(supplier.city || "").toLowerCase() === "jabalpur"))
      );
    })
    .sort((left, right) => {
      const leftValue =
        sort.key === "outstanding"
          ? Number(left.outstanding || 0)
          : sort.key === "margin"
            ? Number(left.margin ?? 0)
          : sort.key === "lastPayment"
            ? new Date(left.lastPayment || 0).getTime()
            : String(left.name || "");
      const rightValue =
        sort.key === "outstanding"
          ? Number(right.outstanding || 0)
          : sort.key === "margin"
            ? Number(right.margin ?? 0)
          : sort.key === "lastPayment"
            ? new Date(right.lastPayment || 0).getTime()
            : String(right.name || "");
      const result =
        typeof leftValue === "number"
          ? leftValue - rightValue
          : leftValue.localeCompare(rightValue);
      return sort.direction === "asc" ? result : -result;
    });
  const toggleSort = (key) =>
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const toggleColumn = (column) => setVisibleColumns((current) => ({ ...current, [column]: !current[column] }));
  const totalOutstanding = suppliers.reduce(
    (total, supplier) => total + Math.max(0, Number(supplier.outstanding || 0)),
    0,
  );
  const localSuppliers = suppliers.filter(
    (supplier) => String(supplier.city || "").toLowerCase() === "jabalpur",
  ).length;
  const importSuppliers = useMutation({ mutationFn: (rows) => api.post('/suppliers/import', { rows }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setImportOpen(false); } });
  const downloadExport = async () => { const response = await api.post('/suppliers/export', { columns: exportColumns }, { responseType: 'blob' }); const url = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `suppliers-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url); setExportOpen(false); setMenuId(null); };
  return (
    <div>
      <div className="pageIntro">
        <div>
          <span className="eyebrow">Master data</span>
          <h2>Suppliers</h2>
          <p className="muted">
            Supplier master, credit terms and ledger access.
          </p>
        </div>
        <Button
          onClick={() => {
            setEdit(null);
            setForm(blank);
            setShow(!show);
          }}
        >
          + New supplier
        </Button>
      </div>
      {show && (
        <Card title={edit ? "Edit supplier" : "Create supplier"}>
          <form className="formGrid" onSubmit={submit}>
            {fields.map(([key, label]) => (
              <Input
                key={key}
                label={label}
                value={form[key]}
                onChange={(event) =>
                  setForm({ ...form, [key]: event.target.value })
                }
              />
            ))}
            <Select
              label="Status"
              value={form.status || edit?.status || "ACTIVE"}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option>ACTIVE</option>
              <option>INACTIVE</option>
              <option>BLOCKED</option>
            </Select>
            <div className="formActions">
              <Button disabled={save.isPending}>
                {save.isPending
                  ? "Saving..."
                  : edit
                    ? "Save changes"
                    : "Create supplier"}
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
      <div className="supplier-tools">
        <div className="supplier-global-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search in names, phones, emails or addresses..."
          />
          <kbd>/</kbd>
        </div>
        <div className="supplier-filter-chips">
          {[
            ["all", "All"],
            ["outstanding", "Outstanding only"],
            ["clear", "No outstanding"],
            ["local", "Local suppliers"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {value === "local" ? <Store size={13} /> : <Wallet size={13} />}
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="supplier-kpis">
        <article>
          <span className="supplier-kpi-icon blue">
            <Archive size={18} />
          </span>
          <div>
            <small>Total Suppliers</small>
            <strong>{suppliers.length}</strong>
          </div>
        </article>
        <article>
          <span className="supplier-kpi-icon red">
            <Wallet size={18} />
          </span>
          <div>
            <small>Outstanding</small>
            <button
              type="button"
              className="metric-reveal"
              onClick={() => setShowOutstanding((value) => !value)}
            >
              {showOutstanding ? money(totalOutstanding) : "Click to view"}
            </button>
            <em>
              {showOutstanding
                ? `${suppliers.filter((supplier) => Number(supplier.outstanding || 0) > 0).length} suppliers`
                : "Protected amount"}
            </em>
          </div>
        </article>
        <article>
          <span className="supplier-kpi-icon orange">
            <Store size={18} />
          </span>
          <div>
            <small>Local Suppliers</small>
            <strong>{localSuppliers}</strong>
          </div>
        </article>
      </div>
      <div className="supplier-table-card">
        <div className="supplier-table-heading">
          <h3>Supplier directory</h3>
          <div className="supplier-global-actions">
            <Button
              onClick={() => {
                setEdit(null);
                setForm(blank);
                setShow(true);
              }}
            >
              + Add supplier
            </Button>
            <Button
              onClick={() => {
                if (suppliers[0]) setSelected(suppliers[0]);
              }}
            >
              Add payment
            </Button>
            <Button
              variant="ghost"
              onClick={() => setMenuId(menuId === "global" ? null : "global")}
            >
              Actions <MoreVertical size={15} />
            </Button>
            {menuId === "global" && (
              <div className="supplier-global-menu">
                <button type="button">Bulk payment link</button>
                <button type="button" onClick={() => { setImportOpen(true); setMenuId(null); }}><Upload size={14} /> Import</button>
                <button type="button" onClick={() => { setExportOpen(true); setMenuId(null); }}><Download size={14} /> Export</button>
              </div>
            )}
          </div>
        </div>
        <div className="supplier-table-scroll">
          <table className="supplier-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("name")}>
                  NAME{" "}
                  <SortIcon
                    active={sort.key === "name"}
                    direction={sort.direction}
                  />
                </th>
                <th>PHONE</th>
                <th onClick={() => toggleSort("margin")}>
                  <button type="button" className="header-visibility" onClick={(event) => { event.stopPropagation(); toggleColumn("margin"); }} aria-label={`${visibleColumns.margin ? "Hide" : "Show"} supplier margin`}><Eye size={13} /></button> MARGIN <SortIcon active={sort.key === "margin"} direction={sort.direction} />
                </th>
                <th onClick={() => toggleSort("outstanding")}>
                  <button type="button" className="header-visibility" onClick={(event) => { event.stopPropagation(); toggleColumn("outstanding"); }} aria-label={`${visibleColumns.outstanding ? "Hide" : "Show"} supplier outstanding`}><Eye size={13} /></button> OUTSTANDING
                  <SortIcon
                    active={sort.key === "outstanding"}
                    direction={sort.direction}
                  />
                </th>
                <th onClick={() => toggleSort("lastPayment")}>
                  LAST PAYMENT{" "}
                  <SortIcon
                    active={sort.key === "lastPayment"}
                    direction={sort.direction}
                  />
                </th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <strong>{supplier.name}</strong>
                    <small>{supplier.gstin || supplier.id}</small>
                  </td>
                  <td>{supplier.phone || "-"}</td>
                  <td>
                    <button type="button" className="metric-cell" onClick={() => setVisibleColumns((current) => ({ ...current, margin: !current.margin }))}>{visibleColumns.margin ? (supplier.margin === null ? "N/A" : `${supplier.margin >= 0 ? "+" : ""}${Number(supplier.margin).toFixed(2)}%`) : "Click to view"}</button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="metric-cell"
                      onClick={() =>
                        setVisibleMetrics((current) => ({
                          ...current,
                          [supplier.id]: !current[supplier.id],
                        }))
                      }
                    >
                      {visibleColumns.outstanding ? money(supplier.outstanding) : "Click to view"}
                    </button>
                  </td>
                  <td>
                    {supplier.lastPayment ? date(supplier.lastPayment) : "-"}
                  </td>
                  <td className="supplier-row-actions">
                    <button
                      type="button"
                      className="supplier-kebab"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuId(menuId === supplier.id ? null : supplier.id);
                      }}
                      aria-label={`Actions for ${supplier.name}`}
                    >
                      <MoreVertical size={17} />
                    </button>
                    {menuId === supplier.id && (
                      <div className="supplier-action-menu">
                        <button
                          type="button"
                          onClick={() => setSelected(supplier)}
                        >
                          Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(supplier)}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!filteredSuppliers.length && (
                <tr>
                  <td colSpan="6" className="supplier-empty">
                    No suppliers match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selected && (
        <SupplierDetail supplier={selected} close={() => setSelected(null)} />
      )}
      {importOpen && <SupplierImportModal onClose={() => setImportOpen(false)} onImport={(rows) => importSuppliers.mutate(rows)} saving={importSuppliers.isPending} error={importSuppliers.error ? apiError(importSuppliers.error) : ''} />}
      {exportOpen && <SupplierExportModal columns={exportColumns} setColumns={setExportColumns} onClose={() => setExportOpen(false)} onExport={downloadExport} />}
    </div>
  );
}

function SupplierExportModal({ columns, setColumns, onClose, onExport }) {
  const options = [['gstin', 'GSTIN'], ['drugLicenseNo', 'DL'], ['contactPerson', 'Contact Name'], ['email', 'Email'], ['state', 'State'], ['createdAt', 'Created At'], ['lastPayment', 'Last Payment'], ['outstanding', 'Outstanding'], ['margin', 'Margin %']];
  const toggle = (column) => setColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column]);
  return <div className="supplier-modal-backdrop" onMouseDown={onClose}><section className="supplier-modal export-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>Export Suppliers</h2><p>Choose the columns to include in your CSV export.</p></div><button type="button" onClick={onClose} aria-label="Close export dialog"><X size={18} /></button></header><div className="supplier-modal-body"><h3>Columns to include <button type="button" onClick={() => setColumns(options.map(([value]) => value))}>Select all</button></h3><p className="modal-help">Name is always included. Choose any additional supplier fields.</p><div className="export-column-grid">{options.map(([value, label]) => <button type="button" key={value} className={columns.includes(value) ? 'selected' : ''} onClick={() => toggle(value)}><span>{columns.includes(value) ? <Check size={14} /> : null}</span>{label}</button>)}</div></div><footer><button type="button" className="modal-secondary" onClick={onClose}>Cancel</button><button type="button" className="modal-primary" onClick={onExport}><Download size={15} /> Export CSV</button></footer></section></div>;
}

function SupplierImportModal({ onClose, onImport, saving, error }) {
  const [rows, setRows] = React.useState([]);
  const [fileName, setFileName] = React.useState('');
  const [parseError, setParseError] = React.useState('');
  const readFile = (file) => { if (!file) return; if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { setParseError('Please select a CSV or Excel file.'); return; } if (file.size > 5 * 1024 * 1024) { setParseError('File must be smaller than 5 MB.'); return; } const reader = new FileReader(); reader.onload = () => { try { const workbook = file.name.toLowerCase().endsWith('.csv') ? XLSX.read(reader.result, { type: 'string' }) : XLSX.read(reader.result, { type: 'array' }); const parsed = parseCsv(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]])); if (!parsed.length) throw new Error('No supplier rows found.'); setRows(parsed); setFileName(file.name); setParseError(''); } catch (parseErr) { setRows([]); setParseError(parseErr.message); } }; if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file); else reader.readAsArrayBuffer(file); };
  return <div className="supplier-modal-backdrop" onMouseDown={onClose}><section className="supplier-modal import-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header><div><h2>Import Suppliers</h2><p>Upload a CSV or Excel file, review the rows, then import them safely.</p></div><button type="button" onClick={onClose} aria-label="Close import dialog"><X size={18} /></button></header><div className="import-stepper"><span className={rows.length ? 'done' : 'active'}>1 <small>Upload</small></span><i /><span className={rows.length ? 'active' : ''}>2 <small>Preview</small></span><i /><span>3 <small>Complete</small></span></div><div className="supplier-modal-body"><label className="upload-zone"><Upload size={28} /><strong>{fileName || 'Upload your file'}</strong><span>CSV or Excel, maximum 5 MB</span><input type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" onChange={(event) => readFile(event.target.files?.[0])} /></label>{parseError && <p className="import-error">{parseError}</p>}{rows.length > 0 && <><div className="import-summary"><strong>{rows.length} rows ready</strong><span>Showing the first 5 rows for review</span></div><div className="import-preview">{rows.slice(0, 5).map((row, index) => <div key={index}><strong>{row.name || 'Unnamed supplier'}</strong><span>{row.phone || row.email || 'No contact details'}</span></div>)}</div></>}</div><footer><button type="button" className="modal-secondary" onClick={onClose}>Cancel</button><button type="button" className="modal-primary" onClick={() => onImport(rows)} disabled={!rows.length || saving}>{saving ? 'Importing...' : 'Import suppliers'}</button></footer>{error && <p className="import-error modal-error">{error}</p>}</section></div>;
}

function SortIcon({ active, direction }) {
  return active ? (
    direction === "asc" ? (
      <ArrowUp size={13} />
    ) : (
      <ArrowDown size={13} />
    )
  ) : (
    <span className="sort-neutral">↕</span>
  );
}

function SupplierDetail({ supplier, close }) {
  const [productsOpen, setProductsOpen] = React.useState(false);
  const detail = useQuery({
    queryKey: ["supplier", supplier.id],
    queryFn: async () => unwrap(await api.get(`/suppliers/${supplier.id}`)),
  });
  const products = useQuery({
    queryKey: ["supplier-products", supplier.id],
    queryFn: async () =>
      unwrap(await api.get(`/suppliers/${supplier.id}/products`)),
  });
  const ledger = useQuery({
    queryKey: ["supplier-ledger", supplier.id],
    queryFn: async () =>
      unwrap(await api.get(`/suppliers/${supplier.id}/ledger`)),
  });
  const record = detail.data || supplier;
  const entries = ledger.data?.entries || [];
  return (
    <div className="drawerBackdrop" onClick={close}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawerHead">
          <div>
            <span className="eyebrow">Supplier profile</span>
            <h2>{record.name}</h2>
            <p className="muted">
              {record.status || "ACTIVE"} supplier account
            </p>
          </div>
          <button className="iconBtn" onClick={close}>
            ×
          </button>
        </div>
        <div className="detailGrid">
          <div>
            <span>Contact</span>
            <b>{record.contactPerson || "-"}</b>
          </div>
          <div>
            <span>Phone</span>
            <b>{record.phone || "-"}</b>
          </div>
          <div>
            <span>Email</span>
            <b>{record.email || "-"}</b>
          </div>
          <div>
            <span>GSTIN</span>
            <b>{record.gstin || "-"}</b>
          </div>
          <div>
            <span>Credit limit</span>
            <b>{money(record.creditLimit)}</b>
          </div>
          <div>
            <span>Credit days</span>
            <b>{record.creditDays || 0}</b>
          </div>
        </div>
        <SupplierPayment supplierId={supplier.id} />
        <Card
          title="Linked products"
          actions={
            <button
              type="button"
              className="collapse-toggle"
              onClick={() => setProductsOpen((open) => !open)}
            >
              {productsOpen
                ? "Hide products"
                : `Show ${products.data?.length || 0} products`}
            </button>
          }
        >
          {productsOpen && (
            <Table
              columns={[
                {
                  key: "product",
                  label: "Product",
                  render: (row) => row.product?.name || row.name || "-",
                },
                {
                  key: "purchasePrice",
                  label: "Purchase",
                  render: (row) => money(row.purchasePrice),
                },
                {
                  key: "isPreferred",
                  label: "Preferred",
                  render: (row) => (row.isPreferred ? "Yes" : "No"),
                },
              ]}
              rows={products.data || []}
            />
          )}
        </Card>
        <Card title="Ledger summary">
          <div className="detailGrid">
            <div>
              <span>Total debit</span>
              <b>{money(ledger.data?.summary?.totalDebit)}</b>
            </div>
            <div>
              <span>Total credit</span>
              <b>{money(ledger.data?.summary?.totalCredit)}</b>
            </div>
            <div>
              <span>Balance</span>
              <b>{money(ledger.data?.summary?.balance)}</b>
            </div>
          </div>
          <Table
            columns={[
              {
                key: "entryDate",
                label: "Date",
                render: (row) => date(row.entryDate),
              },
              { key: "description", label: "Description" },
              {
                key: "debit",
                label: "Debit",
                render: (row) => money(row.debit),
              },
              {
                key: "credit",
                label: "Credit",
                render: (row) => money(row.credit),
              },
            ]}
            rows={entries.slice(-8).reverse()}
          />
        </Card>
      </aside>
    </div>
  );
}

function SupplierPayment({ supplierId }) {
  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("CASH");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const payment = useMutation({
    mutationFn: (data) => api.post(`/suppliers/${supplierId}/payments`, data),
    onSuccess: () => {
      setAmount("");
      setReferenceNumber("");
    },
  });
  return (
    <Card title="Add payment">
      <form
        className="supplier-payment-form"
        onSubmit={(event) => {
          event.preventDefault();
          payment.mutate({
            amount: Number(amount),
            paymentMethod,
            referenceNumber,
          });
        }}
      >
        <label className="field">
          <span>Amount</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Method</span>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            <option>CASH</option>
            <option>UPI</option>
            <option>CARD</option>
            <option>BANK_TRANSFER</option>
            <option>CHEQUE</option>
            <option>OTHER</option>
          </select>
        </label>
        <label className="field">
          <span>Reference</span>
          <input
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <Button type="submit" disabled={payment.isPending}>
          {payment.isPending ? "Saving..." : "Record payment"}
        </Button>
      </form>
      {payment.isError && (
        <div className="alert errorBox">{apiError(payment.error)}</div>
      )}
      {payment.isSuccess && (
        <div className="payment-success">Payment recorded</div>
      )}
    </Card>
  );
}
