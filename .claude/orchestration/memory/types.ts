/**
 * Type definitions for Agent Memory System
 *
 * Defines data structures for episodic, semantic, and procedural memory
 * supporting persistent learning and context retention across agent sessions.
 */

/**
 * Base memory type for all memory entries
 */
export type MemoryType = 'episodic' | 'semantic' | 'procedural';

/**
 * Outcome classification for episodes
 */
export type Outcome = 'success' | 'failure' | 'partial';

/**
 * Action performed during task execution
 */
export interface Action {
  /** Unique action identifier */
  id: string;

  /** Type of action (e.g., 'file_edit', 'command_run', 'api_call') */
  type: string;

  /** Human-readable description */
  description: string;

  /** Action parameters/inputs */
  parameters?: Record<string, any>;

  /** Action result/output */
  result?: any;

  /** Timestamp when action was performed */
  timestamp: Date;

  /** Duration in milliseconds */
  duration?: number;

  /** Whether action succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Episode: A complete task execution record
 *
 * Stores the full context of a task including what was done,
 * why it was done, and what the outcome was.
 */
export interface Episode {
  /** Unique episode identifier */
  id: string;

  /** Task description/goal */
  taskDescription: string;

  /** Full context when task started */
  context: string;

  /** Sequence of actions performed */
  actions: Action[];

  /** Final outcome */
  outcome: Outcome;

  /** When episode started */
  timestamp: Date;

  /** When episode ended */
  endTime?: Date;

  /** Duration in milliseconds */
  duration?: number;

  /** Tags for categorization */
  tags: string[];

  /** Related agent type */
  agentType?: string;

  /** Parent task ID if sub-agent */
  parentTaskId?: string;

  /** Lessons learned / reflections */
  notes?: string;

  /** Embedding vector for similarity search (384-dim) */
  embedding?: number[];

  /** Number of times this episode was accessed */
  accessCount: number;

  /** Last access timestamp */
  lastAccessed?: Date;

  /** Quality score (0-1) based on outcome and usefulness */
  quality: number;
}

/**
 * Fact: A piece of knowledge extracted from experience
 *
 * Stored as subject-predicate-object triples for knowledge graph
 */
export interface Fact {
  /** Unique fact identifier */
  id: string;

  /** Subject entity */
  subject: string;

  /** Relationship/predicate */
  predicate: string;

  /** Object entity or value */
  object: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Source of this fact (episode ID, file path, etc.) */
  source: string;

  /** When fact was created */
  timestamp: Date;

  /** Number of times confirmed */
  confirmations: number;

  /** Number of times contradicted */
  contradictions: number;

  /** Tags for categorization */
  tags: string[];
}

/**
 * Entity knowledge: Aggregated facts about an entity
 */
export interface EntityKnowledge {
  /** Entity name */
  entity: string;

  /** All facts where entity is subject */
  facts: Fact[];

  /** Related entities */
  related: string[];

  /** Entity type (inferred from facts) */
  type?: string;

  /** Confidence in knowledge (average of fact confidences) */
  confidence: number;
}

/**
 * Step in a procedure
 */
export interface Step {
  /** Step order */
  order: number;

  /** Step description */
  description: string;

  /** Action type */
  actionType: string;

  /** Parameters template */
  parameters?: Record<string, any>;

  /** Expected outcome */
  expectedOutcome?: string;

  /** Conditional logic */
  condition?: string;
}

/**
 * Procedure: A reusable sequence of actions
 *
 * Abstracted from successful episodes into repeatable patterns
 */
export interface Procedure {
  /** Unique procedure identifier */
  id: string;

  /** Procedure name */
  name: string;

  /** Pattern that triggers this procedure */
  triggerPattern: string;

  /** Sequence of steps */
  steps: Step[];

  /** Number of times successfully executed */
  successCount: number;

  /** Number of times failed */
  failureCount: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Total number of times used */
  usageCount: number;

  /** Tags for categorization */
  tags: string[];

  /** When procedure was created */
  created: Date;

  /** When last updated */
  lastUpdated: Date;

  /** Version number */
  version: number;

  /** Source episodes this was derived from */
  sourceEpisodes: string[];

  /** Description of what this procedure does */
  description?: string;

  /** Preconditions required */
  preconditions?: string[];

  /** Postconditions guaranteed */
  postconditions?: string[];
}

/**
 * Change to a procedure
 */
export interface ProcedureChange {
  /** Type of change */
  type: 'add_step' | 'remove_step' | 'modify_step' | 'reorder_steps';

  /** Step index affected */
  stepIndex?: number;

  /** New step data */
  step?: Step;

  /** Reason for change */
  reason: string;

  /** Who/what made the change */
  author: string;
}

/**
 * Search options for memory queries
 */
export interface SearchOptions {
  /** Maximum number of results */
  limit?: number;

  /** Minimum similarity score (0-1) */
  minSimilarity?: number;

  /** Filter by tags */
  tags?: string[];

  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };

  /** Include embedding vectors in results */
  includeEmbeddings?: boolean;

  /** Namespace to search within */
  namespace?: string;

  /** Hybrid search: keyword weight vs semantic weight */
  hybridWeights?: {
    keyword: number;
    semantic: number;
  };
}

/**
 * Search result
 */
export interface SearchResult {
  /** Memory ID */
  id: string;

  /** Memory type */
  type: MemoryType;

  /** Similarity score (0-1) */
  score: number;

  /** Memory data */
  data: Episode | Fact | Procedure;

  /** Metadata */
  metadata: Record<string, any>;
}

/**
 * Memory snapshot for export/import
 */
export interface MemorySnapshot {
  /** Snapshot version */
  version: string;

  /** When snapshot was created */
  timestamp: Date;

  /** Namespace */
  namespace: string;

  /** Episodes */
  episodes: Episode[];

  /** Facts */
  facts: Fact[];

  /** Procedures */
  procedures: Procedure[];

  /** Metadata */
  metadata: Record<string, any>;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Total episodes */
  episodeCount: number;

  /** Total facts */
  factCount: number;

  /** Total procedures */
  procedureCount: number;

  /** Total memory entries */
  totalEntries: number;

  /** Database size in bytes */
  databaseSize: number;

  /** Average episode quality */
  avgEpisodeQuality: number;

  /** Most accessed episodes */
  topEpisodes: Array<{ id: string; accessCount: number }>;

  /** Most used procedures */
  topProcedures: Array<{ id: string; usageCount: number }>;

  /** Breakdown by outcome */
  outcomeBreakdown: Record<Outcome, number>;

  /** Breakdown by agent type */
  agentTypeBreakdown: Record<string, number>;
}

/**
 * Consolidation options
 */
export interface ConsolidationOptions {
  /** Consolidate episodes older than this date */
  olderThan: Date;

  /** Minimum quality score to keep */
  minQuality?: number;

  /** Keep top N most accessed */
  keepTopN?: number;

  /** Summarization strategy */
  strategy?: 'aggregate' | 'exemplar' | 'abstract';
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** Path to SQLite database file */
  dbPath: string;

  /** Enable FTS5 full-text search */
  enableFTS: boolean;

  /** Enable WAL mode for better concurrency */
  enableWAL: boolean;

  /** Namespace for multi-tenant support */
  namespace?: string;
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  /** Embedding provider */
  provider: 'claude' | 'openai' | 'local';

  /** Model to use for embeddings */
  model?: string;

  /** API key if needed */
  apiKey?: string;

  /** Embedding dimensions */
  dimensions: number;

  /** Batch size for embedding generation */
  batchSize?: number;
}
