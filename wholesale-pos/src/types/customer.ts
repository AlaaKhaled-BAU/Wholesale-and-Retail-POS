export interface Customer {
  id: string;
  nameAr: string;
  nameEn?: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit: number;
  balance: number;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerInput {
  nameAr: string;
  nameEn?: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  creditLimit?: number;
  address?: string;
}
