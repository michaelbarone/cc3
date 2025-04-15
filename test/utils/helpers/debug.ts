/**
 * Debug helper functions for test files
 * @module test/utils/helpers/debug
 */

import { Mock } from 'vitest';

/**
 * Debug a response by logging its status and body
 * @param response The Response object to debug
 *
 * @example
 * ```ts
 * const response = await fetch('/api/data');
 * await debugResponse(response);
 * // Logs: Response debug: { status: 200, statusText: "OK", ... }
 * ```
 */
export async function debugResponse(response: Response): Promise<void> {
  try {
    // Get the response text
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    // Create a new response with the same data
    const newResponse = new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    console.log("Response debug:", {
      status: newResponse.status,
      statusText: newResponse.statusText,
      headers: Object.fromEntries(newResponse.headers.entries()),
      body: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      bodyUsed: false,
    });
  } catch (error) {
    console.error("Failed to debug response:", error);
  }
}

/**
 * Debug an error object with stack trace and additional context
 * @param error The Error object to debug
 * @param context Optional additional context to include in the debug output
 *
 * @example
 * ```ts
 * try {
 *   throw new Error('Test error');
 * } catch (error) {
 *   debugError(error, { userId: '123', action: 'test' });
 * }
 * ```
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
 * @param mockFn The mock function to debug
 * @param name A descriptive name for the mock function
 *
 * @example
 * ```ts
 * const mockFn = vi.fn();
 * mockFn('test');
 * debugMockCalls(mockFn, 'testFunction');
 * // Logs: Mock Debug (testFunction): { calls: [['test']], ... }
 * ```
 */
export function debugMockCalls(mockFn: Mock, name: string) {
  console.log(`Mock Debug (${name}):`, {
    calls: mockFn.mock.calls,
    results: mockFn.mock.results,
    instances: mockFn.mock.instances
  });
}

/**
 * Log the time taken for a test
 * @param testName The name of the test being timed
 * @param startTime The start time in milliseconds (from performance.now())
 *
 * @example
 * ```ts
 * const start = performance.now();
 * // ... run test ...
 * logTestTiming('MyTest', start);
 * // Logs: Test timing - MyTest: 123.45ms
 * ```
 */
export function logTestTiming(testName: string, startTime: number): void {
  const duration = performance.now() - startTime;
  console.log(`Test timing - ${testName}: ${duration.toFixed(2)}ms`);
}
