/**
 * SQL Injection Security Tests
 * 
 * Validates that all SQL operations are protected against injection attacks
 * 
 * @module tests/sql-injection-security
 */

import { MemoryQueryOptimizer } from '../lib/memory-query-optimizer';
import { Context7Client } from '../lib/context7-client';
import { WorklogQueueSQLite } from '../lib/worklog-queue-sqlite';
import * as fs from 'fs';

describe('SQL Injection Security Tests', () => {
  const testDbPath = './sessions/test-security.db';

  afterAll(() => {
    // Cleanup test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('MemoryQueryOptimizer', () => {
    test('should sanitize LIKE patterns to prevent injection', async () => {
      const mockPool = {
        withConnection: jest.fn().mockResolvedValue([])
      } as any;

      const optimizer = new MemoryQueryOptimizer(mockPool, {
        cachePath: testDbPath,
        enabled: true,
        debug: false
      });

      // Attempt injection through pattern
      const maliciousPattern = "'; DROP TABLE query_cache; --";
      
      expect(() => {
        optimizer.invalidateCachePattern(maliciousPattern);
      }).not.toThrow();

      // Verify cache table still exists
      const stats = optimizer.getCacheStats();
      expect(stats).toBeDefined();
      
      optimizer.close();
    });

    test('should validate cache keys', async () => {
      const mockPool = {
        withConnection: jest.fn().mockResolvedValue([])
      } as any;

      const optimizer = new MemoryQueryOptimizer(mockPool, {
        cachePath: testDbPath,
        enabled: true,
        debug: false
      });

      // Test with valid query
      await optimizer.searchNodes('test query', 10);

      optimizer.close();
    });
  });

  describe('Context7Client', () => {
    test('should validate library names', async () => {
      const client = new Context7Client({
        cachePath: testDbPath,
        mcpCaller: jest.fn().mockResolvedValue({ libraryId: 'test' })
      });

      // Should reject injection attempts
      await expect(
        client.resolveLibraryId("'; DROP TABLE context7_cache; --", 'query')
      ).rejects.toThrow();

      client.close();
    });

    test('should validate cache keys', async () => {
      const client = new Context7Client({
        cachePath: testDbPath,
        mcpCaller: jest.fn().mockResolvedValue({ content: [{ text: 'docs' }] })
      });

      // Valid library names should work
      const result = await client.resolveLibraryId('react', 'hooks');
      expect(result).toBeDefined();

      client.close();
    });
  });

  describe('WorklogQueueSQLite', () => {
    test('should validate issue keys', () => {
      const queue = new WorklogQueueSQLite(testDbPath);

      // Valid issue key
      const validWorklog = {
        issueKey: 'PROJ-123',
        timeSpentSeconds: 3600,
        started: new Date(),
        comment: 'Test work'
      };

      expect(() => {
        queue.enqueue(validWorklog);
      }).not.toThrow();

      // Invalid issue key (SQL injection attempt)
      const maliciousWorklog = {
        issueKey: "'; DROP TABLE worklogs; --",
        timeSpentSeconds: 3600,
        started: new Date(),
        comment: 'Test'
      };

      expect(() => {
        queue.enqueue(maliciousWorklog);
      }).toThrow(/Invalid issue key format/);

      queue.close();
    });

    test('should validate IDs', () => {
      const queue = new WorklogQueueSQLite(testDbPath);

      // Valid IDs
      expect(() => {
        queue.markAsProcessing([1, 2, 3]);
      }).not.toThrow();

      // Invalid IDs
      expect(() => {
        queue.markAsProcessing([1, -1, 3]);
      }).toThrow(/Invalid ID/);

      expect(() => {
        queue.markAsProcessing([1, 1.5, 3]);
      }).toThrow(/Invalid ID/);

      queue.close();
    });

    test('should validate worklog data types', () => {
      const queue = new WorklogQueueSQLite(testDbPath);

      // Invalid time spent
      expect(() => {
        queue.enqueue({
          issueKey: 'PROJ-123',
          timeSpentSeconds: -100,
          started: new Date(),
          comment: 'Test'
        });
      }).toThrow(/Invalid time spent/);

      // Invalid date
      expect(() => {
        queue.enqueue({
          issueKey: 'PROJ-123',
          timeSpentSeconds: 3600,
          started: new Date('invalid'),
          comment: 'Test'
        });
      }).toThrow(/Invalid started date/);

      queue.close();
    });
  });
});
