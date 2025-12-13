/**
 * Rate Limiter Module
 * Provides rate limiting for API calls, especially embedding operations
 */

export interface RateLimiterOptions {
  /** Maximum number of requests per window (default: 10) */
  maxRequests?: number;
  /** Time window in milliseconds (default: 1000 = 1 second) */
  windowMs?: number;
  /** Maximum concurrent requests (default: 5) */
  maxConcurrent?: number;
  /** Whether to queue requests that exceed limit (default: true) */
  queueExcess?: boolean;
  /** Maximum queue size (default: 100) */
  maxQueueSize?: number;
  /** Timeout for queued requests in ms (default: 60000) */
  queueTimeout?: number;
}

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Token Bucket Rate Limiter
 * Provides smooth rate limiting with burst capability
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private currentConcurrent: number;
  private queue: QueuedRequest<unknown>[];
  private processing: boolean;

  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private readonly maxConcurrent: number;
  private readonly maxQueueSize: number;
  private readonly queueTimeout: number;
  private readonly queueExcess: boolean;

  constructor(options: RateLimiterOptions = {}) {
    const {
      maxRequests = 10,
      windowMs = 1000,
      maxConcurrent = 5,
      queueExcess = true,
      maxQueueSize = 100,
      queueTimeout = 60000,
    } = options;

    this.maxTokens = maxRequests;
    this.refillRate = maxRequests / windowMs;
    this.maxConcurrent = maxConcurrent;
    this.queueExcess = queueExcess;
    this.maxQueueSize = maxQueueSize;
    this.queueTimeout = queueTimeout;

    this.tokens = maxRequests;
    this.lastRefill = Date.now();
    this.currentConcurrent = 0;
    this.queue = [];
    this.processing = false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Check if a request can proceed
   */
  private canProceed(): boolean {
    this.refillTokens();
    return this.tokens >= 1 && this.currentConcurrent < this.maxConcurrent;
  }

  /**
   * Consume a token and increment concurrent count
   */
  private acquire(): void {
    this.tokens -= 1;
    this.currentConcurrent += 1;
  }

  /**
   * Release concurrent slot
   */
  private release(): void {
    this.currentConcurrent = Math.max(0, this.currentConcurrent - 1);
    this.processQueue();
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.canProceed()) {
      const request = this.queue.shift();
      if (!request) continue;

      // Check for timeout
      const elapsed = Date.now() - request.timestamp;
      if (elapsed >= this.queueTimeout) {
        request.reject(new Error('Request timed out in rate limiter queue'));
        continue;
      }

      this.acquire();
      this.executeRequest(request);
    }

    this.processing = false;
  }

  /**
   * Execute a queued request
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      const result = await (request.fn as () => Promise<T>)();
      request.resolve(result);
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.release();
    }
  }

  /**
   * Execute a function with rate limiting
   *
   * @param fn - The async function to execute
   * @returns The result of the function
   * @throws If rate limit exceeded and queueing disabled, or queue is full
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If we can proceed immediately, do so
    if (this.canProceed()) {
      this.acquire();
      try {
        return await fn();
      } finally {
        this.release();
      }
    }

    // Otherwise, queue if enabled
    if (!this.queueExcess) {
      throw new Error('Rate limit exceeded');
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Rate limiter queue is full');
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Execute multiple functions with rate limiting
   * Returns settled results for all operations
   */
  async executeAll<T>(
    fns: Array<() => Promise<T>>
  ): Promise<PromiseSettledResult<T>[]> {
    return Promise.allSettled(fns.map(fn => this.execute(fn)));
  }

  /**
   * Get current rate limiter status
   */
  getStatus(): {
    availableTokens: number;
    currentConcurrent: number;
    queueLength: number;
    maxTokens: number;
    maxConcurrent: number;
  } {
    this.refillTokens();
    return {
      availableTokens: Math.floor(this.tokens),
      currentConcurrent: this.currentConcurrent,
      queueLength: this.queue.length,
      maxTokens: this.maxTokens,
      maxConcurrent: this.maxConcurrent,
    };
  }

  /**
   * Clear the queue and reject all pending requests
   */
  clearQueue(): void {
    const error = new Error('Rate limiter queue cleared');
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.reject(error);
      }
    }
  }

  /**
   * Wait until rate limit allows execution
   */
  async waitForSlot(): Promise<void> {
    if (this.canProceed()) {
      return;
    }

    // Calculate wait time based on token refill rate
    const tokensNeeded = 1 - this.tokens;
    const waitTime = Math.ceil(tokensNeeded / this.refillRate);

    await new Promise(resolve => setTimeout(resolve, Math.max(100, waitTime)));
    return this.waitForSlot();
  }
}

/**
 * Create a rate-limited wrapper for any async function
 */
export function withRateLimit<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  limiter: RateLimiter
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => limiter.execute(() => fn(...args));
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /**
   * Rate limiter for embedding API calls
   * Conservative: 5 requests/second, max 3 concurrent
   */
  embedding: new RateLimiter({
    maxRequests: 5,
    windowMs: 1000,
    maxConcurrent: 3,
    queueExcess: true,
    maxQueueSize: 500,
  }),

  /**
   * Rate limiter for LLM generation calls
   * More restrictive: 2 requests/second, max 2 concurrent
   */
  generation: new RateLimiter({
    maxRequests: 2,
    windowMs: 1000,
    maxConcurrent: 2,
    queueExcess: true,
    maxQueueSize: 50,
  }),

  /**
   * Rate limiter for Home Assistant API calls
   * Moderate: 10 requests/second, max 5 concurrent
   */
  homeAssistant: new RateLimiter({
    maxRequests: 10,
    windowMs: 1000,
    maxConcurrent: 5,
    queueExcess: true,
    maxQueueSize: 100,
  }),

  /**
   * Rate limiter for database operations
   * Liberal: 20 requests/second, max 10 concurrent
   */
  database: new RateLimiter({
    maxRequests: 20,
    windowMs: 1000,
    maxConcurrent: 10,
    queueExcess: true,
    maxQueueSize: 200,
  }),
};
