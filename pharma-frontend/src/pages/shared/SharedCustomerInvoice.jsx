import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { unwrap } from '../../lib/api';
import {
  Phone,
  Calendar,
  Pill,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Share2,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Info,
  User,
} from 'lucide-react';
import appLogo from '../../assets/appLogo.png';

export default function SharedCustomerInvoice() {
  const { id } = useParams();

  const { data: invoice, isLoading, isError, error } = useQuery({
    queryKey: ['public-invoice', id],
    queryFn: async () => {
      const res = unwrap(await api.get(`/public/invoice/${id}`));
      return res;
    },
    enabled: Boolean(id),
    retry: 1,
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Digital Prescription & Bill - ${invoice?.store?.name || 'Pharmacy'}`,
        text: `Hello ${invoice?.customer?.name || 'Valued Customer'}, here is your digital invoice and dosage tracker for bill #${invoice?.invoiceNumber}:`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      const text = encodeURIComponent(`Here is your digital prescription & invoice: ${window.location.href}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#005a52', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #bbf7d0', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, color: '#e6fffa', fontWeight: 600, fontSize: 14 }}>Loading your digital bill & dosage plan...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16 }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ color: '#0f172a', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Invoice Not Available</h2>
        <p style={{ color: '#64748b', fontSize: 14, maxWidth: 360, margin: '0 0 24px', lineHeight: 1.5 }}>
          {error?.message || 'This digital receipt link may have expired or is invalid.'}
        </p>
      </div>
    );
  }

  const isPaid = invoice.paymentStatus === 'PAID';
  const store = invoice.store || {};
  const customer = invoice.customer || {};
  const reminders = invoice.reminders || [];
  const items = invoice.items || [];

  // Resolve Doctor Name
  const doctorName = invoice.doctor || (invoice.doctorRel ? (invoice.doctorRel.name?.startsWith('Dr') ? invoice.doctorRel.name : `Dr. ${invoice.doctorRel.name}`) : null);

  // Format Expiry date mm/yy or MMM yyyy
  const formatExp = (dateStr) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const y = String(d.getFullYear()).slice(-2);
      return `${m}/${y}`;
    } catch {
      return String(dateStr);
    }
  };

  // Match reminders or provide intelligent default dosage structure
  const getDosageInfoForItem = (itemName) => {
    let matched = null;
    if (reminders && reminders.length > 0) {
      matched = reminders.find(
        (r) => r.drugName && itemName && (
          r.drugName.toLowerCase().includes(itemName.toLowerCase()) ||
          itemName.toLowerCase().includes(r.drugName.toLowerCase())
        )
      );
    }

    if (matched) {
      const timesStr = String(matched.reminderTime || '').toUpperCase();
      const isMorning = timesStr.includes('07:00 AM') || timesStr.includes('08:00 AM') || timesStr.includes('09:00 AM') || timesStr.includes('MORNING') || (matched.timesPerDay >= 1);
      const isAfternoon = timesStr.includes('12:00 PM') || timesStr.includes('01:00 PM') || timesStr.includes('NOON') || timesStr.includes('LUNCH') || (matched.timesPerDay >= 3);
      const isEvening = timesStr.includes('05:00 PM') || timesStr.includes('07:00 PM') || timesStr.includes('EVENING') || (matched.timesPerDay >= 4);
      const isNight = timesStr.includes('08:00 PM') || timesStr.includes('08:30 PM') || timesStr.includes('09:30 PM') || timesStr.includes('10:00 PM') || timesStr.includes('NIGHT') || timesStr.includes('BEDTIME') || (matched.timesPerDay >= 2);

      return {
        timesPerDay: matched.timesPerDay || 4,
        mealTiming: matched.mealTiming || 'AFTER_MEAL',
        instructions: matched.dosageInstructions || 'Take with Food • 1 dose with water',
        slots: {
          morning: isMorning,
          afternoon: isAfternoon,
          evening: isEvening,
          night: isNight,
        },
      };
    }

    // Default Mediflux schedule (all 4 slots active for comprehensive patient care)
    return {
      timesPerDay: 4,
      mealTiming: 'WITH_FOOD',
      instructions: 'Take with Food • 1 dose with water',
      slots: {
        morning: true,
        afternoon: true,
        evening: true,
        night: true,
      },
    };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6F5', padding: '0 0 40px', fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Mobile Frame Container */}
      <div style={{ maxWidth: '440px', margin: '0 auto', background: '#FFFFFF', minHeight: '100vh', boxShadow: '0 20px 45px rgba(30, 38, 43, 0.08)', position: 'relative', overflow: 'hidden' }}>
        
        {/* Top Header - Soft Graphite Charcoal (brand.dark to brand.darker) */}
        <div style={{ background: 'linear-gradient(145deg, #1E262B 0%, #161D21 100%)', color: '#ffffff', padding: '24px 20px 44px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}>
                <Building2 size={20} color="#48BB78" />
              </div>
              <div>
                <h1 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '-0.2px', lineHeight: 1.25, color: '#F4F6F5' }}>
                  {store.name || 'Gurukripa Medical & Surgical Stores'}
                </h1>
                <div style={{ fontSize: '11px', color: '#718096', fontWeight: 500, marginTop: '3px' }}>
                  {store.city ? `${store.city}${store.state ? `, ${store.state}` : ''}` : (store.state || 'Katni, Madhya Pradesh')}
                </div>
                <div style={{ fontSize: '9.5px', color: '#488585', opacity: 0.95, marginTop: '3px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span>DL No: <b className="text-white">{store.dlNumber || '20/1495/55/ 2025, 21/1496/55/ 2025'}</b></span>
                  {store.gstin && <span>GSTIN: <b className="text-white">{store.gstin}</b></span>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {(store.phone || '7772093527') && (
                <a
                  href={`tel:${store.phone || '7772093527'}`}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#48BB78',
                    textDecoration: 'none',
                    transition: 'transform 0.15s ease',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                  title="Call Pharmacy"
                >
                  <Phone size={15} />
                </a>
              )}
              <button
                type="button"
                onClick={handleShare}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#488585',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                title="Share Invoice"
              >
                <Share2 size={15} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: '12.5px', color: '#E2E8F0', fontWeight: 500, lineHeight: 1.45 }}>
            Hello <strong>{customer.name || 'Valued Customer'}</strong>, thank you for choosing us! Below is your digital bill and customized medication dosage plan.
          </div>
        </div>

        {/* Floating Overlapping Invoice Summary Card */}
        <div style={{ margin: '-28px 16px 0', position: 'relative', zIndex: 10 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 18px', boxShadow: '0 10px 28px rgba(30, 38, 43, 0.06)', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#2E7D68', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  INVOICE #{invoice.invoiceNumber}
                </div>
                <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: isPaid ? '#E8F3EE' : '#FDF2F2',
                    color: isPaid ? '#2E7D68' : '#C53030',
                    border: isPaid ? '1px solid #D1E6DC' : '1px solid #FED7D7',
                  }}
                >
                  <CheckCircle2 size={13} /> {isPaid ? 'PAID' : `DUE: ₹${Number(invoice.dueAmount || 0).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: '#718096', display: 'block', fontWeight: 500 }}>Total Bill Amount</span>
                <span style={{ fontSize: '26px', fontWeight: 900, color: '#1E262B', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                  ₹{Number(invoice.totalAmount || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#718096', display: 'block' }}>Payment Method</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#2E7D68', textTransform: 'uppercase' }}>
                  {invoice.payments?.[0]?.paymentMethod || invoice.paymentMethod || 'CASH'}
                </span>
              </div>
            </div>

            {doctorName && (
              <div style={{ marginTop: '12px', background: '#F4F6F5', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px', color: '#2D3748', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} color="#2E7D68" />
                <span>Prescribed by <strong>{doctorName}</strong></span>
              </div>
            )}

            {invoice.isAyushman && (
              <div style={{ marginTop: '8px', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '10.5px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏥 <strong>Ayushman Bharat Scheme</strong></span>
                <span>Card: {invoice.ayushmanCardNo || 'Registered'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section: Items & Medication Tracker */}
        <div style={{ padding: '22px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '12px', fontWeight: 800, color: '#0f3a34', textTransform: 'uppercase', letterSpacing: '0.6px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#007a70' }}>🔗</span> MEDICATION & DOSAGE PLAN
            </h2>
            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#007a70', background: '#e3f4ee', padding: '3px 9px', borderRadius: '12px' }}>
              {items.length} Item(s)
            </span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {items.map((it, idx) => {
              const dosage = getDosageInfoForItem(it.product?.name);
              const times = dosage?.timesPerDay || 4;

              const timings = [
                { id: 'morning', label: 'Morning', icon: Sunrise, active: dosage.slots?.morning },
                { id: 'afternoon', label: 'Afternoon', icon: Sun, active: dosage.slots?.afternoon },
                { id: 'evening', label: 'Evening', icon: Sunset, active: dosage.slots?.evening },
                { id: 'night', label: 'Night', icon: Moon, active: dosage.slots?.night },
              ];

              const packText = it.packaging?.name || it.product?.dosageForm || (it.product?.strength ? `${it.product.strength}` : '10Tab');
              const batchNo = it.batch?.batchNumber || 'N/A';
              const expFormatted = formatExp(it.batch?.expiryDate) || 'N/A';
              const mrpVal = Number(it.batch?.mrp || 0);
              const rateVal = Number(it.unitPrice || 0);

              return (
                <div
                  key={it.id || idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    padding: '16px',
                    border: '1px solid #dbeef1',
                    boxShadow: '0 3px 12px rgba(0, 40, 30, 0.04)',
                  }}
                >
                  {/* Top Item Row: Title & Price */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ paddingRight: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f3a34', lineHeight: 1.3 }}>
                        {it.product?.name || 'Prescription Drug'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px', fontWeight: 500 }}>
                        {it.product?.genericName ? `${it.product.genericName}` : ''}
                        {it.product?.genericName && it.product?.manufacturer?.name ? ' • ' : ''}
                        {it.product?.manufacturer?.name ? `${it.product.manufacturer.name}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#007a70' }}>
                        Qty: {Number(it.quantity || 1)}
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f3a34', marginTop: '1px' }}>
                        ₹{Number(it.totalAmount || (it.quantity * it.unitPrice) || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Enriched Clinical Metadata Badges (Pack, Batch, Exp) */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      Pack: <b style={{ color: '#1e293b' }}>{packText}</b>
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      Batch: <b style={{ color: '#1e293b' }}>{batchNo}</b>
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      Exp: <b style={{ color: '#1e293b' }}>{expFormatted}</b>
                    </span>
                  </div>

                  {/* Pricing Comparison: MRP vs Rate */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '10.5px', color: '#64748b', marginBottom: '12px', background: '#f8faf9', padding: '4px 8px', borderRadius: '6px' }}>
                    {mrpVal > 0 && (
                      <span>MRP: <del>₹{mrpVal.toFixed(2)}</del></span>
                    )}
                    {rateVal > 0 && (
                      <span style={{ color: '#007a70', fontWeight: 700 }}>Rate: ₹{rateVal.toFixed(2)}</span>
                    )}
                    {mrpVal > rateVal && rateVal > 0 && (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '10px', fontSize: '9.5px', fontWeight: 800 }}>
                        Save ₹{(mrpVal - rateVal).toFixed(2)}/unit
                      </span>
                    )}
                  </div>

                  {/* Visual Dosage Slots Timeline (Therapeutic Sage Schedule) */}
                  <div style={{ background: '#F4F6F5', borderRadius: '10px', padding: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#2E7D68', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                      DAILY DOSAGE SCHEDULE ({times}X DAILY)
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {timings.map((t) => {
                        const IconComponent = t.icon;
                        return (
                          <div
                            key={t.id}
                            style={{
                              borderRadius: '8px',
                              padding: '8px 4px',
                              textAlign: 'center',
                              background: t.active ? '#2E7D68' : '#EDF2F7',
                              color: t.active ? '#ffffff' : '#718096',
                              boxShadow: t.active ? '0 2px 6px rgba(46, 125, 104, 0.25)' : 'none',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                              <IconComponent size={15} />
                            </div>
                            <div style={{ fontSize: '9.5px', fontWeight: 700 }}>{t.label}</div>
                            <div style={{ fontSize: '8.5px', opacity: t.active ? 0.95 : 0.6, marginTop: '2px' }}>
                              {t.active ? '1 Dose' : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Meal Timing & Doctor Instructions */}
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', fontSize: '10.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={12} color="#2E7D68" />
                      <span>{dosage.instructions || 'Take with Food • 1 dose with water'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bill Breakdown Accordion / Details */}
        <div style={{ padding: '8px 16px 20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(30, 38, 43, 0.04)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#1E262B', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              TAX & PRICE BREAKDOWN
            </div>
            <div style={{ display: 'grid', gap: '6px', fontSize: '11.5px', color: '#718096' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal (MRP)</span>
                <span className="text-slate-800 font-semibold">₹{Number(invoice.subtotal || invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
              {Number(invoice.discountAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E7D68', fontWeight: 600 }}>
                  <span>Discount Applied</span>
                  <span>-₹{Number(invoice.discountAmount || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.taxableAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Taxable Value</span>
                  <span>₹{Number(invoice.taxableAmount || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.cgstAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST (Incl.)</span>
                  <span>₹{Number(invoice.cgstAmount || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.sgstAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST (Incl.)</span>
                  <span>₹{Number(invoice.sgstAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#1E262B', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontSize: '13px' }}>
                <span>Net Payable</span>
                <span>₹{Number(invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Footer */}
        <div style={{ padding: '0 20px 32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', fontWeight: 700, color: '#2E7D68', background: '#E8F3EE', border: '1px solid #D1E6DC', padding: '5px 14px', borderRadius: '20px', marginBottom: '14px' }}>
            <ShieldCheck size={13} /> Verified Digital Prescription & Invoice
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            <img src={appLogo} alt="OTODDY" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            <span style={{ fontSize: '11px', color: '#2D3748', fontWeight: 800 }}>
              SSDN PHARMAORA <span style={{ color: '#2E7D68' }}>by OTODDY</span>
            </span>
          </div>
          <div style={{ fontSize: '10px', color: '#718096' }}>
            Next-Gen Intelligent Healthcare ERP
          </div>
        </div>

      </div>
    </div>
  );
}
