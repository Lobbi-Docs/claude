/**
 * Retry Utility Module
 * Provides configurable retry logic for all service clients
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to delays (default: true) */
  jitter?: boolean;
  /** Error types that should not trigger retry */
  nonRetryableErrors?: string[];
  /** Callback for logging retry attempts */
  onRetry?: (error: Error, attempt: number, delay: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  nonRetryableErrors: ['INVALID_ARGUMENT', 'NOT_FOUND', 'PERMISSION_DENIED', 'UNAUTHENTICATED'],
  onRetry: () => {},
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  let delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

  if (jitter) {
    // Add random jitter (±25%)
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay = delay * jitterFactor;
  }

  return Math.min(delay, maxDelay);
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: Error, nonRetryableErrors: string[]): boolean {
  const errorMessage = error.message.toUpperCase();
  const errorName = error.name?.toUpperCase() || '';

  // Check for non-retryable error codes
  for (const code of nonRetryableErrors) {
    if (errorMessage.includes(code) || errorName.includes(code)) {
      return false;
    }
  }

  // Common retryable error patterns
  const retryablePatterns = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'SOCKET HANG UP',
    'CONNECTION RESET',
    'TIMEOUT',
    'TEMPORARILY UNAVAILABLE',
    'SERVICE UNAVAILABLE',
    'TOO MANY REQUESTS',
    '429',
    '500',
    '502',
    '503',
    '504',
  ];

  return retryablePatterns.some(pattern =>
    errorMessage.includes(pattern) || errorName.includes(pattern)
  );
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => await fetchData(),
 *   { maxRetries: 5, initialDelay: 500 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const isLastAttempt = attempt > opts.maxRetries;
      const canRetry = isRetryableError(lastError, opts.nonRetryableErrors);

      if (isLastAttempt || !canRetry) {
        throw lastError;
      }

      // Calculate and apply delay
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier,
        opts.jitter
      );

      opts.onRetry(lastError, attempt, delay);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Wrap an async function to add retry capability
 *
 * @param fn - The async function to wrap
 * @param options - Retry configuration options
 * @returns A wrapped function with retry logic
 *
 * @example
 * ```typescript
 * const fetchWithRetry = wrapWithRetry(fetchData, { maxRetries: 3 });
 * const result = await fetchWithRetry(arg1, arg2);
 * ```
 */
export function wrapWithRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}

/**
 * Execute multiple operations in parallel with individual retry logic
 *
 * @param operations - Array of async functions to execute
 * @param options - Retry configuration options
 * @returns Array of settled results (fulfilled or rejected)
 *
 * @example
 * ```typescript
 * const results = await withRetryAll([
 *   () => fetchEntity('entity1'),
 *   () => fetchEntity('entity2'),
 * ], { maxRetries: 2 });
 * ```
 */
export async function withRetryAll<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(
    operations.map(op => withRetry(op, options))
  );
}

/**
 * Execute multiple operations in parallel, returning first N successful results
 *
 * @param operations - Array of async functions to execute
 * @param count - Number of successful results needed
 * @param options - Retry configuration options
 * @returns Array of first N successful results
 * @throws If fewer than count operations succeed
 */
export async function withRetryRace<T>(
  operations: Array<() => Promise<T>>,
  count: number = 1,
  options: RetryOptions = {}
): Promise<T[]> {
  const results = await withRetryAll(operations, options);
  const successes = results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
    .map(r => r.value);

  if (successes.length < count) {
    const failures = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => r.reason);
    throw new Error(
      `Only ${successes.length} of ${count} required operations succeeded. ` +
      `Failures: ${failures.map(f => f.message || f).join('; ')}`
    );
  }

  return successes.slice(0, count);
}

/**
 * Create a circuit breaker wrapped retry function
 * Prevents overwhelming a failing service
 */
export interface CircuitBreakerOptions extends RetryOptions {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time to wait before attempting to close circuit in ms (default: 30000) */
  resetTimeout?: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

export function createCircuitBreaker<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: CircuitBreakerOptions = {}
): {
  execute: (...args: TArgs) => Promise<TResult>;
  getState: () => CircuitState;
  reset: () => void;
} {
  const {
    failureThreshold = 5,
    resetTimeout = 30000,
    ...retryOptions
  } = options;

  let state: CircuitState = 'closed';
  let failureCount = 0;
  let lastFailureTime = 0;

  const execute = async (...args: TArgs): Promise<TResult> => {
    // Check if circuit should transition from open to half-open
    if (state === 'open') {
      const timeSinceFailure = Date.now() - lastFailureTime;
      if (timeSinceFailure >= resetTimeout) {
        state = 'half-open';
      } else {
        throw new Error(
          `Circuit breaker is open. Retry after ${Math.ceil((resetTimeout - timeSinceFailure) / 1000)}s`
        );
      }
    }

    try {
      const result = await withRetry(() => fn(...args), retryOptions);

      // Success - reset circuit
      if (state === 'half-open') {
        state = 'closed';
      }
      failureCount = 0;

      return result;
    } catch (error) {
      failureCount++;
      lastFailureTime = Date.now();

      if (failureCount >= failureThreshold) {
        state = 'open';
      }

      throw error;
    }
  };

  return {
    execute,
    getState: () => state,
    reset: () => {
      state = 'closed';
      failureCount = 0;
      lastFailureTime = 0;
    },
  };
}
