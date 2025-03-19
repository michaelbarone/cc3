import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    // If the user has no password set (hash is null), they can log in without a password
    return true;
  }

  return bcrypt.compare(password, hash);
}
