import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '../types';
import { loginUser, logoutUser, openCashierSession } from '../lib/tauri-commands';
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
          const result = await loginUser(pin);

          if (result && result.user) {
            const session: Session = {
              token: result.token,
              user: result.user,
            };

            // Open cashier session automatically on login
            try {
              await openCashierSession(result.user.id, 1000);
            } catch (e) {
              // Session might already be open — idempotent
            }

            set({
              user: result.user,
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
        } catch (error: any) {
          set({ isLoading: false });
          useToastStore.getState().addToast(error?.toString() || 'حدث خطأ أثناء تسجيل الدخول', 'error');
          return false;
        }
      },

      logout: () => {
        logoutUser('').catch(() => {}); // Best effort
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
