import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, FrontendAppSettings } from '../types';
import { getSettings, updateSettings } from '../lib/tauri-commands';

const DEFAULT_FRONTEND_SETTINGS: FrontendAppSettings = {
  storeInfo: {
    nameAr: 'متجر الجملة',
    nameEn: 'Wholesale Store',
    address: 'الرياض، المملكة العربية السعودية',
    vatNumber: '3111111111',
    crNumber: '1010123456',
  },
  printer: {
    type: 'usb',
    port: 'COM1',
    paperWidth: 80,
    autoDetect: true,
  },
  tax: {
    defaultVatRate: 15,
    categoryOverrides: [],
  },
  barcode: {
    scannerTimeout: 200,
  },
  zatca: {
    csidStatus: 'pending',
    deviceRegistered: false,
    pendingInvoices: 0,
  },
};

const DEFAULT_BACKEND_SETTINGS: AppSettings = {
  vatRate: '0.15',
  printerPort: '',
  printerType: 'usb',
  branchNameAr: 'الفرع الرئيسي',
  invoiceNote: 'شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة',
  numerals: 'western',
  autoLockMinutes: '5',
};

interface SettingsState extends FrontendAppSettings {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  darkMode: boolean;
  toggleDarkMode: () => void;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateStoreInfo: (storeInfo: Partial<FrontendAppSettings['storeInfo']>) => void;
  updatePrinter: (printer: Partial<FrontendAppSettings['printer']>) => void;
  updateTax: (tax: Partial<FrontendAppSettings['tax']>) => void;
  updateBarcode: (barcode: Partial<FrontendAppSettings['barcode']>) => void;
  updateZATCA: (zatca: Partial<FrontendAppSettings['zatca']>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_FRONTEND_SETTINGS,
      settings: DEFAULT_BACKEND_SETTINGS,
      isLoading: false,
      error: null,
      darkMode: false,

      toggleDarkMode: () => {
        set((state) => {
          const next = !state.darkMode;
          if (next) document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
          return { darkMode: next };
        });
      },

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await getSettings();
          set({ settings: data, isLoading: false });
        } catch (error) {
          // Fallback to defaults if backend not ready
          set({ settings: DEFAULT_BACKEND_SETTINGS, isLoading: false });
        }
      },

      saveSettings: async (newSettings: Partial<AppSettings>) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await updateSettings(newSettings);
          set({ settings: updated, isLoading: false });
        } catch (error) {
          // Optimistically update local state
          set((state) => ({
            settings: state.settings ? { ...state.settings, ...newSettings } : DEFAULT_BACKEND_SETTINGS,
            isLoading: false,
          }));
        }
      },

      updateStoreInfo: (storeInfo) => {
        set((state) => ({
          storeInfo: { ...state.storeInfo, ...storeInfo },
        }));
      },

      updatePrinter: (printer) => {
        set((state) => ({
          printer: { ...state.printer, ...printer },
        }));
      },

      updateTax: (tax) => {
        set((state) => ({
          tax: { ...state.tax, ...tax },
        }));
      },

      updateBarcode: (barcode) => {
        set((state) => ({
          barcode: { ...state.barcode, ...barcode },
        }));
      },

      updateZATCA: (zatca) => {
        set((state) => ({
          zatca: { ...state.zatca, ...zatca },
        }));
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        storeInfo: state.storeInfo,
        printer: state.printer,
        tax: state.tax,
        barcode: state.barcode,
        zatca: state.zatca,
        settings: state.settings,
        darkMode: state.darkMode,
      }),
    }
  )
);
