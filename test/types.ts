/**
 * Type definitions for test mocks and fixtures
 * @module test/types
 */

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  iat: number;
  exp: number;
}
