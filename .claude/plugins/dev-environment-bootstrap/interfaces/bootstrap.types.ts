/**
 * Dev Environment Bootstrap - Core TypeScript Interfaces
 *
 * Type definitions for project analysis, dependency management,
 * configuration generation, and environment validation.
 */

// ============================================================================
// Project Analysis
// ============================================================================

export interface ProjectAnalysis {
  projectName: string;
  projectPath: string;
  detectedAt: string; // ISO timestamp
  techStack: TechStack;
  dependencies: DependencyGraph;
  buildSystem: BuildSystem;
  platforms: Platform[];
  recommendations: Recommendation[];
}

export interface TechStack {
  languages: Language[];
  frameworks: Framework[];
  databases: Database[];
  caching: CacheSystem[];
  messageQueues: MessageQueue[];
  runtime: Runtime;
}

export interface Language {
  name: string; // "JavaScript", "Python", "Go", etc.
  version: string | null;
  detectedFrom: string[]; // File paths that confirmed this
  packageManager: PackageManager;
}

export interface PackageManager {
  name: string; // "npm", "pip", "cargo", etc.
  version: string | null;
  lockFile: string | null; // "package-lock.json", "requirements.lock", etc.
  configFile: string; // "package.json", "requirements.txt", etc.
}

export interface Framework {
  name: string; // "Next.js", "FastAPI", "Django", etc.
  version: string;
  category: "frontend" | "backend" | "fullstack" | "mobile";
}

export interface Database {
  type: string; // "PostgreSQL", "MongoDB", "Redis", etc.
  version: string | null;
  required: boolean;
  connectionEnvVars: string[]; // ["DATABASE_URL", "POSTGRES_PASSWORD"]
}

export interface CacheSystem {
  type: string; // "Redis", "Memcached", etc.
  version: string | null;
  required: boolean;
}

export interface MessageQueue {
  type: string; // "RabbitMQ", "Kafka", "Redis", etc.
  version: string | null;
  required: boolean;
}

export interface Runtime {
  type: string; // "Node.js", "Python", "Go", etc.
  version: string;
  architecture: "x64" | "arm64" | "both";
}

// ============================================================================
// Dependency Management
// ============================================================================

export interface DependencyGraph {
  direct: Dependency[];
  dev: Dependency[];
  peer: Dependency[];
  missing: MissingDependency[];
  conflicts: DependencyConflict[];
  vulnerabilities: Vulnerability[];
}

export interface Dependency {
  name: string;
  version: string;
  requiredVersion: string; // Semver range from package file
  resolved: boolean;
  source: string; // "npm", "pip", "cargo", etc.
  size: number | null; // In bytes
  license: string | null;
}

export interface MissingDependency {
  name: string;
  requiredBy: string[]; // Which packages require this
  recommendedVersion: string;
  installCommand: string;
  critical: boolean; // Blocks builds if true
}

export interface DependencyConflict {
  package: string;
  requestedVersions: {
    version: string;
    requestedBy: string;
  }[];
  resolution: string; // How to resolve
  severity: "low" | "medium" | "high";
}

export interface Vulnerability {
  package: string;
  currentVersion: string;
  severity: "low" | "medium" | "high" | "critical";
  cve: string | null;
  title: string;
  fixedIn: string | null;
  patchAvailable: boolean;
}

// ============================================================================
// Build System
// ============================================================================

export interface BuildSystem {
  type: string; // "npm scripts", "Make", "Gradle", "Cargo", etc.
  configFile: string;
  buildCommand: string;
  testCommand: string | null;
  startCommand: string | null;
  lintCommand: string | null;
  formatCommand: string | null;
  customScripts: Record<string, string>;
}

// ============================================================================
// Docker Configuration
// ============================================================================

export interface DockerConfiguration {
  dockerfile: DockerfileConfig;
  dockerCompose: DockerComposeConfig;
  dockerignore: string[];
  devContainer?: DevContainerConfig;
}

export interface DockerfileConfig {
  baseImage: string;
  baseImageTag: string;
  multiStage: boolean;
  stages: DockerStage[];
  exposedPorts: number[];
  volumes: string[];
  environment: Record<string, string>;
  healthCheck: HealthCheck | null;
  user: string; // "node", "python", "nonroot", etc.
}

export interface DockerStage {
  name: string; // "builder", "production", etc.
  from: string;
  workdir: string;
  copyInstructions: CopyInstruction[];
  runCommands: string[];
  environment: Record<string, string>;
}

export interface CopyInstruction {
  source: string;
  destination: string;
  from?: string; // Stage name for multi-stage
  chown?: string;
}

export interface HealthCheck {
  command: string;
  interval: string; // "30s"
  timeout: string; // "3s"
  retries: number;
  startPeriod: string; // "40s"
}

export interface DockerComposeConfig {
  version: string;
  services: Record<string, DockerComposeService>;
  networks: Record<string, DockerNetwork>;
  volumes: Record<string, DockerVolume>;
}

export interface DockerComposeService {
  image?: string;
  build?: {
    context: string;
    dockerfile: string;
    target?: string;
    args?: Record<string, string>;
  };
  ports: string[];
  environment: Record<string, string>;
  envFile?: string[];
  volumes: string[];
  dependsOn: string[];
  networks: string[];
  healthcheck?: HealthCheck;
  restart?: string;
  command?: string;
}

export interface DockerNetwork {
  driver: string;
  external?: boolean;
}

export interface DockerVolume {
  driver: string;
  external?: boolean;
}

export interface DevContainerConfig {
  name: string;
  dockerComposeFile: string[];
  service: string;
  workspaceFolder: string;
  customizations: {
    vscode: {
      extensions: string[];
      settings: Record<string, unknown>;
    };
  };
  forwardPorts: number[];
  postCreateCommand?: string;
  postStartCommand?: string;
}

// ============================================================================
// Environment Configuration
// ============================================================================

export interface EnvironmentTemplate {
  variables: EnvVariable[];
  generatedAt: string;
  templatePath: string; // .env.example
  documentation: string; // README section
}

export interface EnvVariable {
  key: string;
  description: string;
  required: boolean;
  defaultValue: string | null;
  example: string;
  category: EnvCategory;
  validation?: {
    type: "string" | "number" | "boolean" | "url" | "email" | "port";
    pattern?: string; // Regex
    min?: number;
    max?: number;
  };
}

export type EnvCategory =
  | "application"
  | "database"
  | "cache"
  | "api-keys"
  | "auth"
  | "feature-flags"
  | "monitoring"
  | "deployment";

// ============================================================================
// IDE Configuration
// ============================================================================

export interface IDEConfiguration {
  vscode?: VSCodeConfig;
  cursor?: CursorConfig;
}

export interface VSCodeConfig {
  settings: VSCodeSettings;
  extensions: VSCodeExtension[];
  tasks: VSCodeTask[];
  launch: VSCodeLaunchConfig[];
}

export interface VSCodeSettings {
  "editor.formatOnSave": boolean;
  "editor.defaultFormatter": string;
  "editor.codeActionsOnSave": Record<string, boolean>;
  "files.associations": Record<string, string>;
  [key: string]: unknown; // Additional settings
}

export interface VSCodeExtension {
  id: string;
  name: string;
  reason: string; // Why this extension is recommended
  required: boolean;
}

export interface VSCodeTask {
  label: string;
  type: string;
  command: string;
  problemMatcher: string[];
  group?: {
    kind: "build" | "test";
    isDefault: boolean;
  };
}

export interface VSCodeLaunchConfig {
  type: string;
  request: "launch" | "attach";
  name: string;
  program?: string;
  args?: string[];
  env?: Record<string, string>;
  preLaunchTask?: string;
  postDebugTask?: string;
}

export interface CursorConfig extends VSCodeConfig {
  // Cursor-specific settings (extends VSCode)
  cursorRules?: string[]; // .cursorrules content
}

// ============================================================================
// Git Hooks
// ============================================================================

export interface GitHooksConfig {
  framework: "husky" | "pre-commit" | "native";
  hooks: GitHook[];
  installCommand: string;
  configFile: string;
}

export interface GitHook {
  name: string; // "pre-commit", "pre-push", etc.
  script: string;
  enabled: boolean;
  description: string;
  dependencies: string[]; // Required tools: ["eslint", "prettier"]
}

// ============================================================================
// Environment Validation
// ============================================================================

export interface ValidationReport {
  valid: boolean;
  timestamp: string;
  platform: Platform;
  checks: ValidationCheck[];
  summary: ValidationSummary;
}

export interface Platform {
  os: "linux" | "darwin" | "windows";
  arch: "x64" | "arm64";
  version: string;
  shell: string;
}

export interface ValidationCheck {
  category: CheckCategory;
  name: string;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
  expected?: string;
  actual?: string;
  fixCommand?: string;
  documentation?: string;
}

export type CheckCategory =
  | "runtime"
  | "dependencies"
  | "tools"
  | "configuration"
  | "environment"
  | "build"
  | "docker";

export interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
  skipped: number;
  estimatedFixTime: string; // "5 minutes", "30 minutes", etc.
}

// ============================================================================
// Build Verification
// ============================================================================

export interface BuildReport {
  success: boolean;
  timestamp: string;
  duration: number; // In seconds
  steps: BuildStep[];
  errors: BuildError[];
  warnings: BuildWarning[];
  artifacts: BuildArtifact[];
}

export interface BuildStep {
  name: string;
  status: "success" | "failed" | "skipped";
  duration: number;
  output: string;
  command: string;
}

export interface BuildError {
  step: string;
  message: string;
  stackTrace?: string;
  file?: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface BuildWarning {
  step: string;
  message: string;
  severity: "low" | "medium" | "high";
}

export interface BuildArtifact {
  type: "binary" | "image" | "package" | "bundle";
  path: string;
  size: number;
  checksum?: string;
}

// ============================================================================
// Troubleshooting
// ============================================================================

export interface TroubleshootingReport {
  issue: string;
  timestamp: string;
  diagnosis: Diagnosis;
  environmentDiff: EnvironmentDiff | null;
  suggestedFixes: Fix[];
  appliedFixes: Fix[];
  resolved: boolean;
}

export interface Diagnosis {
  category: "dependency" | "configuration" | "platform" | "build" | "runtime";
  rootCause: string;
  evidence: string[];
  severity: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-100
}

export interface EnvironmentDiff {
  comparedWith: "production" | "teammate" | "ci" | "reference";
  differences: EnvironmentDifference[];
}

export interface EnvironmentDifference {
  category: string;
  key: string;
  local: string | null;
  reference: string | null;
  impact: "low" | "medium" | "high";
}

export interface Fix {
  description: string;
  automated: boolean;
  commands: string[];
  estimatedTime: string;
  risks: string[];
  applied: boolean;
  result?: "success" | "failed" | "partial";
  output?: string;
}

// ============================================================================
// Recommendations
// ============================================================================

export interface Recommendation {
  category: "performance" | "security" | "maintainability" | "best-practice";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  effort: "trivial" | "small" | "medium" | "large";
  impact: string;
  implementation: string[];
}

// ============================================================================
// Setup State
// ============================================================================

export interface SetupState {
  initialized: boolean;
  version: string;
  lastUpdated: string;
  completedSteps: SetupStep[];
  pendingSteps: SetupStep[];
  configuration: BootstrapConfiguration;
}

export interface SetupStep {
  id: string;
  name: string;
  status: "pending" | "in-progress" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  agent?: string;
  output?: string;
  error?: string;
}

export interface BootstrapConfiguration {
  autoSetup: boolean;
  dockerEnabled: boolean;
  ideTarget: "vscode" | "cursor" | "both";
  preCommitHooks: boolean;
  includeDevContainer: boolean;
  securityScanning: boolean;
  autoUpdate: boolean;
}
