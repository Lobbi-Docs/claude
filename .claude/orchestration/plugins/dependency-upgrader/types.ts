/**
 * Core TypeScript interfaces for Dependency Upgrade Assistant Plugin
 * These types ensure type-safe communication between agents and workflows
 */

export type PackageEcosystem = 'npm' | 'pip' | 'cargo' | 'yarn' | 'pnpm' | 'poetry';
export type UpdateType = 'patch' | 'minor' | 'major';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type UpgradeStatus = 'pending' | 'analyzing' | 'ready' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';

/**
 * Represents a dependency in the project
 */
export interface DependencyInfo {
  name: string;
  ecosystem: PackageEcosystem;
  currentVersion: string;
  latestVersion: string;
  wantedVersion?: string; // Based on semver constraints
  updateType: UpdateType;
  isDeprecated: boolean;
  hasSecurityVulnerability: boolean;
  vulnerabilities?: SecurityVulnerability[];
  registryUrl: string;
  repositoryUrl?: string;
  changelogUrl?: string;
  manifest: string; // Path to package.json, requirements.txt, etc.
}

/**
 * Security vulnerability information
 */
export interface SecurityVulnerability {
  id: string; // CVE or GHSA identifier
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  patchedVersions: string[];
  references: string[];
}

/**
 * Complete dependency analysis report
 */
export interface DependencyReport {
  timestamp: string;
  ecosystem: PackageEcosystem;
  manifestPath: string;
  totalDependencies: number;
  summary: {
    patch: number;
    minor: number;
    major: number;
    deprecated: number;
    vulnerable: number;
  };
  dependencies: DependencyInfo[];
  recommendations: {
    safeToUpgrade: DependencyInfo[];
    requiresReview: DependencyInfo[];
    highRisk: DependencyInfo[];
  };
}

/**
 * Breaking change detected in a package update
 */
export interface BreakingChange {
  id: string;
  package: string;
  fromVersion: string;
  toVersion: string;
  category: 'api_removal' | 'api_change' | 'config_change' | 'behavior_change' | 'dependency_update' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedAPIs: string[];
  migrationHint?: string;
  documentationUrl?: string;
  exampleBefore?: string;
  exampleAfter?: string;
  automated: boolean; // Can this be auto-migrated?
}

/**
 * Report of all breaking changes for an upgrade
 */
export interface BreakingChangeReport {
  package: string;
  fromVersion: string;
  toVersion: string;
  versionGap: number; // Number of major versions
  breakingChanges: BreakingChange[];
  deprecations: BreakingChange[];
  totalBreakingChanges: number;
  automatable: number; // How many can be auto-fixed
  requiresManual: number;
  changelogUrl?: string;
  migrationGuideUrl?: string;
}

/**
 * Code location affected by a breaking change
 */
export interface CodeImpact {
  id: string;
  breakingChangeId: string;
  file: string;
  line: number;
  column?: number;
  code: string; // The affected code snippet
  issue: string; // What's broken
  suggestion: string; // How to fix it
  automated: boolean; // Can be auto-fixed
  estimatedEffort: 'trivial' | 'low' | 'medium' | 'high';
}

/**
 * Complete code impact analysis
 */
export interface CodeImpactReport {
  package: string;
  breakingChangeReport: BreakingChangeReport;
  impacts: CodeImpact[];
  summary: {
    filesAffected: number;
    totalImpacts: number;
    autoFixable: number;
    manualRequired: number;
    estimatedHours: number;
  };
  riskScore: number; // 0-100
}

/**
 * A single migration step (e.g., a codemod or script)
 */
export interface MigrationStep {
  id: string;
  type: 'codemod' | 'script' | 'manual' | 'patch';
  description: string;
  targetFiles: string[];
  scriptPath?: string; // Path to generated migration script
  command?: string; // Command to execute
  validation?: string; // How to validate this step worked
  estimatedTime: string; // e.g., "2 minutes"
  rollbackCommand?: string;
}

/**
 * Migration artifacts for a package upgrade
 */
export interface MigrationArtifacts {
  package: string;
  fromVersion: string;
  toVersion: string;
  steps: MigrationStep[];
  codemods: {
    path: string;
    description: string;
    affectedFiles: number;
  }[];
  patches: {
    path: string;
    description: string;
  }[];
  manualInstructions: string;
  totalSteps: number;
  automatedSteps: number;
}

/**
 * Test execution plan
 */
export interface TestPlan {
  strategy: 'full' | 'targeted' | 'smoke' | 'regression';
  priority: 'critical' | 'high' | 'medium' | 'low';
  tests: {
    name: string;
    type: 'unit' | 'integration' | 'e2e' | 'smoke';
    command: string;
    estimatedDuration: number; // seconds
    priority: number; // 1-10
    reason: string; // Why this test is relevant
  }[];
  estimatedTotalTime: number; // seconds
  parallelizable: boolean;
  requiredForApproval: string[]; // Test names that must pass
}

/**
 * Test execution results
 */
export interface TestResults {
  plan: TestPlan;
  executedAt: string;
  duration: number; // seconds
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  failures: {
    test: string;
    error: string;
    output: string;
    relatedToUpgrade: boolean;
  }[];
  coverage?: {
    before: number;
    after: number;
    delta: number;
  };
  passed: boolean;
}

/**
 * Incremental upgrade path for major version jumps
 */
export interface UpgradePath {
  package: string;
  fromVersion: string;
  toVersion: string;
  strategy: 'direct' | 'incremental' | 'staged';
  steps: {
    step: number;
    targetVersion: string;
    breakingChanges: number;
    estimatedEffort: string;
    validationCheckpoint: string;
    rollbackPlan: string;
    dependencies: string[]; // Steps that must complete first
  }[];
  totalSteps: number;
  estimatedTotalTime: string;
  recommendedApproach: string;
  risks: string[];
}

/**
 * Compatibility check results
 */
export interface CompatibilityReport {
  package: string;
  targetVersion: string;
  compatible: boolean;
  conflicts: {
    package: string;
    constraint: string;
    issue: string;
    resolution?: string;
  }[];
  peerDependencies: {
    package: string;
    required: string;
    current: string;
    compatible: boolean;
  }[];
  lockfileChanges: {
    added: string[];
    removed: string[];
    updated: string[];
  };
  recommendations: string[];
}

/**
 * Risk assessment for an upgrade
 */
export interface RiskAssessment {
  package: string;
  fromVersion: string;
  toVersion: string;
  overallRiskScore: number; // 0-100
  riskLevel: RiskLevel;
  factors: {
    breakingChanges: { score: number; weight: number; details: string };
    codeImpact: { score: number; weight: number; details: string };
    testCoverage: { score: number; weight: number; details: string };
    packageMaturity: { score: number; weight: number; details: string };
    communityAdoption: { score: number; weight: number; details: string };
    rollbackDifficulty: { score: number; weight: number; details: string };
  };
  mitigations: {
    action: string;
    reducesRiskBy: number;
    effort: 'low' | 'medium' | 'high';
  }[];
  recommendation: 'proceed' | 'proceed_with_caution' | 'defer' | 'reject';
  reasoning: string;
}

/**
 * Rollback plan
 */
export interface RollbackPlan {
  package: string;
  backupBranch: string;
  checkpoints: {
    name: string;
    timestamp: string;
    state: Record<string, unknown>;
  }[];
  quickRollback: {
    description: string;
    commands: string[];
    estimatedTime: string;
  };
  fullRollback: {
    description: string;
    commands: string[];
    estimatedTime: string;
  };
  monitoring: {
    metric: string;
    threshold: number;
    action: string;
  }[];
}

/**
 * Validation results
 */
export interface ValidationReport {
  package: string;
  version: string;
  validatedAt: string;
  checks: {
    name: string;
    passed: boolean;
    details: string;
    error?: string;
  }[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  migrationsApplied: number;
  deprecatedAPIsRemaining: string[];
  testResults: TestResults;
  overall: 'passed' | 'failed' | 'partial';
  issues: string[];
  signedOff: boolean;
}

/**
 * Complete upgrade documentation
 */
export interface UpgradeDocumentation {
  package: string;
  fromVersion: string;
  toVersion: string;
  summary: string;
  breakingChanges: string[];
  filesModified: string[];
  migrationSteps: string[];
  testingPerformed: string[];
  rollbackProcedure: string;
  commitMessage: string;
  prDescription: string;
  releaseNotes: string;
  runbook: string; // Step-by-step guide for team
}

/**
 * Main upgrade session state
 */
export interface UpgradeSession {
  id: string;
  package: string;
  ecosystem: PackageEcosystem;
  fromVersion: string;
  toVersion: string;
  status: UpgradeStatus;
  startedAt: string;
  completedAt?: string;
  initiatedBy: string;

  // Workflow outputs from each agent
  dependencyReport?: DependencyReport;
  breakingChangeReport?: BreakingChangeReport;
  codeImpactReport?: CodeImpactReport;
  migrationArtifacts?: MigrationArtifacts;
  testPlan?: TestPlan;
  upgradePath?: UpgradePath;
  compatibilityReport?: CompatibilityReport;
  riskAssessment?: RiskAssessment;
  rollbackPlan?: RollbackPlan;
  testResults?: TestResults;
  validationReport?: ValidationReport;
  documentation?: UpgradeDocumentation;

  // Session metadata
  config: {
    riskTolerance: RiskLevel;
    autoRunTests: boolean;
    requireApproval: boolean;
    createBackupBranch: boolean;
  };
  errors: {
    timestamp: string;
    agent: string;
    error: string;
    recovered: boolean;
  }[];
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  session: UpgradeSession;
  projectRoot: string;
  tempDir: string;
  logs: string[];
  checkpoints: Record<string, unknown>[];
}
