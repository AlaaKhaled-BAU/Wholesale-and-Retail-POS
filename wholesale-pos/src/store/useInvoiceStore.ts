import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Invoice, SuspendedCart } from '../types';

interface InvoiceState {
  invoices: Invoice[];
  suspendedCarts: SuspendedCart[];
  currentInvoice: Invoice | null;
  isLoading: boolean;
  error: string | null;
  suspendCart: (label: string, cartData: {
    items: import('../types').CartItem[];
    customerId: string | null;
    invoiceDiscount: number;
    subtotal: number;
    totalVat: number;
    grandTotal: number;
  }) => void;
  restoreCart: (id: string) => SuspendedCart | null;
  deleteSuspended: (id: string) => void;
  createInvoice: (cartData: import('../types').CartData) => Promise<Invoice | null>;
}

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: [],
      suspendedCarts: [],
      currentInvoice: null,
      isLoading: false,
      error: null,

      suspendCart: (label, cartData) => {
        const { suspendedCarts } = get();
        if (suspendedCarts.length >= 5) {
          set({ error: 'الحد الأقصى 5 فواتير معلقة' });
          return;
        }

        const suspended: SuspendedCart = {
          id: `suspended-${Date.now()}`,
          label,
          items: cartData.items,
          customerId: cartData.customerId,
          customerName: null,
          invoiceDiscount: cartData.invoiceDiscount,
          subtotal: cartData.subtotal,
          totalVat: cartData.totalVat,
          grandTotal: cartData.grandTotal,
          itemCount: cartData.items.length,
          createdAt: new Date().toISOString(),
        };

        set({
          suspendedCarts: [...suspendedCarts, suspended],
          error: null,
        });
      },

      restoreCart: (id) => {
        const { suspendedCarts } = get();
        const cart = suspendedCarts.find((c) => c.id === id);
        if (cart) {
          set({
            suspendedCarts: suspendedCarts.filter((c) => c.id !== id),
          });
        }
        return cart || null;
      },

      deleteSuspended: (id) => {
        set((state) => ({
          suspendedCarts: state.suspendedCarts.filter((c) => c.id !== id),
        }));
      },

      createInvoice: async (cartData) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual Tauri invoke('create_invoice', { cartData })
          const invoice: Invoice = {
            id: `inv-${Date.now()}`,
            uuid: `uuid-${Date.now()}`,
            invoiceNumber: `INV-${String(get().invoices.length + 1).padStart(5, '0')}`,
            branchId: '1',
            cashierId: '1',
            customerId: cartData.customerId,
            type: cartData.customerId ? 'standard' : 'simplified',
            status: 'draft',
            subtotal: cartData.subtotal,
            discount: cartData.invoiceDiscount,
            vatTotal: cartData.totalVat,
            total: cartData.grandTotal,
            paymentMethod: cartData.paymentMethod,
            lines: cartData.items.map((item, index) => ({
              id: `line-${index}`,
              productId: item.productId,
              productName: item.name,
              qty: item.qty,
              unitPrice: item.unitPrice,
              discount: item.discountPercent,
              vatAmount: item.lineTotal * (item.vatRate / 100),
              lineTotal: item.lineTotal,
            })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set((state) => ({
            invoices: [...state.invoices, invoice],
            currentInvoice: invoice,
            isLoading: false,
          }));

          return invoice;
        } catch (error) {
          set({ error: 'فشل في إنشاء الفاتورة', isLoading: false });
          return null;
        }
      },
    }),
    {
      name: 'invoice-storage',
      partialize: (state) => ({
        invoices: state.invoices,
        suspendedCarts: state.suspendedCarts,
      }),
    }
  )
);
