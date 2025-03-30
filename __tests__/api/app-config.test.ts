import { DELETE as deleteLogo, POST as uploadLogo } from '@/app/api/admin/app-config/logo/route'
import { PATCH as updateRegistration } from '@/app/api/admin/app-config/registration/route'
import { GET as getAppConfig, PATCH as updateAppConfig } from '@/app/api/admin/app-config/route'
import { PATCH as updateTheme } from '@/app/api/admin/app-config/theme/route'
import { verifyToken } from '@/app/lib/auth/jwt'
import { prisma } from '@/app/lib/db/prisma'
import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('@/app/lib/auth/jwt')
vi.mock('@/app/lib/db/prisma')
vi.mock('fs/promises')
vi.mock('sharp')
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

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock path.join to return predictable paths
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'))
  })

  describe('GET /api/admin/app-config', () => {
    it('returns existing app configuration', async () => {
      const mockConfig = {
        id: 'app-config',
        appName: 'Test App',
        appLogo: '/logos/test.webp',
        loginTheme: 'dark',
        registrationEnabled: false
      }

      vi.mocked(prisma.appConfig.findUnique).mockResolvedValueOnce(mockConfig)

      const response = await getAppConfig()
      const data = await response.json()

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(200)
      expect(data).toEqual(mockConfig)
    })

    it('creates default config if none exists', async () => {
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValueOnce(null)
      vi.mocked(prisma.appConfig.create).mockResolvedValueOnce({
        id: 'app-config',
        appName: 'Control Center',
        appLogo: null,
        loginTheme: 'dark',
        registrationEnabled: false
      })

      const response = await getAppConfig()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appName).toBe('Control Center')
    })
  })

  describe('PATCH /api/admin/app-config', () => {
    it('updates app name when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)

      const mockConfig = {
        id: 'app-config',
        appName: 'New App Name',
        appLogo: null,
        loginTheme: 'dark',
        registrationEnabled: false
      }

      vi.mocked(prisma.appConfig.upsert).mockResolvedValueOnce(mockConfig)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: 'New App Name' })
      })

      const response = await updateAppConfig(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockConfig)
    })

    it('rejects update when not authenticated', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: 'New App Name' })
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(401)
    })

    it('rejects update when not admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockNonAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config', {
        method: 'PATCH',
        body: JSON.stringify({ appName: 'New App Name' })
      })

      const response = await updateAppConfig(request)
      expect(response.status).toBe(403)
    })
  })

  describe('Logo Management', () => {
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' })
    const mockFormData = new FormData()
    mockFormData.append('logo', mockFile)

    beforeEach(() => {
      // Mock sharp operations
      const mockSharp = {
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined)
      }
      vi.mocked(sharp).mockReturnValue(mockSharp as any)
    })

    it('uploads logo when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)
      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined)

      const request = new NextRequest('http://localhost/api/admin/app-config/logo', {
        method: 'POST',
        body: mockFormData
      })

      const response = await uploadLogo(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.appLogo).toMatch(/^\/logos\/app-logo-\d+\.webp$/)
    })

    it('deletes logo when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)
      vi.mocked(prisma.appConfig.findUnique).mockResolvedValueOnce({
        id: 'app-config',
        appLogo: '/logos/test.webp',
        appName: 'Test App',
        loginTheme: 'dark',
        registrationEnabled: false
      })
      vi.mocked(fs.access).mockResolvedValueOnce(undefined)
      vi.mocked(fs.unlink).mockResolvedValueOnce(undefined)

      const response = await deleteLogo()
      expect(response.status).toBe(200)
    })
  })

  describe('Theme Management', () => {
    it('updates login theme when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config/theme', {
        method: 'PATCH',
        body: JSON.stringify({ loginTheme: 'light' })
      })

      const response = await updateTheme(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.loginTheme).toBe('light')
    })

    it('validates theme value', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config/theme', {
        method: 'PATCH',
        body: JSON.stringify({ loginTheme: 'invalid' })
      })

      const response = await updateTheme(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Registration Management', () => {
    it('updates registration setting when authenticated as admin', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config/registration', {
        method: 'PATCH',
        body: JSON.stringify({ registrationEnabled: true })
      })

      const response = await updateRegistration(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.registrationEnabled).toBe(true)
    })

    it('validates registration enabled value', async () => {
      vi.mocked(verifyToken).mockResolvedValueOnce(mockAdminToken)

      const request = new NextRequest('http://localhost/api/admin/app-config/registration', {
        method: 'PATCH',
        body: JSON.stringify({ registrationEnabled: 'invalid' })
      })

      const response = await updateRegistration(request)
      expect(response.status).toBe(400)
    })
  })
})
