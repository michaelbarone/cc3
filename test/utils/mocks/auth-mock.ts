/**
 * Mock implementations for authentication-related functions
 * @module test/utils/mocks/auth-mock
 */

import { vi } from "vitest";

/**
 * Represents the payload structure of a JWT token
 */
export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  iat: number;
  exp: number;
}

/**
 * Mock implementation of token verification
 * @returns {Promise<TokenPayload | null>} Resolves to token payload or null if verification fails
 */
export const mockVerifyToken = vi.fn().mockImplementation((token: string): TokenPayload => {
  if (!token || token === 'invalid') {
    throw new Error('Invalid token');
  }

  return {
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
});
