-- Golden Armada Agent Orchestration Database Schema
-- SQLite compatible, with notes for other databases

-- ============================================
-- AGENTS TABLE
-- Track all registered agents and their state
-- ============================================
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- coder, tester, reviewer, etc.
    category TEXT,       -- core, devops, security, etc.
    model TEXT DEFAULT 'sonnet',
    status TEXT DEFAULT 'idle',  -- idle, running, paused, error, terminated
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP,
    metadata TEXT  -- JSON for additional properties
);

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);

-- ============================================
-- SESSIONS TABLE
-- Track orchestration sessions
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    coordinator_id TEXT,
    pattern TEXT,  -- hierarchical, mesh, adaptive, pipeline
    status TEXT DEFAULT 'active',  -- active, completed, failed, cancelled
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    config TEXT,  -- JSON session configuration
    FOREIGN KEY (coordinator_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- ============================================
-- TASKS TABLE
-- Track individual tasks assigned to agents
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    agent_id TEXT,
    parent_task_id TEXT,  -- For subtasks
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',  -- pending, queued, running, completed, failed, cancelled
    priority INTEGER DEFAULT 5,  -- 1 (highest) to 10 (lowest)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result TEXT,  -- JSON result data
    error TEXT,
    metadata TEXT,  -- JSON for additional properties
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority, created_at);

-- ============================================
-- ACTIVITY LOG TABLE
-- Detailed log of all agent activities
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    agent_id TEXT,
    task_id TEXT,
    action TEXT NOT NULL,  -- started, completed, failed, checkpoint, message, file_edit, etc.
    category TEXT,  -- agent_activity, task_execution, communication, etc.
    level TEXT DEFAULT 'INFO',  -- DEBUG, INFO, WARN, ERROR
    message TEXT,
    details TEXT,  -- JSON for structured data
    duration_ms INTEGER,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_agent ON activity_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_activity_session ON activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_level ON activity_log(level);

-- ============================================
-- CHECKPOINTS TABLE
-- State snapshots for recovery
-- ============================================
CREATE TABLE IF NOT EXISTS checkpoints (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    task_id TEXT,
    agent_id TEXT,
    checkpoint_type TEXT NOT NULL,  -- task_start, task_complete, periodic, error, manual
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    state TEXT NOT NULL,  -- JSON serialized state
    files_snapshot TEXT,  -- JSON list of modified files
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_session ON checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_task ON checkpoints(task_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created ON checkpoints(created_at DESC);

-- ============================================
-- LOCKS TABLE
-- Resource locking for coordination
-- ============================================
CREATE TABLE IF NOT EXISTS locks (
    resource_id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL,  -- file, task, api, database
    owner_agent_id TEXT NOT NULL,
    owner_session_id TEXT,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (owner_agent_id) REFERENCES agents(id),
    FOREIGN KEY (owner_session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_locks_owner ON locks(owner_agent_id);
CREATE INDEX IF NOT EXISTS idx_locks_expires ON locks(expires_at);

-- ============================================
-- MESSAGES TABLE
-- Inter-agent communication
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL,  -- broadcast, direct, task
    sender_id TEXT,
    recipient_id TEXT,  -- NULL for broadcast
    session_id TEXT,
    task_id TEXT,
    message_type TEXT NOT NULL,  -- request, response, notification, error, status
    subject TEXT,
    body TEXT NOT NULL,
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata TEXT,
    FOREIGN KEY (sender_id) REFERENCES agents(id),
    FOREIGN KEY (recipient_id) REFERENCES agents(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- ============================================
-- WORK QUEUE TABLE
-- Task queue for parallel processing
-- ============================================
CREATE TABLE IF NOT EXISTS work_queue (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'queued',  -- queued, assigned, processing, completed, failed
    assigned_agent_id TEXT,
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON work_queue(status, priority, queued_at);
CREATE INDEX IF NOT EXISTS idx_queue_agent ON work_queue(assigned_agent_id);

-- ============================================
-- METRICS TABLE
-- Performance and usage metrics
-- ============================================
CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    agent_id TEXT,
    session_id TEXT,
    labels TEXT,  -- JSON key-value pairs
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_agent ON metrics(agent_id);

-- ============================================
-- FILE TRACKING TABLE
-- Track file modifications by agents
-- ============================================
CREATE TABLE IF NOT EXISTS file_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    agent_id TEXT,
    task_id TEXT,
    operation TEXT NOT NULL,  -- read, create, edit, delete
    file_path TEXT NOT NULL,
    content_hash TEXT,  -- SHA256 of content after operation
    previous_hash TEXT,  -- SHA256 before operation
    lines_changed INTEGER,
    metadata TEXT,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_file_ops_path ON file_operations(file_path);
CREATE INDEX IF NOT EXISTS idx_file_ops_agent ON file_operations(agent_id);
CREATE INDEX IF NOT EXISTS idx_file_ops_session ON file_operations(session_id);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active agents view
CREATE VIEW IF NOT EXISTS v_active_agents AS
SELECT a.*,
       COUNT(t.id) as active_tasks,
       MAX(al.timestamp) as last_activity
FROM agents a
LEFT JOIN tasks t ON a.id = t.agent_id AND t.status = 'running'
LEFT JOIN activity_log al ON a.id = al.agent_id
WHERE a.status IN ('running', 'idle')
GROUP BY a.id;

-- Task summary view
CREATE VIEW IF NOT EXISTS v_task_summary AS
SELECT
    s.id as session_id,
    s.name as session_name,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN t.status = 'running' THEN 1 ELSE 0 END) as running,
    SUM(CASE WHEN t.status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) as pending
FROM sessions s
LEFT JOIN tasks t ON s.id = t.session_id
GROUP BY s.id;

-- Recent activity view
CREATE VIEW IF NOT EXISTS v_recent_activity AS
SELECT
    al.*,
    a.name as agent_name,
    a.type as agent_type,
    t.title as task_title
FROM activity_log al
LEFT JOIN agents a ON al.agent_id = a.id
LEFT JOIN tasks t ON al.task_id = t.id
ORDER BY al.timestamp DESC
LIMIT 100;
