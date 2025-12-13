/**
 * Migration Engine - Execute and track database migrations
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import type {
  Migration,
  MigrationResult,
  MigrationStatus,
  MigrationRecord,
  MigrationEngineOptions,
  MigrationError,
} from './types.js';
import { versionManager } from './version-manager.js';

/**
 * Manages migration execution and tracking
 */
export class MigrationEngine {
  private db: Database.Database | null = null;
  private options: Required<MigrationEngineOptions>;
  private migrations: Map<string, Migration> = new Map();

  constructor(options: MigrationEngineOptions = {}) {
    this.options = {
      migrationsPath: options.migrationsPath || '.claude/core/versioning/migrations',
      dbPath: options.dbPath || '.claude/orchestration/db/orchestration.db',
      tableName: options.tableName || 'migrations',
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
    };
  }

  /**
   * Initialize the migration system
   */
  private initialize(): void {
    if (this.db) return;

    const dbPath = resolve(this.options.dbPath);
    this.db = new Database(dbPath);

    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.options.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        applied_by TEXT DEFAULT 'system',
        execution_time_ms INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('up', 'down'))
      );

      CREATE INDEX IF NOT EXISTS idx_migrations_version
        ON ${this.options.tableName}(version);

      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at
        ON ${this.options.tableName}(applied_at);
    `);

    this.log('Migration system initialized');
  }

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    const validation = versionManager.validate(migration.version);
    if (!validation.valid) {
      throw new Error(`Invalid migration version: ${migration.version}`);
    }

    this.migrations.set(migration.version, migration);
    this.log(`Registered migration: ${migration.version} - ${migration.description}`);
  }

  /**
   * Execute pending migrations up to target version
   */
  async migrate(targetVersion?: string): Promise<MigrationResult> {
    this.initialize();

    const startTime = new Date().toISOString();
    const migrationsApplied: string[] = [];
    const errors: MigrationError[] = [];

    try {
      // Get pending migrations
      const pending = await this.getPendingMigrations(targetVersion);

      if (pending.length === 0) {
        this.log('No pending migrations');
        return {
          success: true,
          migrationsApplied: [],
          errors: [],
          startTime,
          endTime: new Date().toISOString(),
          duration: 0,
        };
      }

      this.log(`Found ${pending.length} pending migration(s)`);

      // Execute each migration in order
      for (const migration of pending) {
        try {
          await this.executeMigration(migration, 'up');
          migrationsApplied.push(migration.version);
          this.log(`✓ Applied migration: ${migration.version}`);
        } catch (error) {
          const migrationError: MigrationError = {
            version: migration.version,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          };
          errors.push(migrationError);
          this.log(`✗ Failed migration: ${migration.version} - ${migrationError.error}`);
          break; // Stop on first error
        }
      }

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        success: errors.length === 0,
        migrationsApplied,
        errors,
        startTime,
        endTime,
        duration,
      };
    } catch (error) {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        success: false,
        migrationsApplied,
        errors: [
          {
            version: 'system',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          },
        ],
        startTime,
        endTime,
        duration,
      };
    }
  }

  /**
   * Rollback migrations by number of steps or to target version
   */
  async rollback(steps: number = 1, targetVersion?: string): Promise<MigrationResult> {
    this.initialize();

    const startTime = new Date().toISOString();
    const migrationsApplied: string[] = [];
    const errors: MigrationError[] = [];

    try {
      // Get applied migrations to rollback
      const toRollback = await this.getMigrationsToRollback(steps, targetVersion);

      if (toRollback.length === 0) {
        this.log('No migrations to rollback');
        return {
          success: true,
          migrationsApplied: [],
          errors: [],
          startTime,
          endTime: new Date().toISOString(),
          duration: 0,
        };
      }

      this.log(`Rolling back ${toRollback.length} migration(s)`);

      // Execute rollbacks in reverse order
      for (const migration of toRollback) {
        try {
          await this.executeMigration(migration, 'down');
          migrationsApplied.push(migration.version);
          this.log(`✓ Rolled back migration: ${migration.version}`);
        } catch (error) {
          const migrationError: MigrationError = {
            version: migration.version,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          };
          errors.push(migrationError);
          this.log(`✗ Failed rollback: ${migration.version} - ${migrationError.error}`);
          break; // Stop on first error
        }
      }

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        success: errors.length === 0,
        migrationsApplied,
        errors,
        startTime,
        endTime,
        duration,
      };
    } catch (error) {
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      return {
        success: false,
        migrationsApplied,
        errors: [
          {
            version: 'system',
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          },
        ],
        startTime,
        endTime,
        duration,
      };
    }
  }

  /**
   * Get migration status for all registered migrations
   */
  async status(): Promise<MigrationStatus[]> {
    this.initialize();

    const applied = this.getAppliedVersions();
    const statuses: MigrationStatus[] = [];

    // Sort migrations by version
    const sortedVersions = versionManager.sort(Array.from(this.migrations.keys()));

    for (const version of sortedVersions) {
      const migration = this.migrations.get(version)!;
      const record = applied.find((r) => r.version === version);

      statuses.push({
        version,
        description: migration.description,
        applied: !!record,
        appliedAt: record?.applied_at,
        appliedBy: record?.applied_by,
        checksum: record?.checksum,
      });
    }

    return statuses;
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(
    migration: Migration,
    direction: 'up' | 'down'
  ): Promise<void> {
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would execute ${direction}: ${migration.version}`);
      return;
    }

    const startTime = Date.now();

    try {
      // Execute migration function
      if (direction === 'up') {
        await migration.up();
      } else {
        await migration.down();
      }

      const executionTime = Date.now() - startTime;

      // Track in database
      this.trackMigration(migration, direction, executionTime);
    } catch (error) {
      throw new Error(
        `Migration ${direction} failed for ${migration.version}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Track migration in database
   */
  private trackMigration(
    migration: Migration,
    direction: 'up' | 'down',
    executionTime: number
  ): void {
    if (!this.db) throw new Error('Database not initialized');

    const checksum = this.calculateChecksum(migration);

    if (direction === 'up') {
      this.db
        .prepare(
          `
        INSERT INTO ${this.options.tableName}
          (version, description, execution_time_ms, checksum, direction)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(migration.version, migration.description, executionTime, checksum, 'up');
    } else {
      // For rollback, record the down operation
      this.db
        .prepare(
          `
        INSERT INTO ${this.options.tableName}
          (version, description, execution_time_ms, checksum, direction)
        VALUES (?, ?, ?, ?, ?)
      `
        )
        .run(migration.version, migration.description, executionTime, checksum, 'down');
    }
  }

  /**
   * Get pending migrations up to target version
   */
  private async getPendingMigrations(targetVersion?: string): Promise<Migration[]> {
    const applied = new Set(this.getAppliedVersions().map((r) => r.version));
    const pending: Migration[] = [];

    // Sort migrations by version
    const sortedVersions = versionManager.sort(Array.from(this.migrations.keys()));

    for (const version of sortedVersions) {
      // Skip already applied
      if (applied.has(version)) continue;

      // Stop if we've reached target version
      if (targetVersion && versionManager.compare(version, targetVersion) > 0) {
        break;
      }

      const migration = this.migrations.get(version)!;
      pending.push(migration);
    }

    return pending;
  }

  /**
   * Get migrations to rollback
   */
  private async getMigrationsToRollback(
    steps: number,
    targetVersion?: string
  ): Promise<Migration[]> {
    const applied = this.getAppliedVersions()
      .filter((r) => r.direction === 'up')
      .sort((a, b) => versionManager.compare(b.version, a.version)); // Descending

    const toRollback: Migration[] = [];
    let count = 0;

    for (const record of applied) {
      if (targetVersion) {
        if (versionManager.compare(record.version, targetVersion) <= 0) {
          break;
        }
      } else if (count >= steps) {
        break;
      }

      const migration = this.migrations.get(record.version);
      if (migration) {
        toRollback.push(migration);
        count++;
      }
    }

    return toRollback;
  }

  /**
   * Get applied migration versions from database
   */
  private getAppliedVersions(): MigrationRecord[] {
    if (!this.db) return [];

    return this.db
      .prepare(
        `
      SELECT * FROM ${this.options.tableName}
      ORDER BY applied_at DESC
    `
      )
      .all() as MigrationRecord[];
  }

  /**
   * Calculate checksum for migration
   */
  private calculateChecksum(migration: Migration): string {
    const content = `${migration.version}:${migration.description}:${migration.up.toString()}:${migration.down.toString()}`;
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[MigrationEngine] ${message}`);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const migrationEngine = new MigrationEngine({ verbose: true });
