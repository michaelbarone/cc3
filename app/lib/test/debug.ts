import { Mock } from 'vitest';

/**
 * Debug helper functions for test files
 */

/**
 * Debug a response object by logging its status, headers, and body
 */
export async function debugResponse(response: Response) {
  try {
    // Log response details first
    const status = response.status;
    const statusText = response.statusText;
    const headers = Object.fromEntries(response.headers.entries());

    let body = '<body stream already consumed>';

    // Only attempt to read body if response is clonable
    if (response.bodyUsed === false) {
      try {
        const clone = response.clone();
        body = await clone.text();
        if (body.length > 1000) {
          body = body.substring(0, 1000) + '...';
        }
      } catch (e) {
        body = '<failed to read body: ' + (e as Error).message + '>';
      }
    }

    console.log('Response Debug:', {
      status,
      statusText,
      headers,
      body,
      bodyUsed: response.bodyUsed
    });
  } catch (e) {
    console.error('Failed to debug response:', e);
  }
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
