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
import Doctors from "./pages/Doctors";
import SharedCustomerLedger from "./pages/SharedCustomerLedger";
import SharedCustomerInvoice from "./pages/shared/SharedCustomerInvoice";
import Users from "./pages/Users";
import Purchases from "./pages/Purchases";
import PurchaseReturns from "./pages/PurchaseReturns";
import SalesReturns from "./pages/SalesReturns";
import GstReturns from "./pages/GstReturns";
import CollectionReport from "./pages/CollectionReport";
import ScheduleDrugs from "./pages/ScheduleDrugs";
import Restocks from "./pages/Restocks";
import BillingNotes from "./pages/BillingNotes";
import AdvancedSalesReport from "./pages/AdvancedSalesReport";
import PurchasesReport from "./pages/PurchasesReport";
import BulkInvoicing from "./pages/BulkInvoicing";
import ReportsHub from "./pages/ReportsHub";
import MarginReports from "./pages/MarginReports";
import StockReports from "./pages/StockReports";
import EntelligentReports from "./pages/EntelligentReports";
import OthersReports from "./pages/OthersReports";
import AccountingReports from "./pages/AccountingReports";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Ledgers from "./pages/Ledgers";
import ApiConsole from "./pages/ApiConsole";
import ModulePlaceholder from "./pages/ModulePlaceholder";
import DrugsTrash from "./pages/trash/DrugsTrash";
import CustomersTrash from "./pages/trash/CustomersTrash";
import SuppliersTrash from "./pages/trash/SuppliersTrash";
import PurchasesTrash from "./pages/trash/PurchasesTrash";
import AyushmanSales from "./pages/sales/AyushmanSales";
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds fresh cache
      gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
      refetchOnWindowFocus: false, // Prevent excessive refetches on tab switch
      retry: 1, // Single retry on transient network errors
    },
  },
});
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
      <Route path="/p/bill/:id" element={<SharedCustomerInvoice />} />
      <Route path="/shared/invoice/:id" element={<SharedCustomerInvoice />} />
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
        path="/doctors/*"
        element={
          <Guard>
            <Doctors />
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
        path="/sales/refill-reminders"
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
        element={
          <Guard>
            <BillingNotes />
          </Guard>
        }
      />
      <Route
        path="/modules/create-debit-note"
        element={<Purchases />}
      />
      <Route
        path="/modules/drugs-trash"
        element={
          <Guard>
            <DrugsTrash />
          </Guard>
        }
      />
      <Route
        path="/modules/customers-trash"
        element={
          <Guard>
            <CustomersTrash />
          </Guard>
        }
      />
      <Route
        path="/modules/suppliers-trash"
        element={
          <Guard>
            <SuppliersTrash />
          </Guard>
        }
      />
      <Route
        path="/modules/sales-returned"
        element={
          <Guard>
            <SalesReturns />
          </Guard>
        }
      />
      <Route
        path="/modules/sales-drafts"
        element={
          <Guard>
            <Sales />
          </Guard>
        }
      />
      <Route
        path="/modules/purchases-trash"
        element={
          <Guard>
            <PurchasesTrash />
          </Guard>
        }
      />
      <Route
        path="/modules/purchase-drafts"
        element={
          <Guard>
            <Purchases />
          </Guard>
        }
      />
      <Route
        path="/modules/purchase-returns"
        element={
          <Guard>
            <PurchaseReturns />
          </Guard>
        }
      />
      <Route
        path="/modules/sales-invoice"
        element={
          <Guard>
            <BulkInvoicing />
          </Guard>
        }
      />
      <Route
        path="/modules/advanced-sales-report"
        element={
          <Guard>
            <AdvancedSalesReport />
          </Guard>
        }
      />
      <Route
        path="/modules/collection-report"
        element={
          <Guard>
            <CollectionReport />
          </Guard>
        }
      />
      <Route
        path="/modules/gst-returns"
        element={
          <Guard>
            <GstReturns />
          </Guard>
        }
      />
      <Route
        path="/modules/ayushman-sales"
        element={
          <Guard>
            <AyushmanSales />
          </Guard>
        }
      />
      <Route
        path="/modules/nrx"
        element={
          <Guard>
            <ScheduleDrugs initialType="NRX" />
          </Guard>
        }
      />
      <Route
        path="/modules/old-sales-report"
        element={
          <Guard>
            <AdvancedSalesReport />
          </Guard>
        }
      />
      <Route
        path="/modules/purchases-report"
        element={
          <Guard>
            <PurchasesReport />
          </Guard>
        }
      />
      <Route
        path="/modules/schedule-drug-reports"
        element={
          <Guard>
            <ScheduleDrugs initialType="ALL" />
          </Guard>
        }
      />
      {/* Reports Hub Central Dashboard */}
      <Route path="/modules/reports-hub" element={<Guard><ReportsHub /></Guard>} />
      <Route path="/reports" element={<Guard><ReportsHub /></Guard>} />

      {/* Margin Reports Routes */}
      <Route path="/modules/margin-reports" element={<Guard><MarginReports defaultTab="item" /></Guard>} />
      <Route path="/modules/item-wise-margin" element={<Guard><MarginReports defaultTab="item" /></Guard>} />
      <Route path="/modules/bill-item-wise-margin" element={<Guard><MarginReports defaultTab="bill-item" /></Guard>} />
      <Route path="/modules/purchase-analysis" element={<Guard><MarginReports defaultTab="purchase-analysis" /></Guard>} />

      {/* Stock Reports Routes */}
      <Route path="/modules/stock-reports" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/expiry-report" element={<Guard><StockReports defaultTab="expiry" /></Guard>} />
      <Route path="/modules/non-moving-items" element={<Guard><StockReports defaultTab="non-moving" /></Guard>} />
      <Route path="/modules/item-batch-wise-stock" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/inventory-ageing" element={<Guard><StockReports defaultTab="inventory-ageing" /></Guard>} />
      <Route path="/modules/item-wise-stock-movement" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/item-wise-closing-stock" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/annual-audit" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/stock-adjustment" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/inventory-reconciliation" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/item-mapping-logs" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />
      <Route path="/modules/oversold-overbought" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />

      {/* eNtelligent Reports Routes */}
      <Route path="/modules/entelligent-reports" element={<Guard><EntelligentReports defaultTab="monthly-overview" /></Guard>} />
      <Route path="/modules/monthly-sales-overview" element={<Guard><EntelligentReports defaultTab="monthly-overview" /></Guard>} />
      <Route path="/modules/top-selling-items" element={<Guard><EntelligentReports defaultTab="top-selling" /></Guard>} />
      <Route path="/modules/top-customers" element={<Guard><EntelligentReports defaultTab="top-customers" /></Guard>} />
      <Route path="/modules/top-distributors" element={<Guard><EntelligentReports defaultTab="top-distributors" /></Guard>} />
      <Route path="/modules/monthly-stock-valuation" element={<Guard><StockReports defaultTab="item-batch" /></Guard>} />

      {/* Others Reports Routes */}
      <Route path="/modules/others-reports" element={<Guard><OthersReports defaultTab="doctor-summary" /></Guard>} />
      <Route path="/modules/doctor-item-summary" element={<Guard><OthersReports defaultTab="doctor-summary" /></Guard>} />
      <Route path="/modules/schedule-report" element={<Guard><ScheduleDrugs initialType="ALL" /></Guard>} />
      <Route path="/modules/company-items-analysis" element={<Guard><EntelligentReports defaultTab="top-selling" /></Guard>} />
      <Route path="/modules/shortbook-reminders" element={<Guard><StockReports defaultTab="non-moving" /></Guard>} />
      <Route path="/modules/staff-wise-activity" element={<Guard><OthersReports defaultTab="staff-activity" /></Guard>} />
      <Route path="/modules/extra-charges-report" element={<Guard><OthersReports defaultTab="sales-summary" /></Guard>} />
      <Route path="/modules/sales-summary-report" element={<Guard><OthersReports defaultTab="sales-summary" /></Guard>} />

      {/* Accounting Reports Routes */}
      <Route path="/modules/accounting-reports" element={<Guard><AccountingReports /></Guard>} />

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
