import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';
import * as tauriCommands from '../lib/tauri-commands';

let loginSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  vi.spyOn(tauriCommands, 'logoutUser').mockResolvedValue(undefined);
  vi.spyOn(tauriCommands, 'openCashierSession').mockResolvedValue({ sessionId: 'SES-001' });
  loginSpy = vi.spyOn(tauriCommands, 'loginUser');
});

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    session: null,
    isAuthenticated: false,
    isLocked: false,
    failedAttempts: 0,
    isLoading: false,
  });
  loginSpy.mockResolvedValue(null);
});

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('starts unauthenticated', () => {
      const { isAuthenticated, user } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
      expect(user).toBeNull();
    });
  });

  describe('login', () => {
    it('sets user and isAuthenticated on successful login', async () => {
      loginSpy.mockResolvedValueOnce({
        user: { id: 'USR-001', nameAr: 'المدير', role: 'admin' },
        token: 'tok-123',
      });

      const result = await useAuthStore.getState().login('0000');

      expect(result).toBe(true);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().user?.id).toBe('USR-001');
      expect(useAuthStore.getState().failedAttempts).toBe(0);
    });

    it('increments failed attempts on bad PIN', async () => {
      await useAuthStore.getState().login('wrong');
      expect(useAuthStore.getState().failedAttempts).toBe(1);
    });

    it('locks after 5 failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await useAuthStore.getState().login('wrong');
      }
      expect(useAuthStore.getState().isLocked).toBe(true);
      expect(useAuthStore.getState().failedAttempts).toBe(5);
    });
  });

  describe('logout', () => {
    it('clears all auth state', () => {
      useAuthStore.setState({
        user: { id: 'USR-001', nameAr: 'test', role: 'cashier' } as any,
        session: { token: 'tok', user: {} as any },
        isAuthenticated: true,
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('lockScreen', () => {
    it('locks the screen', () => {
      useAuthStore.setState({ isAuthenticated: true });
      useAuthStore.getState().lockScreen();
      expect(useAuthStore.getState().isLocked).toBe(true);
    });
  });

  describe('resetFailedAttempts', () => {
    it('resets lock and attempts', () => {
      useAuthStore.setState({ isLocked: true, failedAttempts: 5 });
      useAuthStore.getState().resetFailedAttempts();
      expect(useAuthStore.getState().failedAttempts).toBe(0);
      expect(useAuthStore.getState().isLocked).toBe(false);
    });
  });
});