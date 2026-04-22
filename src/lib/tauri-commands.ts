import { invoke } from '@tauri-apps/api/core';
import type {
  Product,
  Invoice,
  Customer,
  User,
  SessionToken,
  Category,
  InventoryItem,
  CashierSession,
  NewProduct,
  NewCustomer,
  NewInvoice,
  DailySummary,
  DailySales,
  InventoryReportRow,
  SessionReport,
  ZatcaStatusInfo,
  AppSettings,
} from '../types';

// ============================================================
// Auth (Phase 1)
// ============================================================
export const loginUser = (pin: string) =>
  invoke<SessionToken>('login_user', { pin });

export const openCashierSession = (userId: string, openingFloat: number) =>
  invoke<string>('open_cashier_session', { userId, openingFloat });

export const closeCashierSession = (sessionId: string, closingCash: number, userId: string) =>
  invoke<void>('close_cashier_session', { sessionId, closingCash, userId });

export const getCurrentSession = (userId: string) =>
  invoke<CashierSession | null>('get_current_session', { userId });

// ============================================================
// Products (Phase 2)
// ============================================================
export const getProducts = (query: string, branchId: string, categoryId?: string) =>
  invoke<Product[]>('get_products', { query, branchId, categoryId });

export const getProductByBarcode = (barcode: string, branchId: string) =>
  invoke<Product | null>('get_product_by_barcode', { barcode, branchId });

export const createProduct = (product: NewProduct, branchId: string) =>
  invoke<Product>('create_product', { product, branchId });

export const updateProduct = (id: string, product: Partial<NewProduct>, branchId: string) =>
  invoke<Product>('update_product', { id, product, branchId });

export const toggleProductActive = (id: string) =>
  invoke<void>('toggle_product_active', { id });

export const getCategories = () =>
  invoke<Category[]>('get_categories');

export const createCategory = (nameAr: string, nameEn?: string) =>
  invoke<Category>('create_category', { nameAr, nameEn });

// ============================================================
// Inventory (Phase 2)
// ============================================================
export const getInventory = (branchId: string) =>
  invoke<InventoryItem[]>('get_inventory', { branchId });

export const adjustInventory = (
  branchId: string,
  productId: string,
  newQty: number,
  reason: string,
  userId: string
) =>
  invoke<void>('adjust_inventory', { branchId, productId, newQty, reason, userId });

export const getInventoryByProduct = (branchId: string, productId: string) =>
  invoke<InventoryItem>('get_inventory_by_product', { branchId, productId });

// ============================================================
// Invoices (Phase 3)
// ============================================================
export const createInvoice = (payload: NewInvoice) =>
  invoke<Invoice>('create_invoice', { payload });

export const getInvoice = (invoiceId: string) =>
  invoke<Invoice>('get_invoice', { invoiceId });

export const getInvoiceByNumber = (invoiceNumber: string) =>
  invoke<Invoice | null>('get_invoice_by_number', { invoiceNumber });

export const createRefundInvoice = (originalInvoiceId: string, lines: any[]) =>
  invoke<Invoice>('create_refund_invoice', { originalInvoiceId, lines });

// ============================================================
// Printing (Phase 3)
// ============================================================
export const printReceipt = (invoiceId: string) =>
  invoke<void>('print_receipt', { invoiceId });

export const printTestPage = () =>
  invoke<void>('print_test_page');

export const getAvailablePorts = () =>
  invoke<string[]>('get_available_ports');

export const getInvoiceQr = (invoiceId: string) =>
  invoke<string>('get_invoice_qr', { invoiceId });

// ============================================================
// Customers (Phase 4)
// ============================================================
export const getCustomers = (query: string) =>
  invoke<Customer[]>('get_customers', { query });

export const createCustomer = (customer: NewCustomer) =>
  invoke<Customer>('create_customer', { customer });

export const updateCustomer = (id: string, data: Partial<NewCustomer>) =>
  invoke<Customer>('update_customer', { id, data });

export const getCustomerInvoices = (customerId: string) =>
  invoke<Invoice[]>('get_customer_invoices', { customerId });

export const getCustomerBalance = (customerId: string) =>
  invoke<number>('get_customer_balance', { customerId });

export const recordCustomerPayment = (customerId: string, amount: number, userId: string) =>
  invoke<void>('record_customer_payment', { customerId, amount, userId });

// ============================================================
// Reports (Phase 5)
// ============================================================
export const getDailySummary = (branchId: string, date: string) =>
  invoke<DailySummary>('get_daily_summary', { branchId, date });

export const getSalesByPeriod = (branchId: string, fromDate: string, toDate: string) =>
  invoke<DailySales[]>('get_sales_by_period', { branchId, fromDate, toDate });

export const getInventoryReport = (branchId: string) =>
  invoke<InventoryReportRow[]>('get_inventory_report', { branchId });

export const getCashierSessionReport = (sessionId: string) =>
  invoke<SessionReport>('get_cashier_session_report', { sessionId });

export const exportInvoicesCsv = (branchId: string, fromDate: string, toDate: string) =>
  invoke<string>('export_invoices_csv', { branchId, fromDate, toDate });

// ============================================================
// ZATCA (Phase 6)
// ============================================================
export const registerZatcaDevice = (otp: string) =>
  invoke<void>('register_zatca_device', { otp });

export const getZatcaStatus = () =>
  invoke<ZatcaStatusInfo>('get_zatca_status');

export const retryZatcaQueue = () =>
  invoke<void>('retry_zatca_queue');

// ============================================================
// Settings (Phase 7)
// ============================================================
export const getSetting = (key: string) =>
  invoke<string | null>('get_setting', { key });

export const setSetting = (key: string, value: string) =>
  invoke<void>('set_setting', { key, value });

export const getAllSettings = () =>
  invoke<AppSettings>('get_all_settings');

// ============================================================
// Demo (Phase 8)
// ============================================================
export const seedDemoData = () =>
  invoke<void>('seed_demo_data');
