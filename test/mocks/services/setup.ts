import { vi } from "vitest";
import { mockFsPromises } from "../../helpers/file/fs-cleanup";
import { createMockPrismaClient } from "./index";
import { createMockCookieStore, mockNextHeaders } from "./next";

/**
 * Setup common test mocks
 * @param options Configuration options for mocks
 */
export const setupTestMocks = (options: {
  cookieStore?: ReturnType<typeof createMockCookieStore>;
  prisma?: ReturnType<typeof createMockPrismaClient>;
} = {}) => {
  const cookieStore = options.cookieStore || createMockCookieStore();
  const prisma = options.prisma || createMockPrismaClient();

  mockNextHeaders(cookieStore);

  vi.mock("@/app/lib/db/prisma", () => ({
    prisma,
  }));

  vi.mock("fs", () => ({
    promises: mockFsPromises,
    mkdir: mockFsPromises.mkdir,
    access: mockFsPromises.access,
    stat: vi.fn(),
  }));

  return {
    cookieStore,
    prisma,
    fs: mockFsPromises
  };
};
