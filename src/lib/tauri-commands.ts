// ============================================================
// Tauri Command Wrappers — Backend-Frontend Compatibility Layer
// ============================================================
// This file bridges Dev A's frontend with Dev B's backend.
// All invoke() calls go through here.
//
// Strategy:
// 1. Expose same function signatures Dev A expects
// 2. Internally call backend commands with correct params
// 3. Transform responses to match Dev A's expected shapes
// ============================================================

import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '../store/useAuthStore';
import type {
  Product,
  ProductInput,
  Customer,
  CustomerInput,
  Invoice,
  AppSettings,
  SessionToken,
  NewInvoice,
  NewInvoiceLine,
  NewPayment,
  RefundLine,
  CartData,
  CartItem,
  DailySummary,
  DailySales,
  InventoryReportRow,
  SessionReport,
  ZatcaStatusInfo,
  CashierSession,
  Category,
  InventoryItem,
} from '../types';

// ============================================================
// Auth
// ============================================================

export const loginUser = async (pin: string): Promise<{ token: string; user: { id: string; name: string; role: string; branchId: string } }> => {
  const result = await invoke<SessionToken>('login_user', { pin });
  return {
    token: result.sessionId,
    user: {
      id: result.userId,
      name: result.nameAr,
      role: result.role,
      branchId: result.branchId,
    },
  };
};

export const logoutUser = (token: string) =>
  invoke<boolean>('logout_user', { token });

export const openCashierSession = (userId: string, openingFloat: number) =>
  invoke<string>('open_cashier_session', { userId, openingFloat });

export const closeCashierSession = (sessionId: string, closingCash: number, userId: string) =>
  invoke<void>('close_cashier_session', { sessionId, closingCash, userId });

export const getCurrentSession = (userId: string) =>
  invoke<CashierSession | null>('get_current_session', { userId });

// ============================================================
// Products
// ============================================================

// Default branchId for single-branch MVP
const DEFAULT_BRANCH_ID = 'BR1';

export const getProducts = (query?: string, categoryId?: string, _page = 1) =>
  invoke<Product[]>('get_products', { query: query || '', branchId: DEFAULT_BRANCH_ID, categoryId });

export const getProductByBarcode = (barcode: string) =>
  invoke<Product | null>('get_product_by_barcode', { barcode, branchId: DEFAULT_BRANCH_ID });

export const createProduct = (product: ProductInput) => {
  const { user, session } = useAuthStore.getState();
  if (!user?.id || !session?.token) throw new Error('No active session');
  const payload = {
    sku: product.barcode,
    barcode: product.barcode,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    categoryId: product.categoryId,
    unit: product.unit,
    costPrice: product.costPrice,
    sellPrice: product.sellPrice,
    vatRate: product.vatRate,
  };
  return invoke<Product>('create_product', { product: payload, branchId: DEFAULT_BRANCH_ID, cashierId: user.id, sessionId: session.token });
};

export const updateProduct = (id: string, product: ProductInput) => {
  const { user, session } = useAuthStore.getState();
  if (!user?.id || !session?.token) throw new Error('No active session');
  const payload = {
    sku: product.barcode,
    barcode: product.barcode,
    nameAr: product.nameAr,
    nameEn: product.nameEn,
    categoryId: product.categoryId,
    unit: product.unit,
    costPrice: product.costPrice,
    sellPrice: product.sellPrice,
    vatRate: product.vatRate,
  };
  return invoke<Product>('update_product', { id, product: payload, branchId: DEFAULT_BRANCH_ID, cashierId: user.id, sessionId: session.token });
};

export const toggleProductActive = (id: string) => {
  const { user, session } = useAuthStore.getState();
  if (!user?.id || !session?.token) throw new Error('No active session');
  return invoke<void>('toggle_product_active', { id, cashierId: user.id, sessionId: session.token });
};

export const getCategories = () =>
  invoke<Category[]>('get_categories');

export const createCategory = (nameAr: string, nameEn?: string) => {
  const { user, session } = useAuthStore.getState();
  if (!user?.id || !session?.token) throw new Error('No active session');
  return invoke<Category>('create_category', { nameAr, nameEn, cashierId: user.id, sessionId: session.token });
};

// ============================================================
// Inventory
// ============================================================

export const getInventory = () =>
  invoke<InventoryItem[]>('get_inventory', { branchId: DEFAULT_BRANCH_ID });

export const getInventoryReport = () =>
  invoke<InventoryReportRow[]>('get_inventory_report', { branchId: DEFAULT_BRANCH_ID });

export const adjustInventory = (productId: string, newQty: number, reason: string, _userId?: string) => {
  const { user, session } = useAuthStore.getState();
  if (!user?.id || !session?.token) throw new Error('No active session');
  return invoke<void>('adjust_inventory', { branchId: DEFAULT_BRANCH_ID, productId, newQty, reason, cashierId: user.id, sessionId: session.token });
};

// ============================================================
// Customers
// ============================================================

export const getCustomers = (query?: string) =>
  invoke<Customer[]>('get_customers', { query: query || '' });

export const createCustomer = (customer: CustomerInput) => {
  const payload = {
    nameAr: customer.nameAr,
    phone: customer.phone,
    vatNumber: customer.vatNumber,
    crNumber: customer.crNumber,
    creditLimit: customer.creditLimit,
    customerType: 'b2c' as const,
  };
  return invoke<Customer>('create_customer', { customer: payload });
};

export const updateCustomer = (id: string, customer: CustomerInput) => {
  const payload = {
    nameAr: customer.nameAr,
    phone: customer.phone,
    vatNumber: customer.vatNumber,
    crNumber: customer.crNumber,
    creditLimit: customer.creditLimit,
    customerType: 'b2c' as const,
  };
  return invoke<Customer>('update_customer', { id, data: payload });
};

export const addCustomerPayment = (customerId: string, amount: number, userId?: string) => {
  const { user } = useAuthStore.getState();
  const actualUserId = userId ?? user?.id;
  if (!actualUserId) throw new Error('No authenticated user');
  return invoke<void>('record_customer_payment', { customerId, amount, userId: actualUserId });
};

export const getCustomerInvoices = (customerId: string) =>
  invoke<Invoice[]>('get_customer_invoices', { customerId });

export const getCustomerBalance = (customerId: string) =>
  invoke<number>('get_customer_balance', { customerId });

// ============================================================
// Invoices
// ============================================================

function cartItemToNewLine(item: CartItem): NewInvoiceLine {
  const vatRate = 0.15;
  const base = item.unitPrice * item.qty * (1 - item.discountPercent / 100);
  const vatAmount = base * vatRate;
  const lineTotal = base + vatAmount;
  return {
    productId: item.productId,
    productNameAr: item.name,
    qty: item.qty,
    unitPrice: item.unitPrice,
    discountPct: item.discountPercent,
    vatRate,
    vatAmount,
    lineTotal,
  };
}

function paymentDetailsToPayments(details: CartData['paymentDetails'], grandTotal: number): NewPayment[] {
  const payments: NewPayment[] = [];
  if (details.cashAmount && details.cashAmount > 0) {
    payments.push({ method: 'cash', amount: details.cashAmount });
  }
  if (details.cardAmount && details.cardAmount > 0) {
    payments.push({ method: 'card', amount: details.cardAmount });
  }
  if (details.cliqReference) {
    payments.push({ method: 'cliq', amount: grandTotal, reference: details.cliqReference });
  }
  // Fallback: if no payments specified, assume cash for full amount
  if (payments.length === 0) {
    payments.push({ method: 'cash', amount: grandTotal });
  }
  return payments;
}

export const createInvoice = async (cartData: CartData): Promise<Invoice> => {
  const { user, session } = useAuthStore.getState();
  if (!user?.id || !session?.token) {
    throw new Error('No active session. Please log in.');
  }
  const sessionId = session.token;
  const cashierId = user.id;

  const lines = cartData.items.map(cartItemToNewLine);
  const payments = paymentDetailsToPayments(cartData.paymentDetails, cartData.grandTotal);

  const payload: NewInvoice = {
    branchId: DEFAULT_BRANCH_ID,
    branchPrefix: 'BR1',
    cashierId,
    sessionId,
    customerId: cartData.customerId || undefined,
    invoiceType: 'simplified',
    lines,
    payments,
    subtotal: cartData.subtotal,
    discountAmount: cartData.invoiceDiscount,
    vatAmount: cartData.totalVat,
    total: cartData.grandTotal,
  };

  return invoke<Invoice>('create_invoice', { payload });
};

export const createRefundInvoice = (originalInvoiceId: string, lines: { productId: string; qty: number }[]) => {
  // Need to fetch original invoice to get product details
  // For now, simplified — frontend should provide full refund lines
  const refundLines: RefundLine[] = lines.map(l => ({
    productId: l.productId,
    productNameAr: '', // Will be filled by backend
    qty: l.qty,
    unitPrice: 0, // Will be filled by backend
    vatRate: 0.15,
  }));
  return invoke<Invoice>('create_refund_invoice', { originalInvoiceId, lines: refundLines });
};

export const getInvoice = (invoiceNumber: string) =>
  invoke<Invoice | null>('get_invoice_by_number', { invoiceNumber });

export const getInvoiceById = (invoiceId: string) =>
  invoke<Invoice>('get_invoice', { invoiceId });

export const getInvoiceQr = (id: string) =>
  invoke<string>('get_invoice_qr', { invoiceId: id });

// ============================================================
// Reports
// ============================================================

export const getDailyReport = (date: string) =>
  invoke<DailySummary>('get_daily_summary', { branchId: DEFAULT_BRANCH_ID, date });

export const getPeriodReport = (from: string, to: string) =>
  invoke<DailySales[]>('get_sales_by_period', { branchId: DEFAULT_BRANCH_ID, fromDate: from, toDate: to });

export const getShiftReport = (sessionId: string) =>
  invoke<SessionReport>('get_cashier_session_report', { sessionId });

export const exportInvoicesCsv = (fromDate: string, toDate: string) =>
  invoke<string>('export_invoices_csv', { branchId: DEFAULT_BRANCH_ID, fromDate, toDate });

// ============================================================
// Settings
// ============================================================

export const getSettings = () =>
  invoke<AppSettings>('get_all_settings');

export const updateSettings = (settings: Partial<AppSettings>) => {
  // Update each changed setting individually
  const promises: Promise<void>[] = [];
  Object.entries(settings).forEach(([key, value]) => {
    if (value !== undefined) {
      promises.push(invoke<void>('set_setting', { key, value: String(value) }));
    }
  });
  return Promise.all(promises).then(() => invoke<AppSettings>('get_all_settings'));
};

export const getSetting = (key: string) =>
  invoke<string | null>('get_setting', { key });

export const setSetting = (key: string, value: string) =>
  invoke<void>('set_setting', { key, value });

// ============================================================
// Printer
// ============================================================

export const printReceipt = (invoiceId: string) =>
  invoke<void>('print_receipt', { invoiceId });

export const printTestPage = () =>
  invoke<void>('print_test_page');

export const getAvailablePorts = () =>
  invoke<string[]>('get_available_ports');

// ============================================================
// Scanner
// ============================================================

export const checkScannerConnected = () =>
  Promise.resolve({ connected: false }); // No hardware check in MVP

// ============================================================
// ZATCA
// ============================================================

export const registerZatcaDevice = (otp: string) =>
  invoke<void>('register_zatca_device', { otp });

export const getZatcaStatus = () =>
  invoke<ZatcaStatusInfo>('get_zatca_status');

export const retryZatcaQueue = () =>
  invoke<void>('retry_zatca_queue');

// ============================================================
// Demo / Seed
// ============================================================

export const seedDemoData = () =>
  invoke<void>('seed_demo_data');

// ============================================================
// First-Run Setup
// ============================================================

interface SetupPayload {
  branchNameAr: string;
  vatNumber?: string;
  crNumber?: string;
  address?: string;
  adminName: string;
  adminPin: string;
  branchPrefix: string;
}

export const completeSetup = (payload: SetupPayload) =>
  invoke<void>('complete_setup', { payload });
