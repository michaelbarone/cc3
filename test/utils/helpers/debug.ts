/**
 * Debug helper functions for test files
 * @module test/utils/helpers/debug
 */

import { Response as PlaywrightResponse } from '@playwright/test';
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
export async function debugResponse(response: Response | PlaywrightResponse): Promise<void> {
  try {
    if (response instanceof Response) {
      // Handle standard Response object
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
    } else {
      // Handle Playwright Response object
      const status = response.status();
      const headers = response.headers();
      let body;

      try {
        body = await response.json();
      } catch (e) {
        body = await response.text();
      }

      console.log('Response Debug Info:', {
        status,
        headers,
        body,
        url: response.url(),
      });
    }
  } catch (error) {
    console.error("Failed to debug response:", error);
  }
}

/**
 * Debug request helper that logs request details
 * @param method The HTTP method
 * @param url The request URL
 * @param body Optional request body
 * @param headers Optional request headers
 */
export function debugRequest(method: string, url: string, body?: any, headers?: Record<string, string>) {
  console.log('Request Debug Info:', {
    method,
    url,
    body,
    headers,
  });
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
 * Debug test data state
 * @param data The data to debug
 * @param label Optional label for the debug output
 */
export function debugTestData(data: any, label = 'Test Data') {
  console.log(`${label} Debug Info:`, JSON.stringify(data, null, 2));
}

/**
 * Test timing utility to measure test execution time
 */
export const measureTestTime = () => {
  const start = performance.now();
  return {
    end: () => {
      if (process.env.DEBUG_TESTS !== "true") return;
      const end = performance.now();
      console.log(`Test execution time: ${(end - start).toFixed(2)}ms`);
    },
  };
};

/**
 * Creates a timer utility for measuring multiple test execution times
 */
export function createTestTimer() {
  const timers = new Map<string, number>();

  return {
    start: (label: string) => {
      timers.set(label, performance.now());
    },
    end: (label: string) => {
      const start = timers.get(label);
      if (!start) return;
      const duration = performance.now() - start;
      console.log(`Timer ${label}: ${duration.toFixed(2)}ms`);
    },
    reset: () => {
      timers.clear();
    }
  };
}

/**
 * Log the time taken for a test
 * @param testName The name of the test being timed
 * @param startTime The start time from performance.now()
 */
export function logTestTiming(testName: string, startTime: number): void {
  const duration = performance.now() - startTime;
  console.log(`Test timing - ${testName}: ${duration.toFixed(2)}ms`);
}
