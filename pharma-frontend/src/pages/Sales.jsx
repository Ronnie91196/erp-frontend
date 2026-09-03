import React from 'react';
import { useLocation } from 'react-router-dom';
import SalesList from './sales/SalesList';
import AddSalePos from './sales/AddSalePos';
import SalesDraftsPage from './sales/SalesDraftsPage';
import RefillReminders from './sales/RefillReminders';

export { SalesList, AddSalePos, SalesDraftsPage, RefillReminders };

export default function Sales() {
  const location = useLocation();
  if (location.pathname === '/modules/sales-drafts') return <SalesDraftsPage />;
  if (location.pathname === '/sales/refill-reminders' || location.pathname === '/modules/shortbook-reminders') return <RefillReminders />;
  return location.pathname.endsWith('/add') ? <AddSalePos /> : <SalesList />;
}
