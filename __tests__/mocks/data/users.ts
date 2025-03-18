export type MockUser = {
  id: string
  username: string
  password?: string
  password_hash?: string | null
  is_admin: boolean
  last_active_url?: string | null
}

export const mockUsers: MockUser[] = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    password_hash: 'hashed_admin123',
    is_admin: true,
    last_active_url: null
  },
  {
    id: '2',
    username: 'user',
    password_hash: null,
    is_admin: false,
    last_active_url: null
  }
]
