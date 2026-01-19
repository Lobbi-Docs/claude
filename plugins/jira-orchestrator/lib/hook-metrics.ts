/**
 * Hook Metrics Collector
 *
 * Collects and aggregates execution metrics for hooks including:
 * - Execution counts
 * - Success/failure rates
 * - Timing statistics
 * - Timeout tracking
 *
 * @module hook-metrics
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

export interface HookMetrics {
  hookName: string;
  eventType: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  lastExecuted: number;
  firstExecuted: number;
}

export interface AggregateMetrics {
  totalExecutions: number;
  totalSuccess: number;
  totalFailures: number;
  totalTimeouts: number;
  successRate: number;
  avgDuration: number;
  hooks: Record<string, HookMetrics>;
}

interface ExecutionRecord {
  timestamp: number;
  durationMs: number;
  success: boolean;
  timedOut: boolean;
}

// ============================================================================
// Hook Metrics Collector Class
// ============================================================================

export class HookMetricsCollector {
  private metrics: Map<string, HookMetrics> = new Map();
  private executionHistory: Map<string, ExecutionRecord[]> = new Map();
  private metricsDir: string;
  private persistenceEnabled: boolean = true;
  private maxHistoryPerHook: number = 1000;

  constructor(metricsDir?: string, options: { persist?: boolean; maxHistory?: number } = {}) {
    this.metricsDir = metricsDir || path.join(
      process.env.CLAUDE_PLUGIN_ROOT || process.cwd(),
      'sessions',
      'metrics',
      'hooks'
    );

    this.persistenceEnabled = options.persist !== false;
    this.maxHistoryPerHook = options.maxHistory || 1000;

    this.ensureMetricsDirectory();
    this.loadPersistedMetrics();
  }

  /**
   * Ensure metrics directory exists
   */
  private ensureMetricsDirectory(): void {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  /**
   * Generate unique key for hook metrics
   */
  private getMetricsKey(hookName: string, eventType: string): string {
    return `${eventType}::${hookName}`;
  }

  /**
   * Record a hook execution
   *
   * @param hookName - Name of the executed hook
   * @param eventType - Event type that triggered the hook
   * @param durationMs - Execution duration in milliseconds
   * @param success - Whether execution was successful
   * @param timedOut - Whether execution timed out
   */
  public recordExecution(
    hookName: string,
    eventType: string,
    durationMs: number,
    success: boolean,
    timedOut: boolean = false
  ): void {
    const key = this.getMetricsKey(hookName, eventType);
    const now = Date.now();

    // Get or create metrics
    let metrics = this.metrics.get(key);
    if (!metrics) {
      metrics = {
        hookName,
        eventType,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        timeoutCount: 0,
        avgDurationMs: 0,
        minDurationMs: Infinity,
        maxDurationMs: 0,
        lastExecuted: now,
        firstExecuted: now,
      };
      this.metrics.set(key, metrics);
    }

    // Update counts
    metrics.executionCount++;
    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }
    if (timedOut) {
      metrics.timeoutCount++;
    }

    // Update timing statistics
    metrics.lastExecuted = now;
    metrics.minDurationMs = Math.min(metrics.minDurationMs, durationMs);
    metrics.maxDurationMs = Math.max(metrics.maxDurationMs, durationMs);

    // Recalculate average duration
    const history = this.executionHistory.get(key) || [];
    history.push({ timestamp: now, durationMs, success, timedOut });

    // Trim history if needed
    if (history.length > this.maxHistoryPerHook) {
      history.shift();
    }

    this.executionHistory.set(key, history);

    // Calculate average from history
    const totalDuration = history.reduce((sum, record) => sum + record.durationMs, 0);
    metrics.avgDurationMs = Math.round(totalDuration / history.length);

    // Persist if enabled
    if (this.persistenceEnabled) {
      this.persistMetrics(key, metrics);
    }
  }

  /**
   * Get metrics for a specific hook
   *
   * @param hookName - Name of the hook (optional)
   * @param eventType - Event type (optional)
   * @returns Array of matching metrics
   */
  public getMetrics(hookName?: string, eventType?: string): HookMetrics[] {
    const allMetrics = Array.from(this.metrics.values());

    if (!hookName && !eventType) {
      return allMetrics;
    }

    return allMetrics.filter(m => {
      if (hookName && m.hookName !== hookName) return false;
      if (eventType && m.eventType !== eventType) return false;
      return true;
    });
  }

  /**
   * Get aggregate metrics by event type
   *
   * @returns Metrics grouped by event type
   */
  public getAggregateByEventType(): Record<string, AggregateMetrics> {
    const aggregate: Record<string, AggregateMetrics> = {};

    for (const metrics of Array.from(this.metrics.values())) {
      if (!aggregate[metrics.eventType]) {
        aggregate[metrics.eventType] = {
          totalExecutions: 0,
          totalSuccess: 0,
          totalFailures: 0,
          totalTimeouts: 0,
          successRate: 0,
          avgDuration: 0,
          hooks: {},
        };
      }

      const agg = aggregate[metrics.eventType];
      agg.totalExecutions += metrics.executionCount;
      agg.totalSuccess += metrics.successCount;
      agg.totalFailures += metrics.failureCount;
      agg.totalTimeouts += metrics.timeoutCount;
      agg.hooks[metrics.hookName] = metrics;
    }

    // Calculate rates and averages
    for (const eventType in aggregate) {
      const agg = aggregate[eventType];
      agg.successRate = agg.totalExecutions > 0
        ? (agg.totalSuccess / agg.totalExecutions) * 100
        : 0;

      const durations = Object.values(agg.hooks).map(h => h.avgDurationMs);
      agg.avgDuration = durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : 0;
    }

    return aggregate;
  }

  /**
   * Get aggregate metrics by hook name
   *
   * @returns Metrics grouped by hook name (across all event types)
   */
  public getAggregateByHookName(): Record<string, AggregateMetrics> {
    const aggregate: Record<string, AggregateMetrics> = {};

    for (const metrics of Array.from(this.metrics.values())) {
      if (!aggregate[metrics.hookName]) {
        aggregate[metrics.hookName] = {
          totalExecutions: 0,
          totalSuccess: 0,
          totalFailures: 0,
          totalTimeouts: 0,
          successRate: 0,
          avgDuration: 0,
          hooks: {},
        };
      }

      const agg = aggregate[metrics.hookName];
      agg.totalExecutions += metrics.executionCount;
      agg.totalSuccess += metrics.successCount;
      agg.totalFailures += metrics.failureCount;
      agg.totalTimeouts += metrics.timeoutCount;
      agg.hooks[`${metrics.eventType}::${metrics.hookName}`] = metrics;
    }

    // Calculate rates and averages
    for (const hookName in aggregate) {
      const agg = aggregate[hookName];
      agg.successRate = agg.totalExecutions > 0
        ? (agg.totalSuccess / agg.totalExecutions) * 100
        : 0;

      const durations = Object.values(agg.hooks).map(h => h.avgDurationMs);
      agg.avgDuration = durations.length > 0
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : 0;
    }

    return aggregate;
  }

  /**
   * Get global aggregate metrics
   */
  public getGlobalAggregate(): AggregateMetrics {
    const aggregate: AggregateMetrics = {
      totalExecutions: 0,
      totalSuccess: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      successRate: 0,
      avgDuration: 0,
      hooks: {},
    };

    for (const metrics of Array.from(this.metrics.values())) {
      const key = this.getMetricsKey(metrics.hookName, metrics.eventType);
      aggregate.totalExecutions += metrics.executionCount;
      aggregate.totalSuccess += metrics.successCount;
      aggregate.totalFailures += metrics.failureCount;
      aggregate.totalTimeouts += metrics.timeoutCount;
      aggregate.hooks[key] = metrics;
    }

    aggregate.successRate = aggregate.totalExecutions > 0
      ? (aggregate.totalSuccess / aggregate.totalExecutions) * 100
      : 0;

    const durations = Array.from(this.metrics.values()).map(m => m.avgDurationMs);
    aggregate.avgDuration = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;

    return aggregate;
  }

  /**
   * Get execution history for a hook
   *
   * @param hookName - Hook name
   * @param eventType - Event type
   * @param limit - Maximum number of records to return
   * @returns Execution history records
   */
  public getExecutionHistory(
    hookName: string,
    eventType: string,
    limit?: number
  ): ExecutionRecord[] {
    const key = this.getMetricsKey(hookName, eventType);
    const history = this.executionHistory.get(key) || [];

    if (limit) {
      return history.slice(-limit);
    }

    return [...history];
  }

  /**
   * Persist metrics to disk
   */
  public persist(): void {
    const metricsPath = path.join(this.metricsDir, 'hook-metrics.json');
    const historyPath = path.join(this.metricsDir, 'execution-history.json');

    try {
      // Convert Maps to objects for JSON serialization
      const metricsObj: Record<string, HookMetrics> = {};
      for (const [key, value] of Array.from(this.metrics.entries())) {
        metricsObj[key] = value;
      }

      const historyObj: Record<string, ExecutionRecord[]> = {};
      for (const [key, value] of Array.from(this.executionHistory.entries())) {
        historyObj[key] = value;
      }

      fs.writeFileSync(metricsPath, JSON.stringify(metricsObj, null, 2), 'utf-8');
      fs.writeFileSync(historyPath, JSON.stringify(historyObj, null, 2), 'utf-8');
    } catch (error) {
      console.error('[HookMetrics] Failed to persist metrics:', error);
    }
  }

  /**
   * Persist individual hook metrics (called after each execution)
   */
  private persistMetrics(key: string, metrics: HookMetrics): void {
    const filePath = path.join(this.metricsDir, `${key.replace('::', '_')}.json`);
    try {
      fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2), 'utf-8');
    } catch (error) {
      console.error(`[HookMetrics] Failed to persist metrics for ${key}:`, error);
    }
  }

  /**
   * Load persisted metrics from disk
   */
  private loadPersistedMetrics(): void {
    const metricsPath = path.join(this.metricsDir, 'hook-metrics.json');
    const historyPath = path.join(this.metricsDir, 'execution-history.json');

    try {
      if (fs.existsSync(metricsPath)) {
        const content = fs.readFileSync(metricsPath, 'utf-8');
        const metricsObj: Record<string, HookMetrics> = JSON.parse(content);

        for (const [key, value] of Object.entries(metricsObj)) {
          this.metrics.set(key, value);
        }
      }

      if (fs.existsSync(historyPath)) {
        const content = fs.readFileSync(historyPath, 'utf-8');
        const historyObj: Record<string, ExecutionRecord[]> = JSON.parse(content);

        for (const [key, value] of Object.entries(historyObj)) {
          this.executionHistory.set(key, value);
        }
      }
    } catch (error) {
      console.error('[HookMetrics] Failed to load persisted metrics:', error);
    }
  }

  /**
   * Clear all metrics (in-memory and persisted)
   */
  public clear(): void {
    this.metrics.clear();
    this.executionHistory.clear();

    if (this.persistenceEnabled) {
      try {
        const files = fs.readdirSync(this.metricsDir);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            fs.unlinkSync(path.join(this.metricsDir, file));
          }
        });
      } catch (error) {
        console.error('[HookMetrics] Failed to clear persisted metrics:', error);
      }
    }
  }

  /**
   * Generate a metrics report
   */
  public generateReport(): string {
    const global = this.getGlobalAggregate();
    const byEvent = this.getAggregateByEventType();
    const byHook = this.getAggregateByHookName();

    let report = '# Hook Metrics Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += '## Global Statistics\n\n';
    report += `- Total Executions: ${global.totalExecutions}\n`;
    report += `- Success Rate: ${global.successRate.toFixed(2)}%\n`;
    report += `- Average Duration: ${global.avgDuration}ms\n`;
    report += `- Timeouts: ${global.totalTimeouts}\n\n`;

    report += '## Metrics by Event Type\n\n';
    for (const [eventType, metrics] of Object.entries(byEvent)) {
      report += `### ${eventType}\n\n`;
      report += `- Executions: ${metrics.totalExecutions}\n`;
      report += `- Success Rate: ${metrics.successRate.toFixed(2)}%\n`;
      report += `- Average Duration: ${metrics.avgDuration}ms\n\n`;
    }

    report += '## Metrics by Hook\n\n';
    for (const [hookName, metrics] of Object.entries(byHook)) {
      report += `### ${hookName}\n\n`;
      report += `- Executions: ${metrics.totalExecutions}\n`;
      report += `- Success Rate: ${metrics.successRate.toFixed(2)}%\n`;
      report += `- Average Duration: ${metrics.avgDuration}ms\n\n`;
    }

    return report;
  }
}

/**
 * Global singleton metrics collector
 */
let globalCollector: HookMetricsCollector | null = null;

/**
 * Get or create the global metrics collector
 */
export function getGlobalCollector(metricsDir?: string): HookMetricsCollector {
  if (!globalCollector) {
    globalCollector = new HookMetricsCollector(metricsDir);
  }
  return globalCollector;
}

/**
 * Reset the global collector (useful for testing)
 */
export function resetGlobalCollector(): void {
  globalCollector = null;
}
