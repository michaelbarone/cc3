import { GET as getAppConfig, PATCH as updateAppConfig } from '@/app/api/admin/app-config/route'
import { verifyToken } from '@/app/lib/auth/jwt'
import { prisma } from '@/app/lib/db/prisma'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('@/app/lib/auth/jwt', () => ({
  verifyToken: vi.fn()
}))

vi.mock('@/app/lib/db/prisma', () => ({
  prisma: {
    appConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn()
    }
  }
}))

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined)
  }))
}))

vi.mock('path')

describe('App Configuration API', () => {
  const mockAdminToken = {
    id: '1',
    username: 'admin',
    isAdmin: true
  }

  const mockNonAdminToken = {
    id: '2',
    username: 'user',
    isAdmin: false
  }

  const mockConfig = {
    id: 'app-config',
    appName: 'Test App',
    appLogo: '/logos/test.webp',
    favicon: '/logos/favicon.ico',
    loginTheme: 'dark',
    registrationEnabled: false,
    createdAt: new Date('2025-03-30T18:35:46.633Z'),
    updatedAt: new Date('2025-03-30T18:35:46.633Z')
  }

  const defaultConfig = {
    id: 'app-config',
    appName: 'Control Center',
    appLogo: null,
    favicon: null,
    loginTheme: 'dark',
    registrationEnabled: false,
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock path.join to return predictable paths
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
  })

  describe('GET /api/admin/app-config', () => {
    it('returns existing app configuration', async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(mockConfig)

      const response = await getAppConfig()
      const data = await response.json()

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(200)
      expect(data).toEqual({
        ...mockConfig,
        createdAt: mockConfig.createdAt.toISOString(),
        updatedAt: mockConfig.updatedAt.toISOString()
      })
    })

    it('creates default config if none exists', async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.appConfig.create).mockResolvedValue({
        ...mockConfig,
        appName: 'Control Center',
        appLogo: null,
        favicon: null
      })

      const response = await getAppConfig()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appName).toBe('Control Center')
      expect(data.appLogo).toBeNull()
      expect(data.favicon).toBeNull()
    })

    it('handles database errors gracefully', async () => {
      vi.mocked(prisma.appConfig.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      )

      const response = await getAppConfig()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error getting app configuration')
    })

    it('handles database creation errors gracefully', async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.appConfig.create).mockRejectedValue(
        new Error('Database creation failed')
      )

      const response = await getAppConfig()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Error getting app configuration')
    })
  })

  describe('PATCH /api/admin/app-config', () => {
    it('updates app name when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)
      vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce({
        ...mockConfig,
        appName: 'New App Name'
      })

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: 'New App Name' })
      })

      const response = await updateAppConfig(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appName).toBe('New App Name')
      expect(prisma.appConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'app-config' },
        update: { appName: 'New App Name' },
        create: {
          appName: 'New App Name',
          appLogo: null,
          loginTheme: 'dark',
          registrationEnabled: false
        }
      })
    })

    it('rejects update when not authenticated', async () => {
      vi.mocked(verifyToken).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: 'New App Name' })
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    })

    it('rejects update when not admin', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockNonAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: 'New App Name' })
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'Admin privileges required' })
    })

    it('validates app name is not empty', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: '' })
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'App name is required' })
    })

    it('validates app name is not whitespace', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: '   ' })
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'App name is required' })
    })

    it('handles database errors gracefully', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminToken)
      vi.mocked(prisma.appConfig.upsert).mockRejectedValue(
        new Error('Database update failed')
      )

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: 'New App Name' })
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Error updating app configuration' })
    })

    it('handles invalid JSON in request body', async () => {
      vi.mocked(verifyToken).mockResolvedValue(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: 'invalid json'
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Error updating app configuration' })
    })
  })

  describe('Logo Management', () => {
    it('uploads logo when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)
      vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce({
        ...mockConfig,
        appLogo: '/logos/app-logo-123456.webp'
      })

      // Create a mock file
      const file = new File(['test image content'], 'test-logo.png', { type: 'image/png' })
      const formData = new FormData()
      formData.append('logo', file)

      const request = new NextRequest('http://localhost/api/admin/app-config/logo', {
        method: 'POST',
        body: formData
      })

      const { POST } = await import('@/app/api/admin/app-config/logo/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appLogo).toMatch(/^\/logos\/app-logo-\d+\.webp$/)
    })

    it('deletes logo when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValueOnce(mockConfig)
      vi.mocked(prisma.appConfig.update).mockResolvedValueOnce({
        ...mockConfig,
        appLogo: null
      })

      const { DELETE } = await import('@/app/api/admin/app-config/logo/route')
      const response = await DELETE()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appLogo).toBeNull()
    })
  })

  describe('Theme Management', () => {
    it('updates login theme when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)
      vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce({
        ...mockConfig,
        loginTheme: 'light'
      })

      const request = new NextRequest('http://localhost/api/admin/app-config/theme', {
        method: 'PATCH',
        body: JSON.stringify({ loginTheme: 'light' })
      })

      const { PATCH } = await import('@/app/api/admin/app-config/theme/route')
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.loginTheme).toBe('light')
      expect(prisma.appConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'app-config' },
        update: { loginTheme: 'light' },
        create: {
          appName: 'Control Center',
          appLogo: null,
          loginTheme: 'light'
        }
      })
    })

    it('validates theme value', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config/theme', {
        method: 'PATCH',
        body: JSON.stringify({ loginTheme: 'invalid' })
      })

      const { PATCH } = await import('@/app/api/admin/app-config/theme/route')
      const response = await PATCH(request)

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: 'Valid login theme (light or dark) is required'
      })
    })
  })

  describe('Registration Management', () => {
    it('updates registration setting when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)
      vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce({
        ...mockConfig,
        registrationEnabled: true
      })

      const request = new NextRequest('http://localhost/api/admin/app-config/registration', {
        method: 'PATCH',
        body: JSON.stringify({ registrationEnabled: true })
      })

      const { PATCH } = await import('@/app/api/admin/app-config/registration/route')
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.registrationEnabled).toBe(true)
      expect(prisma.appConfig.upsert).toHaveBeenCalledWith({
        where: { id: 'app-config' },
        update: { registrationEnabled: true },
        create: {
          appName: 'Control Center',
          appLogo: null,
          loginTheme: 'dark',
          registrationEnabled: true
        }
      })
    })

    it('validates registration enabled value', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config/registration', {
        method: 'PATCH',
        body: JSON.stringify({ registrationEnabled: 'invalid' })
      })

      const { PATCH } = await import('@/app/api/admin/app-config/registration/route')
      const response = await PATCH(request)

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: 'Valid registration enabled setting (boolean) is required'
      })
    })

    it('rejects update when not authenticated', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/admin/app-config/registration', {
        method: 'PATCH',
        body: JSON.stringify({ registrationEnabled: true })
      })

      const { PATCH } = await import('@/app/api/admin/app-config/registration/route')
      const response = await PATCH(request)

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    })

    it('rejects update when not admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockNonAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config/registration', {
        method: 'PATCH',
        body: JSON.stringify({ registrationEnabled: true })
      })

      const { PATCH } = await import('@/app/api/admin/app-config/registration/route')
      const response = await PATCH(request)

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'Admin privileges required' })
    })
  })
})
