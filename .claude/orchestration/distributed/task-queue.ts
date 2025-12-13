/**
 * Distributed Agent Execution System - Task Queue
 * Priority queue with SQLite persistence and dead letter queue
 */

import { randomUUID } from 'crypto';
import type { DistributedDatabase } from './database.js';
import type {
  Task,
  TaskSubmission,
  TaskPriority,
  TaskStatus,
  TaskRow,
  DeadLetterEntry,
  PendingTaskView,
  TaskNotFoundError,
  RetryPolicy,
} from './types.js';

const PRIORITY_VALUES: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  backoffFactor: 2,
};

export class TaskQueue {
  constructor(private db: DistributedDatabase) {}

  /**
   * Enqueue a new task
   */
  enqueue<T = unknown>(submission: TaskSubmission<T>): string {
    const taskId = randomUUID();
    const priority = submission.priority ?? 'normal';
    const retryPolicy = submission.retryPolicy ?? DEFAULT_RETRY_POLICY;

    this.db.execute(
      `INSERT INTO task_queue (
        id, type, payload, priority, priority_value, timeout_ms,
        retry_policy, affinity, required_capabilities, max_retries,
        parent_task_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        submission.type,
        JSON.stringify(submission.payload),
        priority,
        PRIORITY_VALUES[priority],
        submission.timeoutMs ?? 300000, // 5 minute default
        JSON.stringify(retryPolicy),
        submission.affinity ? JSON.stringify(submission.affinity) : null,
        submission.requiredCapabilities
          ? JSON.stringify(submission.requiredCapabilities)
          : null,
        submission.maxRetries ?? retryPolicy.maxRetries,
        submission.parentTaskId ?? null,
        submission.metadata ? JSON.stringify(submission.metadata) : null,
      ]
    );

    return taskId;
  }

  /**
   * Enqueue multiple tasks in a transaction
   */
  enqueueBatch<T = unknown>(submissions: TaskSubmission<T>[]): string[] {
    return this.db.transaction(() => {
      return submissions.map(s => this.enqueue(s));
    });
  }

  /**
   * Dequeue next task by priority
   */
  dequeue(): Task | null {
    const row = this.db.queryOne<TaskRow>(
      `SELECT * FROM task_queue
       WHERE status = 'pending'
       ORDER BY priority_value DESC, created_at ASC
       LIMIT 1`
    );

    return row ? this.rowToTask(row) : null;
  }

  /**
   * Dequeue task with specific capabilities
   */
  dequeueWithCapabilities(requiredCapabilities: string[]): Task | null {
    // Get pending tasks that match capabilities
    const row = this.db.queryOne<TaskRow>(
      `SELECT * FROM task_queue
       WHERE status = 'pending'
         AND (
           required_capabilities IS NULL
           OR required_capabilities = '[]'
           OR required_capabilities = ?
         )
       ORDER BY priority_value DESC, created_at ASC
       LIMIT 1`,
      [JSON.stringify(requiredCapabilities)]
    );

    if (!row) return null;

    // Parse and verify capabilities match
    const task = this.rowToTask(row);
    if (
      task.requiredCapabilities &&
      task.requiredCapabilities.length > 0 &&
      !task.requiredCapabilities.every(cap => requiredCapabilities.includes(cap))
    ) {
      return null;
    }

    return task;
  }

  /**
   * Peek at next task without removing it
   */
  peek(): Task | null {
    const row = this.db.queryOne<TaskRow>(
      `SELECT * FROM task_queue
       WHERE status = 'pending'
       ORDER BY priority_value DESC, created_at ASC
       LIMIT 1`
    );

    return row ? this.rowToTask(row) : null;
  }

  /**
   * Get task by ID
   */
  get(taskId: string): Task | null {
    const row = this.db.queryOne<TaskRow>(
      `SELECT * FROM task_queue WHERE id = ?`,
      [taskId]
    );

    return row ? this.rowToTask(row) : null;
  }

  /**
   * Update task status
   */
  updateStatus(
    taskId: string,
    status: TaskStatus,
    error?: string
  ): void {
    const updates: string[] = ['status = ?'];
    const params: unknown[] = [status];

    if (status === 'assigned') {
      updates.push('assigned_at = CURRENT_TIMESTAMP');
    } else if (status === 'running') {
      updates.push('started_at = CURRENT_TIMESTAMP');
    } else if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'timeout'
    ) {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (error) {
      updates.push('last_error = ?');
      params.push(error);
    }

    params.push(taskId);

    this.db.execute(
      `UPDATE task_queue SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  /**
   * Assign task to worker
   */
  assign(taskId: string, workerId: string): void {
    this.db.execute(
      `UPDATE task_queue
       SET status = 'assigned',
           assigned_worker = ?,
           assigned_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [workerId, taskId]
    );
  }

  /**
   * Increment attempt count
   */
  incrementAttempt(taskId: string): number {
    this.db.execute(
      `UPDATE task_queue
       SET attempt_count = attempt_count + 1
       WHERE id = ?`,
      [taskId]
    );

    const task = this.get(taskId);
    return task?.attemptCount ?? 0;
  }

  /**
   * Cancel task
   */
  cancel(taskId: string): void {
    this.updateStatus(taskId, 'cancelled');
  }

  /**
   * Requeue task (reset to pending)
   */
  requeue(taskId: string): void {
    this.db.execute(
      `UPDATE task_queue
       SET status = 'pending',
           assigned_worker = NULL,
           assigned_at = NULL,
           started_at = NULL
       WHERE id = ?`,
      [taskId]
    );
  }

  /**
   * Move task to dead letter queue
   */
  moveToDeadLetter(
    taskId: string,
    error: string,
    errorStack?: string
  ): void {
    this.db.transaction(() => {
      const task = this.get(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // Get all workers that attempted this task
      const attemptedWorkers = this.db.query<{ worker_id: string }>(
        `SELECT DISTINCT worker_id
         FROM worker_assignments
         WHERE task_id = ?`,
        [taskId]
      );

      this.db.execute(
        `INSERT INTO dead_letter_queue (
          task_id, task_type, original_payload, error, error_stack,
          retry_count, final_status, attempted_workers, original_created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskId,
          task.type,
          JSON.stringify(task.payload),
          error,
          errorStack ?? null,
          task.attemptCount,
          task.status,
          JSON.stringify(attemptedWorkers.map(w => w.worker_id)),
          task.createdAt.toISOString(),
        ]
      );

      // Keep task in queue for audit trail but mark as failed
      this.updateStatus(taskId, 'failed', error);
    });
  }

  /**
   * Get pending tasks
   */
  getPending(limit = 100): Task[] {
    const rows = this.db.query<TaskRow>(
      `SELECT * FROM task_queue
       WHERE status = 'pending'
       ORDER BY priority_value DESC, created_at ASC
       LIMIT ?`,
      [limit]
    );

    return rows.map(r => this.rowToTask(r));
  }

  /**
   * Get pending tasks view (with wait times)
   */
  getPendingView(limit = 100): PendingTaskView[] {
    return this.db.query<PendingTaskView>(
      `SELECT * FROM v_pending_tasks LIMIT ?`,
      [limit]
    ).map(v => ({
      ...v,
      createdAt: new Date(v.createdAt),
      requiredCapabilities: v.requiredCapabilities
        ? JSON.parse(v.requiredCapabilities as unknown as string)
        : undefined,
      affinity: v.affinity
        ? JSON.parse(v.affinity as unknown as string)
        : undefined,
    }));
  }

  /**
   * Get running tasks
   */
  getRunning(): Task[] {
    const rows = this.db.query<TaskRow>(
      `SELECT * FROM task_queue
       WHERE status IN ('assigned', 'running')
       ORDER BY started_at ASC`
    );

    return rows.map(r => this.rowToTask(r));
  }

  /**
   * Get tasks by worker
   */
  getByWorker(workerId: string, includeCompleted = false): Task[] {
    const statuses = includeCompleted
      ? ['assigned', 'running', 'completed']
      : ['assigned', 'running'];

    const rows = this.db.query<TaskRow>(
      `SELECT * FROM task_queue
       WHERE assigned_worker = ?
         AND status IN (${statuses.map(() => '?').join(',')})
       ORDER BY created_at DESC`,
      [workerId, ...statuses]
    );

    return rows.map(r => this.rowToTask(r));
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetters(limit = 100): DeadLetterEntry[] {
    const rows = this.db.query<{
      id: number;
      task_id: string;
      task_type: string;
      original_payload: string;
      error: string;
      error_stack: string | null;
      retry_count: number;
      final_status: string;
      attempted_workers: string;
      original_created_at: string | null;
      failed_at: string;
      metadata: string | null;
    }>(
      `SELECT * FROM dead_letter_queue ORDER BY failed_at DESC LIMIT ?`,
      [limit]
    );

    return rows.map(r => ({
      id: r.id,
      taskId: r.task_id,
      taskType: r.task_type,
      originalPayload: JSON.parse(r.original_payload),
      error: r.error,
      errorStack: r.error_stack ?? undefined,
      retryCount: r.retry_count,
      finalStatus: r.final_status as 'failed' | 'timeout' | 'cancelled',
      attemptedWorkers: JSON.parse(r.attempted_workers),
      originalCreatedAt: r.original_created_at
        ? new Date(r.original_created_at)
        : undefined,
      failedAt: new Date(r.failed_at),
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
    }));
  }

  /**
   * Retry task from dead letter queue
   */
  retryDeadLetter(deadLetterId: number): string | null {
    return this.db.transaction(() => {
      const entry = this.db.queryOne<{
        task_type: string;
        original_payload: string;
        metadata: string | null;
      }>(
        `SELECT task_type, original_payload, metadata
         FROM dead_letter_queue
         WHERE id = ?`,
        [deadLetterId]
      );

      if (!entry) return null;

      const newTaskId = this.enqueue({
        type: entry.task_type,
        payload: JSON.parse(entry.original_payload),
        metadata: entry.metadata ? JSON.parse(entry.metadata) : undefined,
      });

      // Remove from dead letter queue
      this.db.execute(
        `DELETE FROM dead_letter_queue WHERE id = ?`,
        [deadLetterId]
      );

      return newTaskId;
    });
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    assigned: number;
    running: number;
    completed: number;
    failed: number;
    deadLetters: number;
    avgWaitTimeMs: number;
  } {
    const stats = this.db.queryOne<{
      pending: number;
      assigned: number;
      running: number;
      completed: number;
      failed: number;
      deadLetters: number;
      avgWaitTimeMs: number | null;
    }>(`
      SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        (SELECT COUNT(*) FROM dead_letter_queue) as deadLetters,
        AVG(
          CASE
            WHEN status = 'pending' THEN
              CAST((julianday('now') - julianday(created_at)) * 1000 AS INTEGER)
            ELSE NULL
          END
        ) as avgWaitTimeMs
      FROM task_queue
    `);

    return {
      pending: stats?.pending ?? 0,
      assigned: stats?.assigned ?? 0,
      running: stats?.running ?? 0,
      completed: stats?.completed ?? 0,
      failed: stats?.failed ?? 0,
      deadLetters: stats?.deadLetters ?? 0,
      avgWaitTimeMs: stats?.avgWaitTimeMs ?? 0,
    };
  }

  /**
   * Purge completed tasks older than threshold
   */
  purgeCompleted(olderThanMs: number): number {
    const result = this.db.execute(
      `DELETE FROM task_queue
       WHERE status IN ('completed', 'cancelled')
         AND completed_at < datetime('now', '-' || ? || ' milliseconds')`,
      [olderThanMs]
    );

    return result.changes;
  }

  /**
   * Convert database row to Task object
   */
  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      type: row.type,
      payload: JSON.parse(row.payload),
      priority: row.priority,
      priorityValue: row.priority_value,
      createdAt: new Date(row.created_at),
      timeoutMs: row.timeout_ms,
      retryPolicy: row.retry_policy ? JSON.parse(row.retry_policy) : undefined,
      affinity: row.affinity ? JSON.parse(row.affinity) : undefined,
      requiredCapabilities: row.required_capabilities
        ? JSON.parse(row.required_capabilities)
        : undefined,
      status: row.status,
      assignedWorker: row.assigned_worker ?? undefined,
      assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      attemptCount: row.attempt_count,
      maxRetries: row.max_retries,
      lastError: row.last_error ?? undefined,
      resultId: row.result_id ?? undefined,
      parentTaskId: row.parent_task_id ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
