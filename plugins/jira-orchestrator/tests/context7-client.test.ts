/**
 * Tests for Context7 Client with SQLite Caching
 *
 * Tests cover:
 * - Caching behavior (hits, misses, TTL)
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Request deduplication integration
 * - Metrics tracking
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Context7Client, Context7QueryResult, Context7ClientOptions } from '../lib/context7-client';
import { RequestDeduplicator } from '../lib/request-deduplicator';
import * as fs from 'fs';
import * as path from 'path';

describe('Context7Client', () => {
  let client: Context7Client;
  let mockMcpCaller: ReturnType<typeof vi.fn>;
  const testCachePath = './sessions/cache/test-context7.db';

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testCachePath)) {
      fs.unlinkSync(testCachePath);
    }

    // Create mock MCP caller
    mockMcpCaller = vi.fn();

    // Create client with test configuration
    client = new Context7Client({
      cachePath: testCachePath,
      cacheTtlLibraryMs: 1000, // 1 second for faster tests
      cacheTtlDocsMs: 500, // 0.5 seconds for faster tests
      maxRetries: 3,
      timeoutMs: 1000,
      mcpCaller: mockMcpCaller,
    });
  });

  afterEach(() => {
    client.close();

    // Clean up test database
    if (fs.existsSync(testCachePath)) {
      fs.unlinkSync(testCachePath);
    }
  });

  describe('caching', () => {
    it('should return cached result on cache hit', async () => {
      const libraryName = 'test-lib';
      const query = 'test query';
      const expectedLibraryId = '/org/test-lib';

      // First call - cache miss
      mockMcpCaller.mockResolvedValueOnce({
        libraryId: expectedLibraryId,
      });

      const result1 = await client.resolveLibraryId(libraryName, query);
      expect(result1.cached).toBe(false);
      expect(result1.libraryId).toBe(expectedLibraryId);
      expect(mockMcpCaller).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await client.resolveLibraryId(libraryName, query);
      expect(result2.cached).toBe(true);
      expect(result2.libraryId).toBe(expectedLibraryId);
      expect(result2.cacheAgeMs).toBeGreaterThanOrEqual(0);
      expect(mockMcpCaller).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should call MCP on cache miss', async () => {
      const libraryName = 'new-lib';
      const query = 'new query';
      const expectedLibraryId = '/org/new-lib';

      mockMcpCaller.mockResolvedValueOnce({
        libraryId: expectedLibraryId,
      });

      const result = await client.resolveLibraryId(libraryName, query);

      expect(result.cached).toBe(false);
      expect(result.libraryId).toBe(expectedLibraryId);
      expect(mockMcpCaller).toHaveBeenCalledTimes(1);
      expect(mockMcpCaller).toHaveBeenCalledWith('resolve-library-id', {
        libraryName,
        query,
      });
    });

    it('should respect TTL expiration', async () => {
      const libraryName = 'ttl-test';
      const query = 'ttl query';

      mockMcpCaller
        .mockResolvedValueOnce({ libraryId: '/org/ttl-test-v1' })
        .mockResolvedValueOnce({ libraryId: '/org/ttl-test-v2' });

      // First call
      const result1 = await client.resolveLibraryId(libraryName, query);
      expect(result1.libraryId).toBe('/org/ttl-test-v1');
      expect(result1.cached).toBe(false);

      // Second call immediately - should hit cache
      const result2 = await client.resolveLibraryId(libraryName, query);
      expect(result2.libraryId).toBe('/org/ttl-test-v1');
      expect(result2.cached).toBe(true);

      // Wait for TTL to expire (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Third call after TTL - should be cache miss
      const result3 = await client.resolveLibraryId(libraryName, query);
      expect(result3.libraryId).toBe('/org/ttl-test-v2');
      expect(result3.cached).toBe(false);
      expect(mockMcpCaller).toHaveBeenCalledTimes(2);
    });

    it('should cache documentation queries separately', async () => {
      const libraryId = '/org/test';
      const query = 'How to use this?';
      const expectedDocs = 'Documentation content here';

      mockMcpCaller.mockResolvedValueOnce({
        content: [{ text: expectedDocs }],
      });

      const result1 = await client.queryDocs(libraryId, query);
      expect(result1.cached).toBe(false);
      expect(result1.docs).toBe(expectedDocs);

      const result2 = await client.queryDocs(libraryId, query);
      expect(result2.cached).toBe(true);
      expect(result2.docs).toBe(expectedDocs);
      expect(mockMcpCaller).toHaveBeenCalledTimes(1);
    });

    it('should clear cache on demand', async () => {
      const libraryName = 'clear-test';
      const query = 'clear query';

      mockMcpCaller
        .mockResolvedValueOnce({ libraryId: '/org/clear-test-v1' })
        .mockResolvedValueOnce({ libraryId: '/org/clear-test-v2' });

      // Cache a result
      await client.resolveLibraryId(libraryName, query);

      // Clear cache
      client.clearCache();

      // Next call should be cache miss
      const result = await client.resolveLibraryId(libraryName, query);
      expect(result.cached).toBe(false);
      expect(result.libraryId).toBe('/org/clear-test-v2');
      expect(mockMcpCaller).toHaveBeenCalledTimes(2);
    });
  });

  describe('retry logic', () => {
    it('should retry on transient failures', async () => {
      const libraryName = 'retry-test';
      const query = 'retry query';

      mockMcpCaller
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ libraryId: '/org/retry-test' });

      const result = await client.resolveLibraryId(libraryName, query);

      expect(result.libraryId).toBe('/org/retry-test');
      expect(mockMcpCaller).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const libraryName = 'backoff-test';
      const query = 'backoff query';
      const callTimes: number[] = [];

      mockMcpCaller.mockImplementation(async () => {
        callTimes.push(Date.now());
        if (callTimes.length < 3) {
          throw new Error('Transient error');
        }
        return { libraryId: '/org/backoff-test' };
      });

      await client.resolveLibraryId(libraryName, query);

      expect(callTimes.length).toBe(3);

      // Check backoff delays (1s, 2s between retries)
      // Allow 100ms margin for timing
      const delay1 = callTimes[1] - callTimes[0];
      const delay2 = callTimes[2] - callTimes[1];

      expect(delay1).toBeGreaterThanOrEqual(900);
      expect(delay1).toBeLessThanOrEqual(1100);
      expect(delay2).toBeGreaterThanOrEqual(1900);
      expect(delay2).toBeLessThanOrEqual(2100);
    });

    it('should stop after max retries', async () => {
      const libraryName = 'max-retry-test';
      const query = 'max retry query';

      mockMcpCaller.mockRejectedValue(new Error('Permanent error'));

      await expect(
        client.resolveLibraryId(libraryName, query)
      ).rejects.toThrow(/failed after 3 attempts/);

      expect(mockMcpCaller).toHaveBeenCalledTimes(3);
    });

    it('should track retry metrics', async () => {
      const libraryName = 'retry-metrics';
      const query = 'retry metrics query';

      mockMcpCaller
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce({ libraryId: '/org/retry-metrics' });

      await client.resolveLibraryId(libraryName, query);

      const metrics = client.getMetrics();
      expect(metrics.retryAttempts).toBe(2); // 2 retries (3 total attempts - 1)
    });
  });

  describe('timeout handling', () => {
    it('should handle timeouts gracefully', async () => {
      const libraryName = 'timeout-test';
      const query = 'timeout query';

      mockMcpCaller.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Exceeds 1s timeout
        return { libraryId: '/org/timeout-test' };
      });

      await expect(
        client.resolveLibraryId(libraryName, query)
      ).rejects.toThrow(/timeout/);

      const metrics = client.getMetrics();
      expect(metrics.timeouts).toBeGreaterThan(0);
    });

    it('should track slow queries', async () => {
      const libraryName = 'slow-test';
      const query = 'slow query';

      mockMcpCaller.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 600)); // Slow but not timeout
        return { libraryId: '/org/slow-test' };
      });

      await client.resolveLibraryId(libraryName, query);

      const metrics = client.getMetrics();
      expect(metrics.slowQueries).toBe(1); // >5s threshold in actual implementation
    });
  });

  describe('deduplication integration', () => {
    it('should integrate with request deduplicator', async () => {
      const deduplicator = new RequestDeduplicator();
      const clientWithDedup = new Context7Client({
        cachePath: './sessions/cache/test-context7-dedup.db',
        deduplicator,
        mcpCaller: mockMcpCaller,
      });

      mockMcpCaller.mockResolvedValue({ libraryId: '/org/dedup-test' });

      // Make concurrent requests
      const promises = Array(5).fill(null).map(() =>
        clientWithDedup.resolveLibraryId('dedup-test', 'dedup query')
      );

      const results = await Promise.all(promises);

      // Should only call MCP once due to deduplication
      expect(mockMcpCaller).toHaveBeenCalledTimes(1);
      results.forEach(result => {
        expect(result.libraryId).toBe('/org/dedup-test');
      });

      const metrics = clientWithDedup.getMetrics();
      expect(metrics.deduplication).toBeDefined();
      expect(metrics.deduplication!.deduplicated).toBeGreaterThan(0);

      clientWithDedup.close();
      if (fs.existsSync('./sessions/cache/test-context7-dedup.db')) {
        fs.unlinkSync('./sessions/cache/test-context7-dedup.db');
      }
    });
  });

  describe('metrics tracking', () => {
    it('should track comprehensive metrics', async () => {
      mockMcpCaller
        .mockResolvedValueOnce({ libraryId: '/org/lib1' })
        .mockResolvedValueOnce({ content: [{ text: 'docs1' }] })
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({ libraryId: '/org/lib1' }); // Will be cached

      // Query 1: cache miss
      await client.resolveLibraryId('lib1', 'query1');

      // Query 2: cache miss
      await client.queryDocs('/org/lib1', 'query2');

      // Query 3: error with retry
      try {
        await client.resolveLibraryId('lib2', 'query3');
      } catch (e) {
        // Expected to fail
      }

      // Query 4: cache hit
      await client.resolveLibraryId('lib1', 'query1');

      const metrics = client.getMetrics();

      expect(metrics.totalQueries).toBe(4);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHitRate).toBeCloseTo(1 / 3, 2);
      expect(metrics.avgQueryTime).toBeGreaterThan(0);
      expect(metrics.avgCacheQueryTime).toBeGreaterThan(0);
    });

    it('should provide cache statistics', async () => {
      mockMcpCaller
        .mockResolvedValueOnce({ libraryId: '/org/lib1' })
        .mockResolvedValueOnce({ libraryId: '/org/lib2' });

      await client.resolveLibraryId('lib1', 'query1');
      await client.resolveLibraryId('lib2', 'query2');

      const stats = client.getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.hitRate).toBe(0);
      expect(stats.avgQueryTime).toBeGreaterThan(0);
    });
  });

  describe('input validation', () => {
    it('should validate libraryName parameter', async () => {
      await expect(
        client.resolveLibraryId('', 'query')
      ).rejects.toThrow('Library name must be a non-empty string');

      await expect(
        client.resolveLibraryId(null as any, 'query')
      ).rejects.toThrow('Library name must be a non-empty string');
    });

    it('should validate query parameter', async () => {
      await expect(
        client.resolveLibraryId('lib', '')
      ).rejects.toThrow('Query must be a non-empty string');

      await expect(
        client.resolveLibraryId('lib', null as any)
      ).rejects.toThrow('Query must be a non-empty string');
    });

    it('should validate libraryId parameter in queryDocs', async () => {
      await expect(
        client.queryDocs('', 'query')
      ).rejects.toThrow('Library ID must be a non-empty string');
    });
  });

  describe('error handling', () => {
    it('should handle MCP errors gracefully', async () => {
      mockMcpCaller.mockRejectedValue(new Error('MCP service unavailable'));

      await expect(
        client.resolveLibraryId('lib', 'query')
      ).rejects.toThrow(/MCP service unavailable/);
    });

    it('should handle malformed MCP responses', async () => {
      mockMcpCaller.mockResolvedValue({
        // Missing libraryId
        content: 'invalid',
      });

      await expect(
        client.resolveLibraryId('lib', 'query')
      ).rejects.toThrow(/Failed to resolve library ID/);
    });

    it('should handle cache corruption gracefully', async () => {
      // Create client, cache a value, then corrupt the database
      mockMcpCaller.mockResolvedValue({ libraryId: '/org/test' });

      await client.resolveLibraryId('test', 'query');
      client.close();

      // Corrupt the database file
      fs.writeFileSync(testCachePath, 'CORRUPTED DATA');

      // Should recreate cache on new client
      const newClient = new Context7Client({
        cachePath: testCachePath,
        mcpCaller: mockMcpCaller,
      });

      // Should not throw, will just reinitialize
      expect(() => newClient.close()).not.toThrow();
    });
  });
});
