import { PUT } from '@/app/api/settings/password/route'
import { verifyToken } from '@/app/lib/auth/jwt'
import { hashPassword, verifyPassword } from '@/app/lib/auth/password'
import { db } from '@/app/lib/db'
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('@/app/lib/auth/jwt', () => ({
  verifyToken: vi.fn(),
}))

vi.mock('@/app/lib/auth/password', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock('@/app/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock user template
const createMockUser = (overrides = {}) => ({
  id: '1',
  username: 'testuser',
  passwordHash: 'hashedpassword',
  isAdmin: false,
  lastActiveUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  avatarUrl: null,
  menuPosition: null,
  themeMode: null,
  ...overrides,
})

describe('Password Settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('PUT /api/settings/password', () => {
    it('updates password when user is authenticated and current password is correct', async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValue({ id: '1', username: 'testuser', isAdmin: false })

      // Mock database operations
      vi.mocked(db.user.findUnique).mockResolvedValue(createMockUser())
      vi.mocked(db.user.update).mockResolvedValue(createMockUser({ passwordHash: 'newhash' }))

      // Mock password verification and hashing
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(hashPassword).mockResolvedValue('newhash')

      const request = new NextRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        message: 'Password updated successfully',
        hasPassword: true,
      })
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { passwordHash: 'newhash' },
      })
    })

    it('removes password when newPassword is null', async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValue({ id: '1', username: 'testuser', isAdmin: false })

      // Mock database operations
      vi.mocked(db.user.findUnique).mockResolvedValue(createMockUser())
      vi.mocked(db.user.update).mockResolvedValue(createMockUser({ passwordHash: null }))

      // Mock password verification
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const request = new NextRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: null,
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        message: 'Password protection disabled successfully',
        hasPassword: false,
      })
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { passwordHash: null },
      })
    })

    it('returns 401 when user is not authenticated', async () => {
      // Mock failed authentication
      vi.mocked(verifyToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ message: 'Unauthorized' })
      expect(db.user.update).not.toHaveBeenCalled()
    })

    it('returns 404 when user is not found', async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValue({ id: '1', username: 'testuser', isAdmin: false })

      // Mock database operations - user not found
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ message: 'User not found' })
      expect(db.user.update).not.toHaveBeenCalled()
    })

    it('returns 400 when current password is incorrect', async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValue({ id: '1', username: 'testuser', isAdmin: false })

      // Mock database operations
      vi.mocked(db.user.findUnique).mockResolvedValue(createMockUser())

      // Mock password verification - incorrect password
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toEqual({ message: 'Current password is incorrect' })
      expect(db.user.update).not.toHaveBeenCalled()
    })

    it('handles internal server errors gracefully', async () => {
      // Mock authentication
      vi.mocked(verifyToken).mockResolvedValue({ id: '1', username: 'testuser', isAdmin: false })

      // Mock database operations - throw error
      vi.mocked(db.user.findUnique).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/settings/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ message: 'Internal server error' })
      expect(db.user.update).not.toHaveBeenCalled()
    })
  })
})
