/**
 * TypeScript types for agent activity logging
 *
 * Defines the data structures for tracking agent execution across the 6-phase
 * orchestration protocol: EXPLORE → PLAN → CODE → TEST → FIX → DOCUMENT
 */

/**
 * Agent execution phases following the mandatory orchestration protocol
 */
export type AgentPhase = 'explore' | 'plan' | 'code' | 'test' | 'fix' | 'document';

/**
 * Current status of agent execution
 */
export type AgentStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

/**
 * Checkpoint markers for tracking progress within phases
 */
export type Checkpoint = 'start' | 'planning' | 'post-plan' | 'quality-check' | 'commit';

/**
 * Complete agent activity record
 *
 * This structure is logged to Obsidian vault for persistent tracking
 * and rendered as a Markdown table row in System/Agents/Activity-Log.md
 */
export interface AgentActivity {
  /** Unique identifier for this agent instance (e.g., "coder-20250129-143022") */
  agentId: string;

  /** Agent type/role (e.g., "coder", "tester", "reviewer") */
  agentType: string;

  /** Task identifier this agent is working on */
  taskId: string;

  /** ISO 8601 timestamp when agent started */
  startTime: string;

  /** Current execution phase */
  phase: AgentPhase;

  /** Human-readable description of current action */
  currentAction: string;

  /** Number of files modified by this agent */
  filesModified: number;

  /** Current execution status */
  status: AgentStatus;

  /** Duration in minutes (calculated on completion) */
  duration?: number;

  /** Number of errors encountered */
  errors: number;

  /** Number of warnings generated */
  warnings: number;

  /** Current checkpoint marker */
  checkpoint: Checkpoint;

  /** Parent task ID if this is a sub-agent */
  parentTask?: string;

  /** ISO 8601 timestamp when agent completed (if finished) */
  endTime?: string;
}

/**
 * Configuration for Obsidian MCP integration
 */
export interface MCPConfig {
  /** Absolute path to Obsidian vault */
  vaultPath: string;

  /** Relative path within vault to activity log file */
  activityLogPath: string;

  /** Fallback JSON file path when MCP unavailable */
  fallbackJsonPath: string;

  /** Whether MCP integration is enabled */
  mcpEnabled: boolean;
}

/**
 * Update payload for agent phase transitions
 */
export interface AgentPhaseUpdate {
  agentId: string;
  phase: AgentPhase;
  action: string;
  filesModified?: number;
}

/**
 * Update payload for checkpoint logging
 */
export interface CheckpointUpdate {
  agentId: string;
  checkpoint: Checkpoint;
  metadata?: Record<string, any>;
}

/**
 * Completion payload for agent finish
 */
export interface AgentCompletion {
  agentId: string;
  status: AgentStatus;
  duration: number;
  errors?: number;
  warnings?: number;
}

/**
 * Query filter for retrieving agent activities
 */
export interface ActivityQuery {
  agentId?: string;
  taskId?: string;
  phase?: AgentPhase;
  status?: AgentStatus;
  startAfter?: string;
  startBefore?: string;
}

/**
 * Summary statistics for agent execution
 */
export interface ActivitySummary {
  totalAgents: number;
  activeAgents: number;
  completedAgents: number;
  failedAgents: number;
  totalDuration: number;
  totalErrors: number;
  totalWarnings: number;
  phaseBreakdown: Record<AgentPhase, number>;
}
