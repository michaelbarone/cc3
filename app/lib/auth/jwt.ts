import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

// JWT Secret should be in environment variables in a real application
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d'; // 7 days
const COOKIE_NAME = 'auth_token';

export interface JwtPayload {
  id: string;
  username: string;
  isAdmin: boolean;
}

/**
 * Generate a JWT token for the user
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Set the JWT token as an HTTP-only cookie
 */
export function setAuthCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });
}

/**
 * Remove the authentication cookie
 */
export function removeAuthCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Verify and decode the JWT token from cookies
 */
export function verifyToken(): JwtPayload | null {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (_error) {
    // Token is invalid or expired
    removeAuthCookie();
    return null;
  }
}
