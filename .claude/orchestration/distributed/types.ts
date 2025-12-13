/**
 * Distributed Agent Execution System - Type Definitions
 * Core TypeScript interfaces for distributed task execution
 */

// ============================================
// WORKER TYPES
// ============================================

export type WorkerStatus = 'idle' | 'busy' | 'offline' | 'error';

export interface Worker {
  id: string;
  name: string;
  capabilities: string[];
  status: WorkerStatus;
  currentLoad: number;
  maxLoad: number;
  loadFactor: number;
  lastHeartbeat: Date;
  heartbeatIntervalMs: number;
  consecutiveFailures: number;
  modelName?: string;
  modelId?: string;
  startedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface WorkerRegistration {
  name: string;
  capabilities: string[];
  maxLoad?: number;
  heartbeatIntervalMs?: number;
  modelName?: string;
  modelId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkerHeartbeat {
  workerId: string;
  status?: WorkerStatus;
  currentLoad?: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// TASK TYPES
// ============================================

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';
export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';

export interface Task<T = unknown> {
  id: string;
  type: string;
  payload: T;
  priority: TaskPriority;
  priorityValue: number;
  createdAt: Date;
  timeoutMs: number;
  retryPolicy?: RetryPolicy;
  affinity?: AffinityRules;
  requiredCapabilities?: string[];
  status: TaskStatus;
  assignedWorker?: string;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  attemptCount: number;
  maxRetries: number;
  lastError?: string;
  resultId?: string;
  parentTaskId?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskSubmission<T = unknown> {
  type: string;
  payload: T;
  priority?: TaskPriority;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  affinity?: AffinityRules;
  requiredCapabilities?: string[];
  maxRetries?: number;
  parentTaskId?: string;
  metadata?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

export interface AffinityRules {
  preferredWorker?: string;
  requiredWorker?: string;
  excludedWorkers?: string[];
  sameWorkerAs?: string; // Task ID to share worker with
}

// ============================================
// TASK RESULT TYPES
// ============================================

export interface TaskResult<T = unknown> {
  id: number;
  taskId: string;
  success: boolean;
  result?: T;
  error?: string;
  errorStack?: string;
  durationMs: number;
  workerId: string;
  modelUsed?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  completedAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// WORKER ASSIGNMENT TYPES
// ============================================

export interface WorkerAssignment {
  id: number;
  workerId: string;
  taskId: string;
  assignedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  assignmentReason?: AssignmentReason;
  reassignmentCount: number;
}

export type AssignmentReason =
  | 'capability_match'
  | 'load_balance'
  | 'affinity'
  | 'required_worker'
  | 'only_available'
  | 'manual';

// ============================================
// DISTRIBUTED STATE TYPES
// ============================================

export interface DistributedState<T = unknown> {
  key: string;
  value: T;
  version: number;
  updatedBy?: string;
  updatedAt: Date;
  expiresAt?: Date;
  stateType?: StateType;
}

export type StateType = 'config' | 'cache' | 'lock' | 'coordination';

export interface StateUpdate<T = unknown> {
  value: T;
  expectedVersion?: number; // For optimistic locking
  expiresAt?: Date;
  stateType?: StateType;
}

// ============================================
// DEAD LETTER QUEUE TYPES
// ============================================

export interface DeadLetterEntry {
  id: number;
  taskId: string;
  taskType: string;
  originalPayload: unknown;
  error: string;
  errorStack?: string;
  retryCount: number;
  finalStatus: 'failed' | 'timeout' | 'cancelled';
  attemptedWorkers: string[];
  originalCreatedAt?: Date;
  failedAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// TASK DEPENDENCY TYPES
// ============================================

export interface TaskDependency {
  id: number;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: DependencyType;
  createdAt: Date;
  resolvedAt?: Date;
}

export type DependencyType = 'blocking' | 'optional' | 'weak';

// ============================================
// WORKER METRICS TYPES
// ============================================

export interface WorkerMetrics {
  id: number;
  workerId: string;
  timestamp: Date;
  tasksCompleted: number;
  tasksFailed: number;
  avgDurationMs: number;
  successRate: number;
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCostUsd: number;
  avgLoadFactor: number;
  peakLoad: number;
}

// ============================================
// VIEW TYPES
// ============================================

export interface ActiveWorkerView extends Worker {
  secondsSinceHeartbeat: number;
  isStale: boolean;
}

export interface PendingTaskView {
  id: string;
  type: string;
  priority: TaskPriority;
  priorityValue: number;
  createdAt: Date;
  timeoutMs: number;
  requiredCapabilities?: string[];
  affinity?: AffinityRules;
  attemptCount: number;
  maxRetries: number;
  waitTimeMs: number;
}

export interface TaskExecutionSummary {
  id: string;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedWorker?: string;
  workerName?: string;
  success?: boolean;
  durationMs?: number;
  error?: string;
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalTimeMs?: number;
}

export interface WorkerPerformanceSummary {
  id: string;
  name: string;
  status: WorkerStatus;
  modelName?: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  successRate: number;
  avgDurationMs: number;
  totalCostUsd: number;
  totalTokensInput: number;
  totalTokensOutput: number;
}

export interface QueueDepthView {
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskCount: number;
  avgWaitTimeMs: number;
}

export interface SystemHealthView {
  idleWorkers: number;
  busyWorkers: number;
  offlineWorkers: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  deadLetterCount: number;
  avgLoadFactor: number;
  avgTaskDurationLastHour: number;
}

export interface StaleWorkerView {
  id: string;
  name: string;
  status: WorkerStatus;
  lastHeartbeat: Date;
  heartbeatIntervalMs: number;
  msSinceHeartbeat: number;
  consecutiveFailures: number;
  currentLoad: number;
}

export interface TimeoutCandidateView {
  id: string;
  type: string;
  status: TaskStatus;
  assignedWorker?: string;
  startedAt: Date;
  timeoutMs: number;
  elapsedMs: number;
  remainingMs: number;
}

// ============================================
// LOAD BALANCING TYPES
// ============================================

export type LoadBalancingStrategy =
  | 'round-robin'
  | 'least-loaded'
  | 'capability-match'
  | 'random'
  | 'weighted';

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  considerCapabilities: boolean;
  respectAffinity: boolean;
  maxLoadThreshold: number; // Don't assign if load > this
}

// ============================================
// COORDINATOR TYPES
// ============================================

export interface CoordinatorConfig {
  heartbeatCheckIntervalMs: number;
  timeoutCheckIntervalMs: number;
  deadWorkerThresholdMs: number;
  maxConcurrentTasks: number;
  defaultTaskTimeoutMs: number;
  defaultRetryPolicy: RetryPolicy;
  loadBalancer: LoadBalancerConfig;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  tasks: WorkflowTask[];
  maxConcurrency?: number;
  failFast?: boolean;
  metadata?: Record<string, unknown>;
}

export interface WorkflowTask {
  id: string;
  type: string;
  payload: unknown;
  dependsOn?: string[];
  priority?: TaskPriority;
  retryPolicy?: RetryPolicy;
  requiredCapabilities?: string[];
}

export interface WorkflowExecution {
  workflowId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  taskStatuses: Map<string, TaskStatus>;
  results: Map<string, unknown>;
  errors: Map<string, string>;
}

// ============================================
// PROGRESS REPORTING TYPES
// ============================================

export interface ProgressReport {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  runningTasks: number;
  percentComplete: number;
  estimatedTimeRemainingMs?: number;
  currentPhase?: string;
}

// ============================================
// ERROR TYPES
// ============================================

export class DistributedSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DistributedSystemError';
  }
}

export class WorkerNotFoundError extends DistributedSystemError {
  constructor(workerId: string) {
    super(`Worker not found: ${workerId}`, 'WORKER_NOT_FOUND', { workerId });
    this.name = 'WorkerNotFoundError';
  }
}

export class TaskNotFoundError extends DistributedSystemError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, 'TASK_NOT_FOUND', { taskId });
    this.name = 'TaskNotFoundError';
  }
}

export class NoAvailableWorkerError extends DistributedSystemError {
  constructor(requiredCapabilities?: string[]) {
    super(
      'No available worker found',
      'NO_AVAILABLE_WORKER',
      { requiredCapabilities }
    );
    this.name = 'NoAvailableWorkerError';
  }
}

export class TaskTimeoutError extends DistributedSystemError {
  constructor(taskId: string, timeoutMs: number) {
    super(
      `Task ${taskId} timed out after ${timeoutMs}ms`,
      'TASK_TIMEOUT',
      { taskId, timeoutMs }
    );
    this.name = 'TaskTimeoutError';
  }
}

export class OptimisticLockError extends DistributedSystemError {
  constructor(key: string, expectedVersion: number, actualVersion: number) {
    super(
      `Optimistic lock failure for key ${key}`,
      'OPTIMISTIC_LOCK_FAILURE',
      { key, expectedVersion, actualVersion }
    );
    this.name = 'OptimisticLockError';
  }
}

// ============================================
// DATABASE ROW TYPES (Internal)
// ============================================

export interface WorkerRow {
  id: string;
  name: string;
  capabilities: string; // JSON
  status: WorkerStatus;
  current_load: number;
  max_load: number;
  load_factor: number;
  last_heartbeat: string; // ISO timestamp
  heartbeat_interval_ms: number;
  consecutive_failures: number;
  model_name: string | null;
  model_id: string | null;
  started_at: string; // ISO timestamp
  metadata: string | null; // JSON
}

export interface TaskRow {
  id: string;
  type: string;
  payload: string; // JSON
  priority: TaskPriority;
  priority_value: number;
  created_at: string; // ISO timestamp
  timeout_ms: number;
  retry_policy: string | null; // JSON
  affinity: string | null; // JSON
  required_capabilities: string | null; // JSON
  status: TaskStatus;
  assigned_worker: string | null;
  assigned_at: string | null; // ISO timestamp
  started_at: string | null; // ISO timestamp
  completed_at: string | null; // ISO timestamp
  attempt_count: number;
  max_retries: number;
  last_error: string | null;
  result_id: string | null;
  parent_task_id: string | null;
  metadata: string | null; // JSON
}

export interface TaskResultRow {
  id: number;
  task_id: string;
  success: number; // SQLite boolean (0/1)
  result: string | null; // JSON
  error: string | null;
  error_stack: string | null;
  duration_ms: number;
  worker_id: string;
  model_used: string | null;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  completed_at: string; // ISO timestamp
  metadata: string | null; // JSON
}

// ============================================
// UTILITY TYPES
// ============================================

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
