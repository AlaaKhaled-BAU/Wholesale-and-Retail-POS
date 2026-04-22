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

export interface AppSettings {
  storeInfo: StoreInfo;
  printer: PrinterConfig;
  tax: TaxSettings;
  barcode: BarcodeSettings;
  zatca: ZATCASettings;
}
