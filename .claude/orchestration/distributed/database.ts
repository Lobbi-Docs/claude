/**
 * Distributed Agent Execution System - Database Layer
 * SQLite connection and management
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  verbose?: boolean;
  wal?: boolean; // Write-Ahead Logging for better concurrency
}

export class DistributedDatabase {
  private db: Database.Database;
  private readonly config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.db = new Database(config.path, {
      readonly: config.readonly ?? false,
      verbose: config.verbose ? console.log : undefined,
    });

    this.initialize();
  }

  /**
   * Initialize database with schema and optimizations
   */
  private initialize(): void {
    // Enable WAL mode for better concurrency
    if (this.config.wal !== false && !this.config.readonly) {
      this.db.pragma('journal_mode = WAL');
    }

    // Set optimal pragmas for performance
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('foreign_keys = ON');

    // Apply schema if not readonly
    if (!this.config.readonly) {
      this.applySchema();
    }
  }

  /**
   * Apply database schema from SQL file
   */
  private applySchema(): void {
    const schemaPath = join(__dirname, '..', 'db', 'distributed.sql');
    try {
      const schema = readFileSync(schemaPath, 'utf-8');

      // Execute schema (split by statement to handle comments)
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          this.db.exec(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!(error instanceof Error && error.message.includes('already exists'))) {
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
            throw error;
          }
        }
      }

      console.log('[DistributedDatabase] Schema applied successfully');
    } catch (error) {
      console.error('[DistributedDatabase] Failed to apply schema:', error);
      throw error;
    }
  }

  /**
   * Get the raw database instance
   */
  getDatabase(): Database.Database {
    return this.db;
  }

  /**
   * Execute a query
   */
  query<T = unknown>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(params ?? []) as T[];
  }

  /**
   * Execute a query and get first result
   */
  queryOne<T = unknown>(sql: string, params?: unknown[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(params ?? []) as T | undefined;
  }

  /**
   * Execute a query with no results (INSERT, UPDATE, DELETE)
   */
  execute(sql: string, params?: unknown[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(params ?? []);
  }

  /**
   * Execute multiple statements in a transaction
   */
  transaction<T>(fn: () => T): T {
    const txn = this.db.transaction(fn);
    return txn();
  }

  /**
   * Prepare a statement for reuse
   */
  prepare<T = unknown>(sql: string): Database.Statement<T[]> {
    return this.db.prepare(sql);
  }

  /**
   * Vacuum database to reclaim space
   */
  vacuum(): void {
    this.db.exec('VACUUM');
  }

  /**
   * Analyze database for query optimization
   */
  analyze(): void {
    this.db.exec('ANALYZE');
  }

  /**
   * Get database statistics
   */
  getStats(): {
    pageCount: number;
    pageSize: number;
    schemaVersion: number;
    walMode: boolean;
  } {
    const pageCount = this.db.pragma('page_count', { simple: true }) as number;
    const pageSize = this.db.pragma('page_size', { simple: true }) as number;
    const schemaVersion = this.db.pragma('schema_version', { simple: true }) as number;
    const journalMode = this.db.pragma('journal_mode', { simple: true }) as string;

    return {
      pageCount,
      pageSize,
      schemaVersion,
      walMode: journalMode === 'wal',
    };
  }

  /**
   * Checkpoint WAL (write to main database file)
   */
  checkpoint(): void {
    if (this.config.wal !== false) {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db.open) {
      this.checkpoint(); // Final checkpoint before closing
      this.db.close();
      console.log('[DistributedDatabase] Connection closed');
    }
  }

  /**
   * Create a backup of the database
   */
  backup(destinationPath: string): void {
    const backup = this.db.backup(destinationPath);

    return new Promise<void>((resolve, reject) => {
      const step = () => {
        try {
          const remaining = backup.step(100);
          if (remaining === 0) {
            backup.close();
            resolve();
          } else {
            setImmediate(step);
          }
        } catch (error) {
          backup.close();
          reject(error);
        }
      };
      step();
    }) as unknown as void;
  }

  /**
   * Check if database is healthy
   */
  healthCheck(): { healthy: boolean; error?: string } {
    try {
      const result = this.queryOne<{ check: number }>('SELECT 1 as check');
      return { healthy: result?.check === 1 };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create a database instance with default configuration
 */
export function createDatabase(
  path: string,
  options?: Partial<DatabaseConfig>
): DistributedDatabase {
  return new DistributedDatabase({
    path,
    readonly: false,
    verbose: false,
    wal: true,
    ...options,
  });
}

/**
 * Default database path
 */
export function getDefaultDatabasePath(): string {
  return join(__dirname, '..', 'db', 'distributed.db');
}

/**
 * Create default database instance
 */
export function createDefaultDatabase(): DistributedDatabase {
  return createDatabase(getDefaultDatabasePath());
}
