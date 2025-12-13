/**
 * Telemetry Infrastructure
 *
 * Comprehensive observability system for Golden Armada agent orchestration
 *
 * Features:
 * - Metrics collection (counters, gauges, histograms, summaries)
 * - Distributed tracing (OpenTelemetry compatible)
 * - Multiple export formats (Prometheus, JSON, OTLP)
 * - Dashboard data aggregation
 * - Time-series querying
 *
 * @module telemetry
 */

// Core types
export * from './types';

// Metrics collection
export { MetricsCollector, metricsCollector } from './metrics-collector';

// Distributed tracing
export { TraceContext, traceContext } from './trace-context';

// Exporters
export {
  PrometheusExporter,
  JSONExporter,
  OpenTelemetryExporter,
  MultiExporter,
} from './exporter';

// Dashboard data
export { DashboardData, dashboardData } from './dashboard-data';

/**
 * Initialize telemetry system
 *
 * @example
 * ```typescript
 * import { initTelemetry } from '.claude/orchestration/telemetry';
 *
 * const telemetry = initTelemetry({
 *   enabled: true,
 *   metricsEnabled: true,
 *   tracingEnabled: true,
 *   exportInterval: 60000, // 1 minute
 *   exporters: {
 *     prometheus: {
 *       enabled: true,
 *       port: 9090,
 *       path: '/metrics',
 *     },
 *     json: {
 *       enabled: true,
 *       outputDir: '.claude/orchestration/telemetry/exports',
 *       rotateInterval: 3600000, // 1 hour
 *       maxFiles: 24,
 *     },
 *   },
 * });
 * ```
 */
export function initTelemetry(config: any) {
  // Implementation would initialize exporters and start collection
  return {
    metricsCollector,
    traceContext,
    dashboardData,
  };
}
