/**
 * Telemetry Type Definitions
 *
 * Comprehensive type system for metrics collection, tracing, and observability
 */

/**
 * Metric types following standard observability patterns
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric data structure
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels: Record<string, string>;
  unit?: string;
  description?: string;
}

/**
 * Metric definition for registration
 */
export interface MetricDefinition {
  name: string;
  type: MetricType;
  labels: string[];
  unit?: string;
  description?: string;
  buckets?: number[]; // For histograms
  quantiles?: number[]; // For summaries
}

/**
 * Pre-defined metric names
 */
export const METRIC_NAMES = {
  // Agent execution metrics
  AGENT_EXECUTION_TOTAL: 'agent_execution_total',
  AGENT_EXECUTION_DURATION: 'agent_execution_duration_seconds',
  AGENT_TOKENS_USED: 'agent_tokens_used',

  // Tool usage metrics
  TOOL_CALLS_TOTAL: 'tool_calls_total',
  TOOL_CALL_DURATION: 'tool_call_duration_seconds',
  TOOL_CALL_SUCCESS: 'tool_call_success_total',
  TOOL_CALL_FAILURE: 'tool_call_failure_total',

  // Context window metrics
  CONTEXT_WINDOW_UTILIZATION: 'context_window_utilization',
  CONTEXT_WINDOW_SIZE: 'context_window_size_tokens',
  CONTEXT_WINDOW_USED: 'context_window_used_tokens',

  // Error metrics
  ERROR_RATE: 'error_rate',
  ERROR_TOTAL: 'error_total',

  // Task metrics
  TASK_QUEUE_SIZE: 'task_queue_size',
  TASK_DURATION: 'task_duration_seconds',
  TASK_SUCCESS_TOTAL: 'task_success_total',
  TASK_FAILURE_TOTAL: 'task_failure_total',
} as const;

/**
 * Distributed tracing span
 */
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, any>;
  events: SpanEvent[];
  status: SpanStatus;
  kind: SpanKind;
}

/**
 * Span event for logging within a span
 */
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, any>;
}

/**
 * Span status
 */
export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

/**
 * Span status codes (OpenTelemetry compatible)
 */
export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

/**
 * Span kinds (OpenTelemetry compatible)
 */
export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

/**
 * Trace context for propagation
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
}

/**
 * Exporter interface
 */
export interface Exporter {
  export(metrics: Metric[]): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Aggregated metric for time-series data
 */
export interface AggregatedMetric {
  name: string;
  timestamp: number;
  value: number;
  count: number;
  min: number;
  max: number;
  avg: number;
  p50?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  labels: Record<string, string>;
}

/**
 * Time-series data point
 */
export interface TimeSeriesData {
  metric: string;
  labels: Record<string, string>;
  datapoints: Array<{
    timestamp: number;
    value: number;
  }>;
}

/**
 * Date range for queries
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Metric query structure
 */
export interface MetricQuery {
  metric: string;
  labels?: Record<string, string>;
  range?: DateRange;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  interval?: string; // e.g., '1m', '5m', '1h'
  groupBy?: string[];
}

/**
 * Query result
 */
export interface QueryResult {
  metric: string;
  labels: Record<string, string>;
  values: Array<{
    timestamp: number;
    value: number;
  }>;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  enabled: boolean;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  exportInterval: number; // milliseconds
  exporters: {
    prometheus?: PrometheusConfig;
    json?: JsonExporterConfig;
    opentelemetry?: OpenTelemetryConfig;
  };
}

/**
 * Prometheus exporter configuration
 */
export interface PrometheusConfig {
  enabled: boolean;
  port: number;
  path: string;
}

/**
 * JSON exporter configuration
 */
export interface JsonExporterConfig {
  enabled: boolean;
  outputDir: string;
  rotateInterval: number; // milliseconds
  maxFiles: number;
}

/**
 * OpenTelemetry exporter configuration
 */
export interface OpenTelemetryConfig {
  enabled: boolean;
  endpoint: string;
  protocol: 'grpc' | 'http';
  headers?: Record<string, string>;
}

/**
 * Agent execution metrics payload
 */
export interface AgentExecutionMetrics {
  agentId: string;
  agentType: string;
  duration: number; // milliseconds
  tokens: number;
  success: boolean;
  phase: string;
  error?: string;
}

/**
 * Tool usage metrics payload
 */
export interface ToolUsageMetrics {
  tool: string;
  duration: number; // milliseconds
  success: boolean;
  agentId?: string;
  error?: string;
}

/**
 * Context usage metrics payload
 */
export interface ContextUsageMetrics {
  used: number;
  total: number;
  agentId?: string;
  sessionId?: string;
}

/**
 * Dashboard panel configuration
 */
export interface DashboardPanel {
  id: number;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap';
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  targets: DashboardTarget[];
}

/**
 * Dashboard query target
 */
export interface DashboardTarget {
  expr: string;
  legendFormat?: string;
  refId: string;
}

/**
 * Complete dashboard definition
 */
export interface Dashboard {
  title: string;
  description: string;
  tags: string[];
  panels: DashboardPanel[];
  templating?: {
    list: DashboardVariable[];
  };
  time: {
    from: string;
    to: string;
  };
  refresh: string;
}

/**
 * Dashboard variable for templating
 */
export interface DashboardVariable {
  name: string;
  type: 'query' | 'custom' | 'interval';
  query?: string;
  options?: Array<{ text: string; value: string }>;
  current?: { text: string; value: string };
}
