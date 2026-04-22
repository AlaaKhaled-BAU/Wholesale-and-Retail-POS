import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
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

interface SettingsState extends AppSettings {
  isLoading: boolean;
  error: string | null;
  darkMode: boolean;
  toggleDarkMode: () => void;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateStoreInfo: (storeInfo: Partial<AppSettings['storeInfo']>) => void;
  updatePrinter: (printer: Partial<AppSettings['printer']>) => void;
  updateTax: (tax: Partial<AppSettings['tax']>) => void;
  updateBarcode: (barcode: Partial<AppSettings['barcode']>) => void;
  updateZATCA: (zatca: Partial<AppSettings['zatca']>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
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
          // TODO: Replace with actual Tauri invoke('get_settings')
          set({ isLoading: false });
        } catch (error) {
          set({ error: 'فشل في تحميل الإعدادات', isLoading: false });
        }
      },

      updateSettings: async (settings) => {
        set({ isLoading: true, error: null });
        try {
          // TODO: Replace with actual Tauri invoke('update_settings', { settings })
          set({ ...settings, isLoading: false });
        } catch (error) {
          set({ error: 'فشل في حفظ الإعدادات', isLoading: false });
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
    }
  )
);
