// ============================================================
// Product & Category types — aligned with Rust backend
// ============================================================

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
  stockQty?: number;
  minStock?: number;
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

// Frontend compatibility alias
export interface ProductInput {
  barcode: string;
  nameAr: string;
  nameEn?: string;
  categoryId: string;
  unit: string;
  sellPrice: number;
  costPrice: number;
  vatRate: number;
  stockQty: number;
  minStock?: number;
  isActive?: boolean;
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
