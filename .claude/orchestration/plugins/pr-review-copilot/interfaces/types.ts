/**
 * PR Review Copilot - TypeScript Type Definitions
 *
 * Core interfaces for the multi-agent PR review system
 */

// ============================================================================
// Core Review Types
// ============================================================================

export interface PRReviewRequest {
  pr_url: string;
  pr_number: number;
  repository: string;
  base_branch: string;
  head_branch: string;
  review_depth?: ReviewDepth;
  focus_areas?: ReviewFocusArea[];
}

export type ReviewDepth = 'quick_scan' | 'standard_review' | 'deep_audit' | 'security_focused';

export type ReviewFocusArea =
  | 'security'
  | 'performance'
  | 'logic'
  | 'tests'
  | 'api_contracts'
  | 'database'
  | 'patterns';

// ============================================================================
// PR Context
// ============================================================================

export interface PRContext {
  pr_type: PRType;
  lines_added: number;
  lines_deleted: number;
  files_changed: string[];
  affected_components: string[];
  dependencies_map: DependencyMap;
  breaking_changes: BreakingChange[];
  related_files: string[];
  scope_assessment: ScopeAssessment;
  risk_indicators: RiskIndicator[];
}

export type PRType =
  | 'feature'
  | 'bugfix'
  | 'refactor'
  | 'performance'
  | 'security'
  | 'documentation'
  | 'test'
  | 'chore';

export interface DependencyMap {
  [file: string]: {
    imports_from: string[];
    imported_by: string[];
    affects: string[];
  };
}

export interface BreakingChange {
  type: 'api' | 'database' | 'config' | 'behavior';
  file: string;
  line: number;
  description: string;
  severity: Severity;
  migration_required: boolean;
}

export interface ScopeAssessment {
  is_focused: boolean;
  should_split: boolean;
  estimated_review_time: number; // minutes
  complexity_score: number; // 1-10
}

export interface RiskIndicator {
  category: string;
  description: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// Review Findings
// ============================================================================

export interface ReviewFinding {
  id: string;
  agent: string;
  category: FindingCategory;
  severity: Severity;
  file: string;
  line?: number;
  end_line?: number;
  title: string;
  description: string;
  code_snippet?: string;
  suggestion?: CodeSuggestion;
  references?: string[];
  confidence: number; // 0-1
}

export type FindingCategory =
  | 'security'
  | 'bug'
  | 'performance'
  | 'test_gap'
  | 'breaking_change'
  | 'pattern_violation'
  | 'api_contract'
  | 'database_migration'
  | 'documentation'
  | 'code_quality';

export type Severity = 'blocking' | 'high' | 'medium' | 'low' | 'nitpick';

export interface CodeSuggestion {
  original: string;
  suggested: string;
  language: string;
  explanation: string;
}

// ============================================================================
// Security Findings
// ============================================================================

export interface SecurityFinding extends ReviewFinding {
  category: 'security';
  vulnerability_type: VulnerabilityType;
  owasp_category?: string;
  cve_reference?: string;
  attack_vector?: string;
  remediation: string;
  exploitability: 'low' | 'medium' | 'high';
}

export type VulnerabilityType =
  | 'sql_injection'
  | 'xss'
  | 'csrf'
  | 'authentication'
  | 'authorization'
  | 'sensitive_data_exposure'
  | 'insecure_crypto'
  | 'injection'
  | 'security_misconfiguration'
  | 'known_vulnerability';

// ============================================================================
// Performance Findings
// ============================================================================

export interface PerformanceFinding extends ReviewFinding {
  category: 'performance';
  issue_type: PerformanceIssueType;
  current_complexity?: string; // Big O notation
  recommended_complexity?: string;
  impact_estimate: PerformanceImpact;
  estimated_improvement?: string;
}

export type PerformanceIssueType =
  | 'n_plus_one_query'
  | 'missing_index'
  | 'inefficient_algorithm'
  | 'unnecessary_computation'
  | 'memory_leak'
  | 'blocking_operation'
  | 'missing_pagination'
  | 'large_bundle'
  | 'unnecessary_render';

export interface PerformanceImpact {
  users_affected: 'all' | 'many' | 'some' | 'few';
  severity: 'critical' | 'significant' | 'moderate' | 'minor';
  estimated_slowdown?: string; // e.g., "2x slower", "500ms added"
}

// ============================================================================
// Test Coverage Findings
// ============================================================================

export interface TestCoverageFinding extends ReviewFinding {
  category: 'test_gap';
  missing_test_type: TestType;
  untested_scenarios: string[];
  suggested_test_cases: SuggestedTest[];
}

export type TestType =
  | 'unit_test'
  | 'integration_test'
  | 'edge_case_test'
  | 'regression_test'
  | 'negative_test'
  | 'performance_test';

export interface SuggestedTest {
  name: string;
  description: string;
  test_code?: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
}

// ============================================================================
// API Contract Findings
// ============================================================================

export interface APIContractFinding extends ReviewFinding {
  category: 'api_contract' | 'breaking_change';
  endpoint: string;
  change_type: APIChangeType;
  is_breaking: boolean;
  affected_clients?: string[];
  migration_guide?: string;
  version_bump_required?: 'major' | 'minor' | 'patch';
}

export type APIChangeType =
  | 'endpoint_added'
  | 'endpoint_removed'
  | 'endpoint_modified'
  | 'request_changed'
  | 'response_changed'
  | 'auth_changed'
  | 'status_code_changed';

// ============================================================================
// Database Migration Findings
// ============================================================================

export interface DatabaseMigrationFinding extends ReviewFinding {
  category: 'database_migration';
  migration_file: string;
  risk_type: MigrationRiskType;
  impact: MigrationImpact;
  mitigation: string;
  estimated_downtime?: string;
}

export type MigrationRiskType =
  | 'data_loss'
  | 'locking_issue'
  | 'constraint_violation'
  | 'performance_impact'
  | 'rollback_risk';

export interface MigrationImpact {
  tables_affected: string[];
  rows_affected_estimate?: number;
  blocking_duration?: string;
  requires_downtime: boolean;
}

// ============================================================================
// Review Output
// ============================================================================

export interface ReviewOutput {
  summary: ReviewSummary;
  findings: ReviewFinding[];
  comments: ReviewComment[];
  recommendation: ReviewRecommendation;
  metrics: ReviewMetrics;
}

export interface ReviewSummary {
  overall_assessment: string;
  key_highlights: string[];
  blocking_issues: number;
  high_priority_issues: number;
  medium_priority_issues: number;
  low_priority_issues: number;
  total_issues: number;
  estimated_fix_time: string;
}

export interface ReviewComment {
  file: string;
  line: number;
  end_line?: number;
  severity: Severity;
  category: FindingCategory;
  message: string;
  code_suggestion?: CodeSuggestion;
  references?: string[];
  position?: number; // GitHub diff position
}

export interface ReviewRecommendation {
  action: 'approve' | 'approve_with_suggestions' | 'request_changes' | 'needs_discussion';
  reasoning: string;
  must_fix: ReviewFinding[];
  should_fix: ReviewFinding[];
  optional_improvements: ReviewFinding[];
}

export interface ReviewMetrics {
  review_duration: number; // seconds
  agents_used: string[];
  findings_by_agent: { [agent: string]: number };
  findings_by_category: { [category: string]: number };
  findings_by_severity: { [severity: string]: number };
  code_quality_score?: number; // 0-100
}

// ============================================================================
// Agent Communication
// ============================================================================

export interface AgentInput {
  agent_name: string;
  context: PRContext;
  changed_files: FileChange[];
  review_focus?: ReviewFocusArea[];
}

export interface FileChange {
  file: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  patch: string;
  content?: string;
  previous_content?: string;
}

export interface AgentOutput {
  agent_name: string;
  findings: ReviewFinding[];
  execution_time: number;
  confidence: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Workflow Configuration
// ============================================================================

export interface WorkflowConfig {
  name: string;
  agents: string[];
  parallel_execution: boolean;
  max_duration: number; // minutes
  focus_areas: ReviewFocusArea[];
  severity_threshold?: Severity;
}

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface ReviewPluginConfig {
  default_review_depth: ReviewDepth;
  auto_approve_threshold: 'none' | 'low' | 'medium';
  block_on_security_issues: boolean;
  block_on_missing_tests: boolean;
  require_breaking_change_docs: boolean;
  max_review_time_minutes: number;
  parallel_agent_reviews: boolean;
  generate_inline_comments: boolean;
  severity_levels: Severity[];
  custom_rules?: CustomRule[];
}

export interface CustomRule {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  severity: Severity;
  message_template: string;
  applies_to?: string[]; // file patterns
}
