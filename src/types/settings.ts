// ============================================================
// Settings types — aligned with Rust backend + frontend extras
// ============================================================

export interface AppSettings {
  vatRate: string;
  printerPort: string;
  printerType: string;
  branchNameAr: string;
  invoiceNote: string;
  numerals: 'western' | 'arabic';
  autoLockMinutes: string;
}

// ZATCA types
export interface ZatcaStatusInfo {
  registered: boolean;
  csidStatus: 'active' | 'expired' | 'not_registered';
  pendingCount: number;
  rejectedCount: number;
  urgentCount: number;
}

// Frontend compatibility aliases
export interface StoreInfo {
  nameAr: string;
  nameEn: string;
  logo?: string;
  address: string;
  vatNumber: string;
  crNumber: string;
}

export interface PrinterConfig {
  type: 'usb' | 'serial';
  port: string;
  paperWidth: 58 | 80;
  autoDetect: boolean;
}

export interface UserSettings {
  id: string;
  name: string;
  role: string;
  branchId: string;
  isActive: boolean;
}

export interface TaxSettings {
  defaultVatRate: number;
  categoryOverrides: { categoryId: string; rate: number }[];
}

export interface BarcodeSettings {
  scannerTimeout: number;
}

export interface ZATCASettings {
  csidStatus: 'active' | 'expired' | 'pending';
  deviceRegistered: boolean;
  pendingInvoices: number;
}

export interface FrontendAppSettings {
  storeInfo: StoreInfo;
  printer: PrinterConfig;
  tax: TaxSettings;
  barcode: BarcodeSettings;
  zatca: ZATCASettings;
}
