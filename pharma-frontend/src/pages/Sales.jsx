import React, { useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import api, { unwrap } from '../lib/api';

const catalog = [
  { id: 'p1', name: 'Cetrizine 10mg', batch: 'CT-102', expiry: '2028-11-30', mrp: 42.5 },
  { id: 'p2', name: 'Amoxicillin 500mg', batch: 'AMX-205', expiry: '2028-10-22', mrp: 86.0 },
  { id: 'p3', name: 'Metformin 500mg', batch: 'MET-440', expiry: '2028-09-17', mrp: 54.25 },
  { id: 'p4', name: 'Amlodipine 5mg', batch: 'AML-87', expiry: '2028-12-09', mrp: 63.75 },
  { id: 'p5', name: 'Vitamin D3 60k', batch: 'VD3-56', expiry: '2029-01-12', mrp: 128.0 },
  { id: 'p6', name: 'Ibuprofen 200mg', batch: 'IBU-32', expiry: '2028-08-18', mrp: 28.4 },
];

const demoSales = [
  { invoice: 'INV-1048', customer: 'Cedar Grove Clinic', date: '2026-08-25', total: 2840, status: 'Paid' },
  { invoice: 'INV-1047', customer: 'Westside Pharmacy', date: '2026-08-24', total: 1120.5, status: 'Pending' },
  { invoice: 'INV-1046', customer: 'Dr. Lena Okafor', date: '2026-08-23', total: 486, status: 'Paid' },
];

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function createEmptyRow() {
  return {
    productId: '',
    batchId: '',
    packagingId: '',
    itemName: '',
    batch: '',
    expiry: '',
    qty: 1,
    tabs: 0,
    mrp: 0,
    disc: 0,
    total: 0,
  };
}

function SalesList() {
  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">POS</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-800">Sales</h2>
        </div>
        <a
          href="/sales/add"
          className="inline-flex items-center rounded-xl bg-[#057A72] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#046a64]"
        >
          + New sale
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Recent invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {demoSales.map((sale) => (
                <tr key={sale.invoice} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-800">{sale.invoice}</td>
                  <td className="px-4 py-3 text-slate-700">{sale.customer}</td>
                  <td className="px-4 py-3 text-slate-600">{sale.date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{money(sale.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sale.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {sale.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AddSalePos() {
  const [mode, setMode] = useState('Retail');
  const [customer, setCustomer] = useState('Cash Sale');
  const [customerId, setCustomerId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidAmount, setPaidAmount] = useState('0');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [doctor, setDoctor] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([createEmptyRow()]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState(catalog.slice(0, 5));
  const itemSearchRef = useRef(null);
  const qtyRefs = useRef([]);
  const tabsRefs = useRef([]);
  const discRefs = useRef([]);
  const productsQuery = useQuery({ queryKey: ['sale-products'], queryFn: async () => unwrap(await api.get('/products')) });
  const customersQuery = useQuery({ queryKey: ['sale-customers'], queryFn: async () => unwrap(await api.get('/customers')) });
  const saveSale = useMutation({
    mutationFn: async ({ saleRows, paid, draft }) => {
      const sale = unwrap(await api.post('/sales', {
        customerId: customerId || null,
        invoiceNumber: `INV-${Date.now()}`,
        invoiceDate: new Date().toISOString(),
        discountPercent: Number(discountPercent || 0),
        status: draft ? 'DRAFT' : 'COMPLETED',
        notes,
        items: saleRows.map((row) => ({ productId: row.productId, batchId: row.batchId, packagingId: row.packagingId || undefined, quantity: Number(row.qty || 0), unitPrice: Number(row.mrp || 0) })),
      }));
      if (!draft && paid > 0) await api.post(`/sales/${sale.id}/payments`, { amount: paid, paymentMethod: paymentMethod.toUpperCase(), notes });
      return sale;
    },
  });

  const products = productsQuery.data || [];
  const customers = customersQuery.data || [];
  const availableProducts = products.flatMap((product) => (product.batches || []).filter((batch) => Number(batch.stocks?.[0]?.quantity || 0) > 0).map((batch) => ({
    id: product.id,
    name: product.name,
    batchId: batch.id,
    batch: batch.batchNumber,
    expiry: batch.expiryDate?.slice(0, 10) || '',
    mrp: Number(batch.sellingPrice || 0),
    packagingId: product.packaging?.[0]?.id || '',
  })));

  const updateRow = (index, key, value) => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const next = { ...row, [key]: value };
        const qty = Number(next.qty || 0);
        const tabs = Number(next.tabs || 0);
        const mrp = Number(next.mrp || 0);
        const disc = Number(next.disc || 0);
        const saleQty = qty + tabs;
        const subtotal = saleQty * mrp;
        const adjustedDiscount = subtotal * (disc / 100);
        const total = subtotal - adjustedDiscount;

        return { ...next, total };
      }),
    );
  };

  const applySuggestedProduct = (product, index) => {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return {
          ...row,
          productId: product.id,
          batchId: product.batchId,
          packagingId: product.packagingId,
          itemName: product.name,
          batch: product.batch,
          expiry: product.expiry,
          mrp: product.mrp,
          qty: 1,
          tabs: 0,
          disc: 0,
          total: product.mrp,
        };
      }),
    );
    setQuery('');
    setSuggestions(catalog.slice(0, 5));
    setTimeout(() => qtyRefs.current[index]?.focus(), 0);
  };

  const addRow = () => {
    setRows((current) => [...current, createEmptyRow()]);
    setTimeout(() => itemSearchRef.current?.focus(), 0);
  };

  const handleSearchInput = (value) => {
    setQuery(value);
    const term = value.trim().toLowerCase();
    if (!term) {
      setSuggestions(availableProducts.slice(0, 5));
      return;
    }
    setSuggestions(availableProducts.filter((item) => `${item.name} ${item.batch}`.toLowerCase().includes(term)).slice(0, 6));
  };

  const addCurrentItem = () => {
    const current = rows[0];
    if (!current.productId || Number(current.qty || 0) <= 0) return;
    setRows((currentRows) => [createEmptyRow(), ...currentRows]);
    setQuery('');
    setSuggestions(availableProducts.slice(0, 5));
    setTimeout(() => itemSearchRef.current?.focus(), 20);
  };

  const focusField = (index, fieldType) => {
    const map = {
      qty: qtyRefs.current[index],
      tabs: tabsRefs.current[index],
      disc: discRefs.current[index],
    };
    map[fieldType]?.focus();
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter' && suggestions[0]) {
      event.preventDefault();
      applySuggestedProduct(suggestions[0], 0);
    }
    if (event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      itemSearchRef.current?.focus();
    }
  };

  const handleRowKeyDown = (event, index, fieldType) => {
    if (event.key === 'Tab' && fieldType === 'qty') {
      event.preventDefault();
      focusField(index, 'tabs');
    }
    if (event.key === 'Tab' && fieldType === 'tabs') {
      event.preventDefault();
      focusField(index, 'disc');
    }
    if (event.key === 'Enter' && fieldType === 'disc') {
      event.preventDefault();
      const current = rows[index];
      if (current?.itemName) {
        addCurrentItem();
      }
    }
  };

  const summary = useMemo(() => {
    const subTotal = rows.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.mrp || 0), 0);
    const overallDiscount = rows.reduce((sum, row) => {
      const itemTotal = Number(row.qty || 0) * Number(row.mrp || 0);
      return sum + itemTotal * (Number(row.disc || 0) / 100);
    }, 0);
    const tax = subTotal * 0.05;
    const grandTotal = subTotal - overallDiscount + tax;
    return {
      subTotal,
      discount: overallDiscount,
      tax,
      grandTotal,
    };
  }, [rows]);

  const paid = Number(paidAmount || 0);
  const change = paid - summary.grandTotal;
  const submitSale = (event) => {
    event.preventDefault();
    const saleRows = rows.filter((row) => row.productId && Number(row.qty || 0) > 0);
    if (!saleRows.length) return;
    saveSale.mutate({ saleRows, paid: paymentStatus === 'Paid' ? Math.min(paid, summary.grandTotal) : paid });
  };
  const saveDraft = () => {
    const saleRows = rows.filter((row) => row.productId && Number(row.qty || 0) > 0);
    if (saleRows.length) saveSale.mutate({ saleRows, paid: 0, draft: true });
  };

  return (
    <div className="min-h-screen bg-[#edf5f4] text-slate-800">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" type="button">
              ?
            </button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700">Billing</p>
              <h1 className="text-xl font-bold text-slate-800">Add Sale</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Clear</button>
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Drafts</button>
            <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Scan Mode</button>
            <div className="ml-1 inline-flex rounded-lg border border-[#057A72] bg-[#057A72] p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode('Retail')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'Retail' ? 'bg-white text-[#057A72]' : 'text-white'}`}
              >
                Retail
              </button>
              <button
                type="button"
                onClick={() => setMode('Wholesale')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${mode === 'Wholesale' ? 'bg-white text-[#057A72]' : 'text-white'}`}
              >
                Wholesale
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] space-y-4 px-4 py-4 sm:px-6">
        <div className="grid gap-4 bg-slate-50 p-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Customer</label>
            <input
              value={customer}
              onChange={(event) => { setCustomer(event.target.value); setCustomerId(''); }}
              autoFocus
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#057A72] focus:bg-white focus:ring-4 focus:ring-teal-100"
              placeholder="Mobile / Name"
            />
            {customer && !customerId && customers.filter((item) => `${item.name} ${item.phone || ''} ${item.email || ''}`.toLowerCase().includes(customer.toLowerCase())).slice(0, 5).map((item) => (
              <button key={item.id} type="button" onClick={() => { setCustomerId(item.id); setCustomer(item.name); }} className="mt-1 block w-full rounded-lg bg-teal-50 px-3 py-2 text-left text-xs font-semibold text-teal-800">{item.name} <span className="font-normal text-slate-500">{item.phone || item.email || ''}</span></button>
            ))}
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>Default</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">Cash Sale</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Payment Status
                <select
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:bg-white focus:ring-4 focus:ring-teal-100"
                >
                  <option>Paid</option>
                  <option>Unpaid</option>
                </select>
              </label>

              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Method
                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:bg-white focus:ring-4 focus:ring-teal-100"
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </label>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Paid Amount
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
              </label>

              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Discount %
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:bg-white focus:ring-4 focus:ring-teal-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Doctor</label>
            <input
              value={doctor}
              onChange={(event) => setDoctor(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-[#057A72] focus:bg-white focus:ring-4 focus:ring-teal-100"
              placeholder="Prescribing Doctor / Reg No."
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1600px] w-full border-collapse text-left">
              <thead>
                <tr className="bg-teal-50 text-teal-800">
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">S.No</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Type (Rx)</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Item Name</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Batch</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Expiry</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Qty (Pack)</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Tabs (Loose)</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">MRP</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Disc %</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Total</th>
                  <th className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.18em]">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`row-${index}`} className={`${index === 0 ? 'bg-blue-50/30' : 'bg-white'} align-top`}>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm font-medium text-slate-600">{index + 1}</td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#057A72] focus:ring-2 focus:ring-teal-100">
                        <option>Rx</option>
                        <option>OTC</option>
                      </select>
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      {index === 0 ? (
                        <div className="relative">
                          <input
                            ref={itemSearchRef}
                            data-search-input="true"
                            value={index === 0 ? query : row.itemName}
                            onChange={(event) => {
                              if (index === 0) {
                                handleSearchInput(event.target.value);
                              } else {
                                updateRow(index, 'itemName', event.target.value);
                              }
                            }}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Search item (Alt+S)..."
                            className="h-9 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm text-slate-700 outline-none ring-0 transition focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                          />
                          {index === 0 && suggestions.length > 0 && query.trim() && (
                            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                              {suggestions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => applySuggestedProduct(item, index)}
                                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                >
                                  <span className="font-medium text-slate-700">{item.name}</span>
                                  <span className="text-xs text-slate-500">{item.batch}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          value={row.itemName}
                          onChange={(event) => updateRow(index, 'itemName', event.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                          placeholder="Item name"
                        />
                      )}
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      <input
                        value={row.batch}
                        onChange={(event) => updateRow(index, 'batch', event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                      />
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      <input
                        value={row.expiry}
                        onChange={(event) => updateRow(index, 'expiry', event.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                      />
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      <input
                        ref={(node) => {
                          qtyRefs.current[index] = node;
                        }}
                        type="number"
                        value={row.qty}
                        onChange={(event) => updateRow(index, 'qty', Number(event.target.value || 0))}
                        onKeyDown={(event) => handleRowKeyDown(event, index, 'qty')}
                        className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                      />
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      <input
                        ref={(node) => {
                          tabsRefs.current[index] = node;
                        }}
                        type="number"
                        value={row.tabs}
                        onChange={(event) => updateRow(index, 'tabs', Number(event.target.value || 0))}
                        onKeyDown={(event) => handleRowKeyDown(event, index, 'tabs')}
                        className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                      />
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      <input
                        value={row.mrp}
                        onChange={(event) => updateRow(index, 'mrp', Number(event.target.value || 0))}
                        className="h-9 w-24 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                      />
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm">
                      <input
                        ref={(node) => {
                          discRefs.current[index] = node;
                        }}
                        type="number"
                        value={row.disc}
                        onChange={(event) => updateRow(index, 'disc', Number(event.target.value || 0))}
                        onKeyDown={(event) => handleRowKeyDown(event, index, 'disc')}
                        className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:ring-4 focus:ring-teal-100"
                      />
                    </td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm font-semibold text-slate-800">{money(row.total)}</td>
                    <td className="border-t border-slate-200 px-2 py-2 text-sm"><button type="button" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-600">Additional notes</h3>
              <button type="button" className="text-xs font-semibold text-teal-700">Collapse</button>
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-[#057A72] focus:bg-white focus:ring-4 focus:ring-teal-100"
              placeholder="Clinical notes / delivery remarks"
            />
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-teal-200 bg-teal-50 px-3 py-6 text-center text-sm font-medium text-teal-700">
              <span>+</span>
              <span>Upload Prescription</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-30 border-t border-[#0d5e59] bg-[#057A72] text-white shadow-[0_-8px_24px_rgba(13,78,72,0.18)]">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-teal-50">
            <span>Sub Total <strong className="ml-1 text-base text-white">{money(summary.subTotal)}</strong></span>
            <span>- Disc <strong className="ml-1 text-base text-white">{money(summary.discount)}</strong></span>
            <span>+ Tax <strong className="ml-1 text-base text-white">{money(summary.tax)}</strong></span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.12em] text-white/85">=</span>
            <span className="text-xl font-black text-white">GRAND TOTAL {money(summary.grandTotal)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={saveDraft} disabled={saveSale.isPending} className="rounded-xl border border-white/40 bg-transparent px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60">
              Save Draft (Ctrl+D)
            </button>
            <button type="button" onClick={submitSale} disabled={saveSale.isPending} className="rounded-xl bg-[#4ade80] px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md hover:bg-[#3ad26d] disabled:cursor-not-allowed disabled:opacity-60">
              Generate Bill (F10)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const location = useLocation();
  return location.pathname.endsWith('/add') ? <AddSalePos /> : <SalesList />;
}
