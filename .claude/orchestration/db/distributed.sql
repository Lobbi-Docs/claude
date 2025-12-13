-- Distributed Agent Execution System Database Schema
-- SQLite compatible schema for distributed task execution across multiple workers
-- Part of the Claude Orchestration System

-- ============================================
-- WORKERS TABLE
-- Track worker agents and their capabilities
-- ============================================
CREATE TABLE IF NOT EXISTS workers (
    id TEXT PRIMARY KEY,                      -- UUID for worker
    name TEXT NOT NULL,                       -- Human-readable worker name
    capabilities TEXT NOT NULL,               -- JSON array of capability tags
    status TEXT NOT NULL DEFAULT 'idle',      -- idle, busy, offline, error

    -- Load management
    current_load INTEGER DEFAULT 0,           -- Current number of assigned tasks
    max_load INTEGER DEFAULT 5,               -- Maximum concurrent tasks
    load_factor REAL DEFAULT 0.0,             -- 0.0 - 1.0, calculated as current/max

    -- Health monitoring
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    heartbeat_interval_ms INTEGER DEFAULT 30000, -- Expected heartbeat interval
    consecutive_failures INTEGER DEFAULT 0,

    -- Worker metadata
    model_name TEXT,                          -- opus, sonnet, haiku, etc.
    model_id TEXT,                            -- Full model ID
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata TEXT,                            -- Additional JSON metadata

    CHECK(status IN ('idle', 'busy', 'offline', 'error')),
    CHECK(current_load >= 0),
    CHECK(max_load > 0),
    CHECK(load_factor >= 0.0 AND load_factor <= 1.0)
);

CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_load ON workers(load_factor ASC);
CREATE INDEX IF NOT EXISTS idx_workers_heartbeat ON workers(last_heartbeat DESC);
CREATE INDEX IF NOT EXISTS idx_workers_capabilities ON workers(capabilities); -- For JSON queries

-- ============================================
-- TASK QUEUE TABLE
-- Priority queue of tasks waiting for assignment
-- ============================================
CREATE TABLE IF NOT EXISTS task_queue (
    id TEXT PRIMARY KEY,                      -- UUID for task
    type TEXT NOT NULL,                       -- Task type identifier
    payload TEXT NOT NULL,                    -- JSON task payload

    -- Priority and ordering
    priority TEXT NOT NULL DEFAULT 'normal',  -- urgent, high, normal, low
    priority_value INTEGER NOT NULL DEFAULT 2, -- 4=urgent, 3=high, 2=normal, 1=low
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Task configuration
    timeout_ms INTEGER DEFAULT 300000,        -- 5 minute default timeout
    retry_policy TEXT,                        -- JSON retry configuration
    affinity TEXT,                            -- Worker affinity rules (JSON)
    required_capabilities TEXT,               -- JSON array of required capabilities

    -- Execution state
    status TEXT NOT NULL DEFAULT 'pending',   -- pending, assigned, running, completed, failed, timeout
    assigned_worker TEXT,                     -- Worker ID if assigned
    assigned_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Retry tracking
    attempt_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,

    -- Result reference
    result_id TEXT,                           -- Reference to task_results

    -- Metadata
    parent_task_id TEXT,                      -- For task dependencies
    metadata TEXT,                            -- Additional JSON metadata

    CHECK(priority IN ('urgent', 'high', 'normal', 'low')),
    CHECK(priority_value BETWEEN 1 AND 4),
    CHECK(status IN ('pending', 'assigned', 'running', 'completed', 'failed', 'timeout', 'cancelled')),
    CHECK(attempt_count >= 0),
    CHECK(timeout_ms > 0),

    FOREIGN KEY (assigned_worker) REFERENCES workers(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_task_id) REFERENCES task_queue(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_priority ON task_queue(priority_value DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_task_queue_worker ON task_queue(assigned_worker);
CREATE INDEX IF NOT EXISTS idx_task_queue_type ON task_queue(type);
CREATE INDEX IF NOT EXISTS idx_task_queue_created ON task_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_queue_parent ON task_queue(parent_task_id);

-- ============================================
-- TASK RESULTS TABLE
-- Store completed task results
-- ============================================
CREATE TABLE IF NOT EXISTS task_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL UNIQUE,             -- Reference to task_queue
    success BOOLEAN NOT NULL,

    -- Result data
    result TEXT,                              -- JSON result payload
    error TEXT,                               -- Error message if failed
    error_stack TEXT,                         -- Full error stack trace

    -- Execution metrics
    duration_ms INTEGER NOT NULL,             -- Actual execution time
    worker_id TEXT NOT NULL,                  -- Worker that executed
    model_used TEXT,                          -- Model name/ID used

    -- Resource usage
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0.0,

    -- Timestamps
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata TEXT,                            -- Additional JSON metadata

    FOREIGN KEY (task_id) REFERENCES task_queue(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_results_task ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_task_results_worker ON task_results(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_results_success ON task_results(success);
CREATE INDEX IF NOT EXISTS idx_task_results_completed ON task_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_results_duration ON task_results(duration_ms DESC);

-- ============================================
-- WORKER ASSIGNMENTS TABLE
-- Track task assignment lifecycle
-- ============================================
CREATE TABLE IF NOT EXISTS worker_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id TEXT NOT NULL,
    task_id TEXT NOT NULL,

    -- Assignment lifecycle
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Assignment metadata
    assignment_reason TEXT,                   -- capability_match, load_balance, affinity, etc.
    reassignment_count INTEGER DEFAULT 0,     -- Number of times task was reassigned

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES task_queue(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_assignments_worker ON worker_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_task ON worker_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_assigned ON worker_assignments(assigned_at DESC);

-- ============================================
-- DISTRIBUTED STATE TABLE
-- Shared state management across workers
-- ============================================
CREATE TABLE IF NOT EXISTS distributed_state (
    key TEXT PRIMARY KEY,                     -- State key
    value TEXT NOT NULL,                      -- JSON value
    version INTEGER NOT NULL DEFAULT 1,       -- Optimistic locking version

    -- State metadata
    updated_by TEXT,                          -- Worker ID that updated
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,                     -- Optional expiration

    -- State type
    state_type TEXT,                          -- config, cache, lock, coordination

    FOREIGN KEY (updated_by) REFERENCES workers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_distributed_state_type ON distributed_state(state_type);
CREATE INDEX IF NOT EXISTS idx_distributed_state_expires ON distributed_state(expires_at);
CREATE INDEX IF NOT EXISTS idx_distributed_state_updated ON distributed_state(updated_at DESC);

-- ============================================
-- DEAD LETTER QUEUE TABLE
-- Failed tasks that exceeded retry limit
-- ============================================
CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,

    -- Original task data
    task_type TEXT NOT NULL,
    original_payload TEXT NOT NULL,           -- Original task payload

    -- Failure information
    error TEXT NOT NULL,
    error_stack TEXT,
    retry_count INTEGER NOT NULL,
    final_status TEXT NOT NULL,               -- failed, timeout, cancelled

    -- Workers that attempted
    attempted_workers TEXT,                   -- JSON array of worker IDs

    -- Timestamps
    original_created_at TIMESTAMP,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Metadata
    metadata TEXT,                            -- Additional JSON metadata

    CHECK(final_status IN ('failed', 'timeout', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_task ON dead_letter_queue(task_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_type ON dead_letter_queue(task_type);
CREATE INDEX IF NOT EXISTS idx_dead_letter_failed ON dead_letter_queue(failed_at DESC);

-- ============================================
-- TASK DEPENDENCIES TABLE
-- Track dependencies between tasks
-- ============================================
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,                    -- Dependent task
    depends_on_task_id TEXT NOT NULL,         -- Task that must complete first

    -- Dependency metadata
    dependency_type TEXT DEFAULT 'blocking',  -- blocking, optional, weak
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,                    -- When dependency was satisfied

    FOREIGN KEY (task_id) REFERENCES task_queue(id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES task_queue(id) ON DELETE CASCADE,

    UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_resolved ON task_dependencies(resolved_at);

-- ============================================
-- WORKER METRICS TABLE
-- Track worker performance over time
-- ============================================
CREATE TABLE IF NOT EXISTS worker_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Performance metrics
    tasks_completed INTEGER DEFAULT 0,
    tasks_failed INTEGER DEFAULT 0,
    avg_duration_ms REAL DEFAULT 0.0,
    success_rate REAL DEFAULT 1.0,            -- 0.0 - 1.0

    -- Resource metrics
    total_tokens_input INTEGER DEFAULT 0,
    total_tokens_output INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0.0,

    -- Load metrics
    avg_load_factor REAL DEFAULT 0.0,
    peak_load INTEGER DEFAULT 0,

    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_metrics_worker ON worker_metrics(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_metrics_timestamp ON worker_metrics(timestamp DESC);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active workers with current status
CREATE VIEW IF NOT EXISTS v_active_workers AS
SELECT
    w.id,
    w.name,
    w.status,
    w.current_load,
    w.max_load,
    w.load_factor,
    w.model_name,
    w.capabilities,
    CAST((julianday('now') - julianday(w.last_heartbeat)) * 86400 AS INTEGER) as seconds_since_heartbeat,
    CASE
        WHEN CAST((julianday('now') - julianday(w.last_heartbeat)) * 1000 AS INTEGER) > w.heartbeat_interval_ms * 2 THEN 1
        ELSE 0
    END as is_stale
FROM workers w
WHERE w.status != 'offline'
ORDER BY w.load_factor ASC;

-- Pending tasks ordered by priority
CREATE VIEW IF NOT EXISTS v_pending_tasks AS
SELECT
    t.id,
    t.type,
    t.priority,
    t.priority_value,
    t.created_at,
    t.timeout_ms,
    t.required_capabilities,
    t.affinity,
    t.attempt_count,
    t.max_retries,
    CAST((julianday('now') - julianday(t.created_at)) * 1000 AS INTEGER) as wait_time_ms
FROM task_queue t
WHERE t.status = 'pending'
ORDER BY t.priority_value DESC, t.created_at ASC;

-- Task execution summary
CREATE VIEW IF NOT EXISTS v_task_execution_summary AS
SELECT
    tq.id,
    tq.type,
    tq.priority,
    tq.status,
    tq.assigned_worker,
    w.name as worker_name,
    tr.success,
    tr.duration_ms,
    tr.error,
    tq.created_at,
    tq.assigned_at,
    tq.started_at,
    tq.completed_at,
    CASE
        WHEN tq.completed_at IS NOT NULL THEN
            CAST((julianday(tq.completed_at) - julianday(tq.created_at)) * 1000 AS INTEGER)
        ELSE NULL
    END as total_time_ms
FROM task_queue tq
LEFT JOIN workers w ON tq.assigned_worker = w.id
LEFT JOIN task_results tr ON tq.id = tr.task_id
ORDER BY tq.created_at DESC;

-- Worker performance summary
CREATE VIEW IF NOT EXISTS v_worker_performance AS
SELECT
    w.id,
    w.name,
    w.status,
    w.model_name,
    COUNT(DISTINCT tr.id) as total_tasks,
    SUM(CASE WHEN tr.success = 1 THEN 1 ELSE 0 END) as successful_tasks,
    SUM(CASE WHEN tr.success = 0 THEN 1 ELSE 0 END) as failed_tasks,
    ROUND(AVG(CASE WHEN tr.success = 1 THEN 1.0 ELSE 0.0 END), 3) as success_rate,
    ROUND(AVG(tr.duration_ms), 2) as avg_duration_ms,
    ROUND(SUM(tr.cost_usd), 4) as total_cost_usd,
    SUM(tr.tokens_input) as total_tokens_input,
    SUM(tr.tokens_output) as total_tokens_output
FROM workers w
LEFT JOIN task_results tr ON w.id = tr.worker_id
GROUP BY w.id, w.name, w.status, w.model_name;

-- Queue depth by task type
CREATE VIEW IF NOT EXISTS v_queue_depth AS
SELECT
    type,
    status,
    priority,
    COUNT(*) as task_count,
    ROUND(AVG(CAST((julianday('now') - julianday(created_at)) * 1000 AS INTEGER)), 2) as avg_wait_time_ms
FROM task_queue
WHERE status IN ('pending', 'assigned', 'running')
GROUP BY type, status, priority
ORDER BY priority_value DESC, task_count DESC;

-- System health overview
CREATE VIEW IF NOT EXISTS v_system_health AS
SELECT
    (SELECT COUNT(*) FROM workers WHERE status = 'idle') as idle_workers,
    (SELECT COUNT(*) FROM workers WHERE status = 'busy') as busy_workers,
    (SELECT COUNT(*) FROM workers WHERE status = 'offline') as offline_workers,
    (SELECT COUNT(*) FROM task_queue WHERE status = 'pending') as pending_tasks,
    (SELECT COUNT(*) FROM task_queue WHERE status = 'running') as running_tasks,
    (SELECT COUNT(*) FROM task_queue WHERE status = 'completed') as completed_tasks,
    (SELECT COUNT(*) FROM task_queue WHERE status = 'failed') as failed_tasks,
    (SELECT COUNT(*) FROM dead_letter_queue) as dead_letter_count,
    (SELECT ROUND(AVG(load_factor), 3) FROM workers WHERE status != 'offline') as avg_load_factor,
    (SELECT ROUND(AVG(duration_ms), 2) FROM task_results WHERE completed_at > datetime('now', '-1 hour')) as avg_task_duration_last_hour;

-- Stale workers (missed heartbeats)
CREATE VIEW IF NOT EXISTS v_stale_workers AS
SELECT
    w.id,
    w.name,
    w.status,
    w.last_heartbeat,
    w.heartbeat_interval_ms,
    CAST((julianday('now') - julianday(w.last_heartbeat)) * 1000 AS INTEGER) as ms_since_heartbeat,
    w.consecutive_failures,
    w.current_load
FROM workers w
WHERE CAST((julianday('now') - julianday(w.last_heartbeat)) * 1000 AS INTEGER) > w.heartbeat_interval_ms * 2
  AND w.status != 'offline'
ORDER BY ms_since_heartbeat DESC;

-- Task timeout candidates
CREATE VIEW IF NOT EXISTS v_timeout_candidates AS
SELECT
    t.id,
    t.type,
    t.status,
    t.assigned_worker,
    t.started_at,
    t.timeout_ms,
    CAST((julianday('now') - julianday(t.started_at)) * 1000 AS INTEGER) as elapsed_ms,
    t.timeout_ms - CAST((julianday('now') - julianday(t.started_at)) * 1000 AS INTEGER) as remaining_ms
FROM task_queue t
WHERE t.status IN ('assigned', 'running')
  AND t.started_at IS NOT NULL
  AND CAST((julianday('now') - julianday(t.started_at)) * 1000 AS INTEGER) >= t.timeout_ms
ORDER BY elapsed_ms DESC;

-- ============================================
-- TRIGGERS FOR AUTOMATION
-- ============================================

-- Update worker load factor when current_load changes
CREATE TRIGGER IF NOT EXISTS trg_update_worker_load_factor
AFTER UPDATE OF current_load, max_load ON workers
FOR EACH ROW
BEGIN
    UPDATE workers
    SET load_factor = CAST(NEW.current_load AS REAL) / CAST(NEW.max_load AS REAL)
    WHERE id = NEW.id;
END;

-- Update worker status when load changes
CREATE TRIGGER IF NOT EXISTS trg_update_worker_status_on_load
AFTER UPDATE OF current_load ON workers
FOR EACH ROW
WHEN NEW.status != 'offline' AND NEW.status != 'error'
BEGIN
    UPDATE workers
    SET status = CASE
        WHEN NEW.current_load = 0 THEN 'idle'
        WHEN NEW.current_load > 0 THEN 'busy'
        ELSE NEW.status
    END
    WHERE id = NEW.id;
END;

-- Create task result reference when task completes
CREATE TRIGGER IF NOT EXISTS trg_link_task_result
AFTER INSERT ON task_results
FOR EACH ROW
BEGIN
    UPDATE task_queue
    SET result_id = NEW.task_id
    WHERE id = NEW.task_id;
END;

-- Resolve dependencies when task completes successfully
CREATE TRIGGER IF NOT EXISTS trg_resolve_dependencies
AFTER UPDATE OF status ON task_queue
FOR EACH ROW
WHEN NEW.status = 'completed'
BEGIN
    UPDATE task_dependencies
    SET resolved_at = CURRENT_TIMESTAMP
    WHERE depends_on_task_id = NEW.id
      AND resolved_at IS NULL;
END;
