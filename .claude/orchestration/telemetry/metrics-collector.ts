/**
 * Metrics Collector
 *
 * Core metrics collection system for agent orchestration telemetry
 */

import {
  Metric,
  MetricType,
  MetricDefinition,
  AgentExecutionMetrics,
  ToolUsageMetrics,
  ContextUsageMetrics,
  METRIC_NAMES,
} from './types';

/**
 * MetricsCollector class
 *
 * Provides a comprehensive metrics collection API for tracking
 * agent performance, tool usage, and system health
 */
export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();
  private readonly maxMetricsPerName = 10000; // Prevent memory overflow

  constructor() {
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize pre-defined metrics
   */
  private initializeDefaultMetrics(): void {
    // Agent execution metrics
    this.defineMetric(METRIC_NAMES.AGENT_EXECUTION_TOTAL, 'counter', ['agent_type', 'phase', 'status']);
    this.defineMetric(
      METRIC_NAMES.AGENT_EXECUTION_DURATION,
      'histogram',
      ['agent_type', 'phase'],
      'seconds',
      'Agent execution duration in seconds',
      [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300] // buckets in seconds
    );
    this.defineMetric(METRIC_NAMES.AGENT_TOKENS_USED, 'counter', ['agent_type', 'model']);

    // Tool usage metrics
    this.defineMetric(METRIC_NAMES.TOOL_CALLS_TOTAL, 'counter', ['tool', 'status']);
    this.defineMetric(
      METRIC_NAMES.TOOL_CALL_DURATION,
      'histogram',
      ['tool'],
      'seconds',
      'Tool call duration in seconds',
      [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10] // buckets in seconds
    );
    this.defineMetric(METRIC_NAMES.TOOL_CALL_SUCCESS, 'counter', ['tool']);
    this.defineMetric(METRIC_NAMES.TOOL_CALL_FAILURE, 'counter', ['tool', 'error_type']);

    // Context window metrics
    this.defineMetric(METRIC_NAMES.CONTEXT_WINDOW_UTILIZATION, 'gauge', ['agent_id', 'session_id'], 'percent');
    this.defineMetric(METRIC_NAMES.CONTEXT_WINDOW_SIZE, 'gauge', ['agent_id'], 'tokens');
    this.defineMetric(METRIC_NAMES.CONTEXT_WINDOW_USED, 'gauge', ['agent_id'], 'tokens');

    // Error metrics
    this.defineMetric(METRIC_NAMES.ERROR_RATE, 'gauge', ['component', 'error_type'], 'errors_per_second');
    this.defineMetric(METRIC_NAMES.ERROR_TOTAL, 'counter', ['component', 'error_type', 'severity']);

    // Task metrics
    this.defineMetric(METRIC_NAMES.TASK_QUEUE_SIZE, 'gauge', ['priority']);
    this.defineMetric(
      METRIC_NAMES.TASK_DURATION,
      'histogram',
      ['task_type', 'status'],
      'seconds',
      'Task execution duration',
      [1, 5, 10, 30, 60, 120, 300, 600] // buckets in seconds
    );
    this.defineMetric(METRIC_NAMES.TASK_SUCCESS_TOTAL, 'counter', ['task_type']);
    this.defineMetric(METRIC_NAMES.TASK_FAILURE_TOTAL, 'counter', ['task_type', 'error_type']);
  }

  /**
   * Define a new metric
   */
  defineMetric(
    name: string,
    type: MetricType,
    labels: string[],
    unit?: string,
    description?: string,
    buckets?: number[],
    quantiles?: number[]
  ): void {
    this.definitions.set(name, {
      name,
      type,
      labels,
      unit,
      description,
      buckets,
      quantiles,
    });
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    this.recordMetric(name, 'counter', value, labels);
  }

  /**
   * Set a gauge metric
   */
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    this.recordMetric(name, 'gauge', value, labels);
  }

  /**
   * Observe a histogram or summary metric
   */
  observe(name: string, value: number, labels: Record<string, string> = {}): void {
    const def = this.definitions.get(name);
    if (!def) {
      throw new Error(`Metric ${name} not defined`);
    }
    if (def.type !== 'histogram' && def.type !== 'summary') {
      throw new Error(`Metric ${name} is not a histogram or summary`);
    }
    this.recordMetric(name, def.type, value, labels);
  }

  /**
   * Track agent execution metrics
   */
  trackAgentExecution(metrics: AgentExecutionMetrics): void {
    const { agentId, agentType, duration, tokens, success, phase, error } = metrics;

    // Increment execution counter
    this.increment(METRIC_NAMES.AGENT_EXECUTION_TOTAL, {
      agent_type: agentType,
      phase,
      status: success ? 'success' : 'failure',
    });

    // Record execution duration
    this.observe(METRIC_NAMES.AGENT_EXECUTION_DURATION, duration / 1000, {
      agent_type: agentType,
      phase,
    });

    // Record tokens used
    this.increment(METRIC_NAMES.AGENT_TOKENS_USED, {
      agent_type: agentType,
      model: 'sonnet', // TODO: extract from agent metadata
    }, tokens);

    // Record error if failure
    if (!success && error) {
      this.increment(METRIC_NAMES.ERROR_TOTAL, {
        component: 'agent',
        error_type: error,
        severity: 'error',
      });
    }
  }

  /**
   * Track tool usage metrics
   */
  trackToolUsage(metrics: ToolUsageMetrics): void {
    const { tool, duration, success, error } = metrics;

    // Increment tool call counter
    this.increment(METRIC_NAMES.TOOL_CALLS_TOTAL, {
      tool,
      status: success ? 'success' : 'failure',
    });

    // Record tool call duration
    this.observe(METRIC_NAMES.TOOL_CALL_DURATION, duration / 1000, { tool });

    // Track success/failure
    if (success) {
      this.increment(METRIC_NAMES.TOOL_CALL_SUCCESS, { tool });
    } else {
      this.increment(METRIC_NAMES.TOOL_CALL_FAILURE, {
        tool,
        error_type: error || 'unknown',
      });
    }
  }

  /**
   * Track context window usage
   */
  trackContextUsage(metrics: ContextUsageMetrics): void {
    const { used, total, agentId, sessionId } = metrics;
    const utilization = (used / total) * 100;

    const labels: Record<string, string> = {};
    if (agentId) labels.agent_id = agentId;
    if (sessionId) labels.session_id = sessionId;

    this.gauge(METRIC_NAMES.CONTEXT_WINDOW_UTILIZATION, utilization, labels);
    this.gauge(METRIC_NAMES.CONTEXT_WINDOW_SIZE, total, agentId ? { agent_id: agentId } : {});
    this.gauge(METRIC_NAMES.CONTEXT_WINDOW_USED, used, agentId ? { agent_id: agentId } : {});
  }

  /**
   * Internal method to record a metric
   */
  private recordMetric(
    name: string,
    type: MetricType,
    value: number,
    labels: Record<string, string>
  ): void {
    const metric: Metric = {
      name,
      type,
      value,
      timestamp: Date.now(),
      labels,
    };

    const def = this.definitions.get(name);
    if (def) {
      metric.unit = def.unit;
      metric.description = def.description;
    }

    // Get or create metrics array
    let metricsArray = this.metrics.get(name);
    if (!metricsArray) {
      metricsArray = [];
      this.metrics.set(name, metricsArray);
    }

    // Add metric and enforce size limit
    metricsArray.push(metric);
    if (metricsArray.length > this.maxMetricsPerName) {
      metricsArray.shift(); // Remove oldest
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    const allMetrics: Metric[] = [];
    for (const metricsArray of this.metrics.values()) {
      allMetrics.push(...metricsArray);
    }
    return allMetrics;
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): Metric[] {
    return this.metrics.get(name) || [];
  }

  /**
   * Get metric definition
   */
  getDefinition(name: string): MetricDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * Get all metric definitions
   */
  getAllDefinitions(): MetricDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * Clear all metrics (useful for testing or reset)
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Clear metrics by name
   */
  clearMetric(name: string): void {
    this.metrics.delete(name);
  }

  /**
   * Get metrics count
   */
  getMetricsCount(): number {
    let count = 0;
    for (const metricsArray of this.metrics.values()) {
      count += metricsArray.length;
    }
    return count;
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();
