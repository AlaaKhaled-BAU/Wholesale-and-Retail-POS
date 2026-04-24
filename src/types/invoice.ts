// ============================================================
// Invoice types — aligned with Rust backend
// ============================================================

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

// Invoice creation payload
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

// Frontend cart types (Dev A specific)
export interface CartItem {
  productId: string;
  name: string;
  barcode: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  vatRate: number;
  lineTotal: number;
}

export interface PaymentDetails {
  cashAmount?: number;
  cardAmount?: number;
  cliqReference?: string;
  change?: number;
}

export interface CartData {
  items: CartItem[];
  customerId: string | null;
  invoiceDiscount: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  paymentMethod: 'cash' | 'card' | 'cliq' | 'mixed';
  paymentDetails: PaymentDetails;
}

export interface SuspendedCart {
  id: string;
  label: string;
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  invoiceDiscount: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  itemCount: number;
  createdAt: string;
}
