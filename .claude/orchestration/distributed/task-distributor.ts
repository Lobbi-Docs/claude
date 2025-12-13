/**
 * Distributed Agent Execution System - Task Distributor
 * Assign tasks to workers, handle timeouts, collect results
 */

import type { DistributedDatabase } from './database.js';
import type { TaskQueue } from './task-queue.js';
import type { WorkerManager } from './worker-manager.js';
import type {
  Task,
  TaskResult,
  Worker,
  LoadBalancingStrategy,
  AssignmentReason,
  TimeoutCandidateView,
  NoAvailableWorkerError,
  TaskTimeoutError,
} from './types.js';

export interface TaskDistributorConfig {
  loadBalancingStrategy: LoadBalancingStrategy;
  maxAssignmentAttempts: number;
  enableAffinity: boolean;
  enableTimeout: boolean;
  timeoutCheckIntervalMs: number;
}

const DEFAULT_CONFIG: TaskDistributorConfig = {
  loadBalancingStrategy: 'least-loaded',
  maxAssignmentAttempts: 5,
  enableAffinity: true,
  enableTimeout: true,
  timeoutCheckIntervalMs: 10000, // 10 seconds
};

export class TaskDistributor {
  private config: TaskDistributorConfig;
  private timeoutInterval?: NodeJS.Timeout;

  constructor(
    private db: DistributedDatabase,
    private queue: TaskQueue,
    private workerManager: WorkerManager,
    config?: Partial<TaskDistributorConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enableTimeout) {
      this.startTimeoutMonitoring();
    }
  }

  /**
   * Assign next task to an available worker
   */
  assignNext(): { task: Task; worker: Worker } | null {
    // Try to dequeue next task
    const task = this.queue.peek();
    if (!task) return null;

    // Find suitable worker
    const worker = this.findWorkerForTask(task);
    if (!worker) return null;

    // Assign task to worker
    this.assign(task.id, worker.id);

    return { task, worker };
  }

  /**
   * Assign specific task to worker
   */
  assign(taskId: string, workerId: string): void {
    this.db.transaction(() => {
      // Update task
      this.queue.assign(taskId, workerId);

      // Increment worker load
      this.workerManager.incrementLoad(workerId);

      // Record assignment
      this.recordAssignment(taskId, workerId);

      console.log(`[TaskDistributor] Assigned task ${taskId} to worker ${workerId}`);
    });
  }

  /**
   * Find suitable worker for a task
   */
  findWorkerForTask(task: Task): Worker | null {
    // Check affinity rules first
    if (this.config.enableAffinity && task.affinity) {
      // Required worker - must use this specific worker
      if (task.affinity.requiredWorker) {
        const worker = this.workerManager.get(task.affinity.requiredWorker);
        if (worker && worker.status !== 'offline' && worker.currentLoad < worker.maxLoad) {
          return worker;
        }
        return null; // Required worker not available
      }

      // Preferred worker - try this first
      if (task.affinity.preferredWorker) {
        const worker = this.workerManager.get(task.affinity.preferredWorker);
        if (worker && worker.status !== 'offline' && worker.currentLoad < worker.maxLoad) {
          return worker;
        }
        // Fall through to general selection
      }

      // Same worker as another task
      if (task.affinity.sameWorkerAs) {
        const otherTask = this.queue.get(task.affinity.sameWorkerAs);
        if (otherTask?.assignedWorker) {
          const worker = this.workerManager.get(otherTask.assignedWorker);
          if (worker && worker.status !== 'offline' && worker.currentLoad < worker.maxLoad) {
            return worker;
          }
        }
      }

      // Excluded workers - filter them out
      if (task.affinity.excludedWorkers && task.affinity.excludedWorkers.length > 0) {
        const workers = task.requiredCapabilities
          ? this.workerManager.getWithCapabilities(task.requiredCapabilities)
          : this.workerManager.getActive();

        const available = workers.filter(
          w =>
            w.currentLoad < w.maxLoad &&
            !task.affinity!.excludedWorkers!.includes(w.id)
        );

        return this.selectByStrategy(available);
      }
    }

    // Standard worker selection
    return this.workerManager.selectWorker(
      this.config.loadBalancingStrategy,
      task.requiredCapabilities
    );
  }

  /**
   * Select worker from list using configured strategy
   */
  private selectByStrategy(workers: Worker[]): Worker | null {
    if (workers.length === 0) return null;

    switch (this.config.loadBalancingStrategy) {
      case 'least-loaded':
        return workers.reduce((min, w) =>
          w.loadFactor < min.loadFactor ? w : min
        );

      case 'round-robin':
        return workers[0]; // Simple implementation

      case 'random':
        return workers[Math.floor(Math.random() * workers.length)];

      default:
        return workers[0];
    }
  }

  /**
   * Start task execution (worker picks up assigned task)
   */
  startTask(taskId: string): void {
    this.queue.updateStatus(taskId, 'running');
    console.log(`[TaskDistributor] Task ${taskId} started execution`);
  }

  /**
   * Complete task with result
   */
  completeTask<T = unknown>(
    taskId: string,
    success: boolean,
    result?: T,
    error?: string,
    errorStack?: string
  ): void {
    this.db.transaction(() => {
      const task = this.queue.get(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Calculate duration
      const durationMs = task.startedAt
        ? Date.now() - task.startedAt.getTime()
        : 0;

      // Store result
      this.db.execute(
        `INSERT INTO task_results (
          task_id, success, result, error, error_stack, duration_ms, worker_id, model_used
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          success ? 1 : 0,
          result ? JSON.stringify(result) : null,
          error ?? null,
          errorStack ?? null,
          durationMs,
          task.assignedWorker!,
          task.assignedWorker
            ? this.workerManager.get(task.assignedWorker)?.modelName
            : null,
        ]
      );

      // Update task status
      this.queue.updateStatus(taskId, success ? 'completed' : 'failed', error);

      // Update assignment
      this.db.execute(
        `UPDATE worker_assignments
         SET completed_at = CURRENT_TIMESTAMP
         WHERE task_id = ? AND completed_at IS NULL`,
        [taskId]
      );

      // Decrement worker load
      if (task.assignedWorker) {
        this.workerManager.decrementLoad(task.assignedWorker);
      }

      // Handle failure - retry or move to dead letter
      if (!success) {
        this.handleTaskFailure(task, error ?? 'Unknown error', errorStack);
      }

      console.log(`[TaskDistributor] Task ${taskId} completed (success: ${success})`);
    });
  }

  /**
   * Handle task failure (retry or dead letter)
   */
  private handleTaskFailure(task: Task, error: string, errorStack?: string): void {
    const attemptCount = this.queue.incrementAttempt(task.id);

    if (attemptCount >= task.maxRetries) {
      // Max retries reached - move to dead letter queue
      this.queue.moveToDeadLetter(task.id, error, errorStack);
      console.warn(`[TaskDistributor] Task ${task.id} moved to dead letter queue after ${attemptCount} attempts`);
    } else {
      // Retry - requeue the task
      this.queue.requeue(task.id);

      // Calculate backoff delay if retry policy exists
      if (task.retryPolicy) {
        const delay = Math.min(
          task.retryPolicy.baseDelayMs *
            Math.pow(task.retryPolicy.backoffFactor, attemptCount - 1),
          task.retryPolicy.maxDelayMs
        );

        console.log(`[TaskDistributor] Task ${task.id} will retry in ${delay}ms (attempt ${attemptCount}/${task.maxRetries})`);

        // TODO: Implement delayed retry (could use setTimeout or scheduled queue)
      } else {
        console.log(`[TaskDistributor] Task ${task.id} requeued for retry (attempt ${attemptCount}/${task.maxRetries})`);
      }
    }
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): void {
    this.db.transaction(() => {
      const task = this.queue.get(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      this.queue.cancel(taskId);

      // Decrement worker load if assigned
      if (task.assignedWorker) {
        this.workerManager.decrementLoad(task.assignedWorker);
      }

      console.log(`[TaskDistributor] Task ${taskId} cancelled`);
    });
  }

  /**
   * Reassign task to different worker
   */
  reassignTask(taskId: string, newWorkerId: string): void {
    this.db.transaction(() => {
      const task = this.queue.get(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Decrement old worker load
      if (task.assignedWorker) {
        this.workerManager.decrementLoad(task.assignedWorker);
      }

      // Complete old assignment
      this.db.execute(
        `UPDATE worker_assignments
         SET completed_at = CURRENT_TIMESTAMP
         WHERE task_id = ? AND completed_at IS NULL`,
        [taskId]
      );

      // Assign to new worker
      this.assign(taskId, newWorkerId);

      // Increment reassignment count
      this.db.execute(
        `UPDATE worker_assignments
         SET reassignment_count = reassignment_count + 1
         WHERE task_id = ? AND worker_id = ?`,
        [taskId, newWorkerId]
      );

      console.log(`[TaskDistributor] Task ${taskId} reassigned from ${task.assignedWorker} to ${newWorkerId}`);
    });
  }

  /**
   * Check for timed out tasks
   */
  checkTimeouts(): TimeoutCandidateView[] {
    const candidates = this.db.query<TimeoutCandidateView>(
      `SELECT * FROM v_timeout_candidates`
    ).map(c => ({
      ...c,
      startedAt: new Date(c.startedAt),
    }));

    for (const candidate of candidates) {
      this.handleTimeout(candidate.id);
    }

    return candidates;
  }

  /**
   * Handle task timeout
   */
  private handleTimeout(taskId: string): void {
    this.db.transaction(() => {
      const task = this.queue.get(taskId);
      if (!task) return;

      // Mark as timeout
      this.queue.updateStatus(taskId, 'timeout', 'Task execution timed out');

      // Decrement worker load
      if (task.assignedWorker) {
        this.workerManager.decrementLoad(task.assignedWorker);
        this.workerManager.recordFailure(task.assignedWorker);
      }

      // Retry or dead letter
      this.handleTaskFailure(task, 'Task execution timed out');

      console.warn(`[TaskDistributor] Task ${taskId} timed out after ${task.timeoutMs}ms`);
    });
  }

  /**
   * Start automatic timeout monitoring
   */
  private startTimeoutMonitoring(): void {
    this.timeoutInterval = setInterval(() => {
      try {
        this.checkTimeouts();
      } catch (error) {
        console.error('[TaskDistributor] Error checking timeouts:', error);
      }
    }, this.config.timeoutCheckIntervalMs);

    console.log(`[TaskDistributor] Timeout monitoring started (interval: ${this.config.timeoutCheckIntervalMs}ms)`);
  }

  /**
   * Stop timeout monitoring
   */
  stopTimeoutMonitoring(): void {
    if (this.timeoutInterval) {
      clearInterval(this.timeoutInterval);
      this.timeoutInterval = undefined;
      console.log('[TaskDistributor] Timeout monitoring stopped');
    }
  }

  /**
   * Record task assignment
   */
  private recordAssignment(taskId: string, workerId: string): void {
    // Determine assignment reason
    const task = this.queue.get(taskId);
    let reason: AssignmentReason = 'load_balance';

    if (task?.affinity?.requiredWorker) {
      reason = 'required_worker';
    } else if (task?.affinity?.preferredWorker) {
      reason = 'affinity';
    } else if (task?.requiredCapabilities && task.requiredCapabilities.length > 0) {
      reason = 'capability_match';
    }

    this.db.execute(
      `INSERT INTO worker_assignments (worker_id, task_id, assignment_reason)
       VALUES (?, ?, ?)`,
      [workerId, taskId, reason]
    );
  }

  /**
   * Get task result
   */
  getResult<T = unknown>(taskId: string): TaskResult<T> | null {
    const row = this.db.queryOne<{
      id: number;
      task_id: string;
      success: number;
      result: string | null;
      error: string | null;
      error_stack: string | null;
      duration_ms: number;
      worker_id: string;
      model_used: string | null;
      tokens_input: number;
      tokens_output: number;
      cost_usd: number;
      completed_at: string;
      metadata: string | null;
    }>(
      `SELECT * FROM task_results WHERE task_id = ?`,
      [taskId]
    );

    if (!row) return null;

    return {
      id: row.id,
      taskId: row.task_id,
      success: row.success === 1,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error ?? undefined,
      errorStack: row.error_stack ?? undefined,
      durationMs: row.duration_ms,
      workerId: row.worker_id,
      modelUsed: row.model_used ?? undefined,
      tokensInput: row.tokens_input,
      tokensOutput: row.tokens_output,
      costUsd: row.cost_usd,
      completedAt: new Date(row.completed_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Cleanup - stop monitoring
   */
  cleanup(): void {
    this.stopTimeoutMonitoring();
  }
}
