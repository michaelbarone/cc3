import { vi } from 'vitest';
import type { TokenPayload } from '../../../types';

/**
 * Consolidated authentication mocks
 * @module test/mocks/services/auth/auth.mock
 */

export interface AuthToken {
  token: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class AuthServiceMock {
  private static instance: AuthServiceMock;

  verifyToken = vi.fn().mockImplementation((token: string): Promise<TokenPayload> => {
    if (!token || token === 'invalid') {
      return Promise.reject(new Error('Invalid token'));
    }

    return Promise.resolve({
      sub: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    });
  });

  validateToken = vi.fn().mockImplementation((token: string): Promise<boolean> => {
    return Promise.resolve(token !== 'invalid');
  });

  generateToken = vi.fn().mockImplementation((user: AuthUser): Promise<AuthToken> => {
    return Promise.resolve({
      token: 'mock.jwt.token',
      expiresIn: 3600
    });
  });

  refreshToken = vi.fn().mockImplementation((token: string): Promise<AuthToken> => {
    if (!token || token === 'invalid') {
      return Promise.reject(new Error('Invalid refresh token'));
    }
    return Promise.resolve({
      token: 'mock.refreshed.token',
      expiresIn: 3600
    });
  });

  static getInstance(): AuthServiceMock {
    if (!AuthServiceMock.instance) {
      AuthServiceMock.instance = new AuthServiceMock();
    }
    return AuthServiceMock.instance;
  }

  reset(): void {
    this.verifyToken.mockClear();
    this.validateToken.mockClear();
    this.generateToken.mockClear();
    this.refreshToken.mockClear();
  }
}

export const authServiceMock = AuthServiceMock.getInstance();

// Legacy verifyToken mock maintained for backward compatibility
export const mockVerifyToken = vi.fn().mockImplementation((token: string): Promise<TokenPayload | null> => {
  if (!token || token === 'invalid') {
    return Promise.resolve(null);
  }
  return Promise.resolve({
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/avatar.jpg',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  });
});

export const setupAuthMocks = (): void => {
  // Setup auth service mock
  vi.mock('../../../../services/auth.service', () => ({
    AuthService: {
      getInstance: () => authServiceMock
    }
  }));

  // Setup legacy auth mocks
  vi.mock('../../../../lib/auth', () => ({
    verifyToken: mockVerifyToken
  }));
};

export const resetAuthMocks = (): void => {
  authServiceMock.reset();
  mockVerifyToken.mockClear();
};
