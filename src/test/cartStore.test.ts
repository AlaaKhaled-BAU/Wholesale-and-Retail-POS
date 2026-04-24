import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../store/useCartStore';

const createProduct = (overrides = {}) => ({
  id: 'PRD-001',
  nameAr: 'أرز بسمتي',
  barcode: '6281035931206',
  sellPrice: 45.0,
  vatRate: 0.15,
  ...overrides,
});

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  describe('addItem', () => {
    it('adds a new item to empty cart', () => {
      useCartStore.getState().addItem(createProduct());
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].productId).toBe('PRD-001');
      expect(useCartStore.getState().items[0].qty).toBe(1);
    });

    it('increments quantity when adding existing product', () => {
      const store = useCartStore.getState();
      store.addItem(createProduct());
      store.addItem(createProduct());
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].qty).toBe(2);
    });

    it('updates cart totals after adding item', () => {
      useCartStore.getState().addItem(createProduct({ sellPrice: 100 }));
      expect(useCartStore.getState().subtotal).toBe(100);
      expect(useCartStore.getState().totalVat).toBe(15);
      expect(useCartStore.getState().grandTotal).toBe(115);
    });
  });

  describe('updateQty', () => {
    it('removes item when qty set to 0', () => {
      useCartStore.getState().addItem(createProduct());
      useCartStore.getState().updateQty('PRD-001', 0);
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it('updates item quantity', () => {
      useCartStore.getState().addItem(createProduct());
      useCartStore.getState().updateQty('PRD-001', 5);
      expect(useCartStore.getState().items[0].qty).toBe(5);
      expect(useCartStore.getState().subtotal).toBe(225);
    });
  });

  describe('removeItem', () => {
    it('removes item from cart', () => {
      useCartStore.getState().addItem(createProduct({ id: 'PRD-001' }));
      useCartStore.getState().addItem(createProduct({ id: 'PRD-002' }));
      useCartStore.getState().removeItem('PRD-001');
      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].productId).toBe('PRD-002');
    });

    it('recalculates totals after removal', () => {
      useCartStore.getState().addItem(createProduct({ id: 'PRD-001', sellPrice: 100 }));
      useCartStore.getState().addItem(createProduct({ id: 'PRD-002', sellPrice: 50 }));
      useCartStore.getState().removeItem('PRD-001');
      expect(useCartStore.getState().subtotal).toBe(50);
    });
  });

  describe('invoice discount', () => {
    it('applies invoice discount to subtotal', () => {
      useCartStore.getState().addItem(createProduct({ sellPrice: 100 }));
      useCartStore.getState().setInvoiceDiscount(10);
      const { subtotal, totalVat, grandTotal } = useCartStore.getState();
      expect(subtotal).toBe(100);
      expect(totalVat).toBe(13.5);
      expect(grandTotal).toBe(103.5);
    });

    it('prevents negative grand total', () => {
      useCartStore.getState().addItem(createProduct({ sellPrice: 5 }));
      useCartStore.getState().setInvoiceDiscount(100);
      expect(useCartStore.getState().grandTotal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clearCart', () => {
    it('resets all state', () => {
      useCartStore.getState().addItem(createProduct());
      useCartStore.getState().setInvoiceDiscount(10);
      useCartStore.getState().clearCart();
      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.invoiceDiscount).toBe(0);
      expect(state.subtotal).toBe(0);
      expect(state.grandTotal).toBe(0);
    });
  });

  describe('getCartData', () => {
    it('returns current cart state', () => {
      useCartStore.getState().addItem(createProduct({ sellPrice: 100 }));
      useCartStore.getState().setInvoiceDiscount(5);
      const cartData = useCartStore.getState().getCartData('cash', { cashAmount: 115 });
      expect(cartData.subtotal).toBe(100);
      expect(cartData.invoiceDiscount).toBe(5);
      expect(cartData.grandTotal).toBe(109.25);
      expect(cartData.paymentMethod).toBe('cash');
    });
  });

  describe('VAT calculation', () => {
    it('calculates 15% VAT correctly', () => {
      useCartStore.getState().addItem(createProduct({ sellPrice: 200 }));
      expect(useCartStore.getState().totalVat).toBe(30);
      expect(useCartStore.getState().grandTotal).toBe(230);
    });

    it('applies per-product discount before VAT', () => {
      useCartStore.getState().addItem(createProduct({ sellPrice: 100 }));
      useCartStore.getState().updateDiscount('PRD-001', 10);
      expect(useCartStore.getState().subtotal).toBe(90);
      expect(useCartStore.getState().totalVat).toBe(13.5);
    });
  });
});