export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'manager' | 'cashier' | 'stock' | 'accountant';
  branchId: string;
  isActive: boolean;
}

export interface Session {
  token: string;
  expiresAt: string;
  user: User;
}
