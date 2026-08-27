import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, ArrowDown, ArrowUp, Building2, CalendarDays, Check, ChevronDown, Edit3, Filter, Info, Link2, MoreVertical, Plus, RotateCcw, Search, Tag, X } from 'lucide-react';
import api, { apiError, unwrap } from '../lib/api';
import * as XLSX from 'xlsx';

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
    expiryDate: batch?.expiryDate || null,
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

function dosageFormLabel(product) {
  return product.dosageForm || 'Other form';
}

function isUnexpired(expiry) {
  if (expiry === '-') return true;
  const [month, year] = expiry.split('/').map(Number);
  const expiryDate = new Date(2000 + year, month, 0);
  return expiryDate >= new Date();
}

function getBatchMargin(batch) {
  const cost = Number(batch.purchasePrice ?? batch.costPerBaseUnit ?? 0);
  const selling = Number(batch.sellingPrice ?? 0);
  const margin = selling - cost;
  return { cost, selling, mrp: Number(batch.mrp ?? 0), margin, marginPercent: cost ? (margin / cost) * 100 : 0 };
}

const initialFilters = { sortBy: 'genericName', sortDirection: 'asc', schedule: 'all', availability: 'inStock', lowStockOnly: false, expiry: 'unexpired', supplier: '' };

function expiryState(expiry) {
  if (!expiry || expiry === '-') return 'unknown';
  const expiryDate = expiry instanceof Date ? expiry : new Date(expiry);
  if (Number.isNaN(expiryDate.getTime())) return 'unknown';
  const now = new Date();
  const monthsAway = (expiryDate.getFullYear() - now.getFullYear()) * 12 + expiryDate.getMonth() - now.getMonth();
  if (expiryDate < now) return 'expired';
  if (monthsAway <= 1) return 'oneMonth';
  if (monthsAway <= 3) return 'threeMonths';
  if (monthsAway <= 6) return 'sixMonths';
  if (monthsAway <= 12) return 'oneYear';
  return 'valid';
}

function matchesExpiryFilter(expiry, filter) {
  if (filter === 'all') return true;
  if (filter === 'unexpired') return expiryState(expiry) !== 'expired';
  return expiryState(expiry) === filter;
}

const scheduleOptions = [['all', 'All'], ['nrx', 'NRx'], ['rx', 'Rx'], ['otc', 'OTC'], ['h1', 'Sch H1'], ['h', 'Sch H'], ['g', 'Sch G']];
const availabilityOptions = [['all', 'All'], ['inStock', 'In Stock'], ['outOfStock', 'Out of Stock']];
const expiryOptions = [['all', 'All'], ['unexpired', 'Unexpired'], ['expired', 'Expired'], ['oneMonth', 'In 1 Month'], ['threeMonths', 'In 3 Months'], ['sixMonths', 'In 6 Months'], ['oneYear', 'In 1 Year']];
const exportColumns = [['name', 'Drug / Generic Name'], ['batchNumber', 'Batch Number'], ['hsnCode', 'HSN Code'], ['scheduling', 'Schedule'], ['sellingPrice', 'Trade Price'], ['costPrice', 'Cost'], ['mrp', 'MRP'], ['stock', 'Stock'], ['reserved', 'Reserved'], ['available', 'Available'], ['reorderLevel', 'Reorder Level'], ['expiryDate', 'Expiry Date'], ['supplier', 'Supplier']];

function FilterMenu({ icon: Icon, label, value, options, onChange, open, onToggle }) {
  const selected = options.find(([optionValue]) => optionValue === value) || options[0];
  return (
    <div className={`drug-filter-menu ${open ? 'open' : ''}`} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={`drug-filter ${value !== options[0][0] ? 'active' : ''}`} onClick={onToggle} aria-expanded={open}>
        <Icon size={14} /> {value === options[0][0] ? label : selected[1]} <ChevronDown size={13} />
      </button>
      {open && <div className="drug-filter-dropdown" role="menu">
        {options.map(([optionValue, optionLabel]) => <button type="button" role="menuitemradio" aria-checked={value === optionValue} className={value === optionValue ? 'selected' : ''} key={optionValue} onClick={() => onChange(optionValue)}><span>{optionLabel}</span>{value === optionValue && <Check size={15} />}</button>)}
      </div>}
    </div>
  );
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
          <section className="filter-section"><h3><Tag size={14} /> Drug Schedule</h3><div className="drawer-pills">{scheduleOptions.map(([value, label]) => <button type="button" key={value} className={optionClass(draft.schedule === value)} onClick={() => setFilter('schedule', value)}>{label}</button>)}</div></section>
          <section className="filter-section"><h3><Archive size={14} /> Stock Availability</h3><div className="segmented-filter">{[['all', 'All Items'], ['inStock', 'In Stock'], ['outOfStock', 'Out of Stock']].map(([value, label]) => <button type="button" key={value} className={draft.availability === value ? 'active' : ''} onClick={() => setFilter('availability', value)}>{label}</button>)}</div><label className="switch-row"><span><AlertTriangle size={14} /> Low Stock Alert Only<small>Stock &lt; Reorder threshold</small></span><input type="checkbox" checked={draft.lowStockOnly} onChange={(event) => setFilter('lowStockOnly', event.target.checked)} /><i /></label></section>
          <section className="filter-section"><h3><CalendarDays size={14} /> Expiry Status</h3><div className="drawer-grid two">{expiryOptions.map(([value, label]) => <button type="button" key={value} className={optionClass(draft.expiry === value)} onClick={() => setFilter('expiry', value)}><i className={`status-dot ${value}`} />{label}{draft.expiry === value && <Check size={13} />}</button>)}</div></section>
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
  const [priceBatch, setPriceBatch] = React.useState(null);
  const relatedProducts = detail.relatedProducts || [];
  const sameFormProducts = relatedProducts.filter((related) => String(related.dosageForm || '').toLowerCase() === String(detail.dosageForm || '').toLowerCase());
  return (
    <div className="drug-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="drug-details-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drug-modal-header"><h2>{detail.name} <span>Drug Details</span></h2><button type="button" className="drug-modal-close" onClick={onClose} aria-label="Close details"><X size={18} /></button></header>
        <div className="drug-details-body">
          <div className="drug-detail-summary"><div><small>SKU</small><strong>{detail.sku || '-'}</strong></div><div><small>Packaging</small><strong>{getPackagingLabel(detail)}</strong></div><div><small>Stock</small><strong>{batch.stock}</strong></div><div><small>MRP</small><strong>{money(batch.price)}</strong></div><div><small>HSN</small><strong>{detail.hsnCode || '-'}</strong></div></div>
          <section className="details-section"><h3>Batch Details</h3>{detail.batches?.length ? <div className="details-table batch-table"><div className="details-table-head"><span>Batch Number</span><span>Expiry</span><span>Prices</span></div>{detail.batches.map((item) => <div className="details-table-row" key={item.id}><span>{item.batchNumber}</span><span>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN') : '-'}</span><button type="button" className="batch-info-button" onClick={() => setPriceBatch(item)} aria-label={`View prices for batch ${item.batchNumber}`}><Info size={16} /></button></div>)}</div> : <p className="details-muted">No batches found.</p>}</section>
          <section className="details-section"><h3>Salts</h3>{detail.salts?.length ? <div className="drug-salt-list">{detail.salts.map((mapping) => <span key={mapping.id}>{mapping.salt?.name}</span>)}</div> : <p className="details-muted">No salts mapped.</p>}</section>
          <div className="related-products-grid">
            <section className="details-section related-products-section"><div className="section-heading-row"><div><h3>Substitute Products</h3><p>Same salt and dosage form: {dosageFormLabel(detail)}</p></div><span className="related-count">{sameFormProducts.length}</span></div>{detailQuery.isLoading ? <p className="details-muted">Loading substitutes...</p> : sameFormProducts.length ? <div className="related-product-list">{sameFormProducts.map((related) => <div key={related.id}><strong>{related.name}</strong><span>{related.brandName || related.genericName || related.sku}</span></div>)}</div> : <p className="details-muted">No same-form substitutes found.</p>}</section>
            <section className="details-section related-products-section"><div className="section-heading-row"><div><h3>All Products With This Salt</h3><p>Every dosage form containing the mapped salt</p></div><span className="related-count">{relatedProducts.length}</span></div>{detailQuery.isLoading ? <p className="details-muted">Loading related products...</p> : relatedProducts.length ? <div className="related-product-list">{relatedProducts.map((related) => <div key={related.id}><strong>{related.name}</strong><span>{related.brandName || related.genericName || related.sku}<em>{dosageFormLabel(related)}</em></span></div>)}</div> : <p className="details-muted">No other products share this salt.</p>}</section>
          </div>
          <section className="details-section"><h3>Supplier Details</h3>{product.suppliers?.length ? <div className="details-table"><div className="details-table-head"><span>Supplier</span><span>Phone</span><span>Purchase Price</span><span>Preferred</span></div>{product.suppliers.map((mapping) => <div className="details-table-row" key={mapping.id}><span>{mapping.supplier?.name || '-'}</span><span>{mapping.supplier?.phone || '-'}</span><span>{money(mapping.purchasePrice)}</span><span>{mapping.isPreferred ? 'Yes' : 'No'}</span></div>)}</div> : <p className="details-muted">No supplier mappings found.</p>}</section>
          <section className="details-section"><h3>Purchase History</h3>{historyQuery.isLoading ? <p className="details-muted">Loading purchase history...</p> : historyQuery.data?.length ? <div className="details-table"><div className="details-table-head"><span>Invoice</span><span>Date</span><span>Supplier</span><span>Batch / Qty</span><span>Total</span></div>{historyQuery.data.map((item) => <div className="details-table-row" key={item.id}><span>{item.purchase?.invoiceNumber || '-'}</span><span>{item.purchase?.invoiceDate ? new Date(item.purchase.invoiceDate).toLocaleDateString('en-IN') : '-'}</span><span>{item.purchase?.supplier?.name || '-'}</span><span>{item.batch?.batchNumber || '-'} / {item.quantity}</span><span>{money(item.totalAmount)}</span></div>)}</div> : <p className="details-muted">No purchase history found for this drug.</p>}</section>
        </div>
      </section>
      {priceBatch && <BatchPriceModal batch={priceBatch} onClose={() => setPriceBatch(null)} />}
    </div>
  );
}

function BatchPriceModal({ batch, onClose }) {
  const prices = getBatchMargin(batch);
  return (
    <div className="drug-modal-backdrop nested-modal" role="presentation" onMouseDown={onClose}>
      <section className="batch-price-modal" role="dialog" aria-modal="true" aria-labelledby="batch-price-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drug-modal-header"><h2 id="batch-price-title"><Info size={17} /> Batch {batch.batchNumber} Prices</h2><button type="button" className="drug-modal-close" onClick={onClose} aria-label="Close batch prices"><X size={18} /></button></header>
        <div className="batch-price-grid"><div><span>Purchase / Cost Price</span><strong>{money(prices.cost)}</strong></div><div><span>Selling Price</span><strong>{money(prices.selling)}</strong></div><div><span>MRP</span><strong>{money(prices.mrp)}</strong></div><div><span>Margin</span><strong className={prices.margin >= 0 ? 'positive-price' : 'negative-price'}>{money(prices.margin)}</strong></div><div><span>Margin Percentage</span><strong className={prices.marginPercent >= 0 ? 'positive-price' : 'negative-price'}>{prices.marginPercent.toFixed(2)}%</strong></div></div>
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
    hsn: product.hsnCode || '', costPrice: batch.costPrice || '', sellingPrice: product.batches?.[0]?.sellingPrice || '', mrp: batch.price || '', expiry: batch.expiry === '-' ? '' : batch.expiry,
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
            <label className="drug-field"><span>Selling Price</span><input type="number" step="0.01" value={form.sellingPrice} onChange={(e) => update('sellingPrice', e.target.value)} /></label>
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
    mutationFn: async ({ product, data }) => {
      const requests = [api.patch(`/products/${product.id}`, {
        name: data.name,
        hsnCode: data.hsn,
        rack: data.rack,
        dosageForm: data.dosageForm,
        scheduling: data.scheduling,
        prescriptionOnly: Boolean(data.scheduling),
        barcode: data.barcode,
        reorderLevel: Number(data.reorderLevel || 0),
      })];
      const batchId = product.batches?.[0]?.id;
      if (batchId) {
        requests.push(api.patch(`/batches/${batchId}`, {
          purchasePrice: Number(data.costPrice || 0),
          costPerBaseUnit: Number(data.costPrice || 0),
          sellingPrice: Number(data.sellingPrice || 0),
          mrp: Number(data.mrp || 0),
        }));
      }
      return Promise.all(requests);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
  const [search, setSearch] = React.useState('');
  const [searchScope, setSearchScope] = React.useState('all');
  const [view, setView] = React.useState('consolidated');
  const [quickMenu, setQuickMenu] = React.useState(null);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [workflow, setWorkflow] = React.useState(null);
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
    const searchValue = search.toLowerCase().trim();
    const allText = `${product.name} ${product.genericName || ''} ${product.brandName || ''} ${product.sku || ''} ${saltNames} ${product.rack || ''} ${product.hsnCode || ''} ${(product.batches || []).map((item) => item.batchNumber).join(' ')}`.toLowerCase();
    const scopeText = {
      salts: saltNames,
      rack: product.rack || '',
      hsn: product.hsnCode || '',
      batch: (product.batches || []).map((item) => item.batchNumber).join(' '),
    }[searchScope] || allText;
    const matchesSearch = !searchValue || scopeText.toLowerCase().includes(searchValue);
    const supplierName = product.suppliers?.[0]?.supplier?.name || '';
    const scheduleValue = String(product.scheduling || '').trim().toLowerCase();
    const normalizedSchedule = scheduleValue.replace(/[()_-]/g, ' ').replace(/\s+/g, ' ');
    const scheduleMatches = filters.schedule === 'all' || (filters.schedule === 'nrx' ? product.prescriptionOnly || normalizedSchedule.includes('nrx') : filters.schedule === 'rx' ? normalizedSchedule === 'rx' || (product.prescriptionOnly && !normalizedSchedule.includes('nrx')) : filters.schedule === 'h1' ? normalizedSchedule.includes('h1') : filters.schedule === 'h' ? normalizedSchedule === 'h' || normalizedSchedule === 'schedule h' : normalizedSchedule === filters.schedule);
    return matchesSearch && scheduleMatches && (filters.availability === 'all' || (filters.availability === 'inStock' ? batch.stock > 0 : batch.stock <= 0)) && (!filters.lowStockOnly || batch.stock < Number(product.reorderLevel || 10)) && matchesExpiryFilter(batch.expiryDate, filters.expiry) && (!filters.supplier || supplierName === filters.supplier);
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
    <div className="drug-list-page" onClick={() => { setMenuId(null); setQuickMenu(null); setActionsOpen(false); }}>
      <div className="drug-search-bar"><select aria-label="Search scope" value={searchScope} onChange={(e) => setSearchScope(e.target.value)}><option value="all">All</option><option value="salts">Salts</option><option value="rack">Rack</option><option value="hsn">HSN</option><option value="batch">Batch</option></select><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${searchScope === 'all' ? 'products, salts, racks, HSN or batches' : searchScope}...`} /><Search size={20} /><kbd>/</kbd></div>
      <div className="drug-filter-bar"><FilterMenu icon={Archive} label="In Stock" value={filters.availability} options={availabilityOptions} open={quickMenu === 'availability'} onToggle={() => setQuickMenu(quickMenu === 'availability' ? null : 'availability')} onChange={(value) => { setFilters((current) => ({ ...current, availability: value })); setQuickMenu(null); }} /><FilterMenu icon={Tag} label="Schedule" value={filters.schedule} options={scheduleOptions} open={quickMenu === 'schedule'} onToggle={() => setQuickMenu(quickMenu === 'schedule' ? null : 'schedule')} onChange={(value) => { setFilters((current) => ({ ...current, schedule: value })); setQuickMenu(null); }} /><FilterMenu icon={Check} label="Unexpired" value={filters.expiry === 'all' ? 'unexpired' : filters.expiry} options={expiryOptions.filter(([value]) => value !== 'all')} open={quickMenu === 'expiry'} onToggle={() => setQuickMenu(quickMenu === 'expiry' ? null : 'expiry')} onChange={(value) => { setFilters((current) => ({ ...current, expiry: value })); setQuickMenu(null); }} /><button type="button" className="drug-filter filter-button" onClick={() => setFilterOpen(true)}><Filter size={14} /> Filter</button></div>
      <div className="drug-list-actions"><button type="button" onClick={(event) => { event.stopPropagation(); setActionsOpen((value) => !value); }}>Actions <ChevronDown size={14} /></button>{actionsOpen && <div className="drug-actions-menu" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { setWorkflow('export'); setActionsOpen(false); }}><ArrowDown size={14} /> Export Stock</button><button type="button" onClick={() => { setWorkflow('audit'); setActionsOpen(false); }}><Check size={14} /> Stock Audit</button><button type="button" onClick={() => { setWorkflow('import'); setActionsOpen(false); }}><Plus size={14} /> Import</button></div>}</div>
      <div className="drug-kpi-grid"><article><span className="kpi-icon blue"><Archive size={19} /></span><div><small>Total Drugs</small><strong>{products.length}</strong></div></article><article><span className="kpi-icon green"><Archive size={19} /></span><div><small>Total Value</small><strong className="value-green">{money(totalValue)}</strong><em>Cost: {money(totalValue * 0.73)}</em></div></article><article><span className="kpi-icon red"><AlertTriangle size={19} /></span><div className="alert-values"><span><b>0</b> expired</span><span><b>{outOfStock}</b> Out of Stock</span></div></article></div>
      <div className="drug-tabs"><button type="button" className={view === 'consolidated' ? 'active' : ''} onClick={() => setView('consolidated')}>Consolidated View</button><button type="button" className={view === 'separated' ? 'active' : ''} onClick={() => setView('separated')}>Separated View</button></div>
      <div className="drug-table-wrap"><table className="drug-table"><thead><tr><th><input type="checkbox" aria-label="Select all drugs" /></th><th>S.NO</th><th>NAME</th><th>RACK</th><th>BATCH</th><th>HSN</th><th>STOCK</th><th>PRICE</th><th>EXPIRY</th><th>SUPPLIER</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map((product, index) => { const batch = getBatch(product); const low = batch.stock < 10; return <tr key={product.id}><td><input type="checkbox" aria-label={`Select ${product.name}`} /></td><td>{index + 1}</td><td><button type="button" className="drug-name-button" onClick={() => setSelected({ ...product, details: true })}><strong>{product.name}</strong>{product.prescriptionOnly && <span className="nrx-badge">NRx</span>}</button></td><td>{product.rack || '—'}</td><td>{batch.batch}</td><td>{product.hsnCode || '—'}</td><td><span className={low ? 'stock-badge low' : 'stock-badge'}>{batch.stock}{low && ' (Low)'}</span></td><td>{money(batch.price)}</td><td className={batch.expiry !== '-' ? 'expiry-near' : ''}>{batch.expiry}</td><td>{product.suppliers?.[0]?.supplier?.name || '—'}</td><td className="drug-action-cell"><button type="button" className="kebab" onClick={(event) => { event.stopPropagation(); setMenuId(menuId === product.id ? null : product.id); }} aria-label={`Actions for ${product.name}`}><MoreVertical size={18} /></button>{menuId === product.id && <div className="drug-action-menu" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelected(product)}><Edit3 size={14} /> Edit</button><button type="button"><Tag size={14} /> Add Deal</button><button type="button" onClick={() => { setMappingProduct(product); setMenuId(null); }}><Link2 size={14} /> Map</button></div>}</td></tr>; })}{!filtered.length && <tr><td colSpan="11" className="drug-empty">No drugs match the current filters.</td></tr>}</tbody></table></div>
      {filterOpen && <FilterDrawer filters={filters} suppliers={suppliers} onClose={() => setFilterOpen(false)} onApply={(nextFilters) => { setFilters(nextFilters); setFilterOpen(false); }} />}
      {mappingProduct && <MapSaltModal product={mappingProduct} onClose={() => setMappingProduct(null)} saving={mapSalt.isPending} error={mapSalt.error ? apiError(mapSalt.error) : ''} onMapped={(saltId) => mapSalt.mutate({ productId: mappingProduct.id, saltId })} />}
      {selected?.details ? <DrugDetailsModal product={selected} onClose={() => setSelected(null)} /> : selected && <UpdateDrugModal product={selected} onClose={() => setSelected(null)} saving={updateProduct.isPending} error={updateProduct.error ? apiError(updateProduct.error) : ''} onSaved={(data) => { updateProduct.mutate({ product: selected, data }, { onSuccess: () => setSelected(null) }); }} />}
      {workflow === 'export' && <StockExportModal products={products} onClose={() => setWorkflow(null)} />}
      {workflow === 'audit' && <StockAuditModal products={products} onClose={() => setWorkflow(null)} />}
      {workflow === 'import' && <ImportStockModal onClose={() => setWorkflow(null)} onImported={() => queryClient.invalidateQueries({ queryKey: ['products'] })} />}
    </div>
  );
}

function WorkflowModal({ title, children, onClose, className = '' }) {
  return <div className="drug-modal-backdrop" role="presentation" onMouseDown={onClose}><section className={`drug-modal workflow-modal ${className}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="drug-modal-header"><h2>{title}</h2><button type="button" className="drug-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button></header>{children}</section></div>;
}

function StockExportModal({ products, onClose }) {
  const [selected, setSelected] = React.useState(exportColumns.map(([key]) => key));
  const toggle = (key) => setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  const valueFor = (product, batch, key) => ({ name: product.name, batchNumber: batch.batch, hsnCode: product.hsnCode || '', scheduling: product.scheduling || (product.prescriptionOnly ? 'NRx' : ''), sellingPrice: getBatch(product).price, costPrice: getBatch(product).costPrice, mrp: getBatch(product).price, stock: batch.stock, reserved: 0, available: batch.stock, reorderLevel: product.reorderLevel || 0, expiryDate: batch.expiryDate || '', supplier: product.suppliers?.[0]?.supplier?.name || '' })[key];
  const exportCsv = () => { const headers = exportColumns.filter(([key]) => selected.includes(key)); const rows = products.map((product) => { const batch = getBatch(product); return Object.fromEntries(headers.map(([key, label]) => [label, valueFor(product, batch, key)])); }); const sheet = XLSX.utils.json_to_sheet(rows); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Stock'); XLSX.writeFile(book, `stock-export-${new Date().toISOString().slice(0, 10)}.xlsx`); onClose(); };
  return <WorkflowModal title="Export Stock" onClose={onClose}><div className="workflow-body"><div className="workflow-heading"><b>Select Columns to Export</b><button type="button" onClick={() => setSelected([])}>Deselect All</button></div><div className="export-column-grid">{exportColumns.map(([key, label]) => <label key={key}><input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} />{label}</label>)}</div></div><footer className="drug-modal-footer"><button type="button" className="drug-cancel" onClick={onClose}>Cancel</button><button type="button" className="drug-update" disabled={!selected.length} onClick={exportCsv}>Export</button></footer></WorkflowModal>;
}

function StockAuditModal({ onClose }) {
  const [asOf, setAsOf] = React.useState(new Date().toISOString().slice(0, 10));
  const [stockCondition, setStockCondition] = React.useState('inStock');
  const [expiryCondition, setExpiryCondition] = React.useState('all');
  const [groupBatchWise, setGroupBatchWise] = React.useState(false);
  const [error, setError] = React.useState('');
  const setDateShortcut = (shortcut) => {
    const today = new Date();
    const value = new Date(today);
    if (shortcut === 'yesterday') value.setDate(value.getDate() - 1);
    if (shortcut === 'currentMonth') value.setDate(1);
    if (shortcut === 'previousMonth') { value.setMonth(value.getMonth() - 1); value.setDate(1); }
    if (shortcut === 'fy') { value.setMonth(today.getMonth() >= 3 ? 3 : 3); value.setDate(1); if (today.getMonth() < 3) value.setFullYear(today.getFullYear() - 1); }
    if (shortcut === 'year') { value.setMonth(0); value.setDate(1); }
    setAsOf(value.toISOString().slice(0, 10));
  };
  const exportAudit = async () => {
    try {
      const response = await api.get('/inventory/export', { params: { asOf, stockCondition, expiryCondition, groupBatchWise }, responseType: 'blob' });
      const blobUrl = URL.createObjectURL(response.data); const anchor = document.createElement('a'); anchor.href = blobUrl; anchor.download = `stock-audit-${asOf}.csv`; anchor.click(); URL.revokeObjectURL(blobUrl); onClose();
    } catch (e) { setError(apiError(e)); }
  };
  const stockLabels = { inStock: 'In Stock Only', outOfStock: 'Out of Stock Only', all: 'All Stock' };
  const expiryLabels = { all: 'All Medicines', expired: 'Expired', '1': 'In 1 Month', '3': 'In 3 Months', '6': 'In 6 Months' };
  return <WorkflowModal title="Stock Audit" onClose={onClose} className="stock-audit-modal"><div className="workflow-body"><div className="audit-date-label"><CalendarDays size={15} /><b>"As Of" Reporting Date</b></div><input className="audit-date-input" type="date" value={asOf} onChange={(event) => setAsOf(event.target.value)} /><div className="date-shortcuts">{[['today', 'Today'], ['yesterday', 'Yesterday'], ['currentMonth', '1st of Current Mo.'], ['previousMonth', '1st of Prev Mo.'], ['fy', 'FY Start (Apr 1)'], ['year', 'Start of Year (Jan 1)']].map(([value, label]) => <button type="button" key={value} onClick={() => setDateShortcut(value)}>{label}</button>)}</div><div className="audit-section-title"><Archive size={15} /><b>Stock Condition</b></div><div className="audit-choice-grid">{[['inStock', 'In Stock'], ['outOfStock', 'Out of Stock'], ['all', 'All Stock']].map(([value, label]) => <button type="button" className={stockCondition === value ? 'active' : ''} key={value} onClick={() => setStockCondition(value)}>{label}</button>)}</div><div className="audit-section-title"><CalendarDays size={15} /><b>Expiry Condition</b></div><div className="audit-choice-grid expiry">{Object.entries(expiryLabels).map(([value, label]) => <button type="button" className={expiryCondition === value ? 'active' : ''} key={value} onClick={() => setExpiryCondition(value)}>{label}</button>)}</div><label className="group-batch-toggle"><span><Archive size={17} /><b>Group Batch Wise<small>Grouped by item name (default).</small></b></span><input type="checkbox" checked={groupBatchWise} onChange={(event) => setGroupBatchWise(event.target.checked)} /></label><div className="audit-summary"><Check size={15} /><span>Exporting stock as of <b>{asOf}</b> ({stockLabels[stockCondition]}, {expiryLabels[expiryCondition]}) {groupBatchWise ? 'grouped by batch.' : 'grouped by item name.'}</span></div>{error && <p className="drug-save-error">{error}</p>}</div><footer className="drug-modal-footer"><button type="button" className="drug-cancel" onClick={onClose}>Cancel</button><button type="button" className="drug-update" onClick={exportAudit}><ArrowDown size={15} /> Export CSV</button></footer></WorkflowModal>;
}

function ImportStockModal({ onClose, onImported }) {
  const [step, setStep] = React.useState(1); const [rows, setRows] = React.useState([]); const [error, setError] = React.useState('');
  const readFile = (file) => { const reader = new FileReader(); reader.onload = (event) => { try { const workbook = XLSX.read(event.target.result, { type: 'array' }); const sheet = workbook.Sheets[workbook.SheetNames[0]]; const parsed = XLSX.utils.sheet_to_json(sheet, { defval: '' }).map((row) => ({ sku: row.SKU || row.sku || row.Barcode || row.barcode, barcode: row.Barcode || row.barcode, batchNumber: row['Batch Number'] || row.batchNumber || row.Batch, quantity: row.Quantity || row.quantity || row.Stock })); if (!parsed.length) throw new Error('No rows found in file'); setRows(parsed); setStep(2); } catch (e) { setError(e.message); } }; reader.readAsArrayBuffer(file); };
  const submit = async () => { try { await api.post('/inventory/import', { rows }); onImported(); onClose(); } catch (e) { setError(apiError(e)); } };
  return <WorkflowModal title="Import Stock" onClose={onClose} className="import-workflow"><div className="import-steps"><b className={step >= 1 ? 'active' : ''}>1<br /><small>Upload</small></b><b className={step >= 2 ? 'active' : ''}>2<br /><small>Map Headers</small></b><b className={step >= 3 ? 'active' : ''}>3<br /><small>Preview</small></b><b className={step >= 4 ? 'active' : ''}>4<br /><small>Complete</small></b></div><div className="workflow-body">{step === 1 && <label className="upload-drop"><input type="file" accept=".csv,.xls,.xlsx" onChange={(event) => event.target.files[0] && readFile(event.target.files[0])} /><strong>Upload your file</strong><span>Drag and drop your CSV or Excel file here, or click to browse</span></label>}{step >= 2 && <><p className="workflow-note">{rows.length} row(s) loaded. Required columns: SKU or Barcode, Batch Number, Quantity.</p><div className="import-preview">{rows.slice(0, 8).map((row, index) => <div key={index}><span>{row.sku || row.barcode || 'Missing SKU'}</span><span>{row.batchNumber || 'Missing batch'}</span><span>{row.quantity || 'Missing quantity'}</span></div>)}</div></>}{error && <p className="drug-save-error">{error}</p>}</div><footer className="drug-modal-footer"><button type="button" className="drug-cancel" onClick={onClose}>Cancel</button>{step === 2 && <button type="button" className="drug-update" onClick={() => setStep(3)}>Preview</button>}{step === 3 && <button type="button" className="drug-update" onClick={submit}>Import Stock</button>}</footer></WorkflowModal>;
}