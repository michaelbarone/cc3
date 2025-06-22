import { prisma } from "@/app/lib/db/prisma";

export interface PasswordPolicy {
  minPasswordLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Get the current password policy from the database
 */
export async function getPasswordPolicy(): Promise<PasswordPolicy> {
  try {
    const appConfig = await prisma.appConfig.findUnique({
      where: { id: "app-config" },
    });

    return {
      minPasswordLength: (appConfig as any)?.minPasswordLength ?? 4,
      requireUppercase: (appConfig as any)?.requireUppercase ?? false,
      requireLowercase: (appConfig as any)?.requireLowercase ?? false,
      requireNumbers: (appConfig as any)?.requireNumbers ?? false,
      requireSpecialChars: (appConfig as any)?.requireSpecialChars ?? false,
    };
  } catch (error) {
    console.error("Error fetching password policy:", error);
    // Return default policy if there's an error
    return {
      minPasswordLength: 4,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
    };
  }
}

/**
 * Validate a password against the current password policy
 */
export async function validatePassword(password: string): Promise<ValidationResult> {
  const policy = await getPasswordPolicy();
  return validatePasswordWithPolicy(password, policy);
}

/**
 * Validate a password against a specific policy
 */
export function validatePasswordWithPolicy(
  password: string,
  policy: PasswordPolicy,
): ValidationResult {
  const errors: string[] = [];

  if (!password || password.length < policy.minPasswordLength) {
    errors.push(`Password must be at least ${policy.minPasswordLength} characters long.`);
  }

  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }

  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }

  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number.");
  }

  if (policy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain at least one special character.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
