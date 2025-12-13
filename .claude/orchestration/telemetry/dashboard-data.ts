/**
 * Dashboard Data Aggregation
 *
 * Provides aggregation, querying, and time-series data processing
 * for dashboard visualization
 */

import {
  Metric,
  AggregatedMetric,
  TimeSeriesData,
  DateRange,
  MetricQuery,
  QueryResult,
} from './types';

/**
 * DashboardData class
 *
 * Handles metric aggregation and querying for dashboard consumption
 */
export class DashboardData {
  /**
   * Aggregate metrics over a time interval
   */
  aggregate(metrics: Metric[], interval: string): AggregatedMetric[] {
    const intervalMs = this.parseInterval(interval);
    const buckets = this.createTimeBuckets(metrics, intervalMs);

    const aggregated: AggregatedMetric[] = [];

    for (const [bucketTime, bucketMetrics] of buckets.entries()) {
      const byNameAndLabels = this.groupByNameAndLabels(bucketMetrics);

      for (const [key, metricsList] of byNameAndLabels.entries()) {
        const [name, labelsJson] = key.split('::');
        const labels = JSON.parse(labelsJson);

        const values = metricsList.map((m) => m.value);
        const sortedValues = [...values].sort((a, b) => a - b);

        aggregated.push({
          name,
          timestamp: bucketTime,
          value: values[values.length - 1] || 0, // Latest value
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          p50: this.percentile(sortedValues, 0.5),
          p90: this.percentile(sortedValues, 0.9),
          p95: this.percentile(sortedValues, 0.95),
          p99: this.percentile(sortedValues, 0.99),
          labels,
        });
      }
    }

    return aggregated.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate percentile from sorted values
   */
  percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    if (p <= 0) return sortedValues[0];
    if (p >= 1) return sortedValues[sortedValues.length - 1];

    const index = (sortedValues.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Generate time-series data for a specific metric
   */
  timeSeries(metric: string, range: DateRange, interval: string, labels?: Record<string, string>): TimeSeriesData[] {
    // This would typically query from a database
    // For now, returning a placeholder structure
    return [{
      metric,
      labels: labels || {},
      datapoints: [],
    }];
  }

  /**
   * Execute a custom metric query
   */
  query(q: MetricQuery, metrics: Metric[]): QueryResult[] {
    let filtered = metrics.filter((m) => m.name === q.metric);

    // Filter by labels
    if (q.labels) {
      filtered = filtered.filter((m) => {
        for (const [key, value] of Object.entries(q.labels!)) {
          if (m.labels[key] !== value) return false;
        }
        return true;
      });
    }

    // Filter by time range
    if (q.range) {
      const start = q.range.start.getTime();
      const end = q.range.end.getTime();
      filtered = filtered.filter((m) => m.timestamp >= start && m.timestamp <= end);
    }

    // Group by labels if specified
    if (q.groupBy && q.groupBy.length > 0) {
      return this.groupAndAggregate(filtered, q.groupBy, q.aggregation || 'avg', q.interval);
    }

    // Single result with aggregation
    if (q.aggregation) {
      const value = this.applyAggregation(filtered.map((m) => m.value), q.aggregation);
      return [{
        metric: q.metric,
        labels: q.labels || {},
        values: [{
          timestamp: Date.now(),
          value,
        }],
      }];
    }

    // Return all matching metrics
    const labelsSet = new Set<string>();
    const results: QueryResult[] = [];

    for (const metric of filtered) {
      const labelsKey = JSON.stringify(metric.labels);
      if (!labelsSet.has(labelsKey)) {
        labelsSet.add(labelsKey);
        results.push({
          metric: q.metric,
          labels: metric.labels,
          values: filtered
            .filter((m) => JSON.stringify(m.labels) === labelsKey)
            .map((m) => ({
              timestamp: m.timestamp,
              value: m.value,
            })),
        });
      }
    }

    return results;
  }

  /**
   * Group metrics and apply aggregation
   */
  private groupAndAggregate(
    metrics: Metric[],
    groupBy: string[],
    aggregation: string,
    interval?: string
  ): QueryResult[] {
    const intervalMs = interval ? this.parseInterval(interval) : null;
    const grouped = new Map<string, Metric[]>();

    for (const metric of metrics) {
      const groupKey = groupBy.map((key) => metric.labels[key] || '').join('::');
      const existing = grouped.get(groupKey) || [];
      existing.push(metric);
      grouped.set(groupKey, existing);
    }

    const results: QueryResult[] = [];

    for (const [groupKey, metricsList] of grouped.entries()) {
      const labels: Record<string, string> = {};
      const keyParts = groupKey.split('::');
      groupBy.forEach((key, i) => {
        labels[key] = keyParts[i] || '';
      });

      let values: Array<{ timestamp: number; value: number }>;

      if (intervalMs) {
        // Time-bucketed aggregation
        const buckets = this.createTimeBuckets(metricsList, intervalMs);
        values = Array.from(buckets.entries()).map(([time, bucketMetrics]) => ({
          timestamp: time,
          value: this.applyAggregation(bucketMetrics.map((m) => m.value), aggregation),
        }));
      } else {
        // Single aggregated value
        values = [{
          timestamp: Date.now(),
          value: this.applyAggregation(metricsList.map((m) => m.value), aggregation),
        }];
      }

      results.push({
        metric: metricsList[0]?.name || '',
        labels,
        values,
      });
    }

    return results;
  }

  /**
   * Apply aggregation function to values
   */
  private applyAggregation(values: number[], aggregation: string): number {
    if (values.length === 0) return 0;

    switch (aggregation) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return values[values.length - 1] || 0;
    }
  }

  /**
   * Create time buckets for metrics
   */
  private createTimeBuckets(metrics: Metric[], intervalMs: number): Map<number, Metric[]> {
    const buckets = new Map<number, Metric[]>();

    for (const metric of metrics) {
      const bucketTime = Math.floor(metric.timestamp / intervalMs) * intervalMs;
      const existing = buckets.get(bucketTime) || [];
      existing.push(metric);
      buckets.set(bucketTime, existing);
    }

    return buckets;
  }

  /**
   * Group metrics by name and labels
   */
  private groupByNameAndLabels(metrics: Metric[]): Map<string, Metric[]> {
    const grouped = new Map<string, Metric[]>();

    for (const metric of metrics) {
      const key = `${metric.name}::${JSON.stringify(metric.labels)}`;
      const existing = grouped.get(key) || [];
      existing.push(metric);
      grouped.set(key, existing);
    }

    return grouped;
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)(ms|s|m|h|d)$/);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  /**
   * Calculate rate of change over time
   */
  calculateRate(metrics: Metric[], interval: string): number {
    if (metrics.length < 2) return 0;

    const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const valueDiff = last.value - first.value;

    const intervalSeconds = this.parseInterval(interval) / 1000;
    return (valueDiff / timeDiff) * intervalSeconds;
  }

  /**
   * Calculate moving average
   */
  movingAverage(metrics: Metric[], windowSize: number): Array<{ timestamp: number; value: number }> {
    if (metrics.length < windowSize) return [];

    const sorted = [...metrics].sort((a, b) => a.timestamp - b.timestamp);
    const result: Array<{ timestamp: number; value: number }> = [];

    for (let i = windowSize - 1; i < sorted.length; i++) {
      const window = sorted.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((sum, m) => sum + m.value, 0) / windowSize;
      result.push({
        timestamp: sorted[i].timestamp,
        value: avg,
      });
    }

    return result;
  }

  /**
   * Detect anomalies using standard deviation
   */
  detectAnomalies(metrics: Metric[], threshold: number = 3): Metric[] {
    if (metrics.length < 2) return [];

    const values = metrics.map((m) => m.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return metrics.filter((m) => Math.abs(m.value - mean) > threshold * stdDev);
  }

  /**
   * Get summary statistics
   */
  summarize(metrics: Metric[]): {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    stdDev: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  } {
    if (metrics.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
        stdDev: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
      };
    }

    const values = metrics.map((m) => m.value);
    const sortedValues = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;

    return {
      count: metrics.length,
      sum,
      min: Math.min(...values),
      max: Math.max(...values),
      avg,
      stdDev: Math.sqrt(variance),
      p50: this.percentile(sortedValues, 0.5),
      p90: this.percentile(sortedValues, 0.9),
      p95: this.percentile(sortedValues, 0.95),
      p99: this.percentile(sortedValues, 0.99),
    };
  }
}

// Singleton instance
export const dashboardData = new DashboardData();
