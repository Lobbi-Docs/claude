/**
 * Debug Detective - Core TypeScript Interfaces
 * Systematic bug investigation through hypothesis-driven debugging
 */

// ============================================================================
// Core Debugging Session
// ============================================================================

export interface DebugSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: DebugSessionStatus;

  // Problem definition
  problem: ProblemStatement;

  // Investigation process
  hypotheses: Hypothesis[];
  evidence: Evidence[];
  experiments: Experiment[];

  // Findings
  rootCause: RootCause | null;
  solution: Solution | null;

  // Metadata
  relatedIssues: string[]; // Jira issue keys
  gitCommits: string[]; // Commits analyzed
  affectedFiles: string[];
  participants: string[]; // Developers involved

  // Metrics
  timeToResolution: number | null; // minutes
  hypothesesTested: number;
  experimentsRun: number;
}

export enum DebugSessionStatus {
  INVESTIGATING = 'investigating',
  HYPOTHESIS_TESTING = 'hypothesis_testing',
  ROOT_CAUSE_FOUND = 'root_cause_found',
  SOLUTION_IMPLEMENTED = 'solution_implemented',
  VERIFIED = 'verified',
  CLOSED = 'closed',
  ABANDONED = 'abandoned'
}

// ============================================================================
// Problem Statement
// ============================================================================

export interface ProblemStatement {
  title: string;
  description: string;

  // Symptoms
  symptoms: Symptom[];
  errorMessages: ErrorMessage[];
  stackTraces: StackTrace[];

  // Context
  environment: Environment;
  reproductionSteps: string[];
  reproductionRate: ReproductionRate;

  // Impact
  severity: Severity;
  affectedUsers: number | 'unknown';
  firstObserved: Date | null;
}

export interface Symptom {
  type: SymptomType;
  description: string;
  observedAt: Date;
  frequency: 'always' | 'often' | 'sometimes' | 'rarely';
}

export enum SymptomType {
  CRASH = 'crash',
  EXCEPTION = 'exception',
  NULL_UNDEFINED = 'null_undefined',
  WRONG_VALUE = 'wrong_value',
  PERFORMANCE = 'performance',
  MEMORY_LEAK = 'memory_leak',
  RACE_CONDITION = 'race_condition',
  DEADLOCK = 'deadlock',
  UI_GLITCH = 'ui_glitch',
  DATA_CORRUPTION = 'data_corruption',
  TIMEOUT = 'timeout',
  INFINITE_LOOP = 'infinite_loop'
}

export enum Severity {
  CRITICAL = 'critical',    // System unusable
  HIGH = 'high',           // Major functionality broken
  MEDIUM = 'medium',       // Functionality degraded
  LOW = 'low'              // Minor issue
}

export enum ReproductionRate {
  ALWAYS = 'always',           // 100%
  OFTEN = 'often',             // 75-99%
  SOMETIMES = 'sometimes',     // 25-75%
  RARELY = 'rarely',           // 1-25%
  HEISENBUG = 'heisenbug'      // Disappears when debugging
}

// ============================================================================
// Hypotheses
// ============================================================================

export interface Hypothesis {
  id: string;
  statement: string;
  confidence: number; // 0-100
  priority: number; // 1-10

  // Reasoning
  reasoning: string;
  basedOn: string[]; // Evidence IDs

  // Testing
  status: HypothesisStatus;
  experiments: string[]; // Experiment IDs

  // Results
  conclusion: HypothesisConclusion | null;
  provenBy: string[]; // Evidence IDs
  disprovenBy: string[]; // Evidence IDs

  // Alternative hypotheses
  spawns: string[]; // New hypothesis IDs created from this one
  supersedes: string | null; // Hypothesis ID this replaces

  createdAt: Date;
  testedAt: Date | null;
  concludedAt: Date | null;
}

export enum HypothesisStatus {
  PROPOSED = 'proposed',
  TESTING = 'testing',
  PROVEN = 'proven',
  DISPROVEN = 'disproven',
  NEEDS_MORE_DATA = 'needs_more_data',
  ABANDONED = 'abandoned'
}

export enum HypothesisConclusion {
  PROVEN = 'proven',           // This is the root cause
  DISPROVEN = 'disproven',     // Definitely not the cause
  CONTRIBUTING = 'contributing', // Part of the problem
  UNRELATED = 'unrelated'      // Not related to this bug
}

// ============================================================================
// Evidence
// ============================================================================

export interface Evidence {
  id: string;
  type: EvidenceType;
  description: string;

  // Source
  source: EvidenceSource;
  collectedAt: Date;
  collectedBy: string; // Agent name

  // Data
  data: Record<string, unknown>;

  // Analysis
  supports: string[]; // Hypothesis IDs
  contradicts: string[]; // Hypothesis IDs
  reliability: number; // 0-100

  // Metadata
  relatedEvidence: string[];
  tags: string[];
}

export enum EvidenceType {
  LOG_OUTPUT = 'log_output',
  STACK_TRACE = 'stack_trace',
  VARIABLE_VALUE = 'variable_value',
  PROFILER_OUTPUT = 'profiler_output',
  MEMORY_SNAPSHOT = 'memory_snapshot',
  NETWORK_TRACE = 'network_trace',
  DATABASE_QUERY = 'database_query',
  FILE_DIFF = 'file_diff',
  GIT_COMMIT = 'git_commit',
  TEST_RESULT = 'test_result',
  USER_REPORT = 'user_report',
  CODE_ANALYSIS = 'code_analysis',
  TIMING_DATA = 'timing_data'
}

export enum EvidenceSource {
  CONSOLE_LOG = 'console_log',
  DEBUGGER = 'debugger',
  PROFILER = 'profiler',
  GIT_HISTORY = 'git_history',
  AUTOMATED_TEST = 'automated_test',
  MANUAL_TEST = 'manual_test',
  PRODUCTION_LOG = 'production_log',
  CODE_INSPECTION = 'code_inspection',
  STATIC_ANALYSIS = 'static_analysis',
  USER_REPORT = 'user_report'
}

// ============================================================================
// Experiments
// ============================================================================

export interface Experiment {
  id: string;
  hypothesis: string; // Hypothesis ID

  // Design
  name: string;
  description: string;
  method: ExperimentMethod;
  steps: ExperimentStep[];

  // Execution
  status: ExperimentStatus;
  results: ExperimentResult | null;

  // Timing
  createdAt: Date;
  executedAt: Date | null;
  completedAt: Date | null;
}

export enum ExperimentMethod {
  ADD_LOGGING = 'add_logging',
  USE_DEBUGGER = 'use_debugger',
  MODIFY_CODE = 'modify_code',
  COMPARE_STATES = 'compare_states',
  GIT_BISECT = 'git_bisect',
  REPRODUCE_LOCALLY = 'reproduce_locally',
  PROFILE_PERFORMANCE = 'profile_performance',
  ANALYZE_MEMORY = 'analyze_memory',
  TEST_BOUNDARY = 'test_boundary',
  ISOLATE_COMPONENT = 'isolate_component',
  TRACE_DATA_FLOW = 'trace_data_flow'
}

export interface ExperimentStep {
  order: number;
  action: string;
  expectedResult: string;
  actualResult?: string;
  completed: boolean;
}

export enum ExperimentStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked'
}

export interface ExperimentResult {
  success: boolean;
  observations: string[];
  evidenceCollected: string[]; // Evidence IDs
  conclusion: string;
  nextSteps: string[];
}

// ============================================================================
// Root Cause Analysis
// ============================================================================

export interface RootCause {
  type: RootCauseType;
  description: string;

  // Location
  file: string;
  lineNumber: number | null;
  function: string | null;

  // Explanation
  whatWentWrong: string;
  whyItHappened: string;
  howToFix: string;

  // Supporting evidence
  provenBy: string[]; // Hypothesis IDs
  evidence: string[]; // Evidence IDs

  // Historical context
  introducedIn: string | null; // Git commit hash
  introducedAt: Date | null;
  introducedBy: string | null; // Author

  // Impact
  cascadingEffects: CascadingEffect[];
  relatedBugs: string[]; // Other bug IDs
}

export enum RootCauseType {
  NULL_POINTER = 'null_pointer',
  TYPE_ERROR = 'type_error',
  LOGIC_ERROR = 'logic_error',
  OFF_BY_ONE = 'off_by_one',
  RACE_CONDITION = 'race_condition',
  DEADLOCK = 'deadlock',
  MEMORY_LEAK = 'memory_leak',
  RESOURCE_LEAK = 'resource_leak',
  INFINITE_LOOP = 'infinite_loop',
  STACK_OVERFLOW = 'stack_overflow',
  CONFIGURATION_ERROR = 'configuration_error',
  DEPENDENCY_ISSUE = 'dependency_issue',
  ENVIRONMENTAL = 'environmental',
  CONCURRENCY = 'concurrency',
  PERFORMANCE = 'performance',
  DATA_CORRUPTION = 'data_corruption',
  API_MISUSE = 'api_misuse',
  SECURITY_VULNERABILITY = 'security_vulnerability'
}

export interface CascadingEffect {
  description: string;
  severity: Severity;
  affectedComponent: string;
}

// ============================================================================
// Solution
// ============================================================================

export interface Solution {
  description: string;
  approach: SolutionApproach;

  // Implementation
  changes: CodeChange[];
  tests: TestRequirement[];

  // Verification
  verified: boolean;
  verificationMethod: string;
  verificationDate: Date | null;

  // Prevention
  preventionMeasures: PreventionMeasure[];
  lessonsLearned: string[];

  // Metadata
  implementedBy: string;
  reviewedBy: string[];
  deployedAt: Date | null;
}

export enum SolutionApproach {
  FIX_ROOT_CAUSE = 'fix_root_cause',
  WORKAROUND = 'workaround',
  DEFENSIVE_PROGRAMMING = 'defensive_programming',
  REFACTOR = 'refactor',
  ADD_VALIDATION = 'add_validation',
  IMPROVE_ERROR_HANDLING = 'improve_error_handling',
  CONFIGURATION_CHANGE = 'configuration_change',
  DEPENDENCY_UPDATE = 'dependency_update',
  ARCHITECTURAL_CHANGE = 'architectural_change'
}

export interface CodeChange {
  file: string;
  description: string;
  diffUrl: string | null;
  linesAdded: number;
  linesRemoved: number;
}

export interface TestRequirement {
  type: 'unit' | 'integration' | 'e2e' | 'regression';
  description: string;
  implemented: boolean;
  testFile: string | null;
}

export interface PreventionMeasure {
  type: PreventionType;
  description: string;
  implemented: boolean;
}

export enum PreventionType {
  LINTING_RULE = 'linting_rule',
  TYPE_CHECK = 'type_check',
  AUTOMATED_TEST = 'automated_test',
  CODE_REVIEW_CHECKLIST = 'code_review_checklist',
  DOCUMENTATION = 'documentation',
  MONITORING = 'monitoring',
  ALERT = 'alert',
  ARCHITECTURE_GUIDE = 'architecture_guide'
}

// ============================================================================
// Error Analysis
// ============================================================================

export interface ErrorMessage {
  raw: string;
  parsed: ParsedError;
  context: ErrorContext;
}

export interface ParsedError {
  type: string;
  message: string;
  code: string | null;
  severity: Severity;
}

export interface ErrorContext {
  timestamp: Date;
  environment: string;
  userId: string | null;
  sessionId: string | null;
  requestId: string | null;
}

export interface StackTrace {
  frames: StackFrame[];
  raw: string;
  parsed: boolean;
}

export interface StackFrame {
  index: number;
  function: string | null;
  file: string;
  line: number;
  column: number;

  // Analysis
  isUserCode: boolean;
  isThirdParty: boolean;
  suspiciousness: number; // 0-100

  // Code context
  codeSnippet?: string;
  variables?: Record<string, unknown>;
}

// ============================================================================
// Data Flow Tracing
// ============================================================================

export interface DataFlowTrace {
  variable: string;
  startValue: unknown;
  endValue: unknown;

  // Trace path
  transformations: DataTransformation[];

  // Analysis
  whereItBecameInvalid: DataTransformation | null;
  possibleSources: string[];
}

export interface DataTransformation {
  location: CodeLocation;
  operation: string;
  valueBefore: unknown;
  valueAfter: unknown;
  isValid: boolean;
  timestamp: number; // Relative to trace start
}

export interface CodeLocation {
  file: string;
  line: number;
  column: number;
  function: string | null;
}

// ============================================================================
// State Comparison
// ============================================================================

export interface StateComparison {
  workingState: SystemState;
  brokenState: SystemState;
  differences: StateDifference[];
  significantDifferences: StateDifference[];
}

export interface SystemState {
  timestamp: Date;
  gitCommit: string;
  environment: Environment;
  variables: Record<string, unknown>;
  configuration: Record<string, unknown>;
  dependencies: Record<string, string>;
}

export interface StateDifference {
  path: string; // JSON path to the difference
  workingValue: unknown;
  brokenValue: unknown;
  significance: number; // 0-100
  likelyRelevant: boolean;
  explanation: string;
}

// ============================================================================
// Git Bisect
// ============================================================================

export interface BisectSession {
  id: string;
  status: BisectStatus;

  // Range
  goodCommit: string;
  badCommit: string;

  // Progress
  testedCommits: TestedCommit[];
  currentCommit: string | null;
  estimatedRemaining: number;

  // Results
  firstBadCommit: string | null;
  culpritCommit: GitCommit | null;

  // Configuration
  testCommand: string;
  automatedTest: boolean;
}

export enum BisectStatus {
  SETUP = 'setup',
  RUNNING = 'running',
  FOUND = 'found',
  ABORTED = 'aborted',
  INCONCLUSIVE = 'inconclusive'
}

export interface TestedCommit {
  hash: string;
  result: 'good' | 'bad' | 'skip';
  testedAt: Date;
  testOutput: string;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  date: Date;
  message: string;
  filesChanged: string[];
  diff: string;
}

// ============================================================================
// Environment
// ============================================================================

export interface Environment {
  type: 'development' | 'staging' | 'production' | 'test';
  os: string;
  platform: string;
  runtime: RuntimeInfo;
  dependencies: Record<string, string>;
  configuration: Record<string, unknown>;
}

export interface RuntimeInfo {
  name: string; // 'node', 'browser', 'deno', etc.
  version: string;
  flags: string[];
}

// ============================================================================
// Logging Strategy
// ============================================================================

export interface LoggingStrategy {
  placements: LogPlacement[];
  format: LogFormat;
  estimatedOutputLines: number;
}

export interface LogPlacement {
  file: string;
  line: number;
  function: string | null;

  // What to log
  message: string;
  variables: string[];

  // Why
  purpose: string;
  hypothesis: string; // Hypothesis ID

  // Priority
  priority: number; // 1-10
  essential: boolean;
}

export interface LogFormat {
  prefix: string;
  includeTimestamp: boolean;
  includeLocation: boolean;
  includeStackTrace: boolean;
  format: 'json' | 'text';
}

// ============================================================================
// Breakpoint Strategy
// ============================================================================

export interface BreakpointStrategy {
  breakpoints: Breakpoint[];
  watchExpressions: WatchExpression[];
  inspectionPlan: string[];
}

export interface Breakpoint {
  file: string;
  line: number;

  // Conditions
  condition?: string;
  hitCount?: number;
  logMessage?: string;

  // Purpose
  purpose: string;
  hypothesis: string; // Hypothesis ID

  // What to inspect
  inspectVariables: string[];
  inspectCallStack: boolean;
}

export interface WatchExpression {
  expression: string;
  purpose: string;
  expectedValue?: unknown;
}

// ============================================================================
// Debug Report
// ============================================================================

export interface DebugReport {
  session: DebugSession;

  // Summary
  executiveSummary: string;
  timeline: TimelineEvent[];

  // Key findings
  rootCause: RootCause;
  solution: Solution;

  // Process metrics
  metrics: DebugMetrics;

  // Appendices
  allHypotheses: Hypothesis[];
  allEvidence: Evidence[];
  allExperiments: Experiment[];

  // Recommendations
  recommendations: string[];
  preventionMeasures: PreventionMeasure[];

  generatedAt: Date;
}

export interface TimelineEvent {
  timestamp: Date;
  type: 'hypothesis' | 'experiment' | 'evidence' | 'breakthrough' | 'dead-end';
  description: string;
  significance: number; // 0-100
}

export interface DebugMetrics {
  totalTime: number; // minutes
  hypothesesGenerated: number;
  hypothesesTested: number;
  experimentsRun: number;
  evidenceCollected: number;
  deadEnds: number;
  breakthroughs: number;

  // Efficiency
  timeToFirstHypothesis: number; // minutes
  timeToRootCause: number; // minutes
  timeToSolution: number; // minutes

  // Quality
  accuracy: number; // 0-100 (how many hypotheses led to root cause)
  efficiency: number; // 0-100 (time vs optimal)
}
