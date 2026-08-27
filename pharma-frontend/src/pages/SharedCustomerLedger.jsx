import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import api, { apiError, unwrap } from "../lib/api";
import { Badge, Card, Table, date, money } from "../components/ui";

export default function SharedCustomerLedger() {
  const { token } = useParams();
  const query = useQuery({
    queryKey: ["shared-customer-ledger", token],
    queryFn: async () => unwrap(await api.get(`/public/customer-ledgers/${token}`)),
  });
  if (query.isLoading) return <div className="shared-ledger-page"><div className="loading">Loading shared ledger...</div></div>;
  if (query.isError) return <div className="shared-ledger-page"><div className="alert errorBox">{apiError(query.error)}</div></div>;
  const { customer, entries = [], summary = {} } = query.data || {};
  return (
    <div className="shared-ledger-page">
      <div className="shared-ledger-header"><span className="eyebrow">Customer ledger</span><h1>{customer?.name || "Shared ledger"}</h1><p>Account statement shared by your pharmacy.</p></div>
      <div className="shared-ledger-summary">
        <div><span>Opening balance</span><strong>{money(customer?.openingBalance)}</strong></div>
        <div><span>Total debit</span><strong>{money(summary.totalDebit)}</strong></div>
        <div><span>Total credit</span><strong>{money(summary.totalCredit)}</strong></div>
        <div><span>Current balance</span><strong>{money(summary.balance)}</strong></div>
      </div>
      <Card title="Transaction history">
        <Table columns={[
          { key: "entryDate", label: "Date", render: (row) => date(row.entryDate) },
          { key: "entryType", label: "Type", render: (row) => <Badge tone={row.debit > 0 ? "warning" : "success"}>{String(row.entryType || "ENTRY").replaceAll("_", " ")}</Badge> },
          { key: "description", label: "Description", render: (row) => <div><strong>{row.description || "Ledger entry"}</strong>{row.referenceNumber && <small className="reference">Ref: {row.referenceNumber}</small>}</div> },
          { key: "debit", label: "Debit", render: (row) => <span className="amount debit">{row.debit ? money(row.debit) : "-"}</span> },
          { key: "credit", label: "Credit", render: (row) => <span className="amount credit">{row.credit ? money(row.credit) : "-"}</span> },
          { key: "balance", label: "Balance", render: (row) => <strong>{money(row.balance)}</strong> },
        ]} rows={entries} />
      </Card>
    </div>
  );
}
