-- Migration Tracking Schema for Claude Code Plugin System
-- This schema tracks applied migrations and their execution history

-- ============================================================================
-- Migrations Table
-- ============================================================================

-- Main migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  -- Primary key
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Migration identification
  version TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,

  -- Execution tracking
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_by TEXT DEFAULT 'system',
  execution_time_ms INTEGER NOT NULL,

  -- Integrity checking
  checksum TEXT NOT NULL,

  -- Direction tracking (up = apply, down = rollback)
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_migrations_version
  ON migrations(version);

CREATE INDEX IF NOT EXISTS idx_migrations_applied_at
  ON migrations(applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_migrations_direction
  ON migrations(direction);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_migrations_version_direction
  ON migrations(version, direction);

-- ============================================================================
-- Migration Metadata Table (Optional Extended Info)
-- ============================================================================

-- Extended metadata for migrations
CREATE TABLE IF NOT EXISTS migration_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Foreign key to migrations table
  migration_id INTEGER NOT NULL,

  -- Metadata fields
  author TEXT,
  created_at TEXT,
  tags TEXT, -- JSON array of tags
  notes TEXT,

  FOREIGN KEY (migration_id) REFERENCES migrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_migration_metadata_migration_id
  ON migration_metadata(migration_id);

-- ============================================================================
-- Migration Errors Table
-- ============================================================================

-- Track migration errors for debugging
CREATE TABLE IF NOT EXISTS migration_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Migration identification
  version TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),

  -- Error details
  error_message TEXT NOT NULL,
  error_stack TEXT,

  -- Timing
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Context
  attempt_number INTEGER DEFAULT 1,
  context TEXT -- JSON object with additional context
);

CREATE INDEX IF NOT EXISTS idx_migration_errors_version
  ON migration_errors(version);

CREATE INDEX IF NOT EXISTS idx_migration_errors_occurred_at
  ON migration_errors(occurred_at DESC);

-- ============================================================================
-- Migration Locks Table
-- ============================================================================

-- Prevent concurrent migrations
CREATE TABLE IF NOT EXISTS migration_locks (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row

  -- Lock details
  locked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  locked_by TEXT NOT NULL,
  process_id TEXT,

  -- Lock metadata
  operation TEXT NOT NULL, -- 'migrate' or 'rollback'
  target_version TEXT
);

-- ============================================================================
-- Schema Version Table
-- ============================================================================

-- Track schema version separately from migrations
CREATE TABLE IF NOT EXISTS schema_version (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Only one row

  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT DEFAULT 'system'
);

-- Initialize schema version if not exists
INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, '1.0.0');

-- ============================================================================
-- Useful Views
-- ============================================================================

-- View for currently applied migrations
CREATE VIEW IF NOT EXISTS applied_migrations AS
SELECT
  m.version,
  m.description,
  m.applied_at,
  m.applied_by,
  m.execution_time_ms,
  m.checksum
FROM migrations m
WHERE m.direction = 'up'
  AND NOT EXISTS (
    SELECT 1 FROM migrations m2
    WHERE m2.version = m.version
      AND m2.direction = 'down'
      AND m2.applied_at > m.applied_at
  )
ORDER BY m.version;

-- View for pending migrations (would need to be populated from code)
-- This is conceptual - actual pending migrations come from migration files

-- View for migration history with rollbacks
CREATE VIEW IF NOT EXISTS migration_history AS
SELECT
  m.id,
  m.version,
  m.description,
  m.direction,
  m.applied_at,
  m.applied_by,
  m.execution_time_ms,
  CASE
    WHEN m.direction = 'up' THEN 'Applied'
    WHEN m.direction = 'down' THEN 'Rolled back'
  END as action
FROM migrations m
ORDER BY m.applied_at DESC;

-- View for latest migration
CREATE VIEW IF NOT EXISTS latest_migration AS
SELECT
  m.version,
  m.description,
  m.applied_at,
  m.direction
FROM migrations m
WHERE m.direction = 'up'
ORDER BY m.applied_at DESC
LIMIT 1;

-- ============================================================================
-- Triggers
-- ============================================================================

-- Trigger to update schema version on migration
CREATE TRIGGER IF NOT EXISTS update_schema_version_on_migration
AFTER INSERT ON migrations
WHEN NEW.direction = 'up'
BEGIN
  UPDATE schema_version
  SET version = NEW.version,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = 1;
END;

-- Trigger to prevent duplicate migrations
CREATE TRIGGER IF NOT EXISTS prevent_duplicate_migration
BEFORE INSERT ON migrations
BEGIN
  SELECT RAISE(ABORT, 'Migration already applied')
  WHERE NEW.direction = 'up'
    AND EXISTS (
      SELECT 1 FROM migrations
      WHERE version = NEW.version
        AND direction = 'up'
        AND NOT EXISTS (
          SELECT 1 FROM migrations m2
          WHERE m2.version = NEW.version
            AND m2.direction = 'down'
            AND m2.applied_at > migrations.applied_at
        )
    );
END;

-- ============================================================================
-- Helper Functions (SQLite User-Defined Functions would be in code)
-- ============================================================================

-- These would be implemented in the MigrationEngine class:
-- - get_current_version(): Returns latest applied migration version
-- - is_migration_applied(version): Check if migration is applied
-- - get_pending_migrations(): List migrations not yet applied
-- - acquire_lock(operation, target): Acquire migration lock
-- - release_lock(): Release migration lock

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Uncomment for development/testing
/*
INSERT INTO migrations (version, description, execution_time_ms, checksum, direction)
VALUES
  ('1.0.0', 'Initial schema', 150, 'abc123', 'up'),
  ('1.1.0', 'Add user preferences', 200, 'def456', 'up'),
  ('1.2.0', 'Add OAuth support', 180, 'ghi789', 'up');
*/

-- ============================================================================
-- Schema Information
-- ============================================================================

-- Version: 1.0.0
-- Created: 2025-12-12
-- Purpose: Track plugin migrations for Claude Code
-- Database: SQLite 3
-- Compatibility: Claude Code Plugin System v1.0.0+

-- ============================================================================
-- Usage Notes
-- ============================================================================

-- 1. Query applied migrations:
--    SELECT * FROM applied_migrations;

-- 2. View full migration history:
--    SELECT * FROM migration_history;

-- 3. Get current schema version:
--    SELECT version FROM schema_version WHERE id = 1;

-- 4. Check if migration is applied:
--    SELECT COUNT(*) FROM applied_migrations WHERE version = '1.0.0';

-- 5. Get latest migration:
--    SELECT * FROM latest_migration;

-- 6. View migration errors:
--    SELECT * FROM migration_errors ORDER BY occurred_at DESC;

-- ============================================================================
-- Maintenance
-- ============================================================================

-- Clean up old error logs (keep last 100)
-- DELETE FROM migration_errors
-- WHERE id NOT IN (
--   SELECT id FROM migration_errors
--   ORDER BY occurred_at DESC
--   LIMIT 100
-- );

-- Vacuum database after large migrations
-- VACUUM;

-- Analyze for query optimization
-- ANALYZE;
