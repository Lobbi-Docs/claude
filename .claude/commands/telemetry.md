# Telemetry Commands

Manage and monitor agent orchestration telemetry

## Usage

```bash
/telemetry <command> [options]
```

## Commands

### Status

View current telemetry system status

```bash
/telemetry status
```

**Output:**
- Telemetry enabled/disabled
- Active exporters
- Metrics count
- Active traces
- Last export time

### Metrics

View current metrics summary

```bash
/telemetry metrics [metric_name]
```

**Options:**
- `metric_name` - Filter by specific metric (optional)

**Examples:**
```bash
# View all metrics
/telemetry metrics

# View specific metric
/telemetry metrics agent_execution_total
```

**Output:**
- Metric name
- Current value
- Type (counter/gauge/histogram/summary)
- Labels
- Last updated

### Export

Manually trigger metrics export

```bash
/telemetry export [exporter_type]
```

**Options:**
- `exporter_type` - prometheus, json, opentelemetry (default: all)

**Examples:**
```bash
# Export to all configured exporters
/telemetry export

# Export only to Prometheus
/telemetry export prometheus
```

### Dashboard

Display dashboard URL or open dashboard data

```bash
/telemetry dashboard [panel_id]
```

**Options:**
- `panel_id` - Specific dashboard panel to view (optional)

**Examples:**
```bash
# View dashboard overview
/telemetry dashboard

# View specific panel
/telemetry dashboard 1
```

### Query

Query metrics with filtering and aggregation

```bash
/telemetry query <metric_name> [options]
```

**Options:**
- `--labels key=value` - Filter by labels
- `--range <duration>` - Time range (e.g., 1h, 24h, 7d)
- `--aggregation <type>` - sum, avg, min, max, count
- `--interval <duration>` - Bucket interval (e.g., 1m, 5m, 1h)
- `--group-by <label>` - Group results by label

**Examples:**
```bash
# Query agent execution duration for last hour
/telemetry query agent_execution_duration_seconds --range 1h

# Query with aggregation
/telemetry query tool_calls_total --aggregation sum --interval 5m

# Query with label filtering
/telemetry query agent_execution_total --labels agent_type=coder,status=success

# Query with grouping
/telemetry query agent_tokens_used --group-by agent_type --aggregation sum
```

### Traces

View distributed tracing information

```bash
/telemetry traces [trace_id]
```

**Options:**
- `trace_id` - Specific trace ID to view (optional)

**Examples:**
```bash
# List recent traces
/telemetry traces

# View specific trace
/telemetry traces abc123def456
```

**Output:**
- Trace ID
- Total spans
- Duration
- Status
- Error count

### Clear

Clear metrics or traces

```bash
/telemetry clear <target>
```

**Options:**
- `target` - metrics, traces, all

**Examples:**
```bash
# Clear all metrics
/telemetry clear metrics

# Clear all traces
/telemetry clear traces

# Clear everything
/telemetry clear all
```

**Warning:** This is destructive and cannot be undone.

### Stats

Display telemetry statistics

```bash
/telemetry stats [metric_name]
```

**Options:**
- `metric_name` - Specific metric to analyze (optional)

**Examples:**
```bash
# Overall statistics
/telemetry stats

# Specific metric statistics
/telemetry stats agent_execution_duration_seconds
```

**Output:**
- Count
- Sum
- Min/Max
- Average
- Standard deviation
- Percentiles (p50, p90, p95, p99)

### Config

View or update telemetry configuration

```bash
/telemetry config [key] [value]
```

**Examples:**
```bash
# View current config
/telemetry config

# Update config value
/telemetry config exportInterval 60000
```

## Configuration

Telemetry is configured in `.claude/orchestration/config.json`:

```json
{
  "telemetry": {
    "enabled": true,
    "metricsEnabled": true,
    "tracingEnabled": true,
    "exportInterval": 60000,
    "exporters": {
      "prometheus": {
        "enabled": true,
        "port": 9090,
        "path": "/metrics"
      },
      "json": {
        "enabled": true,
        "outputDir": ".claude/orchestration/telemetry/exports",
        "rotateInterval": 3600000,
        "maxFiles": 24
      },
      "opentelemetry": {
        "enabled": false,
        "endpoint": "http://localhost:4318/v1/metrics",
        "protocol": "http"
      }
    }
  }
}
```

## Pre-defined Metrics

### Agent Metrics
- `agent_execution_total` - Total agent executions (counter)
- `agent_execution_duration_seconds` - Agent execution duration (histogram)
- `agent_tokens_used` - Tokens consumed by agents (counter)

### Tool Metrics
- `tool_calls_total` - Total tool invocations (counter)
- `tool_call_duration_seconds` - Tool call duration (histogram)
- `tool_call_success_total` - Successful tool calls (counter)
- `tool_call_failure_total` - Failed tool calls (counter)

### Context Metrics
- `context_window_utilization` - Context window usage % (gauge)
- `context_window_size_tokens` - Total context window size (gauge)
- `context_window_used_tokens` - Used context tokens (gauge)

### Error Metrics
- `error_rate` - Errors per second (gauge)
- `error_total` - Total errors (counter)

### Task Metrics
- `task_queue_size` - Current queue size (gauge)
- `task_duration_seconds` - Task execution duration (histogram)
- `task_success_total` - Successful tasks (counter)
- `task_failure_total` - Failed tasks (counter)

## Integration

### Prometheus

Access metrics endpoint:
```
http://localhost:9090/metrics
```

Configure Prometheus scrape config:
```yaml
scrape_configs:
  - job_name: 'golden-armada'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 30s
```

### Grafana

Import dashboard:
1. Open Grafana
2. Go to Dashboards → Import
3. Upload `.claude/dashboards/overview.json`
4. Select Prometheus datasource
5. Click Import

### OpenTelemetry Collector

Configure OTLP exporter:
```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      exporters: [prometheus]
```

## Troubleshooting

### Metrics not appearing

1. Check telemetry is enabled:
   ```bash
   /telemetry status
   ```

2. Verify exporters are configured:
   ```bash
   /telemetry config
   ```

3. Manually trigger export:
   ```bash
   /telemetry export
   ```

### High memory usage

Clear old metrics:
```bash
/telemetry clear metrics
```

Adjust retention in configuration.

### Export failures

Check exporter logs and endpoint connectivity:
```bash
/telemetry export prometheus
```

## See Also

- [Telemetry README](../.claude/orchestration/telemetry/README.md)
- [Dashboard Configuration](../.claude/dashboards/overview.json)
- [Orchestration Config](../.claude/orchestration/config.json)
