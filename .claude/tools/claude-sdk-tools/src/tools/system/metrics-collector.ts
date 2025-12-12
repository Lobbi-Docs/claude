/**
 * @claude-sdk/tools - MetricsCollectorTool
 * Collect and aggregate metrics with multiple metric types
 */

import { z } from 'zod';
import { success, failure } from '../../utils/index.js';
import { ConfigurationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const MetricsCollectorSchema = z.object({
  operation: z.enum(['record', 'query', 'export', 'clear', 'aggregate']),
  metricType: z.enum(['counter', 'gauge', 'histogram']).optional(),
  name: z.string().optional(),
  value: z.number().optional(),
  labels: z.record(z.string()).optional(),
  // Query options
  filterName: z.string().optional(),
  filterLabels: z.record(z.string()).optional(),
  // Aggregation options
  aggregationType: z.enum(['sum', 'avg', 'min', 'max', 'count', 'p50', 'p95', 'p99']).optional(),
  // Export options
  format: z.enum(['prometheus', 'json']).optional(),
});

export type MetricsCollectorInput = z.infer<typeof MetricsCollectorSchema>;

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

export interface AggregatedMetric {
  name: string;
  type: string;
  labels: Record<string, string>;
  aggregation: Record<string, number>;
}

export interface MetricsCollectorOutput {
  operation: string;
  recorded?: boolean;
  count?: number;
  metrics?: Metric[];
  aggregated?: AggregatedMetric[];
  exported?: string;
}

// ============================================================================
// MetricsCollectorTool Implementation
// ============================================================================

export class MetricsCollectorTool {
  private static metrics: Metric[] = [];

  /**
   * Execute metrics operations
   */
  static async execute(
    input: MetricsCollectorInput,
    context: ToolContext
  ): Promise<ToolResult<MetricsCollectorOutput>> {
    try {
      switch (input.operation) {
        case 'record':
          return this.record(input, context);
        case 'query':
          return this.query(input, context);
        case 'aggregate':
          return this.aggregate(input, context);
        case 'export':
          return this.exportMetrics(input, context);
        case 'clear':
          return this.clear(input, context);
        default:
          throw new ConfigurationError(
            `Unknown operation: ${input.operation}`,
            'operation',
            input.operation
          );
      }
    } catch (error) {
      context.logger?.error('MetricsCollector operation failed', error);
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Record a metric
   */
  private static async record(
    input: MetricsCollectorInput,
    context: ToolContext
  ): Promise<ToolResult<MetricsCollectorOutput>> {
    if (!input.metricType) {
      throw new ConfigurationError(
        'metricType is required for record operation',
        'metricType',
        undefined
      );
    }
    if (!input.name) {
      throw new ConfigurationError('name is required for record operation', 'name', undefined);
    }
    if (input.value === undefined) {
      throw new ConfigurationError('value is required for record operation', 'value', undefined);
    }

    const metric: Metric = {
      name: input.name,
      type: input.metricType,
      value: input.value,
      labels: input.labels ?? {},
      timestamp: new Date().toISOString(),
    };

    // For counters, add to existing value if metric with same name/labels exists
    if (input.metricType === 'counter') {
      const existing = this.findLatestMetric(input.name, input.labels);
      if (existing && existing.type === 'counter') {
        metric.value = existing.value + input.value;
      }
    }

    this.metrics.push(metric);

    context.logger?.debug(`MetricsCollector: Recorded ${input.metricType} ${input.name}`, {
      value: input.value,
    });

    return success({
      operation: 'record',
      recorded: true,
      count: this.metrics.length,
    });
  }

  /**
   * Query metrics
   */
  private static async query(
    input: MetricsCollectorInput,
    context: ToolContext
  ): Promise<ToolResult<MetricsCollectorOutput>> {
    let filtered = [...this.metrics];

    // Filter by name
    if (input.filterName) {
      filtered = filtered.filter((m) => m.name === input.filterName);
    }

    // Filter by labels
    if (input.filterLabels) {
      filtered = filtered.filter((m) => {
        return Object.entries(input.filterLabels!).every(
          ([key, value]) => m.labels[key] === value
        );
      });
    }

    context.logger?.debug(`MetricsCollector: Queried ${filtered.length} metrics`);

    return success({
      operation: 'query',
      count: filtered.length,
      metrics: filtered,
    });
  }

  /**
   * Aggregate metrics
   */
  private static async aggregate(
    input: MetricsCollectorInput,
    context: ToolContext
  ): Promise<ToolResult<MetricsCollectorOutput>> {
    const aggregationType = input.aggregationType ?? 'avg';

    // Group metrics by name and labels
    const groups = this.groupMetrics(input.filterName, input.filterLabels);

    const aggregated: AggregatedMetric[] = [];

    for (const [, metrics] of Array.from(groups.entries())) {
      if (metrics.length === 0) continue;

      const values = metrics.map((m) => m.value);
      const aggregation: Record<string, number> = {};

      // Calculate aggregations
      if (['sum', 'avg', 'count'].includes(aggregationType)) {
        const sum = values.reduce((a, b) => a + b, 0);
        aggregation.sum = sum;
        aggregation.count = values.length;
        aggregation.avg = sum / values.length;
      }

      if (['min', 'max'].includes(aggregationType)) {
        aggregation.min = Math.min(...values);
        aggregation.max = Math.max(...values);
      }

      if (['p50', 'p95', 'p99'].includes(aggregationType)) {
        const sorted = [...values].sort((a, b) => a - b);
        aggregation.p50 = this.percentile(sorted, 0.5);
        aggregation.p95 = this.percentile(sorted, 0.95);
        aggregation.p99 = this.percentile(sorted, 0.99);
      }

      // Include all aggregations
      const firstMetric = metrics[0];
      aggregated.push({
        name: firstMetric.name,
        type: firstMetric.type,
        labels: firstMetric.labels,
        aggregation,
      });
    }

    context.logger?.debug(`MetricsCollector: Aggregated ${aggregated.length} metric groups`);

    return success({
      operation: 'aggregate',
      count: aggregated.length,
      aggregated,
    });
  }

  /**
   * Export metrics in specified format
   */
  private static async exportMetrics(
    input: MetricsCollectorInput,
    context: ToolContext
  ): Promise<ToolResult<MetricsCollectorOutput>> {
    const format = input.format ?? 'json';
    let exported: string;

    if (format === 'prometheus') {
      exported = this.toPrometheusFormat();
    } else {
      exported = JSON.stringify(this.metrics, null, 2);
    }

    context.logger?.debug(`MetricsCollector: Exported ${this.metrics.length} metrics as ${format}`);

    return success({
      operation: 'export',
      count: this.metrics.length,
      exported,
    });
  }

  /**
   * Clear metrics
   */
  private static async clear(
    input: MetricsCollectorInput,
    context: ToolContext
  ): Promise<ToolResult<MetricsCollectorOutput>> {
    void input; // Mark as used
    const count = this.metrics.length;
    this.metrics = [];

    context.logger?.info(`MetricsCollector: Cleared ${count} metrics`);

    return success({
      operation: 'clear',
      count: 0,
    });
  }

  /**
   * Find latest metric matching name and labels
   */
  private static findLatestMetric(
    name: string,
    labels?: Record<string, string>
  ): Metric | undefined {
    const matches = this.metrics.filter((m) => {
      if (m.name !== name) return false;
      if (!labels) return true;
      return Object.entries(labels).every(([key, value]) => m.labels[key] === value);
    });

    return matches.length > 0 ? matches[matches.length - 1] : undefined;
  }

  /**
   * Group metrics by name and labels
   */
  private static groupMetrics(
    filterName?: string,
    filterLabels?: Record<string, string>
  ): Map<string, Metric[]> {
    const groups = new Map<string, Metric[]>();

    for (const metric of this.metrics) {
      // Apply filters
      if (filterName && metric.name !== filterName) continue;
      if (filterLabels) {
        const matches = Object.entries(filterLabels).every(
          ([labelKey, value]) => metric.labels[labelKey] === value
        );
        if (!matches) continue;
      }

      // Create group key from name and labels
      const labelStr = Object.entries(metric.labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join(',');
      const groupKey = `${metric.name}{${labelStr}}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(metric);
    }

    return groups;
  }

  /**
   * Calculate percentile from sorted array
   */
  private static percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];

    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Convert metrics to Prometheus exposition format
   */
  private static toPrometheusFormat(): string {
    const lines: string[] = [];
    const groups = this.groupMetrics();

    for (const [, metrics] of Array.from(groups.entries())) {
      if (metrics.length === 0) continue;

      const latest = metrics[metrics.length - 1];
      const labelStr =
        Object.keys(latest.labels).length > 0
          ? `{${Object.entries(latest.labels)
              .map(([k, v]) => `${k}="${v}"`)
              .join(',')}}`
          : '';

      // Add TYPE and HELP comments for first occurrence
      lines.push(`# TYPE ${latest.name} ${latest.type}`);
      lines.push(`# HELP ${latest.name} ${latest.name} metric`);

      // Add metric value
      if (latest.type === 'histogram') {
        // For histograms, output summary statistics
        const values = metrics.map((m) => m.value);
        const sorted = [...values].sort((a, b) => a - b);
        lines.push(`${latest.name}_sum${labelStr} ${values.reduce((a, b) => a + b, 0)}`);
        lines.push(`${latest.name}_count${labelStr} ${values.length}`);
        lines.push(
          `${latest.name}{${labelStr ? labelStr.slice(1, -1) + ',' : ''}quantile="0.5"} ${this.percentile(sorted, 0.5)}`
        );
        lines.push(
          `${latest.name}{${labelStr ? labelStr.slice(1, -1) + ',' : ''}quantile="0.95"} ${this.percentile(sorted, 0.95)}`
        );
        lines.push(
          `${latest.name}{${labelStr ? labelStr.slice(1, -1) + ',' : ''}quantile="0.99"} ${this.percentile(sorted, 0.99)}`
        );
      } else {
        lines.push(`${latest.name}${labelStr} ${latest.value}`);
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Get metrics count
   */
  static getMetricsCount(): number {
    return this.metrics.length;
  }
}
