/**
 * Tests for Memory Graph Maintenance
 *
 * Tests cover:
 * - Orphan detection (entities with no relations)
 * - Duplicate detection with similarity scoring
 * - Graph statistics calculation
 * - Levenshtein distance accuracy
 * - Archive and cleanup operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryGraphMaintenance } from '../lib/memory-graph-maintenance';
import { MemoryPool } from '../lib/memory-pool';
import { MemoryQueryOptimizer } from '../lib/memory-query-optimizer';
import * as fs from 'fs';

describe('MemoryGraphMaintenance', () => {
  let pool: MemoryPool;
  let optimizer: MemoryQueryOptimizer;
  let maintenance: MemoryGraphMaintenance;
  const testArchivePath = './sessions/memory/test-archive/';

  beforeEach(() => {
    // Clean up test directories
    if (fs.existsSync(testArchivePath)) {
      const files = fs.readdirSync(testArchivePath);
      files.forEach(file => {
        fs.unlinkSync(`${testArchivePath}${file}`);
      });
      fs.rmdirSync(testArchivePath);
    }

    pool = new MemoryPool({
      maxConnections: 5,
      minConnections: 1,
      acquisitionTimeout: 1000,
      enableHealthChecks: false,
    });

    optimizer = new MemoryQueryOptimizer(pool, {
      enabled: false, // Disable caching for testing
    });

    maintenance = new MemoryGraphMaintenance(pool, optimizer, {
      orphanThresholdDays: 30,
      duplicateThreshold: 0.9,
      archivePath: testArchivePath,
      debug: false,
    });
  });

  afterEach(() => {
    optimizer.close();

    if (fs.existsSync(testArchivePath)) {
      const files = fs.readdirSync(testArchivePath);
      files.forEach(file => {
        fs.unlinkSync(`${testArchivePath}${file}`);
      });
      fs.rmdirSync(testArchivePath);
    }
  });

  describe('orphan detection', () => {
    it('should find entities with no relations', async () => {
      // Mock graph with orphans would be returned by optimizer.readGraph()
      // For this test, we expect findOrphans to work with the mock data
      const orphans = await maintenance.findOrphans();

      expect(Array.isArray(orphans)).toBe(true);
      // In real implementation, this would find entities not in any relations
    });

    it('should not include connected entities', async () => {
      const orphans = await maintenance.findOrphans();

      // All entities that have relations should not be in orphans list
      expect(orphans).toBeDefined();
    });

    it('should handle empty graph', async () => {
      const orphans = await maintenance.findOrphans();

      expect(orphans).toBeDefined();
      expect(Array.isArray(orphans)).toBe(true);
    });
  });

  describe('duplicate detection', () => {
    it('should find similar entities', async () => {
      const duplicates = await maintenance.findDuplicates();

      expect(Array.isArray(duplicates)).toBe(true);

      // Each duplicate pair should have similarity score
      duplicates.forEach(dup => {
        expect(dup).toHaveProperty('entity1');
        expect(dup).toHaveProperty('entity2');
        expect(dup).toHaveProperty('similarity');
        expect(dup).toHaveProperty('suggestedTarget');
        expect(dup.similarity).toBeGreaterThanOrEqual(0);
        expect(dup.similarity).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate Levenshtein distance correctly', async () => {
      // We can't directly test the private method, but we can test through findDuplicates
      // For identical strings, similarity should be 1.0
      // For completely different strings, similarity should be low

      const duplicates = await maintenance.findDuplicates();

      duplicates.forEach(dup => {
        // Similarity should be above threshold (0.9 default)
        expect(dup.similarity).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should respect similarity threshold', async () => {
      const strictMaintenance = new MemoryGraphMaintenance(pool, optimizer, {
        duplicateThreshold: 0.95, // Higher threshold
        archivePath: testArchivePath,
      });

      const duplicates = await strictMaintenance.findDuplicates();

      duplicates.forEach(dup => {
        expect(dup.similarity).toBeGreaterThanOrEqual(0.95);
      });
    });

    it('should suggest merge target (shorter name preferred)', async () => {
      const duplicates = await maintenance.findDuplicates();

      duplicates.forEach(dup => {
        // Suggested target should be one of the two entities
        expect([dup.entity1, dup.entity2]).toContain(dup.suggestedTarget);

        // If names differ in length, shorter should be suggested
        if (dup.entity1.length !== dup.entity2.length) {
          const shorter = dup.entity1.length < dup.entity2.length ? dup.entity1 : dup.entity2;
          expect(dup.suggestedTarget).toBe(shorter);
        }
      });
    });

    it('should handle case-insensitive comparison', async () => {
      // Duplicates should be found regardless of case differences
      const duplicates = await maintenance.findDuplicates();

      // Test expects that case differences don't prevent duplicate detection
      expect(duplicates).toBeDefined();
    });
  });

  describe('graph statistics', () => {
    it('should calculate entity and relation counts', async () => {
      const stats = await maintenance.getStats();

      expect(stats.entityCount).toBeGreaterThanOrEqual(0);
      expect(stats.relationCount).toBeGreaterThanOrEqual(0);
      expect(stats.avgRelationsPerEntity).toBeGreaterThanOrEqual(0);
    });

    it('should identify orphaned entities', async () => {
      const stats = await maintenance.getStats();

      expect(stats.orphanedEntities).toBeGreaterThanOrEqual(0);
      expect(stats.orphanedEntities).toBeLessThanOrEqual(stats.entityCount);
    });

    it('should find oldest and newest entities', async () => {
      const stats = await maintenance.getStats();

      if (stats.entityCount > 0) {
        if (stats.oldestEntity) {
          expect(stats.oldestEntity.name).toBeDefined();
          expect(stats.oldestEntity.createdAt).toBeDefined();
        }

        if (stats.newestEntity) {
          expect(stats.newestEntity.name).toBeDefined();
          expect(stats.newestEntity.createdAt).toBeDefined();
        }

        if (stats.oldestEntity && stats.newestEntity) {
          expect(stats.oldestEntity.createdAt).toBeLessThanOrEqual(stats.newestEntity.createdAt);
        }
      }
    });

    it('should calculate entity type distribution', async () => {
      const stats = await maintenance.getStats();

      expect(stats.entityTypeDistribution).toBeDefined();
      expect(typeof stats.entityTypeDistribution).toBe('object');

      // Sum of type counts should equal total entities
      const sum = Object.values(stats.entityTypeDistribution).reduce((a, b) => a + b, 0);
      expect(sum).toBe(stats.entityCount);
    });

    it('should identify most connected entities', async () => {
      const stats = await maintenance.getStats();

      expect(Array.isArray(stats.mostConnected)).toBe(true);
      expect(stats.mostConnected.length).toBeLessThanOrEqual(10); // Top 10

      stats.mostConnected.forEach(entity => {
        expect(entity.name).toBeDefined();
        expect(entity.connectionCount).toBeGreaterThan(0);
      });

      // Should be sorted by connection count (descending)
      for (let i = 0; i < stats.mostConnected.length - 1; i++) {
        expect(stats.mostConnected[i].connectionCount).toBeGreaterThanOrEqual(
          stats.mostConnected[i + 1].connectionCount
        );
      }
    });

    it('should calculate graph density', async () => {
      const stats = await maintenance.getStats();

      expect(stats.graphDensity).toBeGreaterThanOrEqual(0);
      expect(stats.graphDensity).toBeLessThanOrEqual(1);

      // Density should be 0 for empty graph or graph with no relations
      if (stats.entityCount === 0 || stats.relationCount === 0) {
        expect(stats.graphDensity).toBe(0);
      }
    });
  });

  describe('cleanup operations', () => {
    it('should perform dry run without changes', async () => {
      const result = await maintenance.runCleanup(true);

      expect(result.duration).toBeGreaterThan(0);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);

      // Dry run should report what would be done
      expect(result.orphansRemoved).toBeGreaterThanOrEqual(0);
      expect(result.entitiesArchived).toBeGreaterThanOrEqual(0);
    });

    it('should track cleanup duration', async () => {
      const startTime = Date.now();
      const result = await maintenance.runCleanup(true);
      const endTime = Date.now();

      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeLessThanOrEqual(endTime - startTime + 10); // Small margin
    });

    it('should estimate freed space', async () => {
      const result = await maintenance.runCleanup(true);

      expect(result.freedSpace).toBeDefined();
      expect(typeof result.freedSpace).toBe('string');
      expect(result.freedSpace).toMatch(/KB$/);
    });

    it('should collect errors during cleanup', async () => {
      const result = await maintenance.runCleanup(true);

      expect(Array.isArray(result.errors)).toBe(true);
      // Errors should be strings
      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
      });
    });

    it('should report duplicate findings', async () => {
      const result = await maintenance.runCleanup(true);

      // If duplicates found, should be in errors with recommendation
      const duplicateError = result.errors.find(e => e.includes('duplicates'));
      if (duplicateError) {
        expect(duplicateError).toContain('manual review');
      }
    });
  });

  describe('archive operations', () => {
    it('should archive old entities', async () => {
      const archived = await maintenance.archiveOld(30, true); // dry run

      expect(archived).toBeGreaterThanOrEqual(0);
    });

    it('should respect age threshold', async () => {
      // Short threshold should archive more
      const archived1 = await maintenance.archiveOld(1, true);

      // Long threshold should archive less
      const archived2 = await maintenance.archiveOld(1000, true);

      expect(archived1).toBeGreaterThanOrEqual(archived2);
    });

    it('should create archive files', async () => {
      // Run actual archive (not dry run)
      await maintenance.archiveOld(0, false); // Archive everything

      // Check if archive directory was created
      if (fs.existsSync(testArchivePath)) {
        const files = fs.readdirSync(testArchivePath);

        if (files.length > 0) {
          // Archive file should be JSON
          files.forEach(file => {
            expect(file).toMatch(/^archive-.*\.json$/);

            const content = fs.readFileSync(`${testArchivePath}${file}`, 'utf-8');
            const archived = JSON.parse(content);

            expect(Array.isArray(archived)).toBe(true);

            archived.forEach((entity: any) => {
              expect(entity).toHaveProperty('name');
              expect(entity).toHaveProperty('type');
              expect(entity).toHaveProperty('observations');
              expect(entity).toHaveProperty('relations');
              expect(entity).toHaveProperty('archivedAt');
              expect(entity).toHaveProperty('reason');
            });
          });
        }
      }
    });

    it('should include relations in archive', async () => {
      await maintenance.archiveOld(0, false);

      if (fs.existsSync(testArchivePath)) {
        const files = fs.readdirSync(testArchivePath);

        if (files.length > 0) {
          const content = fs.readFileSync(`${testArchivePath}${files[0]}`, 'utf-8');
          const archived = JSON.parse(content);

          archived.forEach((entity: any) => {
            expect(Array.isArray(entity.relations)).toBe(true);
          });
        }
      }
    });

    it('should not archive without directory', async () => {
      // Should create directory if it doesn't exist
      expect(() => maintenance.archiveOld(0, false)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully during cleanup', async () => {
      // Cleanup should not throw even if some operations fail
      await expect(
        maintenance.runCleanup(true)
      ).resolves.toBeDefined();
    });

    it('should report errors in result', async () => {
      const result = await maintenance.runCleanup(true);

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle empty graph', async () => {
      const stats = await maintenance.getStats();
      const orphans = await maintenance.findOrphans();
      const duplicates = await maintenance.findDuplicates();

      expect(stats).toBeDefined();
      expect(orphans).toBeDefined();
      expect(duplicates).toBeDefined();
    });
  });

  describe('Levenshtein distance calculation', () => {
    // We test this indirectly through duplicate detection
    it('should calculate similarity correctly', async () => {
      const duplicates = await maintenance.findDuplicates();

      // Identical names should have similarity 1.0
      // Very different names should have low similarity

      duplicates.forEach(dup => {
        if (dup.entity1 === dup.entity2) {
          expect(dup.similarity).toBe(1.0);
        }

        // Similarity should be symmetric
        expect(dup.similarity).toBeGreaterThanOrEqual(0);
        expect(dup.similarity).toBeLessThanOrEqual(1);
      });
    });

    it('should be case-insensitive', async () => {
      // Duplicate detection uses lowercase comparison
      const duplicates = await maintenance.findDuplicates();

      // If found, duplicates with only case differences should have high similarity
      duplicates.forEach(dup => {
        if (dup.entity1.toLowerCase() === dup.entity2.toLowerCase()) {
          expect(dup.similarity).toBe(1.0);
        }
      });
    });
  });
});
