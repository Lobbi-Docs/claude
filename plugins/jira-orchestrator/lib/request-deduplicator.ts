/**
 * Request Deduplicator
 *
 * Detects and coalesces identical concurrent requests to reduce
 * redundant API calls and improve performance.
 *
 * Features:
 * - Request coalescing within configurable time window (default 5000ms)
 * - Single execution, broadcast result to all waiters
 * - Automatic cleanup of completed requests
 * - Metrics tracking for optimization analysis
 *
 * @module request-deduplicator
 * @version 1.0.0
 */

import * as crypto from 'crypto';

export interface DeduplicatorOptions {
  /** Default deduplication window in milliseconds (default: 5000) */
  defaultWindowMs: number;

  /** Maximum number of concurrent waiters per request (default: 100) */
  maxWaiters: number;

  /** Custom hash function for request identification */
  hashFunction?: (method: string, params: unknown) => string;
}

export interface PendingRequest<T> {
  /** Request hash identifier */
  hash: string;

  /** Promise for the executing request */
  promise: Promise<T>;

  /** Number of subscribers waiting for this request */
  subscribers: number;

  /** Request start timestamp */
  startTime: number;

  /** Window expiration timestamp */
  windowEnd: number;

  /** Result once resolved */
  result?: T;

  /** Error if request failed */
  error?: Error;
}

export interface DeduplicatorMetrics {
  /** Total requests processed */
  totalRequests: number;

  /** Requests deduplicated (coalesced) */
  deduplicated: number;

  /** Estimated time saved (ms) */
  savedMs: number;

  /** Currently pending requests */
  currentPending: number;

  /** Average wait time for deduplicated requests (ms) */
  avgWaitTime: number;

  /** Deduplication rate (0-1) */
  deduplicationRate: number;
}

/**
 * Request deduplicator with configurable windows
 */
export class RequestDeduplicator {
  private pending: Map<string, PendingRequest<any>> = new Map();
  private options: Required<DeduplicatorOptions>;
  private metrics = {
    totalRequests: 0,
    deduplicated: 0,
    savedMs: 0,
    totalWaitTime: 0,
  };
  private pendingLocks: Map<string, Promise<void>> = new Map();

  constructor(options?: Partial<DeduplicatorOptions>) {
    this.options = {
      defaultWindowMs: options?.defaultWindowMs ?? 5000,
      maxWaiters: options?.maxWaiters ?? 100,
      hashFunction: options?.hashFunction ?? RequestDeduplicator.hashRequest,
    };
  }

  /**
   * Check if request is currently pending
   */
  isPending(hash: string): boolean {
    const pending = this.pending.get(hash);
    if (!pending) return false;

    // Check if window has expired
    if (Date.now() > pending.windowEnd) {
      this.pending.delete(hash);
      return false;
    }

    return true;
  }

  /**
   * Execute request with deduplication
   *
   * If an identical request is pending within the window, waits for
   * that request to complete. Otherwise, executes the request.
   */
  async execute<T>(
    hash: string,
    executor: () => Promise<T>,
    windowMs?: number
  ): Promise<T> {
    const effectiveWindow = windowMs ?? this.options.defaultWindowMs;
    const startTime = Date.now();

    this.metrics.totalRequests++;

    // Wait for any in-flight registration to complete (atomic check-and-set)
    while (this.pendingLocks.has(hash)) {
      await this.pendingLocks.get(hash);
    }

    // Atomic check-and-set: Check if request is already pending
    const existing = this.pending.get(hash);
    if (existing && Date.now() <= existing.windowEnd) {
      // Check waiter limit
      if (existing.subscribers >= this.options.maxWaiters) {
        console.warn(
          `⚠️ Request ${hash.substring(0, 8)} exceeded max waiters (${this.options.maxWaiters}), executing new request`
        );
      } else {
        // Deduplicate: wait for existing request
        existing.subscribers++;
        this.metrics.deduplicated++;

        try {
          const result = await existing.promise;
          const waitTime = Date.now() - startTime;
          this.metrics.totalWaitTime += waitTime;

          console.log(
            `🔄 Deduplicated request ${hash.substring(0, 8)} (${existing.subscribers} subscribers, ${waitTime}ms wait)`
          );

          return result;
        } catch (error) {
          // Propagate error from original request
          throw error;
        }
      }
    }

    // Create a lock to prevent concurrent registration
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.pendingLocks.set(hash, lockPromise);

    try {
      // Double-check after acquiring lock (in case another request registered while we waited)
      const existingAfterLock = this.pending.get(hash);
      if (existingAfterLock && Date.now() <= existingAfterLock.windowEnd) {
        // Another request registered while we were waiting for the lock
        existingAfterLock.subscribers++;
        this.metrics.deduplicated++;

        try {
          const result = await existingAfterLock.promise;
          const waitTime = Date.now() - startTime;
          this.metrics.totalWaitTime += waitTime;

          console.log(
            `🔄 Deduplicated request ${hash.substring(0, 8)} after lock (${existingAfterLock.subscribers} subscribers, ${waitTime}ms wait)`
          );

          return result;
        } catch (error) {
          throw error;
        }
      }

      // Execute new request
      const promise = this.executeRequest(hash, executor, effectiveWindow);

      // Store pending request
      const pendingRequest: PendingRequest<T> = {
        hash,
        promise,
        subscribers: 1,
        startTime,
        windowEnd: startTime + effectiveWindow,
      };

      this.pending.set(hash, pendingRequest);

      try {
        const result = await promise;

        // Store result briefly for late arrivals
        pendingRequest.result = result;

        return result;
      } catch (error) {
        // Store error for propagation
        pendingRequest.error = error as Error;
        throw error;
      }
    } finally {
      // Release the lock
      releaseLock!();
      this.pendingLocks.delete(hash);
    }
  }

  /**
   * Execute and track request
   */
  private async executeRequest<T>(
    hash: string,
    executor: () => Promise<T>,
    windowMs: number
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await executor();
      const duration = Date.now() - startTime;

      console.log(
        `✅ Executed request ${hash.substring(0, 8)} (${duration}ms, window: ${windowMs}ms)`
      );

      // Cleanup after window expires
      setTimeout(() => {
        const pending = this.pending.get(hash);
        if (pending && pending.startTime === startTime) {
          // Calculate saved time for metrics
          const savedTime = duration * (pending.subscribers - 1);
          this.metrics.savedMs += savedTime;

          this.pending.delete(hash);
        }
      }, windowMs);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(
        `❌ Request ${hash.substring(0, 8)} failed after ${duration}ms:`,
        error
      );

      // Cleanup immediately on error
      this.pending.delete(hash);

      throw error;
    }
  }

  /**
   * Wait for pending request (if exists)
   */
  async waitFor<T>(hash: string): Promise<T> {
    const pending = this.pending.get(hash);

    if (!pending || Date.now() > pending.windowEnd) {
      throw new Error(`No pending request found for hash: ${hash}`);
    }

    pending.subscribers++;
    this.metrics.deduplicated++;

    return pending.promise as Promise<T>;
  }

  /**
   * Generate hash from method and params
   */
  static hashRequest(method: string, params: unknown): string {
    const normalized = JSON.stringify({ method, params }, Object.keys(params as any).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get current metrics
   */
  getMetrics(): DeduplicatorMetrics {
    const deduplicationRate =
      this.metrics.totalRequests > 0
        ? this.metrics.deduplicated / this.metrics.totalRequests
        : 0;

    const avgWaitTime =
      this.metrics.deduplicated > 0
        ? this.metrics.totalWaitTime / this.metrics.deduplicated
        : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      deduplicated: this.metrics.deduplicated,
      savedMs: this.metrics.savedMs,
      currentPending: this.pending.size,
      avgWaitTime,
      deduplicationRate,
    };
  }

  /**
   * Clear all pending requests (for testing/reset)
   */
  clear(): void {
    this.pending.clear();
    this.pendingLocks.clear();
  }

  /**
   * Get debug information about pending requests
   */
  getPendingInfo(): Array<{ hash: string; subscribers: number; age: number }> {
    const now = Date.now();
    return Array.from(this.pending.values()).map((req) => ({
      hash: req.hash.substring(0, 8),
      subscribers: req.subscribers,
      age: now - req.startTime,
    }));
  }
}

export default RequestDeduplicator;
