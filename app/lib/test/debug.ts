import { Mock } from 'vitest';

/**
 * Debug helper functions for test files
 */

/**
 * Debug a response object by logging its status, headers, and body
 */
export async function debugResponse(response: Response) {
  // Log response details first
  const status = response.status;
  const statusText = response.statusText;
  const headers = Object.fromEntries(response.headers.entries());

  // Clone for body reading
  const clone = response.clone();
  const body = await clone.text();

  console.log('Response Debug:', {
    status,
    statusText,
    headers,
    body: body.length > 1000 ? body.substring(0, 1000) + '...' : body
  });
}

/**
 * Debug an error object with stack trace and additional context
 */
export function debugError(error: Error, context?: Record<string, unknown>) {
  console.error('Error Debug:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context
  });
}

/**
 * Debug mock function calls and their arguments
 */
export function debugMockCalls(mockFn: Mock, name: string) {
  console.log(`Mock Debug (${name}):`, {
    calls: mockFn.mock.calls,
    results: mockFn.mock.results,
    instances: mockFn.mock.instances
  });
}
