import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';
import { getSettings, updateSettings } from '../lib/tauri-commands';

interface SettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  vatRate: '0.15',
  printerPort: '',
  printerType: 'usb',
  branchNameAr: 'الفرع الرئيسي',
  invoiceNote: 'شكراً لزيارتكم — يُرجى الاحتفاظ بالفاتورة',
  numerals: 'western',
  autoLockMinutes: '5',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await getSettings();
          set({ settings: data, isLoading: false });
        } catch (error) {
          // Fallback to defaults if backend not ready
          set({ settings: DEFAULT_SETTINGS, isLoading: false });
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
            settings: state.settings ? { ...state.settings, ...newSettings } : DEFAULT_SETTINGS,
            isLoading: false,
          }));
        }
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
