import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, ArrowDown, ArrowUp, Building2, CalendarDays, Check, ChevronDown, Edit3, Filter, Link2, MoreVertical, Plus, RotateCcw, Search, Tag, X } from 'lucide-react';
import api, { apiError, unwrap } from '../lib/api';

const dosageForms = ['Bar', 'Capsule', 'Cream', 'Drops', 'Gel', 'Inhaler', 'Inhalation', 'Injection', 'Liquid', 'Tablet'];

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(Number(value || 0));

function getBatch(product) {
  const batches = product.batches || [];
  const batch = batches[0];
  const stock = batches.reduce((total, currentBatch) => (
    total + (currentBatch.stocks || []).reduce((batchTotal, item) => batchTotal + Number(item.quantity || 0), 0)
  ), 0);
  return {
    batch: batch?.batchNumber || '-',
    stock,
    price: Number(batch?.mrp ?? product.mrp ?? 0),
    costPrice: Number(batch?.purchasePrice ?? batch?.costPerBaseUnit ?? 0),
    expiry: batch?.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : '-',
  };
}

function getPackagingLabel(product) {
  const packaging = product.packaging?.[0];
  if (!packaging) return '-';
  if (packaging.name && !['Tablet', 'Capsule'].includes(packaging.name)) return packaging.name;
  const form = String(product.dosageForm || '').toLowerCase();
  if (form.includes('cream') || form.includes('gel')) return '10gm';
  if (form.includes('syrup') || form.includes('liquid') || form.includes('drop')) return '100ml';
  return Number(packaging.conversionToBase) === 10 ? '1*10' : '1*15';
}

function isUnexpired(expiry) {
  if (expiry === '-') return true;
  const [month, year] = expiry.split('/').map(Number);
  const expiryDate = new Date(2000 + year, month, 0);
  return expiryDate >= new Date();
}

const initialFilters = { sortBy: 'genericName', sortDirection: 'asc', schedule: 'all', availability: 'all', lowStockOnly: false, expiry: 'all', supplier: '' };

function expiryState(expiry) {
  if (expiry === '-') return 'unknown';
  const [month, year] = expiry.split('/').map(Number);
  const expiryDate = new Date(2000 + year, month - 1, 1);
  const now = new Date();
  const monthsAway = (expiryDate.getFullYear() - now.getFullYear()) * 12 + expiryDate.getMonth() - now.getMonth();
  if (expiryDate < now) return 'expired';
  if (monthsAway <= 1) return 'oneMonth';
  if (monthsAway <= 2) return 'twoMonths';
  if (monthsAway <= 3) return 'threeMonths';
  return 'valid';
}

function FilterDrawer({ filters, suppliers, onApply, onClose }) {
  const [draft, setDraft] = React.useState(filters);
  const setFilter = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const optionClass = (active) => active ? 'drawer-option selected' : 'drawer-option';
  return (
    <div className="filter-drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="filter-drawer" role="dialog" aria-modal="true" aria-labelledby="filter-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="filter-drawer-header"><div><h2 id="filter-title"><Filter size={16} /> Filter Inventory</h2><p>Refine drug listings &amp; view parameters</p></div><button type="button" onClick={onClose} aria-label="Close filters"><X size={18} /></button></header>
        <div className="filter-drawer-body">
          <section className="filter-section"><h3><ArrowUp size={14} /> Sort By &amp; Direction</h3><div className="drawer-grid two">{[['genericName', 'Generic Name'], ['stock', 'Stock Quantity'], ['expiry', 'Expiry Date'], ['createdAt', 'Date Added']].map(([value, label]) => <button type="button" key={value} className={optionClass(draft.sortBy === value)} onClick={() => setFilter('sortBy', value)}>{label}{draft.sortBy === value && <Check size={13} />}</button>)}</div><div className="direction-toggle"><button type="button" className={draft.sortDirection === 'asc' ? 'active' : ''} onClick={() => setFilter('sortDirection', 'asc')}><ArrowUp size={13} /> Ascending</button><button type="button" className={draft.sortDirection === 'desc' ? 'active' : ''} onClick={() => setFilter('sortDirection', 'desc')}><ArrowDown size={13} /> Descending</button></div></section>
          <section className="filter-section"><h3><Tag size={14} /> Drug Schedule</h3><div className="drawer-pills">{[['all', 'All Types'], ['nrx', 'NRx Narcotic'], ['h1', 'Schedule H1'], ['otc', 'OTC'], ['h', 'Schedule H'], ['g', 'Schedule G']].map(([value, label]) => <button type="button" key={value} className={optionClass(draft.schedule === value)} onClick={() => setFilter('schedule', value)}>{label}</button>)}</div></section>
          <section className="filter-section"><h3><Archive size={14} /> Stock Availability</h3><div className="segmented-filter">{[['all', 'All Items'], ['inStock', 'In Stock'], ['outOfStock', 'Out of Stock']].map(([value, label]) => <button type="button" key={value} className={draft.availability === value ? 'active' : ''} onClick={() => setFilter('availability', value)}>{label}</button>)}</div><label className="switch-row"><span><AlertTriangle size={14} /> Low Stock Alert Only<small>Stock &lt; Reorder threshold</small></span><input type="checkbox" checked={draft.lowStockOnly} onChange={(event) => setFilter('lowStockOnly', event.target.checked)} /><i /></label></section>
          <section className="filter-section"><h3><CalendarDays size={14} /> Expiry Status</h3><div className="drawer-grid two">{[['valid', 'Valid Stock'], ['expired', 'Expired Only'], ['oneMonth', 'Expiring in 1 Mo'], ['twoMonths', 'Expiring in 2 Mo'], ['threeMonths', 'Expiring in 3 Mo'], ['all', 'All Expiries']].map(([value, label]) => <button type="button" key={value} className={optionClass(draft.expiry === value)} onClick={() => setFilter('expiry', value)}><i className={`status-dot ${value}`} />{label}{draft.expiry === value && <Check size={13} />}</button>)}</div></section>
          <section className="filter-section"><h3><Building2 size={14} /> Suppliers ({suppliers.length})</h3><div className="supplier-search"><Search size={14} /><input value={draft.supplier} onChange={(event) => setFilter('supplier', event.target.value)} placeholder="Search suppliers..." /></div><div className="supplier-list">{suppliers.filter((supplier) => supplier.toLowerCase().includes(draft.supplier.toLowerCase())).map((supplier) => <button type="button" key={supplier} className={draft.supplier === supplier ? 'selected' : ''} onClick={() => setFilter('supplier', supplier)}>{supplier}</button>)}</div></section>
        </div>
        <footer className="filter-drawer-footer"><button type="button" className="reset-filter" onClick={() => setDraft(initialFilters)}><RotateCcw size={14} /> Reset All</button><button type="button" className="apply-filter" onClick={() => onApply(draft)}><Check size={14} /> Apply Filters</button></footer>
      </aside>
    </div>
  );
}

function DrugDetailsModal({ product, onClose }) {
  const detailQuery = useQuery({
    queryKey: ['product-detail', product.id],
    queryFn: async () => unwrap(await api.get(`/products/${product.id}`)),
  });
  const historyQuery = useQuery({
    queryKey: ['product-purchase-history', product.id],
    queryFn: async () => unwrap(await api.get(`/products/${product.id}/purchase-history`)),
  });
  const detail = detailQuery.data || product;
  const batch = getBatch(product);
  return (
    <div className="drug-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="drug-details-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drug-modal-header"><h2>{detail.name} <span>Drug Details</span></h2><button type="button" className="drug-modal-close" onClick={onClose} aria-label="Close details"><X size={18} /></button></header>
        <div className="drug-details-body">
          <div className="drug-detail-summary"><div><small>SKU</small><strong>{detail.sku || '-'}</strong></div><div><small>Packaging</small><strong>{getPackagingLabel(detail)}</strong></div><div><small>Stock</small><strong>{batch.stock}</strong></div><div><small>MRP</small><strong>{money(batch.price)}</strong></div><div><small>HSN</small><strong>{detail.hsnCode || '-'}</strong></div></div>
          <section className="details-section"><h3>Salts</h3>{detail.salts?.length ? <div className="drug-salt-list">{detail.salts.map((mapping) => <span key={mapping.id}>{mapping.salt?.name}</span>)}</div> : <p className="details-muted">No salts mapped.</p>}</section>
          <section className="details-section"><h3>Other products with the same salt</h3>{detailQuery.isLoading ? <p className="details-muted">Loading related products...</p> : detail.relatedProducts?.length ? <div className="related-product-list">{detail.relatedProducts.map((related) => <div key={related.id}><strong>{related.name}</strong><span>{related.brandName || related.genericName || related.sku}</span></div>)}</div> : <p className="details-muted">No other products share this salt.</p>}</section>
          <section className="details-section"><h3>Supplier Details</h3>{product.suppliers?.length ? <div className="details-table"><div className="details-table-head"><span>Supplier</span><span>Phone</span><span>Purchase Price</span><span>Preferred</span></div>{product.suppliers.map((mapping) => <div className="details-table-row" key={mapping.id}><span>{mapping.supplier?.name || '-'}</span><span>{mapping.supplier?.phone || '-'}</span><span>{money(mapping.purchasePrice)}</span><span>{mapping.isPreferred ? 'Yes' : 'No'}</span></div>)}</div> : <p className="details-muted">No supplier mappings found.</p>}</section>
          <section className="details-section"><h3>Purchase History</h3>{historyQuery.isLoading ? <p className="details-muted">Loading purchase history...</p> : historyQuery.data?.length ? <div className="details-table"><div className="details-table-head"><span>Invoice</span><span>Date</span><span>Supplier</span><span>Batch / Qty</span><span>Total</span></div>{historyQuery.data.map((item) => <div className="details-table-row" key={item.id}><span>{item.purchase?.invoiceNumber || '-'}</span><span>{item.purchase?.invoiceDate ? new Date(item.purchase.invoiceDate).toLocaleDateString('en-IN') : '-'}</span><span>{item.purchase?.supplier?.name || '-'}</span><span>{item.batch?.batchNumber || '-'} / {item.quantity}</span><span>{money(item.totalAmount)}</span></div>)}</div> : <p className="details-muted">No purchase history found for this drug.</p>}</section>
        </div>
      </section>
    </div>
  );
}

function MapSaltModal({ product, onClose, onMapped, saving, error }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [selectedSalt, setSelectedSalt] = React.useState(null);
  const [newSaltName, setNewSaltName] = React.useState('');
  const saltsQuery = useQuery({
    queryKey: ['salts', search],
    queryFn: async () => unwrap(await api.get('/products/salts', { params: { search } })),
  });
  const createSalt = useMutation({
    mutationFn: (name) => api.post('/products/salts', { name }),
    onSuccess: async ({ data }) => {
      const salt = data.data;
      await queryClient.invalidateQueries({ queryKey: ['salts'] });
      setSearch(salt.name);
      setSelectedSalt(salt);
      setNewSaltName('');
    },
  });
  const mappedSaltIds = new Set((product.salts || []).map((mapping) => mapping.saltId));
  const suggestions = (saltsQuery.data || []).filter((salt) => !mappedSaltIds.has(salt.id));

  return (
    <div className="drug-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="map-salt-modal" role="dialog" aria-modal="true" aria-labelledby="map-salt-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drug-modal-header"><h2 id="map-salt-title">Map salt to {product.name}</h2><button type="button" className="drug-modal-close" onClick={onClose} aria-label="Close salt mapping"><X size={18} /></button></header>
        <div className="map-salt-body">
          <label className="map-salt-search"><Search size={17} /><input autoFocus value={search} onChange={(event) => { setSearch(event.target.value); setSelectedSalt(null); }} placeholder="Search salts..." /></label>
          <form className="add-salt-form" onSubmit={(event) => { event.preventDefault(); createSalt.mutate(newSaltName); }}><input value={newSaltName} onChange={(event) => setNewSaltName(event.target.value)} placeholder="Salt not listed? Add new salt" /><button type="submit" disabled={!newSaltName.trim() || createSalt.isPending}><Plus size={15} />{createSalt.isPending ? 'Adding...' : 'Add salt'}</button></form>
          <div className="salt-suggestions">{saltsQuery.isLoading ? <p className="details-muted">Loading salt suggestions...</p> : suggestions.length ? suggestions.map((salt) => <button type="button" className={selectedSalt?.id === salt.id ? 'selected' : ''} key={salt.id} onClick={() => setSelectedSalt(salt)}><span>{salt.name}</span>{selectedSalt?.id === salt.id && <Check size={16} />}</button>) : <p className="details-muted">No unmapped salts found.</p>}</div>
        </div>
        <footer className="drug-modal-footer">{(error || createSalt.error) && <p className="drug-save-error">{error || apiError(createSalt.error)}</p>}<button type="button" className="drug-cancel" onClick={onClose} disabled={saving || createSalt.isPending}>Cancel</button><button type="button" className="drug-update" onClick={() => onMapped(selectedSalt.id)} disabled={!selectedSalt || saving || createSalt.isPending}>{saving ? 'Mapping...' : 'Map salt'}</button></footer>
      </section>
    </div>
  );
}

function UpdateDrugModal({ product, onClose, onSaved, saving, error }) {
  const batch = getBatch(product);
  const [form, setForm] = React.useState({
    name: product.name || '', stock: batch.stock, batch: batch.batch === '-' ? '' : batch.batch,
    hsn: product.hsnCode || '', costPrice: batch.costPrice || '', mrp: batch.price || '', expiry: batch.expiry === '-' ? '' : batch.expiry,
    rack: product.rack || '', unitsPack: product.packaging?.[0]?.conversionToBase || '', dosageForm: product.dosageForm || '', scheduling: product.scheduling || '',
    barcode: product.barcode || '', reorderLevel: product.reorderLevel || 0, cgst: 0, sgst: 0, igst: product.gstPercent || 0,
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="drug-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="drug-modal" role="dialog" aria-modal="true" aria-labelledby="update-drug-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drug-modal-header">
          <h2 id="update-drug-title"><Edit3 size={17} /> Update {product.name}</h2>
          <button type="button" className="drug-modal-close" onClick={onClose} aria-label="Close update dialog"><X size={18} /></button>
        </header>
        <div className="drug-modal-body">
          <div className="drug-form-grid">
            <label className="drug-field drug-field-wide"><span>Drug Name</span><input value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
            <label className="drug-field"><span>Stock</span><input type="number" value={form.stock} onChange={(e) => update('stock', e.target.value)} /></label>
            <label className="drug-field"><span>Batch</span><input value={form.batch} onChange={(e) => update('batch', e.target.value)} /></label>
            <label className="drug-field"><span>HSN</span><input value={form.hsn} onChange={(e) => update('hsn', e.target.value)} /></label>
            <label className="drug-field"><span>Cost Price</span><input type="number" step="0.01" value={form.costPrice} onChange={(e) => update('costPrice', e.target.value)} /></label>
            <label className="drug-field"><span>MRP</span><input type="number" step="0.01" value={form.mrp} onChange={(e) => update('mrp', e.target.value)} /></label>
            <label className="drug-field"><span>Expiry (MM/YY)</span><input placeholder="08/26" value={form.expiry} onChange={(e) => update('expiry', e.target.value)} /></label>
            <label className="drug-field"><span>Rack</span><input value={form.rack} onChange={(e) => update('rack', e.target.value)} /></label>
            <label className="drug-field"><span>Units/Pack</span><input type="number" value={form.unitsPack} onChange={(e) => update('unitsPack', e.target.value)} /></label>
            <label className="drug-field"><span>Dosage Form</span><select value={form.dosageForm} onChange={(e) => update('dosageForm', e.target.value)}><option value="">Select form</option>{dosageForms.map((formName) => <option key={formName}>{formName}</option>)}</select></label>
            <label className="drug-field"><span>Scheduling</span><select value={form.scheduling} onChange={(e) => update('scheduling', e.target.value)}><option value="">Not scheduled</option><option>NRx (Narcotic)</option><option>H1</option><option>Schedule H</option><option>OTC</option></select></label>
            <label className="drug-field"><span>Barcode</span><input value={form.barcode} onChange={(e) => update('barcode', e.target.value)} /></label>
            <label className="drug-field"><span>Reorder Level</span><input type="number" value={form.reorderLevel} onChange={(e) => update('reorderLevel', e.target.value)} /></label>
            <label className="drug-field"><span>CGST (%)</span><input type="number" step="0.01" value={form.cgst} onChange={(e) => update('cgst', e.target.value)} /></label>
            <label className="drug-field"><span>SGST (%)</span><input type="number" step="0.01" value={form.sgst} onChange={(e) => update('sgst', e.target.value)} /></label>
            <label className="drug-field"><span>IGST (%)</span><input type="number" step="0.01" value={form.igst} onChange={(e) => update('igst', e.target.value)} /></label>
          </div>
        </div>
        <footer className="drug-modal-footer">{error && <p className="drug-save-error">{error}</p>}<button type="button" className="drug-cancel" onClick={onClose} disabled={saving}>Cancel</button><button type="button" className="drug-update" onClick={() => onSaved(form)} disabled={saving}>{saving ? 'Updating...' : 'Update'}</button></footer>
      </section>
    </div>
  );
}

export default function DrugList() {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: async () => unwrap(await api.get('/products')) });
  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/products/${id}`, {
      name: data.name,
      hsnCode: data.hsn,
      rack: data.rack,
      dosageForm: data.dosageForm,
      scheduling: data.scheduling,
      prescriptionOnly: Boolean(data.scheduling),
      barcode: data.barcode,
      reorderLevel: Number(data.reorderLevel || 0),
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
  const [search, setSearch] = React.useState('');
  const [view, setView] = React.useState('consolidated');
  const [inStock, setInStock] = React.useState(false);
  const [schedule, setSchedule] = React.useState(false);
  const [unexpired, setUnexpired] = React.useState(false);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [filters, setFilters] = React.useState(initialFilters);
  const [menuId, setMenuId] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [mappingProduct, setMappingProduct] = React.useState(null);
  const mapSalt = useMutation({
    mutationFn: ({ productId, saltId }) => api.post(`/products/${productId}/salts`, { saltId }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['product-detail', mappingProduct?.id] }),
      ]);
      setMappingProduct(null);
    },
  });
  const products = productsQuery.data || [];
  const suppliers = [...new Set(products.flatMap((product) => (product.suppliers || []).map((item) => item.supplier?.name).filter(Boolean)))];
  const filtered = products.filter((product) => {
    const batch = getBatch(product);
    const saltNames = (product.salts || []).map((mapping) => mapping.salt?.name || '').join(' ');
    const haystack = `${product.name} ${product.genericName || ''} ${product.brandName || ''} ${product.sku || ''} ${saltNames}`.toLowerCase();
    const supplierName = product.suppliers?.[0]?.supplier?.name || '';
    const scheduleValue = String(product.scheduling || '').toLowerCase();
    return haystack.includes(search.toLowerCase()) && (!inStock || batch.stock > 0) && (!schedule || product.scheduling || product.prescriptionOnly) && (!unexpired || isUnexpired(batch.expiry)) && (filters.availability === 'all' || (filters.availability === 'inStock' ? batch.stock > 0 : batch.stock <= 0)) && (!filters.lowStockOnly || batch.stock < Number(product.reorderLevel || 10)) && (filters.schedule === 'all' || (filters.schedule === 'nrx' ? product.prescriptionOnly || scheduleValue.includes('nrx') : scheduleValue.includes(filters.schedule))) && (filters.expiry === 'all' || expiryState(batch.expiry) === filters.expiry || (filters.expiry === 'valid' && expiryState(batch.expiry) === 'unknown')) && (!filters.supplier || supplierName === filters.supplier);
  }).sort((left, right) => {
    const leftBatch = getBatch(left);
    const rightBatch = getBatch(right);
    const values = { genericName: [left.genericName || left.name, right.genericName || right.name], stock: [leftBatch.stock, rightBatch.stock], expiry: [leftBatch.expiry, rightBatch.expiry], createdAt: [left.createdAt || '', right.createdAt || ''] }[filters.sortBy];
    const comparison = String(values[0]).localeCompare(String(values[1]), undefined, { numeric: true });
    return filters.sortDirection === 'asc' ? comparison : -comparison;
  });
  const totalValue = products.reduce((sum, product) => sum + (getBatch(product).price * getBatch(product).stock), 0);
  const outOfStock = products.filter((product) => getBatch(product).stock <= 0).length;

  return (
    <div className="drug-list-page" onClick={() => setMenuId(null)}>
      <div className="drug-search-bar"><select aria-label="Search scope"><option>All</option><option>Brands</option><option>Salt</option><option>Drug classes</option></select><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in brands, salts, drug classes or manufacturers..." /><Search size={20} /><kbd>/</kbd></div>
      <div className="drug-filter-bar"><button type="button" className={inStock ? 'drug-filter active' : 'drug-filter'} onClick={() => setInStock((value) => !value)}><Archive size={14} /> In Stock <ChevronDown size={13} /></button><button type="button" className={schedule ? 'drug-filter active' : 'drug-filter'} onClick={() => setSchedule((value) => !value)}><Tag size={14} /> Schedule <ChevronDown size={13} /></button><button type="button" className={unexpired ? 'drug-filter active' : 'drug-filter'} onClick={() => setUnexpired((value) => !value)}>● Unexpired <ChevronDown size={13} /></button><button type="button" className="drug-filter filter-button" onClick={() => setFilterOpen(true)}><Filter size={14} /> Filter</button></div>
      <div className="drug-list-actions"><button type="button">Actions <ChevronDown size={14} /></button></div>
      <div className="drug-kpi-grid"><article><span className="kpi-icon blue"><Archive size={19} /></span><div><small>Total Drugs</small><strong>{products.length}</strong></div></article><article><span className="kpi-icon green"><Archive size={19} /></span><div><small>Total Value</small><strong className="value-green">{money(totalValue)}</strong><em>Cost: {money(totalValue * 0.73)}</em></div></article><article><span className="kpi-icon red"><AlertTriangle size={19} /></span><div className="alert-values"><span><b>0</b> expired</span><span><b>{outOfStock}</b> Out of Stock</span></div></article></div>
      <div className="drug-tabs"><button type="button" className={view === 'consolidated' ? 'active' : ''} onClick={() => setView('consolidated')}>Consolidated View</button><button type="button" className={view === 'separated' ? 'active' : ''} onClick={() => setView('separated')}>Separated View</button></div>
      <div className="drug-table-wrap"><table className="drug-table"><thead><tr><th><input type="checkbox" aria-label="Select all drugs" /></th><th>S.NO</th><th>NAME</th><th>RACK</th><th>BATCH</th><th>HSN</th><th>STOCK</th><th>PRICE</th><th>EXPIRY</th><th>SUPPLIER</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map((product, index) => { const batch = getBatch(product); const low = batch.stock < 10; return <tr key={product.id}><td><input type="checkbox" aria-label={`Select ${product.name}`} /></td><td>{index + 1}</td><td><button type="button" className="drug-name-button" onClick={() => setSelected({ ...product, details: true })}><strong>{product.name}</strong>{product.prescriptionOnly && <span className="nrx-badge">NRx</span>}</button></td><td>{product.rack || '—'}</td><td>{batch.batch}</td><td>{product.hsnCode || '—'}</td><td><span className={low ? 'stock-badge low' : 'stock-badge'}>{batch.stock}{low && ' (Low)'}</span></td><td>{money(batch.price)}</td><td className={batch.expiry !== '-' ? 'expiry-near' : ''}>{batch.expiry}</td><td>{product.suppliers?.[0]?.supplier?.name || '—'}</td><td className="drug-action-cell"><button type="button" className="kebab" onClick={(event) => { event.stopPropagation(); setMenuId(menuId === product.id ? null : product.id); }} aria-label={`Actions for ${product.name}`}><MoreVertical size={18} /></button>{menuId === product.id && <div className="drug-action-menu" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelected(product)}><Edit3 size={14} /> Edit</button><button type="button"><Tag size={14} /> Add Deal</button><button type="button" onClick={() => { setMappingProduct(product); setMenuId(null); }}><Link2 size={14} /> Map</button></div>}</td></tr>; })}{!filtered.length && <tr><td colSpan="11" className="drug-empty">No drugs match the current filters.</td></tr>}</tbody></table></div>
      {filterOpen && <FilterDrawer filters={filters} suppliers={suppliers} onClose={() => setFilterOpen(false)} onApply={(nextFilters) => { setFilters(nextFilters); setFilterOpen(false); }} />}
      {mappingProduct && <MapSaltModal product={mappingProduct} onClose={() => setMappingProduct(null)} saving={mapSalt.isPending} error={mapSalt.error ? apiError(mapSalt.error) : ''} onMapped={(saltId) => mapSalt.mutate({ productId: mappingProduct.id, saltId })} />}
      {selected?.details ? <DrugDetailsModal product={selected} onClose={() => setSelected(null)} /> : selected && <UpdateDrugModal product={selected} onClose={() => setSelected(null)} saving={updateProduct.isPending} error={updateProduct.error ? apiError(updateProduct.error) : ''} onSaved={(data) => { updateProduct.mutate({ id: selected.id, data }, { onSuccess: () => setSelected(null) }); }} />}
    </div>
  );
}