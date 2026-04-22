import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  failedAttempts: number;
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

      login: async (pin: string) => {
        // TODO: Replace with actual Tauri invoke('login_user', { pin })
        const user = MOCK_USERS[pin];
        
        if (user) {
          const session: Session = {
            token: `mock-token-${Date.now()}`,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
            user,
          };
          
          set({
            user,
            session,
            isAuthenticated: true,
            isLocked: false,
            failedAttempts: 0,
          });
          return true;
        }

        const newFailedAttempts = get().failedAttempts + 1;
        set({ failedAttempts: newFailedAttempts });
        
        if (newFailedAttempts >= 5) {
          set({ isLocked: true });
          // Auto-unlock after 30 seconds
          setTimeout(() => {
            set({ isLocked: false, failedAttempts: 0 });
          }, 30000);
        }
        
        return false;
      },

      logout: () => {
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLocked: false,
          failedAttempts: 0,
        });
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
