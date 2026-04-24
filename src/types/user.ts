// ============================================================
// User & Auth types — aligned with Rust backend
// NOTE: backend returns snake_case, frontend uses camelCase
// ============================================================

export interface User {
  id: string;
  branch_id: string;
  name_ar: string;
  role: 'admin' | 'manager' | 'cashier';
  is_active: boolean;
  created_at: string;
}

export interface SessionToken {
  userId: string;
  nameAr: string;
  role: 'admin' | 'manager' | 'cashier';
  branchId: string;
  sessionId: string;
}

// Frontend compatibility alias — used in auth store
export interface Session {
  token: string;
  user: {
    id: string;
    name: string;
    role: string;
    branchId: string;
  };
}

export interface CashierSession {
  id: string;
  user_id: string;
  branch_id: string;
  opened_at: string;
  closed_at?: string;
  opening_float: number;
  closing_cash?: number;
  status: 'open' | 'closed';
}
