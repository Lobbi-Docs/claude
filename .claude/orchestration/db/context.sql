-- Context Window Optimization Engine Database Schema
-- SQLite compatible schema for tracking context usage, optimization, and checkpoints
-- Part of the Claude Orchestration System

-- ============================================
-- CONTEXT CHECKPOINTS TABLE
-- Store context snapshots at phase boundaries
-- ============================================
CREATE TABLE IF NOT EXISTS context_checkpoints (
    id TEXT PRIMARY KEY,                      -- UUID for checkpoint
    name TEXT NOT NULL,                       -- Human-readable name (e.g., "post-plan", "pre-test")
    session_id TEXT,                          -- Associated orchestration session
    task_id TEXT,                             -- Associated task
    phase TEXT NOT NULL,                      -- explore, plan, code, test, fix, document
    checkpoint_type TEXT DEFAULT 'manual',    -- manual, automatic, phase_boundary, threshold
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Token metrics at checkpoint time
    total_tokens INTEGER NOT NULL,
    system_tokens INTEGER DEFAULT 0,
    conversation_tokens INTEGER DEFAULT 0,
    tool_results_tokens INTEGER DEFAULT 0,

    -- Context composition (JSON serialized)
    context_snapshot TEXT NOT NULL,           -- Full conversation context
    active_files TEXT,                        -- JSON array of active file paths
    tool_cache TEXT,                          -- JSON of cached tool results

    -- Optimization metadata
    optimization_applied BOOLEAN DEFAULT 0,
    compression_strategy TEXT,                -- aggressive, balanced, conservative, custom
    original_tokens INTEGER,                  -- Tokens before optimization

    -- Delta storage (for efficient checkpointing)
    delta_from_parent TEXT,                   -- Reference to parent checkpoint
    delta_changes TEXT,                       -- JSON of changes since parent

    -- Metadata
    metadata TEXT,                            -- Additional JSON metadata

    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_context_checkpoints_session ON context_checkpoints(session_id);
CREATE INDEX IF NOT EXISTS idx_context_checkpoints_phase ON context_checkpoints(phase);
CREATE INDEX IF NOT EXISTS idx_context_checkpoints_created ON context_checkpoints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_checkpoints_name ON context_checkpoints(name);

-- ============================================
-- TOKEN USAGE HISTORY TABLE
-- Track token usage over time for analysis
-- ============================================
CREATE TABLE IF NOT EXISTS token_usage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    task_id TEXT,
    agent_id TEXT,

    -- Token counts by section
    total_tokens INTEGER NOT NULL,
    system_tokens INTEGER DEFAULT 0,
    conversation_tokens INTEGER DEFAULT 0,
    tool_results_tokens INTEGER DEFAULT 0,
    code_tokens INTEGER DEFAULT 0,
    prose_tokens INTEGER DEFAULT 0,
    json_tokens INTEGER DEFAULT 0,

    -- Budget tracking
    budget_limit INTEGER DEFAULT 100000,      -- Default 100K token budget
    budget_used_percent REAL,                 -- Percentage of budget used
    budget_warning_level TEXT,                -- safe, warning, critical

    -- Analysis metrics
    information_density REAL,                 -- Tokens per useful information unit
    redundancy_score REAL,                    -- 0-1 score of redundant content
    compression_ratio REAL,                   -- Actual compression achieved

    -- Context composition
    active_turn_count INTEGER,                -- Number of conversation turns
    active_file_count INTEGER,                -- Number of files in context
    active_tool_count INTEGER,                -- Number of tool results

    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_token_history_timestamp ON token_usage_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_token_history_session ON token_usage_history(session_id);
CREATE INDEX IF NOT EXISTS idx_token_history_warning ON token_usage_history(budget_warning_level);

-- ============================================
-- COMPRESSION CACHE TABLE
-- Cache compressed/summarized content to avoid reprocessing
-- ============================================
CREATE TABLE IF NOT EXISTS compression_cache (
    id TEXT PRIMARY KEY,                      -- SHA256 hash of original content
    content_type TEXT NOT NULL,               -- code, prose, json, conversation_turn, tool_result
    original_content TEXT NOT NULL,
    original_tokens INTEGER NOT NULL,

    -- Compression results by strategy
    aggressive_compressed TEXT,
    aggressive_tokens INTEGER,
    aggressive_quality REAL,                  -- 0-1 quality score

    balanced_compressed TEXT,
    balanced_tokens INTEGER,
    balanced_quality REAL,

    conservative_compressed TEXT,
    conservative_tokens INTEGER,
    conservative_quality REAL,

    -- Cache metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,

    -- Compression algorithm used
    algorithm TEXT,                           -- summarization, minification, deduplication, reference

    UNIQUE(id)
);

CREATE INDEX IF NOT EXISTS idx_compression_cache_type ON compression_cache(content_type);
CREATE INDEX IF NOT EXISTS idx_compression_cache_accessed ON compression_cache(last_accessed_at DESC);

-- ============================================
-- REFERENCE STORE TABLE
-- Store deduplicated content with reference IDs
-- ============================================
CREATE TABLE IF NOT EXISTS reference_store (
    ref_id TEXT PRIMARY KEY,                  -- Short reference ID
    content TEXT NOT NULL,                    -- Original content
    content_hash TEXT NOT NULL,               -- SHA256 hash
    content_type TEXT,                        -- file_content, tool_output, code_block, etc.
    tokens INTEGER NOT NULL,

    -- Usage tracking
    reference_count INTEGER DEFAULT 0,        -- How many times referenced
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_referenced_at TIMESTAMP,

    -- Content metadata
    file_path TEXT,                           -- If content is from a file
    metadata TEXT,                            -- Additional JSON metadata

    UNIQUE(content_hash)
);

CREATE INDEX IF NOT EXISTS idx_reference_hash ON reference_store(content_hash);
CREATE INDEX IF NOT EXISTS idx_reference_type ON reference_store(content_type);

-- ============================================
-- OPTIMIZATION RUNS TABLE
-- Track each optimization execution
-- ============================================
CREATE TABLE IF NOT EXISTS optimization_runs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    -- Input metrics
    input_tokens INTEGER NOT NULL,
    input_system_tokens INTEGER,
    input_conversation_tokens INTEGER,
    input_tool_tokens INTEGER,

    -- Output metrics
    output_tokens INTEGER NOT NULL,
    tokens_saved INTEGER,
    savings_percent REAL,

    -- Strategy used
    strategy TEXT NOT NULL,                   -- aggressive, balanced, conservative, custom
    strategies_applied TEXT,                  -- JSON array of specific techniques used

    -- Quality metrics
    quality_score REAL,                       -- 0-1 overall quality preservation
    information_loss_score REAL,              -- 0-1 estimated information loss

    -- Warnings and errors
    warnings TEXT,                            -- JSON array of warnings
    errors TEXT,                              -- JSON array of errors

    -- Configuration
    config TEXT,                              -- JSON of optimization config used

    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_optimization_runs_session ON optimization_runs(session_id);
CREATE INDEX IF NOT EXISTS idx_optimization_runs_started ON optimization_runs(started_at DESC);

-- ============================================
-- BUDGET ALLOCATIONS TABLE
-- Track token budget allocation across sections
-- ============================================
CREATE TABLE IF NOT EXISTS budget_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Total budget
    total_budget INTEGER DEFAULT 100000,

    -- Section allocations
    system_budget INTEGER,
    system_allocated INTEGER,
    system_used INTEGER,

    conversation_budget INTEGER,
    conversation_allocated INTEGER,
    conversation_used INTEGER,

    tool_results_budget INTEGER,
    tool_results_allocated INTEGER,
    tool_results_used INTEGER,

    -- Dynamic allocation
    reserve_budget INTEGER,                   -- Emergency reserve
    allocation_strategy TEXT,                 -- static, dynamic, adaptive

    -- Thresholds
    warning_threshold INTEGER,                -- Token count for warnings
    critical_threshold INTEGER,               -- Token count for critical warnings

    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_session ON budget_allocations(session_id);

-- ============================================
-- CONTENT PATTERNS TABLE
-- Track high-cost content patterns for optimization
-- ============================================
CREATE TABLE IF NOT EXISTS content_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_hash TEXT UNIQUE,                 -- Hash of pattern signature
    pattern_type TEXT NOT NULL,               -- repetitive_code, verbose_logs, redundant_context, etc.

    -- Pattern characteristics
    token_cost_avg INTEGER,                   -- Average tokens per occurrence
    occurrence_count INTEGER DEFAULT 1,
    total_token_cost INTEGER,

    -- Detection
    example_content TEXT,                     -- Representative example
    detection_rule TEXT,                      -- Regex or description of pattern

    -- Optimization recommendation
    optimization_type TEXT,                   -- reference, summarize, omit, compress
    potential_savings INTEGER,                -- Estimated tokens saved

    -- Metadata
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confidence_score REAL                     -- 0-1 confidence in detection
);

CREATE INDEX IF NOT EXISTS idx_content_patterns_type ON content_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_content_patterns_savings ON content_patterns(potential_savings DESC);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Context budget summary view
CREATE VIEW IF NOT EXISTS v_context_budget_summary AS
SELECT
    th.session_id,
    th.timestamp,
    th.total_tokens,
    th.budget_limit,
    th.budget_used_percent,
    th.budget_warning_level,
    CASE
        WHEN th.budget_used_percent >= 90 THEN 'CRITICAL'
        WHEN th.budget_used_percent >= 75 THEN 'WARNING'
        ELSE 'SAFE'
    END as status,
    th.system_tokens,
    th.conversation_tokens,
    th.tool_results_tokens,
    th.active_turn_count,
    th.active_file_count
FROM token_usage_history th
WHERE th.id IN (
    SELECT MAX(id) FROM token_usage_history GROUP BY session_id
);

-- Optimization effectiveness view
CREATE VIEW IF NOT EXISTS v_optimization_effectiveness AS
SELECT
    strategy,
    COUNT(*) as run_count,
    AVG(savings_percent) as avg_savings_percent,
    AVG(quality_score) as avg_quality_score,
    SUM(tokens_saved) as total_tokens_saved,
    AVG(CAST((julianday(completed_at) - julianday(started_at)) * 24 * 60 * 60 * 1000 AS INTEGER)) as avg_duration_ms
FROM optimization_runs
WHERE completed_at IS NOT NULL
GROUP BY strategy;

-- Checkpoint timeline view
CREATE VIEW IF NOT EXISTS v_checkpoint_timeline AS
SELECT
    c.id,
    c.name,
    c.phase,
    c.created_at,
    c.total_tokens,
    c.optimization_applied,
    c.compression_strategy,
    c.original_tokens,
    (c.original_tokens - c.total_tokens) as tokens_saved,
    CASE
        WHEN c.original_tokens > 0 THEN
            ROUND(((c.original_tokens - c.total_tokens) * 100.0 / c.original_tokens), 2)
        ELSE 0
    END as compression_percent
FROM context_checkpoints c
ORDER BY c.created_at DESC;

-- Top token-consuming patterns view
CREATE VIEW IF NOT EXISTS v_top_token_patterns AS
SELECT
    pattern_type,
    occurrence_count,
    token_cost_avg,
    total_token_cost,
    optimization_type,
    potential_savings,
    ROUND(potential_savings * 100.0 / total_token_cost, 2) as potential_savings_percent
FROM content_patterns
WHERE total_token_cost > 0
ORDER BY potential_savings DESC
LIMIT 20;

-- Cache efficiency view
CREATE VIEW IF NOT EXISTS v_cache_efficiency AS
SELECT
    content_type,
    COUNT(*) as cached_items,
    SUM(access_count) as total_accesses,
    AVG(access_count) as avg_accesses_per_item,
    SUM(original_tokens) as original_tokens,
    SUM(balanced_tokens) as compressed_tokens,
    ROUND(AVG((original_tokens - balanced_tokens) * 100.0 / original_tokens), 2) as avg_compression_percent
FROM compression_cache
GROUP BY content_type;
