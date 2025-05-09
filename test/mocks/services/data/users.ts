export interface MockUser {
  id: string;
  username: string;
  requiresPassword: boolean;
  avatarUrl?: string | null;
  isAdmin: boolean;
  password?: string;
  lastLoginAt?: string | null;
}

export const mockUsers: MockUser[] = [
  { id: '1', username: 'admin', requiresPassword: true, isAdmin: true, password: 'admin123' },
  { id: '2', username: 'user', requiresPassword: false, isAdmin: false }
];
