/**
 * Error Resolution Engine - Core TypeScript Interfaces
 * Defines data structures for error parsing, matching, and fixing
 */

// ============================================================================
// Error Representation
// ============================================================================

export interface ParsedError {
  /** Original error message */
  message: string;

  /** Error type/class (e.g., TypeError, ImportError, panic) */
  type: string;

  /** Programming language detected */
  language: 'typescript' | 'javascript' | 'python' | 'rust' | 'go';

  /** Error severity (1=low, 5=critical) */
  severity: 1 | 2 | 3 | 4 | 5;

  /** Parsed stack trace */
  stackTrace: StackTrace;

  /** Error location */
  location: ErrorLocation;

  /** Error fingerprint for pattern matching */
  fingerprint: string;

  /** Extracted code snippet where error occurred */
  codeSnippet?: string;

  /** Additional metadata */
  metadata: ErrorMetadata;

  /** Timestamp when error was captured */
  timestamp: string;
}

export interface StackTrace {
  /** Raw stack trace string */
  raw: string;

  /** Parsed stack frames */
  frames: StackFrame[];

  /** Root cause frame (where error originated) */
  rootCauseFrame: StackFrame;

  /** Execution flow graph */
  executionFlow: string[];
}

export interface StackFrame {
  /** Function/method name */
  function: string;

  /** File path (absolute or relative) */
  file: string;

  /** Line number */
  line: number;

  /** Column number */
  column?: number;

  /** Whether this is user code (vs library code) */
  isUserCode: boolean;

  /** Source code at this line */
  source?: string;

  /** Module/package name */
  module?: string;
}

export interface ErrorLocation {
  /** File where error occurred */
  file: string;

  /** Line number */
  line: number;

  /** Column number */
  column?: number;

  /** Function/method name */
  function?: string;

  /** Class name (if applicable) */
  className?: string;
}

export interface ErrorMetadata {
  /** Compiler/runtime version */
  version?: string;

  /** Framework being used (e.g., React, FastAPI, Axum) */
  framework?: string;

  /** Package manager (npm, pip, cargo, go mod) */
  packageManager?: string;

  /** Dependencies involved */
  dependencies?: string[];

  /** Environment (dev, prod, test) */
  environment?: string;

  /** Operating system */
  os?: string;

  /** Additional context */
  [key: string]: any;
}

// ============================================================================
// Error Patterns
// ============================================================================

export interface ErrorPattern {
  /** Unique pattern ID */
  id: string;

  /** Pattern name/title */
  name: string;

  /** Error type this pattern matches */
  errorType: string;

  /** Language(s) this pattern applies to */
  languages: string[];

  /** Regex pattern to match error message */
  messagePattern: RegExp;

  /** Stack trace pattern (optional) */
  stackPattern?: RegExp;

  /** Code pattern that causes this error */
  codePattern?: RegExp;

  /** Pattern category */
  category: ErrorCategory;

  /** How many times we've seen this pattern */
  occurrenceCount: number;

  /** Known solutions for this pattern */
  knownSolutions: Solution[];

  /** Prevention strategies */
  preventionStrategies: PreventionStrategy[];

  /** Confidence threshold (0-1) */
  confidenceThreshold: number;

  /** Tags for searching */
  tags: string[];
}

export type ErrorCategory =
  | 'syntax'
  | 'type'
  | 'import'
  | 'runtime'
  | 'null-pointer'
  | 'bounds'
  | 'async'
  | 'concurrency'
  | 'io'
  | 'network'
  | 'database'
  | 'configuration'
  | 'dependency'
  | 'compilation';

export interface PatternMatch {
  /** Pattern that matched */
  pattern: ErrorPattern;

  /** Confidence score (0-1) */
  confidence: number;

  /** Which parts matched */
  matchedComponents: {
    message: boolean;
    stack: boolean;
    code: boolean;
  };

  /** Extracted variables from pattern */
  capturedGroups?: Record<string, string>;
}

// ============================================================================
// Solutions
// ============================================================================

export interface Solution {
  /** Unique solution ID */
  id: string;

  /** Solution title */
  title: string;

  /** Detailed explanation */
  explanation: string;

  /** Solution type */
  type: SolutionType;

  /** Code fix (if applicable) */
  fix?: CodeFix;

  /** Source of solution */
  source: SolutionSource;

  /** Confidence score (0-1) */
  confidence: number;

  /** Applicability score for current error (0-1) */
  relevance: number;

  /** Upvotes/validation count */
  validationScore: number;

  /** When solution was last verified */
  lastVerified?: string;

  /** Test case to verify fix */
  testCase?: TestCase;

  /** Prevention advice */
  prevention?: string;
}

export type SolutionType =
  | 'code-fix'
  | 'configuration-change'
  | 'dependency-update'
  | 'environment-setup'
  | 'workaround'
  | 'refactor';

export interface CodeFix {
  /** Type of fix */
  type: 'replace' | 'insert' | 'delete' | 'modify';

  /** Original code (for replacement) */
  original?: string;

  /** Fixed code */
  fixed: string;

  /** Unified diff patch */
  patch: string;

  /** File to apply fix to */
  file: string;

  /** Line range affected */
  lineRange: {
    start: number;
    end: number;
  };

  /** Additional files to modify */
  additionalChanges?: FileChange[];

  /** Fix strategy used */
  strategy: string;
}

export interface FileChange {
  file: string;
  change: string;
  reason: string;
}

export interface SolutionSource {
  /** Source type */
  type: 'stackoverflow' | 'github-issue' | 'documentation' | 'pattern-database' | 'ai-generated';

  /** URL to source */
  url?: string;

  /** Source ID (e.g., SO question ID) */
  id?: string;

  /** Upvotes/stars */
  votes?: number;

  /** When posted/updated */
  date?: string;

  /** Author (if applicable) */
  author?: string;
}

export interface TestCase {
  /** Test code */
  code: string;

  /** Expected outcome */
  expectedOutcome: 'pass' | 'fail';

  /** Test framework */
  framework?: string;

  /** How to run */
  runCommand?: string;
}

// ============================================================================
// Prevention
// ============================================================================

export interface PreventionStrategy {
  /** Strategy ID */
  id: string;

  /** Strategy name */
  name: string;

  /** Description */
  description: string;

  /** Prevention type */
  type: PreventionType;

  /** Implementation */
  implementation: PreventionImplementation;

  /** Effectiveness score (0-1) */
  effectiveness: number;

  /** Effort to implement (1=low, 5=high) */
  effort: 1 | 2 | 3 | 4 | 5;
}

export type PreventionType =
  | 'linting-rule'
  | 'type-check'
  | 'unit-test'
  | 'integration-test'
  | 'ci-check'
  | 'pre-commit-hook'
  | 'code-review-checklist'
  | 'documentation';

export interface PreventionImplementation {
  /** What to implement */
  type: PreventionType;

  /** Configuration/code for implementation */
  config?: string;

  /** Files to create/modify */
  files?: FileChange[];

  /** Commands to run */
  commands?: string[];

  /** Instructions */
  instructions: string;
}

// ============================================================================
// Root Cause Analysis
// ============================================================================

export interface RootCauseAnalysis {
  /** What happened (technical) */
  what: string;

  /** Why it happened (causal chain) */
  why: string[];

  /** Common misconception */
  misconception?: string;

  /** Correct mental model */
  correctUnderstanding: string;

  /** Educational resources */
  resources?: Resource[];

  /** Similar errors to watch for */
  relatedErrors?: string[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'documentation' | 'article' | 'video' | 'book';
}

// ============================================================================
// Code Context
// ============================================================================

export interface CodeContext {
  /** File being analyzed */
  file: string;

  /** Code snippet around error */
  snippet: string;

  /** Line range of snippet */
  lineRange: {
    start: number;
    end: number;
  };

  /** Variables in scope */
  variables?: Variable[];

  /** Imports/dependencies */
  imports?: Import[];

  /** Function/class definition */
  enclosingScope?: Scope;

  /** Related configuration files */
  relatedConfigs?: string[];
}

export interface Variable {
  name: string;
  type?: string;
  definedAt?: number;
  value?: any;
}

export interface Import {
  module: string;
  importedNames?: string[];
  alias?: string;
  isInstalled: boolean;
}

export interface Scope {
  type: 'function' | 'class' | 'module';
  name: string;
  parameters?: string[];
  returnType?: string;
}

// ============================================================================
// Fix Result
// ============================================================================

export interface FixResult {
  /** Whether fix was successful */
  success: boolean;

  /** Fix that was applied */
  appliedFix?: CodeFix;

  /** Alternative fixes suggested */
  alternativeFixes: Solution[];

  /** Root cause analysis */
  rootCause: RootCauseAnalysis;

  /** Prevention strategies */
  prevention: PreventionStrategy[];

  /** Test results (if tests were run) */
  testResults?: TestResult;

  /** Confidence in fix (0-1) */
  confidence: number;

  /** Time taken to fix (seconds) */
  timeTaken: number;

  /** Agents that contributed */
  contributors: string[];
}

export interface TestResult {
  passed: boolean;
  output: string;
  exitCode: number;
  duration: number;
}

// ============================================================================
// Search Results
// ============================================================================

export interface SearchResults {
  /** StackOverflow results */
  stackoverflow: StackOverflowResult[];

  /** GitHub issue results */
  githubIssues: GitHubIssueResult[];

  /** Documentation results */
  documentation: DocumentationResult[];

  /** Total results found */
  totalResults: number;

  /** Search time (ms) */
  searchTime: number;
}

export interface StackOverflowResult {
  questionId: number;
  title: string;
  url: string;
  votes: number;
  answerCount: number;
  acceptedAnswer?: {
    answerId: number;
    votes: number;
    body: string;
    codeSnippets: string[];
  };
  tags: string[];
  created: string;
  relevanceScore: number;
}

export interface GitHubIssueResult {
  repo: string;
  issueNumber: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  comments: number;
  labels: string[];
  created: string;
  closed?: string;
  solution?: string;
  relevanceScore: number;
}

export interface DocumentationResult {
  source: string;
  title: string;
  url: string;
  content: string;
  relevanceScore: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface FixerConfig {
  /** Whether to search StackOverflow */
  searchStackOverflow: boolean;

  /** Whether to search GitHub issues */
  searchGitHubIssues: boolean;

  /** Whether to auto-apply fixes (or just suggest) */
  autoApplyFixes: boolean;

  /** Minimum confidence to apply fix (0-1) */
  confidenceThreshold: number;

  /** Max search results per source */
  maxSearchResults: number;

  /** Cache solutions */
  cacheSolutions: boolean;

  /** Cache TTL (seconds) */
  solutionCacheTTL: number;

  /** Enable prevention analysis */
  enablePreventionAnalysis: boolean;

  /** Create test after fix */
  createTestAfterFix: boolean;
}

// ============================================================================
// Metrics & Tracking
// ============================================================================

export interface FixerMetrics {
  /** Total errors processed */
  errorsFixed: number;

  /** Auto-applied fixes */
  autoFixesApplied: number;

  /** Manual fixes suggested */
  manualFixesSuggested: number;

  /** Prevention rules created */
  preventionRulesCreated: number;

  /** Average fix time (seconds) */
  averageFixTime: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Errors by language */
  errorsByLanguage: Record<string, number>;

  /** Errors by category */
  errorsByCategory: Record<string, number>;

  /** Most common error patterns */
  topErrorPatterns: Array<{
    patternId: string;
    count: number;
  }>;
}
