export interface InvoiceLine {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  discount: number;
  vatAmount: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  uuid: string;
  invoiceNumber: string;
  branchId: string;
  cashierId: string;
  customerId: string | null;
  customerName?: string;
  type: 'standard' | 'simplified';
  status: 'draft' | 'cleared' | 'pending' | 'rejected';
  subtotal: number;
  discount: number;
  vatTotal: number;
  total: number;
  paymentMethod: string;
  lines: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
}

export interface SuspendedCart {
  id: string;
  label: string;
  items: import('./cart').CartItem[];
  customerId: string | null;
  invoiceDiscount: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  itemCount: number;
  createdAt: string;
}
