# Telemetry Infrastructure

Comprehensive observability system for Golden Armada agent orchestration.

## Overview

The telemetry infrastructure provides:

- **Metrics Collection**: Track agent performance, tool usage, and system health
- **Distributed Tracing**: Follow execution flow across agent hierarchies
- **Multiple Export Formats**: Prometheus, JSON, OpenTelemetry Protocol (OTLP)
- **Dashboard Integration**: Pre-built Grafana dashboards
- **Time-Series Querying**: Flexible query engine for metrics analysis

## Quick Start

### Installation

The telemetry system is integrated into the orchestration infrastructure. No separate installation required.

### Basic Usage

```typescript
import { metricsCollector, traceContext } from '.claude/orchestration/telemetry';

// Track agent execution
metricsCollector.trackAgentExecution({
  agentId: 'coder-123',
  agentType: 'coder',
  duration: 5000, // milliseconds
  tokens: 1500,
  success: true,
  phase: 'code',
});

// Track tool usage
metricsCollector.trackToolUsage({
  tool: 'Read',
  duration: 250,
  success: true,
});

// Track context window usage
metricsCollector.trackContextUsage({
  used: 75000,
  total: 200000,
  agentId: 'coder-123',
});

// Start distributed tracing
const rootSpan = traceContext.startTrace('orchestration-session');
traceContext.setAttributes(rootSpan, {
  sessionId: 'session-123',
  coordinator: 'hierarchical',
});

// Create child span for sub-agent
const childSpan = traceContext.startSpan(rootSpan, 'coder-execution');
// ... execute agent work ...
traceContext.endSpan(childSpan);
traceContext.endSpan(rootSpan);
```

## Architecture

### Components

```
telemetry/
├── types.ts              # Type definitions
├── metrics-collector.ts  # Core metrics collection
├── trace-context.ts      # Distributed tracing
├── exporter.ts          # Export implementations
├── dashboard-data.ts    # Aggregation & queries
└── index.ts             # Public API
```

### Data Flow

```
┌─────────────┐
│   Agents    │
└──────┬──────┘
       │ Emit metrics/spans
       ▼
┌─────────────────────┐
│ MetricsCollector    │
│ TraceContext        │
└──────┬──────────────┘
       │ Periodic export
       ▼
┌─────────────────────┐
│    Exporters        │
│ - Prometheus        │
│ - JSON              │
│ - OpenTelemetry     │
└──────┬──────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  Database   │   │   Files     │
└──────┬──────┘   └─────────────┘
       │
       ▼
┌─────────────────────┐
│ DashboardData       │
│ Query Engine        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│    Grafana          │
│    Dashboards       │
└─────────────────────┘
```

## Pre-defined Metrics

### Agent Execution Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `agent_execution_total` | counter | `agent_type`, `phase`, `status` | Total agent executions |
| `agent_execution_duration_seconds` | histogram | `agent_type`, `phase` | Agent execution duration |
| `agent_tokens_used` | counter | `agent_type`, `model` | Tokens consumed |

### Tool Usage Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `tool_calls_total` | counter | `tool`, `status` | Total tool invocations |
| `tool_call_duration_seconds` | histogram | `tool` | Tool call duration |
| `tool_call_success_total` | counter | `tool` | Successful tool calls |
| `tool_call_failure_total` | counter | `tool`, `error_type` | Failed tool calls |

### Context Window Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `context_window_utilization` | gauge | `agent_id`, `session_id` | Context usage % |
| `context_window_size_tokens` | gauge | `agent_id` | Total window size |
| `context_window_used_tokens` | gauge | `agent_id` | Used tokens |

### Error Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `error_rate` | gauge | `component`, `error_type` | Errors per second |
| `error_total` | counter | `component`, `error_type`, `severity` | Total errors |

### Task Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `task_queue_size` | gauge | `priority` | Current queue size |
| `task_duration_seconds` | histogram | `task_type`, `status` | Task duration |
| `task_success_total` | counter | `task_type` | Successful tasks |
| `task_failure_total` | counter | `task_type`, `error_type` | Failed tasks |

## Exporters

### Prometheus Exporter

Exposes metrics in Prometheus text format at `/metrics` endpoint.

**Configuration:**
```json
{
  "prometheus": {
    "enabled": true,
    "port": 9090,
    "path": "/metrics"
  }
}
```

**Usage:**
```typescript
import { PrometheusExporter, metricsCollector } from '.claude/orchestration/telemetry';

const exporter = new PrometheusExporter({
  enabled: true,
  port: 9090,
  path: '/metrics',
});

// Export metrics
await exporter.export(metricsCollector.getAllMetrics());

// Get metrics endpoint content
const metricsText = exporter.getMetricsEndpoint();
```

### JSON Exporter

Exports metrics to local JSON files with automatic rotation.

**Configuration:**
```json
{
  "json": {
    "enabled": true,
    "outputDir": ".claude/orchestration/telemetry/exports",
    "rotateInterval": 3600000,
    "maxFiles": 24
  }
}
```

**Usage:**
```typescript
import { JSONExporter, metricsCollector } from '.claude/orchestration/telemetry';

const exporter = new JSONExporter({
  enabled: true,
  outputDir: '.claude/orchestration/telemetry/exports',
  rotateInterval: 3600000, // 1 hour
  maxFiles: 24,
});

await exporter.export(metricsCollector.getAllMetrics());
```

### OpenTelemetry Exporter

Exports metrics via OTLP protocol.

**Configuration:**
```json
{
  "opentelemetry": {
    "enabled": true,
    "endpoint": "http://localhost:4318/v1/metrics",
    "protocol": "http",
    "headers": {
      "Authorization": "Bearer <token>"
    }
  }
}
```

**Usage:**
```typescript
import { OpenTelemetryExporter, metricsCollector } from '.claude/orchestration/telemetry';

const exporter = new OpenTelemetryExporter({
  enabled: true,
  endpoint: 'http://localhost:4318/v1/metrics',
  protocol: 'http',
});

await exporter.export(metricsCollector.getAllMetrics());
```

## Distributed Tracing

### Span Lifecycle

```typescript
import { traceContext, SpanKind, SpanStatusCode } from '.claude/orchestration/telemetry';

// 1. Start root trace
const rootSpan = traceContext.startTrace('orchestration-session', SpanKind.SERVER);

// 2. Set attributes
traceContext.setAttributes(rootSpan, {
  sessionId: 'session-123',
  coordinator: 'hierarchical',
  totalAgents: 5,
});

// 3. Create child spans for sub-agents
const childSpan = traceContext.startSpan(rootSpan, 'coder-execution', SpanKind.INTERNAL);

// 4. Add events
traceContext.addEvent(childSpan, 'code_generation_started', {
  files: 3,
  language: 'typescript',
});

// 5. Handle errors
try {
  // ... agent work ...
} catch (error) {
  traceContext.recordError(childSpan, error);
}

// 6. End spans
traceContext.endSpan(childSpan, { code: SpanStatusCode.OK });
traceContext.endSpan(rootSpan, { code: SpanStatusCode.OK });

// 7. Export traces
const spans = traceContext.exportSpans(rootSpan.traceId);
```

### Propagating Context

```typescript
// Coordinator agent
const rootSpan = traceContext.startTrace('coordination');
const traceHeader = traceContext.propagate(rootSpan);

// Pass to sub-agent via environment or message
process.env.TRACE_CONTEXT = traceHeader;

// Sub-agent
const traceHeader = process.env.TRACE_CONTEXT;
const traceContextData = traceContext.extract(traceHeader);
const subSpan = traceContext.continueTrace(traceContextData, 'sub-agent-work');
```

## Dashboard Integration

### Grafana Setup

1. **Import Dashboard:**
   ```bash
   # Upload .claude/dashboards/overview.json to Grafana
   ```

2. **Configure Datasource:**
   - Type: Prometheus
   - URL: http://localhost:9090

3. **View Dashboard:**
   - Navigate to Dashboards → Browse
   - Open "Golden Armada - Agent Orchestration Overview"

### Dashboard Panels

The overview dashboard includes:

1. **Agent Execution Rate** - Executions per second by agent type
2. **Active Agents** - Current active agent count
3. **Error Rate** - Errors per second
4. **Total Tokens Used** - Cumulative token consumption
5. **Context Window Utilization** - Average context usage %
6. **Agent Execution Duration (p95)** - 95th percentile duration
7. **Tool Call Success Rate** - Success % by tool
8. **Top Tools by Usage** - Most frequently used tools
9. **Task Queue Size** - Queue depth by priority
10. **Error Breakdown by Type** - Error distribution
11. **Agent Execution Timeline** - Trace visualization

## Querying Metrics

### Basic Queries

```typescript
import { dashboardData, metricsCollector } from '.claude/orchestration/telemetry';

// Get all metrics for a specific metric name
const metrics = metricsCollector.getMetricsByName('agent_execution_total');

// Query with filtering
const result = dashboardData.query({
  metric: 'agent_execution_duration_seconds',
  labels: { agent_type: 'coder' },
  range: {
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date(),
  },
  aggregation: 'avg',
  interval: '5m',
}, metricsCollector.getAllMetrics());

// Calculate percentiles
const values = metrics.map(m => m.value);
const p95 = dashboardData.percentile(values.sort((a, b) => a - b), 0.95);

// Get summary statistics
const stats = dashboardData.summarize(metrics);
console.log(`Avg: ${stats.avg}, p95: ${stats.p95}, p99: ${stats.p99}`);
```

### Advanced Queries

```typescript
// Moving average
const movingAvg = dashboardData.movingAverage(metrics, 10);

// Detect anomalies
const anomalies = dashboardData.detectAnomalies(metrics, 3); // 3 std devs

// Calculate rate of change
const rate = dashboardData.calculateRate(metrics, '1m');

// Aggregate by time interval
const aggregated = dashboardData.aggregate(metrics, '5m');
```

## Database Schema

Telemetry data is stored in the orchestration database:

### Tables

- `telemetry_metrics` - Raw metric data points
- `telemetry_spans` - Distributed tracing spans
- `telemetry_span_events` - Events within spans
- `telemetry_aggregates` - Pre-aggregated metrics
- `telemetry_exports` - Export operation tracking

### Views

- `v_recent_metrics` - Latest metrics
- `v_agent_performance` - Agent performance summary
- `v_trace_summary` - Trace statistics
- `v_tool_usage` - Tool usage summary
- `v_context_utilization` - Context window stats
- `v_error_rate` - Error breakdown

See [telemetry.sql](../db/telemetry.sql) for complete schema.

## Slash Commands

Use `/telemetry` slash command for quick access:

```bash
# View status
/telemetry status

# View metrics
/telemetry metrics

# Export metrics
/telemetry export

# Query metrics
/telemetry query agent_execution_total --labels agent_type=coder

# View traces
/telemetry traces

# View statistics
/telemetry stats agent_execution_duration_seconds
```

See [telemetry.md](../../commands/telemetry.md) for complete command reference.

## Best Practices

### 1. Use Appropriate Metric Types

- **Counter**: Monotonically increasing values (executions, requests, errors)
- **Gauge**: Values that can go up or down (queue size, active agents)
- **Histogram**: Distribution of values (duration, size)
- **Summary**: Similar to histogram, but calculates quantiles client-side

### 2. Label Cardinality

Avoid high-cardinality labels (e.g., user IDs, timestamps). Use:
- `agent_type` instead of `agent_id`
- `error_type` instead of `error_message`

### 3. Naming Conventions

Follow Prometheus naming conventions:
- Use `snake_case`
- Include unit suffix (`_seconds`, `_bytes`, `_total`)
- Use descriptive names

### 4. Export Frequency

- Development: 30-60 seconds
- Production: 15-30 seconds
- Balance freshness vs. overhead

### 5. Retention

- Metrics: 30 days (configurable)
- Traces: 7 days (configurable)
- Aggregates: 90 days

### 6. Error Handling

Always wrap telemetry in try-catch to prevent telemetry failures from breaking agent execution:

```typescript
try {
  metricsCollector.trackAgentExecution(metrics);
} catch (error) {
  console.error('Telemetry error:', error);
  // Continue execution
}
```

## Troubleshooting

### Issue: Metrics not appearing

**Solution:**
1. Check telemetry is enabled in config
2. Verify metrics collector is being called
3. Check exporter configuration
4. Manually trigger export: `/telemetry export`

### Issue: High memory usage

**Solution:**
1. Reduce metric retention
2. Clear old metrics: `/telemetry clear metrics`
3. Increase export frequency
4. Reduce label cardinality

### Issue: Export failures

**Solution:**
1. Check exporter endpoint connectivity
2. Verify authentication credentials
3. Check exporter logs
4. Test with curl/Postman

### Issue: Dashboard not loading

**Solution:**
1. Verify Grafana datasource connection
2. Check Prometheus is scraping metrics
3. Verify dashboard JSON is valid
4. Check time range settings

## Examples

See working examples in:
- `examples/telemetry-basic.ts` - Basic usage
- `examples/telemetry-tracing.ts` - Distributed tracing
- `examples/telemetry-dashboard.ts` - Dashboard queries

## Performance

### Benchmarks

- Metric collection: ~0.1ms per metric
- Trace span creation: ~0.2ms per span
- Export (1000 metrics): ~50ms (Prometheus), ~100ms (JSON), ~200ms (OTLP)
- Query (1000 metrics): ~10ms

### Optimization

- Use batching for exports
- Pre-aggregate metrics where possible
- Use database indexes for queries
- Clear old data regularly

## Contributing

When adding new metrics:

1. Define in `types.ts` (`METRIC_NAMES`)
2. Add to `initializeDefaultMetrics()` in `metrics-collector.ts`
3. Update documentation
4. Add dashboard panel if relevant

## See Also

- [Orchestration System](../README.md)
- [Database Schema](../db/telemetry.sql)
- [Dashboard Configuration](../../dashboards/overview.json)
- [Telemetry Commands](../../commands/telemetry.md)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
