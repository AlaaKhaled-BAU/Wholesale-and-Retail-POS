// ============================================================
// Customer types — aligned with Rust backend
// ============================================================

export interface Customer {
  id: string;
  nameAr: string;
  nameEn?: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit: number;
  balance: number;
  customerType: 'b2c' | 'b2b';
  address?: string;
  createdAt: string;
}

export interface NewCustomer {
  nameAr: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit?: number;
  customerType: 'b2c' | 'b2b';
}

// Frontend compatibility alias
export interface CustomerInput {
  nameAr: string;
  nameEn?: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit?: number;
  address?: string;
}
