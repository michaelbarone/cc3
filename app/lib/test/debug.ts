import { Mock } from 'vitest';

/**
 * Debug helper functions for test files
 */

/**
 * Debug a response by logging its status and body
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

/**
 * Log the time taken for a test
 */
export function logTestTiming(testName: string, startTime: number): void {
  const duration = performance.now() - startTime;
  console.log(`Test timing - ${testName}: ${duration.toFixed(2)}ms`);
}
