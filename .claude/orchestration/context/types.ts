/**
 * Context Window Optimization Engine - Type Definitions
 *
 * Comprehensive TypeScript types for the context optimization system.
 * Supports token counting, analysis, compression, budget management, and checkpointing.
 */

/**
 * Supported content types for token counting and optimization
 */
export type ContentType = 'code' | 'prose' | 'json' | 'conversation' | 'tool_result' | 'mixed';

/**
 * Optimization strategies with different trade-offs
 */
export type OptimizationStrategy = 'aggressive' | 'balanced' | 'conservative' | 'custom';

/**
 * Context budget warning levels
 */
export type BudgetWarningLevel = 'safe' | 'warning' | 'critical' | 'exceeded';

/**
 * Compression algorithms available
 */
export type CompressionAlgorithm =
  | 'summarization'      // LLM-based summarization
  | 'minification'       // Remove whitespace, comments
  | 'deduplication'      // Remove duplicate content
  | 'reference'          // Replace with reference IDs
  | 'truncation';        // Smart truncation

/**
 * Content pattern types for optimization
 */
export type ContentPatternType =
  | 'repetitive_code'
  | 'verbose_logs'
  | 'redundant_context'
  | 'large_json'
  | 'duplicate_files'
  | 'outdated_context';

/**
 * Token counting result
 */
export interface TokenCount {
  /** Total token count */
  total: number;

  /** Tokens by content type */
  byType: {
    code?: number;
    prose?: number;
    json?: number;
  };

  /** Encoding used (e.g., 'cl100k_base' for Claude) */
  encoding: string;

  /** Character count for reference */
  characters: number;
}

/**
 * Batch token counting result
 */
export interface BatchTokenCount {
  /** Total tokens across all items */
  total: number;

  /** Individual counts */
  items: Array<{
    index: number;
    content: string;
    tokens: number;
  }>;

  /** Average tokens per item */
  average: number;
}

/**
 * Information density metrics
 */
export interface DensityScore {
  /** Information density (0-1, higher is better) */
  score: number;

  /** Tokens per unique information unit */
  tokensPerUnit: number;

  /** Estimated redundancy (0-1, lower is better) */
  redundancy: number;

  /** Compressibility estimate (0-1, higher means more compressible) */
  compressibility: number;
}

/**
 * Context section for analysis
 */
export interface ContextSection {
  /** Section identifier */
  id: string;

  /** Section type */
  type: 'system' | 'conversation' | 'tools' | 'files' | 'other';

  /** Content of the section */
  content: string;

  /** Token count */
  tokens: number;

  /** Percentage of total context */
  percentage: number;

  /** Information density score */
  density?: DensityScore;
}

/**
 * Full conversation context structure
 */
export interface ConversationContext {
  /** Session identifier */
  sessionId?: string;

  /** Context sections */
  sections: ContextSection[];

  /** Total token count */
  totalTokens: number;

  /** Active conversation turns */
  turns: ConversationTurn[];

  /** Files in context */
  files: FileContext[];

  /** Tool results in context */
  toolResults: ToolResultContext[];

  /** Timestamp of context snapshot */
  timestamp: string;
}

/**
 * Conversation turn
 */
export interface ConversationTurn {
  /** Turn index */
  index: number;

  /** Role (user, assistant, system) */
  role: 'user' | 'assistant' | 'system';

  /** Content */
  content: string;

  /** Token count */
  tokens: number;

  /** Timestamp */
  timestamp: string;

  /** Whether this turn is summarized */
  summarized?: boolean;
}

/**
 * File in context
 */
export interface FileContext {
  /** File path */
  path: string;

  /** File content */
  content: string;

  /** Token count */
  tokens: number;

  /** Content hash */
  hash: string;

  /** Last modified time */
  lastModified: string;
}

/**
 * Tool result in context
 */
export interface ToolResultContext {
  /** Tool name */
  tool: string;

  /** Result data */
  result: any;

  /** Token count */
  tokens: number;

  /** Timestamp */
  timestamp: string;

  /** Whether cached */
  cached?: boolean;
}

/**
 * Context usage analysis report
 */
export interface UsageReport {
  /** Total token usage */
  totalTokens: number;

  /** Budget limit */
  budgetLimit: number;

  /** Percentage of budget used */
  budgetUsedPercent: number;

  /** Warning level */
  warningLevel: BudgetWarningLevel;

  /** Breakdown by section */
  breakdown: {
    system: { tokens: number; percentage: number };
    conversation: { tokens: number; percentage: number };
    tools: { tokens: number; percentage: number };
    files: { tokens: number; percentage: number };
    other: { tokens: number; percentage: number };
  };

  /** High-cost patterns detected */
  highCostPatterns: ContentPattern[];

  /** Recommendations for optimization */
  recommendations: OptimizationRecommendation[];

  /** Overall information density */
  overallDensity: DensityScore;
}

/**
 * Content pattern detected in context
 */
export interface ContentPattern {
  /** Pattern type */
  type: ContentPatternType;

  /** Number of occurrences */
  occurrences: number;

  /** Average token cost per occurrence */
  tokenCostAvg: number;

  /** Total token cost */
  totalTokenCost: number;

  /** Example of the pattern */
  example: string;

  /** Recommended optimization */
  recommendedOptimization: CompressionAlgorithm;

  /** Potential token savings */
  potentialSavings: number;

  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  /** Priority (1-10, 1 is highest) */
  priority: number;

  /** Recommendation title */
  title: string;

  /** Detailed description */
  description: string;

  /** Target section or content */
  target: string;

  /** Estimated token savings */
  estimatedSavings: number;

  /** Strategy to apply */
  strategy: CompressionAlgorithm;

  /** Risk level (low, medium, high) */
  risk: 'low' | 'medium' | 'high';
}

/**
 * Compression result for a single item
 */
export interface CompressionResult {
  /** Original content */
  original: string;

  /** Compressed content */
  compressed: string;

  /** Original token count */
  originalTokens: number;

  /** Compressed token count */
  compressedTokens: number;

  /** Token savings */
  tokensSaved: number;

  /** Compression ratio (0-1) */
  compressionRatio: number;

  /** Quality score (0-1, estimated information preservation) */
  quality: number;

  /** Algorithm used */
  algorithm: CompressionAlgorithm;
}

/**
 * Batch compression result
 */
export interface BatchCompressionResult {
  /** Individual results */
  results: CompressionResult[];

  /** Total original tokens */
  totalOriginalTokens: number;

  /** Total compressed tokens */
  totalCompressedTokens: number;

  /** Total tokens saved */
  totalTokensSaved: number;

  /** Average compression ratio */
  averageCompressionRatio: number;

  /** Average quality score */
  averageQuality: number;
}

/**
 * Token budget configuration
 */
export interface BudgetConfig {
  /** Total token budget */
  total: number;

  /** System section budget */
  system: number;

  /** Conversation section budget */
  conversation: number;

  /** Tool results section budget */
  toolResults: number;

  /** Reserve budget for emergencies */
  reserve: number;

  /** Warning threshold percentage (0-100) */
  warningThreshold: number;

  /** Critical threshold percentage (0-100) */
  criticalThreshold: number;
}

/**
 * Current budget allocation state
 */
export interface BudgetAllocation {
  /** Configuration */
  config: BudgetConfig;

  /** Current usage by section */
  usage: {
    system: { allocated: number; used: number; available: number };
    conversation: { allocated: number; used: number; available: number };
    toolResults: { allocated: number; used: number; available: number };
    reserve: { allocated: number; used: number; available: number };
  };

  /** Total available tokens */
  totalAvailable: number;

  /** Warning level */
  warningLevel: BudgetWarningLevel;

  /** Suggested reallocation (if needed) */
  suggestedReallocation?: Partial<BudgetConfig>;
}

/**
 * Context checkpoint metadata
 */
export interface CheckpointMetadata {
  /** Checkpoint ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Session ID */
  sessionId?: string;

  /** Task ID */
  taskId?: string;

  /** Phase when checkpoint was created */
  phase: string;

  /** Checkpoint type */
  type: 'manual' | 'automatic' | 'phase_boundary' | 'threshold';

  /** Creation timestamp */
  createdAt: string;

  /** Token metrics */
  tokens: {
    total: number;
    system: number;
    conversation: number;
    toolResults: number;
  };

  /** Whether optimization was applied */
  optimizationApplied: boolean;

  /** Compression strategy used (if optimized) */
  compressionStrategy?: OptimizationStrategy;

  /** Original token count (before optimization) */
  originalTokens?: number;
}

/**
 * Checkpoint with full context
 */
export interface Checkpoint extends CheckpointMetadata {
  /** Full context snapshot */
  context: ConversationContext;

  /** Active file paths at checkpoint time */
  activeFiles: string[];

  /** Cached tool results */
  toolCache: Record<string, any>;

  /** Parent checkpoint ID (for delta storage) */
  parentCheckpointId?: string;

  /** Delta changes from parent (if using delta storage) */
  deltaChanges?: any;
}

/**
 * Optimization execution result
 */
export interface OptimizationResult {
  /** Original token count */
  originalTokens: number;

  /** Optimized token count */
  optimizedTokens: number;

  /** Tokens saved */
  savings: number;

  /** Savings percentage */
  savingsPercent: number;

  /** Strategies applied */
  strategies: CompressionAlgorithm[];

  /** Warnings encountered */
  warnings: string[];

  /** Errors encountered */
  errors: string[];

  /** Quality score (0-1) */
  quality: number;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Optimized context */
  optimizedContext: ConversationContext;
}

/**
 * Custom optimization strategy configuration
 */
export interface CustomOptimizationConfig {
  /** Strategy name */
  name: string;

  /** Algorithms to apply in order */
  algorithms: CompressionAlgorithm[];

  /** Target compression ratio (0-1) */
  targetCompressionRatio?: number;

  /** Minimum quality score to maintain (0-1) */
  minQuality?: number;

  /** Section-specific settings */
  sectionSettings?: {
    system?: { enabled: boolean; aggressiveness: number };
    conversation?: { enabled: boolean; aggressiveness: number };
    tools?: { enabled: boolean; aggressiveness: number };
  };

  /** Skip optimization if tokens below this threshold */
  skipIfTokensBelow?: number;
}

/**
 * Reference for deduplicated content
 */
export interface ContentReference {
  /** Reference ID */
  refId: string;

  /** Original content */
  content: string;

  /** Content hash */
  hash: string;

  /** Content type */
  type: ContentType;

  /** Token count */
  tokens: number;

  /** Number of times referenced */
  referenceCount: number;

  /** File path (if applicable) */
  filePath?: string;

  /** Creation timestamp */
  createdAt: string;

  /** Last referenced timestamp */
  lastReferencedAt?: string;
}

/**
 * Checkpoint ID type
 */
export type CheckpointId = string;

/**
 * Session ID type
 */
export type SessionId = string;

/**
 * Task ID type
 */
export type TaskId = string;

/**
 * Database connection options
 */
export interface DbOptions {
  /** Path to SQLite database file */
  dbPath: string;

  /** Enable read-only mode */
  readonly?: boolean;

  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Configuration for the optimizer
 */
export interface OptimizerConfig {
  /** Database options */
  db: DbOptions;

  /** Default optimization strategy */
  defaultStrategy: OptimizationStrategy;

  /** Default budget configuration */
  defaultBudget: BudgetConfig;

  /** Enable automatic checkpointing */
  autoCheckpoint: boolean;

  /** Checkpoint at phase boundaries */
  checkpointAtPhases: boolean;

  /** Enable compression cache */
  useCompressionCache: boolean;

  /** Enable reference deduplication */
  useReferenceDeDuplication: boolean;
}

/**
 * Event emitted during optimization
 */
export interface OptimizationEvent {
  /** Event type */
  type: 'start' | 'progress' | 'complete' | 'error' | 'warning';

  /** Event message */
  message: string;

  /** Progress percentage (0-100) for progress events */
  progress?: number;

  /** Additional data */
  data?: any;

  /** Timestamp */
  timestamp: string;
}

/**
 * Callback for optimization progress
 */
export type OptimizationProgressCallback = (event: OptimizationEvent) => void;
