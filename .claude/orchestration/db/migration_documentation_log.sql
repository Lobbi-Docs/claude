-- ============================================
-- DOCUMENTATION LOGGING SCHEMA EXTENSION
-- Migration to add documentation logging tables and views
-- Version: 1.0.0
-- Date: 2025-01-29
-- ============================================

-- ============================================
-- DOCUMENTATION LOG TABLE
-- Comprehensive tracking of all documentation activities
-- ============================================
CREATE TABLE IF NOT EXISTS documentation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    agent_id TEXT NOT NULL,
    task_id TEXT,

    -- Document identification
    doc_type TEXT NOT NULL,  -- readme, adr, guide, reference, research, api, architecture, quickstart
    doc_path TEXT NOT NULL,  -- Path to documentation file (relative to repo root)
    obsidian_path TEXT,      -- Path in Obsidian vault (if synced)

    -- Activity tracking
    action TEXT NOT NULL,    -- created, updated, synced, deleted, moved
    category TEXT,           -- repo_doc, research, decision, technical, guide, integration

    -- Content metadata
    title TEXT,              -- Document title (extracted from frontmatter or H1)
    summary TEXT,            -- Brief summary of changes
    content_hash TEXT,       -- SHA256 hash for change detection
    previous_hash TEXT,      -- Previous content hash (for updates)

    -- Statistics
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    word_count INTEGER,

    -- Sync tracking
    vault_synced BOOLEAN DEFAULT 0,
    sync_timestamp TIMESTAMP,
    sync_status TEXT,        -- pending, success, failed, skipped
    sync_error TEXT,         -- Error message if sync failed

    -- Metadata
    metadata TEXT,           -- JSON: { tags: [], related_docs: [], priority: "high", quality_score: 0.8 }

    -- Foreign keys
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_log_agent ON documentation_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_doc_log_session ON documentation_log(session_id);
CREATE INDEX IF NOT EXISTS idx_doc_log_task ON documentation_log(task_id);
CREATE INDEX IF NOT EXISTS idx_doc_log_type ON documentation_log(doc_type);
CREATE INDEX IF NOT EXISTS idx_doc_log_action ON documentation_log(action);
CREATE INDEX IF NOT EXISTS idx_doc_log_category ON documentation_log(category);
CREATE INDEX IF NOT EXISTS idx_doc_log_synced ON documentation_log(vault_synced);
CREATE INDEX IF NOT EXISTS idx_doc_log_timestamp ON documentation_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_doc_log_path ON documentation_log(doc_path);
CREATE INDEX IF NOT EXISTS idx_doc_log_sync_status ON documentation_log(sync_status);

-- ============================================
-- OBSIDIAN SYNC QUEUE TABLE
-- Queue for managing asynchronous Obsidian vault syncs
-- ============================================
CREATE TABLE IF NOT EXISTS obsidian_sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_log_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    obsidian_target_path TEXT NOT NULL,

    status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
    priority INTEGER DEFAULT 5,     -- 1 (highest) to 10 (lowest)

    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    error_message TEXT,

    FOREIGN KEY (doc_log_id) REFERENCES documentation_log(id)
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON obsidian_sync_queue(status, priority, queued_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_file ON obsidian_sync_queue(file_path);

-- ============================================
-- DOCUMENTATION COVERAGE TABLE
-- Track documentation coverage metrics by repository/project
-- ============================================
CREATE TABLE IF NOT EXISTS documentation_coverage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,

    -- Scope
    repo_name TEXT,
    project_path TEXT,

    -- Coverage metrics
    total_files INTEGER DEFAULT 0,
    documented_files INTEGER DEFAULT 0,
    coverage_percentage REAL DEFAULT 0.0,

    -- Documentation inventory
    has_readme BOOLEAN DEFAULT 0,
    has_architecture_doc BOOLEAN DEFAULT 0,
    has_api_doc BOOLEAN DEFAULT 0,
    has_setup_guide BOOLEAN DEFAULT 0,
    adr_count INTEGER DEFAULT 0,
    guide_count INTEGER DEFAULT 0,

    -- Quality metrics
    avg_doc_quality_score REAL,
    outdated_docs_count INTEGER DEFAULT 0,
    missing_docs_count INTEGER DEFAULT 0,

    -- Metadata
    metadata TEXT,  -- JSON: { gaps: [], recommendations: [] }

    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_doc_coverage_session ON documentation_coverage(session_id);
CREATE INDEX IF NOT EXISTS idx_doc_coverage_repo ON documentation_coverage(repo_name);
CREATE INDEX IF NOT EXISTS idx_doc_coverage_timestamp ON documentation_coverage(timestamp DESC);

-- ============================================
-- VIEWS FOR DOCUMENTATION ANALYTICS
-- ============================================

-- Agent Documentation Statistics
CREATE VIEW IF NOT EXISTS v_agent_doc_stats AS
SELECT
    a.id as agent_id,
    a.name as agent_name,
    a.type as agent_type,
    a.category as agent_category,

    COUNT(dl.id) as total_docs,
    SUM(CASE WHEN dl.action = 'created' THEN 1 ELSE 0 END) as docs_created,
    SUM(CASE WHEN dl.action = 'updated' THEN 1 ELSE 0 END) as docs_updated,
    SUM(CASE WHEN dl.action = 'deleted' THEN 1 ELSE 0 END) as docs_deleted,
    SUM(CASE WHEN dl.vault_synced = 1 THEN 1 ELSE 0 END) as docs_synced,
    SUM(CASE WHEN dl.vault_synced = 0 THEN 1 ELSE 0 END) as docs_unsynced,

    SUM(dl.lines_added) as total_lines_added,
    SUM(dl.lines_removed) as total_lines_removed,

    COUNT(DISTINCT dl.doc_type) as doc_types_count,

    MIN(dl.timestamp) as first_doc_timestamp,
    MAX(dl.timestamp) as last_doc_timestamp,

    MAX(dl.sync_timestamp) as last_sync_timestamp
FROM agents a
LEFT JOIN documentation_log dl ON a.id = dl.agent_id
GROUP BY a.id;

-- Session Documentation Summary
CREATE VIEW IF NOT EXISTS v_session_doc_summary AS
SELECT
    s.id as session_id,
    s.name as session_name,
    s.pattern as orchestration_pattern,

    COUNT(dl.id) as total_docs,
    SUM(CASE WHEN dl.action = 'created' THEN 1 ELSE 0 END) as docs_created,
    SUM(CASE WHEN dl.action = 'updated' THEN 1 ELSE 0 END) as docs_updated,
    SUM(CASE WHEN dl.vault_synced = 1 THEN 1 ELSE 0 END) as docs_synced,

    COUNT(DISTINCT dl.agent_id) as agents_contributing,
    COUNT(DISTINCT dl.doc_type) as doc_types_used,

    SUM(dl.lines_added) as total_lines_added,
    SUM(dl.lines_removed) as total_lines_removed,

    MIN(dl.timestamp) as first_doc_timestamp,
    MAX(dl.timestamp) as last_doc_timestamp
FROM sessions s
LEFT JOIN documentation_log dl ON s.id = dl.session_id
GROUP BY s.id;

-- Documentation by Type
CREATE VIEW IF NOT EXISTS v_doc_type_breakdown AS
SELECT
    doc_type,
    category,

    COUNT(id) as count,
    SUM(CASE WHEN vault_synced = 1 THEN 1 ELSE 0 END) as synced_count,
    SUM(CASE WHEN action = 'created' THEN 1 ELSE 0 END) as created_count,
    SUM(CASE WHEN action = 'updated' THEN 1 ELSE 0 END) as updated_count,

    SUM(lines_added) as total_lines_added,
    SUM(lines_removed) as total_lines_removed,
    AVG(word_count) as avg_word_count,

    MIN(timestamp) as first_created,
    MAX(timestamp) as last_modified
FROM documentation_log
GROUP BY doc_type, category;

-- Recent Documentation Activity
CREATE VIEW IF NOT EXISTS v_recent_doc_activity AS
SELECT
    dl.id,
    dl.timestamp,
    dl.action,
    dl.doc_type,
    dl.doc_path,
    dl.title,
    dl.summary,

    a.name as agent_name,
    a.type as agent_type,

    t.title as task_title,
    t.status as task_status,

    s.name as session_name,

    dl.vault_synced,
    dl.sync_status,
    dl.lines_added,
    dl.lines_removed
FROM documentation_log dl
LEFT JOIN agents a ON dl.agent_id = a.id
LEFT JOIN tasks t ON dl.task_id = t.id
LEFT JOIN sessions s ON dl.session_id = s.id
ORDER BY dl.timestamp DESC
LIMIT 100;

-- Unsynced Documentation
CREATE VIEW IF NOT EXISTS v_unsynced_docs AS
SELECT
    dl.id,
    dl.doc_path,
    dl.doc_type,
    dl.action,
    dl.timestamp,
    dl.sync_status,
    dl.sync_error,

    a.name as agent_name,

    sq.retry_count,
    sq.status as queue_status
FROM documentation_log dl
LEFT JOIN agents a ON dl.agent_id = a.id
LEFT JOIN obsidian_sync_queue sq ON dl.id = sq.doc_log_id
WHERE dl.vault_synced = 0 OR dl.sync_status IN ('pending', 'failed')
ORDER BY dl.timestamp DESC;

-- Documentation Quality Metrics
CREATE VIEW IF NOT EXISTS v_doc_quality_metrics AS
SELECT
    DATE(timestamp) as date,

    COUNT(id) as docs_count,
    AVG(word_count) as avg_word_count,
    AVG(lines_added - lines_removed) as avg_net_lines,

    SUM(CASE WHEN vault_synced = 1 THEN 1 ELSE 0 END) as synced_count,
    ROUND(CAST(SUM(CASE WHEN vault_synced = 1 THEN 1 ELSE 0 END) AS FLOAT) /
          NULLIF(COUNT(id), 0) * 100, 2) as sync_rate_percent,

    COUNT(DISTINCT agent_id) as active_agents
FROM documentation_log
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- ============================================
-- TRIGGERS FOR AUTOMATED TRACKING
-- ============================================

-- Auto-update sync queue when documentation is logged
CREATE TRIGGER IF NOT EXISTS trg_doc_log_insert_queue
AFTER INSERT ON documentation_log
WHEN NEW.action IN ('created', 'updated')
BEGIN
    INSERT INTO obsidian_sync_queue (doc_log_id, file_path, obsidian_target_path, priority)
    VALUES (
        NEW.id,
        NEW.doc_path,
        COALESCE(NEW.obsidian_path, NEW.doc_path),
        CASE NEW.doc_type
            WHEN 'readme' THEN 1
            WHEN 'architecture' THEN 2
            WHEN 'adr' THEN 3
            ELSE 5
        END
    );
END;

-- Update activity log when documentation is synced
CREATE TRIGGER IF NOT EXISTS trg_doc_synced_activity
AFTER UPDATE ON documentation_log
WHEN NEW.vault_synced = 1 AND OLD.vault_synced = 0
BEGIN
    INSERT INTO activity_log (session_id, agent_id, task_id, action, category, level, message, details)
    VALUES (
        NEW.session_id,
        NEW.agent_id,
        NEW.task_id,
        'doc_synced',
        'documentation',
        'INFO',
        'Documentation synced to Obsidian vault: ' || NEW.doc_path,
        json_object(
            'doc_type', NEW.doc_type,
            'doc_path', NEW.doc_path,
            'obsidian_path', NEW.obsidian_path,
            'title', NEW.title
        )
    );
END;

-- ============================================
-- STORED PROCEDURES (Helper Functions)
-- ============================================

-- Note: SQLite doesn't support stored procedures, but we can create helper queries
-- These will be implemented in the Python/Bash utilities

-- Example helper query for getting unsynced documents count
-- SELECT COUNT(*) FROM documentation_log WHERE vault_synced = 0;

-- Example helper query for getting documentation coverage
-- SELECT
--   COUNT(DISTINCT doc_path) as total_docs,
--   SUM(CASE WHEN vault_synced = 1 THEN 1 ELSE 0 END) as synced_docs,
--   ROUND(CAST(SUM(CASE WHEN vault_synced = 1 THEN 1 ELSE 0 END) AS FLOAT) /
--         NULLIF(COUNT(DISTINCT doc_path), 0) * 100, 2) as sync_percentage
-- FROM documentation_log;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration execution
INSERT INTO activity_log (action, category, level, message, details)
VALUES (
    'schema_migration',
    'system',
    'INFO',
    'Documentation logging schema migration applied successfully',
    json_object(
        'migration', 'documentation_log',
        'version', '1.0.0',
        'tables_added', json_array('documentation_log', 'obsidian_sync_queue', 'documentation_coverage'),
        'views_added', json_array('v_agent_doc_stats', 'v_session_doc_summary', 'v_doc_type_breakdown', 'v_recent_doc_activity', 'v_unsynced_docs', 'v_doc_quality_metrics')
    )
);
