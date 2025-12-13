/**
 * Distributed Agent Execution System - Coordinator
 * Central orchestration point for distributed task execution
 */

import { EventEmitter } from 'events';
import type { DistributedDatabase } from './database.js';
import { TaskQueue } from './task-queue.js';
import { WorkerManager } from './worker-manager.js';
import { TaskDistributor } from './task-distributor.js';
import type {
  CoordinatorConfig,
  TaskSubmission,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowTask,
  ProgressReport,
  SystemHealthView,
  TaskStatus,
  RetryPolicy,
} from './types.js';

const DEFAULT_CONFIG: CoordinatorConfig = {
  heartbeatCheckIntervalMs: 30000, // 30 seconds
  timeoutCheckIntervalMs: 10000, // 10 seconds
  deadWorkerThresholdMs: 90000, // 90 seconds
  maxConcurrentTasks: 50,
  defaultTaskTimeoutMs: 300000, // 5 minutes
  defaultRetryPolicy: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 60000,
    backoffFactor: 2,
  },
  loadBalancer: {
    strategy: 'least-loaded',
    considerCapabilities: true,
    respectAffinity: true,
    maxLoadThreshold: 0.9,
  },
};

export type CoordinatorEvent =
  | 'task:enqueued'
  | 'task:assigned'
  | 'task:started'
  | 'task:completed'
  | 'task:failed'
  | 'task:timeout'
  | 'worker:registered'
  | 'worker:offline'
  | 'workflow:started'
  | 'workflow:completed'
  | 'workflow:failed';

export class Coordinator extends EventEmitter {
  private config: CoordinatorConfig;
  private queue: TaskQueue;
  private workerManager: WorkerManager;
  private distributor: TaskDistributor;
  private running = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private workflows = new Map<string, WorkflowExecution>();

  constructor(
    private db: DistributedDatabase,
    config?: Partial<CoordinatorConfig>
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize components
    this.queue = new TaskQueue(db);
    this.workerManager = new WorkerManager(db, {
      defaultMaxLoad: Math.floor(this.config.maxConcurrentTasks / 10),
    });
    this.distributor = new TaskDistributor(
      db,
      this.queue,
      this.workerManager,
      {
        loadBalancingStrategy: this.config.loadBalancer.strategy,
        enableTimeout: true,
        timeoutCheckIntervalMs: this.config.timeoutCheckIntervalMs,
      }
    );
  }

  /**
   * Start the coordinator
   */
  start(): void {
    if (this.running) {
      console.warn('[Coordinator] Already running');
      return;
    }

    this.running = true;

    // Start heartbeat monitoring
    this.startHeartbeatMonitoring();

    console.log('[Coordinator] Started successfully');
  }

  /**
   * Stop the coordinator
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;

    // Stop monitoring
    this.stopHeartbeatMonitoring();
    this.distributor.cleanup();

    console.log('[Coordinator] Stopped successfully');
  }

  /**
   * Submit a task
   */
  submitTask<T = unknown>(submission: TaskSubmission<T>): string {
    const taskId = this.queue.enqueue({
      ...submission,
      timeoutMs: submission.timeoutMs ?? this.config.defaultTaskTimeoutMs,
      retryPolicy: submission.retryPolicy ?? this.config.defaultRetryPolicy,
    });

    this.emit('task:enqueued', taskId);
    console.log(`[Coordinator] Task ${taskId} enqueued (type: ${submission.type})`);

    // Try to assign immediately
    this.processQueue();

    return taskId;
  }

  /**
   * Submit multiple tasks
   */
  submitTasks<T = unknown>(submissions: TaskSubmission<T>[]): string[] {
    const taskIds = this.queue.enqueueBatch(
      submissions.map(s => ({
        ...s,
        timeoutMs: s.timeoutMs ?? this.config.defaultTaskTimeoutMs,
        retryPolicy: s.retryPolicy ?? this.config.defaultRetryPolicy,
      }))
    );

    taskIds.forEach(id => this.emit('task:enqueued', id));
    console.log(`[Coordinator] ${taskIds.length} tasks enqueued`);

    // Try to assign
    this.processQueue();

    return taskIds;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflow: WorkflowDefinition
  ): Promise<WorkflowExecution> {
    const executionId = `${workflow.id}-${Date.now()}`;

    const execution: WorkflowExecution = {
      workflowId: workflow.id,
      executionId,
      status: 'pending',
      startedAt: new Date(),
      taskStatuses: new Map(),
      results: new Map(),
      errors: new Map(),
    };

    this.workflows.set(executionId, execution);
    this.emit('workflow:started', executionId);

    try {
      execution.status = 'running';

      // Build dependency graph
      const taskMap = new Map(workflow.tasks.map(t => [t.id, t]));
      const completed = new Set<string>();

      // Submit tasks respecting dependencies
      while (completed.size < workflow.tasks.length) {
        const ready = workflow.tasks.filter(
          t =>
            !completed.has(t.id) &&
            (!t.dependsOn || t.dependsOn.every(dep => completed.has(dep)))
        );

        if (ready.length === 0) {
          // Circular dependency or stuck
          throw new Error('Workflow stuck: no tasks ready to execute');
        }

        // Submit ready tasks (respect maxConcurrency)
        const toSubmit = workflow.maxConcurrency
          ? ready.slice(0, workflow.maxConcurrency)
          : ready;

        const taskIds = toSubmit.map(t =>
          this.submitTask({
            type: t.type,
            payload: t.payload,
            priority: t.priority,
            retryPolicy: t.retryPolicy,
            requiredCapabilities: t.requiredCapabilities,
            metadata: { workflowId: workflow.id, executionId },
          })
        );

        // Wait for tasks to complete
        await Promise.all(
          taskIds.map(async (taskId, idx) => {
            const task = toSubmit[idx];
            const result = await this.waitForTask(taskId);

            execution.taskStatuses.set(task.id, result.status);

            if (result.status === 'completed') {
              const taskResult = this.distributor.getResult(taskId);
              if (taskResult) {
                execution.results.set(task.id, taskResult.result);
              }
              completed.add(task.id);
            } else {
              // Task failed
              execution.errors.set(task.id, result.error ?? 'Unknown error');

              if (workflow.failFast) {
                throw new Error(`Task ${task.id} failed: ${result.error}`);
              }
            }
          })
        );
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      this.emit('workflow:completed', executionId);

      console.log(`[Coordinator] Workflow ${workflow.id} completed successfully`);
      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      this.emit('workflow:failed', executionId, error);

      console.error(`[Coordinator] Workflow ${workflow.id} failed:`, error);
      throw error;
    }
  }

  /**
   * Wait for task to complete
   */
  private async waitForTask(
    taskId: string
  ): Promise<{ status: TaskStatus; error?: string }> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const task = this.queue.get(taskId);
        if (!task) {
          clearInterval(checkInterval);
          resolve({ status: 'failed', error: 'Task not found' });
          return;
        }

        if (
          task.status === 'completed' ||
          task.status === 'failed' ||
          task.status === 'timeout' ||
          task.status === 'cancelled'
        ) {
          clearInterval(checkInterval);
          resolve({ status: task.status, error: task.lastError });
        }
      }, 1000);
    });
  }

  /**
   * Process task queue - assign pending tasks to workers
   */
  processQueue(): void {
    const stats = this.workerManager.getStats();

    // Check if we have capacity
    if (stats.usedCapacity >= stats.totalCapacity) {
      return; // No capacity
    }

    const availableSlots = stats.totalCapacity - stats.usedCapacity;
    const pending = this.queue.getPending(availableSlots);

    for (const task of pending) {
      try {
        const worker = this.distributor.findWorkerForTask(task);
        if (worker) {
          this.distributor.assign(task.id, worker.id);
          this.emit('task:assigned', task.id, worker.id);
        }
      } catch (error) {
        console.error(`[Coordinator] Error assigning task ${task.id}:`, error);
      }
    }
  }

  /**
   * Get progress report
   */
  getProgress(): ProgressReport {
    const stats = this.queue.getStats();
    const total =
      stats.pending +
      stats.assigned +
      stats.running +
      stats.completed +
      stats.failed;

    const completed = stats.completed;
    const failed = stats.failed;

    return {
      totalTasks: total,
      completedTasks: completed,
      failedTasks: failed,
      pendingTasks: stats.pending,
      runningTasks: stats.assigned + stats.running,
      percentComplete: total > 0 ? (completed / total) * 100 : 0,
      estimatedTimeRemainingMs:
        stats.avgWaitTimeMs > 0 ? stats.avgWaitTimeMs * stats.pending : undefined,
    };
  }

  /**
   * Get system health
   */
  getHealth(): SystemHealthView {
    const health = this.db.queryOne<SystemHealthView>(
      `SELECT * FROM v_system_health`
    );

    return health ?? {
      idleWorkers: 0,
      busyWorkers: 0,
      offlineWorkers: 0,
      pendingTasks: 0,
      runningTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      deadLetterCount: 0,
      avgLoadFactor: 0,
      avgTaskDurationLastHour: 0,
    };
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      try {
        this.workerManager.autoCleanup();
      } catch (error) {
        console.error('[Coordinator] Error in heartbeat monitoring:', error);
      }
    }, this.config.heartbeatCheckIntervalMs);

    console.log(
      `[Coordinator] Heartbeat monitoring started (interval: ${this.config.heartbeatCheckIntervalMs}ms)`
    );
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
      console.log('[Coordinator] Heartbeat monitoring stopped');
    }
  }

  /**
   * Get component accessors
   */
  getQueue(): TaskQueue {
    return this.queue;
  }

  getWorkerManager(): WorkerManager {
    return this.workerManager;
  }

  getDistributor(): TaskDistributor {
    return this.distributor;
  }

  getDatabase(): DistributedDatabase {
    return this.db;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Coordinator] Starting graceful shutdown...');

    // Stop accepting new tasks
    this.stop();

    // Wait for running tasks to complete (with timeout)
    const maxWaitMs = 60000; // 1 minute
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const running = this.queue.getRunning();
      if (running.length === 0) {
        break;
      }

      console.log(`[Coordinator] Waiting for ${running.length} tasks to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const stillRunning = this.queue.getRunning();
    if (stillRunning.length > 0) {
      console.warn(
        `[Coordinator] ${stillRunning.length} tasks still running after timeout - forcing shutdown`
      );
    }

    // Close database
    this.db.close();

    console.log('[Coordinator] Shutdown complete');
  }
}
