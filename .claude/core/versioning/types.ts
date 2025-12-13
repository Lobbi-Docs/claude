/**
 * Type definitions for the versioning and migration system
 */

// ============================================================================
// Semantic Versioning Types
// ============================================================================

/**
 * Parsed semantic version components
 */
export interface SemverParts {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string[];
  build?: string[];
}

/**
 * Version comparison result
 */
export type ComparisonResult = -1 | 0 | 1;

/**
 * Type of version change
 */
export type ChangeType = 'major' | 'minor' | 'patch' | 'prerelease';

/**
 * Increment type for version bumping
 */
export type IncrementType = 'major' | 'minor' | 'patch';

// ============================================================================
// Conventional Commit Types
// ============================================================================

/**
 * Conventional commit message structure
 * Format: type(scope): subject
 */
export interface ConventionalCommit {
  type: CommitType;
  scope?: string;
  subject: string;
  body?: string;
  footer?: string;
  breaking: boolean;
  raw: string;
}

/**
 * Conventional commit types
 */
export type CommitType =
  | 'feat'     // New feature
  | 'fix'      // Bug fix
  | 'docs'     // Documentation
  | 'style'    // Formatting
  | 'refactor' // Code refactoring
  | 'perf'     // Performance improvement
  | 'test'     // Tests
  | 'build'    // Build system
  | 'ci'       // CI/CD
  | 'chore'    // Maintenance
  | 'revert';  // Revert commit

/**
 * Changelog entry generated from commits
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    breaking: string[];
    features: string[];
    fixes: string[];
    other: string[];
  };
  commits: ConventionalCommit[];
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Migration definition
 */
export interface Migration {
  /** Unique version identifier (semver format) */
  version: string;

  /** Human-readable description */
  description: string;

  /** Function to apply migration */
  up: () => Promise<void>;

  /** Function to rollback migration */
  down: () => Promise<void>;

  /** Optional metadata */
  metadata?: {
    author?: string;
    createdAt?: string;
    tags?: string[];
  };
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  success: boolean;
  migrationsApplied: string[];
  errors: MigrationError[];
  startTime: string;
  endTime: string;
  duration: number;
}

/**
 * Migration error details
 */
export interface MigrationError {
  version: string;
  error: string;
  stack?: string;
  timestamp: string;
}

/**
 * Migration status information
 */
export interface MigrationStatus {
  version: string;
  description: string;
  applied: boolean;
  appliedAt?: string;
  appliedBy?: string;
  checksum?: string;
}

/**
 * Migration record in database
 */
export interface MigrationRecord {
  id: number;
  version: string;
  description: string;
  applied_at: string;
  applied_by: string;
  execution_time_ms: number;
  checksum: string;
  direction: 'up' | 'down';
}

/**
 * Migration engine options
 */
export interface MigrationEngineOptions {
  /** Path to migrations directory */
  migrationsPath?: string;

  /** Path to SQLite database */
  dbPath?: string;

  /** Table name for tracking migrations */
  tableName?: string;

  /** Enable dry run mode */
  dryRun?: boolean;

  /** Enable verbose logging */
  verbose?: boolean;
}

// ============================================================================
// Compatibility Types
// ============================================================================

/**
 * Plugin manifest for compatibility checking
 */
export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  apiVersion?: string;
  claudeCodeVersion?: string;
  engines?: {
    claudeCode?: string;
    node?: string;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Compatibility check result
 */
export interface CompatibilityReport {
  compatible: boolean;
  plugin: string;
  pluginVersion: string;
  claudeCodeVersion: string;
  issues: CompatibilityIssue[];
  warnings: CompatibilityWarning[];
  suggestions: string[];
}

/**
 * Compatibility issue (blocking)
 */
export interface CompatibilityIssue {
  type: 'api-breaking' | 'version-mismatch' | 'missing-dependency' | 'peer-conflict';
  severity: 'error';
  message: string;
  details?: string;
  affectedComponent?: string;
}

/**
 * Compatibility warning (non-blocking)
 */
export interface CompatibilityWarning {
  type: 'deprecated-api' | 'version-outdated' | 'untested-version';
  severity: 'warning';
  message: string;
  details?: string;
}

/**
 * API signature comparison result
 */
export interface SignatureReport {
  compatible: boolean;
  breaking: SignatureChange[];
  additions: SignatureChange[];
  deprecations: SignatureChange[];
  removals: SignatureChange[];
}

/**
 * API signature change
 */
export interface SignatureChange {
  type: 'function' | 'class' | 'interface' | 'type' | 'constant';
  name: string;
  changeType: 'added' | 'removed' | 'modified' | 'deprecated';
  oldSignature?: string;
  newSignature?: string;
  breaking: boolean;
  message: string;
}

/**
 * Compatibility matrix for multiple plugins
 */
export interface CompatibilityMatrix {
  claudeCodeVersion: string;
  plugins: {
    [pluginName: string]: {
      version: string;
      compatible: boolean;
      status: 'compatible' | 'warning' | 'incompatible';
      issues: number;
      warnings: number;
    };
  };
  summary: {
    total: number;
    compatible: number;
    warnings: number;
    incompatible: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Version range specification
 */
export interface VersionRange {
  min?: string;
  max?: string;
  exact?: string;
  range?: string; // semver range string like "^1.2.3"
}

/**
 * Version validation result
 */
export interface VersionValidation {
  valid: boolean;
  version?: SemverParts;
  error?: string;
}

/**
 * Changelog generation options
 */
export interface ChangelogOptions {
  fromVersion?: string;
  toVersion: string;
  includeDate?: boolean;
  groupByType?: boolean;
  breakingChangesFirst?: boolean;
}

/**
 * Migration creation options
 */
export interface MigrationCreateOptions {
  name: string;
  description?: string;
  author?: string;
  template?: 'empty' | 'plugin' | 'schema' | 'data';
}
