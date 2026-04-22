import { create } from 'zustand';
import type { Product, Category, ProductInput } from '../types';

interface ProductState {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;
  error: string | null;
  fetchProducts: (query?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  addProduct: (product: ProductInput) => Promise<void>;
  updateProduct: (id: string, product: ProductInput) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
}

// Mock data for development
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    barcode: '1234567890123',
    nameAr: 'تفاح أحمر',
    nameEn: 'Red Apple',
    categoryId: '1',
    categoryName: 'فواكه',
    unit: 'piece',
    sellPrice: 15.00,
    costPrice: 10.00,
    vatRate: 15,
    stockQty: 45,
    minStock: 10,
    isActive: true,
    priceTiers: [{ minQty: 10, unitPrice: 12.00 }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    barcode: '1234567890124',
    nameAr: 'موز',
    nameEn: 'Banana',
    categoryId: '1',
    categoryName: 'فواكه',
    unit: 'piece',
    sellPrice: 8.50,
    costPrice: 5.00,
    vatRate: 15,
    stockQty: 120,
    minStock: 20,
    isActive: true,
    priceTiers: [{ minQty: 20, unitPrice: 7.00 }],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const MOCK_CATEGORIES: Category[] = [
  { id: '1', name: 'فواكه', createdAt: '2026-01-01T00:00:00Z' },
  { id: '2', name: 'خضروات', createdAt: '2026-01-01T00:00:00Z' },
  { id: '3', name: 'مشروبات', createdAt: '2026-01-01T00:00:00Z' },
];

export const useProductStore = create<ProductState>((set, get) => ({
  products: MOCK_PRODUCTS,
  categories: MOCK_CATEGORIES,
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,
  error: null,

  fetchProducts: async (query?: string) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('get_products', { query })
      const { products } = get();
      let filtered = products;
      
      if (query) {
        filtered = products.filter(
          (p) =>
            p.nameAr.includes(query) ||
            p.barcode.includes(query) ||
            p.nameEn?.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      set({ products: filtered, isLoading: false });
    } catch (error) {
      set({ error: 'فشل في تحميل المنتجات', isLoading: false });
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('get_categories')
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'فشل في تحميل الفئات', isLoading: false });
    }
  },

  addProduct: async (product: ProductInput) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('create_product', { product })
      const newProduct: Product = {
        id: String(Date.now()),
        ...product,
        priceTiers: product.priceTiers || [],
        isActive: product.isActive ?? true,
        minStock: product.minStock || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      set((state) => ({
        products: [...state.products, newProduct],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في إضافة المنتج', isLoading: false });
    }
  },

  updateProduct: async (id: string, product: ProductInput) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('update_product', { id, product })
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id
            ? { ...p, ...product, updatedAt: new Date().toISOString() }
            : p
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في تحديث المنتج', isLoading: false });
    }
  },

  toggleActive: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('toggle_product_active', { id })
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, isActive: !p.isActive } : p
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في تغيير حالة المنتج', isLoading: false });
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedCategory: (categoryId: string | null) => {
    set({ selectedCategory: categoryId });
  },
}));
