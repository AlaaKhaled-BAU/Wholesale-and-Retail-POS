// ============================================================
// Core entities — must match Rust structs in src-tauri/src/
// ============================================================

export interface Branch {
  id: string;
  nameAr: string;
  nameEn?: string;
  address?: string;
  vatNumber?: string;
  crNumber?: string;
  createdAt: string;
}

export interface User {
  id: string;
  branchId: string;
  nameAr: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  createdAt: string;
}

export interface SessionToken {
  userId: string;
  nameAr: string;
  role: 'admin' | 'manager' | 'cashier';
  branchId: string;
  sessionId: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn?: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  categoryId?: string;
  categoryName?: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  vatRate: number;
  isActive: boolean;
  stock?: number;
  createdAt: string;
}

export interface NewProduct {
  sku?: string;
  barcode?: string;
  nameAr: string;
  nameEn?: string;
  categoryId?: string;
  unit?: string;
  costPrice?: number;
  sellPrice: number;
  vatRate?: number;
}

export interface InventoryItem {
  id: string;
  branchId: string;
  productId: string;
  productNameAr: string;
  sku: string;
  barcode?: string;
  qtyOnHand: number;
  lowStockThreshold: number;
  stockValue: number;
  isLowStock: boolean;
  lastUpdated: string;
}

export interface Customer {
  id: string;
  nameAr: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit: number;
  balance: number;
  customerType: 'b2c' | 'b2b';
  createdAt: string;
}

export interface NewCustomer {
  nameAr: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit?: number;
  customerType: 'b2c' | 'b2b';
}

export interface CashierSession {
  id: string;
  userId: string;
  branchId: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  closingCash?: number;
  status: 'open' | 'closed';
}

export interface Invoice {
  id: string;
  uuid: string;
  branchId: string;
  sessionId: string;
  cashierId: string;
  customerId?: string;
  customerNameAr?: string;
  invoiceNumber: string;
  invoiceType: 'simplified' | 'standard' | 'credit_note';
  status: 'draft' | 'confirmed' | 'cancelled';
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  zatcaStatus: 'pending' | 'reported' | 'rejected' | 'not_required';
  qrCode?: string;
  lines?: InvoiceLine[];
  payments?: Payment[];
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  productId: string;
  productNameAr: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  method: 'cash' | 'card' | 'cliq';
  amount: number;
  reference?: string;
  paidAt: string;
}

// ============================================================
// Invoice creation payload (sent from React to Rust)
// ============================================================

export interface NewInvoiceLine {
  productId: string;
  productNameAr: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
}

export interface NewPayment {
  method: 'cash' | 'card' | 'cliq';
  amount: number;
  reference?: string;
}

export interface NewInvoice {
  branchId: string;
  branchPrefix: string;
  cashierId: string;
  sessionId: string;
  customerId?: string;
  invoiceType: 'simplified' | 'standard';
  lines: NewInvoiceLine[];
  payments: NewPayment[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  notes?: string;
}

export interface RefundLine {
  productId: string;
  productNameAr: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
}

// ============================================================
// Report types
// ============================================================

export interface DailySummary {
  date: string;
  invoiceCount: number;
  totalSales: number;
  totalVat: number;
  grandTotal: number;
  byPaymentMethod: {
    cash: number;
    card: number;
    cliq: number;
  };
  topProducts: Array<{
    nameAr: string;
    qtySold: number;
    revenue: number;
  }>;
}

export interface DailySales {
  saleDate: string;
  invoiceCount: number;
  totalSales: number;
  totalVat: number;
}

export interface InventoryReportRow {
  productId: string;
  nameAr: string;
  sku: string;
  qtyOnHand: number;
  lowStockThreshold: number;
  stockValue: number;
  isLowStock: boolean;
}

export interface SessionReport {
  session: CashierSession;
  invoiceCount: number;
  totalSales: number;
  byPaymentMethod: { cash: number; card: number; cliq: number; };
  expectedCash: number;
  discrepancy: number;
}

// ============================================================
// ZATCA types
// ============================================================

export interface ZatcaStatusInfo {
  registered: boolean;
  csidStatus: 'active' | 'expired' | 'not_registered';
  pendingCount: number;
  rejectedCount: number;
  urgentCount: number;
}

// ============================================================
// Settings
// ============================================================

export interface AppSettings {
  vatRate: string;
  printerPort: string;
  printerType: string;
  branchNameAr: string;
  invoiceNote: string;
  numerals: 'western' | 'arabic';
  autoLockMinutes: string;
}
