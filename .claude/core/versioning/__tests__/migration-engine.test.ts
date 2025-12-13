/**
 * Tests for MigrationEngine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MigrationEngine } from '../migration-engine.js';
import type { Migration } from '../types.js';
import { unlinkSync, existsSync } from 'fs';

describe('MigrationEngine', () => {
  const testDbPath = './.test-migrations.db';
  let engine: MigrationEngine;

  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    engine = new MigrationEngine({
      dbPath: testDbPath,
      verbose: false,
    });
  });

  afterEach(() => {
    engine.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('registerMigration', () => {
    it('should register a valid migration', () => {
      const migration: Migration = {
        version: '1.0.0',
        description: 'Test migration',
        async up() {},
        async down() {},
      };

      expect(() => engine.registerMigration(migration)).not.toThrow();
    });

    it('should reject invalid version', () => {
      const migration: Migration = {
        version: 'invalid',
        description: 'Test migration',
        async up() {},
        async down() {},
      };

      expect(() => engine.registerMigration(migration)).toThrow('Invalid migration version');
    });
  });

  describe('migrate', () => {
    it('should execute pending migrations', async () => {
      let executed = false;

      const migration: Migration = {
        version: '1.0.0',
        description: 'Test migration',
        async up() {
          executed = true;
        },
        async down() {},
      };

      engine.registerMigration(migration);

      const result = await engine.migrate();

      expect(result.success).toBe(true);
      expect(result.migrationsApplied).toContain('1.0.0');
      expect(executed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should execute migrations in order', async () => {
      const order: string[] = [];

      const migration1: Migration = {
        version: '1.0.0',
        description: 'First',
        async up() {
          order.push('1.0.0');
        },
        async down() {},
      };

      const migration2: Migration = {
        version: '1.1.0',
        description: 'Second',
        async up() {
          order.push('1.1.0');
        },
        async down() {},
      };

      const migration3: Migration = {
        version: '1.0.5',
        description: 'Third',
        async up() {
          order.push('1.0.5');
        },
        async down() {},
      };

      // Register in random order
      engine.registerMigration(migration2);
      engine.registerMigration(migration3);
      engine.registerMigration(migration1);

      await engine.migrate();

      expect(order).toEqual(['1.0.0', '1.0.5', '1.1.0']);
    });

    it('should stop on error', async () => {
      const migration1: Migration = {
        version: '1.0.0',
        description: 'Success',
        async up() {},
        async down() {},
      };

      const migration2: Migration = {
        version: '1.1.0',
        description: 'Fails',
        async up() {
          throw new Error('Migration failed');
        },
        async down() {},
      };

      const migration3: Migration = {
        version: '1.2.0',
        description: 'Should not run',
        async up() {},
        async down() {},
      };

      engine.registerMigration(migration1);
      engine.registerMigration(migration2);
      engine.registerMigration(migration3);

      const result = await engine.migrate();

      expect(result.success).toBe(false);
      expect(result.migrationsApplied).toEqual(['1.0.0']);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].version).toBe('1.1.0');
    });

    it('should respect target version', async () => {
      const order: string[] = [];

      const migrations: Migration[] = [
        {
          version: '1.0.0',
          description: 'First',
          async up() {
            order.push('1.0.0');
          },
          async down() {},
        },
        {
          version: '1.1.0',
          description: 'Second',
          async up() {
            order.push('1.1.0');
          },
          async down() {},
        },
        {
          version: '1.2.0',
          description: 'Third',
          async up() {
            order.push('1.2.0');
          },
          async down() {},
        },
      ];

      migrations.forEach((m) => engine.registerMigration(m));

      await engine.migrate('1.1.0');

      expect(order).toEqual(['1.0.0', '1.1.0']);
    });

    it('should skip already applied migrations', async () => {
      const migration: Migration = {
        version: '1.0.0',
        description: 'Test',
        async up() {},
        async down() {},
      };

      engine.registerMigration(migration);

      // Apply first time
      const result1 = await engine.migrate();
      expect(result1.migrationsApplied).toHaveLength(1);

      // Apply second time - should skip
      const result2 = await engine.migrate();
      expect(result2.migrationsApplied).toHaveLength(0);
    });
  });

  describe('rollback', () => {
    it('should rollback migrations', async () => {
      let rolledBack = false;

      const migration: Migration = {
        version: '1.0.0',
        description: 'Test',
        async up() {},
        async down() {
          rolledBack = true;
        },
      };

      engine.registerMigration(migration);

      // Apply migration
      await engine.migrate();

      // Rollback
      const result = await engine.rollback(1);

      expect(result.success).toBe(true);
      expect(result.migrationsApplied).toContain('1.0.0');
      expect(rolledBack).toBe(true);
    });

    it('should rollback multiple migrations', async () => {
      const order: string[] = [];

      const migrations: Migration[] = [
        {
          version: '1.0.0',
          description: 'First',
          async up() {},
          async down() {
            order.push('1.0.0');
          },
        },
        {
          version: '1.1.0',
          description: 'Second',
          async up() {},
          async down() {
            order.push('1.1.0');
          },
        },
        {
          version: '1.2.0',
          description: 'Third',
          async up() {},
          async down() {
            order.push('1.2.0');
          },
        },
      ];

      migrations.forEach((m) => engine.registerMigration(m));

      // Apply all
      await engine.migrate();

      // Rollback 2
      await engine.rollback(2);

      // Should rollback in reverse order
      expect(order).toEqual(['1.2.0', '1.1.0']);
    });

    it('should rollback to target version', async () => {
      const order: string[] = [];

      const migrations: Migration[] = [
        {
          version: '1.0.0',
          description: 'First',
          async up() {},
          async down() {
            order.push('1.0.0');
          },
        },
        {
          version: '1.1.0',
          description: 'Second',
          async up() {},
          async down() {
            order.push('1.1.0');
          },
        },
        {
          version: '1.2.0',
          description: 'Third',
          async up() {},
          async down() {
            order.push('1.2.0');
          },
        },
      ];

      migrations.forEach((m) => engine.registerMigration(m));

      // Apply all
      await engine.migrate();

      // Rollback to 1.1.0 (should only rollback 1.2.0)
      await engine.rollback(10, '1.1.0');

      expect(order).toEqual(['1.2.0']);
    });
  });

  describe('status', () => {
    it('should show migration status', async () => {
      const migrations: Migration[] = [
        {
          version: '1.0.0',
          description: 'Applied',
          async up() {},
          async down() {},
        },
        {
          version: '1.1.0',
          description: 'Pending',
          async up() {},
          async down() {},
        },
      ];

      migrations.forEach((m) => engine.registerMigration(m));

      // Apply first migration
      await engine.migrate('1.0.0');

      // Get status
      const statuses = await engine.status();

      expect(statuses).toHaveLength(2);

      const applied = statuses.find((s) => s.version === '1.0.0');
      expect(applied?.applied).toBe(true);
      expect(applied?.appliedAt).toBeDefined();

      const pending = statuses.find((s) => s.version === '1.1.0');
      expect(pending?.applied).toBe(false);
      expect(pending?.appliedAt).toBeUndefined();
    });
  });

  describe('dry run mode', () => {
    it('should not execute migrations in dry run', async () => {
      const dryEngine = new MigrationEngine({
        dbPath: testDbPath,
        dryRun: true,
        verbose: false,
      });

      let executed = false;

      const migration: Migration = {
        version: '1.0.0',
        description: 'Test',
        async up() {
          executed = true;
        },
        async down() {},
      };

      dryEngine.registerMigration(migration);

      await dryEngine.migrate();

      expect(executed).toBe(false);

      dryEngine.close();
    });
  });
});
