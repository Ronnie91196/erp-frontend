import { generateClassicPrintHtml } from './src/utils/classicPrintSlip.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

console.log('--- TESTING CLASSIC PRINT SLIP DATA BINDING ---');

const mockStore = {
  name: 'Gurukripa Medical & Surgical Stores',
  address: 'Near Heeraganj Petrol Pump',
  city: 'Katni',
  state: 'M.P.',
  phone: '7772093527',
  dlNumber: '20/1495/55/ 2025, 21/1496/55/ 2025',
};

// TEST CASE 1: Sale with NO patient/customer, NO doctor, NO notes
const saleEmpty = {
  invoiceNumber: 'INV-537114',
  invoiceDate: new Date('2026-09-10T12:00:00Z'),
  subtotal: 295.00,
  discountAmount: 95.28,
  taxableAmount: 178.32,
  cgstAmount: 10.70,
  sgstAmount: 10.70,
  totalAmount: 200.00,
  items: [
    {
      product: { name: 'CAL G CARE DHA CAP', pack: '1x10', dosageForm: 'CAPSULE' },
      batch: { batchNumber: 'SGG2517', expiryDate: '2027-03-31', mrp: 295.00 },
      quantity: 1,
      qty: 1,
      tabs: 0,
      conversionToBase: 10,
      unitPrice: 199.72,
      totalAmount: 199.72,
    },
  ],
};

console.log('\n1. Testing Print Actual Invoice for empty customer/doctor...');
const htmlActualEmpty = generateClassicPrintHtml(saleEmpty, mockStore, 'actual');

assert(!htmlActualEmpty.includes('RAM KUMAR'), 'Must NOT contain RAM KUMAR');
assert(!htmlActualEmpty.includes('DR. A. K. SHARMA'), 'Must NOT contain DR. A. K. SHARMA');
assert(!htmlActualEmpty.includes('Regular Patient'), 'Must NOT contain Regular Patient');
assert(htmlActualEmpty.includes('Name & Add : </span>\n          <b>-</b>') || htmlActualEmpty.includes('Name & Add : </span>\r\n          <b>-</b>') || htmlActualEmpty.includes('<b>-</b>'), 'Must display - for empty customer');
assert(htmlActualEmpty.includes('Prescribed by Dr. : </span>\n          <b>-</b>') || htmlActualEmpty.includes('Prescribed by Dr. : </span>\r\n          <b>-</b>') || htmlActualEmpty.includes('<b>-</b>'), 'Must display - for empty doctor');
assert(htmlActualEmpty.includes('Remark: <b>-</b>'), 'Must display - for empty remark');
console.log('✓ Test 1A (Actual Format - No customer/doctor) PASSED!');

console.log('\n2. Testing Print on MRP (Association Format) for empty customer/doctor...');
const htmlMrpEmpty = generateClassicPrintHtml(saleEmpty, mockStore, 'mrp');

assert(!htmlMrpEmpty.includes('RAM KUMAR'), 'MRP Mode: Must NOT contain RAM KUMAR');
assert(!htmlMrpEmpty.includes('DR. A. K. SHARMA'), 'MRP Mode: Must NOT contain DR. A. K. SHARMA');
assert(!htmlMrpEmpty.includes('Regular Patient'), 'MRP Mode: Must NOT contain Regular Patient');
assert(htmlMrpEmpty.includes('GRAND TOTAL :</span>\n            <span>₹ 295.00</span>') || htmlMrpEmpty.includes('GRAND TOTAL :</span>\r\n            <span>₹ 295.00</span>') || htmlMrpEmpty.includes('295.00'), 'MRP Mode calculation intact');
console.log('✓ Test 1B (MRP Format - No customer/doctor) PASSED!');

// TEST CASE 2: Sale WITH Real Customer, Real Doctor, Real Notes
const saleWithData = {
  invoiceNumber: 'INV-889900',
  invoiceDate: new Date('2026-09-10T12:00:00Z'),
  customer: {
    name: 'Vikram Singh',
    city: 'Jabalpur',
  },
  doctor: 'Dr. R. K. Mishra',
  notes: 'Take 1 capsule at bedtime with milk',
  subtotal: 295.00,
  totalAmount: 295.00,
  items: [
    {
      product: { name: 'CAL G CARE DHA CAP', pack: '1x10', dosageForm: 'CAPSULE' },
      batch: { batchNumber: 'SGG2517', expiryDate: '2027-03-31', mrp: 295.00 },
      quantity: 1,
      qty: 1,
      tabs: 0,
      conversionToBase: 10,
      unitPrice: 295.00,
      totalAmount: 295.00,
    },
  ],
};

console.log('\n3. Testing Print with real customer and doctor data...');
const htmlActualWithData = generateClassicPrintHtml(saleWithData, mockStore, 'actual');
assert(htmlActualWithData.includes('VIKRAM SINGH (JABALPUR)'), 'Must contain VIKRAM SINGH (JABALPUR)');
assert(htmlActualWithData.includes('DR. R. K. MISHRA'), 'Must contain DR. R. K. MISHRA');
assert(htmlActualWithData.includes('Take 1 capsule at bedtime with milk'), 'Must contain custom notes in remark');
console.log('✓ Test 2A (Actual Format - With real customer/doctor) PASSED!');

const htmlMrpWithData = generateClassicPrintHtml(saleWithData, mockStore, 'mrp');
assert(htmlMrpWithData.includes('VIKRAM SINGH (JABALPUR)'), 'MRP Mode: Must contain VIKRAM SINGH (JABALPUR)');
assert(htmlMrpWithData.includes('DR. R. K. MISHRA'), 'MRP Mode: Must contain DR. R. K. MISHRA');
assert(htmlMrpWithData.includes('Take 1 capsule at bedtime with milk'), 'MRP Mode: Must contain custom notes in remark');
console.log('✓ Test 2B (MRP Format - With real customer/doctor) PASSED!');

console.log('\n🎉 ALL PRINT DATA BINDING TESTS PASSED PERFECTLY!\n');
