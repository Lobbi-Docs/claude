/**
 * Performance Tracker
 *
 * Tracks agent task completion metrics, success rates, duration, and token efficiency.
 * Stores data in SQLite for time-series analysis.
 */

import { Database } from 'better-sqlite3';
import {
  PerformanceMetric,
  DateRange,
  UserFeedback,
  TaskFailure,
} from './types';

export class PerformanceTracker {
  private db: Database;
  private config: {
    retentionDays: number;
    feedbackDecayHalfLife: number;
  };

  constructor(
    db: Database,
    config = { retentionDays: 90, feedbackDecayHalfLife: 7 }
  ) {
    this.db = db;
    this.config = config;
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Ensure evolution tables exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_performance_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        session_id TEXT,
        success INTEGER NOT NULL, -- 0 or 1
        duration_ms INTEGER NOT NULL,
        token_count INTEGER NOT NULL,
        user_rating REAL,
        task_type TEXT,
        complexity INTEGER,
        error_type TEXT,
        retry_count INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_perf_agent_time
        ON evolution_performance_metrics(agent_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_perf_success
        ON evolution_performance_metrics(success, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_perf_task_type
        ON evolution_performance_metrics(task_type);

      CREATE TABLE IF NOT EXISTS evolution_user_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        rating REAL NOT NULL,
        comment TEXT,
        feedback_type TEXT NOT NULL, -- explicit, implicit
        retry INTEGER DEFAULT 0,
        edit INTEGER DEFAULT 0,
        edit_type TEXT,
        abandoned INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_agent
        ON evolution_user_feedback(agent_id, timestamp DESC);

      CREATE TABLE IF NOT EXISTS evolution_task_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        error_type TEXT NOT NULL,
        error_message TEXT,
        stack_trace TEXT,
        task_type TEXT,
        required_capabilities TEXT, -- JSON array
        attempted_actions TEXT, -- JSON array
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id)
      );

      CREATE INDEX IF NOT EXISTS idx_failures_agent
        ON evolution_task_failures(agent_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_failures_error_type
        ON evolution_task_failures(error_type);
    `);
  }

  /**
   * Track task completion metric
   */
  trackTask(metric: PerformanceMetric): void {
    const stmt = this.db.prepare(`
      INSERT INTO evolution_performance_metrics (
        agent_id, task_id, session_id, success, duration_ms,
        token_count, user_rating, task_type, complexity,
        error_type, retry_count, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      metric.agentId,
      metric.taskId,
      metric.sessionId || null,
      metric.success ? 1 : 0,
      metric.duration,
      metric.tokenCount,
      metric.userRating || null,
      metric.taskType || null,
      metric.complexity || null,
      metric.errorType || null,
      metric.retryCount || 0,
      metric.timestamp.toISOString()
    );
  }

  /**
   * Get success rate for an agent over a time period
   */
  getSuccessRate(agentId: string, period?: DateRange): number {
    let query = `
      SELECT
        CAST(SUM(success) AS REAL) / COUNT(*) as success_rate
      FROM evolution_performance_metrics
      WHERE agent_id = ?
    `;

    const params: any[] = [agentId];

    if (period) {
      query += ` AND timestamp >= ? AND timestamp <= ?`;
      params.push(period.start.toISOString(), period.end.toISOString());
    }

    const result = this.db.prepare(query).get(...params) as {
      success_rate: number;
    } | undefined;

    return result?.success_rate || 0;
  }

  /**
   * Get average completion time for an agent
   */
  getAverageTime(agentId: string, period?: DateRange): number {
    let query = `
      SELECT AVG(duration_ms) as avg_duration
      FROM evolution_performance_metrics
      WHERE agent_id = ?
    `;

    const params: any[] = [agentId];

    if (period) {
      query += ` AND timestamp >= ? AND timestamp <= ?`;
      params.push(period.start.toISOString(), period.end.toISOString());
    }

    const result = this.db.prepare(query).get(...params) as {
      avg_duration: number;
    } | undefined;

    return result?.avg_duration || 0;
  }

  /**
   * Get token efficiency: success per 1000 tokens
   */
  getTokenEfficiency(agentId: string, period?: DateRange): number {
    let query = `
      SELECT
        CAST(SUM(success) AS REAL) / (SUM(token_count) / 1000.0) as efficiency
      FROM evolution_performance_metrics
      WHERE agent_id = ?
    `;

    const params: any[] = [agentId];

    if (period) {
      query += ` AND timestamp >= ? AND timestamp <= ?`;
      params.push(period.start.toISOString(), period.end.toISOString());
    }

    const result = this.db.prepare(query).get(...params) as {
      efficiency: number;
    } | undefined;

    return result?.efficiency || 0;
  }

  /**
   * Record user feedback (explicit or implicit)
   */
  recordFeedback(feedback: UserFeedback): void {
    const stmt = this.db.prepare(`
      INSERT INTO evolution_user_feedback (
        task_id, agent_id, rating, comment, feedback_type,
        retry, edit, edit_type, abandoned, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      feedback.taskId,
      feedback.agentId,
      feedback.rating,
      feedback.comment || null,
      feedback.feedbackType,
      feedback.retry ? 1 : 0,
      feedback.edit ? 1 : 0,
      feedback.editType || null,
      feedback.abandoned ? 1 : 0,
      feedback.timestamp.toISOString()
    );
  }

  /**
   * Record task failure for gap analysis
   */
  recordFailure(failure: TaskFailure): void {
    const stmt = this.db.prepare(`
      INSERT INTO evolution_task_failures (
        task_id, agent_id, error_type, error_message,
        stack_trace, task_type, required_capabilities,
        attempted_actions, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      failure.taskId,
      failure.agentId,
      failure.errorType,
      failure.errorMessage,
      failure.stackTrace || null,
      failure.context.taskType,
      JSON.stringify(failure.context.requiredCapabilities),
      JSON.stringify(failure.context.attemptedActions),
      failure.timestamp.toISOString()
    );
  }

  /**
   * Get weighted user rating with exponential decay
   */
  getWeightedRating(agentId: string): number {
    const now = new Date();
    const halfLife = this.config.feedbackDecayHalfLife * 24 * 60 * 60 * 1000; // ms

    const results = this.db
      .prepare(
        `
      SELECT rating, timestamp
      FROM evolution_user_feedback
      WHERE agent_id = ? AND rating IS NOT NULL
      ORDER BY timestamp DESC
      LIMIT 100
    `
      )
      .all(agentId) as Array<{ rating: number; timestamp: string }>;

    if (results.length === 0) return 0;

    let totalWeight = 0;
    let weightedSum = 0;

    for (const row of results) {
      const age = now.getTime() - new Date(row.timestamp).getTime();
      const weight = Math.exp((-age * Math.LN2) / halfLife);

      weightedSum += row.rating * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get task count for agent in period
   */
  getTaskCount(agentId: string, period?: DateRange): number {
    let query = `
      SELECT COUNT(*) as count
      FROM evolution_performance_metrics
      WHERE agent_id = ?
    `;

    const params: any[] = [agentId];

    if (period) {
      query += ` AND timestamp >= ? AND timestamp <= ?`;
      params.push(period.start.toISOString(), period.end.toISOString());
    }

    const result = this.db.prepare(query).get(...params) as {
      count: number;
    };

    return result.count;
  }

  /**
   * Get performance trend: improving, stable, or declining
   */
  getPerformanceTrend(
    agentId: string,
    windowDays = 7
  ): 'improving' | 'stable' | 'declining' {
    const now = new Date();
    const recent = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const previous = new Date(recent.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const recentRate = this.getSuccessRate(agentId, {
      start: recent,
      end: now,
    });
    const previousRate = this.getSuccessRate(agentId, {
      start: previous,
      end: recent,
    });

    const change = recentRate - previousRate;

    if (Math.abs(change) < 0.05) return 'stable'; // within 5%
    return change > 0 ? 'improving' : 'declining';
  }

  /**
   * Get all failures for gap analysis
   */
  getFailures(agentId?: string, period?: DateRange): TaskFailure[] {
    let query = `
      SELECT
        task_id, agent_id, error_type, error_message,
        stack_trace, task_type, required_capabilities,
        attempted_actions, timestamp
      FROM evolution_task_failures
      WHERE 1=1
    `;

    const params: any[] = [];

    if (agentId) {
      query += ` AND agent_id = ?`;
      params.push(agentId);
    }

    if (period) {
      query += ` AND timestamp >= ? AND timestamp <= ?`;
      params.push(period.start.toISOString(), period.end.toISOString());
    }

    query += ` ORDER BY timestamp DESC`;

    const results = this.db.prepare(query).all(...params) as Array<{
      task_id: string;
      agent_id: string;
      error_type: string;
      error_message: string;
      stack_trace: string | null;
      task_type: string;
      required_capabilities: string;
      attempted_actions: string;
      timestamp: string;
    }>;

    return results.map((row) => ({
      taskId: row.task_id,
      agentId: row.agent_id,
      timestamp: new Date(row.timestamp),
      errorType: row.error_type,
      errorMessage: row.error_message,
      stackTrace: row.stack_trace || undefined,
      context: {
        taskType: row.task_type,
        requiredCapabilities: JSON.parse(row.required_capabilities),
        attemptedActions: JSON.parse(row.attempted_actions),
      },
    }));
  }

  /**
   * Clean up old metrics based on retention policy
   */
  cleanup(): void {
    const cutoffDate = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000
    );

    this.db
      .prepare(
        `
      DELETE FROM evolution_performance_metrics
      WHERE timestamp < ?
    `
      )
      .run(cutoffDate.toISOString());

    this.db
      .prepare(
        `
      DELETE FROM evolution_user_feedback
      WHERE timestamp < ?
    `
      )
      .run(cutoffDate.toISOString());

    this.db
      .prepare(
        `
      DELETE FROM evolution_task_failures
      WHERE timestamp < ?
    `
      )
      .run(cutoffDate.toISOString());
  }

  /**
   * Get comprehensive performance summary
   */
  getPerformanceSummary(agentId: string, period?: DateRange) {
    return {
      successRate: this.getSuccessRate(agentId, period),
      avgDuration: this.getAverageTime(agentId, period),
      tokenEfficiency: this.getTokenEfficiency(agentId, period),
      taskCount: this.getTaskCount(agentId, period),
      weightedRating: this.getWeightedRating(agentId),
      trend: this.getPerformanceTrend(agentId),
    };
  }
}
