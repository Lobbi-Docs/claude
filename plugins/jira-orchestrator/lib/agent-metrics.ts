/**
 * Agent Execution Metrics
 *
 * Tracks per-agent execution metrics including timing, success rates,
 * token usage, and model distribution. Provides aggregate analytics
 * for optimization and performance monitoring.
 *
 * @module agent-metrics
 * @version 7.4.0
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Single agent execution record
 */
export interface AgentExecution {
  /** Unique execution identifier */
  executionId: string;

  /** Agent name */
  agentName: string;

  /** Execution start timestamp */
  startTime: number;

  /** Execution end timestamp */
  endTime: number;

  /** Duration in milliseconds */
  durationMs: number;

  /** Execution succeeded */
  success: boolean;

  /** Error type if failed */
  errorType?: string;

  /** Model used for execution */
  model: string;

  /** Estimated tokens used */
  tokensUsed?: number;

  /** Task type (optional categorization) */
  taskType?: string;
}

/**
 * Aggregated metrics for a single agent
 */
export interface AgentMetrics {
  /** Agent name */
  agentName: string;

  /** Total executions */
  executionCount: number;

  /** Successful executions */
  successCount: number;

  /** Failed executions */
  failureCount: number;

  /** Success rate (0-1) */
  successRate: number;

  /** Average duration in milliseconds */
  avgDurationMs: number;

  /** Minimum duration */
  minDurationMs: number;

  /** Maximum duration */
  maxDurationMs: number;

  /** 50th percentile duration */
  p50DurationMs: number;

  /** 95th percentile duration */
  p95DurationMs: number;

  /** Total tokens used across all executions */
  totalTokensUsed: number;

  /** Distribution of models used */
  modelDistribution: Record<string, number>;

  /** Timestamp of last execution */
  lastExecuted: number;
}

/**
 * Aggregate metrics across all agents
 */
export interface AggregateMetrics {
  /** Total executions across all agents */
  totalExecutions: number;

  /** Total successful executions */
  totalSuccesses: number;

  /** Total failed executions */
  totalFailures: number;

  /** Overall success rate */
  overallSuccessRate: number;

  /** Average duration across all agents */
  avgDurationMs: number;

  /** Top agents by usage count */
  topAgentsByUsage: Array<{ name: string; count: number }>;

  /** Top agents by average duration */
  topAgentsByDuration: Array<{ name: string; avgMs: number }>;

  /** Failures grouped by error type */
  failuresByErrorType: Record<string, number>;
}

/**
 * In-flight execution tracking
 */
interface PendingExecution {
  executionId: string;
  agentName: string;
  model: string;
  taskType?: string;
  startTime: number;
}

/**
 * Agent metrics collector and analyzer
 *
 * Collects execution metrics, calculates statistics, and persists
 * to disk for long-term analysis.
 */
export class AgentMetricsCollector {
  private executions: AgentExecution[] = [];
  private pendingExecutions: Map<string, PendingExecution> = new Map();
  private storagePath: string;
  private metricsCache: Map<string, AgentMetrics> = new Map();
  private dirty: boolean = false;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.ensureStorageDir();
    this.restore();
  }

  /**
   * Record a completed execution
   */
  recordExecution(execution: AgentExecution): void {
    this.executions.push(execution);
    this.dirty = true;

    // Invalidate cache for this agent
    this.metricsCache.delete(execution.agentName);

    // Auto-persist every 10 executions
    if (this.executions.length % 10 === 0) {
      this.persist();
    }
  }

  /**
   * Start tracking an execution (returns execution ID)
   */
  startExecution(agentName: string, model: string, taskType?: string): string {
    const executionId = randomUUID();
    const pending: PendingExecution = {
      executionId,
      agentName,
      model,
      taskType,
      startTime: Date.now()
    };

    this.pendingExecutions.set(executionId, pending);
    return executionId;
  }

  /**
   * End tracking and record execution
   */
  endExecution(
    executionId: string,
    success: boolean,
    errorType?: string,
    tokensUsed?: number
  ): void {
    const pending = this.pendingExecutions.get(executionId);
    if (!pending) {
      console.warn(`No pending execution found for ID: ${executionId}`);
      return;
    }

    const endTime = Date.now();
    const execution: AgentExecution = {
      executionId,
      agentName: pending.agentName,
      startTime: pending.startTime,
      endTime,
      durationMs: endTime - pending.startTime,
      success,
      errorType,
      model: pending.model,
      tokensUsed,
      taskType: pending.taskType
    };

    this.recordExecution(execution);
    this.pendingExecutions.delete(executionId);
  }

  /**
   * Get metrics for specific agent
   */
  getAgentMetrics(agentName: string): AgentMetrics {
    // Check cache first
    const cached = this.metricsCache.get(agentName);
    if (cached) {
      return cached;
    }

    // Calculate metrics
    const agentExecutions = this.executions.filter(e => e.agentName === agentName);

    if (agentExecutions.length === 0) {
      const emptyMetrics: AgentMetrics = {
        agentName,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgDurationMs: 0,
        minDurationMs: 0,
        maxDurationMs: 0,
        p50DurationMs: 0,
        p95DurationMs: 0,
        totalTokensUsed: 0,
        modelDistribution: {},
        lastExecuted: 0
      };
      return emptyMetrics;
    }

    const successCount = agentExecutions.filter(e => e.success).length;
    const failureCount = agentExecutions.length - successCount;
    const durations = agentExecutions.map(e => e.durationMs).sort((a, b) => a - b);
    const totalTokens = agentExecutions.reduce((sum, e) => sum + (e.tokensUsed || 0), 0);

    // Calculate model distribution
    const modelDist: Record<string, number> = {};
    for (const exec of agentExecutions) {
      modelDist[exec.model] = (modelDist[exec.model] || 0) + 1;
    }

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);

    const metrics: AgentMetrics = {
      agentName,
      executionCount: agentExecutions.length,
      successCount,
      failureCount,
      successRate: successCount / agentExecutions.length,
      avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDurationMs: durations[0],
      maxDurationMs: durations[durations.length - 1],
      p50DurationMs: durations[p50Index],
      p95DurationMs: durations[p95Index],
      totalTokensUsed: totalTokens,
      modelDistribution: modelDist,
      lastExecuted: Math.max(...agentExecutions.map(e => e.endTime))
    };

    // Cache result
    this.metricsCache.set(agentName, metrics);
    return metrics;
  }

  /**
   * Get metrics for all agents
   */
  getAllMetrics(): AgentMetrics[] {
    const agentNames = new Set(this.executions.map(e => e.agentName));
    return Array.from(agentNames).map(name => this.getAgentMetrics(name));
  }

  /**
   * Get aggregate metrics across all agents
   */
  getAggregateMetrics(timeRangeMs?: number): AggregateMetrics {
    let filteredExecutions = this.executions;

    // Filter by time range if specified
    if (timeRangeMs) {
      const cutoff = Date.now() - timeRangeMs;
      filteredExecutions = this.executions.filter(e => e.startTime >= cutoff);
    }

    const totalExecutions = filteredExecutions.length;
    const totalSuccesses = filteredExecutions.filter(e => e.success).length;
    const totalFailures = totalExecutions - totalSuccesses;

    // Calculate average duration
    const avgDuration = filteredExecutions.length > 0
      ? filteredExecutions.reduce((sum, e) => sum + e.durationMs, 0) / filteredExecutions.length
      : 0;

    // Top agents by usage
    const usageCounts: Record<string, number> = {};
    for (const exec of filteredExecutions) {
      usageCounts[exec.agentName] = (usageCounts[exec.agentName] || 0) + 1;
    }
    const topByUsage = Object.entries(usageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top agents by duration
    const durationByAgent: Record<string, number[]> = {};
    for (const exec of filteredExecutions) {
      if (!durationByAgent[exec.agentName]) {
        durationByAgent[exec.agentName] = [];
      }
      durationByAgent[exec.agentName].push(exec.durationMs);
    }
    const topByDuration = Object.entries(durationByAgent)
      .map(([name, durations]) => ({
        name,
        avgMs: durations.reduce((a, b) => a + b, 0) / durations.length
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 10);

    // Failures by error type
    const failuresByError: Record<string, number> = {};
    for (const exec of filteredExecutions) {
      if (!exec.success && exec.errorType) {
        failuresByError[exec.errorType] = (failuresByError[exec.errorType] || 0) + 1;
      }
    }

    return {
      totalExecutions,
      totalSuccesses,
      totalFailures,
      overallSuccessRate: totalExecutions > 0 ? totalSuccesses / totalExecutions : 0,
      avgDurationMs: avgDuration,
      topAgentsByUsage: topByUsage,
      topAgentsByDuration: topByDuration,
      failuresByErrorType: failuresByError
    };
  }

  /**
   * Get metrics grouped by category (requires category mapping)
   */
  getMetricsByCategory(): Record<string, AggregateMetrics> {
    // This would require category information from agent registry
    // For now, return empty object
    // TODO: Integrate with agent registry for category mapping
    return {};
  }

  /**
   * Persist metrics to disk
   */
  persist(): void {
    if (!this.dirty) {
      return;
    }

    try {
      const metricsFile = path.join(this.storagePath, 'agent-executions.json');

      const data = {
        version: '7.4.0',
        timestamp: Date.now(),
        executionCount: this.executions.length,
        executions: this.executions
      };

      fs.writeFileSync(metricsFile, JSON.stringify(data, null, 2));
      this.dirty = false;
    } catch (error) {
      console.error('Failed to persist agent metrics:', error);
    }
  }

  /**
   * Load metrics from disk
   */
  restore(): void {
    try {
      const metricsFile = path.join(this.storagePath, 'agent-executions.json');

      if (!fs.existsSync(metricsFile)) {
        return;
      }

      const data = JSON.parse(fs.readFileSync(metricsFile, 'utf-8'));

      if (data.executions && Array.isArray(data.executions)) {
        this.executions = data.executions;
      }
    } catch (error) {
      console.error('Failed to restore agent metrics:', error);
    }
  }

  /**
   * Clean up old metrics (older than retentionDays)
   */
  cleanup(retentionDays: number): number {
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const before = this.executions.length;

    this.executions = this.executions.filter(e => e.startTime >= cutoff);

    const removed = before - this.executions.length;
    if (removed > 0) {
      this.dirty = true;
      this.metricsCache.clear();
      this.persist();
    }

    return removed;
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Get summary report for console output
   */
  getSummaryReport(): string {
    const aggregate = this.getAggregateMetrics();
    const allMetrics = this.getAllMetrics();

    const lines = [
      '=== Agent Metrics Summary ===',
      `Total Executions: ${aggregate.totalExecutions}`,
      `Success Rate: ${(aggregate.overallSuccessRate * 100).toFixed(1)}%`,
      `Avg Duration: ${aggregate.avgDurationMs.toFixed(0)}ms`,
      '',
      'Top 5 Agents by Usage:',
      ...aggregate.topAgentsByUsage.slice(0, 5).map(a => `  ${a.name}: ${a.count} executions`),
      '',
      'Top 5 Slowest Agents:',
      ...aggregate.topAgentsByDuration.slice(0, 5).map(a => `  ${a.name}: ${a.avgMs.toFixed(0)}ms avg`),
      ''
    ];

    if (Object.keys(aggregate.failuresByErrorType).length > 0) {
      lines.push('Failures by Type:');
      for (const [errorType, count] of Object.entries(aggregate.failuresByErrorType)) {
        lines.push(`  ${errorType}: ${count}`);
      }
    }

    return lines.join('\n');
  }
}
