import { vi } from "vitest";

interface TokenPayload {
  isAdmin: boolean;
  [key: string]: any;
}

/**
 * Mock JWT verification function
 * Default behavior returns null (unauthenticated)
 * Override with mockResolvedValue for different scenarios
 */
export const mockVerifyToken = vi.fn().mockImplementation(() => Promise.resolve<TokenPayload | null>(null));
