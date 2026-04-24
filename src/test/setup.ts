import '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

vi.mock('../lib/tauri-commands', () => {
  const mockFn = (res: unknown) => () => Promise.resolve(res);
  return {
    loginUser: mockFn(null),
    logoutUser: mockFn(undefined),
    openCashierSession: mockFn(undefined),
    closeCashierSession: mockFn(undefined),
    createInvoice: mockFn(null),
    getInvoice: mockFn(null),
    createRefundInvoice: mockFn(null),
  };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});