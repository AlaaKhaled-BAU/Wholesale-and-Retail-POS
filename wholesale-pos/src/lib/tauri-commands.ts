// Centralized Tauri command wrappers
// All invoke() calls go through here — never call invoke() directly in components

import { invoke } from '@tauri-apps/api/core';
import type { Product, ProductInput, Customer, CustomerInput, Invoice, AppSettings } from '../types';

// ─── Auth ───────────────────────────────────────────────

export const loginUser = (pin: string) =>
  invoke<{ token: string; user: { id: string; name: string; role: string; branchId: string } }>('login_user', { pin });

export const logoutUser = (token: string) =>
  invoke<boolean>('logout_user', { token });

// ─── Products ───────────────────────────────────────────

export const getProducts = (query?: string, categoryId?: string, page = 1) =>
  invoke<Product[]>('get_products', { query, categoryId, page });

export const getProductByBarcode = (barcode: string) =>
  invoke<Product>('get_product_by_barcode', { barcode });

export const createProduct = (product: ProductInput) =>
  invoke<Product>('create_product', { product });

export const updateProduct = (id: string, product: ProductInput) =>
  invoke<Product>('update_product', { id, product });

export const toggleProductActive = (id: string) =>
  invoke<Product>('toggle_product_active', { id });

export const getCategories = () =>
  invoke<{ id: string; name: string }[]>('get_categories');

// ─── Customers ──────────────────────────────────────────

export const getCustomers = (query?: string) =>
  invoke<Customer[]>('get_customers', { query });

export const createCustomer = (customer: CustomerInput) =>
  invoke<Customer>('create_customer', { customer });

export const updateCustomer = (id: string, customer: CustomerInput) =>
  invoke<Customer>('update_customer', { id, customer });

export const addCustomerPayment = (customerId: string, amount: number) =>
  invoke<Customer>('add_customer_payment', { customerId, amount });

// ─── Invoices ───────────────────────────────────────────

export const createInvoice = (cartData: {
  items: { productId: string; qty: number; unitPrice: number; discountPercent: number }[];
  customerId: string | null;
  invoiceDiscount: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  paymentMethod: string;
  paymentDetails: { cashAmount?: number; cardAmount?: number; cliqReference?: string };
}) => invoke<Invoice>('create_invoice', { cartData });

export const createRefundInvoice = (originalInvoiceId: string, lines: { productId: string; qty: number }[]) =>
  invoke<Invoice>('create_refund_invoice', { originalInvoiceId, lines });

export const getInvoice = (invoiceNumber: string) =>
  invoke<Invoice>('get_invoice', { invoiceNumber });

export const getInvoiceQr = (id: string) =>
  invoke<string>('get_invoice_qr', { id });

// ─── Reports ────────────────────────────────────────────

export const getDailyReport = (date: string) =>
  invoke<unknown>('get_daily_report', { date });

export const getInventoryReport = () =>
  invoke<unknown>('get_inventory_report');

export const getPeriodReport = (from: string, to: string) =>
  invoke<unknown>('get_period_report', { from, to });

export const getShiftReport = (sessionId: string) =>
  invoke<unknown>('get_shift_report', { sessionId });

// ─── Settings ───────────────────────────────────────────

export const getSettings = () =>
  invoke<AppSettings>('get_settings');

export const updateSettings = (settings: Partial<AppSettings>) =>
  invoke<AppSettings>('update_settings', { settings });

// ─── Printer ────────────────────────────────────────────

export const printReceipt = (invoiceId: string) =>
  invoke<boolean>('print_receipt', { invoiceId });

export const printTestPage = () =>
  invoke<boolean>('print_test_page');

export const getAvailablePorts = () =>
  invoke<string[]>('get_available_ports');

// ─── ZATCA ──────────────────────────────────────────────

export const registerZatcaDevice = () =>
  invoke<{ status: string }>('register_zatca_device');

export const retryZatcaQueue = () =>
  invoke<{ processed: number }>('retry_zatca_queue');
