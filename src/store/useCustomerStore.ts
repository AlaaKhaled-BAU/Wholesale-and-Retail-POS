import { create } from 'zustand';
import type { Customer, CustomerInput } from '../types';
import {
  getCustomers,
  createCustomer as createCustomerCmd,
  updateCustomer as updateCustomerCmd,
  addCustomerPayment,
} from '../lib/tauri-commands';

interface CustomerState {
  customers: Customer[];
  selectedCustomer: Customer | null;
  isLoading: boolean;
  error: string | null;
  fetchCustomers: (query?: string) => Promise<void>;
  addCustomer: (customer: CustomerInput) => Promise<void>;
  updateCustomer: (id: string, customer: CustomerInput) => Promise<void>;
  recordPayment: (customerId: string, amount: number) => Promise<void>;
  selectCustomer: (customer: Customer | null) => void;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  selectedCustomer: null,
  isLoading: false,
  error: null,

  fetchCustomers: async (query?: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getCustomers(query);
      set({ customers: data, isLoading: false });
    } catch (error) {
      set({ error: 'فشل في تحميل العملاء', isLoading: false });
    }
  },

  addCustomer: async (customer: CustomerInput) => {
    set({ isLoading: true, error: null });
    try {
      const newCustomer = await createCustomerCmd(customer);
      set((state) => ({
        customers: [...state.customers, newCustomer],
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في إضافة العميل', isLoading: false });
    }
  },

  updateCustomer: async (id: string, customer: CustomerInput) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateCustomerCmd(id, customer);
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? updated : c)),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: 'فشل في تحديث العميل', isLoading: false });
    }
  },

  recordPayment: async (customerId: string, amount: number) => {
    set({ isLoading: true, error: null });
    try {
      const sessionJson = localStorage.getItem('pos-session');
      const session = sessionJson ? JSON.parse(sessionJson) : null;
      const userId = session?.user?.id || '';
      await addCustomerPayment(customerId, amount, userId);
      set({ isLoading: false });
      await get().fetchCustomers();
    } catch (error) {
      set({ error: 'فشل في تسجيل الدفع', isLoading: false });
    }
  },

  selectCustomer: (customer: Customer | null) => {
    set({ selectedCustomer: customer });
  },
}));
