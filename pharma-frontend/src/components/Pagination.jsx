import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  pagination,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
  itemLabel = 'records',
}) {
  if (!pagination) return null;

  const { page = 1, limit = 25, total = 0, totalPages = 1 } = pagination;

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  // Generate visible page numbers
  const getVisiblePages = () => {
    const pages = [];
    const maxButtons = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div
      className={`table-pagination-bar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 16px',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        borderRadius: '0 0 8px 8px',
        fontSize: '13px',
        color: '#475569',
      }}
    >
      {/* Left: Total & range text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <span>
          Showing <strong style={{ color: '#0f172a' }}>{from}</strong> to{' '}
          <strong style={{ color: '#0f172a' }}>{to}</strong> of{' '}
          <strong style={{ color: '#0f172a' }}>{total}</strong> {itemLabel}
        </span>

        {/* Page size selector */}
        {onLimitChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Per page:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page navigation buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          title="First Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: page <= 1 ? '#f1f5f9' : '#ffffff',
            color: page <= 1 ? '#94a3b8' : '#334155',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronsLeft size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          title="Previous Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: page <= 1 ? '#f1f5f9' : '#ffffff',
            color: page <= 1 ? '#94a3b8' : '#334155',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronLeft size={14} />
        </button>

        {visiblePages[0] > 1 && (
          <span style={{ padding: '0 4px', color: '#94a3b8', fontSize: '11px' }}>...</span>
        )}

        {visiblePages.map((p) => {
          const isActive = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              style={{
                minWidth: '28px',
                height: '28px',
                padding: '0 6px',
                borderRadius: '6px',
                border: isActive ? '1px solid #007a70' : '1px solid #cbd5e1',
                background: isActive ? '#007a70' : '#ffffff',
                color: isActive ? '#ffffff' : '#334155',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          );
        })}

        {visiblePages[visiblePages.length - 1] < totalPages && (
          <span style={{ padding: '0 4px', color: '#94a3b8', fontSize: '11px' }}>...</span>
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          title="Next Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: page >= totalPages ? '#f1f5f9' : '#ffffff',
            color: page >= totalPages ? '#94a3b8' : '#334155',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          title="Last Page"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: page >= totalPages ? '#f1f5f9' : '#ffffff',
            color: page >= totalPages ? '#94a3b8' : '#334155',
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
