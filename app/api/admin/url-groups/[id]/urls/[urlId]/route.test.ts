/**
 * Test suite for URL Group URL API endpoints
 *
 * Tests the following endpoints:
 * - PATCH /api/admin/url-groups/[id]/urls/[urlId] - Update URL position in a group
 * - DELETE /api/admin/url-groups/[id]/urls/[urlId] - Remove URL from a group
 * - PUT /api/admin/url-groups/[id]/urls/[urlId] - Update URL properties
 *
 * Each endpoint is tested for:
 * - Authentication and authorization
 * - Input validation
 * - Success cases
 * - Error handling
 *
 * @group API Tests
 * @group Admin
 * @group URL Groups
 */

import { createTestUrl, createTestUrlGroup } from "@/test/fixtures/data/factories";
import {
  debugError,
  debugMockCalls,
  debugResponse,
  measureTestTime,
  THRESHOLDS,
} from "@/test/helpers/debug";
import type { Url, UrlGroup } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// Mock modules
vi.mock("@/app/lib/db/prisma");
vi.mock("@/app/lib/auth/jwt");
vi.mock("next/headers");

// Import mocked modules
import { verifyToken } from "@/app/lib/auth/jwt";
import { db } from "@/app/lib/db";
import { cookies } from "next/headers";

// Import the module we want to test
import { DELETE, PATCH, PUT } from "./route";

// Define types
type RouteContext = {
  params: Promise<{ id: string; urlId: string }>;
};

type MockUrlGroup = UrlGroup & {
  urls?: Array<{
    url: Url;
    displayOrder: number;
  }>;
  urlCount?: number;
};

// Response types
type ErrorResponse = {
  error: string;
};

type SuccessResponse = {
  success: boolean;
  url?: Url;
};

/**
 * Main test suite for URL Group URL API
 *
 * Uses performance monitoring for all operations:
 * - Setup/teardown timing
 * - Request/response timing
 * - Database operation timing
 *
 * Includes proper error handling and debugging:
 * - Response debugging
 * - Error logging
 * - Mock call analysis
 */
describe("URL Group URL API", () => {
  const suiteTimer = measureTestTime("URL Group URL API Suite");

  // Mock data setup using factories
  const mockAdminUser = {
    id: "admin-id",
    username: "admin",
    isAdmin: true,
  };

  const mockNonAdminUser = {
    id: "user-id",
    username: "user",
    isAdmin: false,
  };

  const mockDate = new Date("2025-01-01T00:00:00.000Z");
  const mockDateString = mockDate.toISOString();

  const mockUrlGroup = createTestUrlGroup({
    id: "test-group-id",
    name: "Test Group",
    description: "Test description",
    createdAt: mockDateString,
    updatedAt: mockDateString,
  });

  const mockUrl = createTestUrl({
    id: "url-id",
    title: "Test URL",
    url: "https://example.com",
    urlMobile: "https://m.example.com",
    iconPath: "/icons/test.png",
    idleTimeoutMinutes: 10,
    createdAt: mockDateString,
    updatedAt: mockDateString,
  });

  let mockCookieStore: {
    get: Mock;
    getAll: Mock;
    has: Mock;
    set: Mock;
    delete: Mock;
  };

  beforeEach(() => {
    const setupTimer = measureTestTime("Test Setup");
    try {
      vi.clearAllMocks();

      // Setup cookie mock
      mockCookieStore = {
        get: vi.fn().mockReturnValue({ value: "valid_token" }),
        getAll: vi.fn(),
        has: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      };
      (cookies as Mock).mockReturnValue(mockCookieStore);

      // Setup auth mock
      (verifyToken as Mock).mockResolvedValue(mockAdminUser);

      // Mock db.urlsInGroups functions
      const dbUrlsInGroups = {
        findUnique: vi.fn().mockImplementation(async () => {
          const timer = measureTestTime("db.urlsInGroups.findUnique");
          try {
            return {
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
              url: mockUrl,
            };
          } finally {
            timer.end();
          }
        }),
        findMany: vi.fn().mockImplementation(async () => {
          const timer = measureTestTime("db.urlsInGroups.findMany");
          try {
            return [
              {
                urlId: mockUrl.id,
                groupId: mockUrlGroup.id,
                displayOrder: 0,
              },
              {
                urlId: "url-id-2",
                groupId: mockUrlGroup.id,
                displayOrder: 1,
              },
            ];
          } finally {
            timer.end();
          }
        }),
        update: vi.fn().mockImplementation(async () => {
          const timer = measureTestTime("db.urlsInGroups.update");
          try {
            return {
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 1, // Updated position
            };
          } finally {
            timer.end();
          }
        }),
        delete: vi.fn().mockImplementation(async () => {
          const timer = measureTestTime("db.urlsInGroups.delete");
          try {
            return {
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            };
          } finally {
            timer.end();
          }
        }),
      };

      // Mock db.url functions
      const dbUrl = {
        update: vi.fn().mockImplementation(async () => {
          const timer = measureTestTime("db.url.update");
          try {
            return {
              ...mockUrl,
              title: "Updated URL",
              url: "https://updated.example.com",
            };
          } finally {
            timer.end();
          }
        }),
      };

      // Setup transaction mock
      Object.assign(db, {
        $transaction: vi.fn().mockImplementation(async (callback) => {
          const timer = measureTestTime("db.$transaction");
          try {
            return await callback(db);
          } finally {
            timer.end();
          }
        }),
        urlsInGroups: dbUrlsInGroups,
        url: dbUrl,
      });
    } finally {
      setupTimer.end();
    }
  });

  afterEach(() => {
    const cleanupTimer = measureTestTime("Test Cleanup");
    try {
      // Debug mock calls for performance analysis
      debugMockCalls(verifyToken as Mock, "verifyToken");
      debugMockCalls(db.urlsInGroups.findUnique as Mock, "db.urlsInGroups.findUnique");
      debugMockCalls(db.$transaction as Mock, "db.$transaction");
    } finally {
      cleanupTimer.end();
    }
  });

  afterAll(() => {
    suiteTimer.end();
  });

  describe("PATCH /api/admin/url-groups/[id]/urls/[urlId]", () => {
    describe("Authentication and Authorization", () => {
      it("returns 401 when not authenticated", async () => {
        const testTimer = measureTestTime("unauthenticated-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            (verifyToken as Mock).mockResolvedValueOnce(null);
            mockCookieStore.get.mockReturnValueOnce(undefined);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PATCH(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PATCH",
                body: JSON.stringify({ displayOrder: 1 }),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(401);
            const unauthorizedError = (await debugResponse(response)) as ErrorResponse;
            expect(unauthorizedError).toEqual({ error: "Unauthorized" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("returns 403 when not authorized", async () => {
        const testTimer = measureTestTime("unauthorized-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            (verifyToken as Mock).mockResolvedValueOnce(mockNonAdminUser);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PATCH(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PATCH",
                body: JSON.stringify({ displayOrder: 1 }),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(403);
            const forbiddenError = (await debugResponse(response)) as ErrorResponse;
            expect(forbiddenError).toEqual({ error: "Forbidden" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Input Validation", () => {
      it("validates displayOrder is a number", async () => {
        const testTimer = measureTestTime("validate-display-order");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            // Reset all mocks
            vi.resetAllMocks();

            // Set up cookie mock
            mockCookieStore = {
              get: vi.fn().mockReturnValue({ value: "valid_token" }),
              getAll: vi.fn(),
              has: vi.fn(),
              set: vi.fn(),
              delete: vi.fn(),
            };
            (cookies as Mock).mockReturnValue(mockCookieStore);

            // Use admin user to pass the authorization check
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            });
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PATCH(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PATCH",
                body: JSON.stringify({ displayOrder: "invalid" }),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            // The route implementation returns 400 when the displayOrder is invalid
            expect(response.status).toBe(400);
            const validationError = (await debugResponse(response)) as ErrorResponse;
            expect(validationError).toEqual({ error: "Invalid display order" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("validates displayOrder is not negative", async () => {
        const testTimer = measureTestTime("validate-non-negative");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            // Use admin user to pass the authorization check
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);
            mockCookieStore.get.mockReturnValueOnce({ value: "valid_token" });

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            });
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PATCH(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PATCH",
                body: JSON.stringify({ displayOrder: -1 }),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(400);
            const validationError = (await debugResponse(response)) as ErrorResponse;
            expect(validationError).toEqual({ error: "Invalid display order" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Success Cases", () => {
      it("updates URL position in the group", async () => {
        const testTimer = measureTestTime("update-url-position");
        try {
          // ARRANGE
          const newDisplayOrder = 1;

          const setupTimer = measureTestTime("test-setup");
          try {
            // Set up admin user authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);
            mockCookieStore.get.mockReturnValueOnce({ value: "valid_token" });

            // Clear mocks to ensure accurate call counts
            vi.clearAllMocks();

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            });

            // Mock transaction success
            (db.$transaction as Mock).mockImplementationOnce(async (callback) => {
              const timer = measureTestTime("db.$transaction");
              try {
                // Mock the transaction operations
                await callback(db);
                return { success: true };
              } finally {
                timer.end();
              }
            });
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PATCH(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PATCH",
                body: JSON.stringify({ displayOrder: newDisplayOrder }),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(200);
            const successResponse = (await debugResponse(response)) as SuccessResponse;
            expect(successResponse).toEqual({ success: true });
            expect(db.urlsInGroups.findUnique).toHaveBeenCalledTimes(1);
            expect(db.$transaction).toHaveBeenCalledTimes(1);
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Error Cases", () => {
      it("handles URL not found in group", async () => {
        const testTimer = measureTestTime("url-not-found-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            // Mock URL in group not found
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce(null);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PATCH(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PATCH",
                body: JSON.stringify({ displayOrder: 1 }),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(404);
            const notFoundError = (await debugResponse(response)) as ErrorResponse;
            expect(notFoundError).toEqual({ error: "URL not found in group" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("handles database errors", async () => {
        const testTimer = measureTestTime("database-error-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            // Mock admin user for authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);
            mockCookieStore.get.mockReturnValueOnce({ value: "valid_token" });

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            });

            // Make the transaction throw to simulate database error
            (db.$transaction as Mock).mockRejectedValueOnce(new Error("Database error"));
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PATCH(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PATCH",
                body: JSON.stringify({ displayOrder: 1 }),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(500);
            const serverError = (await debugResponse(response)) as ErrorResponse;
            expect(serverError).toEqual({ error: "Internal Server Error" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });
  });

  describe("DELETE /api/admin/url-groups/[id]/urls/[urlId]", () => {
    describe("Authentication and Authorization", () => {
      it("returns 401 when not authenticated", async () => {
        const testTimer = measureTestTime("unauthenticated-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            (verifyToken as Mock).mockResolvedValueOnce(null);
            mockCookieStore.get.mockReturnValueOnce(undefined);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await DELETE(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "DELETE",
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(401);
            const unauthorizedError = (await debugResponse(response)) as ErrorResponse;
            expect(unauthorizedError).toEqual({ error: "Unauthorized" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("returns 403 when not authorized", async () => {
        const testTimer = measureTestTime("unauthorized-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            (verifyToken as Mock).mockResolvedValueOnce(mockNonAdminUser);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await DELETE(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "DELETE",
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(403);
            const forbiddenError = (await debugResponse(response)) as ErrorResponse;
            expect(forbiddenError).toEqual({ error: "Forbidden" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Success Cases", () => {
      it("removes URL from the group", async () => {
        const testTimer = measureTestTime("delete-url-from-group");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            // Reset all mocks
            vi.resetAllMocks();

            // Set up cookie mock
            mockCookieStore = {
              get: vi.fn().mockReturnValue({ value: "valid_token" }),
              getAll: vi.fn(),
              has: vi.fn(),
              set: vi.fn(),
              delete: vi.fn(),
            };
            (cookies as Mock).mockReturnValue(mockCookieStore);

            // Set up auth mock
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            });

            // Mock findMany to return remaining URLs after delete
            (db.urlsInGroups.findMany as Mock).mockResolvedValueOnce([
              {
                urlId: "url-id-2",
                groupId: mockUrlGroup.id,
                displayOrder: 1,
              },
            ]);

            // Mock delete operation
            (db.urlsInGroups.delete as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            });

            // Mock update operation for reordering
            (db.urlsInGroups.update as Mock).mockResolvedValueOnce({
              urlId: "url-id-2",
              groupId: mockUrlGroup.id,
              displayOrder: 0, // Reordered to position 0
            });

            // Mock transaction success
            (db.$transaction as Mock).mockImplementationOnce(async (callback) => {
              const timer = measureTestTime("db.$transaction");
              try {
                // Execute the callback directly to trigger the mocked functions
                await callback(db);
                return { success: true };
              } finally {
                timer.end();
              }
            });
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await DELETE(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "DELETE",
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(200);
            const successResponse = (await debugResponse(response)) as SuccessResponse;
            expect(successResponse).toEqual({ success: true });
            expect(db.urlsInGroups.findUnique).toHaveBeenCalledTimes(1);
            expect(db.$transaction).toHaveBeenCalledTimes(1);
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Error Cases", () => {
      it("handles URL not found in group", async () => {
        const testTimer = measureTestTime("url-not-found-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            // Set up admin user authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);
            mockCookieStore.get.mockReturnValueOnce({ value: "valid_token" });

            // Mock URL in group not found
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce(null);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await DELETE(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "DELETE",
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(404);
            const notFoundError = (await debugResponse(response)) as ErrorResponse;
            expect(notFoundError).toEqual({ error: "URL not found in group" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("handles database errors", async () => {
        const testTimer = measureTestTime("database-error-test");
        try {
          // ARRANGE
          const setupTimer = measureTestTime("test-setup");
          try {
            // Mock admin user for authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);
            mockCookieStore.get.mockReturnValueOnce({ value: "valid_token" });

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
            });

            // Make the transaction throw to simulate database error
            (db.$transaction as Mock).mockRejectedValueOnce(new Error("Database error"));
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await DELETE(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "DELETE",
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(500);
            const serverError = (await debugResponse(response)) as ErrorResponse;
            expect(serverError).toEqual({ error: "Internal Server Error" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });
  });

  describe("PUT /api/admin/url-groups/[id]/urls/[urlId]", () => {
    describe("Authentication and Authorization", () => {
      it("returns 401 when not authenticated", async () => {
        const testTimer = measureTestTime("unauthenticated-test");
        try {
          // ARRANGE
          const updateData = {
            title: "Updated Title",
            url: "https://updated.example.com",
          };

          const setupTimer = measureTestTime("test-setup");
          try {
            (verifyToken as Mock).mockResolvedValueOnce(null);
            mockCookieStore.get.mockReturnValueOnce(undefined);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PUT(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PUT",
                body: JSON.stringify(updateData),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(401);
            const unauthorizedError = (await debugResponse(response)) as ErrorResponse;
            expect(unauthorizedError).toEqual({ error: "Unauthorized" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("returns 403 when not authorized", async () => {
        const testTimer = measureTestTime("unauthorized-test");
        try {
          // ARRANGE
          const updateData = {
            title: "Updated Title",
            url: "https://updated.example.com",
          };

          const setupTimer = measureTestTime("test-setup");
          try {
            // Reset all mocks
            vi.resetAllMocks();

            // Set up cookie mock
            mockCookieStore = {
              get: vi.fn().mockReturnValue({ value: "valid_token" }),
              getAll: vi.fn(),
              has: vi.fn(),
              set: vi.fn(),
              delete: vi.fn(),
            };
            (cookies as Mock).mockReturnValue(mockCookieStore);

            // Mock verifyToken to return a non-admin user
            (verifyToken as Mock).mockResolvedValueOnce(mockNonAdminUser);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PUT(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PUT",
                body: JSON.stringify(updateData),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(403);
            const forbiddenError = (await debugResponse(response)) as ErrorResponse;
            expect(forbiddenError).toEqual({ error: "Forbidden" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Input Validation", () => {
      it("validates required fields", async () => {
        const testTimer = measureTestTime("validate-required-fields");
        try {
          // ARRANGE
          const invalidData = {
            // Missing required title and url
            urlMobile: "https://m.updated.example.com",
          };

          const setupTimer = measureTestTime("test-setup");
          try {
            // Reset all mocks
            vi.resetAllMocks();

            // Set up cookie mock
            mockCookieStore = {
              get: vi.fn().mockReturnValue({ value: "valid_token" }),
              getAll: vi.fn(),
              has: vi.fn(),
              set: vi.fn(),
              delete: vi.fn(),
            };
            (cookies as Mock).mockReturnValue(mockCookieStore);

            // Set up admin user authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
              url: mockUrl,
            });
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PUT(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PUT",
                body: JSON.stringify(invalidData),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(400);
            const validationError = (await debugResponse(response)) as ErrorResponse;
            expect(validationError).toEqual({ error: "Title and URL are required" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Success Cases", () => {
      it("updates URL properties", async () => {
        const testTimer = measureTestTime("update-url-properties");
        try {
          // ARRANGE
          const updateData = {
            title: "Updated Title",
            url: "https://updated.example.com",
            urlMobile: "https://m.updated.example.com",
            iconPath: "/icons/updated.png",
            idleTimeoutMinutes: 15,
          };

          const updatedUrl = {
            ...mockUrl,
            title: updateData.title,
            url: updateData.url,
            urlMobile: updateData.urlMobile,
            iconPath: updateData.iconPath,
            idleTimeoutMinutes: updateData.idleTimeoutMinutes,
          };

          const setupTimer = measureTestTime("test-setup");
          try {
            // Reset all mocks
            vi.resetAllMocks();

            // Set up cookie mock
            mockCookieStore = {
              get: vi.fn().mockReturnValue({ value: "valid_token" }),
              getAll: vi.fn(),
              has: vi.fn(),
              set: vi.fn(),
              delete: vi.fn(),
            };
            (cookies as Mock).mockReturnValue(mockCookieStore);

            // Set up admin user authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
              url: mockUrl,
            });

            // Mock transaction success
            (db.$transaction as Mock).mockResolvedValueOnce(updatedUrl);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PUT(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PUT",
                body: JSON.stringify(updateData),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(200);
            const successResponse = (await debugResponse(response)) as SuccessResponse;
            expect(successResponse).toEqual({
              success: true,
              url: updatedUrl,
            });
            expect(db.urlsInGroups.findUnique).toHaveBeenCalledTimes(1);
            expect(db.$transaction).toHaveBeenCalledTimes(1);
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });

    describe("Error Cases", () => {
      it("handles URL not found in group", async () => {
        const testTimer = measureTestTime("url-not-found-test");
        try {
          // ARRANGE
          const updateData = {
            title: "Updated Title",
            url: "https://updated.example.com",
          };

          const setupTimer = measureTestTime("test-setup");
          try {
            // Set up admin user authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);
            mockCookieStore.get.mockReturnValueOnce({ value: "valid_token" });

            // Mock URL in group not found
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce(null);
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PUT(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PUT",
                body: JSON.stringify(updateData),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(404);
            const notFoundError = (await debugResponse(response)) as ErrorResponse;
            expect(notFoundError).toEqual({ error: "URL not found in group" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });

      it("handles database errors", async () => {
        const testTimer = measureTestTime("database-error-test");
        try {
          // ARRANGE
          const updateData = {
            title: "Updated Title",
            url: "https://updated.example.com",
          };

          const setupTimer = measureTestTime("test-setup");
          try {
            // Mock admin user for authentication
            (verifyToken as Mock).mockResolvedValueOnce(mockAdminUser);
            mockCookieStore.get.mockReturnValueOnce({ value: "valid_token" });

            // Mock URL in group exists check
            (db.urlsInGroups.findUnique as Mock).mockResolvedValueOnce({
              urlId: mockUrl.id,
              groupId: mockUrlGroup.id,
              displayOrder: 0,
              url: mockUrl,
            });

            // Make the transaction throw to simulate database error
            (db.$transaction as Mock).mockRejectedValueOnce(new Error("Database error"));
          } finally {
            setupTimer.end();
          }

          // ACT
          const actionTimer = measureTestTime("perform-request");
          let response;
          try {
            response = await PUT(
              new NextRequest("http://localhost/api/admin/url-groups/test-group-id/urls/url-id", {
                method: "PUT",
                body: JSON.stringify(updateData),
              }),
              { params: Promise.resolve({ id: "test-group-id", urlId: "url-id" }) },
            );
          } finally {
            actionTimer.end();
          }

          // ASSERT
          const assertTimer = measureTestTime("verify-response");
          try {
            expect(response.status).toBe(500);
            const serverError = (await debugResponse(response)) as ErrorResponse;
            expect(serverError).toEqual({ error: "Internal Server Error" });
            expect(actionTimer.elapsed()).toBeLessThan(THRESHOLDS.API);
          } finally {
            assertTimer.end();
          }
        } catch (error) {
          debugError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          testTimer.end();
        }
      });
    });
  });

  // Test suites for each endpoint will be implemented here
  // PATCH, DELETE, and PUT tests will follow
});
