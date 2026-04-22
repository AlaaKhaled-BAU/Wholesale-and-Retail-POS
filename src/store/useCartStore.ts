import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartData, PaymentDetails } from '../types';

interface CartState {
  items: CartItem[];
  customerId: string | null;
  customerName: string | null;
  invoiceDiscount: number;
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  addItem: (product: {
    id: string;
    nameAr: string;
    barcode: string;
    sellPrice: number;
    vatRate: number;
  }) => void;
  updateQty: (productId: string, qty: number) => void;
  updateDiscount: (productId: string, percent: number) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customerId: string | null, customerName?: string | null) => void;
  setInvoiceDiscount: (amount: number) => void;
  clearCart: () => void;
  getCartData: (paymentMethod: CartData['paymentMethod'], paymentDetails: PaymentDetails) => CartData;
}

const calculateLineTotal = (item: CartItem): number => {
  const discountedPrice = item.unitPrice * (1 - item.discountPercent / 100);
  return item.qty * discountedPrice;
};

const calculateTotals = (items: CartItem[], invoiceDiscount: number) => {
  const subtotal = items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const discountedSubtotal = Math.max(0, subtotal - invoiceDiscount);
  const totalVat = discountedSubtotal * 0.15; // 15% VAT
  const grandTotal = discountedSubtotal + totalVat;
  
  return { subtotal, totalVat, grandTotal };
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerId: null,
      customerName: null,
      invoiceDiscount: 0,
      subtotal: 0,
      totalVat: 0,
      grandTotal: 0,

      addItem: (product) => {
        const { items } = get();
        const existingItem = items.find((item) => item.productId === product.id);

        let newItems: CartItem[];
        if (existingItem) {
          newItems = items.map((item) =>
            item.productId === product.id
              ? { ...item, qty: item.qty + 1, lineTotal: calculateLineTotal({ ...item, qty: item.qty + 1 }) }
              : item
          );
        } else {
          const newItem: CartItem = {
            productId: product.id,
            name: product.nameAr,
            barcode: product.barcode,
            qty: 1,
            unitPrice: product.sellPrice,
            discountPercent: 0,
            vatRate: product.vatRate,
            lineTotal: product.sellPrice,
          };
          newItems = [...items, newItem];
        }

        const totals = calculateTotals(newItems, get().invoiceDiscount);
        set({ items: newItems, ...totals });
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }

        const { items, invoiceDiscount } = get();
        const newItems = items.map((item) =>
          item.productId === productId
            ? { ...item, qty, lineTotal: calculateLineTotal({ ...item, qty }) }
            : item
        );

        const totals = calculateTotals(newItems, invoiceDiscount);
        set({ items: newItems, ...totals });
      },

      updateDiscount: (productId, percent) => {
        const { items, invoiceDiscount } = get();
        const newItems = items.map((item) =>
          item.productId === productId
            ? { ...item, discountPercent: Math.max(0, Math.min(100, percent)), lineTotal: calculateLineTotal({ ...item, discountPercent: Math.max(0, Math.min(100, percent)) }) }
            : item
        );

        const totals = calculateTotals(newItems, invoiceDiscount);
        set({ items: newItems, ...totals });
      },

      removeItem: (productId) => {
        const { items, invoiceDiscount } = get();
        const newItems = items.filter((item) => item.productId !== productId);
        const totals = calculateTotals(newItems, invoiceDiscount);
        set({ items: newItems, ...totals });
      },

      setCustomer: (customerId, customerName) => {
        set({ customerId, customerName: customerName || null });
      },

      setInvoiceDiscount: (amount) => {
        const { items } = get();
        const totals = calculateTotals(items, amount);
        set({ invoiceDiscount: amount, ...totals });
      },

      clearCart: () => {
        set({
          items: [],
          customerId: null,
          customerName: null,
          invoiceDiscount: 0,
          subtotal: 0,
          totalVat: 0,
          grandTotal: 0,
        });
      },

      getCartData: (paymentMethod, paymentDetails) => {
        const { items, customerId, invoiceDiscount, subtotal, totalVat, grandTotal } = get();
        return {
          items,
          customerId,
          invoiceDiscount,
          subtotal,
          totalVat,
          grandTotal,
          paymentMethod,
          paymentDetails,
        };
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
