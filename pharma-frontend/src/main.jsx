import DrugList from "./pages/DrugList";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles.css";
import Layout from "./components/layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Batches from "./pages/Batches";
import ProductSuppliers from "./pages/ProductSuppliers";
import Suppliers from "./pages/Suppliers";
import Customers from "./pages/Customers";
import SharedCustomerLedger from "./pages/SharedCustomerLedger";
import Users from "./pages/Users";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Ledgers from "./pages/Ledgers";
import ApiConsole from "./pages/ApiConsole";
import ModulePlaceholder from "./pages/ModulePlaceholder";
const qc = new QueryClient();
function Guard({ children }) {
  return localStorage.getItem("pharma_token") ? (
    <Layout>{children}</Layout>
  ) : (
    <Navigate to="/login" replace />
  );
}
function Placeholder({ title }) {
  return (
    <Guard>
      <ModulePlaceholder title={title} />
    </Guard>
  );
}
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/shared/customer-ledger/:token" element={<SharedCustomerLedger />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <Guard>
            <Dashboard />
          </Guard>
        }
      />
      <Route
        path="/products"
        element={
          <Guard>
            <DrugList />
          </Guard>
        }
      />
      <Route
        path="/products/batches"
        element={
          <Guard>
            <Batches />
          </Guard>
        }
      />
      <Route
        path="/products/suppliers"
        element={
          <Guard>
            <ProductSuppliers />
          </Guard>
        }
      />
      <Route
        path="/products/*"
        element={
          <Guard>
            <Products />
          </Guard>
        }
      />
      <Route
        path="/suppliers/*"
        element={
          <Guard>
            <Suppliers />
          </Guard>
        }
      />
      <Route
        path="/customers/*"
        element={
          <Guard>
            <Customers />
          </Guard>
        }
      />
      <Route
        path="/users/*"
        element={
          <Guard>
            <Users />
          </Guard>
        }
      />
      <Route
        path="/purchases/*"
        element={
          <Guard>
            <Purchases />
          </Guard>
        }
      />
      <Route
        path="/sales/*"
        element={
          <Guard>
            <Sales />
          </Guard>
        }
      />
      <Route
        path="/sales/add"
        element={
          <Guard>
            <Sales />
          </Guard>
        }
      />
      <Route
        path="/stock/*"
        element={
          <Guard>
            <Inventory />
          </Guard>
        }
      />
      <Route
        path="/inventory/*"
        element={
          <Guard>
            <Inventory />
          </Guard>
        }
      />
      <Route
        path="/customers/ledger/*"
        element={
          <Guard>
            <Ledgers type="customer" />
          </Guard>
        }
      />
      <Route
        path="/suppliers/ledger/*"
        element={
          <Guard>
            <Ledgers type="supplier" />
          </Guard>
        }
      />
      <Route
        path="/api-console"
        element={
          <Guard>
            <ApiConsole />
          </Guard>
        }
      />
      <Route
        path="/modules/billing-notes"
        element={<Placeholder title="Billing Notes" />}
      />
      <Route
        path="/modules/create-debit-note"
        element={<Placeholder title="Create Debit Note" />}
      />
      <Route
        path="/modules/drugs-trash"
        element={<Placeholder title="Drugs Trash" />}
      />
      <Route
        path="/modules/customers-trash"
        element={<Placeholder title="Customers Trash" />}
      />
      <Route
        path="/modules/suppliers-trash"
        element={<Placeholder title="Suppliers Trash" />}
      />
      <Route
        path="/modules/sales-returned"
        element={<Placeholder title="Returned Sales" />}
      />
      <Route
        path="/modules/sales-drafts"
        element={<Placeholder title="Sales Drafts" />}
      />
      <Route
        path="/modules/purchase-orders"
        element={<Placeholder title="Purchase Orders" />}
      />
      <Route
        path="/modules/restocks"
        element={<Placeholder title="Restocks" />}
      />
      <Route
        path="/modules/purchases-trash"
        element={<Placeholder title="Purchases Trash" />}
      />
      <Route
        path="/modules/purchase-drafts"
        element={<Placeholder title="Purchase Drafts" />}
      />
      <Route
        path="/modules/sales-invoice"
        element={<Placeholder title="Sales Invoice" />}
      />
      <Route
        path="/modules/advanced-sales-report"
        element={<Placeholder title="Sales Report" />}
      />
      <Route
        path="/modules/collection-report"
        element={<Placeholder title="Collection Report" />}
      />
      <Route
        path="/modules/gst-returns"
        element={<Placeholder title="GST Returns" />}
      />
      <Route
        path="/modules/ayushman-sales"
        element={<Placeholder title="Ayushman Sales" />}
      />
      <Route path="/modules/nrx" element={<Placeholder title="NRX" />} />
      <Route
        path="/modules/old-sales-report"
        element={<Placeholder title="Sales Report" />}
      />
      <Route
        path="/modules/purchases-report"
        element={<Placeholder title="Purchases Report" />}
      />
      <Route
        path="/modules/schedule-drug-reports"
        element={<Placeholder title="Schedule Drug Reports" />}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={qc}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
