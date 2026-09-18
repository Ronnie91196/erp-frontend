import { numberToWords } from './numberToWords.js';

/**
 * Smart Pharma "PACK" Column Logic (replaces generic dosage form names like Tablet/Syrup)
 */
export function getPharmaPack(item) {
  const prod = item.product || item || {};
  const name = (prod.name || '').toUpperCase();
  const form = (prod.dosageForm || prod.form || '').toUpperCase();

  if (prod.pack && prod.pack.trim() !== '' && !['TABLET', 'CAPSULE', 'SYRUP', 'OINTMENT', 'DROPS', 'INHALER'].includes(prod.pack.toUpperCase())) {
    return prod.pack;
  }

  const mlMatch = name.match(/(\d+\s*ML)/);
  if (mlMatch) return mlMatch[1].replace(/\s+/g, '');

  const gmMatch = name.match(/(\d+\s*GM|\d+\s*G\b)/);
  if (gmMatch) return gmMatch[1].replace(/\s+/g, '');

  const doseMatch = name.match(/(\d+\s*DOSES|\d+\s*MDI)/);
  if (doseMatch) return doseMatch[1];

  const knownConversion = resolveItemConversion(item);
  const stripSize = prod.unitsPerPack || prod.stripSize || prod.packSize || (knownConversion && knownConversion > 1 ? knownConversion : null);
  if (form.includes('TAB') || name.includes('TAB') || form.includes('CAP') || name.includes('CAP')) {
    if (stripSize) return `1x${stripSize}`;
    if (item.packaging?.name && !['TABLET', 'CAPSULE', 'TAB', 'CAP'].includes(item.packaging.name.toUpperCase())) {
      return item.packaging.name;
    }
    return '-';
  }

  if (form.includes('SYRUP') || form.includes('SUSP') || form.includes('LIQUID')) return '100ml';
  if (form.includes('OINT') || form.includes('CREAM') || form.includes('GEL')) return '15gm';
  if (form.includes('DROP')) return '10ml';
  if (form.includes('INJ') || form.includes('VIAL')) return '1 Vial';

  return stripSize ? `${stripSize}'s` : '-';
}

/**
 * Detect dosage category for Tablet / Capsule / Sachet products.
 * Returns { type, packUnitSingular, packUnitPlural, looseUnitSingular, looseUnitPlural } or null.
 * Strictly non-intrusive: preserves existing behavior for syrups, ointments, injections, etc.
 */
export function getProductDosageCategory(item) {
  if (!item) return null;
  const prod = item.product || item;
  const name = String(prod.name || prod.itemName || '').trim().toUpperCase();
  const form = String(prod.dosageForm || prod.form || '').trim().toUpperCase();
  const pack = String(prod.pack || prod.packaging?.name || '').trim().toUpperCase();
  const unit = String(prod.baseUnit?.name || prod.unit?.name || '').trim().toUpperCase();

  // 1. Explicit non-solid-oral exclusion to prevent false positives (e.g. syrups, injections, topicals)
  const isNonSolidOral = /\b(SYRUP|SYP|SUSPENSION|SUSP|LIQUID|SOLUTION|DROPS|OINTMENT|OINT|CREAM|CRM|GEL|LOTION|INJECTION|INJ|INFUSION|EMULSION|RESPULES|SPRAY|SHAMPOO|SOAP|OIL|POWDER)\b/.test(form) ||
    /\b(SYRUP|SYP|SUSPENSION|SUSP|DROPS|INJECTION|INJ|OINTMENT|OINT|CREAM|CRM|GEL|LOTION|SPRAY)\b/.test(name);

  if (isNonSolidOral) {
    return null;
  }

  // 2. CAPSULES check (AZITHRO 500MG CAP, XYZ CAPSULE, etc.)
  const isCapsule = /\b(CAP|CAPS|CAPSULE|CAPSULES)\b/.test(form) ||
    /\b(CAP|CAPS|CAPSULE|CAPSULES)\b/.test(name) ||
    /\b(CAP|CAPS|CAPSULE|CAPSULES)\b/.test(pack) ||
    unit.includes('CAPSULE');

  if (isCapsule) {
    return {
      type: 'CAPSULE',
      packUnitSingular: 'Strip',
      packUnitPlural: 'Strips',
      looseUnitSingular: 'Capsule',
      looseUnitPlural: 'Capsules',
    };
  }

  // 3. TABLETS check (DOLO 650MG TAB, PARACETAMOL 650MG TAB, DOLO 650 TABLET, etc.)
  const isTablet = /\b(TAB|TABS|TABLET|TABLETS)\b/.test(form) ||
    /\b(TAB|TABS|TABLET|TABLETS)\b/.test(name) ||
    /\b(TAB|TABS|TABLET|TABLETS)\b/.test(pack) ||
    unit.includes('TABLET');

  if (isTablet) {
    return {
      type: 'TABLET',
      packUnitSingular: 'Strip',
      packUnitPlural: 'Strips',
      looseUnitSingular: 'Tablet',
      looseUnitPlural: 'Tablets',
    };
  }

  // 4. SACHETS check (where reliably supported)
  const isSachet = /\b(SACHET|SACHETS)\b/.test(form) ||
    /\b(SACHET|SACHETS)\b/.test(name) ||
    /\b(SACHET|SACHETS)\b/.test(pack) ||
    unit.includes('SACHET');

  if (isSachet) {
    return {
      type: 'SACHET',
      packUnitSingular: 'Pack',
      packUnitPlural: 'Packs',
      looseUnitSingular: 'Sachet',
      looseUnitPlural: 'Sachets',
    };
  }

  return null;
}

/**
 * Format quantity display for Print Slip / Bill:
 * - Tablet/Capsule/Sachet:
 *     QTY=1, USE=0  -> "1 Strip"
 *     QTY=2, USE=0  -> "2 Strips"
 *     QTY=1, USE=2  -> "1 Strip + 2 Tablets"
 *     QTY=0, USE=2  -> "2 Tablets"
 *     Capsules: "1 Strip + 2 Capsules" / "2 Capsules"
 * - All other items: returns numeric quantity unchanged (e.g. "1", "2")
 */
/**
 * Resolves the conversion factor (units per strip/pack) for an item.
 * Returns a number > 1 if a valid multi-unit packaging conversion is known,
 * or null if unknown / single-unit base packaging.
 */
export function resolveItemConversion(item) {
  if (!item) return null;
  const prod = item.product || item;

  // 1. Direct item conversionToBase (e.g. from POS cart or stored item)
  if (item.conversionToBase != null && !isNaN(Number(item.conversionToBase))) {
    const val = Number(item.conversionToBase);
    if (val > 1) return Math.round(val);
  }

  // 2. Linked packaging record (from Prisma ProductPackaging relation)
  if (item.packaging?.conversionToBase != null && !isNaN(Number(item.packaging.conversionToBase))) {
    const val = Number(item.packaging.conversionToBase);
    if (val > 1) return Math.round(val);
  }

  // 3. Product's default or primary packaging
  const defaultPkg = prod.packaging?.find?.(p => p.isDefault) || prod.packaging?.[0];
  if (defaultPkg?.conversionToBase != null && !isNaN(Number(defaultPkg.conversionToBase))) {
    const val = Number(defaultPkg.conversionToBase);
    if (val > 1) return Math.round(val);
  }

  // 4. Fallback: Parse explicit pack string if present on product or packaging (e.g. "1x15", "10's", "10CAP", "1x6")
  const packStr = String(item.packaging?.name || prod.pack || '').trim().toUpperCase();
  if (packStr) {
    const multMatch = packStr.match(/(?:1\s*X\s*|STRIP\s*OF\s*)(\d+)/);
    if (multMatch && Number(multMatch[1]) > 1) {
      return Number(multMatch[1]);
    }
    const capTabMatch = packStr.match(/^(\d+)\s*(?:CAP|TAB|PILL|S)/);
    if (capTabMatch && Number(capTabMatch[1]) > 1) {
      return Number(capTabMatch[1]);
    }
  }

  return null;
}

/**
 * Resolves the effective packaging-unit quantity for pricing / MRP calculations.
 * Returns the exact decimal packaging units:
 * - e.g. 1 strip + 3 tablets in 1x10 -> 1.3 packs
 * - e.g. 4 loose tablets in 1x10 -> 0.4 packs
 * - e.g. 2 bottles (conversion 1 or unknown) -> 2 units
 */
export function getEffectivePackQuantity(item) {
  if (!item) return 1;

  const hasExplicitTabs = item.tabs !== undefined && item.tabs !== null && item.tabs !== '';
  const hasExplicitQty = item.qty !== undefined && item.qty !== null && item.qty !== '';
  const hasQuantity = item.quantity !== undefined && item.quantity !== null && item.quantity !== '';
  const hasBaseQuantity = item.baseQuantity !== undefined && item.baseQuantity !== null && item.baseQuantity !== '';

  const conversion = resolveItemConversion(item);

  if (hasExplicitTabs || hasExplicitQty) {
    const strips = Math.max(0, Number(item.qty || 0));
    const loose = Math.max(0, Number(item.tabs || 0));
    if (conversion && conversion > 1) {
      return strips + (loose / conversion);
    }
    return strips + loose;
  }

  if (conversion && conversion > 1) {
    if (hasBaseQuantity && !isNaN(Number(item.baseQuantity))) {
      return Math.max(0, Number(item.baseQuantity)) / conversion;
    }
    if (hasQuantity && !isNaN(Number(item.quantity))) {
      return Math.max(0, Number(item.quantity));
    }
  }

  // Single-unit, loose, or non-packaging items
  if (hasQuantity && !isNaN(Number(item.quantity))) {
    return Math.max(0, Number(item.quantity));
  }
  if (hasBaseQuantity && !isNaN(Number(item.baseQuantity))) {
    return Math.max(0, Number(item.baseQuantity));
  }

  return 1;
}

/**
 * Calculates the total MRP amount for an item based on its effective packaging quantity.
 */
export function getItemMrpAmount(item) {
  if (!item) return 0;
  const effectiveQty = getEffectivePackQuantity(item);
  const mrp = Number(item.batch?.mrp || item.mrp || item.unitPrice || 0);
  return Math.round(effectiveQty * mrp * 100) / 100;
}

/**
 * Format quantity display for Print Slip / Bill:
 * - Tablet/Capsule/Sachet:
 *     Known conversion:
 *       QTY=1, USE=0  -> "1 Strip"
 *       QTY=2, USE=0  -> "2 Strips"
 *       QTY=1, USE=2  -> "1 Strip + 2 Tablets"
 *       QTY=0, USE=2  -> "2 Tablets"
 *     Unknown/missing conversion:
 *       baseQuantity=15 -> "15 Tablets" (does NOT fabricate "1 Strip + 5 Tablets")
 *       baseQuantity=1  -> "1 Tablet"
 *       baseQuantity=2  -> "2 Tablets"
 * - All other items: returns numeric quantity unchanged (e.g. "1", "2")
 */
export function formatSaleDisplayQuantity(item) {
  if (!item) return '1';
  const category = getProductDosageCategory(item);

  // Non-tablet/capsule: preserve existing numeric presentation
  if (!category) {
    const rawQty = item.qty != null ? item.qty : (item.quantity != null ? item.quantity : 1);
    const num = Number(rawQty);
    return isNaN(num) ? String(rawQty) : String(Number(num.toFixed(2)));
  }

  const hasExplicitTabs = item.tabs !== undefined && item.tabs !== null && item.tabs !== '';
  const hasExplicitQty = item.qty !== undefined && item.qty !== null && item.qty !== '';

  let strips = 0;
  let loose = 0;

  if (hasExplicitTabs || hasExplicitQty) {
    strips = Math.max(0, Math.floor(Number(item.qty || 0)));
    loose = Math.max(0, Math.round(Number(item.tabs || 0)));
  } else {
    const conversion = resolveItemConversion(item);

    if (conversion && conversion > 1) {
      // Known packaging conversion (e.g. 6, 10, 15, 20)
      if (item.baseQuantity != null) {
        const totalUnits = Math.round(Number(item.baseQuantity));
        strips = Math.floor(totalUnits / conversion);
        loose = totalUnits % conversion;
      } else {
        const rawQty = Number(item.quantity || 0);
        const totalUnits = Math.round(rawQty * conversion);
        strips = Math.floor(totalUnits / conversion);
        loose = totalUnits % conversion;
      }
    } else {
      // Unknown or single-unit packaging: omit strip conversion and format purely in loose/base units
      const totalUnits = item.baseQuantity != null
        ? Math.round(Number(item.baseQuantity))
        : Math.round(Number(item.quantity || 0));

      loose = Math.max(0, totalUnits);
      strips = 0;
    }
  }

  const parts = [];
  if (strips > 0) {
    const stripLabel = strips === 1 ? category.packUnitSingular : category.packUnitPlural;
    parts.push(`${strips} ${stripLabel}`);
  }
  if (loose > 0) {
    const looseLabel = loose === 1 ? category.looseUnitSingular : category.looseUnitPlural;
    parts.push(`${loose} ${looseLabel}`);
  }

  if (parts.length === 0) {
    return '0';
  }

  return parts.join(' + ');
}

/**
 * Clean Drug License string to prevent duplicate "DL. No.: 20/DL.No. ..."
 */
function cleanDlString(rawDl, defaultPrefix) {
  if (!rawDl) return '';
  let cleaned = rawDl.trim();
  // Remove duplicate DL, DL., DL.No., DL No, etc. from anywhere near start
  cleaned = cleaned.replace(/^(?:DL\.?\s*(?:No\.?)?[:\s-]*)+/i, '').trim();
  // If already starts with prefix like 20/ or 21/, do not prepend again
  if (defaultPrefix && !cleaned.startsWith(defaultPrefix)) {
    cleaned = `${defaultPrefix}${cleaned}`;
  }
  return cleaned;
}

/**
 * Generate Exact Classic Pharmacy Paper Challan / Bill HTML
 * Matches physical pharmacy print slip:
 * - Header: DL No., Conditional GSTIN, Mobile, Store Name, Address
 * - Meta: Challan / Bill No (Red), Date, Time, Name & Add, Prescribed by Dr.
 * - Table Grid (Strict black borders): S.N. | PRODUCT NAME | PACK | EXP. | BATCH | QTY | MRP | RATE | AMOUNT
 * - Summary: Remark, SUB TOTAL, Discount, Amount in Words, GRAND TOTAL
 * - Legal: English disclaimer & note, Authorised Signatory
 */
export function generateClassicPrintHtml(sale, userStore = null, printMode = 'actual') {
  const store = sale.store || userStore || (typeof localStorage !== 'undefined' ? JSON.parse(localStorage.getItem('pharma_user') || '{}')?.store : {}) || {};
  const customer = sale.customer || {};
  const doctor = sale.doctor || (sale.doctorRel ? `Dr. ${sale.doctorRel.name}` : '') || '';

  const invoiceDate = sale.invoiceDate ? new Date(sale.invoiceDate) : new Date();
  const dateStr = invoiceDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const timeStr = invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });

  // 1. Clean DL Numbers (avoid duplicate DL. No. prefixes)
  const rawDl = store.dlNumber || '20/1495/55/ 2025, 21/1496/55/ 2025';
  const dlLines = rawDl.split(',').map(s => s.trim()).filter(Boolean);
  const dl1 = dlLines[0] ? cleanDlString(dlLines[0], dlLines[0].toLowerCase().startsWith('20') ? '' : '20/') : '20/1495/55/ 2025';
  const dl2 = dlLines[1] ? cleanDlString(dlLines[1], dlLines[1].toLowerCase().startsWith('21') ? '' : '21/') : (dlLines[0] ? '' : '21/1496/55/ 2025');

  // 2. Conditional GSTIN rendering (Strict Rule: Do not print dummy/empty GSTIN)
  const rawGstin = (store.gstin || store.gstNumber || '').trim();
  const isDummyGstin = !rawGstin || ['23AAAAA0000A1Z5', 'N/A', 'NA', 'NONE', 'NULL', '-'].includes(rawGstin.toUpperCase());
  const gstinToPrint = isDummyGstin ? '' : rawGstin;

  const phone = store.phone || '7772093527';
  const storeName = (store.name || 'GURUKRIPA MEDICAL & SURGICAL STORES').trim();
  const storeAddress = (store.address || 'Near Heeraganj Petrol Pump, Behind Shanidev Temple').trim();
  const storeCityState = `${store.city || 'Katni'} (${store.state || 'M.P.'})`;

  // 3. Customer & Doctor from current sale data ONLY
  const rawCustomerName = String(customer.name || sale.customerName || '').trim();
  const rawCustomerCity = String(customer.city || customer.address || sale.customerCity || '').trim();
  let customerDisplay = '-';
  if (rawCustomerName) {
    customerDisplay = rawCustomerCity
      ? `${rawCustomerName.toUpperCase()} (${rawCustomerCity.toUpperCase()})`
      : rawCustomerName.toUpperCase();
  }

  const rawDoctor = String(doctor).trim();
  const doctorDisplay = rawDoctor ? rawDoctor.toUpperCase() : '-';

  const isMrpMode = printMode === 'mrp';
  const items = sale.items || [];

  // Totals calculations based on printMode (Association MRP vs Actual Invoice)
  let subTotal = 0;
  let discount = 0;
  let grandTotal = 0;

  if (isMrpMode) {
    // Recalculation for MRP-only mode: calculate strictly from effective packaging units * MRP
    subTotal = items.reduce((sum, it) => {
      return sum + getItemMrpAmount(it);
    }, 0);
    discount = 0;
    grandTotal = subTotal;
  } else {
    subTotal = Number(sale.subtotal || sale.taxableAmount || sale.totalAmount || 0);
    discount = Number(sale.discountAmount || 0);
    grandTotal = Number(sale.totalAmount || 0);
  }

  const words = numberToWords(Math.round(grandTotal));

  // Ensure at least 5 rows for standard challan paper look
  const rowCount = Math.max(items.length, 5);

  let rowsHtml = '';
  for (let i = 0; i < rowCount; i++) {
    const it = items[i];
    if (it) {
      const expDate = it.batch?.expiryDate ? new Date(it.batch.expiryDate) : null;
      const expStr = expDate ? `${expDate.getMonth() + 1}/${String(expDate.getFullYear()).slice(-2)}` : '-';
      const packStr = getPharmaPack(it);
      const batchNo = it.batch?.batchNumber || '-';
      const mrp = Number(it.batch?.mrp || it.mrp || it.unitPrice || 0);
      const rate = Number(it.unitPrice || it.rate || 0);
      const effectiveQty = getEffectivePackQuantity(it);
      const amount = isMrpMode
        ? getItemMrpAmount(it)
        : Number(it.totalAmount != null ? it.totalAmount : (effectiveQty * rate));

      rowsHtml += `
        <tr>
          <td class="col-sn">${i + 1}.</td>
          <td class="col-product">${(it.product?.name || it.itemName || 'PRODUCT').toUpperCase()}</td>
          <td class="col-pack">${packStr}</td>
          <td class="col-exp">${expStr}</td>
          <td class="col-batch">${batchNo}</td>
          <td class="col-qty">${formatSaleDisplayQuantity(it)}</td>
          <td class="col-mrp">${mrp > 0 ? mrp.toFixed(2) : '-'}</td>
          ${!isMrpMode ? `<td class="col-rate">${rate > 0 ? rate.toFixed(2) : '-'}</td>` : ''}
          <td class="col-amt">${amount.toFixed(2)}</td>
        </tr>
      `;
    } else {
      // Empty filler line to maintain paper height
      rowsHtml += `
        <tr class="empty-row">
          <td class="col-sn">&nbsp;</td>
          <td class="col-product">&nbsp;</td>
          <td class="col-pack">&nbsp;</td>
          <td class="col-exp">&nbsp;</td>
          <td class="col-batch">&nbsp;</td>
          <td class="col-qty">&nbsp;</td>
          <td class="col-mrp">&nbsp;</td>
          ${!isMrpMode ? '<td class="col-rate">&nbsp;</td>' : ''}
          <td class="col-amt">&nbsp;</td>
        </tr>
      `;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bill - ${sale.invoiceNumber || 'Challan'}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #000;
      background: #fff;
      padding: 6px;
      font-size: 11.5px;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .bill-frame {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      border: 1.5px solid #000;
      background: #fff;
    }

    /* Top Header Section */
    .bill-header {
      padding: 8px 14px 4px;
      position: relative;
    }
    .header-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 11px;
      font-weight: 700;
    }
    .dl-block {
      text-align: left;
      line-height: 1.35;
      font-family: "IBM Plex Mono", monospace;
    }
    .contact-block {
      text-align: right;
      line-height: 1.35;
      font-family: "IBM Plex Mono", monospace;
    }
    .store-branding {
      text-align: center;
      margin: 2px 0 6px;
    }
    .store-title {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: "IBM Plex Sans", sans-serif;
    }
    .store-sub {
      font-size: 11.5px;
      font-weight: 600;
      margin-top: 2px;
      color: #111;
    }

    /* Meta Info Block */
    .bill-meta-box {
      border-top: 1.5px solid #000;
      border-bottom: 1.5px solid #000;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .bill-no-tag {
      color: #dc2626;
      font-weight: 900;
      font-size: 12.5px;
      font-family: "IBM Plex Mono", monospace;
    }

    /* Products Grid Table */
    table.products-grid {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    table.products-grid th {
      border-bottom: 1.5px solid #000;
      border-right: 1px solid #000;
      padding: 5px 4px;
      font-weight: 800;
      font-size: 10.5px;
      background: #fbfbfb;
      text-align: center;
    }
    table.products-grid th:last-child {
      border-right: none;
    }
    table.products-grid td {
      border-right: 1px solid #000;
      padding: 4px 6px;
      vertical-align: middle;
    }
    table.products-grid td:last-child {
      border-right: none;
    }

    /* Column Widths & Typography */
    .col-sn { width: 34px; text-align: center; font-family: "IBM Plex Mono", monospace; }
    .col-product { width: ${isMrpMode ? '265px' : '197px'}; text-align: left; font-weight: 700; }
    .col-pack { width: 58px; text-align: center; font-family: "IBM Plex Mono", monospace; }
    .col-exp { width: 55px; text-align: center; font-family: "IBM Plex Mono", monospace; }
    .col-batch { width: 75px; text-align: center; font-family: "IBM Plex Mono", monospace; font-size: 10.5px; }
    .col-qty { width: 75px; text-align: center; font-weight: 700; font-family: "IBM Plex Mono", monospace; font-size: 10px; line-height: 1.2; padding: 2px; }
    .col-mrp { width: 68px; text-align: right; font-family: "IBM Plex Mono", monospace; }
    .col-rate { width: 68px; text-align: right; font-family: "IBM Plex Mono", monospace; }
    .col-amt { width: 85px; text-align: right; font-weight: 700; font-family: "IBM Plex Mono", monospace; }

    /* Spacer rows to push summary to bottom */
    tr.empty-row td {
      height: 24px;
    }

    /* Summary Section */
    .summary-section {
      border-top: 1.5px solid #000;
      padding: 6px 12px;
    }
    .summary-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .remark-box {
      font-size: 11.5px;
      padding-top: 4px;
    }
    .totals-box {
      width: 280px;
      font-size: 12px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-family: "IBM Plex Mono", monospace;
    }
    .totals-divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      font-weight: 900;
      font-size: 13px;
      padding-top: 2px;
      font-family: "IBM Plex Mono", monospace;
    }

    .words-row {
      margin-top: 8px;
      font-size: 11.5px;
    }
    .words-val {
      font-weight: 600;
    }

    /* Footer Legal Notes */
    .legal-footer {
      border-top: 1.5px solid #000;
      padding: 8px 12px;
      font-size: 9.5px;
      line-height: 1.35;
    }
    .legal-sign-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 16px;
    }
    .signatory-box {
      text-align: right;
      font-size: 11.5px;
      font-weight: 800;
    }
    .signatory-sub {
      font-size: 10px;
      font-weight: normal;
      margin-top: 2px;
    }

    @media print {
      body {
        padding: 0;
      }
      .bill-frame {
        border: 1.5px solid #000;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="bill-frame">
    <!-- Header -->
    <div class="bill-header">
      <div class="header-top-row">
        <div class="dl-block">
          <div>DL. No.: ${dl1}</div>
          ${dl2 ? `<div>DL. No.: ${dl2}</div>` : ''}
        </div>
        <div class="contact-block">
          <div>Mob: ${phone}</div>
          ${gstinToPrint ? `<div>GSTIN: ${gstinToPrint}</div>` : ''}
        </div>
      </div>

      <div class="store-branding">
        <div class="store-title">${storeName}</div>
        <div class="store-sub">${storeAddress}, ${storeCityState}</div>
      </div>
    </div>

    <!-- Meta Info Box -->
    <div class="bill-meta-box">
      <div class="meta-row">
        <div>
          <span>Challan / Bill No. : </span>
          <span class="bill-no-tag">${sale.invoiceNumber || '-'}</span>
        </div>
        <div>
          <span>Date : </span>
          <b style="font-family: 'IBM Plex Mono', monospace;">${dateStr}</b>
          <span style="margin-left: 20px;">Time: </span>
          <b style="font-family: 'IBM Plex Mono', monospace;">${timeStr}</b>
        </div>
      </div>
      <div class="meta-row">
        <div>
          <span>Name & Add : </span>
          <b>${customerDisplay}</b>
        </div>
        <div>
          <span>Prescribed by Dr. : </span>
          <b>${doctorDisplay}</b>
        </div>
      </div>
    </div>

    <!-- Products Grid Table -->
    <table class="products-grid">
      <thead>
        <tr>
          <th class="col-sn">S.N.</th>
          <th class="col-product">PRODUCT NAME</th>
          <th class="col-pack">PACK</th>
          <th class="col-exp">EXP.</th>
          <th class="col-batch">BATCH</th>
          <th class="col-qty">QTY</th>
          <th class="col-mrp">MRP</th>
          ${!isMrpMode ? '<th class="col-rate">RATE</th>' : ''}
          <th class="col-amt">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Summary Section -->
    <div class="summary-section">
      <div class="summary-flex">
        <div class="remark-box">
          <div>Remark: <b>${sale.notes || '-'}</b></div>
          <div class="words-row">
            <div><b>Amount in Words:</b></div>
            <div class="words-val">${words}</div>
          </div>
        </div>

        <div class="totals-box">
          <div class="totals-row">
            <span>SUB TOTAL :</span>
            <b>${subTotal.toFixed(2)}</b>
          </div>
          ${!isMrpMode ? `
          <div class="totals-row">
            <span>Discount :</span>
            <span>${discount.toFixed(2)}</span>
          </div>` : ''}
          <div class="totals-divider"></div>
          <div class="grand-total-row">
            <span>GRAND TOTAL :</span>
            <span>₹ ${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Legal Footer -->
    <div class="legal-footer">
      <div>Subject to Adjustment of price difference if any due to applicable from Atonement as per Drug Control Orders 1970.</div>
      <div style="font-weight: 600; margin-top: 3px;">Note: Consult doctor before consuming medicines. E. & O.E.</div>

      <div class="legal-sign-row">
        <div></div>
        <div class="signatory-box">
          <div>For ${storeName}</div>
          <div class="signatory-sub">Authorised Signatory</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
}
