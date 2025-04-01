export type MockUser = {
  id: string
  username: string
  avatarUrl: string | null
  requiresPassword: boolean
  isAdmin: boolean
  lastLoginAt?: string | null
  password?: string
  password_hash?: string | null
  last_active_url?: string | null
}

export const mockUsers: MockUser[] = [
  {
    id: '1',
    username: 'admin',
    avatarUrl: null,
    requiresPassword: true,
    isAdmin: true,
    lastLoginAt: null,
    password: 'admin123',
    password_hash: 'hashed_admin123',
    last_active_url: null
  },
  {
    id: '2',
    username: 'user',
    avatarUrl: null,
    requiresPassword: false,
    isAdmin: false,
    lastLoginAt: null,
    password_hash: null,
    last_active_url: null
  }
]
