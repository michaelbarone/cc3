import { NextRequest, NextResponse } from "next/server";
import { Mock, vi } from "vitest";

type MockFn = Mock & {
  mockResolvedValue: (value: any) => Mock;
  mockImplementation: (fn: (...args: any[]) => any) => Mock;
};

interface PrismaMock {
  findUnique: MockFn;
  findMany: MockFn;
  create: MockFn;
  update: MockFn;
  delete: MockFn;
  aggregate: MockFn;
  groupBy: MockFn;
  count: MockFn;
}

/**
 * Standard cookie store mock implementation
 */
export const createMockCookieStore = () => ({
  get: vi.fn(),
  getAll: vi.fn(),
  has: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
});

/**
 * Mock Next.js headers with cookie store
 * @param cookieStore Optional custom cookie store implementation
 */
export const mockNextHeaders = (cookieStore = createMockCookieStore()) => {
  vi.mock("next/headers", () => ({
    cookies: vi.fn(() => cookieStore),
  }));
  return cookieStore;
};

/**
 * Create a mock NextRequest instance
 */
export class MockNextRequest extends NextRequest {
  private _url: string;
  private _method: string;
  private _headers: Headers;
  private _body: any;

  constructor(url: string, init?: { method?: string; headers?: HeadersInit; body?: any }) {
    super(url);
    this._url = url;
    this._method = init?.method || "GET";
    this._headers = new Headers(init?.headers || {});
    this._body = init?.body;
  }

  get url() {
    return this._url;
  }

  get method() {
    return this._method;
  }

  get headers() {
    return this._headers;
  }

  async json() {
    return this._body;
  }
}

interface PrismaCustomImplementations {
  user?: Partial<PrismaMock>;
  urlGroup?: Partial<PrismaMock>;
  url?: Partial<PrismaMock>;
  appConfig?: Partial<PrismaMock>;
  $transaction?: MockFn;
  $disconnect?: MockFn;
  $queryRaw?: MockFn;
}

/**
 * Create a mock NextResponse instance that matches Next.js Response type
 */
export class MockNextResponse<T = unknown> extends NextResponse<T> {
  private _data: T;
  private _init: ResponseInit;

  constructor(data: T, init: ResponseInit = {}) {
    const body = JSON.stringify(data);
    super(body, init);
    this._data = data;
    this._init = init;
  }

  async json(): Promise<T> {
    return this._data;
  }

  static json<T>(data: T, init: ResponseInit = {}): NextResponse<T> {
    const response = new MockNextResponse<T>(data, init);
    response.headers.set('content-type', 'application/json');
    return response;
  }

  get status(): number {
    return this._init.status || 200;
  }

  get headers(): Headers {
    return new Headers(this._init.headers || {});
  }
}

/**
 * Create a mock Prisma client with common operations
 * @param customImplementations Optional custom implementations for Prisma methods
 */
export const createMockPrismaClient = (customImplementations: PrismaCustomImplementations = {}) => {
  const defaultMock = {
    findUnique: vi.fn() as MockFn,
    findMany: vi.fn() as MockFn,
    create: vi.fn() as MockFn,
    update: vi.fn() as MockFn,
    delete: vi.fn() as MockFn,
    aggregate: vi.fn() as MockFn,
    groupBy: vi.fn() as MockFn,
    count: vi.fn() as MockFn,
  };

  return {
    user: { ...defaultMock, ...customImplementations.user },
    urlGroup: { ...defaultMock, ...customImplementations.urlGroup },
    url: { ...defaultMock, ...customImplementations.url },
    appConfig: {
      findUnique: vi.fn() as MockFn,
      upsert: vi.fn() as MockFn,
      update: vi.fn() as MockFn,
      ...customImplementations.appConfig,
    },
    $transaction: vi.fn() as MockFn,
    $disconnect: vi.fn() as MockFn,
    $queryRaw: vi.fn() as MockFn,
    ...customImplementations,
  };
};

/**
 * Mock file system operations
 */
export const createMockFileSystem = () => ({
  accessSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn(),
});

/**
 * Setup common test mocks
 * @param options Configuration options for mocks
 */
export const setupTestMocks = (options: {
  cookieStore?: ReturnType<typeof createMockCookieStore>;
  prisma?: ReturnType<typeof createMockPrismaClient>;
  fileSystem?: ReturnType<typeof createMockFileSystem>;
} = {}) => {
  const cookieStore = options.cookieStore || createMockCookieStore();
  const prisma = options.prisma || createMockPrismaClient();
  const fs = options.fileSystem || createMockFileSystem();

  mockNextHeaders(cookieStore);

  vi.mock("@/app/lib/db/prisma", () => ({
    prisma,
  }));

  vi.mock("fs", () => fs);

  return {
    cookieStore,
    prisma,
    fs,
  };
};
