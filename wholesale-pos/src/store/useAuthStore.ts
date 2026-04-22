import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '../types';
import { useToastStore } from '../hooks/useToast';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  failedAttempts: number;
  isLoading: boolean;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  lockScreen: () => void;
  unlockScreen: (pin: string) => Promise<boolean>;
  resetFailedAttempts: () => void;
}

const MOCK_USERS: Record<string, User> = {
  '1234': {
    id: '1',
    name: 'أحمد محمد',
    role: 'cashier',
    branchId: '1',
    isActive: true,
  },
  '5678': {
    id: '2',
    name: 'خالد العلي',
    role: 'manager',
    branchId: '1',
    isActive: true,
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLocked: false,
      failedAttempts: 0,
      isLoading: false,

      login: async (pin: string) => {
        set({ isLoading: true });
        try {
          // TODO: Replace with actual Tauri invoke('login_user', { pin })
          const user = MOCK_USERS[pin];
          
          if (user) {
            const session: Session = {
              token: `mock-token-${Date.now()}`,
              expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
              user,
            };
            
            set({
              user,
              session,
              isAuthenticated: true,
              isLocked: false,
              failedAttempts: 0,
              isLoading: false,
            });
            useToastStore.getState().addToast('تم تسجيل الدخول بنجاح', 'success');
            return true;
          }

          const newFailedAttempts = get().failedAttempts + 1;
          set({ failedAttempts: newFailedAttempts, isLoading: false });
          
          if (newFailedAttempts >= 5) {
            set({ isLocked: true });
            useToastStore.getState().addToast('تم قفل الحساب لمدة 30 ثانية', 'error');
            setTimeout(() => {
              set({ isLocked: false, failedAttempts: 0 });
            }, 30000);
          } else {
            useToastStore.getState().addToast('الرمز السري غير صحيح', 'error');
          }
          
          return false;
        } catch (error) {
          set({ isLoading: false });
          useToastStore.getState().addToast('حدث خطأ أثناء تسجيل الدخول', 'error');
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLocked: false,
          failedAttempts: 0,
        });
        useToastStore.getState().addToast('تم تسجيل الخروج', 'info');
      },

      lockScreen: () => {
        set({ isLocked: true });
      },

      unlockScreen: async (pin: string) => {
        const success = await get().login(pin);
        if (success) {
          set({ isLocked: false });
        }
        return success;
      },

      resetFailedAttempts: () => {
        set({ failedAttempts: 0, isLocked: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
