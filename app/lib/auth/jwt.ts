import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

// JWT Secret should be in environment variables in a real application
const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
const JWT_EXPIRY = "24h"; // 24 hours
const COOKIE_NAME = "auth_token";

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
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 24 * 60 * 60, // 24 hours in seconds
  });
}

/**
 * Remove the authentication cookie
 */
export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Verify and decode the JWT token from cookies
 * @param token Optional token string. If not provided, will attempt to get from cookies
 * @returns The decoded JWT payload or null if invalid
 */
export async function verifyToken(token?: string): Promise<JwtPayload | null> {
  try {
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
      if (!token) return null;
    }
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}
