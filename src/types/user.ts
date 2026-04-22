// ============================================================
// User & Auth types — aligned with Rust backend
// ============================================================

export interface User {
  id: string;
  branchId: string;
  nameAr: string;
  role: 'admin' | 'manager' | 'cashier';
  isActive: boolean;
  createdAt: string;
}

export interface SessionToken {
  userId: string;
  nameAr: string;
  role: 'admin' | 'manager' | 'cashier';
  branchId: string;
  sessionId: string;
}

// Frontend compatibility alias
export interface Session {
  token: string;
  user: User;
}

export interface CashierSession {
  id: string;
  userId: string;
  branchId: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  closingCash?: number;
  status: 'open' | 'closed';
}
