import { create } from 'zustand';
import type { Product, Category, ProductInput } from '../types';
import {
  getProducts,
  getProductByBarcode,
  getCategories,
  createProduct as createProductCmd,
  updateProduct as updateProductCmd,
  toggleProductActive as toggleProductActiveCmd,
} from '../lib/tauri-commands';

interface ProductState {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  selectedCategory: string | null;
  isLoading: boolean;
  error: string | null;
  fetchProducts: (query?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  searchByBarcode: (barcode: string) => Promise<Product | null>;
  addProduct: (product: ProductInput) => Promise<void>;
  updateProduct: (id: string, product: ProductInput) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  searchQuery: '',
  selectedCategory: null,
  isLoading: false,
  error: null,

  fetchProducts: async (query?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getProducts(query, get().selectedCategory || undefined);
      set({ products: data, isLoading: false });
    } catch (error) {
      set({ error: 'فشل في تحميل المنتجات', isLoading: false });
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getCategories();
      set({ categories: data, isLoading: false });
    } catch (error) {
      set({ error: 'فشل في تحميل الفئات', isLoading: false });
    }
  },

  searchByBarcode: async (barcode: string) => {
    try {
      return await getProductByBarcode(barcode);
    } catch (error) {
      return null;
    }
  },

  addProduct: async (product: ProductInput) => {
    set({ isLoading: true, error: null });
    try {
      const newProduct = await createProductCmd(product);
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
      const updated = await updateProductCmd(id, product);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updated : p)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في تحديث المنتج', isLoading: false });
    }
  },

  toggleActive: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await toggleProductActiveCmd(id);
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
