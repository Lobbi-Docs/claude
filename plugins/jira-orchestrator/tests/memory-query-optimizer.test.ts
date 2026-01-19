/**
 * Tests for Memory Query Optimizer
 *
 * Tests cover:
 * - Query caching behavior
 * - TTL respect and expiration
 * - Query normalization
 * - Security (SQL injection prevention in LIKE patterns)
 * - Cache invalidation
 * - Metrics tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryQueryOptimizer } from '../lib/memory-query-optimizer';
import { MemoryPool } from '../lib/memory-pool';
import * as fs from 'fs';

describe('MemoryQueryOptimizer', () => {
  let pool: MemoryPool;
  let optimizer: MemoryQueryOptimizer;
  const testCachePath = './sessions/cache/test-memory-query.db';

  beforeEach(() => {
    // Clean up test database
    if (fs.existsSync(testCachePath)) {
      fs.unlinkSync(testCachePath);
    }

    pool = new MemoryPool({
      maxConnections: 5,
      minConnections: 1,
      acquisitionTimeout: 1000,
      enableHealthChecks: false,
    });

    optimizer = new MemoryQueryOptimizer(pool, {
      cachePath: testCachePath,
      cacheTtlMs: 1000, // 1 second for testing
      maxResultsPerQuery: 100,
      enabled: true,
      debug: false,
    });
  });

  afterEach(() => {
    optimizer.close();
    if (fs.existsSync(testCachePath)) {
      fs.unlinkSync(testCachePath);
    }
  });

  describe('caching', () => {
    it('should cache query results', async () => {
      const query = 'test entity';

      // First query - cache miss
      const result1 = await optimizer.searchNodes(query);
      expect(result1.fromCache).toBe(false);
      expect(result1.query).toBe(query);
      expect(result1.results).toBeDefined();

      // Second query - cache hit
      const result2 = await optimizer.searchNodes(query);
      expect(result2.fromCache).toBe(true);
      expect(result2.query).toBe(query);
      expect(result2.results).toEqual(result1.results);
    });

    it('should respect TTL', async () => {
      const query = 'ttl test';

      // Cache the query
      const result1 = await optimizer.searchNodes(query);
      expect(result1.fromCache).toBe(false);

      // Immediate second query - should hit cache
      const result2 = await optimizer.searchNodes(query);
      expect(result2.fromCache).toBe(true);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Third query - cache miss (TTL expired)
      const result3 = await optimizer.searchNodes(query);
      expect(result3.fromCache).toBe(false);
    });

    it('should normalize queries', async () => {
      const queries = [
        'Test Query',
        'test query',
        '  test query  ',
        'TEST QUERY',
      ];

      // First query
      await optimizer.searchNodes(queries[0]);

      // All variations should hit cache (normalized)
      for (let i = 1; i < queries.length; i++) {
        const result = await optimizer.searchNodes(queries[i]);
        expect(result.fromCache).toBe(true);
      }
    });

    it('should differentiate by limit and offset', async () => {
      const query = 'pagination test';

      const result1 = await optimizer.searchNodes(query, 10, 0);
      const result2 = await optimizer.searchNodes(query, 10, 10);
      const result3 = await optimizer.searchNodes(query, 20, 0);

      // Different cache keys for different pagination
      expect(result1.cacheKey).not.toBe(result2.cacheKey);
      expect(result1.cacheKey).not.toBe(result3.cacheKey);
      expect(result2.cacheKey).not.toBe(result3.cacheKey);

      // Second call with same params should hit cache
      const result1Again = await optimizer.searchNodes(query, 10, 0);
      expect(result1Again.fromCache).toBe(true);
      expect(result1Again.cacheKey).toBe(result1.cacheKey);
    });

    it('should cache graph reads separately', async () => {
      const graph1 = await optimizer.readGraph();
      expect(graph1).toBeDefined();

      // Should hit cache on second call
      const graph2 = await optimizer.readGraph();
      expect(graph2).toEqual(graph1);
    });
  });

  describe('security', () => {
    it('should sanitize LIKE patterns', () => {
      // Test the pattern invalidation with dangerous characters
      const dangerousPatterns = [
        'test%pattern',    // SQL wildcard
        'test_pattern',    // SQL single char wildcard
        'test[a-z]',       // SQL range
        'test]pattern',    // SQL bracket
      ];

      dangerousPatterns.forEach(pattern => {
        // Should not throw - sanitization handles it
        expect(() => {
          optimizer.invalidateCachePattern(pattern);
        }).not.toThrow();
      });
    });

    it('should validate cache keys', async () => {
      const query = 'valid query';

      const result = await optimizer.searchNodes(query);

      // Cache key should be valid (alphanumeric, colons, hyphens, underscores, dots)
      expect(result.cacheKey).toMatch(/^[a-zA-Z0-9:_\-\.]+$/);
    });

    it('should prevent SQL injection in cache operations', async () => {
      const maliciousQuery = "'; DROP TABLE query_cache; --";

      // Should handle safely without SQL injection
      await expect(
        optimizer.searchNodes(maliciousQuery)
      ).resolves.toBeDefined();

      // Cache should still be functional
      const result = await optimizer.searchNodes('normal query');
      expect(result).toBeDefined();
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate all cache', async () => {
      // Cache multiple queries
      await optimizer.searchNodes('query1');
      await optimizer.searchNodes('query2');
      await optimizer.searchNodes('query3');

      const statsBefore = optimizer.getCacheStats();
      expect(statsBefore.hits + statsBefore.misses).toBeGreaterThan(0);

      // Invalidate
      optimizer.invalidateCache();

      // Next queries should be cache misses
      const result1 = await optimizer.searchNodes('query1');
      const result2 = await optimizer.searchNodes('query2');

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(false);
    });

    it('should invalidate by pattern', async () => {
      await optimizer.searchNodes('user entity');
      await optimizer.searchNodes('project entity');
      await optimizer.searchNodes('task entity');

      // Invalidate pattern
      optimizer.invalidateCachePattern('user');

      // User query should be invalidated
      const result1 = await optimizer.searchNodes('user entity');
      expect(result1.fromCache).toBe(false);

      // Other queries should still be cached
      const result2 = await optimizer.searchNodes('project entity');
      expect(result2.fromCache).toBe(true);
    });

    it('should cleanup expired entries', async () => {
      const shortTtlOptimizer = new MemoryQueryOptimizer(pool, {
        cachePath: './sessions/cache/test-memory-query-short.db',
        cacheTtlMs: 100, // 100ms
        enabled: true,
      });

      await shortTtlOptimizer.searchNodes('expire test');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const removed = shortTtlOptimizer.cleanupExpiredCache();
      expect(removed).toBeGreaterThan(0);

      shortTtlOptimizer.close();
      if (fs.existsSync('./sessions/cache/test-memory-query-short.db')) {
        fs.unlinkSync('./sessions/cache/test-memory-query-short.db');
      }
    });
  });

  describe('metrics tracking', () => {
    it('should track cache hits and misses', async () => {
      const query = 'metrics test';

      // Cache miss
      await optimizer.searchNodes(query);

      let stats = optimizer.getCacheStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Cache hit
      await optimizer.searchNodes(query);

      stats = optimizer.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5, 2);
    });

    it('should track total queries', async () => {
      await optimizer.searchNodes('query1');
      await optimizer.searchNodes('query2');
      await optimizer.searchNodes('query1'); // Cache hit

      const stats = optimizer.getCacheStats();
      expect(stats.totalQueries).toBe(3);
    });

    it('should track average query time', async () => {
      await optimizer.searchNodes('query1');
      await optimizer.searchNodes('query2');
      await optimizer.searchNodes('query3');

      const stats = optimizer.getCacheStats();
      expect(stats.avgQueryTime).toBeGreaterThan(0);
    });

    it('should track cache size', async () => {
      await optimizer.searchNodes('query1');
      await optimizer.searchNodes('query2');
      await optimizer.searchNodes('query3');

      const stats = optimizer.getCacheStats();
      expect(stats.cacheSize).toBe(3);
      expect(stats.cacheSizeBytes).toBeGreaterThan(0);
    });
  });

  describe('openNodes', () => {
    it('should not cache openNodes queries', async () => {
      const names = ['entity1', 'entity2'];

      const result1 = await optimizer.openNodes(names);
      const result2 = await optimizer.openNodes(names);

      // Both should execute (no caching for openNodes)
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should handle empty node names', async () => {
      const result = await optimizer.openNodes([]);
      expect(result).toEqual([]);
    });

    it('should handle multiple node names', async () => {
      const names = ['node1', 'node2', 'node3'];
      const result = await optimizer.openNodes(names);

      expect(result.length).toBe(names.length);
    });
  });

  describe('pagination', () => {
    it('should respect maxResultsPerQuery limit', async () => {
      const query = 'pagination test';

      const result = await optimizer.searchNodes(query);

      expect(result.results.length).toBeLessThanOrEqual(100); // maxResultsPerQuery
    });

    it('should handle custom limits', async () => {
      const query = 'custom limit test';

      const result = await optimizer.searchNodes(query, 10);

      expect(result.results.length).toBeLessThanOrEqual(10);
    });

    it('should handle offsets', async () => {
      const query = 'offset test';

      const result1 = await optimizer.searchNodes(query, 10, 0);
      const result2 = await optimizer.searchNodes(query, 10, 10);

      // Should have different cache keys
      expect(result1.cacheKey).not.toBe(result2.cacheKey);
    });
  });

  describe('error handling', () => {
    it('should handle pool errors gracefully', async () => {
      // Create optimizer with invalid pool configuration
      const badPool = new MemoryPool({
        maxConnections: 0, // Invalid
        minConnections: 0,
      });

      const badOptimizer = new MemoryQueryOptimizer(badPool, {
        enabled: false, // Disable caching to force pool usage
      });

      // Should handle gracefully
      await expect(
        badOptimizer.searchNodes('test')
      ).resolves.toBeDefined();

      badOptimizer.close();
    });

    it('should handle cache corruption', async () => {
      // Cache a query
      await optimizer.searchNodes('test');

      optimizer.close();

      // Corrupt the database
      fs.writeFileSync(testCachePath, 'CORRUPTED');

      // Should handle gracefully on new optimizer
      const newOptimizer = new MemoryQueryOptimizer(pool, {
        cachePath: testCachePath,
        enabled: true,
      });

      // Should reinitialize cache
      await expect(
        newOptimizer.searchNodes('test')
      ).resolves.toBeDefined();

      newOptimizer.close();
    });
  });

  describe('disabled caching', () => {
    it('should bypass cache when disabled', async () => {
      const disabledOptimizer = new MemoryQueryOptimizer(pool, {
        enabled: false,
      });

      const result1 = await disabledOptimizer.searchNodes('test');
      const result2 = await disabledOptimizer.searchNodes('test');

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(false);

      disabledOptimizer.close();
    });
  });
});
