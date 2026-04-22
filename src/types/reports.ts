// ============================================================
// Report types — aligned with Rust backend + frontend extras
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
  session: import('./user').CashierSession;
  invoiceCount: number;
  totalSales: number;
  byPaymentMethod: { cash: number; card: number; cliq: number };
  expectedCash: number;
  discrepancy: number;
}

// Frontend compatibility aliases
export interface DailyReportData {
  date: string;
  totalSales: number;
  totalInvoices: number;
  avgInvoice: number;
  totalVat: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    cliq: number;
    mixed: number;
  };
  topProducts: {
    name: string;
    qty: number;
    revenue: number;
  }[];
}

export interface InventoryReportData {
  totalStockValue: number;
  totalItems: number;
  lowStockItems: {
    id: string;
    name: string;
    barcode: string;
    currentStock: number;
    minStock: number;
    category: string;
  }[];
  categoryBreakdown: {
    category: string;
    itemCount: number;
    stockValue: number;
  }[];
}

export interface PeriodReportData {
  from: string;
  to: string;
  dailySales: {
    date: string;
    sales: number;
    invoices: number;
  }[];
  totalSales: number;
  totalVat: number;
  totalInvoices: number;
}

export interface ShiftReportData {
  sessionId: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  totalSales: number;
  totalInvoices: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    cliq: number;
    mixed: number;
  };
  expectedCash: number;
  actualCash?: number;
  discrepancy?: number;
}
