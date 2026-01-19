/**
 * Tests for Request Deduplicator
 *
 * Tests cover:
 * - Request coalescing for identical concurrent requests
 * - Cache key generation consistency
 * - Window expiration
 * - Race condition handling
 * - Metrics tracking
 * - Error propagation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestDeduplicator } from '../lib/request-deduplicator';

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator({
      defaultWindowMs: 5000,
      maxWaiters: 100,
    });
  });

  afterEach(() => {
    deduplicator.clear();
  });

  describe('coalescing', () => {
    it('should deduplicate identical concurrent requests', async () => {
      let executionCount = 0;
      const executor = async () => {
        executionCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { result: 'success', count: executionCount };
      };

      const hash = RequestDeduplicator.hashRequest('test-method', { param: 'value' });

      // Launch 5 concurrent requests with same hash
      const promises = Array(5).fill(null).map(() =>
        deduplicator.execute(hash, executor)
      );

      const results = await Promise.all(promises);

      // Should only execute once
      expect(executionCount).toBe(1);

      // All should get the same result
      results.forEach(result => {
        expect(result).toEqual({ result: 'success', count: 1 });
      });

      // Check metrics
      const metrics = deduplicator.getMetrics();
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.deduplicated).toBe(4); // 4 out of 5 were deduplicated
      expect(metrics.deduplicationRate).toBeCloseTo(0.8, 2);
    });

    it('should generate consistent cache keys', () => {
      const method = 'test-method';
      const params = { a: 1, b: 2, c: 3 };

      const hash1 = RequestDeduplicator.hashRequest(method, params);
      const hash2 = RequestDeduplicator.hashRequest(method, params);
      const hash3 = RequestDeduplicator.hashRequest(method, { b: 2, a: 1, c: 3 }); // Different order

      expect(hash1).toBe(hash2);
      expect(hash1).toBe(hash3); // Should handle property order
    });

    it('should generate different keys for different requests', () => {
      const hash1 = RequestDeduplicator.hashRequest('method1', { param: 'value1' });
      const hash2 = RequestDeduplicator.hashRequest('method1', { param: 'value2' });
      const hash3 = RequestDeduplicator.hashRequest('method2', { param: 'value1' });

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });

    it('should expire entries after window', async () => {
      const shortDedup = new RequestDeduplicator({
        defaultWindowMs: 100, // 100ms window
      });

      let executionCount = 0;
      const executor = async () => {
        executionCount++;
        return { count: executionCount };
      };

      const hash = 'test-hash';

      // First execution
      const result1 = await shortDedup.execute(hash, executor);
      expect(result1.count).toBe(1);
      expect(executionCount).toBe(1);

      // Immediate second execution (within window) - should deduplicate
      const result2 = await shortDedup.execute(hash, executor);
      expect(result2.count).toBe(1);
      expect(executionCount).toBe(1);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Third execution (after window) - should execute again
      const result3 = await shortDedup.execute(hash, executor);
      expect(result3.count).toBe(2);
      expect(executionCount).toBe(2);

      shortDedup.clear();
    });

    it('should handle custom window sizes', async () => {
      let executionCount = 0;
      const executor = async () => {
        executionCount++;
        return { count: executionCount };
      };

      const hash = 'custom-window-hash';

      // Execute with 200ms custom window
      await deduplicator.execute(hash, executor, 200);
      expect(executionCount).toBe(1);

      // Wait 100ms (still within window)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still deduplicate
      await deduplicator.execute(hash, executor, 200);
      expect(executionCount).toBe(1);

      // Wait another 150ms (total 250ms, beyond window)
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should execute again
      await deduplicator.execute(hash, executor, 200);
      expect(executionCount).toBe(2);
    });

    it('should check isPending correctly', async () => {
      const hash = 'pending-check';
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      };

      expect(deduplicator.isPending(hash)).toBe(false);

      const promise = deduplicator.execute(hash, executor);

      // Should be pending during execution
      expect(deduplicator.isPending(hash)).toBe(true);

      await promise;

      // Should still be pending within window
      expect(deduplicator.isPending(hash)).toBe(true);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 5100));

      expect(deduplicator.isPending(hash)).toBe(false);
    });
  });

  describe('race condition handling', () => {
    it('should handle high concurrency safely', async () => {
      let executionCount = 0;
      const executor = async () => {
        executionCount++;
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 50));
        return { count: executionCount };
      };

      const hash = 'concurrent-test';

      // Launch 100 concurrent requests
      const promises = Array(100).fill(null).map((_, i) =>
        deduplicator.execute(hash, executor).catch(err => ({
          error: err.message,
          index: i
        }))
      );

      const results = await Promise.all(promises);

      // Should only execute once
      expect(executionCount).toBe(1);

      // All successful results should be identical
      const successResults = results.filter(r => !('error' in r));
      successResults.forEach(result => {
        expect(result).toEqual({ count: 1 });
      });

      const metrics = deduplicator.getMetrics();
      expect(metrics.deduplicated).toBe(99);
    });

    it('should respect max waiters limit', async () => {
      const limitedDedup = new RequestDeduplicator({
        maxWaiters: 5,
      });

      let executionCount = 0;
      const executor = async () => {
        executionCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { count: executionCount };
      };

      const hash = 'max-waiters-test';

      // Launch 10 requests (limit is 5)
      const promises = Array(10).fill(null).map(() =>
        limitedDedup.execute(hash, executor)
      );

      await Promise.all(promises);

      // Should execute multiple times due to waiter limit
      expect(executionCount).toBeGreaterThan(1);

      limitedDedup.clear();
    });

    it('should handle errors in concurrent requests', async () => {
      let callCount = 0;
      const executor = async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Executor failed');
      };

      const hash = 'error-concurrent-test';

      const promises = Array(5).fill(null).map(() =>
        deduplicator.execute(hash, executor)
      );

      // All should reject with the same error
      await expect(Promise.all(promises)).rejects.toThrow('Executor failed');

      // Should only execute once
      expect(callCount).toBe(1);
    });

    it('should handle mixed success and error scenarios', async () => {
      let attempt = 0;
      const executor = async () => {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 50));
        if (attempt === 1) {
          throw new Error('First attempt failed');
        }
        return { attempt };
      };

      const hash = 'mixed-test';

      // First batch - will fail
      const firstBatch = Array(3).fill(null).map(() =>
        deduplicator.execute(hash, executor).catch(e => e.message)
      );

      const firstResults = await Promise.all(firstBatch);
      firstResults.forEach(result => {
        expect(result).toBe('First attempt failed');
      });

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 5100));

      // Second batch - will succeed
      const secondBatch = Array(3).fill(null).map(() =>
        deduplicator.execute(hash, executor)
      );

      const secondResults = await Promise.all(secondBatch);
      secondResults.forEach(result => {
        expect(result).toEqual({ attempt: 2 });
      });

      expect(attempt).toBe(2);
    });
  });

  describe('metrics tracking', () => {
    it('should track total requests', async () => {
      const executor = async () => 'result';
      const hash1 = 'hash1';
      const hash2 = 'hash2';

      await deduplicator.execute(hash1, executor);
      await deduplicator.execute(hash1, executor);
      await deduplicator.execute(hash2, executor);

      const metrics = deduplicator.getMetrics();
      expect(metrics.totalRequests).toBe(3);
    });

    it('should track deduplication rate', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
      };

      const hash = 'rate-test';

      // Make 10 concurrent requests
      const promises = Array(10).fill(null).map(() =>
        deduplicator.execute(hash, executor)
      );

      await Promise.all(promises);

      const metrics = deduplicator.getMetrics();
      expect(metrics.totalRequests).toBe(10);
      expect(metrics.deduplicated).toBe(9);
      expect(metrics.deduplicationRate).toBeCloseTo(0.9, 2);
    });

    it('should track average wait time', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      const hash = 'wait-time-test';

      const promises = Array(5).fill(null).map(() =>
        deduplicator.execute(hash, executor)
      );

      await Promise.all(promises);

      const metrics = deduplicator.getMetrics();
      expect(metrics.avgWaitTime).toBeGreaterThan(0);
      expect(metrics.avgWaitTime).toBeLessThan(200); // Should be less than total execution
    });

    it('should track saved time', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      const hash = 'saved-time-test';

      const promises = Array(5).fill(null).map(() =>
        deduplicator.execute(hash, executor)
      );

      await Promise.all(promises);

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 5100));

      const metrics = deduplicator.getMetrics();
      expect(metrics.savedMs).toBeGreaterThan(0); // Should have saved time
    });

    it('should track current pending requests', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'result';
      };

      const hash1 = 'pending1';
      const hash2 = 'pending2';

      const promise1 = deduplicator.execute(hash1, executor);
      const promise2 = deduplicator.execute(hash2, executor);

      // Check while pending
      const metricsDuring = deduplicator.getMetrics();
      expect(metricsDuring.currentPending).toBe(2);

      await Promise.all([promise1, promise2]);

      // Check after completion (still within window)
      const metricsAfter = deduplicator.getMetrics();
      expect(metricsAfter.currentPending).toBe(2);
    });
  });

  describe('error propagation', () => {
    it('should propagate executor errors to all waiters', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw new Error('Test error');
      };

      const hash = 'error-prop-test';

      const promises = Array(3).fill(null).map(() =>
        deduplicator.execute(hash, executor)
      );

      for (const promise of promises) {
        await expect(promise).rejects.toThrow('Test error');
      }
    });

    it('should clean up on error', async () => {
      const executor = async () => {
        throw new Error('Immediate error');
      };

      const hash = 'cleanup-test';

      await expect(
        deduplicator.execute(hash, executor)
      ).rejects.toThrow('Immediate error');

      // Should not be pending after error
      expect(deduplicator.isPending(hash)).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should provide pending info', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      const hash1 = 'info1';
      const hash2 = 'info2';

      const promise1 = deduplicator.execute(hash1, executor);
      const promise2 = deduplicator.execute(hash2, executor);

      const info = deduplicator.getPendingInfo();

      expect(info.length).toBe(2);
      expect(info[0].subscribers).toBe(1);
      expect(info[0].age).toBeGreaterThanOrEqual(0);

      await Promise.all([promise1, promise2]);
    });

    it('should clear all pending requests', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      await deduplicator.execute('hash1', executor);
      await deduplicator.execute('hash2', executor);

      deduplicator.clear();

      const metrics = deduplicator.getMetrics();
      expect(metrics.currentPending).toBe(0);
    });

    it('should handle waitFor for existing pending requests', async () => {
      const executor = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'result';
      };

      const hash = 'waitfor-test';

      const executePromise = deduplicator.execute(hash, executor);

      // Wait a bit to ensure execution has started
      await new Promise(resolve => setTimeout(resolve, 20));

      const waitPromise = deduplicator.waitFor(hash);

      const [executeResult, waitResult] = await Promise.all([executePromise, waitPromise]);

      expect(executeResult).toBe('result');
      expect(waitResult).toBe('result');
    });

    it('should throw error when waiting for non-existent request', async () => {
      await expect(
        deduplicator.waitFor('non-existent')
      ).rejects.toThrow('No pending request found');
    });
  });
});
