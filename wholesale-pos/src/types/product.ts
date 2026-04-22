export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface PriceTier {
  minQty: number;
  unitPrice: number;
}

export interface Product {
  id: string;
  barcode: string;
  nameAr: string;
  nameEn?: string;
  categoryId: string;
  categoryName?: string;
  unit: 'piece' | 'carton' | 'pallet';
  sellPrice: number;
  costPrice: number;
  vatRate: number;
  stockQty: number;
  minStock: number;
  isActive: boolean;
  priceTiers: PriceTier[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  barcode: string;
  nameAr: string;
  nameEn?: string;
  categoryId: string;
  unit: 'piece' | 'carton' | 'pallet';
  sellPrice: number;
  costPrice: number;
  vatRate: number;
  stockQty: number;
  minStock?: number;
  isActive?: boolean;
  priceTiers?: PriceTier[];
}
