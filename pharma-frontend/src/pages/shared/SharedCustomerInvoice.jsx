import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { unwrap } from '../../lib/api';
import {
  Phone,
  Calendar,
  Clock,
  Pill,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Receipt,
  Share2,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Info,
} from 'lucide-react';

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
      <div style={{ minHeight: '100vh', background: '#f0fdf9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #007a70', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: 16, color: '#007a70', fontWeight: 600, fontSize: 14 }}>Loading your digital invoice & medication schedule...</p>
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

  // Match reminders with invoice items for smart dosage timings (ONLY IF REMINDER WAS SET)
  const getDosageInfoForItem = (itemName) => {
    if (!reminders || reminders.length === 0) return null;
    const matched = reminders.find(
      (r) => r.drugName && itemName && (
        r.drugName.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(r.drugName.toLowerCase())
      )
    );
    if (!matched) return null;

    const timesStr = String(matched.reminderTime || '').toUpperCase();
    const isMorning = timesStr.includes('07:00 AM') || timesStr.includes('08:00 AM') || timesStr.includes('09:00 AM') || timesStr.includes('MORNING') || (matched.timesPerDay >= 1);
    const isAfternoon = timesStr.includes('12:00 PM') || timesStr.includes('01:00 PM') || timesStr.includes('NOON') || timesStr.includes('LUNCH') || (matched.timesPerDay >= 3);
    const isEvening = timesStr.includes('05:00 PM') || timesStr.includes('07:00 PM') || timesStr.includes('EVENING') || (matched.timesPerDay >= 4);
    const isNight = timesStr.includes('08:00 PM') || timesStr.includes('08:30 PM') || timesStr.includes('09:30 PM') || timesStr.includes('10:00 PM') || timesStr.includes('NIGHT') || timesStr.includes('BEDTIME') || (matched.timesPerDay >= 2);

    return {
      timesPerDay: matched.timesPerDay || 1,
      mealTiming: matched.mealTiming || 'AFTER_MEAL',
      instructions: matched.dosageInstructions || '',
      reminderTime: matched.reminderTime || '08:00 AM',
      reminderDate: matched.reminderDate,
      slots: {
        morning: isMorning,
        afternoon: isAfternoon,
        evening: isEvening,
        night: isNight,
      },
    };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#edf5f2', padding: '0 0 40px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Mobile Frame Container */}
      <div style={{ maxWidth: '440px', margin: '0 auto', background: '#ffffff', minHeight: '100vh', boxShadow: '0 20px 40px rgba(0, 50, 40, 0.12)', position: 'relative', overflow: 'hidden' }}>
        
        {/* Top Header */}
        <div style={{ background: 'linear-gradient(135deg, #005a52 0%, #007a70 100%)', color: '#ffffff', padding: '24px 20px 48px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} color="#ffffff" />
              </div>
              <div>
                <h1 style={{ fontSize: '15px', fontWeight: 800, margin: 0, letterSpacing: '-0.2px' }}>
                  {store.name || 'Main Pharmacy'}
                </h1>
                <div style={{ fontSize: '10.5px', color: '#bbf7d0', fontWeight: 500 }}>
                  {store.city ? `${store.city}, ${store.state || 'India'}` : 'Verified Digital Healthcare'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {store.phone && (
                <a
                  href={`tel:${store.phone}`}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    textDecoration: 'none',
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
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  border: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
                title="Share Invoice"
              >
                <Share2 size={15} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#e6fffa', fontWeight: 500, lineHeight: 1.4 }}>
            Hello <strong>{customer.name || 'Valued Customer'}</strong>, thank you for choosing us! Below is your digital bill and customized medication dosage plan.
          </div>
        </div>

        {/* Floating Overlapping Invoice Summary Card */}
        <div style={{ margin: '-32px 16px 0', position: 'relative', zIndex: 10 }}>
          <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px 18px', boxShadow: '0 8px 24px rgba(10, 49, 40, 0.1)', border: '1px solid #dcebe6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f7f5', paddingBottom: '12px', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  INVOICE #{invoice.invoiceNumber}
                </div>
                <div style={{ fontSize: '11px', color: '#68827c', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={11} /> {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: isPaid ? '#ecfdf5' : '#fff1f2',
                    color: isPaid ? '#059669' : '#e11d48',
                    border: isPaid ? '1px solid #a7f3d0' : '1px solid #fecaca',
                  }}
                >
                  <CheckCircle2 size={12} /> {isPaid ? 'PAID' : `DUE: ₹${Number(invoice.dueAmount || 0).toFixed(2)}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <span style={{ fontSize: '10.5px', color: '#68827c', display: 'block' }}>Total Bill Amount</span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#133e36', letterSpacing: '-0.5px' }}>
                  ₹{Number(invoice.totalAmount || 0).toFixed(2)}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: '#68827c', display: 'block' }}>Payment Method</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#007a70' }}>
                  {invoice.paymentMethod || 'Cash'}
                </span>
              </div>
            </div>

            {invoice.isAyushman && (
              <div style={{ marginTop: '12px', background: '#f0fdf4', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '10.5px', color: '#166534', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🏥 <strong>Ayushman Bharat Scheme</strong></span>
                <span>Card: {invoice.ayushmanCardNo || 'Registered'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section: Items & Medication Tracker */}
        <div style={{ padding: '20px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 800, color: '#133e36', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Pill size={14} color="#007a70" /> {reminders.length > 0 ? 'Medication & Dosage Plan' : 'Purchased Medicines'}
            </h2>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#007a70', background: '#eef8f5', padding: '2px 8px', borderRadius: '12px' }}>
              {items.length} Item(s)
            </span>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {items.map((it, idx) => {
              const dosage = getDosageInfoForItem(it.product?.name);
              const times = dosage?.timesPerDay || 1;

              // Compute Visual Dosage Quadrants (Morning, Afternoon, Evening, Night) only if dosage exists
              const timings = dosage ? [
                { id: 'morning', label: 'Morning', icon: Sunrise, active: dosage.slots?.morning, sub: '8 AM' },
                { id: 'afternoon', label: 'Afternoon', icon: Sun, active: dosage.slots?.afternoon, sub: '1 PM' },
                { id: 'evening', label: 'Evening', icon: Sunset, active: dosage.slots?.evening, sub: '7 PM' },
                { id: 'night', label: 'Night', icon: Moon, active: dosage.slots?.night, sub: '10 PM' },
              ] : [];

              const mealTimingText = dosage ? ({
                AFTER_MEAL: 'After Food (Post-Meal)',
                BEFORE_MEAL: 'Before Food (Empty Stomach)',
                WITH_FOOD: 'Take with Food',
                ANYTIME: 'Anytime',
              }[dosage.mealTiming] || dosage.mealTiming) : '';

              return (
                <div
                  key={it.id || idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px',
                    border: '1px solid #dceae5',
                    boxShadow: '0 2px 8px rgba(0, 40, 30, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#133e36' }}>
                        {it.product?.name || 'Prescription Drug'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#68827c', marginTop: '2px' }}>
                        {it.product?.genericName ? `${it.product.genericName} • ` : ''}
                        {it.product?.manufacturer?.name || it.packaging?.name || 'Standard Pack'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#007a70' }}>
                        Qty: {Number(it.quantity || 1)}
                      </span>
                      <div style={{ fontSize: '10px', color: '#889f9a' }}>
                        ₹{Number(it.totalAmount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Visual Dosage Slots Timeline - ONLY SHOWN IF REMINDER INFO IS AVAILABLE */}
                  {dosage && (
                    <div style={{ marginTop: '10px', background: '#f6fbf9', borderRadius: '8px', padding: '8px', border: '1px solid #e5f2ed' }}>
                      <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#007a70', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                        Daily Dosage Schedule ({times}x Daily)
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {timings.map((t) => {
                          const IconComponent = t.icon;
                          return (
                            <div
                              key={t.id}
                              style={{
                                borderRadius: '6px',
                                padding: '6px 4px',
                                textAlign: 'center',
                                background: t.active ? '#007a70' : '#edf3f1',
                                color: t.active ? '#ffffff' : '#889f9a',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2px' }}>
                                <IconComponent size={14} />
                              </div>
                              <div style={{ fontSize: '9.5px', fontWeight: 700 }}>{t.label}</div>
                              <div style={{ fontSize: '8px', opacity: t.active ? 0.9 : 0.6 }}>
                                {t.active ? '1 Dose' : '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Meal Timing & Doctor Instructions */}
                      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #d5e7e1', fontSize: '10px', color: '#446059', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Info size={11} color="#007a70" />
                        <span>{mealTimingText} {dosage.instructions ? `• ${dosage.instructions}` : ''}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bill Breakdown Accordion / Details */}
        <div style={{ padding: '8px 16px 20px' }}>
          <div style={{ background: '#f8faf9', borderRadius: '12px', padding: '14px', border: '1px solid #e2eee9' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#133e36', marginBottom: '8px', textTransform: 'uppercase' }}>
              Tax & Price Breakdown
            </div>
            <div style={{ display: 'grid', gap: '5px', fontSize: '11px', color: '#55726c' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal (MRP)</span>
                <span>₹{Number(invoice.subtotal || invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
              {Number(invoice.discountAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                  <span>Discount Applied</span>
                  <span>-₹{Number(invoice.discountAmount || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.cgstAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CGST</span>
                  <span>₹{Number(invoice.cgstAmount || 0).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.sgstAmount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>SGST</span>
                  <span>₹{Number(invoice.sgstAmount || 0).toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#133e36', paddingTop: '6px', borderTop: '1px solid #dce8e4', fontSize: '12px' }}>
                <span>Net Payable</span>
                <span>₹{Number(invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Footer */}
        <div style={{ padding: '0 20px 32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 700, color: '#007a70', background: '#eef8f5', padding: '4px 12px', borderRadius: '20px', marginBottom: '12px' }}>
            <ShieldCheck size={12} /> Verified Digital Prescription & Invoice
          </div>
          <div style={{ fontSize: '10.5px', color: '#889f9a' }}>
            Powered by <strong>Mediflux ERP</strong> • Modernizing Healthcare
          </div>
        </div>

      </div>
    </div>
  );
}
