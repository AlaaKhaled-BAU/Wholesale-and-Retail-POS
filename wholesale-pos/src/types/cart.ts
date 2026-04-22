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

export interface PaymentDetails {
  cashAmount?: number;
  cardAmount?: number;
  cliqReference?: string;
  change?: number;
}
