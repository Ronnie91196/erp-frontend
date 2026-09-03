import React from 'react';
import { useLocation } from 'react-router-dom';
import PurchaseList from './purchases/PurchaseList';
import AddPurchaseForm from './purchases/AddPurchaseForm';
import PurchaseDraftsPage from './purchases/PurchaseDraftsPage';
import { PurchaseDetail, PurchaseReturnPage } from './purchases/PurchaseDetail';

export { PurchaseList, AddPurchaseForm, PurchaseDraftsPage, PurchaseDetail, PurchaseReturnPage };

export default function Purchases() {
  const location = useLocation();
  if (location.pathname === '/modules/purchase-drafts') return <PurchaseDraftsPage />;
  if (location.pathname === '/modules/create-debit-note') return <PurchaseReturnPage />;
  if (location.pathname.endsWith('/add')) return <AddPurchaseForm />;
  if (/^\/purchases\/[^/]+$/.test(location.pathname)) return <PurchaseDetail />;
  return <PurchaseList />;
}
