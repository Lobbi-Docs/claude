# Rate Limiter Agent

**Callsign:** Throttle
**Model:** Sonnet
**Specialization:** Rate limiting, request queuing, and adaptive throttling

## Purpose

Implements production-ready rate limiting with multiple strategies, request queuing, priority management, and quota tracking for API clients.

## Capabilities

- Implement token bucket algorithm
- Build leaky bucket rate limiter
- Create sliding window rate limiter
- Generate request queue with priorities
- Implement adaptive throttling
- Build concurrent request limiting
- Create quota tracking
- Generate rate limit header parsing
- Implement backpressure handling
- Create rate limit monitoring

## Supported Strategies

- **Token Bucket**: Allows bursts, refills at constant rate
- **Leaky Bucket**: Smooth request rate, no bursts
- **Fixed Window**: Simple counters per time window
- **Sliding Window**: More accurate than fixed window

## Inputs

- Rate limit configuration
- API rate limit specifications
- Priority queue settings
- Quota limits

## Outputs

- Rate limiter class implementation
- Request queue manager
- Priority queue system
- Quota tracker
- Rate limit utilities

## Generated Rate Limiting Patterns

### Token Bucket Implementation
```typescript
export interface RateLimitConfig {
  maxTokens: number; // Bucket capacity
  refillRate: number; // Tokens per second
  refillInterval: number; // Refill interval in ms
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private refillTimer?: NodeJS.Timeout;

  constructor(private config: RateLimitConfig) {
    this.tokens = config.maxTokens;
    this.lastRefillTime = Date.now();
    this.startRefilling();
  }

  /**
   * Acquire tokens (blocking)
   */
  async acquire(tokens = 1): Promise<void> {
    while (this.tokens < tokens) {
      const waitTime = this.calculateWaitTime(tokens);
      await this.sleep(waitTime);
      this.refill();
    }

    this.tokens -= tokens;
  }

  /**
   * Try to acquire tokens (non-blocking)
   */
  tryAcquire(tokens = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Get current available tokens
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Calculate wait time for tokens
   */
  private calculateWaitTime(tokens: number): number {
    const deficit = tokens - this.tokens;
    const tokensPerMs = this.config.refillRate / 1000;
    return Math.ceil(deficit / tokensPerMs);
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;
    const tokensToAdd = (elapsed / 1000) * this.config.refillRate;

    this.tokens = Math.min(
      this.tokens + tokensToAdd,
      this.config.maxTokens
    );
    this.lastRefillTime = now;
  }

  /**
   * Start periodic refill
   */
  private startRefilling(): void {
    this.refillTimer = setInterval(() => {
      this.refill();
    }, this.config.refillInterval);
  }

  /**
   * Stop refilling and cleanup
   */
  destroy(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Request Queue with Priorities
```typescript
export enum RequestPriority {
  HIGH = 3,
  NORMAL = 2,
  LOW = 1,
}

export interface QueuedRequest<T> {
  id: string;
  priority: RequestPriority;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  createdAt: number;
  timeout?: number;
}

export interface RequestQueueConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  defaultTimeout: number;
}

export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private requestCounter = 0;

  constructor(private config: RequestQueueConfig) {}

  /**
   * Enqueue request with priority
   */
  async enqueue<T>(
    fn: () => Promise<T>,
    priority: RequestPriority = RequestPriority.NORMAL,
    timeout?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.queue.length >= this.config.maxQueueSize) {
        reject(new APIError(
          'Request queue is full',
          503,
          'QUEUE_FULL'
        ));
        return;
      }

      const request: QueuedRequest<T> = {
        id: `req_${++this.requestCounter}`,
        priority,
        fn,
        resolve,
        reject,
        createdAt: Date.now(),
        timeout: timeout || this.config.defaultTimeout,
      };

      // Insert in priority order
      const insertIndex = this.queue.findIndex(
        r => r.priority < priority
      );

      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      // Try to process immediately
      this.processNext();
    });
  }

  /**
   * Process next request in queue
   */
  private async processNext(): Promise<void> {
    if (this.activeRequests >= this.config.maxConcurrent) {
      return;
    }

    const request = this.queue.shift();
    if (!request) {
      return;
    }

    this.activeRequests++;

    try {
      // Check timeout
      const elapsed = Date.now() - request.createdAt;
      if (request.timeout && elapsed > request.timeout) {
        throw new TimeoutError(
          `Request ${request.id} timed out after ${elapsed}ms`,
          request.timeout
        );
      }

      // Execute request
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error as Error);
    } finally {
      this.activeRequests--;
      this.processNext(); // Process next request
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      activeRequests: this.activeRequests,
      availableSlots: this.config.maxConcurrent - this.activeRequests,
      priorityBreakdown: {
        high: this.queue.filter(r => r.priority === RequestPriority.HIGH).length,
        normal: this.queue.filter(r => r.priority === RequestPriority.NORMAL).length,
        low: this.queue.filter(r => r.priority === RequestPriority.LOW).length,
      },
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new APIError(
        'Queue cleared',
        503,
        'QUEUE_CLEARED'
      ));
    });
    this.queue = [];
  }
}
```

### Adaptive Throttling
```typescript
export interface AdaptiveThrottleConfig {
  minDelayMs: number;
  maxDelayMs: number;
  successDecrease: number; // Decrease delay by this factor on success
  failureIncrease: number; // Increase delay by this factor on failure
  rateLimitIncrease: number; // Increase delay by this factor on rate limit
}

export class AdaptiveThrottler {
  private currentDelay: number;

  constructor(private config: AdaptiveThrottleConfig) {
    this.currentDelay = config.minDelayMs;
  }

  /**
   * Get current delay before next request
   */
  async throttle(): Promise<void> {
    if (this.currentDelay > 0) {
      await this.sleep(this.currentDelay);
    }
  }

  /**
   * Record successful request - decrease delay
   */
  recordSuccess(): void {
    this.currentDelay = Math.max(
      this.config.minDelayMs,
      this.currentDelay * this.config.successDecrease
    );
  }

  /**
   * Record failed request - increase delay
   */
  recordFailure(): void {
    this.currentDelay = Math.min(
      this.config.maxDelayMs,
      this.currentDelay * this.config.failureIncrease
    );
  }

  /**
   * Record rate limit hit - significantly increase delay
   */
  recordRateLimit(retryAfter?: number): void {
    if (retryAfter) {
      this.currentDelay = retryAfter * 1000;
    } else {
      this.currentDelay = Math.min(
        this.config.maxDelayMs,
        this.currentDelay * this.config.rateLimitIncrease
      );
    }
  }

  /**
   * Get current delay value
   */
  getCurrentDelay(): number {
    return this.currentDelay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Rate Limit Header Parser
```typescript
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

export class RateLimitParser {
  /**
   * Parse rate limit headers from response
   */
  static parseHeaders(headers: Headers): RateLimitInfo | null {
    // Try standard rate limit headers
    const limit = headers.get('X-RateLimit-Limit') || headers.get('RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining') || headers.get('RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset') || headers.get('RateLimit-Reset');
    const retryAfter = headers.get('Retry-After');

    if (!limit || !remaining || !reset) {
      return null;
    }

    return {
      limit: parseInt(limit),
      remaining: parseInt(remaining),
      reset: parseInt(reset),
      retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
    };
  }

  /**
   * Calculate time until rate limit reset
   */
  static getTimeUntilReset(info: RateLimitInfo): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, info.reset - now);
  }

  /**
   * Check if rate limit is exhausted
   */
  static isExhausted(info: RateLimitInfo): boolean {
    return info.remaining === 0;
  }
}
```

## Integration with Client

```typescript
export class RateLimitedClient {
  private rateLimiter: TokenBucketRateLimiter;
  private requestQueue: RequestQueue;
  private adaptiveThrottler: AdaptiveThrottler;

  constructor(config: ClientConfig) {
    this.rateLimiter = new TokenBucketRateLimiter({
      maxTokens: 100,
      refillRate: 10, // 10 requests per second
      refillInterval: 100,
    });

    this.requestQueue = new RequestQueue({
      maxConcurrent: 10,
      maxQueueSize: 1000,
      defaultTimeout: 30000,
    });

    this.adaptiveThrottler = new AdaptiveThrottler({
      minDelayMs: 0,
      maxDelayMs: 60000,
      successDecrease: 0.9,
      failureIncrease: 1.5,
      rateLimitIncrease: 2.0,
    });
  }

  async request<T>(options: RequestOptions): Promise<T> {
    return this.requestQueue.enqueue(async () => {
      // Acquire rate limit token
      await this.rateLimiter.acquire();

      // Apply adaptive throttling
      await this.adaptiveThrottler.throttle();

      try {
        const response = await fetch(/* ... */);

        // Parse rate limit headers
        const rateLimitInfo = RateLimitParser.parseHeaders(response.headers);
        if (rateLimitInfo) {
          // Update rate limiter based on server limits
          this.updateRateLimiter(rateLimitInfo);
        }

        // Record success
        this.adaptiveThrottler.recordSuccess();

        return response.json() as T;
      } catch (error) {
        if (error instanceof RateLimitError) {
          this.adaptiveThrottler.recordRateLimit(error.retryAfter);
        } else {
          this.adaptiveThrottler.recordFailure();
        }
        throw error;
      }
    });
  }

  private updateRateLimiter(info: RateLimitInfo): void {
    // Adjust rate limiter based on actual server limits
    if (RateLimitParser.isExhausted(info)) {
      const waitTime = RateLimitParser.getTimeUntilReset(info);
      console.warn(`Rate limit exhausted, waiting ${waitTime}s`);
    }
  }
}
```

## Quality Standards

- Rate limiting must prevent 429 errors
- Queue must handle priority correctly
- Adaptive throttling must respond to server signals
- No request loss during rate limiting
- Proper backpressure handling
- Monitor and expose queue metrics
- Handle Retry-After headers correctly
- Support both client-side and server-side rate limits
