import { NextRequest, NextResponse } from 'next/server'
import { vi } from 'vitest'

/**
 * Standard cookie store mock implementation
 */
export const createMockCookieStore = () => ({
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
})

/**
 * Mock Next.js headers with cookie store
 * @param cookieStore Optional custom cookie store implementation
 */
export const mockNextHeaders = (cookieStore = createMockCookieStore()) => {
  vi.mock("next/headers", () => ({
    cookies: vi.fn(() => cookieStore),
  }))
  return cookieStore
}

/**
 * Create a mock NextRequest instance
 */
export class MockNextRequest extends NextRequest {
  private _url: string
  private _method: string
  private _headers: Headers
  private _body: any

  constructor(url: string, init?: { method?: string; headers?: HeadersInit; body?: any }) {
    super(url)
    this._url = url
    this._method = init?.method || "GET"
    this._headers = new Headers(init?.headers || {})
    this._body = init?.body
  }

  get url() {
    return this._url
  }

  get method() {
    return this._method
  }

  get headers() {
    return this._headers
  }

  async json() {
    return this._body
  }
}

/**
 * Create a mock NextResponse instance that matches Next.js Response type
 */
export class MockNextResponse<T = unknown> extends NextResponse<T> {
  private _data: T
  private _init: ResponseInit

  constructor(data: T, init: ResponseInit = {}) {
    const body = JSON.stringify(data)
    super(body, init)
    this._data = data
    this._init = init
  }

  async json(): Promise<T> {
    return this._data
  }

  static json<T>(data: T, init: ResponseInit = {}): NextResponse<T> {
    const response = new MockNextResponse<T>(data, init)
    response.headers.set('content-type', 'application/json')
    return response
  }

  get status(): number {
    return this._init.status || 200
  }

  get headers(): Headers {
    return new Headers(this._init.headers || {})
  }
}
