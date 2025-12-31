/**
 * Migration Wizard - Core TypeScript Interfaces
 *
 * Comprehensive type definitions for code migration orchestration
 */

// ============================================================================
// Migration Types
// ============================================================================

export type MigrationFramework =
  | 'react'
  | 'vue'
  | 'angular'
  | 'express'
  | 'fastify'
  | 'webpack'
  | 'vite'
  | 'jest'
  | 'vitest'
  | 'mongoose'
  | 'prisma'
  | 'custom';

export type MigrationDifficulty = 'easy' | 'medium' | 'hard' | 'very-hard';

export type MigrationStrategy =
  | 'big-bang'          // All at once
  | 'strangler-fig'     // Incremental replacement
  | 'parallel-run'      // Run both versions
  | 'feature-flag';     // Feature-flagged rollout

export type MigrationPhase =
  | 'analysis'
  | 'planning'
  | 'preparation'
  | 'transformation'
  | 'validation'
  | 'deployment'
  | 'cleanup';

// ============================================================================
// Core Migration Interfaces
// ============================================================================

export interface MigrationConfig {
  id: string;
  name: string;
  description: string;

  source: {
    framework: MigrationFramework;
    version: string;
    patterns: string[];
  };

  target: {
    framework: MigrationFramework;
    version: string;
    patterns: string[];
  };

  strategy: MigrationStrategy;
  difficulty: MigrationDifficulty;

  options: {
    dryRun: boolean;
    backup: boolean;
    validateBeforeApply: boolean;
    runTests: boolean;
    autoFormat: boolean;
    preserveComments: boolean;
    generateTypes: boolean;
  };
}

export interface MigrationPlan {
  config: MigrationConfig;

  scope: {
    totalFiles: number;
    affectedFiles: string[];
    breakingChanges: number;
    estimatedManualFixes: number;
  };

  phases: MigrationPhaseDetail[];

  estimates: {
    duration: { min: number; max: number }; // minutes
    complexity: number; // 0-100
    risk: 'low' | 'medium' | 'high' | 'critical';
    successProbability: number; // 0-100
  };

  dependencies: {
    toAdd: PackageDependency[];
    toRemove: PackageDependency[];
    toUpdate: PackageDependency[];
    conflicts: DependencyConflict[];
  };

  rollbackStrategy: RollbackStrategy;
}

export interface MigrationPhaseDetail {
  phase: MigrationPhase;
  name: string;
  description: string;

  tasks: MigrationTask[];

  agents: {
    agent: string;
    role: string;
    model: 'haiku' | 'sonnet' | 'opus';
  }[];

  estimatedDuration: number; // minutes
  dependencies: MigrationPhase[];
  canRunInParallel: boolean;
}

export interface MigrationTask {
  id: string;
  name: string;
  type: 'automated' | 'manual' | 'validation';

  files: string[];
  codemod?: string; // Path to codemod file

  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

  validation: {
    required: boolean;
    tests: string[];
    linters: string[];
  };

  manualSteps?: string[];
}

// ============================================================================
// Codemod Interfaces
// ============================================================================

export interface Codemod {
  id: string;
  name: string;
  description: string;

  framework: MigrationFramework;
  type: CodemodType;

  transform: string; // Path to jscodeshift transform
  parser: 'babel' | 'typescript' | 'flow' | 'tsx';

  options: Record<string, any>;

  testCases: CodemodTestCase[];
}

export type CodemodType =
  | 'component-transform'
  | 'api-rename'
  | 'import-update'
  | 'syntax-modernization'
  | 'type-migration'
  | 'config-migration'
  | 'test-migration';

export interface CodemodTestCase {
  name: string;
  input: string;
  expected: string;
  options?: Record<string, any>;
}

export interface CodemodResult {
  codemod: string;
  file: string;

  success: boolean;
  modified: boolean;

  changes: {
    additions: number;
    deletions: number;
    modifications: number;
  };

  errors: CodemodError[];
  warnings: CodemodWarning[];

  dryRun: boolean;
  originalContent?: string; // For rollback
}

export interface CodemodError {
  type: 'parse' | 'transform' | 'validation';
  message: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface CodemodWarning {
  type: 'deprecation' | 'manual-fix' | 'breaking-change';
  message: string;
  line?: number;
  suggestion?: string;
}

// ============================================================================
// API Mapping Interfaces
// ============================================================================

export interface APIMapping {
  source: {
    framework: MigrationFramework;
    api: string;
    version: string;
  };

  target: {
    framework: MigrationFramework;
    api: string;
    version: string;
  };

  mappings: APIMappingRule[];
  breakingChanges: BreakingChange[];
}

export interface APIMappingRule {
  sourceAPI: string;
  targetAPI: string;

  type: 'direct' | 'indirect' | 'deprecated' | 'removed';

  transformation: {
    automated: boolean;
    codemod?: string;
    manualSteps?: string[];
  };

  examples: {
    before: string;
    after: string;
  }[];

  notes?: string;
}

export interface BreakingChange {
  id: string;
  api: string;
  changeType: 'removed' | 'renamed' | 'signature-changed' | 'behavior-changed';

  severity: 'low' | 'medium' | 'high' | 'critical';

  description: string;
  migration: string; // Migration guide

  affectedFiles: string[];

  automationPossible: boolean;
  estimatedEffort: 'trivial' | 'simple' | 'moderate' | 'complex';
}

// ============================================================================
// Pattern Analysis Interfaces
// ============================================================================

export interface PatternAnalysis {
  framework: MigrationFramework;

  patterns: DetectedPattern[];

  summary: {
    totalOccurrences: number;
    uniquePatterns: number;
    filesAnalyzed: number;
    complexity: number; // 0-100
  };
}

export interface DetectedPattern {
  pattern: string;
  type: string;

  occurrences: PatternOccurrence[];

  migrationPath: {
    targetPattern: string;
    difficulty: MigrationDifficulty;
    codemod?: string;
    manualSteps?: string[];
  };
}

export interface PatternOccurrence {
  file: string;
  line: number;
  column: number;
  code: string;
  context?: string;
}

// ============================================================================
// Strangler Fig Pattern Interfaces
// ============================================================================

export interface StranglerFigConfig {
  strategy: 'route-based' | 'component-based' | 'feature-based' | 'module-based';

  phases: StranglerPhase[];

  routing: {
    strategy: 'proxy' | 'feature-flag' | 'adapter' | 'dual-write';
    config: Record<string, any>;
  };

  rollout: {
    percentage: number;
    criteria: string[];
    rollbackTriggers: string[];
  };
}

export interface StranglerPhase {
  id: string;
  name: string;

  oldSystem: {
    components: string[];
    routes?: string[];
    modules?: string[];
  };

  newSystem: {
    components: string[];
    routes?: string[];
    modules?: string[];
  };

  adapter?: {
    type: 'component' | 'service' | 'middleware';
    path: string;
  };

  status: 'planned' | 'in-progress' | 'testing' | 'deployed' | 'completed';

  rolloutPercentage: number;

  validation: {
    tests: string[];
    metrics: string[];
    successCriteria: string[];
  };
}

// ============================================================================
// Dependency Management Interfaces
// ============================================================================

export interface PackageDependency {
  name: string;
  currentVersion?: string;
  targetVersion: string;
  type: 'dependencies' | 'devDependencies' | 'peerDependencies';
}

export interface DependencyConflict {
  package: string;

  conflict: {
    requiredBy: string[];
    versions: string[];
  };

  resolution: {
    strategy: 'upgrade' | 'downgrade' | 'peer-dep' | 'override';
    version: string;
    notes?: string;
  };
}

// ============================================================================
// Validation Interfaces
// ============================================================================

export interface ValidationResult {
  success: boolean;

  checks: {
    syntax: ValidationCheck;
    types: ValidationCheck;
    runtime: ValidationCheck;
    tests: ValidationCheck;
    linting: ValidationCheck;
  };

  regressions: Regression[];

  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface ValidationCheck {
  name: string;
  passed: boolean;

  errors: string[];
  warnings: string[];

  details?: Record<string, any>;
}

export interface Regression {
  type: 'functional' | 'performance' | 'visual' | 'accessibility';

  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';

  affectedFeatures: string[];

  rootCause?: string;
  suggestedFix?: string;
}

// ============================================================================
// Rollback Interfaces
// ============================================================================

export interface RollbackStrategy {
  enabled: boolean;

  checkpoints: Checkpoint[];

  triggers: {
    testFailureThreshold: number;
    errorThreshold: number;
    manualTrigger: boolean;
  };

  restoreMethod: 'git-reset' | 'git-revert' | 'file-backup' | 'snapshot';
}

export interface Checkpoint {
  id: string;
  timestamp: string;

  phase: MigrationPhase;

  snapshot: {
    type: 'git-commit' | 'file-backup' | 'database-snapshot';
    reference: string; // commit hash or backup path
  };

  state: {
    filesModified: string[];
    testsStatus: 'passing' | 'failing' | 'unknown';
    dependencies: Record<string, string>;
  };
}

// ============================================================================
// Reporting Interfaces
// ============================================================================

export interface MigrationReport {
  migrationId: string;
  timestamp: string;

  summary: {
    status: 'completed' | 'partial' | 'failed' | 'rolled-back';
    filesProcessed: number;
    filesSucceeded: number;
    filesFailed: number;
    duration: number; // minutes
  };

  phases: {
    phase: MigrationPhase;
    status: 'completed' | 'failed' | 'skipped';
    duration: number;
  }[];

  results: {
    automated: {
      successful: number;
      failed: number;
      skipped: number;
    };
    manual: {
      completed: number;
      pending: number;
    };
  };

  breakingChanges: {
    total: number;
    resolved: number;
    pending: number;
    details: BreakingChange[];
  };

  validation: ValidationResult;

  nextSteps: string[];

  artifacts: {
    codemods: string[];
    backups: string[];
    reports: string[];
  };
}
