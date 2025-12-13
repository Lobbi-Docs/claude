-- Agent Playground Database Schema
-- SQLite-compatible schema for recording, replaying, and debugging agent executions
--
-- Purpose:
-- - Track debugging sessions with full execution history
-- - Store breakpoints, variable states, and execution steps
-- - Enable session recording and replay functionality
-- - Support mock tool responses for testing
-- - Provide detailed execution analytics

-- ============================================
-- SESSIONS TABLE
-- Track all playground debugging sessions
-- ============================================
CREATE TABLE IF NOT EXISTS playground_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    agent_id TEXT NOT NULL,
    agent_type TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    status TEXT DEFAULT 'idle',  -- idle, running, paused, stepping, completed, error
    input TEXT,  -- JSON serialized input parameters
    result TEXT,  -- JSON serialized execution result
    error TEXT,   -- Error message if status = 'error'
    duration_ms INTEGER,
    metadata TEXT  -- JSON for additional session properties
);

CREATE INDEX IF NOT EXISTS idx_playground_sessions_user ON playground_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_playground_sessions_agent ON playground_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_playground_sessions_status ON playground_sessions(status);
CREATE INDEX IF NOT EXISTS idx_playground_sessions_started ON playground_sessions(started_at DESC);

-- ============================================
-- EXECUTION STEPS TABLE
-- Record individual execution steps for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS playground_execution_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    step_type TEXT NOT NULL,  -- tool_call, phase_transition, breakpoint, variable_update, error
    action TEXT NOT NULL,
    state_snapshot TEXT,  -- JSON serialized complete state
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    variables TEXT,  -- JSON serialized variable state
    call_stack TEXT,  -- JSON serialized call stack
    context_usage INTEGER,  -- Token count if applicable
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playground_steps_session ON playground_execution_steps(session_id, step_number);
CREATE INDEX IF NOT EXISTS idx_playground_steps_type ON playground_execution_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_playground_steps_timestamp ON playground_execution_steps(timestamp DESC);

-- ============================================
-- BREAKPOINTS TABLE
-- Track breakpoints for debugging sessions
-- ============================================
CREATE TABLE IF NOT EXISTS playground_breakpoints (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    breakpoint_type TEXT NOT NULL,  -- line, conditional, tool, phase
    enabled BOOLEAN DEFAULT 1,
    location TEXT,  -- File path for line breakpoints
    line_number INTEGER,  -- Line number for line breakpoints
    condition TEXT,  -- Expression for conditional breakpoints
    tool_name TEXT,  -- Tool name for tool breakpoints
    phase_name TEXT,  -- Phase name for phase breakpoints
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playground_breakpoints_session ON playground_breakpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_playground_breakpoints_type ON playground_breakpoints(breakpoint_type);
CREATE INDEX IF NOT EXISTS idx_playground_breakpoints_enabled ON playground_breakpoints(enabled);

-- ============================================
-- RECORDINGS TABLE
-- Store complete session recordings for replay
-- ============================================
CREATE TABLE IF NOT EXISTS playground_recordings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    name TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER NOT NULL,
    step_count INTEGER DEFAULT 0,
    success BOOLEAN NOT NULL,
    error TEXT,
    data TEXT NOT NULL,  -- JSON serialized complete recording data
    size_bytes INTEGER,
    tags TEXT,  -- JSON array of tags
    annotations_count INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_playground_recordings_agent ON playground_recordings(agent_id);
CREATE INDEX IF NOT EXISTS idx_playground_recordings_created ON playground_recordings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playground_recordings_success ON playground_recordings(success);

-- ============================================
-- RECORDING ANNOTATIONS TABLE
-- User annotations on recorded sessions
-- ============================================
CREATE TABLE IF NOT EXISTS playground_recording_annotations (
    id TEXT PRIMARY KEY,
    recording_id TEXT NOT NULL,
    event_id TEXT,  -- Optional link to specific execution step
    text TEXT NOT NULL,
    annotation_type TEXT DEFAULT 'info',  -- info, warning, error, highlight, note
    author TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (recording_id) REFERENCES playground_recordings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playground_annotations_recording ON playground_recording_annotations(recording_id);
CREATE INDEX IF NOT EXISTS idx_playground_annotations_type ON playground_recording_annotations(annotation_type);

-- ============================================
-- MOCK RESPONSES TABLE
-- Configurable mock responses for tool calls
-- ============================================
CREATE TABLE IF NOT EXISTS playground_mocks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    request_pattern TEXT,  -- JSON pattern to match against request
    response TEXT NOT NULL,  -- JSON serialized mock response
    delay_ms INTEGER DEFAULT 0,  -- Simulated latency
    error_rate REAL DEFAULT 0.0,  -- Probability of error (0.0 to 1.0)
    error_response TEXT,  -- JSON serialized error to return
    enabled BOOLEAN DEFAULT 1,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playground_mocks_session ON playground_mocks(session_id);
CREATE INDEX IF NOT EXISTS idx_playground_mocks_tool ON playground_mocks(tool_name);
CREATE INDEX IF NOT EXISTS idx_playground_mocks_enabled ON playground_mocks(enabled);

-- ============================================
-- TOOL CALL HISTORY TABLE
-- Complete log of all tool calls during sessions
-- ============================================
CREATE TABLE IF NOT EXISTS playground_tool_calls (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    step_id INTEGER,
    tool_name TEXT NOT NULL,
    params TEXT NOT NULL,  -- JSON serialized parameters
    response TEXT,  -- JSON serialized response
    error TEXT,  -- Error message if call failed
    is_mock BOOLEAN DEFAULT 0,  -- Whether response was mocked
    duration_ms INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES playground_execution_steps(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_playground_tool_calls_session ON playground_tool_calls(session_id);
CREATE INDEX IF NOT EXISTS idx_playground_tool_calls_tool ON playground_tool_calls(tool_name);
CREATE INDEX IF NOT EXISTS idx_playground_tool_calls_timestamp ON playground_tool_calls(timestamp DESC);

-- ============================================
-- VARIABLE WATCHES TABLE
-- Track watched variables for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS playground_variable_watches (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    variable_path TEXT NOT NULL,  -- e.g., "user.profile.name"
    condition TEXT,  -- Optional condition for watch
    hit_count INTEGER DEFAULT 0,
    last_value TEXT,  -- JSON serialized last observed value
    last_hit_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playground_watches_session ON playground_variable_watches(session_id);

-- ============================================
-- MEMORY SNAPSHOTS TABLE
-- Track memory usage and context windows
-- ============================================
CREATE TABLE IF NOT EXISTS playground_memory_snapshots (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    step_id INTEGER,
    heap_used_bytes INTEGER,
    heap_total_bytes INTEGER,
    external_bytes INTEGER,
    context_tokens INTEGER,
    context_limit INTEGER,
    variables TEXT NOT NULL,  -- JSON serialized variable snapshot
    call_stack TEXT,  -- JSON serialized call stack
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES playground_execution_steps(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_playground_snapshots_session ON playground_memory_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_playground_snapshots_timestamp ON playground_memory_snapshots(timestamp DESC);

-- ============================================
-- SESSION METADATA TABLE
-- Extended metadata for session configuration
-- ============================================
CREATE TABLE IF NOT EXISTS playground_session_metadata (
    session_id TEXT PRIMARY KEY,
    client_id TEXT,
    client_version TEXT,
    agent_version TEXT,
    environment TEXT,  -- JSON serialized environment variables
    feature_flags TEXT,  -- JSON serialized feature flags
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE
);

-- ============================================
-- PERFORMANCE METRICS TABLE
-- Track performance characteristics of executions
-- ============================================
CREATE TABLE IF NOT EXISTS playground_performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    unit TEXT,  -- ms, bytes, tokens, etc.
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tags TEXT,  -- JSON key-value pairs
    FOREIGN KEY (session_id) REFERENCES playground_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playground_metrics_session ON playground_performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_playground_metrics_name ON playground_performance_metrics(metric_name, timestamp DESC);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active sessions view
CREATE VIEW IF NOT EXISTS v_playground_active_sessions AS
SELECT
    ps.*,
    COUNT(DISTINCT pes.id) as total_steps,
    COUNT(DISTINCT ptc.id) as total_tool_calls,
    MAX(pes.timestamp) as last_activity
FROM playground_sessions ps
LEFT JOIN playground_execution_steps pes ON ps.id = pes.session_id
LEFT JOIN playground_tool_calls ptc ON ps.id = ptc.session_id
WHERE ps.status IN ('running', 'paused', 'stepping')
GROUP BY ps.id;

-- Session summary view
CREATE VIEW IF NOT EXISTS v_playground_session_summary AS
SELECT
    ps.id,
    ps.agent_id,
    ps.status,
    ps.started_at,
    ps.ended_at,
    ps.duration_ms,
    COUNT(DISTINCT pes.id) as step_count,
    COUNT(DISTINCT pb.id) as breakpoint_count,
    COUNT(DISTINCT ptc.id) as tool_call_count,
    COUNT(DISTINCT pms.id) as snapshot_count,
    SUM(CASE WHEN ptc.is_mock = 1 THEN 1 ELSE 0 END) as mock_call_count
FROM playground_sessions ps
LEFT JOIN playground_execution_steps pes ON ps.id = pes.session_id
LEFT JOIN playground_breakpoints pb ON ps.id = pb.session_id
LEFT JOIN playground_tool_calls ptc ON ps.id = ptc.session_id
LEFT JOIN playground_memory_snapshots pms ON ps.id = pms.session_id
GROUP BY ps.id;

-- Recording summary view
CREATE VIEW IF NOT EXISTS v_playground_recordings_summary AS
SELECT
    pr.*,
    COUNT(pra.id) as annotation_count,
    ps.agent_id,
    ps.agent_type
FROM playground_recordings pr
LEFT JOIN playground_recording_annotations pra ON pr.id = pra.recording_id
LEFT JOIN playground_sessions ps ON pr.session_id = ps.id
GROUP BY pr.id
ORDER BY pr.created_at DESC;

-- Tool call statistics view
CREATE VIEW IF NOT EXISTS v_playground_tool_stats AS
SELECT
    tool_name,
    COUNT(*) as total_calls,
    SUM(CASE WHEN is_mock = 1 THEN 1 ELSE 0 END) as mock_calls,
    SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_calls,
    AVG(duration_ms) as avg_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(duration_ms) as max_duration_ms
FROM playground_tool_calls
GROUP BY tool_name
ORDER BY total_calls DESC;

-- Performance metrics summary view
CREATE VIEW IF NOT EXISTS v_playground_performance_summary AS
SELECT
    session_id,
    metric_name,
    COUNT(*) as sample_count,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    unit
FROM playground_performance_metrics
GROUP BY session_id, metric_name, unit;
