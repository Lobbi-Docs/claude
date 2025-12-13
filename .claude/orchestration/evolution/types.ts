/**
 * Agent Self-Improvement System - Type Definitions
 *
 * Comprehensive type system for tracking, analyzing, and evolving agent performance
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export interface PerformanceMetric {
  agentId: string;
  taskId: string;
  sessionId?: string;
  success: boolean;
  duration: number; // milliseconds
  tokenCount: number;
  userRating?: number; // 1-5 scale
  timestamp: Date;

  // Additional context
  taskType?: string;
  complexity?: number; // 1-10 scale
  errorType?: string;
  retryCount?: number;
}

export interface TaskFailure {
  taskId: string;
  agentId: string;
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context: {
    taskType: string;
    requiredCapabilities: string[];
    attemptedActions: string[];
  };
}

export interface UserFeedback {
  taskId: string;
  agentId: string;
  rating: number; // 1-5
  comment?: string;
  timestamp: Date;
  feedbackType: 'explicit' | 'implicit';

  // Implicit feedback signals
  retry?: boolean;
  edit?: boolean;
  editType?: 'minor' | 'major' | 'complete_rewrite';
  abandoned?: boolean;
}

export interface PromptVariant {
  id: string;
  agentId: string;
  version: number;
  prompt: string;
  systemPrompt?: string;

  // A/B testing metadata
  createdAt: Date;
  trialCount: number;
  successCount: number;
  successRate: number;
  avgDuration: number;
  avgTokens: number;

  // UCB1 algorithm fields
  ucb1Score?: number;
  explorationBonus?: number;

  // Lineage tracking
  parentVariantId?: string;
  mutationType?: 'manual' | 'automated' | 'evolutionary';
  mutationReason?: string;
}

export interface PromptVersion {
  version: number;
  variant: PromptVariant;
  activatedAt: Date;
  deactivatedAt?: Date;
  performanceSummary: {
    totalTasks: number;
    successRate: number;
    avgDuration: number;
    tokenEfficiency: number;
  };
}

export interface CapabilityGap {
  id: string;
  identifiedAt: Date;
  category: string; // 'missing_skill', 'tool_limitation', 'knowledge_gap', 'pattern_failure'
  description: string;

  // Evidence
  failureCount: number;
  affectedTasks: string[];
  errorPatterns: string[];

  // Impact assessment
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number; // failures per week

  // Resolution suggestions
  suggestedSkills?: string[];
  suggestedTools?: string[];
  suggestedAgentVariants?: string[];
}

export interface SkillSuggestion {
  skillId: string;
  name: string;
  description: string;
  category: string;

  // Justification
  addressesGaps: string[]; // CapabilityGap IDs
  estimatedImpact: {
    gapsClosed: number;
    tasksUnblocked: number;
    estimatedSuccessRateImprovement: number; // percentage points
  };

  // Implementation
  implementationComplexity: 'low' | 'medium' | 'high';
  requiredTools?: string[];
  requiredTraining?: string[];
}

export interface AgentVariant {
  id: string;
  baseAgentId: string;
  name: string;
  specialization: string;

  // Configuration
  prompt: string;
  systemPrompt: string;
  model: string;
  temperature?: number;
  tools?: string[];
  skills?: string[];

  // Performance tracking
  createdAt: Date;
  trialCount: number;
  performance: {
    successRate: number;
    avgDuration: number;
    tokenEfficiency: number;
  };

  // Metadata
  parentVariantId?: string;
  creationReason: string;
  status: 'testing' | 'active' | 'archived';
}

export interface AgentComposition {
  taskId: string;
  taskComplexity: number;

  // Recommended agent ensemble
  agents: Array<{
    agentId: string;
    role: string;
    weight: number; // contribution weight
    order?: number; // for sequential composition
  }>;

  // Coordination strategy
  pattern: 'sequential' | 'parallel' | 'hierarchical' | 'mesh';
  estimatedDuration: number;
  estimatedTokens: number;
  confidence: number; // 0-1
}

export interface EvolutionReport {
  generatedAt: Date;
  period: DateRange;

  summary: {
    totalTasks: number;
    overallSuccessRate: number;
    avgDuration: number;
    totalTokens: number;
  };

  agentPerformance: Array<{
    agentId: string;
    successRate: number;
    successRateChange: number; // vs previous period
    taskCount: number;
    avgDuration: number;
    tokenEfficiency: number;
    userRating: number;
  }>;

  improvements: Array<{
    type: 'prompt_update' | 'new_skill' | 'agent_variant' | 'capability_expansion';
    agentId: string;
    description: string;
    expectedImpact: string;
    status: 'proposed' | 'testing' | 'deployed';
  }>;

  gaps: CapabilityGap[];
  suggestions: SkillSuggestion[];

  promptUpdates: Array<{
    agentId: string;
    oldVersion: number;
    newVersion: number;
    reason: string;
    performanceImprovement: number; // percentage
  }>;
}

export interface EvolutionConfig {
  // Performance tracking
  trackingEnabled: boolean;
  metricsRetentionDays: number;

  // A/B testing
  abTestingEnabled: boolean;
  minTrialsBeforePromotion: number;
  confidenceLevel: number; // 0-1

  // UCB1 parameters
  explorationParameter: number; // c in UCB1 formula

  // Auto-evolution
  autoEvolutionEnabled: boolean;
  evolutionThreshold: {
    minSuccessRateDrop: number; // trigger if success rate drops by this %
    minTaskCount: number; // minimum tasks before considering evolution
  };

  // Feedback collection
  implicitFeedbackWeight: number; // 0-1, how much weight to give implicit signals
  feedbackDecayHalfLife: number; // days

  // Report generation
  reportFrequency: 'daily' | 'weekly' | 'monthly';
  reportRetentionCount: number;
}

export interface PromptMutation {
  type: 'clarify' | 'expand' | 'simplify' | 'reframe' | 'add_constraint' | 'remove_constraint';
  target: 'system' | 'user' | 'both';
  description: string;
  confidence: number; // 0-1
}

export interface EvolutionState {
  agentId: string;
  currentVariantId: string;
  activeVariants: PromptVariant[];

  // Learning state
  totalTrials: number;
  lastEvolutionAt: Date;
  performanceTrend: 'improving' | 'stable' | 'declining';

  // Decision state
  nextReviewAt: Date;
  autoEvolutionPaused: boolean;
  pauseReason?: string;
}

export interface UCB1State {
  variantId: string;
  totalReward: number; // sum of success indicators
  trialCount: number;
  ucb1Score: number;
  lastUpdated: Date;
}
