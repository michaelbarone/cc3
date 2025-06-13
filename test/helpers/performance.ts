/**
 * Performance monitoring utilities for tests
 */

/**
 * Performance thresholds for different test types
 */
export const THRESHOLDS = {
  UNIT: 100,      // 100ms
  INTEGRATION: 1000, // 1 second
  E2E: 5000,      // 5 seconds
  API: 2000       // 2 seconds
} as const;

/**
 * Timer class for measuring test performance
 */
export class Timer {
  private startTime: number;
  private endTime: number | null = null;
  private name: string;

  constructor(name: string) {
    this.startTime = performance.now();
    this.name = name;
  }

  /**
   * End the timer and log the elapsed time
   */
  public end(): number {
    this.endTime = performance.now();
    const elapsed = this.elapsed();
    console.log(`[TIMER] ${this.name}: ${elapsed.toFixed(2)}ms`);
    return elapsed;
  }

  /**
   * Get the elapsed time in milliseconds
   */
  public elapsed(): number {
    const endTime = this.endTime || performance.now();
    return endTime - this.startTime;
  }
}

/**
 * Measure the execution time of a function
 * @param name Name of the timer
 * @returns Timer instance
 */
export const measureTestTime = (name: string): Timer => {
  return new Timer(name);
};

/**
 * Measure the execution time of an async function
 * @param name Name of the timer
 * @param fn Function to measure
 * @returns Result of the function
 */
export const measureAsyncTime = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const timer = measureTestTime(name);
  try {
    return await fn();
  } finally {
    timer.end();
  }
};

/**
 * Check if a test exceeds the threshold
 * @param elapsed Elapsed time in milliseconds
 * @param threshold Threshold in milliseconds
 * @returns Whether the test exceeds the threshold
 */
export const exceedsThreshold = (
  elapsed: number,
  threshold: number
): boolean => {
  return elapsed > threshold;
};

/**
 * Format a performance report
 * @param timers Map of timer names to elapsed times
 * @returns Formatted performance report
 */
export const formatPerformanceReport = (
  timers: Record<string, number>
): string => {
  let report = 'Performance Report:\n';

  Object.entries(timers)
    .sort(([, a], [, b]) => b - a)
    .forEach(([name, elapsed]) => {
      report += `  ${name}: ${elapsed.toFixed(2)}ms\n`;
    });

  return report;
};
