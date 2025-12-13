/**
 * Model Routing Type Definitions
 * Comprehensive types for intelligent model selection and routing
 */

// ============================================================================
// Core Model Types
// ============================================================================

export type ModelName = 'opus' | 'sonnet' | 'haiku' | 'gpt-4' | 'gpt-3.5' | 'gemini-pro' | 'gemini-flash';

export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'custom';

export interface ModelProfile {
  /** Unique identifier for the model */
  id: string;

  /** Short name (opus, sonnet, haiku, etc.) */
  name: ModelName;

  /** Full model ID (e.g., claude-opus-4-5-20251101) */
  modelId: string;

  /** Provider of the model */
  provider: ModelProvider;

  /** Model strengths and capabilities */
  strengths: TaskType[];

  /** Cost per 1000 input tokens (USD) */
  costPer1kInputTokens: number;

  /** Cost per 1000 output tokens (USD) */
  costPer1kOutputTokens: number;

  /** Average latency in milliseconds */
  latencyMs: number;

  /** Maximum context window size */
  contextWindow: number;

  /** Max output tokens */
  maxOutputTokens: number;

  /** Quality score (0-100) based on benchmarks */
  qualityScore: number;

  /** Whether model supports extended thinking */
  supportsExtendedThinking: boolean;

  /** Whether model supports vision/images */
  supportsVision: boolean;

  /** Whether model supports tool use */
  supportsToolUse: boolean;
}

// ============================================================================
// Task Classification Types
// ============================================================================

export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'critical';

export type TaskType =
  | 'architecture'
  | 'planning'
  | 'code-generation'
  | 'code-review'
  | 'debugging'
  | 'refactoring'
  | 'testing'
  | 'documentation'
  | 'analysis'
  | 'creative'
  | 'factual'
  | 'coordination'
  | 'simple-task';

export type TaskPattern = 'single-shot' | 'multi-step' | 'iterative' | 'chain-of-thought';

export interface TaskDescriptor {
  /** Task description */
  task: string;

  /** Detected task type */
  type: TaskType;

  /** Complexity level */
  complexity: TaskComplexity;

  /** Pattern of execution */
  pattern: TaskPattern;

  /** Estimated input tokens */
  estimatedInputTokens: number;

  /** Estimated output tokens */
  estimatedOutputTokens: number;

  /** Whether task requires extended thinking */
  requiresExtendedThinking: boolean;

  /** Whether task involves code */
  involvesCode: boolean;

  /** Whether task requires creativity */
  requiresCreativity: boolean;

  /** Priority level (1-5, 5 highest) */
  priority: number;

  /** Additional context */
  context?: string;

  /** User-specified constraints */
  constraints?: TaskConstraints;
}

export interface TaskConstraints {
  /** Maximum cost in USD */
  maxCost?: number;

  /** Maximum latency in ms */
  maxLatency?: number;

  /** Minimum quality score (0-100) */
  minQuality?: number;

  /** Preferred model */
  preferredModel?: ModelName;

  /** Required capabilities */
  requiredCapabilities?: ('vision' | 'thinking' | 'tools')[];
}

export interface TokenEstimate {
  /** Estimated input tokens */
  input: number;

  /** Estimated output tokens */
  output: number;

  /** Total estimated tokens */
  total: number;

  /** Confidence level (0-1) */
  confidence: number;
}

// ============================================================================
// Routing Decision Types
// ============================================================================

export interface RoutingDecision {
  /** Selected model */
  model: ModelProfile;

  /** Confidence score (0-100) */
  confidence: number;

  /** Reasoning for the decision */
  reasoning: string[];

  /** Alternative models considered */
  alternatives: Array<{
    model: ModelProfile;
    score: number;
    reason: string;
  }>;

  /** Estimated cost for this task */
  estimatedCost: number;

  /** Estimated latency */
  estimatedLatency: number;

  /** Fallback chain if primary fails */
  fallbackChain: ModelName[];

  /** Timestamp of decision */
  timestamp: Date;
}

export interface RoutingScore {
  /** Model being scored */
  model: ModelProfile;

  /** Overall score (0-100) */
  totalScore: number;

  /** Component scores */
  scores: {
    capabilityMatch: number;
    costEfficiency: number;
    latency: number;
    quality: number;
    historicalPerformance: number;
  };

  /** Weighted total */
  weightedScore: number;
}

// ============================================================================
// Routing Statistics Types
// ============================================================================

export interface RoutingStats {
  /** Total routing decisions made */
  totalDecisions: number;

  /** Decisions by model */
  byModel: Record<ModelName, {
    count: number;
    successRate: number;
    avgQuality: number;
    avgCost: number;
    avgLatency: number;
  }>;

  /** Decisions by task type */
  byTaskType: Record<TaskType, {
    count: number;
    preferredModel: ModelName;
    avgQuality: number;
  }>;

  /** Decisions by complexity */
  byComplexity: Record<TaskComplexity, {
    count: number;
    distribution: Record<ModelName, number>;
  }>;

  /** Cost tracking */
  costs: {
    total: number;
    byModel: Record<ModelName, number>;
    byDay: Record<string, number>;
    byMonth: Record<string, number>;
  };

  /** Performance metrics */
  performance: {
    avgDecisionTime: number;
    cacheHitRate: number;
    fallbackRate: number;
  };
}

export interface OutcomeRecord {
  /** Unique task ID */
  taskId: string;

  /** Task descriptor */
  task: TaskDescriptor;

  /** Model used */
  model: ModelName;

  /** Whether task succeeded */
  success: boolean;

  /** Quality rating (0-100) */
  quality: number;

  /** Actual cost */
  actualCost: number;

  /** Actual latency */
  actualLatency: number;

  /** Actual tokens used */
  tokensUsed: {
    input: number;
    output: number;
  };

  /** Whether fallback was used */
  usedFallback: boolean;

  /** Error if failed */
  error?: string;

  /** Timestamp */
  timestamp: Date;

  /** User feedback */
  feedback?: {
    rating: number;
    comment?: string;
  };
}

// ============================================================================
// Fallback Chain Types
// ============================================================================

export interface FallbackConfig {
  /** Primary model */
  primary: ModelName;

  /** Fallback sequence */
  fallbacks: ModelName[];

  /** Max retry attempts per model */
  maxRetries: number;

  /** Timeout per attempt (ms) */
  timeout: number;

  /** Backoff strategy */
  backoff: 'linear' | 'exponential';

  /** Initial backoff delay (ms) */
  initialDelay: number;
}

export interface FallbackResult<T> {
  /** Result value */
  value: T;

  /** Model that succeeded */
  model: ModelName;

  /** Whether fallback was used */
  usedFallback: boolean;

  /** Attempts made */
  attempts: number;

  /** Total time taken */
  totalTime: number;

  /** Errors encountered */
  errors: Array<{
    model: ModelName;
    error: string;
    timestamp: Date;
  }>;
}

export interface RateLimitInfo {
  /** Model being rate limited */
  model: ModelName;

  /** When rate limit resets */
  resetAt: Date;

  /** Requests remaining */
  remaining: number;

  /** Request limit */
  limit: number;
}

// ============================================================================
// Cost Optimization Types
// ============================================================================

export interface BudgetConfig {
  /** Daily budget in USD */
  dailyLimit: number;

  /** Monthly budget in USD */
  monthlyLimit: number;

  /** Per-request limit in USD */
  perRequestLimit?: number;

  /** Alert thresholds */
  alerts: {
    dailyWarning: number;  // % of daily budget
    monthlyWarning: number;  // % of monthly budget
  };

  /** Budget reset timezone */
  timezone: string;
}

export interface BudgetStatus {
  /** Current daily spending */
  dailySpent: number;

  /** Daily budget */
  dailyLimit: number;

  /** Daily remaining */
  dailyRemaining: number;

  /** Daily usage percentage */
  dailyUsagePercent: number;

  /** Current monthly spending */
  monthlySpent: number;

  /** Monthly budget */
  monthlyLimit: number;

  /** Monthly remaining */
  monthlyRemaining: number;

  /** Monthly usage percentage */
  monthlyUsagePercent: number;

  /** Whether budget exceeded */
  exceeded: boolean;

  /** Whether approaching limit */
  warning: boolean;

  /** Next reset times */
  resets: {
    daily: Date;
    monthly: Date;
  };
}

export interface CostSuggestion {
  /** Current model being used */
  currentModel: ModelName;

  /** Suggested alternative */
  suggestedModel: ModelName;

  /** Potential savings per request */
  savingsPerRequest: number;

  /** Estimated monthly savings */
  estimatedMonthlySavings: number;

  /** Quality trade-off (-100 to 100) */
  qualityDelta: number;

  /** Latency trade-off (ms) */
  latencyDelta: number;

  /** Reasoning */
  reason: string;

  /** Confidence in suggestion (0-100) */
  confidence: number;
}

export interface CostReport {
  /** Report period */
  period: {
    start: Date;
    end: Date;
  };

  /** Total cost */
  totalCost: number;

  /** Breakdown by model */
  byModel: Record<ModelName, {
    cost: number;
    requests: number;
    avgCostPerRequest: number;
    tokens: {
      input: number;
      output: number;
    };
  }>;

  /** Breakdown by task type */
  byTaskType: Record<TaskType, {
    cost: number;
    requests: number;
    preferredModel: ModelName;
  }>;

  /** Daily costs */
  dailyCosts: Array<{
    date: string;
    cost: number;
    requests: number;
  }>;

  /** Cost trends */
  trends: {
    dailyAverage: number;
    weeklyAverage: number;
    projectedMonthly: number;
  };

  /** Optimization suggestions */
  suggestions: CostSuggestion[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface RouterConfig {
  /** Available models */
  models: ModelProfile[];

  /** Default model if routing fails */
  defaultModel: ModelName;

  /** Routing weights */
  weights: {
    capability: number;
    cost: number;
    latency: number;
    quality: number;
    historical: number;
  };

  /** Enable learning from outcomes */
  enableLearning: boolean;

  /** Cache routing decisions */
  enableCache: boolean;

  /** Cache TTL (seconds) */
  cacheTTL: number;

  /** Budget configuration */
  budget?: BudgetConfig;

  /** Fallback configuration */
  fallback: {
    enabled: boolean;
    maxAttempts: number;
    timeout: number;
  };
}

// ============================================================================
// Database Types
// ============================================================================

export interface RoutingRecord {
  id: string;
  task_hash: string;
  task_type: TaskType;
  complexity: TaskComplexity;
  pattern: TaskPattern;
  model_selected: ModelName;
  confidence: number;
  estimated_cost: number;
  estimated_latency: number;
  created_at: Date;
}

export interface OutcomeDBRecord {
  id: string;
  routing_id: string;
  success: boolean;
  quality_score: number;
  actual_cost: number;
  actual_latency: number;
  tokens_input: number;
  tokens_output: number;
  used_fallback: boolean;
  error_message?: string;
  created_at: Date;
}

export interface ModelPerformanceRecord {
  model: ModelName;
  task_type: TaskType;
  complexity: TaskComplexity;
  success_rate: number;
  avg_quality: number;
  avg_cost: number;
  avg_latency: number;
  sample_size: number;
  last_updated: Date;
}
