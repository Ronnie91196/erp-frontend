import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api, { apiError, unwrap } from "../lib/api";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  Filter,
  Search,
  Wallet,
} from "lucide-react";
import { Badge, Button, Card, Table, date, money } from "../components/ui";

function CustomerAccountSearch({
  id,
  setId,
  accountSearch,
  setAccountSearch,
  accountSuggestions,
  accountLabel,
  showList,
}) {
  return (
    <div className="account-combobox">
      <div className="account-search-input">
        <Search size={16} />
        <input
          value={accountSearch}
          onChange={(event) => {
            setAccountSearch(event.target.value);
            setId("");
          }}
          placeholder={`Search ${accountLabel.toLowerCase()} by name, phone or email`}
        />
      </div>
      {(showList || accountSearch.trim()) && (
        <>
          {showList && (
            <div className="account-list-label">
              {accountLabel === "customer" ? "Customers" : "Suppliers"}
            </div>
          )}
          <div className={`account-suggestions ${showList ? "customer-account-list" : ""}`}>
            {accountSuggestions.length ? (
              accountSuggestions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={item.id === id ? "selected" : ""}
                  onClick={() => {
                    setId(item.id);
                    setAccountSearch(item.name);
                  }}
                >
                  {item.name}
                  <small>{item.phone || item.email || `${accountLabel} account`}</small>
                </button>
              ))
            ) : (
              <p>No matching {accountLabel === "customer" ? "customers" : "suppliers"} found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Ledgers({ type }) {
  const isCustomer = type === "customer";
  const [id, setId] = React.useState("");
  const [accountSearch, setAccountSearch] = React.useState("");
  const [medicineSearch, setMedicineSearch] = React.useState("");
  const [selectedSaleId, setSelectedSaleId] = React.useState(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = React.useState(null);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [ledgerFilters, setLedgerFilters] = React.useState({
    range: "all",
    startDate: "",
    endDate: "",
    entryType: "all",
    paymentMethod: "all",
    sortBy: "date",
    order: "desc",
  });
  const list = useQuery({
    queryKey: [`${type}-ledger-list`],
    queryFn: async () =>
      unwrap(await api.get(isCustomer ? "/customers" : "/suppliers")),
  });
  const ledger = useQuery({
    queryKey: [type, "ledger", id],
    enabled: !!id,
    queryFn: async () =>
      unwrap(
        await api.get(
          isCustomer ? `/customers/${id}/ledger` : `/suppliers/${id}/ledger`,
        ),
      ),
  });
  const sales = useQuery({
    queryKey: ["customer-sales-search", id],
    enabled: isCustomer && !!id,
    queryFn: async () => unwrap(await api.get(`/customers/${id}/sales`)),
  });
  const account = ledger.data?.[isCustomer ? "customer" : "supplier"];
  const entries = ledger.data?.entries || [];
  const summary = ledger.data?.summary || {};
  const medicineSearchValue = medicineSearch.trim().toLowerCase();
  const saleMedicineNames = new Map(
    (sales.data || []).map((sale) => [
      sale.id,
      (sale.items || [])
        .map((item) => item.product?.name || "")
        .join(" ")
        .toLowerCase(),
    ]),
  );
  const accountSuggestions = (list.data || [])
    .filter((item) =>
      `${item.name} ${item.phone || ""} ${item.email || ""}`
        .toLowerCase()
        .includes(accountSearch.toLowerCase().trim()),
    )
    .slice(0, isCustomer ? undefined : 8);
  const filteredEntries = [...entries]
    .filter((entry) => {
      if (
        ledgerFilters.entryType !== "all" &&
        entry.entryType !== ledgerFilters.entryType
      )
        return false;
      if (
        ledgerFilters.paymentMethod !== "all" &&
        entry.paymentMethod !== ledgerFilters.paymentMethod
      )
        return false;
      if (
        isCustomer &&
        medicineSearchValue &&
        (entry.entryType !== "SALE" ||
          !saleMedicineNames.get(entry.referenceId)?.includes(medicineSearchValue))
      )
        return false;
      const entryTime = new Date(entry.entryDate).getTime();
      if (
        ledgerFilters.startDate &&
        entryTime < new Date(`${ledgerFilters.startDate}T00:00:00`).getTime()
      )
        return false;
      if (
        ledgerFilters.endDate &&
        entryTime > new Date(`${ledgerFilters.endDate}T23:59:59.999`).getTime()
      )
        return false;
      if (ledgerFilters.range !== "all") { const now = new Date(); const start = new Date(now); const end = new Date(now); if (ledgerFilters.range === "today") start.setHours(0, 0, 0, 0); if (ledgerFilters.range === "week") { start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay()); } if (ledgerFilters.range === "month") { start.setHours(0, 0, 0, 0); start.setDate(1); } if (ledgerFilters.range === "lastMonth") { start.setHours(0, 0, 0, 0); start.setDate(1); start.setMonth(start.getMonth() - 1); end.setHours(0, 0, 0, 0); end.setDate(1); } if (ledgerFilters.range === "quarter") { start.setHours(0, 0, 0, 0); start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1); } if (ledgerFilters.range === "lastQuarter") { start.setHours(0, 0, 0, 0); start.setMonth(Math.floor(start.getMonth() / 3) * 3 - 3, 1); end.setHours(0, 0, 0, 0); end.setMonth(Math.floor(new Date().getMonth() / 3) * 3, 1); } if (ledgerFilters.range === "year") { start.setHours(0, 0, 0, 0); start.setMonth(0, 1); } if (ledgerFilters.range === "lastYear") { start.setHours(0, 0, 0, 0); start.setFullYear(start.getFullYear() - 1, 0, 1); end.setHours(0, 0, 0, 0); end.setFullYear(new Date().getFullYear(), 0, 1); } const entryDate = new Date(entry.entryDate).getTime(); if (entryDate < start.getTime() || (end.getTime() !== now.getTime() && entryDate >= end.getTime())) return false; }
      return true;
    })
    .sort((left, right) => {
      const leftValue =
        ledgerFilters.sortBy === "amount"
          ? Number(left.amount)
          : new Date(left.entryDate).getTime();
      const rightValue =
        ledgerFilters.sortBy === "amount"
          ? Number(right.amount)
          : new Date(right.entryDate).getTime();
      return ledgerFilters.order === "asc"
        ? leftValue - rightValue
        : rightValue - leftValue;
    });
  return (
    <div>
      <div className="pageIntro">
        <div>
          <span className="eyebrow">Finance</span>
          <h2>{isCustomer ? "Customer" : "Supplier"} ledger</h2>
          <p className="muted">
            Review account activity, balances and transaction history.
          </p>
        </div>
        <Badge tone="success">
          <BookOpen size={13} /> Live ledger
        </Badge>
      </div>
      <div className="ledger-selector-card">
      <Card title="Select account">
        <div className="ledgerSelector">
          <label className="field ledger-account-field">
            <span>{isCustomer ? "Customer" : "Supplier"}</span>
            <CustomerAccountSearch
              id={id}
              setId={setId}
              accountSearch={accountSearch}
              setAccountSearch={setAccountSearch}
              accountSuggestions={accountSuggestions}
              accountLabel={isCustomer ? "customer" : "supplier"}
              showList={true}
            />
          </label>
          <Button
            onClick={() => ledger.refetch()}
            disabled={!id || ledger.isFetching}
          >
            {ledger.isFetching ? "Loading..." : "View ledger"}
          </Button>
        </div>
        {list.isError && (
          <div className="alert errorBox">{apiError(list.error)}</div>
        )}
      </Card>
      </div>
      {ledger.isError && (
        <div className="alert errorBox">{apiError(ledger.error)}</div>
      )}
      {ledger.isLoading && (
        <div className="loading">Loading account ledger...</div>
      )}
      {account && (
        <>
          <div className="ledgerAccount">
            <div className="accountIcon">
              <Wallet size={20} />
            </div>
            <div>
              <span className="eyebrow">Account overview</span>
              <h3>{account.name}</h3>
              <p className="muted">
                Opening balance: {money(account.openingBalance)}
              </p>
            </div>
            <div className="accountBalance">
              <span>Current balance</span>
              <strong>{money(summary.balance)}</strong>
              <Badge tone={summary.balance > 0 ? "warning" : "success"}>
                {summary.balance > 0 ? "Outstanding" : "Clear"}
              </Badge>
            </div>
          </div>
          <div className="ledgerKpis">
            <LedgerKpi
              icon={ArrowUpRight}
              label="Total debit"
              value={summary.totalDebit}
              tone="debit"
            />
            <LedgerKpi
              icon={ArrowDownLeft}
              label="Total credit"
              value={summary.totalCredit}
              tone="credit"
            />
            <LedgerKpi
              icon={CreditCard}
              label="Transactions"
              value={entries.length}
              tone="count"
              numeric
            />
          </div>
          {isCustomer && (
            <CustomerPayment customerId={id} onSaved={() => ledger.refetch()} />
          )}
          <Card
            title="Transaction history"
            actions={
              <>
                <Button variant="ghost" onClick={() => setFilterOpen(true)}>
                  <Filter size={14} /> Filters
                </Button>
                <span className="muted ledgerCount">
                  <FileText size={14} /> {filteredEntries.length} of{" "}
                  {entries.length} entries
                </span>
              </>
            }
          >
            {isCustomer && (
              <div className="ledger-medicine-search">
                <Search size={16} />
                <input
                  value={medicineSearch}
                  onChange={(event) => setMedicineSearch(event.target.value)}
                  placeholder="Search medicine in transactions..."
                  aria-label="Search medicine in customer transactions"
                />
                {medicineSearchValue && (
                  <span>{filteredEntries.length} match{filteredEntries.length === 1 ? "" : "es"}</span>
                )}
              </div>
            )}
            <div className="ledger-table-scroll"><Table
              columns={[
                {
                  key: "entryDate",
                  label: "Date",
                  render: (row) => (
                    <span className="dateCell">
                      <CalendarDays size={14} />
                      {date(row.entryDate)}
                    </span>
                  ),
                },
                {
                  key: "entryType",
                  label: "Type",
                  render: (row) => (
                    <Badge tone={row.debit > 0 ? "warning" : "success"}>
                      {String(row.entryType || "ENTRY").replaceAll("_", " ")}
                    </Badge>
                  ),
                },
                {
                  key: "description",
                  label: "Description",
                  render: (row) =>
                    row.entryType === "SALE" && row.referenceId ? (
                      <button
                        type="button"
                        className="ledger-sale-link"
                        onClick={() => setSelectedSaleId(row.referenceId)}
                      >
                        <strong>{row.description || "Sale"}</strong>
                        {row.referenceNumber && (
                          <small className="reference">
                            Ref: {row.referenceNumber}
                          </small>
                        )}
                      </button>
                    ) : !isCustomer && row.entryType === "PURCHASE" && row.referenceId ? (
                      <button
                        type="button"
                        className="ledger-purchase-link"
                        onClick={() => setSelectedPurchaseId(row.referenceId)}
                      >
                        <strong>{row.description || "Purchase invoice"}</strong>
                        {row.referenceNumber && (
                          <small className="reference">
                            Invoice: {row.referenceNumber}
                          </small>
                        )}
                      </button>
                    ) : (
                      <div>
                        <strong>{row.description || "Ledger entry"}</strong>
                        {row.referenceNumber && (
                          <small className="reference">
                            Ref: {row.referenceNumber}
                          </small>
                        )}
                      </div>
                    ),
                },
                {
                  key: "debit",
                  label: "Debit",
                  render: (row) => (
                    <span className="amount debit">
                      {row.debit ? money(row.debit) : "-"}
                    </span>
                  ),
                },
                {
                  key: "credit",
                  label: "Credit",
                  render: (row) => (
                    <span className="amount credit">
                      {row.credit ? money(row.credit) : "-"}
                    </span>
                  ),
                },
                {
                  key: "balance",
                  label: "Running balance",
                  render: (row) => <strong>{money(row.balance)}</strong>,
                },
              ]}
              rows={filteredEntries}
            /></div>
          </Card>
        </>
      )}
      {filterOpen && (
        <LedgerFilterDrawer
          filters={ledgerFilters}
          isCustomer={isCustomer}
          onClose={() => setFilterOpen(false)}
          onApply={(next) => {
            setLedgerFilters(next);
            setFilterOpen(false);
          }}
        />
      )}
      {selectedSaleId && (
        <LedgerSalePopup
          saleId={selectedSaleId}
          onClose={() => setSelectedSaleId(null)}
        />
      )}
      {selectedPurchaseId && (
        <LedgerPurchasePopup
          purchaseId={selectedPurchaseId}
          onClose={() => setSelectedPurchaseId(null)}
        />
      )}
    </div>
  );
}

function LedgerFilterDrawer({ filters, isCustomer, onClose, onApply }) {
  const [draft, setDraft] = React.useState(filters);
  const set = (key, value) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <div
      className="ledger-filter-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        className="ledger-filter-drawer"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>
            <Filter size={16} /> Ledger Filters
          </h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="ledger-filter-body">
          <div className="ledger-date-range">
            <label className="field">
              <span>From date</span>
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) => {
                  set("startDate", event.target.value);
                  set("range", "all");
                }}
              />
            </label>
            <label className="field">
              <span>To date</span>
              <input
                type="date"
                value={draft.endDate}
                onChange={(event) => {
                  set("endDate", event.target.value);
                  set("range", "all");
                }}
              />
            </label>
          </div>
          <label className="field">
            <span>Date range</span>
            <select
              value={draft.range}
              onChange={(event) => {
                set("range", event.target.value);
                set("startDate", "");
                set("endDate", "");
              }}
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="quarter">This Quarter</option>
              <option value="lastQuarter">Last Quarter</option>
              <option value="year">This Year</option>
              <option value="lastYear">Last Year</option>
            </select>
          </label>
          <div className="filter-presets">
            {[
              ["today", "Today"],
              ["month", "This Month"],
              ["lastMonth", "Last Month"],
              ["quarter", "This Quarter"],
              ["lastQuarter", "Last Quarter"],
              ["year", "This Year"],
              ["lastYear", "Last Year"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={draft.range === value ? "active" : ""}
                onClick={() => {
                  set("range", value);
                  set("startDate", "");
                  set("endDate", "");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="field">
            <span>Entry type</span>
            <select
              value={draft.entryType}
              onChange={(event) => set("entryType", event.target.value)}
            >
              <option value="all">All Types</option>
              {isCustomer ? (
                <>
                  <option value="SALE">Sale</option>
                  <option value="SALE_PAYMENT">Payment</option>
                  <option value="SALES_RETURN">Return</option>
                </>
              ) : (
                <>
                  <option value="PURCHASE">Purchase</option>
                  <option value="PURCHASE_PAYMENT">Payment</option>
                  <option value="PURCHASE_RETURN">Return</option>
                </>
              )}
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select
              value={draft.paymentMethod}
              onChange={(event) => set("paymentMethod", event.target.value)}
            >
              <option value="all">All Methods</option>
              <option>CASH</option>
              <option>UPI</option>
              <option>CARD</option>
              <option>BANK_TRANSFER</option>
              <option>CHEQUE</option>
              <option>OTHER</option>
            </select>
          </label>
          <div className="filter-row">
            <label className="field">
              <span>Sort by</span>
              <select
                value={draft.sortBy}
                onChange={(event) => set("sortBy", event.target.value)}
              >
                <option value="date">Payment Date</option>
                <option value="amount">Amount</option>
              </select>
            </label>
            <label className="field">
              <span>Order</span>
              <select
                value={draft.order}
                onChange={(event) => set("order", event.target.value)}
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </label>
          </div>
        </div>
        <footer>
          <button
            type="button"
            onClick={() =>
              setDraft({
                range: "all",
                startDate: "",
                endDate: "",
                entryType: "all",
                paymentMethod: "all",
                sortBy: "date",
                order: "desc",
              })
            }
          >
            Clear
          </button>
          <button type="button" onClick={() => onApply(draft)}>
            Apply
          </button>
        </footer>
      </aside>
    </div>
  );
}

function CustomerPayment({ customerId, onSaved }) {
  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("CASH");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const payment = useMutation({
    mutationFn: (data) => api.post(`/customers/${customerId}/payments`, data),
    onSuccess: () => {
      setAmount("");
      setReferenceNumber("");
      setNotes("");
      onSaved();
    },
  });
  return (
    <Card title="Add customer payment">
      <form
        className="customer-payment-form"
        onSubmit={(event) => {
          event.preventDefault();
          payment.mutate({
            amount: Number(amount),
            paymentMethod,
            referenceNumber,
            notes,
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
          <span>Payment method</span>
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
          <span>Reference number</span>
          <input
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <Button type="submit" disabled={payment.isPending}>
          {payment.isPending ? "Saving..." : "Record payment"}
        </Button>
        {payment.isError && (
          <div className="alert errorBox">{apiError(payment.error)}</div>
        )}
        {payment.isSuccess && (
          <div className="payment-success">Payment recorded</div>
        )}
      </form>
    </Card>
  );
}

function LedgerSalePopup({ saleId, onClose }) {
  const saleQuery = useQuery({
    queryKey: ["ledger-sale", saleId],
    queryFn: async () => unwrap(await api.get(`/sales/${saleId}`)),
  });
  const sale = saleQuery.data;
  return (
    <div className="ledger-sale-popup" role="presentation" onClick={onClose}>
      <section
        className="ledger-sale-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-sale-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">Sale details</span>
            <h2 id="ledger-sale-title">
              {sale?.invoiceNumber || "Sale details"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sale details"
          >
            ×
          </button>
        </header>
        {saleQuery.isLoading ? (
          <div className="loading">Loading sale details...</div>
        ) : saleQuery.isError ? (
          <div className="alert errorBox">{apiError(saleQuery.error)}</div>
        ) : (
          sale && (
            <>
              <div className="detailGrid">
                <div>
                  <span>Customer</span>
                  <b>{sale.customer?.name || "Walk-in"}</b>
                </div>
                <div>
                  <span>Date</span>
                  <b>{date(sale.invoiceDate)}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{sale.paymentStatus}</b>
                </div>
                <div>
                  <span>Total</span>
                  <b>{money(sale.totalAmount)}</b>
                </div>
                <div>
                  <span>Due</span>
                  <b>{money(sale.dueAmount)}</b>
                </div>
              </div>
              <div className="ledger-sale-items">
                {(sale.items || []).map((item) => (
                  <div key={item.id}>
                    <strong>{item.product?.name || "Product"}</strong>
                    <span>
                      Batch {item.batch?.batchNumber || "-"} · Qty{" "}
                      {item.quantity} · Unit price {money(item.unitPrice)} ·
                      Total {money(item.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </section>
    </div>
  );
}

function LedgerPurchasePopup({ purchaseId, onClose }) {
  const purchaseQuery = useQuery({
    queryKey: ["ledger-purchase", purchaseId],
    queryFn: async () => unwrap(await api.get(`/purchases/${purchaseId}`)),
  });
  const purchase = purchaseQuery.data;

  return (
    <div className="ledger-sale-popup" role="presentation" onClick={onClose}>
      <section
        className="ledger-sale-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-purchase-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">Purchase invoice</span>
            <h2 id="ledger-purchase-title">
              {purchase?.invoiceNumber || "Purchase invoice"}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close purchase details">
            ×
          </button>
        </header>
        {purchaseQuery.isLoading ? (
          <div className="loading">Loading purchase invoice...</div>
        ) : purchaseQuery.isError ? (
          <div className="alert errorBox">{apiError(purchaseQuery.error)}</div>
        ) : (
          purchase && (
            <>
              <div className="detailGrid">
                <div>
                  <span>Supplier</span>
                  <b>{purchase.supplier?.name || "Supplier"}</b>
                </div>
                <div>
                  <span>Invoice date</span>
                  <b>{date(purchase.invoiceDate)}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b>{purchase.status} / {purchase.paymentStatus}</b>
                </div>
                <div>
                  <span>Subtotal</span>
                  <b>{money(purchase.subtotal)}</b>
                </div>
                <div>
                  <span>Discount</span>
                  <b>{money(purchase.discountAmount)}</b>
                </div>
                <div>
                  <span>Tax</span>
                  <b>{money(Number(purchase.cgstAmount) + Number(purchase.sgstAmount) + Number(purchase.igstAmount) + Number(purchase.otherTaxAmount))}</b>
                </div>
                <div>
                  <span>Invoice total</span>
                  <b>{money(purchase.totalAmount)}</b>
                </div>
                <div>
                  <span>Paid</span>
                  <b>{money(purchase.paidAmount)}</b>
                </div>
                <div>
                  <span>Due</span>
                  <b>{money(purchase.dueAmount)}</b>
                </div>
              </div>
              <div className="ledger-sale-items">
                {(purchase.items || []).map((item) => (
                  <div key={item.id}>
                    <strong>{item.product?.name || "Product"}</strong>
                    <span>
                      Batch {item.batch?.batchNumber || "-"} · Qty {item.quantity}
                      {Number(item.freeQuantity) > 0 && ` + Free ${item.freeQuantity}`} ·
                      Purchase price {money(item.purchasePrice)} · Total {money(item.totalAmount)}
                      {Number(item.returnedQuantity) > 0 && ` · Returned ${item.returnedQuantity}`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )
        )}
      </section>
    </div>
  );
}

function LedgerKpi({ icon: Icon, label, value, tone, numeric }) {
  return (
    <div className={`ledgerKpi ${tone}`}>
      <div className="ledgerKpiIcon">
        <Icon size={17} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{numeric ? value : money(value)}</strong>
      </div>
    </div>
  );
}
