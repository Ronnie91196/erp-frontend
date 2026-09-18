import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Store, Database, Receipt, BellRing, MessageSquare, Users,
  Save, UploadCloud, DownloadCloud, History,
  Check, AlertCircle, Loader2, RefreshCw,
  Building2, Phone, MapPin, Shield,
} from 'lucide-react';
import api, { unwrap, apiError } from '../../lib/api';
import ImportWorkspace from './importer/ImportWorkspace';
import ImportHistory from './importer/ImportHistory';

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  {
    group: 'GENERAL',
    items: [
      { key: 'store-profile', label: 'Store Profile', icon: Store },
    ],
  },
  {
    group: 'DATA',
    items: [
      { key: 'data-management', label: 'Data Management', icon: Database },
    ],
  },
];

const SOON_ITEMS = [
  { key: 'billing-pos',         label: 'Billing & POS',         icon: Receipt },
  { key: 'inventory-alerts',    label: 'Inventory Alerts',       icon: BellRing },
  { key: 'whatsapp',            label: 'WhatsApp Notifications', icon: MessageSquare },
  { key: 'roles',               label: 'Roles & Access',         icon: Users },
];

const EMPTY_STORE = {
  name:     '',
  code:     '',
  address:  '',
  city:     '',
  state:    '',
  pincode:  '',
  phone:    '',
  email:    '',
  gstin:    '',
  dlNumber: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(v) {
  return (v ?? '').trim();
}

function isDirty(initial, current) {
  return Object.keys(EMPTY_STORE).some(
    (k) => normalise(initial[k]) !== normalise(current[k]),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Settings() {
  const [activeSection, setActiveSection] = useState('store-profile');
  const [dataSubTab,    setDataSubTab]    = useState('import');

  // Store Profile ─ load
  const [loadState,  setLoadState]  = useState('idle'); // idle|loading|loaded|error
  const [loadError,  setLoadError]  = useState(null);
  const [initialValues, setInitialValues] = useState(EMPTY_STORE);
  const [formValues,    setFormValues]    = useState(EMPTY_STORE);

  // Store Profile ─ save
  const [saveState,  setSaveState]  = useState('idle'); // idle|saving|saved|error
  const [saveError,  setSaveError]  = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const savedTimerRef = useRef(null);
  const dirty = isDirty(initialValues, formValues);

  // ── Load store ──────────────────────────────────────────────────────────────
  const loadStore = useCallback(async () => {
    setLoadState('loading');
    setLoadError(null);
    try {
      const res  = await api.get('/stores/my-stores');
      const list = unwrap(res);
      const stores = Array.isArray(list) ? list : [];
      const current = stores.find((s) => s.isCurrentStore) ?? stores[0] ?? null;
      if (!current) throw new Error('No store found for your account.');

      const vals = {
        name:     current.name     ?? '',
        code:     current.code     ?? '',
        address:  current.address  ?? '',
        city:     current.city     ?? '',
        state:    current.state    ?? '',
        pincode:  current.pincode  ?? '',
        phone:    current.phone    ?? '',
        email:    current.email    ?? '',
        gstin:    current.gstin    ?? '',
        dlNumber: current.dlNumber ?? '',
      };
      setInitialValues(vals);
      setFormValues(vals);
      setLoadState('loaded');
    } catch (err) {
      setLoadError(apiError(err) || 'Failed to load store profile.');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'store-profile' && loadState === 'idle') {
      loadStore();
    }
  }, [activeSection, loadState, loadStore]);

  // Cleanup saved auto-dismiss timer
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  // ── Field change ────────────────────────────────────────────────────────────
  const handleChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: null }));
    if (saveState === 'error') setSaveState('idle');
  };

  // ── Validate ────────────────────────────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!formValues.name.trim()) errors.name = 'Pharmacy name is required.';
    return errors;
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saveState === 'saving') return; // prevent duplicate submission
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setSaveState('saving');
    setSaveError(null);
    try {
      await api.put('/stores/current', {
        name:     formValues.name.trim(),
        phone:    formValues.phone.trim()    || null,
        email:    formValues.email.trim()    || null,
        address:  formValues.address.trim()  || null,
        city:     formValues.city.trim()     || null,
        state:    formValues.state.trim()    || null,
        pincode:  formValues.pincode.trim()  || null,
        gstin:    formValues.gstin.trim()    || null,
        dlNumber: formValues.dlNumber.trim() || null,
      });
      // Commit current as new baseline
      setInitialValues({ ...formValues });
      setSaveState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), 3500);
    } catch (err) {
      setSaveError(apiError(err) || 'Save failed. Please try again.');
      setSaveState('error');
    }
  };

  // ── Revert ──────────────────────────────────────────────────────────────────
  const handleRevert = () => {
    setFormValues({ ...initialValues });
    setFieldErrors({});
    setSaveError(null);
    if (saveState !== 'idle') setSaveState('idle');
  };

  const [isImportReviewMode, setIsImportReviewMode] = useState(false);

  return (
    <div className={`stn-page ${isImportReviewMode ? 'stn-page--studio' : ''}`}>

      {/* ── Compact page header (hidden when in review studio) ── */}
      {!isImportReviewMode && (
        <div className="stn-header">
          <span className="stn-breadcrumb">Workspace</span>
          <h1 className="stn-title">Settings</h1>
        </div>
      )}

      <div className={`stn-layout ${isImportReviewMode ? 'stn-layout--studio' : ''}`}>

        {/* ── Left nav (hidden when in review studio) ── */}
        {!isImportReviewMode && (
          <nav className="stn-nav" aria-label="Settings navigation">

          {NAV_SECTIONS.map((section) => (
            <div key={section.group} className="stn-nav-group">
              <span className="stn-nav-group-label">{section.group}</span>
              {section.items.map((item) => {
                const Icon   = item.icon;
                const active = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveSection(item.key)}
                    className={`stn-nav-btn${active ? ' stn-nav-btn--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span>{item.label}</span>
                    {item.key === 'store-profile' && dirty && (
                      <span className="stn-dirty-dot" aria-label="Unsaved changes" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Coming Soon ── clearly separated, fully inert */}
          <div className="stn-nav-group stn-nav-group--soon" aria-label="Coming soon">
            <span className="stn-nav-group-label">COMING SOON</span>
            {SOON_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="stn-nav-btn stn-nav-btn--soon"
                  aria-disabled="true"
                  role="presentation"
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{item.label}</span>
                  <span className="stn-soon-badge" aria-hidden="true">Soon</span>
                </div>
              );
            })}
          </div>
        </nav>
      )}

      {/* ── Main content ── */}
      <main className={`stn-content ${isImportReviewMode ? 'stn-content--studio' : ''}`} id="stn-main">

          {/* ════════════════ STORE PROFILE ════════════════ */}
          {activeSection === 'store-profile' && (
            <div className="stn-section">

              {/* Section head */}
              <div className="stn-section-head">
                <div>
                  <h2 className="stn-section-title">Store Profile</h2>
                  <p className="stn-section-desc">
                    Official pharmacy details used on invoices, receipts, and regulatory documents.
                  </p>
                </div>

                {/* Section-level actions */}
                <div className="stn-section-actions">
                  {dirty && (
                    <span className="stn-dirty-badge" role="status" aria-live="polite">
                      Unsaved changes
                    </span>
                  )}
                  {dirty && (
                    <button
                      onClick={handleRevert}
                      className="stn-btn-ghost"
                      aria-label="Revert unsaved changes"
                    >
                      Revert
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saveState === 'saving' || !dirty}
                    className="stn-btn-save"
                    aria-label={
                      saveState === 'saving' ? 'Saving…'
                      : saveState === 'saved' ? 'Changes saved'
                      : 'Save changes'
                    }
                  >
                    {saveState === 'saving' && <Loader2 size={13} className="animate-spin" aria-hidden="true" />}
                    {saveState === 'saved'   && <Check size={13} aria-hidden="true" />}
                    {saveState !== 'saving' && saveState !== 'saved' && <Save size={13} aria-hidden="true" />}
                    <span>
                      {saveState === 'saving' ? 'Saving…'
                       : saveState === 'saved' ? 'Saved'
                       : 'Save'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Save error banner */}
              {saveState === 'error' && saveError && (
                <div className="stn-alert stn-alert--error" role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* ── Loading ── */}
              {loadState === 'loading' && (
                <div className="stn-load-state" aria-live="polite">
                  <Loader2 size={18} className="animate-spin stn-load-icon" aria-hidden="true" />
                  <span>Loading store profile…</span>
                </div>
              )}

              {/* ── Load error ── */}
              {loadState === 'error' && (
                <div className="stn-load-error" role="alert">
                  <AlertCircle size={16} className="stn-load-error-icon" aria-hidden="true" />
                  <div>
                    <p className="stn-load-error-msg">{loadError}</p>
                    <button onClick={loadStore} className="stn-btn-retry">
                      <RefreshCw size={12} aria-hidden="true" /> Try again
                    </button>
                  </div>
                </div>
              )}

              {/* ── Form ── */}
              {loadState === 'loaded' && (
                <div className="stn-form">

                  {/* ── Group 1: Pharmacy Identity ── */}
                  <fieldset className="stn-group">
                    <legend className="stn-group-title">
                      <Building2 size={12} aria-hidden="true" />
                      Pharmacy Identity
                    </legend>

                    <div className="stn-row stn-row--name-code">
                      {/* Name — wide left column */}
                      <div className="stn-field">
                        <label htmlFor="stn-name" className="stn-label">
                          Pharmacy Name
                          <span className="stn-required" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="stn-name"
                          type="text"
                          value={formValues.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                          className={`stn-input${fieldErrors.name ? ' stn-input--error' : ''}`}
                          placeholder="e.g. Gurukripa Medical & Surgical Stores"
                          aria-required="true"
                          aria-describedby={fieldErrors.name ? 'stn-name-err' : undefined}
                          autoComplete="organization"
                        />
                        {fieldErrors.name && (
                          <span id="stn-name-err" className="stn-field-error" role="alert">
                            {fieldErrors.name}
                          </span>
                        )}
                      </div>

                      {/* Code — read-only */}
                      <div className="stn-field">
                        <label htmlFor="stn-code" className="stn-label">
                          Store Code
                          <span className="stn-hint">Auto-assigned · read-only</span>
                        </label>
                        <input
                          id="stn-code"
                          type="text"
                          value={formValues.code}
                          readOnly
                          className="stn-input stn-input--readonly"
                          aria-label="Store code (read-only)"
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* ── Group 2: Contact & Communication ── */}
                  <fieldset className="stn-group">
                    <legend className="stn-group-title">
                      <Phone size={12} aria-hidden="true" />
                      Contact &amp; Communication
                    </legend>
                    <div className="stn-row stn-row--2">
                      <div className="stn-field">
                        <label htmlFor="stn-phone" className="stn-label">WhatsApp / Phone</label>
                        <input
                          id="stn-phone"
                          type="tel"
                          value={formValues.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          className="stn-input"
                          placeholder="10-digit mobile number"
                          autoComplete="tel"
                        />
                      </div>
                      <div className="stn-field">
                        <label htmlFor="stn-email" className="stn-label">Email Address</label>
                        <input
                          id="stn-email"
                          type="email"
                          value={formValues.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                          className="stn-input"
                          placeholder="contact@pharmacy.in"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* ── Group 3: Address ── */}
                  <fieldset className="stn-group">
                    <legend className="stn-group-title">
                      <MapPin size={12} aria-hidden="true" />
                      Address
                    </legend>
                    <div className="stn-row stn-row--1">
                      <div className="stn-field">
                        <label htmlFor="stn-address" className="stn-label">Street Address</label>
                        <input
                          id="stn-address"
                          type="text"
                          value={formValues.address}
                          onChange={(e) => handleChange('address', e.target.value)}
                          className="stn-input"
                          placeholder="Street, landmark, ward"
                          autoComplete="street-address"
                        />
                      </div>
                    </div>
                    <div className="stn-row stn-row--3">
                      <div className="stn-field">
                        <label htmlFor="stn-city" className="stn-label">City</label>
                        <input
                          id="stn-city"
                          type="text"
                          value={formValues.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          className="stn-input"
                          placeholder="e.g. Katni"
                          autoComplete="address-level2"
                        />
                      </div>
                      <div className="stn-field">
                        <label htmlFor="stn-state" className="stn-label">State</label>
                        <input
                          id="stn-state"
                          type="text"
                          value={formValues.state}
                          onChange={(e) => handleChange('state', e.target.value)}
                          className="stn-input"
                          placeholder="e.g. Madhya Pradesh"
                          autoComplete="address-level1"
                        />
                      </div>
                      <div className="stn-field">
                        <label htmlFor="stn-pincode" className="stn-label">Pincode</label>
                        <input
                          id="stn-pincode"
                          type="text"
                          value={formValues.pincode}
                          onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="stn-input stn-input--mono"
                          placeholder="6-digit PIN"
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="postal-code"
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* ── Group 4: Regulatory ── */}
                  <fieldset className="stn-group stn-group--last">
                    <legend className="stn-group-title">
                      <Shield size={12} aria-hidden="true" />
                      Regulatory
                    </legend>
                    <div className="stn-row stn-row--2">
                      <div className="stn-field">
                        <label htmlFor="stn-gstin" className="stn-label">GSTIN</label>
                        <input
                          id="stn-gstin"
                          type="text"
                          value={formValues.gstin}
                          onChange={(e) => handleChange('gstin', e.target.value.toUpperCase().slice(0, 15))}
                          className="stn-input stn-input--mono"
                          placeholder="15-character GSTIN"
                          maxLength={15}
                          aria-label="GST Identification Number"
                        />
                      </div>
                      <div className="stn-field">
                        <label htmlFor="stn-dlnumber" className="stn-label">
                          Drug Licence No.
                          <span className="stn-hint">Single field</span>
                        </label>
                        <input
                          id="stn-dlnumber"
                          type="text"
                          value={formValues.dlNumber}
                          onChange={(e) => handleChange('dlNumber', e.target.value)}
                          className="stn-input stn-input--mono"
                          placeholder="e.g. DL.No. 20/1495/55/2025"
                        />
                      </div>
                    </div>
                  </fieldset>

                </div>
              )}
            </div>
          )}

          {/* ════════════════ DATA MANAGEMENT ════════════════ */}
          {activeSection === 'data-management' && (
            <div className={`stn-section ${isImportReviewMode ? 'stn-section--studio' : ''}`}>

              {!isImportReviewMode && (
                <>
                  <div className="stn-section-head stn-section-head--borderless">
                    <div>
                      <h2 className="stn-section-title">Data Management</h2>
                      <p className="stn-section-desc">
                        Import, export, and audit your pharmacy data.
                      </p>
                    </div>
                  </div>

                  {/* Sub-tab bar */}
                  <div className="stn-subtab-bar" role="tablist" aria-label="Data management tabs">
                    {[
                      { key: 'import',  label: 'Import Data',   icon: UploadCloud },
                      { key: 'export',  label: 'Export Data',   icon: DownloadCloud },
                      { key: 'history', label: 'Import History', icon: History },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        role="tab"
                        aria-selected={dataSubTab === key}
                        onClick={() => setDataSubTab(key)}
                        className={`stn-subtab${dataSubTab === key ? ' stn-subtab--active' : ''}`}
                      >
                        <Icon size={13} aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Sub-tab panels */}
              <div role="tabpanel" aria-label={dataSubTab}>
                {dataSubTab === 'import' && (
                  <ImportWorkspace onReviewModeChange={setIsImportReviewMode} />
                )}

                {dataSubTab === 'export' && (
                  <div className="stn-placeholder">
                    <DownloadCloud size={28} className="stn-placeholder-icon" aria-hidden="true" />
                    <h3 className="stn-placeholder-title">Export Engine — Phase 2</h3>
                    <p className="stn-placeholder-body">
                      Full data export in CSV, Excel, and JSON for Products, Customers,
                      Purchases, and Suppliers is scheduled for Phase 2.
                    </p>
                    <div className="stn-placeholder-grid">
                      {['Inventory & Batches', 'Purchases', 'Parties', 'Ledgers & GST'].map((label) => (
                        <div key={label} className="stn-placeholder-chip">{label}</div>
                      ))}
                    </div>
                  </div>
                )}

                {dataSubTab === 'history' && (
                  <ImportHistory
                    onTrackJob={() => setDataSubTab('import')}
                  />
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
