-- Telemetry Database Schema
-- Extends the agent orchestration database with telemetry tables

-- ============================================
-- TELEMETRY_METRICS TABLE
-- Store raw metric data points
-- ============================================
CREATE TABLE IF NOT EXISTS telemetry_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metric_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,  -- counter, gauge, histogram, summary
    metric_value REAL NOT NULL,
    labels TEXT,  -- JSON key-value pairs
    unit TEXT,
    description TEXT,
    agent_id TEXT,
    session_id TEXT,
    task_id TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_metrics_name ON telemetry_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_metrics_timestamp ON telemetry_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_metrics_type ON telemetry_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_metrics_agent ON telemetry_metrics(agent_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_metrics_session ON telemetry_metrics(session_id);

-- ============================================
-- TELEMETRY_SPANS TABLE
-- Store distributed tracing spans
-- ============================================
CREATE TABLE IF NOT EXISTS telemetry_spans (
    span_id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL,
    parent_span_id TEXT,
    name TEXT NOT NULL,
    kind INTEGER DEFAULT 0,  -- 0=INTERNAL, 1=SERVER, 2=CLIENT, 3=PRODUCER, 4=CONSUMER
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status_code INTEGER DEFAULT 0,  -- 0=UNSET, 1=OK, 2=ERROR
    status_message TEXT,
    attributes TEXT,  -- JSON attributes
    agent_id TEXT,
    session_id TEXT,
    task_id TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_spans_trace ON telemetry_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_spans_parent ON telemetry_spans(parent_span_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_spans_start ON telemetry_spans(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_spans_agent ON telemetry_spans(agent_id);

-- ============================================
-- TELEMETRY_SPAN_EVENTS TABLE
-- Store events within spans
-- ============================================
CREATE TABLE IF NOT EXISTS telemetry_span_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    span_id TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    name TEXT NOT NULL,
    attributes TEXT,  -- JSON attributes
    FOREIGN KEY (span_id) REFERENCES telemetry_spans(span_id)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_span_events_span ON telemetry_span_events(span_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_span_events_timestamp ON telemetry_span_events(timestamp DESC);

-- ============================================
-- TELEMETRY_AGGREGATES TABLE
-- Store pre-aggregated metrics for faster queries
-- ============================================
CREATE TABLE IF NOT EXISTS telemetry_aggregates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    interval TEXT NOT NULL,  -- 1m, 5m, 1h, 1d
    labels TEXT,  -- JSON key-value pairs
    count INTEGER DEFAULT 0,
    sum REAL DEFAULT 0,
    min REAL,
    max REAL,
    avg REAL,
    p50 REAL,
    p90 REAL,
    p95 REAL,
    p99 REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_aggregates_name ON telemetry_aggregates(metric_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_aggregates_timestamp ON telemetry_aggregates(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_aggregates_interval ON telemetry_aggregates(interval);

-- ============================================
-- TELEMETRY_EXPORTS TABLE
-- Track export operations
-- ============================================
CREATE TABLE IF NOT EXISTS telemetry_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    export_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exporter_type TEXT NOT NULL,  -- prometheus, json, opentelemetry
    metrics_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'success',  -- success, failed
    error TEXT,
    duration_ms INTEGER,
    file_path TEXT  -- For file-based exporters
);

CREATE INDEX IF NOT EXISTS idx_telemetry_exports_time ON telemetry_exports(export_time DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_exports_type ON telemetry_exports(exporter_type);

-- ============================================
-- VIEWS FOR TELEMETRY QUERIES
-- ============================================

-- Recent metrics by name
CREATE VIEW IF NOT EXISTS v_recent_metrics AS
SELECT
    metric_name,
    metric_type,
    metric_value,
    labels,
    timestamp,
    agent_id,
    session_id
FROM telemetry_metrics
ORDER BY timestamp DESC
LIMIT 1000;

-- Agent performance summary
CREATE VIEW IF NOT EXISTS v_agent_performance AS
SELECT
    a.name as agent_name,
    a.type as agent_type,
    COUNT(DISTINCT tm.id) as metric_count,
    AVG(CASE WHEN tm.metric_name = 'agent_execution_duration_seconds' THEN tm.metric_value END) as avg_duration,
    SUM(CASE WHEN tm.metric_name = 'agent_tokens_used' THEN tm.metric_value END) as total_tokens,
    COUNT(DISTINCT ts.span_id) as total_spans,
    SUM(CASE WHEN ts.status_code = 2 THEN 1 ELSE 0 END) as error_count
FROM agents a
LEFT JOIN telemetry_metrics tm ON a.id = tm.agent_id
LEFT JOIN telemetry_spans ts ON a.id = ts.agent_id
GROUP BY a.id;

-- Trace summary
CREATE VIEW IF NOT EXISTS v_trace_summary AS
SELECT
    trace_id,
    COUNT(*) as total_spans,
    MIN(start_time) as trace_start,
    MAX(end_time) as trace_end,
    SUM(CASE WHEN status_code = 2 THEN 1 ELSE 0 END) as error_spans,
    SUM(CASE WHEN end_time IS NULL THEN 1 ELSE 0 END) as active_spans
FROM telemetry_spans
GROUP BY trace_id;

-- Tool usage summary
CREATE VIEW IF NOT EXISTS v_tool_usage AS
SELECT
    json_extract(labels, '$.tool') as tool_name,
    COUNT(*) as total_calls,
    SUM(CASE WHEN json_extract(labels, '$.status') = 'success' THEN 1 ELSE 0 END) as successful_calls,
    SUM(CASE WHEN json_extract(labels, '$.status') = 'failure' THEN 1 ELSE 0 END) as failed_calls,
    AVG(metric_value) as avg_duration
FROM telemetry_metrics
WHERE metric_name = 'tool_call_duration_seconds'
GROUP BY tool_name;

-- Context window utilization
CREATE VIEW IF NOT EXISTS v_context_utilization AS
SELECT
    agent_id,
    AVG(metric_value) as avg_utilization,
    MAX(metric_value) as max_utilization,
    MIN(metric_value) as min_utilization,
    COUNT(*) as measurement_count
FROM telemetry_metrics
WHERE metric_name = 'context_window_utilization'
GROUP BY agent_id;

-- Error rate by component
CREATE VIEW IF NOT EXISTS v_error_rate AS
SELECT
    json_extract(labels, '$.component') as component,
    json_extract(labels, '$.error_type') as error_type,
    COUNT(*) as error_count,
    MAX(timestamp) as last_error_time
FROM telemetry_metrics
WHERE metric_name = 'error_total'
GROUP BY component, error_type;

-- ============================================
-- STORED PROCEDURES (SQLite-compatible functions)
-- ============================================

-- Function to clean up old telemetry data
-- Note: This would be implemented as a scheduled job
-- DELETE FROM telemetry_metrics WHERE timestamp < datetime('now', '-30 days');
-- DELETE FROM telemetry_spans WHERE start_time < datetime('now', '-30 days');
-- DELETE FROM telemetry_aggregates WHERE timestamp < datetime('now', '-90 days');
