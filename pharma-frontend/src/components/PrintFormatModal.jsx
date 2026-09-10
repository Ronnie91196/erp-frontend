import React from 'react';
import { FileText, ShieldAlert, X } from 'lucide-react';

/**
 * PrintFormatModal - Dual-mode invoice print selection
 * Allows toggling between:
 * 1. Actual Invoice (Shows rates, customer discounts, actual totals)
 * 2. Association Format (Hides rate and discounts, calculates total strictly using QTY × MRP)
 */
export default function PrintFormatModal({ isOpen, onClose, onSelectMode }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '450px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-6 border-b border-slate-100 bg-slate-50"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
              Select Print Format
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Choose how this invoice should be presented.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div
          className="p-6 space-y-4"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Option A: Actual Invoice */}
          <button
            type="button"
            onClick={() => onSelectMode('actual')}
            className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-[#2E7D68] hover:bg-[#2E7D68]/5 transition-all group"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              background: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2E7D68';
              e.currentTarget.style.backgroundColor = 'rgba(46, 125, 104, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            <div
              style={{
                padding: '9px',
                borderRadius: '8px',
                background: '#e6f4f1',
                color: '#2E7D68',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div
                className="font-bold text-slate-800 group-hover:text-[#2E7D68]"
                style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}
              >
                Print Actual Invoice
              </div>
              <div
                className="text-xs text-slate-500 mt-1"
                style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', lineHeight: 1.4 }}
              >
                Shows exact rates, amounts, and customer discounts.
              </div>
            </div>
          </button>

          {/* Option B: Association / MRP-Only Invoice */}
          <button
            type="button"
            onClick={() => onSelectMode('mrp')}
            className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-all group"
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid #fde68a',
              background: '#fffdf5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#f59e0b';
              e.currentTarget.style.backgroundColor = '#fffbeb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#fde68a';
              e.currentTarget.style.backgroundColor = '#fffdf5';
            }}
          >
            <div
              style={{
                padding: '9px',
                borderRadius: '8px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <div
                className="font-bold text-slate-800 group-hover:text-amber-600"
                style={{ fontWeight: 700, fontSize: '15px', color: '#92400e' }}
              >
                Print on MRP (Association Format)
              </div>
              <div
                className="text-xs text-slate-500 mt-1"
                style={{ fontSize: '12px', color: '#78350f', marginTop: '3px', lineHeight: 1.4 }}
              >
                Hides Rate & Discount. Calculates total strictly using QTY × MRP.
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div
          className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end"
          style={{
            padding: '14px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg font-medium"
            style={{
              padding: '8px 18px',
              color: '#64748b',
              background: '#e2e8f0',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
