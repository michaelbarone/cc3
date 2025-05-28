import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";

export interface JwtPayload {
  id: string;
  role: string;
  isActive: boolean;
  theme: string;
  menuPosition: string;
  [key: string]: unknown; // Add index signature
}

/**
 * Signs a JWT token with the provided payload
 */
export async function signJwtToken(payload: JwtPayload): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(nanoid())
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);

  return token;
}

/**
 * Verifies a JWT token and returns the payload
 */
export async function verifyJwtToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Ensure all required properties exist
    const jwtPayload = payload as unknown as JwtPayload;

    if (
      typeof jwtPayload.id !== "string" ||
      typeof jwtPayload.role !== "string" ||
      typeof jwtPayload.isActive !== "boolean" ||
      typeof jwtPayload.theme !== "string" ||
      typeof jwtPayload.menuPosition !== "string"
    ) {
      console.error("Invalid JWT payload structure");
      return null;
    }

    return jwtPayload;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}
