-- ============================================
-- AGENT EVOLUTION SYSTEM SCHEMA
-- SQLite compatible schema for agent self-improvement
-- ============================================

-- ============================================
-- PERFORMANCE METRICS TABLE
-- Track task completion metrics for analysis
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  session_id TEXT,
  success INTEGER NOT NULL, -- 0 or 1
  duration_ms INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  user_rating REAL, -- 1-5 scale
  task_type TEXT,
  complexity INTEGER, -- 1-10 scale
  error_type TEXT,
  retry_count INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_perf_agent_time
  ON evolution_performance_metrics(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_success
  ON evolution_performance_metrics(success, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_perf_task_type
  ON evolution_performance_metrics(task_type);

-- ============================================
-- USER FEEDBACK TABLE
-- Track explicit and implicit user feedback
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_user_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  rating REAL NOT NULL, -- 1-5 scale
  comment TEXT,
  feedback_type TEXT NOT NULL, -- explicit, implicit
  retry INTEGER DEFAULT 0,
  edit INTEGER DEFAULT 0,
  edit_type TEXT, -- minor, major, complete_rewrite
  abandoned INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_agent
  ON evolution_user_feedback(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_rating
  ON evolution_user_feedback(rating, timestamp DESC);

-- ============================================
-- TASK FAILURES TABLE
-- Detailed failure tracking for gap analysis
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_task_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT,
  stack_trace TEXT,
  task_type TEXT,
  required_capabilities TEXT, -- JSON array
  attempted_actions TEXT, -- JSON array
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_failures_agent
  ON evolution_task_failures(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_failures_error_type
  ON evolution_task_failures(error_type);
CREATE INDEX IF NOT EXISTS idx_failures_timestamp
  ON evolution_task_failures(timestamp DESC);

-- ============================================
-- PROMPT VARIANTS TABLE
-- Store and track different prompt versions
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_prompt_variants (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  system_prompt TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trial_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  avg_duration REAL DEFAULT 0,
  avg_tokens REAL DEFAULT 0,
  ucb1_score REAL, -- UCB1 algorithm score
  exploration_bonus REAL, -- UCB1 exploration term
  parent_variant_id TEXT,
  mutation_type TEXT, -- manual, automated, evolutionary
  mutation_reason TEXT,
  status TEXT DEFAULT 'testing', -- testing, active, archived
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (parent_variant_id) REFERENCES evolution_prompt_variants(id)
);

CREATE INDEX IF NOT EXISTS idx_variants_agent
  ON evolution_prompt_variants(agent_id, status);
CREATE INDEX IF NOT EXISTS idx_variants_ucb1
  ON evolution_prompt_variants(ucb1_score DESC);
CREATE INDEX IF NOT EXISTS idx_variants_version
  ON evolution_prompt_variants(agent_id, version DESC);

-- ============================================
-- PROMPT HISTORY TABLE
-- Track prompt changes over time
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_prompt_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP,
  total_tasks INTEGER DEFAULT 0,
  success_rate REAL,
  avg_duration REAL,
  token_efficiency REAL,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (variant_id) REFERENCES evolution_prompt_variants(id)
);

CREATE INDEX IF NOT EXISTS idx_history_agent
  ON evolution_prompt_history(agent_id, activated_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_variant
  ON evolution_prompt_history(variant_id);

-- ============================================
-- CAPABILITY GAPS TABLE
-- Identified capability gaps from failures
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_capability_gaps (
  id TEXT PRIMARY KEY,
  identified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  category TEXT NOT NULL, -- missing_skill, tool_limitation, knowledge_gap, pattern_failure
  description TEXT NOT NULL,
  failure_count INTEGER DEFAULT 0,
  affected_tasks TEXT, -- JSON array
  error_patterns TEXT, -- JSON array
  severity TEXT NOT NULL, -- low, medium, high, critical
  frequency REAL, -- failures per day
  status TEXT DEFAULT 'open', -- open, addressing, resolved
  resolution_date TIMESTAMP,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_gaps_category
  ON evolution_capability_gaps(category, status);
CREATE INDEX IF NOT EXISTS idx_gaps_severity
  ON evolution_capability_gaps(severity, identified_at DESC);
CREATE INDEX IF NOT EXISTS idx_gaps_status
  ON evolution_capability_gaps(status);

-- ============================================
-- SKILL SUGGESTIONS TABLE
-- Proposed skills to address gaps
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_skill_suggestions (
  id TEXT PRIMARY KEY,
  skill_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  addresses_gaps TEXT, -- JSON array of gap IDs
  estimated_impact TEXT, -- JSON object with impact metrics
  implementation_complexity TEXT NOT NULL, -- low, medium, high
  required_tools TEXT, -- JSON array
  required_training TEXT, -- JSON array
  status TEXT DEFAULT 'proposed', -- proposed, approved, implemented, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skills_status
  ON evolution_skill_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_skills_category
  ON evolution_skill_suggestions(category);

-- ============================================
-- AGENT VARIANTS TABLE
-- Specialized agent variants
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_agent_variants (
  id TEXT PRIMARY KEY,
  base_agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  prompt TEXT NOT NULL,
  system_prompt TEXT,
  model TEXT DEFAULT 'sonnet',
  temperature REAL,
  tools TEXT, -- JSON array
  skills TEXT, -- JSON array
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trial_count INTEGER DEFAULT 0,
  success_rate REAL,
  avg_duration REAL,
  token_efficiency REAL,
  parent_variant_id TEXT,
  creation_reason TEXT,
  status TEXT DEFAULT 'testing', -- testing, active, archived
  FOREIGN KEY (base_agent_id) REFERENCES agents(id),
  FOREIGN KEY (parent_variant_id) REFERENCES evolution_agent_variants(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_variants_base
  ON evolution_agent_variants(base_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_variants_specialization
  ON evolution_agent_variants(specialization);

-- ============================================
-- IMPLICIT FEEDBACK TABLE
-- Track implicit feedback signals
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_implicit_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL, -- retry, edit, abandon
  edit_type TEXT, -- minor, major, complete_rewrite
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_implicit_feedback_agent
  ON evolution_implicit_feedback(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_implicit_feedback_type
  ON evolution_implicit_feedback(feedback_type, timestamp DESC);

-- ============================================
-- EVOLUTION REPORTS TABLE
-- Store periodic evolution reports
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  report_data TEXT NOT NULL, -- JSON full report
  summary TEXT -- JSON summary
);

CREATE INDEX IF NOT EXISTS idx_reports_date
  ON evolution_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_period
  ON evolution_reports(period_start, period_end);

-- ============================================
-- EVOLUTION STATE TABLE
-- Track evolution state per agent
-- ============================================
CREATE TABLE IF NOT EXISTS evolution_state (
  agent_id TEXT PRIMARY KEY,
  current_variant_id TEXT,
  total_trials INTEGER DEFAULT 0,
  last_evolution_at TIMESTAMP,
  performance_trend TEXT, -- improving, stable, declining
  next_review_at TIMESTAMP,
  auto_evolution_paused INTEGER DEFAULT 0,
  pause_reason TEXT,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (current_variant_id) REFERENCES evolution_prompt_variants(id)
);

-- ============================================
-- VIEWS FOR ANALYSIS
-- ============================================

-- Agent performance summary view
CREATE VIEW IF NOT EXISTS v_evolution_agent_performance AS
SELECT
  a.id as agent_id,
  a.name as agent_name,
  COUNT(m.id) as total_tasks,
  AVG(CAST(m.success AS REAL)) as success_rate,
  AVG(m.duration_ms) as avg_duration,
  AVG(m.token_count) as avg_tokens,
  SUM(m.success) * 1000.0 / NULLIF(SUM(m.token_count), 0) as token_efficiency,
  MAX(m.timestamp) as last_active
FROM agents a
LEFT JOIN evolution_performance_metrics m ON a.id = m.agent_id
GROUP BY a.id, a.name;

-- Recent failures view
CREATE VIEW IF NOT EXISTS v_evolution_recent_failures AS
SELECT
  f.*,
  a.name as agent_name,
  t.title as task_title
FROM evolution_task_failures f
JOIN agents a ON f.agent_id = a.id
LEFT JOIN tasks t ON f.task_id = t.id
WHERE f.timestamp >= datetime('now', '-7 days')
ORDER BY f.timestamp DESC;

-- Active gaps view
CREATE VIEW IF NOT EXISTS v_evolution_active_gaps AS
SELECT
  g.*,
  COUNT(DISTINCT json_each.value) as affected_task_count
FROM evolution_capability_gaps g,
     json_each(g.affected_tasks)
WHERE g.status = 'open'
GROUP BY g.id
ORDER BY g.severity DESC, g.frequency DESC;

-- Prompt performance comparison view
CREATE VIEW IF NOT EXISTS v_evolution_prompt_comparison AS
SELECT
  v.agent_id,
  v.version,
  v.trial_count,
  v.success_rate,
  v.avg_duration,
  v.avg_tokens,
  v.ucb1_score,
  v.status,
  LAG(v.success_rate) OVER (PARTITION BY v.agent_id ORDER BY v.version) as prev_success_rate,
  v.success_rate - LAG(v.success_rate) OVER (PARTITION BY v.agent_id ORDER BY v.version) as improvement
FROM evolution_prompt_variants v
ORDER BY v.agent_id, v.version DESC;

-- Weekly performance trend view
CREATE VIEW IF NOT EXISTS v_evolution_weekly_trend AS
SELECT
  agent_id,
  strftime('%Y-%W', timestamp) as week,
  COUNT(*) as tasks,
  AVG(CAST(success AS REAL)) as success_rate,
  AVG(duration_ms) as avg_duration,
  SUM(token_count) as total_tokens
FROM evolution_performance_metrics
GROUP BY agent_id, strftime('%Y-%W', timestamp)
ORDER BY agent_id, week DESC;

-- ============================================
-- TRIGGERS FOR AUTOMATIC MAINTENANCE
-- ============================================

-- Update prompt variant stats on new metrics
CREATE TRIGGER IF NOT EXISTS trg_update_variant_stats
AFTER INSERT ON evolution_performance_metrics
WHEN NEW.agent_id IN (
  SELECT agent_id FROM evolution_prompt_variants WHERE status = 'active'
)
BEGIN
  UPDATE evolution_prompt_variants
  SET trial_count = trial_count + 1,
      success_count = success_count + (CASE WHEN NEW.success = 1 THEN 1 ELSE 0 END),
      success_rate = CAST(success_count AS REAL) / trial_count,
      avg_duration = (avg_duration * (trial_count - 1) + NEW.duration_ms) / trial_count,
      avg_tokens = (avg_tokens * (trial_count - 1) + NEW.token_count) / trial_count
  WHERE agent_id = NEW.agent_id AND status = 'active';
END;

-- Auto-update evolution state trend
CREATE TRIGGER IF NOT EXISTS trg_update_evolution_trend
AFTER INSERT ON evolution_performance_metrics
BEGIN
  UPDATE evolution_state
  SET performance_trend = (
    SELECT
      CASE
        WHEN recent_rate - previous_rate > 0.05 THEN 'improving'
        WHEN recent_rate - previous_rate < -0.05 THEN 'declining'
        ELSE 'stable'
      END
    FROM (
      SELECT
        AVG(CASE WHEN timestamp >= datetime('now', '-7 days') THEN CAST(success AS REAL) END) as recent_rate,
        AVG(CASE WHEN timestamp >= datetime('now', '-14 days') AND timestamp < datetime('now', '-7 days') THEN CAST(success AS REAL) END) as previous_rate
      FROM evolution_performance_metrics
      WHERE agent_id = NEW.agent_id
    )
  )
  WHERE agent_id = NEW.agent_id;
END;

-- ============================================
-- MIGRATION LOG
-- ============================================
INSERT INTO migrations (name, applied_at)
VALUES ('evolution_system_schema_v1', CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
