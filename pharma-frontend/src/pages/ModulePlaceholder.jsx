import React from 'react';

export default function ModulePlaceholder({ title }) {
  return (
    <section className="module-placeholder">
      <span className="eyebrow">Pharmacy ERP</span>
      <h2>{title}</h2>
      <p className="muted">This module is ready for its workflow configuration.</p>
    </section>
  );
}
