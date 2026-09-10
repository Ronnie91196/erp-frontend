import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw, Save,
  User, ChevronLeft, Upload, Plus, Printer
} from 'lucide-react';
import api, { unwrap, apiError } from '../../lib/api';
import { generateClassicPrintHtml, getPharmaPack, getProductDosageCategory } from '../../utils/classicPrintSlip';
import PrintFormatModal from '../../components/PrintFormatModal';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

const isTabletOrCapsule = (row) => Boolean(getProductDosageCategory(row));

export function calculateMedicineFinishDate(cartItem, frequencyStr, saleDate = new Date()) {
  if (!cartItem) return { reminderDate: '', daysOfSupply: 1 };

  try {
    const qty = Math.max(1, Number(cartItem.qty || cartItem.quantity || 1));
    const packStr = String(cartItem.pack || cartItem.product?.pack || cartItem.packaging?.name || '').toUpperCase();
    const prodName = String(cartItem.itemName || cartItem.name || cartItem.product?.name || '').toUpperCase();
    const form = String(cartItem.dosageForm || cartItem.product?.dosageForm || '').toUpperCase();

    // Safely extract units
    let unitsPerPack = Number(cartItem.conversionToBase) || 10;
    let totalDosesAvailable = unitsPerPack * qty;

    const stripMatch = packStr.match(/(?:1X)?(\d+)/i) || prodName.match(/(?:1X)?(\d+)\s*(?:TAB|CAP)/i);
    const mlMatch = packStr.match(/(\d+)\s*ML/i) || prodName.match(/(\d+)\s*ML/i);
    const gmMatch = packStr.match(/(\d+)\s*GM/i) || prodName.match(/(\d+)\s*GM/i);

    let isLiquid = form.includes('SYRUP') || form.includes('SUSP') || form.includes('DROP') || prodName.includes('SYRUP');

    if (isLiquid && mlMatch) {
      unitsPerPack = Number(mlMatch[1]);
      totalDosesAvailable = Math.max(1, Math.floor((unitsPerPack * qty) / 5)); // 5ml avg dose
    } else if (gmMatch) {
      unitsPerPack = Number(gmMatch[1]);
      totalDosesAvailable = qty * 14; // 1 ointment tube ~ 14 applications
    } else if (stripMatch) {
      unitsPerPack = Number(stripMatch[1]);
      totalDosesAvailable = unitsPerPack * qty;
    } else if (cartItem.unitsPerPack) {
      totalDosesAvailable = Number(cartItem.unitsPerPack) * qty;
    } else if (cartItem.conversionToBase) {
      totalDosesAvailable = Number(cartItem.conversionToBase) * qty;
    }

    // Safely parse frequency (Default 2 for BD)
    let dailyDoses = 2;
    const fUpper = String(frequencyStr || '').toUpperCase();
    if (fUpper.includes('1') || fUpper.includes('OD') || fUpper.includes('ONCE')) dailyDoses = 1;
    else if (fUpper.includes('2') || fUpper.includes('BD') || fUpper.includes('TWICE')) dailyDoses = 2;
    else if (fUpper.includes('3') || fUpper.includes('TDS') || fUpper.includes('THRICE')) dailyDoses = 3;
    else if (fUpper.includes('4') || fUpper.includes('QID')) dailyDoses = 4;

    // Calculate days and handle zero division
    const daysOfSupply = Math.max(1, Math.floor(totalDosesAvailable / (dailyDoses || 1)));

    // Set target date (runs out ON this day)
    const target = new Date(saleDate);
    target.setDate(target.getDate() + Math.max(0, daysOfSupply - 1));

    return {
      reminderDate: target.toISOString().split('T')[0], // YYYY-MM-DD
      daysOfSupply
    };
  } catch (error) {
    console.error("Reminder Calc Error:", error);
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 3);
    return { reminderDate: fallback.toISOString().split('T')[0], daysOfSupply: 3 };
  }
}

function createEmptyRow(id = Date.now()) {
  return {
    id,
    productId: '',
    batchId: '',
    packagingId: '',
    type: 'Rx',
    itemName: '',
    dosageForm: '',
    pack: '',
    batch: '',
    expiry: '',
    qty: '',
    tabs: '',
    mrp: '',
    disc: '',
    total: 0,
    gstPercent: 12,
    conversionToBase: 10,
    stock: 0,
  };
}

function recalcRow(row) {
  const packQty = Math.max(0, Number(row.qty || 0));
  const looseQty = Math.max(0, Number(row.tabs || 0));
  const conversion = Math.max(1, Number(row.conversionToBase || 1));
  const unitMrp = Number(row.mrp || 0);

  const grossAmount = (packQty * unitMrp) + (looseQty * (unitMrp / conversion));
  const discPercent = Math.max(0, Math.min(100, Number(row.disc || 0)));
  const discAmount = grossAmount * (discPercent / 100);
  const total = grossAmount - discAmount;

  return {
    ...row,
    total,
  };
}

export default function AddSalePos() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const queryParams = new URLSearchParams(location.search);
  const draftIdFromQuery = queryParams.get('draftId') || queryParams.get('draft');
  const editIdFromQuery = queryParams.get('edit');

  // Header state matching clean new sale requirements
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentStatus, setPaymentStatus] = useState('Paid'); // Paid, Unpaid, Partial
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // Cash, UPI, Card
  const [paidAmount, setPaidAmount] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '' });

  // Ayushman Bharat Scheme Billing State
  const [isAyushman, setIsAyushman] = useState(false);
  const [ayushmanCardNo, setAyushmanCardNo] = useState('');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [claimStatus, setClaimStatus] = useState('PENDING');

  // Medication & Patient Reminder State (for saved customer)
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [selectedReminderDrugId, setSelectedReminderDrugId] = useState('');
  const [reminderDrugName, setReminderDrugName] = useState('');
  const [reminderDate, setReminderDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [reminderFrequency, setReminderFrequency] = useState('2 Times a Day (BD)');
  const [reminderMealTiming, setReminderMealTiming] = useState('AFTER_MEAL');
  const [reminderDosageNotes, setReminderDosageNotes] = useState('1 dose with water');

  // Right card fields & Doctor selection
  const [doctor, setDoctor] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorLicense, setDoctorLicense] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [newDoctorData, setNewDoctorData] = useState({ name: '', phone: '', specialization: '', registrationNo: '' });

  // Table rows & fast entry
  const [rows, setRows] = useState([]);
  const [entryRow, setEntryRow] = useState(createEmptyRow());
  const [drugSearch, setDrugSearch] = useState('');
  const [showDrugDropdown, setShowDrugDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const [highlightedBatchIndex, setHighlightedBatchIndex] = useState(-1);

  // Notes & Documents
  const [notes, setNotes] = useState('');
  const [prescriptionImages, setPrescriptionImages] = useState([]);

  // Field refs
  const entryRefs = useRef({});
  const hasHydratedDraftRef = useRef(null);
  const isSavingRef = useRef(false);

  // Queries
  const productsQuery = useQuery({
    queryKey: ['sale-products'],
    queryFn: async () => unwrap(await api.get('/products')),
  });

  const customersQuery = useQuery({
    queryKey: ['sale-customers'],
    queryFn: async () => unwrap(await api.get('/customers')),
  });

  const doctorsQuery = useQuery({
    queryKey: ['sale-doctors'],
    queryFn: async () => {
      const res = unwrap(await api.get('/doctors'));
      return Array.isArray(res) ? res : [];
    },
  });

  const doctorsList = doctorsQuery.data || [];

  const draftsQuery = useQuery({
    queryKey: ['sale-drafts'],
    queryFn: async () => {
      const allSales = unwrap(await api.get('/sales?status=DRAFT'));
      return Array.isArray(allSales) ? allSales : [];
    },
    refetchOnWindowFocus: false, // Stop refetching on window switch
    staleTime: 1000 * 60 * 5,
  });

  const saleDrafts = draftsQuery.data || [];

  const loadDraftIntoPos = (draft) => {
    if (!draft || !draft.id) return;

    // Check hydration guard ref to prevent duplicate execution
    if (hasHydratedDraftRef.current === String(draft.id)) return;
    hasHydratedDraftRef.current = String(draft.id);

    setActiveDraftId(draft.id);
    setBillDate(draft.invoiceDate ? new Date(draft.invoiceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    setCustomerName(draft.customer?.name || draft.customerName || '');
    setSelectedCustomerId(draft.customerId || '');
    setCustomerPhone(draft.customer?.phone || draft.customerPhone || '');
    setCustomerSearch(draft.customer?.name || draft.customerName || '');
    let rawDoc = draft.doctor || draft.doctorRel?.name || draft.doctorName || '';
    let parsedLic = draft.doctorRel?.registrationNo || '';
    let parsedCase = '';

    if (rawDoc.includes(' - OPD: ')) {
      const [left, opd] = rawDoc.split(' - OPD: ');
      parsedCase = opd || '';
      rawDoc = left || '';
    }
    if (rawDoc.includes(' (') && rawDoc.endsWith(')')) {
      const match = rawDoc.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        rawDoc = match[1];
        if (!parsedLic) parsedLic = match[2];
      }
    }

    setDoctor(rawDoc);
    setSelectedDoctorId(draft.doctorId || '');
    setDoctorSearch(rawDoc);
    setDoctorLicense(parsedLic);
    setCaseNumber(parsedCase);
    setDiscountPercent(draft.discountPercent != null && draft.discountPercent !== '' ? String(draft.discountPercent) : '');
    setPaymentStatus(draft.paymentStatus === 'PAID' ? 'Paid' : draft.paymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid');
    setPaymentMethod(draft.paymentMethod === 'UPI' ? 'UPI' : draft.paymentMethod === 'CARD' ? 'Card' : 'Cash');
    setPaidAmount(draft.paymentStatus === 'PARTIAL' && draft.paidAmount != null ? String(draft.paidAmount) : '');
    setNotes(draft.notes || '');
    setPrescriptionImages(Array.isArray(draft.prescriptions) ? draft.prescriptions : []);
    setIsAyushman(Boolean(draft.isAyushman));
    setAyushmanCardNo(draft.ayushmanCardNo || '');
    setBeneficiaryId(draft.beneficiaryId || '');
    setClaimStatus(draft.claimStatus || 'PENDING');

    // 1. Overwrite cart directly with draft items (DO NOT append to existing cart)
    const itemsToLoad = draft.items || draft.SaleItems || [];
    const loadedRows = itemsToLoad.map((item, idx) => {
      const conversion = Number(item.packaging?.conversionToBase || 10);
      const totalUnits = Number(item.baseQuantity || item.quantity || 0);
      const packQty = Math.floor(totalUnits / conversion);
      const tabs = totalUnits % conversion;
      const packName = item.packaging?.name || item.pack || getPharmaPack(item);

      return recalcRow({
        id: item.id || Date.now() + idx,
        productId: item.productId || item.product?.id,
        batchId: item.batchId || item.batch?.id,
        packagingId: item.packagingId || '',
        type: 'Rx',
        itemName: item.product?.name || item.itemName || 'Medicine',
        pack: packName,
        batch: item.batch?.batchNumber || item.batchNumber || item.batch || 'DEFAULT',
        expiry: item.batch?.expiryDate ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : (item.expiry || '-'),
        qty: packQty,
        tabs,
        mrp: Number(item.unitPrice || item.mrp || 0),
        disc: Number(item.discountPercent || item.disc || 0),
        total: Number(item.totalAmount || item.total || 0),
        gstPercent: Number(item.cgstPercent || 0) + Number(item.sgstPercent || 0) || 12,
        conversionToBase: conversion,
        stock: 999,
      });
    });

    setRows(loadedRows);

    // 2. Clear current buffer quick-add entry row so it doesn't duplicate into cart
    setEntryRow(createEmptyRow());
    setDrugSearch('');

    setShowDraftsModal(false);
  };

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/sales/${id}`)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    },
    onError: (err) => {
      window.alert(err?.message || 'Failed to delete draft');
    }
  });

  // Auto load draft from query param (from cache or direct API fetch) with strict single-run guard
  useEffect(() => {
    const targetId = draftIdFromQuery || editIdFromQuery;
    if (!targetId) return;

    // Prevent re-hydrating the same draft repeatedly
    if (hasHydratedDraftRef.current === String(targetId)) return;

    if (saleDrafts.length > 0) {
      const found = saleDrafts.find((d) => String(d.id) === String(targetId));
      if (found) {
        loadDraftIntoPos(found);
        return;
      }
    }

    // Direct fetch fallback if draft is not yet in cache
    let isCancelled = false;
    api.get(`/sales/${targetId}`)
      .then((res) => {
        if (!isCancelled && res.data?.data) {
          loadDraftIntoPos(res.data.data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch draft bill directly:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [draftIdFromQuery, editIdFromQuery, saleDrafts]);

  // Automated Reminder Date Calculation based on Cart, Pack Size, and Frequency
  useEffect(() => {
    if (!isReminderEnabled || rows.length === 0) return;

    // Find the cart item for the reminder (by selected id, matching drug name, or fallback to first row)
    const cartItem =
      rows.find((r) => String(r.id) === String(selectedReminderDrugId)) ||
      rows.find((r) => reminderDrugName && String(r.itemName || '').toLowerCase() === String(reminderDrugName).toLowerCase()) ||
      rows[0];

    if (cartItem) {
      // Auto sync drug name if not manually specified
      if (!reminderDrugName || !rows.some((r) => String(r.itemName || '').toLowerCase() === String(reminderDrugName).toLowerCase())) {
        setReminderDrugName(cartItem.itemName || 'Prescribed Medicine');
      }
      if (!selectedReminderDrugId || !rows.some((r) => String(r.id) === String(selectedReminderDrugId))) {
        setSelectedReminderDrugId(String(cartItem.id));
      }

      const { reminderDate: calculatedDate } = calculateMedicineFinishDate(cartItem, reminderFrequency, new Date(billDate || Date.now()));
      if (calculatedDate && reminderDate !== calculatedDate) {
        setReminderDate(calculatedDate);
      }
    }
  }, [isReminderEnabled, selectedReminderDrugId, rows, reminderFrequency, billDate]);

  // Quick Customer Creation Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/customers', payload)),
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: ['sale-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomerId(newCust.id);
      setCustomerName(newCust.name);
      setCustomerPhone(newCust.phone || '');
      setCustomerSearch(newCust.name);
      setShowCustomerModal(false);
      setNewCustomerData({ name: '', phone: '' });
    },
    onError: (err) => {
      window.alert(apiError(err) || 'Failed to create customer');
    }
  });

  const handleQuickCreateCustomer = (e) => {
    e.preventDefault();
    if (!newCustomerData.name.trim()) {
      window.alert('Please enter a customer name');
      return;
    }
    createCustomerMutation.mutate({
      name: newCustomerData.name.trim(),
      phone: newCustomerData.phone.trim() || undefined,
    });
  };

  // Quick Doctor Creation Mutation
  const createDoctorMutation = useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/doctors', payload)),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['sale-doctors'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-list'] });
      setSelectedDoctorId(newDoc.id);
      setDoctor(newDoc.name);
      setDoctorSearch(newDoc.name);
      setDoctorLicense(newDoc.registrationNo || '');
      setShowDoctorModal(false);
      setNewDoctorData({ name: '', phone: '', specialization: '', registrationNo: '' });
    },
    onError: (err) => {
      window.alert(apiError(err) || 'Failed to create doctor');
    },
  });

  const handleQuickCreateDoctor = (e) => {
    e.preventDefault();
    if (!newDoctorData.name.trim()) {
      window.alert('Please enter doctor name');
      return;
    }
    createDoctorMutation.mutate({
      name: newDoctorData.name.trim(),
      phone: newDoctorData.phone.trim() || undefined,
      specialization: newDoctorData.specialization.trim() || undefined,
      registrationNo: newDoctorData.registrationNo.trim() || undefined,
    });
  };

  const products = Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const customers = Array.isArray(customersQuery.data) ? customersQuery.data : [];

  // Grouped products and their batches sorted by FEFO (First Expiry, First Out)
  const productBatchesMap = useMemo(() => {
    const map = new Map();

    products.forEach((product) => {
      const safeBatches = Array.isArray(product.batches) ? product.batches : [];
      const primaryPkg = product.packaging?.[0] || null;
      const conversionToBase = primaryPkg ? Math.max(1, Number(primaryPkg.conversionToBase || 10)) : 10;
      const primaryPack = primaryPkg?.name || getPharmaPack(product);

      let batchList = safeBatches.map((batch) => {
        const stockQty = (batch.stocks || []).reduce((sum, s) => sum + Number(s.quantity || 0), 0);
        return {
          productId: product.id,
          productName: product.name,
          pack: primaryPack,
          batchId: batch.id,
          batchNumber: batch.batchNumber || 'DEFAULT',
          expiryDate: batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : '-',
          rawExpiry: batch.expiryDate ? new Date(batch.expiryDate) : null,
          mrp: Number(batch.sellingPrice || batch.mrp || product.mrp || 0),
          stock: stockQty,
          dosageForm: product.dosageForm || '',
          packagingId: primaryPkg?.id || null,
          conversionToBase,
          gstPercent: Number(product.gstPercent || 12),
        };
      });

      // Sort batches: closest expiry with available stock first (FEFO principle)
      batchList.sort((a, b) => {
        // Priority 1: positive stock batches first
        if (a.stock > 0 && b.stock <= 0) return -1;
        if (a.stock <= 0 && b.stock > 0) return 1;

        // Priority 2: unexpired batches with closest expiry date
        if (a.rawExpiry && b.rawExpiry) {
          return a.rawExpiry.getTime() - b.rawExpiry.getTime();
        }
        if (a.rawExpiry && !b.rawExpiry) return -1;
        if (!a.rawExpiry && b.rawExpiry) return 1;
        return 0;
      });

      if (batchList.length === 0) {
        batchList.push({
          productId: product.id,
          productName: product.name,
          pack: primaryPack,
          batchId: product.id,
          batchNumber: 'STANDARD',
          expiryDate: '-',
          rawExpiry: null,
          mrp: Number(product.mrp || 0),
          stock: 999,
          dosageForm: product.dosageForm || '',
          packagingId: primaryPkg?.id || null,
          conversionToBase,
          gstPercent: Number(product.gstPercent || 12),
        });
      }

      map.set(product.id, {
        productId: product.id,
        productName: product.name,
        pack: primaryPack,
        dosageForm: product.dosageForm || '',
        batches: batchList,
        totalStock: batchList.reduce((sum, b) => sum + Number(b.stock || 0), 0),
      });
    });
    return map;
  }, [products]);

  // Drug search suggestions showing batch count badge (+1, +2 etc.)
  const filteredDrugSuggestions = useMemo(() => {
    const term = drugSearch.trim().toLowerCase();
    if (!term) return [];
    const allGroups = Array.from(productBatchesMap.values());
    return allGroups
      .filter((g) => g.productName.toLowerCase().includes(term) || g.batches.some((b) => b.batchNumber.toLowerCase().includes(term)))
      .slice(0, 10);
  }, [productBatchesMap, drugSearch]);

  const [showBatchDropdown, setShowBatchDropdown] = useState(false);

  const focusEntry = (field) => {
    const el = entryRefs.current[field];
    if (el) {
      el.focus();
      el.select?.();
    }
  };

  const applySelectedBatch = (batch) => {
    setEntryRow(recalcRow({
      ...entryRow,
      productId: batch.productId,
      batchId: batch.batchId,
      packagingId: batch.packagingId,
      itemName: batch.productName,
      dosageForm: batch.dosageForm || '',
      pack: batch.pack || '',
      batch: batch.batchNumber,
      expiry: batch.expiryDate,
      conversionToBase: batch.conversionToBase,
      mrp: batch.mrp,
      stock: batch.stock,
      gstPercent: batch.gstPercent,
      qty: 1,
      tabs: '',
      disc: 0,
    }));
    setDrugSearch(batch.productName);
    setShowDrugDropdown(false);
    setShowBatchDropdown(false);
    setHighlightedIndex(-1);
    setHighlightedBatchIndex(-1);
    setTimeout(() => focusEntry('qty'), 20);
  };

  const submitEntryRow = () => {
    if (!entryRow.productId || !entryRow.batchId) {
      window.alert('Please select a medicine batch from the dropdown');
      return;
    }

    const totalUnits = (Number(entryRow.qty || 0) * Number(entryRow.conversionToBase || 1)) + Number(entryRow.tabs || 0);
    if (totalUnits <= 0) {
      window.alert('Quantity must be greater than 0');
      return;
    }

    if (totalUnits > entryRow.stock) {
      window.alert(`Insufficient stock! Available: ${entryRow.stock} units, requested: ${totalUnits}`);
      return;
    }

    setRows((prev) => {
      const existingIndex = prev.findIndex(
        (r) => r.productId === entryRow.productId && r.batchId === entryRow.batchId
      );

      if (existingIndex > -1) {
        // Merge quantities with existing row
        return prev.map((r, idx) => {
          if (idx !== existingIndex) return r;
          const mergedQty = Number(r.qty || 0) + Number(entryRow.qty || 0);
          const mergedTabs = Number(r.tabs || 0) + Number(entryRow.tabs || 0);
          return recalcRow({
            ...r,
            qty: mergedQty,
            tabs: mergedTabs,
            disc: Number(entryRow.disc || r.disc || 0),
          });
        });
      }

      // Add as new row
      return [...prev, recalcRow({ ...entryRow, id: Date.now() })];
    });
    setEntryRow(createEmptyRow());
    setDrugSearch('');
    setShowDrugDropdown(false);
    setHighlightedIndex(-1);
    setTimeout(() => focusEntry('search'), 20);
  };

  const [activeBatchRowId, setActiveBatchRowId] = useState(null);

  const switchExistingRowBatch = (rowId, batch) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated = {
          ...row,
          batchId: batch.batchId,
          pack: batch.pack || row.pack || '',
          batch: batch.batchNumber,
          expiry: batch.expiryDate,
          mrp: batch.mrp,
          stock: batch.stock,
          conversionToBase: batch.conversionToBase,
        };
        return recalcRow(updated);
      })
    );
    setActiveBatchRowId(null);
  };

  const updateExistingRow = (id, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        return recalcRow(updated);
      })
    );
  };

  const handleEntryKeyDown = (event, field) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const hasTabs = Number(entryRow.conversionToBase || 1) > 1 && isTabletOrCapsule(entryRow);
      if (field === 'qty') {
        if (hasTabs) {
          focusEntry('tabs');
        } else {
          focusEntry('disc');
        }
      } else if (field === 'tabs') {
        focusEntry('disc');
      } else if (field === 'disc') {
        submitEntryRow();
      }
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      if (!showDrugDropdown && filteredDrugSuggestions.length > 0) {
        setShowDrugDropdown(true);
      }
      if (filteredDrugSuggestions.length > 0) {
        event.preventDefault();
        setHighlightedIndex((curr) => (curr + 1) % filteredDrugSuggestions.length);
      }
    } else if (event.key === 'ArrowUp') {
      if (filteredDrugSuggestions.length > 0) {
        event.preventDefault();
        setHighlightedIndex((curr) => (curr - 1 + filteredDrugSuggestions.length) % filteredDrugSuggestions.length);
      }
    } else if (event.key === 'Enter') {
      if (showDrugDropdown && filteredDrugSuggestions.length > 0) {
        event.preventDefault();
        const targetGroup = highlightedIndex >= 0 && filteredDrugSuggestions[highlightedIndex]
          ? filteredDrugSuggestions[highlightedIndex]
          : filteredDrugSuggestions[0];

        if (targetGroup && targetGroup.batches && targetGroup.batches.length > 0) {
          applySelectedBatch(targetGroup.batches[0]);
        }
      }
    } else if (event.key === 'Escape') {
      setShowDrugDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  // Calculations for bottom formula bar: Sub Total (MRP) - Disc = Net Bill (with inclusive GST breakdown)
  const calculations = useMemo(() => {
    const allRows = [...rows];
    if (entryRow.productId && entryRow.batchId && (Number(entryRow.qty || 0) > 0 || Number(entryRow.tabs || 0) > 0)) {
      allRows.push(recalcRow(entryRow));
    }

    const subTotal = allRows.reduce((sum, r) => {
      const packQty = Math.max(0, Number(r.qty || 0));
      const looseQty = Math.max(0, Number(r.tabs || 0));
      const conversion = Math.max(1, Number(r.conversionToBase || 1));
      const unitMrp = Number(r.mrp || 0);
      return sum + (packQty * unitMrp) + (looseQty * (unitMrp / conversion));
    }, 0);

    const itemDiscountAmount = allRows.reduce((sum, r) => {
      const packQty = Math.max(0, Number(r.qty || 0));
      const looseQty = Math.max(0, Number(r.tabs || 0));
      const conversion = Math.max(1, Number(r.conversionToBase || 1));
      const unitMrp = Number(r.mrp || 0);
      const gross = (packQty * unitMrp) + (looseQty * (unitMrp / conversion));
      const d = Math.max(0, Math.min(100, Number(r.disc || 0)));
      return sum + (gross * (d / 100));
    }, 0);

    // Also account for overall discount % if set
    const overallDiscPercent = Math.max(0, Math.min(100, Number(discountPercent || 0)));
    const overallDiscAmount = (subTotal - itemDiscountAmount) * (overallDiscPercent / 100);
    const totalDiscount = itemDiscountAmount + overallDiscAmount;

    const netPayableBeforeRound = Math.max(0, subTotal - totalDiscount);
    const grandTotal = Math.round(netPayableBeforeRound);

    // Inclusive GST extraction per row
    let totalTaxable = 0;
    let totalTax = 0;
    allRows.forEach((r) => {
      const packQty = Math.max(0, Number(r.qty || 0));
      const looseQty = Math.max(0, Number(r.tabs || 0));
      const conversion = Math.max(1, Number(r.conversionToBase || 1));
      const unitMrp = Number(r.mrp || 0);
      const lineGross = (packQty * unitMrp) + (looseQty * (unitMrp / conversion));
      const d = Math.max(0, Math.min(100, Number(r.disc || 0)));
      const lineNet = (lineGross - (lineGross * (d / 100))) * (1 - (overallDiscPercent / 100));
      const gstRate = Number(r.gstPercent || 12);
      const gstFactor = 1 + (gstRate / 100);
      const lineTaxable = gstFactor > 0 ? (lineNet / gstFactor) : lineNet;
      const lineTax = lineNet - lineTaxable;
      totalTaxable += lineTaxable;
      totalTax += lineTax;
    });

    return {
      subTotal: Number(subTotal.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      taxable: Number(totalTaxable.toFixed(2)),
      tax: Number(totalTax.toFixed(2)),
      grandTotal,
    };
  }, [rows, entryRow, discountPercent]);

  // Save Sale Mutation
  const saveSaleMutation = useMutation({
    mutationFn: async (vars = {}) => {
      const { isDraft = false, sendReminder = false, shouldPrint = false } = vars;
      const activeRows = [...rows];
      if (entryRow.productId && entryRow.batchId && (Number(entryRow.qty || 0) > 0 || Number(entryRow.tabs || 0) > 0)) {
        activeRows.push(recalcRow(entryRow));
      }

      if (!isDraft && !activeRows.length) {
        throw new Error('Please add at least one medicine to complete the sale');
      }

      const isUnpaid = paymentStatus === 'Unpaid';
      const isPartial = paymentStatus === 'Partial';
      const resolvedPaid = isUnpaid
        ? 0
        : isPartial
          ? Math.max(0, Math.min(calculations.grandTotal, Number(paidAmount || 0)))
          : calculations.grandTotal;

      // Pre-Submit safe doses injection based on reminderFrequency
      let safeDoses = [];
      let timesCount = 2;
      if (isReminderEnabled) {
        const fUpper = String(reminderFrequency || '').toUpperCase();
        if (fUpper.includes('1') || fUpper.includes('OD') || fUpper.includes('ONCE')) {
          safeDoses = ['08:00 AM'];
          timesCount = 1;
        } else if (fUpper.includes('3') || fUpper.includes('TDS') || fUpper.includes('THRICE')) {
          safeDoses = ['08:00 AM', '02:00 PM', '08:00 PM'];
          timesCount = 3;
        } else if (fUpper.includes('4') || fUpper.includes('QID')) {
          safeDoses = ['08:00 AM', '12:00 PM', '04:00 PM', '08:00 PM'];
          timesCount = 4;
        } else {
          safeDoses = ['08:00 AM', '08:00 PM']; // Default BD
          timesCount = 2;
        }
      }

      const reminderObj = (isReminderEnabled && (selectedCustomerId || customerName)) ? {
        drugName: reminderDrugName || activeRows[0]?.itemName || 'Prescribed Medicine',
        reminderDate,
        reminderTime: safeDoses.join(', ') || '08:00 AM, 08:00 PM',
        timesPerDay: timesCount,
        mealTiming: reminderMealTiming,
        dosageInstructions: reminderDosageNotes,
        doses: safeDoses,
      } : null;

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      isSavingRef.current = true;

      const payload = {
        customerId: selectedCustomerId || null,
        customerName: customerName || 'Cash Sale',
        customerPhone: customerPhone || null,
        doctorId: selectedDoctorId || null,
        doctorName: doctor || null,
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: billDate,
        dueDate: null,
        doctor: doctor ? `${doctor}${doctorLicense ? ` (${doctorLicense})` : ''}${caseNumber ? ` - OPD: ${caseNumber}` : ''}` : null,
        discountPercent: Number(discountPercent || 0),
        paymentMethod: isUnpaid ? 'CREDIT' : paymentMethod.toUpperCase(),
        paymentStatus: isUnpaid ? 'UNPAID' : isPartial ? 'PARTIAL' : 'PAID',
        paidAmount: resolvedPaid,
        status: isDraft ? 'DRAFT' : 'COMPLETED',
        notes,
        prescriptions: prescriptionImages,
        isAyushman: Boolean(isAyushman),
        ayushmanCardNo: isAyushman ? (ayushmanCardNo || null) : null,
        beneficiaryId: isAyushman ? (beneficiaryId || null) : null,
        claimStatus: isAyushman ? (claimStatus || 'PENDING') : null,
        reminders: reminderObj ? [reminderObj] : [],
        patientReminders: (isReminderEnabled && (selectedCustomerId || customerName)) ? {
          ...reminderObj,
          doses: safeDoses,
        } : undefined,
        saleId: activeDraftId || null,
        items: activeRows.map((r) => ({
          productId: r.productId,
          batchId: r.batchId,
          packagingId: r.packagingId || null,
          qty: Number(r.qty || 0),
          tabs: Number(r.tabs || 0),
          mrp: Number(r.mrp || 0),
          unitPrice: Number(r.mrp || 0),
          disc: Number(r.disc || 0),
          gstPercent: Number(r.gstPercent || 12),
        })),
      };

      const res = unwrap(await api.post('/sales', payload));

      return {
        res,
        sendReminder: Boolean(vars.sendReminder),
        shouldPrint: Boolean(vars.shouldPrint),
        printMode: vars.printMode || 'actual',
        activeRows,
      };
    },
    onSuccess: async (data, vars) => {
      isSavingRef.current = false;
      await queryClient.invalidateQueries({ queryKey: ['sale-products'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-list'] });
      await queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      await queryClient.invalidateQueries({ queryKey: ['sales-drafts-page'] });
      await queryClient.invalidateQueries({ queryKey: ['refill-reminders-page'] });
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });

      const saleRecord = data?.res || {};
      const saleId = saleRecord.id;

      if (data.shouldPrint && saleRecord) {
        const printWin = window.open('', '_blank');
        if (printWin) {
          const recordToPrint = {
            ...saleRecord,
            customer: saleRecord.customer || (customerName ? { name: customerName, phone: customerPhone } : null),
            doctor: saleRecord.doctor || doctor || null,
            items: (saleRecord.items && saleRecord.items.length > 0)
              ? saleRecord.items.map((it) => {
                  const matchRow = (data.activeRows || []).find((r) => r.batchId === it.batchId || r.productId === it.productId);
                  return {
                    ...it,
                    qty: matchRow ? Number(matchRow.qty || 0) : undefined,
                    tabs: matchRow ? Number(matchRow.tabs || 0) : undefined,
                    conversionToBase: matchRow?.conversionToBase ?? it.packaging?.conversionToBase,
                  };
                })
              : (data.activeRows || []).map((r) => ({
                  product: { name: r.itemName, pack: r.pack, dosageForm: r.dosageForm },
                  batch: { batchNumber: r.batchNumber, expiryDate: r.expiryDate, mrp: r.mrp },
                  quantity: (Number(r.qty || 0) + (Number(r.tabs || 0) / Math.max(1, Number(r.conversionToBase || 10)))),
                  qty: Number(r.qty || 0),
                  tabs: Number(r.tabs || 0),
                  conversionToBase: r.conversionToBase,
                  unitPrice: r.rate || r.unitPrice || r.mrp,
                  totalAmount: r.total || r.amount,
                })),
          };
          const html = generateClassicPrintHtml(recordToPrint, user?.store, data.printMode || 'actual');
          printWin.document.open();
          printWin.document.write(html);
          printWin.document.close();
        }
      }

      if (vars?.isSaveAndNew) {
        setActiveDraftId(null);
        hasHydratedDraftRef.current = null;
        setRows([]);
        setEntryRow(createEmptyRow());
        setDrugSearch('');
        setShowDrugDropdown(false);
        setHighlightedIndex(-1);
        setSelectedCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerSearch('');
        setDiscountPercent('');
        setPaymentStatus('Paid');
        setPaymentMethod('Cash');
        setPaidAmount('');
        setDoctor('');
        setSelectedDoctorId('');
        setDoctorSearch('');
        setDoctorLicense('');
        setCaseNumber('');
        setNotes('');
        setPrescriptionImages([]);
        setIsAyushman(false);
        setAyushmanCardNo('');
        setBeneficiaryId('');
        setIsReminderEnabled(false);
        setSelectedReminderDrugId('');
        setReminderDrugName('');
        setAutoSaveState({ status: 'idle', time: null });

        window.alert(`Sale bill #${saleRecord.invoiceNumber || ''} generated successfully! Fresh bill ready.`);
        setTimeout(() => focusEntry('search'), 50);
        return;
      }

      if (vars?.sendReminder) {
        setActiveDraftId(null);
        hasHydratedDraftRef.current = null;
        if (customerPhone) {
          const drug = reminderDrugName || 'Prescription Medicine';
          const link = saleId ? `${window.location.origin}/p/bill/${saleId}` : window.location.origin;
          const user = JSON.parse(localStorage.getItem('pharma_user') || '{}');
          const pharmacyName = user?.store?.name || 'our pharmacy';
          const msg = `Hello ${customerName || 'Customer'}! Thank you for visiting ${pharmacyName}. Your bill & medication schedule for ${drug} has been scheduled. View details & track dosage here: ${link}`;
          const phoneDigits = customerPhone.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/91${phoneDigits}?text=${encodeURIComponent(msg)}`, '_blank');
          window.alert(`Sale bill generated successfully! Medication reminder scheduled and WhatsApp opened for ${customerName || 'customer'}.`);
        } else {
          window.alert(`Sale bill generated successfully! Medication reminder scheduled for ${customerName || 'customer'} (WhatsApp link not opened: no phone number on record).`);
        }
        navigate('/sales');
        return;
      }

      if (vars?.isDraft) {
        window.alert('Sale saved as Draft');
        navigate('/sales');
        return;
      }

      setActiveDraftId(null);
      hasHydratedDraftRef.current = null;
      window.alert('Sale bill generated successfully!');
      navigate('/sales');
    },
    onError: (err) => {
      isSavingRef.current = false;
      window.alert(apiError(err) || 'Failed to save sale');
    },
  });

  // Dual-Mode Print Format Modal
  const [showPrintFormatModal, setShowPrintFormatModal] = useState(false);

  const handlePrintButtonClick = () => {
    const activeRows = [...rows];
    if (entryRow.productId && entryRow.batchId && (Number(entryRow.qty || 0) > 0 || Number(entryRow.tabs || 0) > 0)) {
      activeRows.push(entryRow);
    }
    if (!activeRows.length) {
      window.alert('Please add at least one medicine before printing the bill');
      return;
    }
    setShowPrintFormatModal(true);
  };

  const handleSelectPrintMode = (mode) => {
    setShowPrintFormatModal(false);
    saveSaleMutation.mutate({ isDraft: false, shouldPrint: true, printMode: mode });
  };

  // Auto-Save Draft State & Logic
  const [autoSaveState, setAutoSaveState] = useState({ status: 'idle', time: null });
  const isInitialMount = useRef(true);
  const autoSaveTimerRef = useRef(null);

  const silentAutoSaveSaleDraft = async () => {
    if (isSavingRef.current || saveSaleMutation.isPending) return;

    const activeRows = [...rows];
    if (entryRow.productId && entryRow.batchId && (Number(entryRow.qty || 0) > 0 || Number(entryRow.tabs || 0) > 0)) {
      activeRows.push(recalcRow(entryRow));
    }

    // Only autosave if there are actual medicine rows in the sale
    if (activeRows.length === 0) return;

    const isUnpaid = paymentStatus === 'Unpaid';
    const isPartial = paymentStatus === 'Partial';
    const resolvedPaid = isUnpaid
      ? 0
      : isPartial
        ? Math.max(0, Math.min(calculations.grandTotal, Number(paidAmount || 0)))
        : calculations.grandTotal;

    const payload = {
      saleId: activeDraftId || null,
      customerId: selectedCustomerId || null,
      customerName: customerName || 'Cash Sale',
      customerPhone: customerPhone || null,
      doctorId: selectedDoctorId || null,
      doctorName: doctor || null,
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: billDate,
      dueDate: null,
      doctor: doctor ? `${doctor}${doctorLicense ? ` (${doctorLicense})` : ''}${caseNumber ? ` - OPD: ${caseNumber}` : ''}` : null,
      discountPercent: Number(discountPercent || 0),
      paymentMethod: isUnpaid ? 'CREDIT' : paymentMethod.toUpperCase(),
      paymentStatus: isUnpaid ? 'UNPAID' : isPartial ? 'PARTIAL' : 'PAID',
      paidAmount: resolvedPaid,
      status: 'DRAFT',
      notes,
      prescriptions: prescriptionImages,
      isAyushman: Boolean(isAyushman),
      ayushmanCardNo: isAyushman ? (ayushmanCardNo || null) : null,
      beneficiaryId: isAyushman ? (beneficiaryId || null) : null,
      claimStatus: isAyushman ? (claimStatus || 'PENDING') : null,
      items: activeRows.map((r) => ({
        productId: r.productId,
        batchId: r.batchId,
        packagingId: r.packagingId || null,
        qty: Number(r.qty || 0),
        tabs: Number(r.tabs || 0),
        mrp: Number(r.mrp || 0),
        unitPrice: Number(r.mrp || 0),
        disc: Number(r.disc || 0),
        gstPercent: Number(r.gstPercent || 12),
      })),
    };

    try {
      setAutoSaveState((prev) => ({ ...prev, status: 'saving' }));
      const res = unwrap(await api.post('/sales', payload));
      if (res?.id && res.id !== activeDraftId) {
        setActiveDraftId(res.id);
      }
      queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['sales-drafts-page'] });
      setAutoSaveState({
        status: 'saved',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
      });
    } catch (err) {
      console.warn('Silent auto-save sale draft failed:', err);
      setAutoSaveState((prev) => ({ ...prev, status: 'idle' }));
    }
  };

  // 2-second debounced background auto-save for Sales
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      silentAutoSaveSaleDraft();
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [rows, entryRow, selectedCustomerId, customerName, customerPhone, doctor, notes, discountPercent, paymentMethod, paymentStatus]);

  // Global Keyboard Shortcuts (Ctrl+Enter / Alt+S for Save & Add New)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (showCustomerModal || showDoctorModal || showDraftsModal || showPrintFormatModal) return;
      if (e.target && e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveSaleMutation.mutate({ isDraft: false, isSaveAndNew: true });
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveSaleMutation.mutate({ isDraft: false, isSaveAndNew: true });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showCustomerModal, showDoctorModal, showDraftsModal, showPrintFormatModal, rows, entryRow, selectedCustomerId, customerName, paidAmount, discountPercent, paymentMethod, paymentStatus]);

  const filteredCustomerList = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers.slice(0, 8);
    return customers
      .filter((c) => (c.name || '').toLowerCase().includes(term) || (c.phone || '').includes(term))
      .slice(0, 8);
  }, [customers, customerSearch]);

  const selectCustomer = (c) => {
    if (!c) {
      // Walk-in
      setSelectedCustomerId('');
      setCustomerName('Cash Sale / Walk-in');
      setCustomerPhone('');
      setCustomerSearch('Cash Sale / Walk-in');
    } else {
      setSelectedCustomerId(c.id);
      setCustomerName(c.name);
      setCustomerPhone(c.phone || '');
      setCustomerSearch(c.name);
      if (c.defaultDiscountPercent != null && c.defaultDiscountPercent !== '') {
        setDiscountPercent(String(c.defaultDiscountPercent));
      }
    }
    setShowCustomerDropdown(false);
    setHighlightedCustomerIndex(-1);
    setTimeout(() => focusEntry('search'), 30);
  };

  const handleCustomerKeyDown = (event) => {
    const totalOptions = 1 + filteredCustomerList.length;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!showCustomerDropdown) setShowCustomerDropdown(true);
      setHighlightedCustomerIndex((curr) => (curr + 1) % totalOptions);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showCustomerDropdown) setShowCustomerDropdown(true);
      setHighlightedCustomerIndex((curr) => (curr - 1 + totalOptions) % totalOptions);
    } else if (event.key === 'Enter') {
      if (showCustomerDropdown) {
        event.preventDefault();
        if (highlightedCustomerIndex === 0) {
          selectCustomer(null);
        } else if (highlightedCustomerIndex > 0 && filteredCustomerList[highlightedCustomerIndex - 1]) {
          selectCustomer(filteredCustomerList[highlightedCustomerIndex - 1]);
        } else if (filteredCustomerList.length > 0) {
          selectCustomer(filteredCustomerList[0]);
        } else {
          setShowCustomerDropdown(false);
          focusEntry('search');
        }
      }
    } else if (event.key === 'Escape') {
      setShowCustomerDropdown(false);
      setHighlightedCustomerIndex(-1);
    }
  };

  return (
    <div className="pos-container">
      {/* Top Header Bar */}
      <div className="pos-top-bar">
        <div className="pos-top-left">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="pos-back-btn"
            aria-label="Back"
          >
            <ChevronLeft size={18} />
          </button>
          <h1 className="pos-top-title">Add Sale</h1>
          {activeDraftId && (
            <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-brand-primary border border-emerald-300">
              Editing Draft #{activeDraftId.slice(-6)}
            </span>
          )}
        </div>

        <div className="pos-top-actions">
          {autoSaveState.status === 'saving' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008b8b', fontWeight: 600, paddingRight: 6 }}>
              <span className="animate-spin" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '2px solid #008b8b', borderTopColor: 'transparent' }} />
              <span>Auto-saving draft...</span>
            </div>
          )}
          {autoSaveState.status === 'saved' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981', fontWeight: 600, paddingRight: 6 }}>
              <span>✓ Auto-saved {autoSaveState.time ? `at ${autoSaveState.time}` : 'to drafts'}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setRows([]);
              setEntryRow(createEmptyRow());
              setDrugSearch('');
              setShowDrugDropdown(false);
              setHighlightedIndex(-1);
              setSelectedCustomerId('');
              setCustomerName('');
              setCustomerPhone('');
              setCustomerSearch('');
              setDiscountPercent('');
              setPaymentStatus('Paid');
              setPaymentMethod('Cash');
              setPaidAmount('');
              setDoctor('');
              setSelectedDoctorId('');
              setDoctorSearch('');
              setDoctorLicense('');
              setCaseNumber('');
              setNotes('');
              setPrescriptionImages([]);
              setIsAyushman(false);
              setAyushmanCardNo('');
              setBeneficiaryId('');
              setIsReminderEnabled(false);
              setSelectedReminderDrugId('');
              setReminderDrugName('');
              setActiveDraftId(null);
              hasHydratedDraftRef.current = null;
              setAutoSaveState({ status: 'idle', time: null });
            }}
            className="pos-btn-ghost"
          >
            <RotateCcw size={13} /> Clear
          </button>
          <button
            type="button"
            onClick={() => setShowDraftsModal(true)}
            className="pos-btn-ghost"
            style={{
              position: 'relative',
              background: saleDrafts.length > 0 ? '#e0f2fe' : '#fff',
              color: saleDrafts.length > 0 ? '#0369a1' : '#435b55',
              borderColor: saleDrafts.length > 0 ? '#bae6fd' : '#d5e3df',
              fontWeight: 700
            }}
          >
            <Save size={13} /> Drafts {saleDrafts.length > 0 && `(${saleDrafts.length})`}
          </button>
          <button
            type="button"
            onClick={() => saveSaleMutation.mutate({ isDraft: true })}
            className="pos-btn-ghost"
            style={{
              background: '#f0fdf4',
              color: '#15803d',
              borderColor: '#bbf7d0',
              fontWeight: 700
            }}
            title="Save current sale as a draft"
          >
            + Save Draft
          </button>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="pos-main-body">
        {/* 3 Header Information Cards */}
        <div className="pos-header-cards">
          {/* Card 1: Customer Selection & Quick Add Card */}
          <div className="pos-cust-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="pos-cust-top">
                <User size={15} />
                <span>CUSTOMER</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => selectCustomer(null)}
                  style={{
                    border: '1px solid #c9e6de',
                    background: !selectedCustomerId && (customerName === 'Cash Sale / Walk-in' || customerName === 'Walk-in Customer') ? '#007a70' : '#fff',
                    color: !selectedCustomerId && (customerName === 'Cash Sale / Walk-in' || customerName === 'Walk-in Customer') ? '#fff' : '#0e695d',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                  }}
                  title="Quick Walk-in Customer"
                >
                  Walk-in
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  style={{
                    border: '1px solid #007a70',
                    background: '#007a70',
                    color: '#fff',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    padding: '2px 6px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                  title="Add new customer to database"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Customer Search & Picker */}
            <div style={{ marginTop: '8px', position: 'relative' }}>
              <input
                ref={(el) => { entryRefs.current.customerSearch = el; }}
                value={customerSearch}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerSearch(val);
                  setCustomerName(val);
                  setSelectedCustomerId('');
                  setShowCustomerDropdown(true);
                  setHighlightedCustomerIndex(-1);
                }}
                onKeyDown={handleCustomerKeyDown}
                placeholder="Search or enter customer name..."
                style={{
                  width: '100%',
                  border: '1px solid #b7d6ce',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#133e36',
                  background: '#fff',
                }}
              />

              {showCustomerDropdown && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: '#fff',
                  border: '1px solid #b7d6ce',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 9999,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCustomer(null);
                    }}
                    style={{
                      padding: '6px 8px',
                      borderBottom: '1px solid #eef5f3',
                      cursor: 'pointer',
                      background: highlightedCustomerIndex === 0 ? '#e2f2ee' : (!selectedCustomerId && customerName === 'Cash Sale / Walk-in' ? '#eef7f5' : '#fff'),
                      borderLeft: highlightedCustomerIndex === 0 ? '3px solid #007a70' : '3px solid transparent',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#0e695d'
                    }}
                  >
                    🚶 Cash Sale / Walk-in Customer
                  </div>

                  {filteredCustomerList.map((c, idx) => {
                    const isHighlighted = highlightedCustomerIndex === idx + 1;
                    return (
                      <div
                        key={c.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectCustomer(c);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #f0f6f4',
                          cursor: 'pointer',
                          background: isHighlighted ? '#e2f2ee' : (selectedCustomerId === c.id ? '#eef7f5' : '#fff'),
                          borderLeft: isHighlighted ? '3px solid #007a70' : '3px solid transparent',
                          fontSize: '11px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#164e43' }}>{c.name}</strong>
                          {c.phone && <div style={{ fontSize: '9px', color: '#68827c' }}>📞 {c.phone}</div>}
                        </div>
                        {c.outstandingBalance > 0 && (
                          <div style={{ fontSize: '9px', color: '#d97706', fontWeight: 600 }}>
                            Due: {money(c.outstandingBalance)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: '6px', fontSize: '9.5px', color: '#52726c', display: 'flex', justifyContent: 'space-between' }}>
              <span>{selectedCustomerId ? 'Registered Customer' : customerName ? 'Walk-in / Custom Customer' : 'No Customer Selected'}</span>
              {customerPhone && <span>📞 {customerPhone}</span>}
            </div>

            {/* Ayushman Bharat Scheme Toggle Section */}
            <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cde2dc' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isAyushman}
                  onChange={(e) => setIsAyushman(e.target.checked)}
                  style={{ width: '14px', height: '14px', accentColor: '#007a70', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: isAyushman ? '#007a70' : '#435e58' }}>
                  🏥 Ayushman Scheme Billing
                </span>
                {isAyushman && (
                  <span style={{ fontSize: '9px', fontWeight: 800, background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                    Active
                  </span>
                )}
              </label>

              {isAyushman && (
                <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#f4faf8', padding: '6px', borderRadius: '6px', border: '1px solid #cce8e2' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#007a70', marginBottom: '2px' }}>
                      Ayushman Card No. *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AB-1234-5678"
                      value={ayushmanCardNo}
                      onChange={(e) => setAyushmanCardNo(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #b7d6ce',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        background: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#007a70', marginBottom: '2px' }}>
                      Beneficiary ID *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BEN-99882"
                      value={beneficiaryId}
                      onChange={(e) => setBeneficiaryId(e.target.value)}
                      style={{
                        width: '100%',
                        border: '1px solid #b7d6ce',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        background: '#fff',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Medication & Refill Reminder Section (Available for Registered Customers) */}
            {selectedCustomerId && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cde2dc' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={isReminderEnabled}
                    onChange={(e) => setIsReminderEnabled(e.target.checked)}
                    style={{ width: '14px', height: '14px', accentColor: '#007a70', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: isReminderEnabled ? '#007a70' : '#435e58' }}>
                    ⏰ Set Patient Medication Reminder
                  </span>
                  {isReminderEnabled && (
                    <span style={{ fontSize: '9px', fontWeight: 800, background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                      Scheduled
                    </span>
                  )}
                </label>

                {isReminderEnabled && (
                  <div style={{ marginTop: '8px', background: '#fcfefd', padding: '8px', borderRadius: '6px', border: '1px solid #b9ddd5', display: 'grid', gap: '6px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#007a70', marginBottom: '2px' }}>
                        Medicine / Drug Name
                      </label>
                      {rows.length > 1 ? (
                        <select
                          value={selectedReminderDrugId || (rows[0] ? String(rows[0].id) : '')}
                          onChange={(e) => {
                            const chosenId = e.target.value;
                            setSelectedReminderDrugId(chosenId);
                            const matched = rows.find((r) => String(r.id) === String(chosenId));
                            if (matched) {
                              setReminderDrugName(matched.itemName || 'Prescribed Medicine');
                            }
                          }}
                          style={{
                            width: '100%',
                            border: '1px solid #cadcd7',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '10.5px',
                            color: '#133e36',
                            background: '#fff',
                          }}
                        >
                          {rows.map((r, idx) => (
                            <option key={r.id || idx} value={String(r.id)}>
                              {r.itemName || `Item #${idx + 1}`} (Qty: {r.qty || 1} {r.pack || ''})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. Amoxicillin 500mg (or auto from bill)"
                          value={reminderDrugName}
                          onChange={(e) => setReminderDrugName(e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px solid #cadcd7',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '10.5px',
                            color: '#133e36',
                            background: '#fff',
                          }}
                        />
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#446059', marginBottom: '2px' }}>
                          Frequency (Dosage / Day) *
                        </label>
                        <select
                          value={reminderFrequency}
                          onChange={(e) => setReminderFrequency(e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px solid #cadcd7',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '10.5px',
                            color: '#133e36',
                            background: '#fff',
                          }}
                        >
                          <option value="1 Time a Day (OD)">1 Time a Day (OD)</option>
                          <option value="2 Times a Day (BD)">2 Times a Day (BD)</option>
                          <option value="3 Times a Day (TDS)">3 Times a Day (TDS)</option>
                          <option value="4 Times a Day (QID)">4 Times a Day (QID)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#446059', marginBottom: '2px' }}>
                          Meal Timing *
                        </label>
                        <select
                          value={reminderMealTiming}
                          onChange={(e) => setReminderMealTiming(e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px solid #cadcd7',
                            borderRadius: '4px',
                            padding: '3px 6px',
                            fontSize: '10.5px',
                            color: '#133e36',
                            background: '#fff',
                          }}
                        >
                          <option value="AFTER_MEAL">After Meals (Post-cibal)</option>
                          <option value="BEFORE_MEAL">Before Meals (Empty Stomach)</option>
                          <option value="WITH_FOOD">With Food</option>
                          <option value="ANYTIME">Anytime</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#446059', marginBottom: '2px' }}>
                        Reminder Date (Auto Calculated) *
                      </label>
                      <input
                        type="date"
                        value={reminderDate}
                        onChange={(e) => setReminderDate(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #cadcd7',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          fontSize: '10.5px',
                          color: '#133e36',
                          background: '#fff',
                        }}
                      />
                      <span style={{ fontSize: '8.5px', color: '#668780', marginTop: '2px', display: 'block' }}>
                        Calculated Course: Auto-refill on exact finish day.
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '9.5px', fontWeight: 700, color: '#446059', marginBottom: '2px' }}>
                        Dosage Instructions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 tablet with warm milk"
                        value={reminderDosageNotes}
                        onChange={(e) => setReminderDosageNotes(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #cadcd7',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          fontSize: '10.5px',
                          color: '#133e36',
                          background: '#fff',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Add Customer Modal */}
          {showCustomerModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 99999,
              display: 'grid',
              placeItems: 'center'
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '16px 20px',
                width: 'min(380px, 92vw)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                border: '1px solid #c9ded9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ color: '#0d5c52', fontSize: '14px' }}>Add New Customer</strong>
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    style={{ border: 0, background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#666' }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleQuickCreateCustomer} style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      CUSTOMER NAME *
                    </label>
                    <input
                      required
                      autoFocus
                      value={newCustomerData.name}
                      onChange={(e) => setNewCustomerData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. John Doe"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      PHONE NUMBER (OPTIONAL)
                    </label>
                    <input
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(false)}
                      style={{
                        border: '1px solid #cadcd7',
                        background: '#f4f8f7',
                        color: '#446059',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createCustomerMutation.isPending}
                      style={{
                        border: 0,
                        background: '#007a70',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {createCustomerMutation.isPending ? 'Saving...' : 'Save & Select'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Card 2: Payment Status, Method, and Amounts */}
          <div className="pos-center-card">
            <div className="pos-date-bar">
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#435e58' }}>Date:</span>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="pos-date-input"
              />
            </div>

            <div>
              <div className="pos-pay-status-label">SELECT PAYMENT STATUS</div>
              <div className="pos-pay-status-tabs">
                {['Paid', 'Unpaid', 'Partial'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setPaymentStatus(status);
                      if (status === 'Unpaid' || status === 'Partial' || status === 'Paid') {
                        setPaidAmount('');
                      }
                    }}
                    className={`pos-pay-tab ${paymentStatus === status ? 'active' : ''}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="pos-pay-details-row">
              <div className="pos-input-group" style={{ flex: 1.2 }}>
                <span>Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={paymentStatus === 'Unpaid'}
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                </select>
              </div>

              <div className="pos-input-group" style={{ flex: 1 }}>
                <span>Paid Amount</span>
                <input
                  type="number"
                  placeholder={paymentStatus === 'Partial' ? 'Enter amount' : ''}
                  value={paymentStatus === 'Paid' ? (calculations.grandTotal || '') : paymentStatus === 'Unpaid' ? '' : paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  disabled={paymentStatus === 'Paid' || paymentStatus === 'Unpaid'}
                />
              </div>

              <div className="pos-input-group" style={{ flex: 1 }}>
                <span>Discount %</span>
                <input
                  type="number"
                  placeholder="0"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                />
              </div>
            </div>

            <div style={{ fontSize: '10px', color: '#7a9690', marginTop: '2px' }}>
              No bank accounts available
            </div>
          </div>

          {/* Card 3: Doctor, License, OPD with Search & Add Doctor */}
          <div className="pos-right-card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#133e36', textTransform: 'uppercase' }}>
                Prescribed Doctor
              </span>
              <button
                type="button"
                onClick={() => setShowDoctorModal(true)}
                style={{
                  border: 0,
                  background: '#007a70',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                + Add Doctor
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                value={doctorSearch}
                onFocus={() => setShowDoctorDropdown(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setDoctorSearch(val);
                  setDoctor(val);
                  setSelectedDoctorId('');
                  setShowDoctorDropdown(true);
                }}
                placeholder="Search or enter doctor name..."
                style={{
                  width: '100%',
                  border: '1px solid #cadcd7',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#133e36',
                  background: '#fff'
                }}
              />

              {showDoctorDropdown && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 4px)',
                  background: '#fff',
                  border: '1px solid #b7d6ce',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  zIndex: 9999,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedDoctorId('');
                      setDoctor('');
                      setDoctorSearch('');
                      setDoctorLicense('');
                      setShowDoctorDropdown(false);
                    }}
                    style={{
                      padding: '5px 8px',
                      borderBottom: '1px solid #eef5f3',
                      cursor: 'pointer',
                      background: !selectedDoctorId && !doctor ? '#eef7f5' : '#fff',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: '#0e695d'
                    }}
                  >
                    🚫 No Doctor / Self Prescribed
                  </div>

                  {doctorsList
                    .filter((d) => !doctorSearch || d.name.toLowerCase().includes(doctorSearch.toLowerCase()) || (d.specialization && d.specialization.toLowerCase().includes(doctorSearch.toLowerCase())))
                    .map((d) => (
                      <div
                        key={d.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedDoctorId(d.id);
                          setDoctor(d.name);
                          setDoctorSearch(d.name);
                          setDoctorLicense(d.registrationNo || '');
                          setShowDoctorDropdown(false);
                        }}
                        style={{
                          padding: '6px 8px',
                          borderBottom: '1px solid #f0f4f3',
                          cursor: 'pointer',
                          background: selectedDoctorId === d.id ? '#e6f4f1' : '#fff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#164e43' }}>{d.name}</strong>
                          {d.specialization && <span style={{ fontSize: '9.5px', color: '#007a70', marginLeft: '4px' }}>({d.specialization})</span>}
                          {d.hospital && <div style={{ fontSize: '9px', color: '#68827c' }}>🏥 {d.hospital}</div>}
                        </div>
                        {d.registrationNo && (
                          <div style={{ fontSize: '9px', color: '#475569', background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>
                            {d.registrationNo}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <input
              value={doctorLicense}
              onChange={(e) => setDoctorLicense(e.target.value)}
              placeholder="Doctor License / Reg No."
              style={{
                width: '100%',
                border: '1px solid #cadcd7',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px'
              }}
            />
            <input
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="OPD / Case Number"
              style={{
                width: '100%',
                border: '1px solid #cadcd7',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px'
              }}
            />
          </div>

          {/* Quick Add Doctor Modal */}
          {showDoctorModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 99999,
              display: 'grid',
              placeItems: 'center'
            }}>
              <div style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '16px 20px',
                width: 'min(380px, 92vw)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                border: '1px solid #c9ded9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <strong style={{ color: '#0d5c52', fontSize: '14px' }}>Add New Doctor</strong>
                  <button
                    type="button"
                    onClick={() => setShowDoctorModal(false)}
                    style={{ border: 0, background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#666' }}
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleQuickCreateDoctor} style={{ display: 'grid', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      DOCTOR NAME *
                    </label>
                    <input
                      required
                      autoFocus
                      value={newDoctorData.name}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Dr. Ramesh Gupta"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      SPECIALIZATION (OPTIONAL)
                    </label>
                    <input
                      value={newDoctorData.specialization}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, specialization: e.target.value }))}
                      placeholder="e.g. Physician, Pediatrician"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      REGISTRATION / LICENSE NO. (OPTIONAL)
                    </label>
                    <input
                      value={newDoctorData.registrationNo}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, registrationNo: e.target.value }))}
                      placeholder="e.g. MCI-98765"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#446059', marginBottom: '3px' }}>
                      PHONE (OPTIONAL)
                    </label>
                    <input
                      type="tel"
                      value={newDoctorData.phone}
                      onChange={(e) => setNewDoctorData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      style={{
                        width: '100%',
                        border: '1px solid #cadcd7',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowDoctorModal(false)}
                      style={{
                        border: '1px solid #cadcd7',
                        background: '#f4f8f7',
                        color: '#446059',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createDoctorMutation.isPending}
                      style={{
                        border: 0,
                        background: '#007a70',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {createDoctorMutation.isPending ? 'Saving...' : 'Save & Select'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Medicines Table Card */}
        <div className="pos-table-card" style={{ overflow: 'visible' }}>
          <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
            <table className="pos-table">
              <colgroup>
                <col style={{ width: '40px' }} />
                <col style={{ width: '280px' }} />
                <col style={{ width: '75px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '70px' }} />
                <col style={{ width: '90px' }} />
                <col style={{ width: '40px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="center">S.No</th>
                  <th>DRUG</th>
                  <th>PACK</th>
                  <th>BATCH</th>
                  <th>EXPIRY</th>
                  <th className="center" title="Commercial quantity (Strips for Tablets/Capsules)">
                    <div>QTY</div>
                    <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8', textTransform: 'none', lineHeight: 1 }}>Strip</div>
                  </th>
                  <th className="center" title="Loose tablet/capsule quantity">
                    <div>USE</div>
                    <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8', textTransform: 'none', lineHeight: 1 }}>Loose</div>
                  </th>
                  <th className="right">MRP</th>
                  <th className="center">DISC%</th>
                  <th className="right">TOTAL</th>
                  <th className="center"></th>
                </tr>
              </thead>
              <tbody>
                {/* Active fast-entry row matching table style */}
                <tr style={{ background: '#f6fbf9' }}>
                  <td className="center font-bold text-slate-500">
                    <button
                      type="button"
                      onClick={submitEntryRow}
                      style={{ border: 0, background: '#007a70', color: '#fff', borderRadius: '4px', width: '20px', height: '20px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                      title="Add line"
                    >
                      +
                    </button>
                  </td>
                  <td style={{ position: 'relative' }}>
                    <input
                      ref={(el) => { entryRefs.current.search = el; }}
                      value={drugSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDrugSearch(val);
                        setShowDrugDropdown(val.trim().length > 0);
                        setHighlightedIndex(-1);
                        if (entryRow.productId && val !== entryRow.itemName) {
                          setEntryRow((prev) => ({
                            ...prev,
                            productId: '',
                            batchId: '',
                            packagingId: '',
                            itemName: '',
                            pack: '',
                            batch: '',
                            expiry: '',
                            qty: '',
                            tabs: '',
                            mrp: '',
                            disc: '',
                            total: 0,
                            stock: 0,
                          }));
                        }
                      }}
                      onFocus={() => {
                        if (drugSearch.trim().length > 0) {
                          setShowDrugDropdown(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setShowDrugDropdown(false), 200);
                      }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search drug / medicine..."
                      style={{ width: '100%', fontWeight: 600 }}
                    />
                    {showDrugDropdown && filteredDrugSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(100% + 4px)',
                        background: '#ffffff',
                        border: '1px solid #b7d6ce',
                        borderRadius: '6px',
                        boxShadow: '0 12px 28px rgba(10, 45, 40, 0.22)',
                        zIndex: 9999,
                        maxHeight: '260px',
                        overflowY: 'auto'
                      }}>
                        {filteredDrugSuggestions.map((group, idx) => {
                          const primaryBatch = group.batches[0];
                          const extraBatchesCount = group.batches.length - 1;
                          const isHighlighted = highlightedIndex === idx;
                          return (
                            <div
                              key={group.productId}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applySelectedBatch(primaryBatch);
                              }}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                                padding: '8px 10px',
                                background: isHighlighted ? '#e2f2ee' : '#fff',
                                borderLeft: isHighlighted ? '3px solid #007a70' : '3px solid transparent',
                                cursor: 'pointer',
                                borderBottom: '1px solid #edf4f2',
                                fontSize: '11px'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: '#1a3832' }}>{group.productName}</strong>
                                  {group.pack && (
                                    <span style={{
                                      background: '#ecfdf5',
                                      color: '#065f46',
                                      fontSize: '9px',
                                      fontWeight: 700,
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      border: '1px solid #a7f3d0'
                                    }}>
                                      {group.pack}
                                    </span>
                                  )}
                                  {extraBatchesCount > 0 && (
                                    <span style={{
                                      background: '#e0f2fe',
                                      color: '#0369a1',
                                      fontSize: '9px',
                                      fontWeight: 'bold',
                                      padding: '1px 5px',
                                      borderRadius: '10px',
                                      border: '1px solid #bae6fd'
                                    }}>
                                      +{extraBatchesCount} batches
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '9.5px', color: '#68827c', marginTop: '2px' }}>
                                  Batch: {primaryBatch.batchNumber} • Exp: {primaryBatch.expiryDate}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <b style={{ color: '#007a70' }}>{money(primaryBatch.mrp)}</b>
                                <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#15806e' }}>
                                  Total Stock: {group.totalStock}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td>
                    <input
                      value={entryRow.pack || ''}
                      readOnly
                      placeholder="Pack"
                      style={{
                        width: '100%',
                        background: '#f4f8f7',
                        fontWeight: 600,
                        color: '#0f5247',
                        fontSize: '10.5px'
                      }}
                    />
                  </td>
                  <td style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        value={entryRow.batch}
                        readOnly
                        placeholder="Batch"
                        onClick={() => {
                          if (entryRow.productId) setShowBatchDropdown(!showBatchDropdown);
                        }}
                        style={{
                          width: '100%',
                          background: entryRow.productId ? '#ffffff' : '#f4f8f7',
                          cursor: entryRow.productId ? 'pointer' : 'default',
                          fontWeight: 600
                        }}
                      />
                      {(() => {
                        const currentGroup = productBatchesMap.get(entryRow.productId);
                        const otherBatchesCount = currentGroup ? currentGroup.batches.length - 1 : 0;
                        if (otherBatchesCount > 0) {
                          return (
                            <button
                              type="button"
                              onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                              style={{
                                marginLeft: '-24px',
                                background: '#0284c7',
                                color: '#fff',
                                border: 0,
                                borderRadius: '10px',
                                fontSize: '8.5px',
                                fontWeight: 'bold',
                                padding: '1px 4px',
                                cursor: 'pointer',
                                zIndex: 2
                              }}
                              title="Switch batch"
                            >
                              +{otherBatchesCount}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Batch Picker Dropdown */}
                    {showBatchDropdown && entryRow.productId && (() => {
                      const currentGroup = productBatchesMap.get(entryRow.productId);
                      const batches = currentGroup ? currentGroup.batches : [];
                      return (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 'calc(100% + 4px)',
                          background: '#fff',
                          border: '1px solid #94d3c3',
                          borderRadius: '6px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                          zIndex: 9999,
                          minWidth: '220px',
                          maxHeight: '180px',
                          overflowY: 'auto'
                        }}>
                          <div style={{ padding: '5px 8px', background: '#e6f4f0', fontSize: '9px', fontWeight: 'bold', color: '#0d695b', borderBottom: '1px solid #cce8e0' }}>
                            SELECT BATCH
                          </div>
                          {batches.map((b) => (
                            <div
                              key={b.batchId}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                applySelectedBatch(b);
                              }}
                              style={{
                                padding: '6px 8px',
                                display: 'flex',
                                justifyContentSelf: 'space-between',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #f0f6f4',
                                cursor: 'pointer',
                                background: entryRow.batchId === b.batchId ? '#eef7f5' : '#fff'
                              }}
                            >
                              <div>
                                <strong style={{ color: '#164e43', fontSize: '10.5px' }}>{b.batchNumber}</strong>
                                <div style={{ fontSize: '9px', color: '#68827c' }}>Exp: {b.expiryDate}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ color: '#007a70', fontWeight: 'bold', fontSize: '10.5px' }}>{money(b.mrp)}</div>
                                <div style={{ fontSize: '9px', color: '#16a34a' }}>Stock: {b.stock}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <input
                      value={entryRow.expiry}
                      readOnly
                      placeholder="MM/YY"
                      style={{ width: '100%', background: '#f4f8f7' }}
                    />
                  </td>
                  <td className="center" style={{ position: 'relative' }}>
                    {entryRow.productId && (
                      <div style={{
                        position: 'absolute',
                        top: '-14px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#007a70',
                        color: '#fff',
                        fontSize: '8.5px',
                        fontWeight: 'bold',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        zIndex: 10
                      }}>
                        {entryRow.stock} in stock
                      </div>
                    )}
                    <input
                      ref={(el) => { entryRefs.current.qty = el; }}
                      type="number"
                      min="0"
                      value={entryRow.qty}
                      onChange={(e) => setEntryRow(recalcRow({ ...entryRow, qty: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                      onKeyDown={(e) => handleEntryKeyDown(e, 'qty')}
                      style={{ width: '54px', textAlign: 'center', fontWeight: 'bold' }}
                      placeholder={isTabletOrCapsule(entryRow) ? "Strips" : "Qty"}
                      title={isTabletOrCapsule(entryRow) ? "Strip quantity" : "Commercial quantity"}
                    />
                    {isTabletOrCapsule(entryRow) && (
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1 }}>
                        Strip
                      </div>
                    )}
                  </td>
                  <td className="center">
                    <input
                      ref={(el) => { entryRefs.current.tabs = el; }}
                      type="number"
                      min="0"
                      value={entryRow.tabs}
                      onChange={(e) => setEntryRow(recalcRow({ ...entryRow, tabs: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) }))}
                      onKeyDown={(e) => handleEntryKeyDown(e, 'tabs')}
                      disabled={!isTabletOrCapsule(entryRow) && Number(entryRow.conversionToBase || 1) <= 1}
                      style={{
                        width: '54px',
                        textAlign: 'center',
                        opacity: (!isTabletOrCapsule(entryRow) && Number(entryRow.conversionToBase || 1) <= 1) ? 0.45 : 1,
                        background: (!isTabletOrCapsule(entryRow) && Number(entryRow.conversionToBase || 1) <= 1) ? '#f1f5f9' : '#fff'
                      }}
                      placeholder={isTabletOrCapsule(entryRow) ? "Loose" : "-"}
                      title={isTabletOrCapsule(entryRow) ? "Loose tablet/capsule quantity" : "Not applicable for non-strip items"}
                    />
                    {isTabletOrCapsule(entryRow) && (
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1 }}>
                        Loose
                      </div>
                    )}
                  </td>
                  <td className="right font-semibold">
                    {entryRow.mrp !== '' && entryRow.mrp != null ? money(entryRow.mrp) : '-'}
                  </td>
                  <td className="center">
                    <input
                      ref={(el) => { entryRefs.current.disc = el; }}
                      type="number"
                      min="0"
                      max="100"
                      value={entryRow.disc}
                      onChange={(e) => setEntryRow(recalcRow({ ...entryRow, disc: e.target.value === '' ? '' : Number(e.target.value) }))}
                      onKeyDown={(e) => handleEntryKeyDown(e, 'disc')}
                      style={{ width: '46px', textAlign: 'center' }}
                    />
                  </td>
                  <td className="right font-bold text-slate-800">
                    {money(entryRow.total)}
                  </td>
                  <td className="center"></td>
                </tr>

                {/* Entered Items */}
                {rows.map((row, idx) => {
                  const currentGroup = productBatchesMap.get(row.productId);
                  const batches = currentGroup ? currentGroup.batches : [];
                  const otherBatchesCount = batches.length - 1;

                  return (
                    <tr key={row.id}>
                      <td className="center text-slate-500 font-semibold">{idx + 1}</td>
                      <td className="font-bold text-slate-800">{row.itemName}</td>
                      <td className="text-slate-600 font-semibold" style={{ fontSize: '10.5px' }}>
                        {row.pack || '-'}
                      </td>
                      <td style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveBatchRowId(activeBatchRowId === row.id ? null : row.id);
                            }}
                            style={{
                              border: '1px solid #d0deda',
                              background: '#fff',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              color: '#164e43',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              width: '100%',
                              justifyContent: 'space-between'
                            }}
                          >
                            <span>{row.batch}</span>
                            {otherBatchesCount > 0 && (
                              <span
                                style={{
                                  background: '#0284c7',
                                  color: '#fff',
                                  borderRadius: '8px',
                                  fontSize: '8px',
                                  fontWeight: 'bold',
                                  padding: '0 4px',
                                }}
                              >
                                +{otherBatchesCount}
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Batch Selector Dropdown for Existing Row */}
                        {activeBatchRowId === row.id && batches.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 'calc(100% + 4px)',
                            background: '#fff',
                            border: '1px solid #94d3c3',
                            borderRadius: '6px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            zIndex: 9999,
                            minWidth: '220px',
                            maxHeight: '180px',
                            overflowY: 'auto'
                          }}>
                            <div style={{ padding: '5px 8px', background: '#e6f4f0', fontSize: '9px', fontWeight: 'bold', color: '#0d695b', borderBottom: '1px solid #cce8e0' }}>
                              SWITCH BATCH
                            </div>
                            {batches.map((b) => (
                              <div
                                key={b.batchId}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  switchExistingRowBatch(row.id, b);
                                }}
                                style={{
                                  padding: '6px 8px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: '1px solid #f0f6f4',
                                  cursor: 'pointer',
                                  background: row.batchId === b.batchId ? '#eef7f5' : '#fff'
                                }}
                              >
                                <div>
                                  <strong style={{ color: '#164e43', fontSize: '10.5px' }}>{b.batchNumber}</strong>
                                  <div style={{ fontSize: '9px', color: '#68827c' }}>Exp: {b.expiryDate}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ color: '#007a70', fontWeight: 'bold', fontSize: '10.5px' }}>{money(b.mrp)}</div>
                                  <div style={{ fontSize: '9px', color: '#16a34a' }}>Stock: {b.stock}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-slate-600">{row.expiry}</td>
                      <td className="center">
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={(e) => updateExistingRow(row.id, 'qty', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                          style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', height: '24px', padding: '2px 4px' }}
                          placeholder={isTabletOrCapsule(row) ? "Strips" : "Qty"}
                          title={isTabletOrCapsule(row) ? "Strip quantity" : "Commercial quantity"}
                        />
                        {isTabletOrCapsule(row) && (
                          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1 }}>
                            Strip
                          </div>
                        )}
                      </td>
                      <td className="center">
                        <input
                          type="number"
                          min="0"
                          value={row.tabs}
                          onChange={(e) => updateExistingRow(row.id, 'tabs', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                          disabled={!isTabletOrCapsule(row) && Number(row.conversionToBase || 1) <= 1}
                          style={{
                            width: '50px',
                            textAlign: 'center',
                            height: '24px',
                            padding: '2px 4px',
                            opacity: (!isTabletOrCapsule(row) && Number(row.conversionToBase || 1) <= 1) ? 0.45 : 1,
                            background: (!isTabletOrCapsule(row) && Number(row.conversionToBase || 1) <= 1) ? '#f1f5f9' : '#fff'
                          }}
                          placeholder={isTabletOrCapsule(row) ? "Loose" : "-"}
                          title={isTabletOrCapsule(row) ? "Loose tablet/capsule quantity" : "Not applicable for non-strip items"}
                        />
                        {isTabletOrCapsule(row) && (
                          <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600, marginTop: '2px', lineHeight: 1 }}>
                            Loose
                          </div>
                        )}
                      </td>
                      <td className="right font-semibold">{money(row.mrp)}</td>
                      <td className="center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.disc}
                          onChange={(e) => updateExistingRow(row.id, 'disc', e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
                          style={{ width: '42px', textAlign: 'center', height: '24px', padding: '2px 4px' }}
                        />
                      </td>
                      <td className="right font-bold text-slate-900">{money(row.total)}</td>
                      <td className="center">
                        <button
                          type="button"
                          onClick={() => setRows((curr) => curr.filter((r) => r.id !== row.id))}
                          style={{ border: 0, background: 'transparent', color: '#c44242', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' }}
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Notes & Document Upload Section */}
        <div className="pos-bottom-section">
          <div className="pos-notes-card">
            <div className="pos-notes-label">ADDITIONAL NOTES</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Enter any specific instructions, clinical notes, or delivery remarks here..."
            />
          </div>

          <div className="pos-docs-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <label className="pos-upload-box" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const formData = new FormData();
                    files.forEach((f) => formData.append('files', f));

                    try {
                      const res = unwrap(await api.post('/upload/prescription', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      }));
                      if (Array.isArray(res)) {
                        setPrescriptionImages((prev) => [...prev, ...res]);
                      }
                    } catch (err) {
                      // Fallback to local Base64 reading if Cloudinary keys are not yet configured
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (reader.result) {
                            setPrescriptionImages((prev) => [...prev, reader.result]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                    e.target.value = '';
                  }}
                />
                <Upload size={14} />
                <span>+ Upload Prescription</span>
              </label>

              <label className="pos-upload-box" style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    const formData = new FormData();
                    files.forEach((f) => formData.append('files', f));

                    try {
                      const res = unwrap(await api.post('/upload/prescription', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      }));
                      if (Array.isArray(res)) {
                        setPrescriptionImages((prev) => [...prev, ...res]);
                      }
                    } catch (err) {
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (reader.result) {
                            setPrescriptionImages((prev) => [...prev, reader.result]);
                          }
                        };
                        reader.readAsDataURL(file);
                      });
                    }
                    e.target.value = '';
                  }}
                />
                <Plus size={14} />
                <span>+ Add More Files</span>
              </label>
            </div>

            {/* Prescription Thumbnails & Attachments List */}
            {prescriptionImages.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                {prescriptionImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '64px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #cadcd7',
                      background: '#fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.06)'
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Prescription ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => {
                        const win = window.open(imgUrl, '_blank');
                        if (!win) {
                          window.alert('Pop-up blocked. Please allow pop-ups to view full prescription.');
                        }
                      }}
                      title="Click to view full size"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (typeof imgUrl === 'string' && imgUrl.includes('cloudinary.com')) {
                          try {
                            await api.delete('/upload/prescription', { data: { url: imgUrl } });
                          } catch (e) {
                            console.warn('Cloudinary delete error:', e);
                          }
                        }
                        setPrescriptionImages((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'rgba(225, 29, 72, 0.9)',
                        color: '#fff',
                        border: 0,
                        fontSize: '11px',
                        lineHeight: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove from sale and delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Billing Summary Bar */}
      <div className="pos-bottom-bar">
        <div className="pos-math-formula">
          <div className="pos-math-pill">
            <span>Sub Total</span>
            <b>{money(calculations.subTotal)}</b>
          </div>
          <span>-</span>
          <div className="pos-math-pill">
            <span>Disc</span>
            <b>{money(calculations.discount)}</b>
          </div>
          <div className="pos-math-pill" style={{ opacity: 0.85 }}>
            <span>Incl. GST</span>
            <b>{money(calculations.tax)}</b>
          </div>
          <span>=</span>
          <div className="pos-final-net">
            <span>NET BILL</span>
            <b>{money(calculations.grandTotal)}</b>
          </div>
        </div>

        <div className="pos-bar-buttons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => saveSaleMutation.mutate({ isDraft: true })}
            disabled={saveSaleMutation.isPending}
            className="pos-bar-btn-draft"
          >
            Save Draft
          </button>

          {isReminderEnabled && (selectedCustomerId || customerName) && (
            <button
              type="button"
              onClick={() => saveSaleMutation.mutate({ isDraft: false, sendReminder: true })}
              disabled={saveSaleMutation.isPending}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #a7f3d0',
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.15)',
                transition: 'all 0.15s ease',
              }}
              title="Save completed sale, deduct stock, schedule medication reminder, and launch WhatsApp"
            >
              ⏰ Save & Send Reminder
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintButtonClick}
            disabled={saveSaleMutation.isPending}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            title="Save bill and immediately trigger classic physical challan printout"
          >
            <Printer size={14} /> Print Bill
          </button>

          <button
            type="button"
            onClick={() => saveSaleMutation.mutate({ isDraft: false, isSaveAndNew: true })}
            disabled={saveSaleMutation.isPending}
            className="pos-bar-btn-add"
            title="Save completed sale (stock & ledger updated) and open a fresh new sale (Ctrl+Enter / Alt+S)"
          >
            Save & Add New
          </button>
        </div>
      </div>

      {/* Sale Drafts Modal / Drawer */}
      {showDraftsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: '16px',
          }}
          onClick={() => setShowDraftsModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '10px',
              width: 'min(780px, 95vw)',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid #e2ece9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8faf9',
            }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#133e36' }}>Saved Sales Drafts</strong>
                <div style={{ fontSize: '11px', color: '#627a75' }}>Resume or delete pending draft bills</div>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                style={{ border: 0, background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#68827d' }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {saleDrafts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#718a84' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
                  <strong style={{ fontSize: '14px', color: '#274740' }}>No saved sales drafts</strong>
                  <p style={{ fontSize: '11px', margin: '4px 0 0' }}>Save any in-progress bill as draft to resume it later from this section.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!window.confirm(`Are you sure you want to delete ALL ${saleDrafts.length} sales draft(s)? This action cannot be undone.`)) return;
                        for (const d of saleDrafts) {
                          try {
                            await unwrap(await api.delete(`/sales/${d.id}`));
                          } catch (e) {
                            console.warn('Failed to delete draft', d.id, e);
                          }
                        }
                        queryClient.invalidateQueries({ queryKey: ['sale-drafts'] });
                        queryClient.invalidateQueries({ queryKey: ['sales-list'] });
                        queryClient.invalidateQueries({ queryKey: ['sales-drafts-page'] });
                      }}
                      style={{
                        border: '1px solid #fed7aa',
                        background: '#fff7ed',
                        color: '#c2410c',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Delete All Drafts ({saleDrafts.length})
                    </button>
                  </div>
                  <table className="pos-table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th className="right">Total</th>
                        <th className="center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleDrafts.map((draft) => (
                        <tr key={draft.id}>
                          <td className="font-mono font-bold text-slate-800">{draft.invoiceNumber}</td>
                          <td className="text-slate-500">
                            {draft.invoiceDate ? new Date(draft.invoiceDate).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td>
                            <div className="font-semibold text-slate-800">{draft.customer?.name || 'Walk-in / Cash Sale'}</div>
                            {draft.customer?.phone && <div style={{ fontSize: '9px', color: '#7a8f89' }}>📞 {draft.customer.phone}</div>}
                          </td>
                          <td className="text-slate-600 font-semibold">{draft.items?.length || 0} items</td>
                          <td className="right font-bold text-slate-900">{money(draft.totalAmount)}</td>
                          <td className="center" style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => loadDraftIntoPos(draft)}
                              style={{
                                border: '1px solid #b7d6ce',
                                background: '#edf7f5',
                                color: '#007a70',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                borderRadius: '4px',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                marginRight: '6px'
                              }}
                            >
                              Resume
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this sales draft? This action cannot be undone.')) {
                                  deleteDraftMutation.mutate(draft.id);
                                }
                              }}
                              style={{
                                border: '1px solid #fecaca',
                                background: '#fff1f2',
                                color: '#e11d48',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                borderRadius: '4px',
                                padding: '3px 8px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div style={{
              padding: '10px 20px',
              borderTop: '1px solid #e2ece9',
              background: '#f8faf9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '11px', color: '#68827c' }}>Total Drafts: <b>{saleDrafts.length}</b></span>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                style={{
                  border: '1px solid #cadcd7',
                  background: '#fff',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dual-Mode Print Format Selection Modal */}
      <PrintFormatModal
        isOpen={showPrintFormatModal}
        onClose={() => setShowPrintFormatModal(false)}
        onSelectMode={handleSelectPrintMode}
      />
    </div>
  );
}
