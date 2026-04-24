import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginUser, logoutUser, openCashierSession } from '../lib/tauri-commands';
import { extractErrorMessage } from '../lib/tauri-commands';
import { useToastStore } from '../hooks/useToast';

interface AuthState {
  user: { id: string; name: string; role: string; branchId: string } | null;
  session: { token: string; user: { id: string; name: string; role: string; branchId: string } } | null;
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
            const session = {
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

          return false;
        } catch (error: unknown) {
          set({ isLoading: false });
          const raw = error as Record<string, unknown> | null;
          if (raw && raw.type === 'AccountLocked') {
            // Backend lockout — show lockout UI with countdown
            set({ isLocked: true, failedAttempts: 5 });
            useToastStore.getState().addToast(
              (raw.message as string) || 'الحساب مقفل مؤقتاً',
              'error',
              0,
            );
          } else {
            const msg = extractErrorMessage(error, 'حدث خطأ أثناء تسجيل الدخول');
            useToastStore.getState().addToast(msg, 'error');
          }
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
