/**
 * Versioning and Migration System
 *
 * Provides semantic versioning, migration management, and compatibility checking
 * for the Claude Code plugin system.
 *
 * @module @claude/core/versioning
 */

// Export classes
export { VersionManager, versionManager } from './version-manager.js';
export { MigrationEngine, migrationEngine } from './migration-engine.js';
export { CompatibilityChecker, compatibilityChecker } from './compatibility-checker.js';

// Export types
export type {
  // Semver types
  SemverParts,
  ComparisonResult,
  ChangeType,
  IncrementType,
  VersionRange,
  VersionValidation,

  // Commit types
  ConventionalCommit,
  CommitType,
  ChangelogEntry,
  ChangelogOptions,

  // Migration types
  Migration,
  MigrationResult,
  MigrationError,
  MigrationStatus,
  MigrationRecord,
  MigrationEngineOptions,
  MigrationCreateOptions,

  // Compatibility types
  PluginManifest,
  CompatibilityReport,
  CompatibilityIssue,
  CompatibilityWarning,
  SignatureReport,
  SignatureChange,
  CompatibilityMatrix,
} from './types.js';
