import { NextRequest } from "next/server";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts allowed in the window
}

interface RateLimitResult {
  success: boolean; // Whether the request is allowed
  remainingAttempts: number; // Number of attempts remaining
  resetTime: Date; // When the window resets
}

// In-memory store for rate limiting
// In production, this should use Redis or similar
const rateLimitStore = new Map<string, { attempts: number; windowStart: number }>();

export const loginRateLimit: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 5, // 5 attempts per window
};

// Test bypass header - this should match what we set in our test configuration
export const TEST_BYPASS_HEADER = "x-test-bypass-rate-limit";

export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = loginRateLimit,
): RateLimitResult {
  // Bypass rate limiting for test requests
  if (request.headers.get(TEST_BYPASS_HEADER) === "true") {
    return {
      success: true,
      remainingAttempts: config.maxAttempts,
      resetTime: new Date(Date.now() + config.windowMs),
    };
  }

  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const key = `${ip}:login`;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart >= config.windowMs) {
    entry = { attempts: 0, windowStart: now };
  }

  // Increment attempts
  entry.attempts++;
  rateLimitStore.set(key, entry);

  // Calculate remaining attempts and reset time
  const remainingAttempts = Math.max(0, config.maxAttempts - entry.attempts);
  const resetTime = new Date(entry.windowStart + config.windowMs);

  return {
    success: entry.attempts <= config.maxAttempts,
    remainingAttempts,
    resetTime,
  };
}

// For testing purposes
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
