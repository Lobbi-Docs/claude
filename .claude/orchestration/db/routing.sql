-- Model Routing Database Schema
-- Tracks routing decisions, outcomes, and performance metrics

-- ============================================================================
-- Routing Decisions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS routing_decisions (
    id TEXT PRIMARY KEY,
    task_hash TEXT NOT NULL,
    task_text TEXT NOT NULL,
    task_type TEXT NOT NULL,
    complexity TEXT NOT NULL CHECK (complexity IN ('simple', 'medium', 'complex', 'critical')),
    pattern TEXT NOT NULL CHECK (pattern IN ('single-shot', 'multi-step', 'iterative', 'chain-of-thought')),

    -- Selected model
    model_selected TEXT NOT NULL,
    model_id TEXT NOT NULL,
    confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 100),

    -- Estimates
    estimated_cost REAL NOT NULL,
    estimated_latency INTEGER NOT NULL,
    estimated_tokens_input INTEGER NOT NULL,
    estimated_tokens_output INTEGER NOT NULL,

    -- Reasoning
    reasoning TEXT,
    alternatives TEXT, -- JSON array of alternative models

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routing_task_type ON routing_decisions(task_type);
CREATE INDEX IF NOT EXISTS idx_routing_complexity ON routing_decisions(complexity);
CREATE INDEX IF NOT EXISTS idx_routing_model ON routing_decisions(model_selected);
CREATE INDEX IF NOT EXISTS idx_routing_created ON routing_decisions(created_at);
CREATE INDEX IF NOT EXISTS idx_routing_task_hash ON routing_decisions(task_hash);

-- ============================================================================
-- Routing Outcomes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS routing_outcomes (
    id TEXT PRIMARY KEY,
    routing_id TEXT NOT NULL REFERENCES routing_decisions(id),

    -- Outcome
    success BOOLEAN NOT NULL,
    quality_score REAL CHECK (quality_score >= 0 AND quality_score <= 100),

    -- Actual metrics
    actual_cost REAL NOT NULL,
    actual_latency INTEGER NOT NULL,
    tokens_input INTEGER NOT NULL,
    tokens_output INTEGER NOT NULL,
    tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,

    -- Fallback info
    used_fallback BOOLEAN NOT NULL DEFAULT FALSE,
    fallback_model TEXT,
    attempts INTEGER DEFAULT 1,

    -- Error tracking
    error_message TEXT,
    error_code TEXT,

    -- User feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_comment TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_outcomes_routing ON routing_outcomes(routing_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_success ON routing_outcomes(success);
CREATE INDEX IF NOT EXISTS idx_outcomes_created ON routing_outcomes(created_at);

-- ============================================================================
-- Model Performance Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS model_performance (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,
    complexity TEXT NOT NULL,

    -- Aggregated metrics
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    success_rate REAL GENERATED ALWAYS AS (
        CASE WHEN total_requests > 0
        THEN CAST(successful_requests AS REAL) / total_requests
        ELSE 0 END
    ) STORED,

    -- Quality metrics
    avg_quality_score REAL,
    min_quality_score REAL,
    max_quality_score REAL,

    -- Cost metrics
    total_cost REAL NOT NULL DEFAULT 0,
    avg_cost REAL,

    -- Latency metrics
    avg_latency INTEGER,
    min_latency INTEGER,
    max_latency INTEGER,

    -- Token metrics
    total_tokens_input INTEGER NOT NULL DEFAULT 0,
    total_tokens_output INTEGER NOT NULL DEFAULT 0,
    avg_tokens_per_request INTEGER,

    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sample_size INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_unique
    ON model_performance(model, task_type, complexity);
CREATE INDEX IF NOT EXISTS idx_performance_model ON model_performance(model);
CREATE INDEX IF NOT EXISTS idx_performance_task_type ON model_performance(task_type);

-- ============================================================================
-- Cost Tracking Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_tracking (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    task_type TEXT NOT NULL,

    -- Cost breakdown
    cost REAL NOT NULL,
    cost_input REAL NOT NULL,
    cost_output REAL NOT NULL,

    -- Token usage
    tokens_input INTEGER NOT NULL,
    tokens_output INTEGER NOT NULL,
    tokens_total INTEGER GENERATED ALWAYS AS (tokens_input + tokens_output) STORED,

    -- Context
    task_id TEXT,
    routing_id TEXT REFERENCES routing_decisions(id),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_only TEXT GENERATED ALWAYS AS (DATE(created_at)) STORED
);

CREATE INDEX IF NOT EXISTS idx_cost_model ON cost_tracking(model);
CREATE INDEX IF NOT EXISTS idx_cost_created ON cost_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_date ON cost_tracking(date_only);

-- ============================================================================
-- Budget Tracking Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS budget_tracking (
    id TEXT PRIMARY KEY,

    -- Budget limits
    daily_limit REAL NOT NULL,
    monthly_limit REAL NOT NULL,
    per_request_limit REAL,

    -- Current spending
    daily_spent REAL NOT NULL DEFAULT 0,
    monthly_spent REAL NOT NULL DEFAULT 0,

    -- Alert thresholds (percentage)
    daily_warning_threshold REAL NOT NULL DEFAULT 75,
    monthly_warning_threshold REAL NOT NULL DEFAULT 80,

    -- Status
    daily_exceeded BOOLEAN GENERATED ALWAYS AS (daily_spent > daily_limit) STORED,
    monthly_exceeded BOOLEAN GENERATED ALWAYS AS (monthly_spent > monthly_limit) STORED,

    -- Metadata
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_budget_period ON budget_tracking(period_start, period_end);

-- ============================================================================
-- Fallback Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS fallback_events (
    id TEXT PRIMARY KEY,
    routing_id TEXT NOT NULL REFERENCES routing_decisions(id),

    -- Primary model failure
    primary_model TEXT NOT NULL,
    primary_error TEXT,

    -- Fallback used
    fallback_model TEXT NOT NULL,
    fallback_success BOOLEAN NOT NULL,

    -- Timing
    attempt_number INTEGER NOT NULL,
    retry_delay_ms INTEGER,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fallback_routing ON fallback_events(routing_id);
CREATE INDEX IF NOT EXISTS idx_fallback_primary ON fallback_events(primary_model);
CREATE INDEX IF NOT EXISTS idx_fallback_created ON fallback_events(created_at);

-- ============================================================================
-- Rate Limit Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_events (
    id TEXT PRIMARY KEY,
    model TEXT NOT NULL,

    -- Rate limit info
    limit_type TEXT NOT NULL, -- 'requests_per_minute', 'tokens_per_day', etc.
    limit_value INTEGER,
    remaining INTEGER,
    reset_at TIMESTAMP NOT NULL,

    -- Context
    routing_id TEXT REFERENCES routing_decisions(id),
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ratelimit_model ON rate_limit_events(model);
CREATE INDEX IF NOT EXISTS idx_ratelimit_reset ON rate_limit_events(reset_at);

-- ============================================================================
-- Views for Analytics
-- ============================================================================

-- Daily cost summary
CREATE VIEW IF NOT EXISTS v_daily_costs AS
SELECT
    date_only as date,
    model,
    COUNT(*) as requests,
    SUM(cost) as total_cost,
    AVG(cost) as avg_cost,
    SUM(tokens_total) as total_tokens
FROM cost_tracking
GROUP BY date_only, model
ORDER BY date_only DESC, total_cost DESC;

-- Model performance summary
CREATE VIEW IF NOT EXISTS v_model_summary AS
SELECT
    mp.model,
    mp.task_type,
    mp.total_requests,
    ROUND(mp.success_rate * 100, 2) as success_rate_pct,
    ROUND(mp.avg_quality_score, 2) as avg_quality,
    ROUND(mp.avg_cost, 6) as avg_cost,
    mp.avg_latency,
    mp.last_updated
FROM model_performance mp
ORDER BY mp.total_requests DESC;

-- Budget status view
CREATE VIEW IF NOT EXISTS v_budget_status AS
SELECT
    daily_limit,
    daily_spent,
    ROUND((daily_spent / daily_limit) * 100, 2) as daily_usage_pct,
    monthly_limit,
    monthly_spent,
    ROUND((monthly_spent / monthly_limit) * 100, 2) as monthly_usage_pct,
    daily_exceeded,
    monthly_exceeded,
    period_start,
    period_end
FROM budget_tracking
ORDER BY created_at DESC
LIMIT 1;

-- Fallback rate by model
CREATE VIEW IF NOT EXISTS v_fallback_rates AS
SELECT
    primary_model,
    COUNT(*) as fallback_events,
    SUM(CASE WHEN fallback_success THEN 1 ELSE 0 END) as successful_fallbacks,
    ROUND(AVG(CASE WHEN fallback_success THEN 1 ELSE 0 END) * 100, 2) as success_rate_pct,
    COUNT(DISTINCT fallback_model) as unique_fallback_models
FROM fallback_events
GROUP BY primary_model
ORDER BY fallback_events DESC;

-- ============================================================================
-- Triggers for Automatic Updates
-- ============================================================================

-- Update model performance on outcome insert
CREATE TRIGGER IF NOT EXISTS trg_update_performance_on_outcome
AFTER INSERT ON routing_outcomes
BEGIN
    INSERT INTO model_performance (
        id, model, task_type, complexity,
        total_requests, successful_requests, failed_requests,
        total_cost, avg_cost, avg_latency,
        total_tokens_input, total_tokens_output,
        avg_quality_score, sample_size, last_updated
    )
    SELECT
        NEW.id || '-perf',
        rd.model_selected,
        rd.task_type,
        rd.complexity,
        1,
        CASE WHEN NEW.success THEN 1 ELSE 0 END,
        CASE WHEN NEW.success THEN 0 ELSE 1 END,
        NEW.actual_cost,
        NEW.actual_cost,
        NEW.actual_latency,
        NEW.tokens_input,
        NEW.tokens_output,
        NEW.quality_score,
        1,
        CURRENT_TIMESTAMP
    FROM routing_decisions rd
    WHERE rd.id = NEW.routing_id
    ON CONFLICT(model, task_type, complexity) DO UPDATE SET
        total_requests = total_requests + 1,
        successful_requests = successful_requests + (CASE WHEN NEW.success THEN 1 ELSE 0 END),
        failed_requests = failed_requests + (CASE WHEN NEW.success THEN 0 ELSE 1 END),
        total_cost = total_cost + NEW.actual_cost,
        avg_cost = (total_cost + NEW.actual_cost) / (total_requests + 1),
        avg_latency = (COALESCE(avg_latency, 0) * total_requests + NEW.actual_latency) / (total_requests + 1),
        total_tokens_input = total_tokens_input + NEW.tokens_input,
        total_tokens_output = total_tokens_output + NEW.tokens_output,
        avg_quality_score = (COALESCE(avg_quality_score, 0) * sample_size + COALESCE(NEW.quality_score, 0)) / (sample_size + 1),
        sample_size = sample_size + 1,
        last_updated = CURRENT_TIMESTAMP;
END;

-- Update budget tracking on cost insert
CREATE TRIGGER IF NOT EXISTS trg_update_budget_on_cost
AFTER INSERT ON cost_tracking
BEGIN
    UPDATE budget_tracking
    SET
        daily_spent = daily_spent + NEW.cost,
        monthly_spent = monthly_spent + NEW.cost,
        updated_at = CURRENT_TIMESTAMP
    WHERE period_start <= DATE(NEW.created_at)
      AND period_end >= DATE(NEW.created_at);
END;

-- ============================================================================
-- Helper Functions (stored as metadata)
-- ============================================================================

-- Initialize budget for current period
INSERT OR REPLACE INTO budget_tracking (
    id, daily_limit, monthly_limit,
    period_start, period_end, timezone
) VALUES (
    'current-budget',
    10.0,  -- $10/day default
    250.0, -- $250/month default
    DATE('now', 'start of month'),
    DATE('now', 'start of month', '+1 month', '-1 day'),
    'UTC'
);

-- ============================================================================
-- Cleanup Queries (for maintenance)
-- ============================================================================

-- Archive old routing decisions (older than 90 days)
-- DELETE FROM routing_decisions WHERE created_at < DATE('now', '-90 days');

-- Cleanup old cost tracking (older than 90 days)
-- DELETE FROM cost_tracking WHERE created_at < DATE('now', '-90 days');

-- Vacuum database
-- VACUUM;
