import { create } from 'zustand';
import type { Customer, CustomerInput } from '../types';

interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<void>;
  selectCustomer: (customer: Customer | null) => void;
  addCustomer: (customer: CustomerInput) => Promise<void>;
  addPayment: (customerId: string, amount: number) => Promise<void>;
}

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: '1',
    nameAr: 'شركة الأمل',
    nameEn: 'Al-Amal Company',
    phone: '0501234567',
    vatNumber: '3111111111',
    crNumber: '1010123456',
    creditLimit: 50000,
    balance: 12500,
    address: 'الرياض، حي العليا',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: '2',
    nameAr: 'مؤسسة النور',
    nameEn: 'Al-Nour Foundation',
    phone: '0509876543',
    vatNumber: '3222222222',
    crNumber: '1010654321',
    creditLimit: 30000,
    balance: 0,
    address: 'جدة، حي الصفا',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: MOCK_CUSTOMERS,
  selectedCustomer: null,
  isLoading: false,
  error: null,

  fetchCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('get_customers')
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'فشل في تحميل العملاء', isLoading: false });
    }
  },

  selectCustomer: (customer: Customer | null) => {
    set({ selectedCustomer: customer });
  },

  addCustomer: async (customer: CustomerInput) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('create_customer', { customer })
      const newCustomer: Customer = {
        id: String(Date.now()),
        ...customer,
        creditLimit: customer.creditLimit || 0,
        balance: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        customers: [...state.customers, newCustomer],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في إضافة العميل', isLoading: false });
    }
  },

  addPayment: async (customerId: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      // TODO: Replace with actual Tauri invoke('add_customer_payment', { customerId, amount })
      set((state) => ({
        customers: state.customers.map((c) =>
          c.id === customerId ? { ...c, balance: Math.max(0, c.balance - amount) } : c
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في تسجيل الدفعة', isLoading: false });
    }
  },
}));
