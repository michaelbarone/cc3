
/**
 * Debug helper functions for test files
 * @module test/utils/helpers/debug
 */

import { Response as PlaywrightResponse } from '@playwright/test';
import { NextResponse } from 'next/server';
import { Mock } from 'vitest';

/**
 * Enhanced debug helper that automatically clones the response and returns parsed data
 * Handles both NextResponse and PlaywrightResponse types
 */
export async function debugResponse<T = unknown>(response: NextResponse | PlaywrightResponse): Promise<T> {
  console.log('Response Status:', response.status);
  console.log('Response Status Text:', response.statusText);
  console.log('Response Headers:');

  let data: T;

  // Handle headers for both Response types
  if ('headers' in response && typeof response.headers === 'function') {
    // Playwright Response
    const headers = response.headers();
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    const text = await response.text();
    try {
      data = JSON.parse(text);
      console.log('Response Body:', data);
    } catch {
      console.log('Response Body (raw):', text);
      throw new Error('Failed to parse response as JSON');
    }
  } else if (response instanceof NextResponse) {
    // Next.js Response
    const headers = Object.fromEntries(response.headers);
    Object.entries(headers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    // Clone response before reading
    const clonedResponse = response.clone();
    try {
      data = await clonedResponse.json();
      console.log('Response Body:', data);
    } catch {
      const text = await clonedResponse.text();
      console.log('Response Body (raw):', text);
      throw new Error('Failed to parse response as JSON');
    }
  } else {
    throw new Error('Unsupported response type');
  }

  return data;
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
 * @param operation The name of the operation being timed
 */
export const measureTestTime = (operation?: string) => {
  const start = performance.now();
  return {
    elapsed: () => performance.now() - start,
    end: () => {
      const end = performance.now();
      console.log(operation ? `Operation '${operation}' took ${(end - start).toFixed(2)}ms` : `Test took ${(end - start).toFixed(2)}ms`);
    },
  };
};

/**
 * Creates a simple timer for measuring test execution time
 */
export function createTestTimer() {
  const timers: Record<string, number> = {};

  return {
    start: (label: string) => {
      timers[label] = performance.now();
      console.log(`⏱️ Starting ${label}`);
    },
    end: (label: string) => {
      const start = timers[label];
      if (!start) {
        console.warn(`Timer ${label} was not started`);
        return;
      }
      const duration = performance.now() - start;
      console.log(`⏱️ ${label} took ${duration.toFixed(2)}ms`);
      delete timers[label];
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

/**
 * Performance thresholds for different types of tests in milliseconds.
 * Used to validate test execution times and ensure performance standards.
 *
 * @constant
 * @type {Record<'UNIT' | 'INTEGRATION' | 'E2E' | 'API', number>}
 *
 * @property {number} UNIT - Maximum time for unit tests (100ms)
 *                          Fast, isolated tests with no external dependencies
 * @property {number} INTEGRATION - Maximum time for integration tests (1000ms)
 *                                 Tests involving multiple units or simple external services
 * @property {number} E2E - Maximum time for end-to-end tests (5000ms)
 *                         Full system tests involving browser and multiple services
 * @property {number} API - Maximum time for API tests (2000ms)
 *                         Tests involving HTTP requests and database operations
 *
 * @example
 * ```typescript
 * test("should complete within unit test threshold", async () => {
 *   const timer = measureTestTime('operation');
 *   await operation();
 *   expect(timer.elapsed()).toBeLessThan(THRESHOLDS.UNIT);
 *   timer.end();
 * });
 * ```
 */
export const THRESHOLDS = {
  UNIT: 200, // 200ms
  INTEGRATION: 1000, // 1 second
  E2E: 5000, // 5 seconds
  API: 2000, // 2 seconds
} as const;
