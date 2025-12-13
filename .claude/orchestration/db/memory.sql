-- Agent Memory System Database Schema
-- SQLite with FTS5 (Full-Text Search) support
-- Version: 1.0.0

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- =============================================================================
-- EPISODES TABLE
-- Stores complete task execution records
-- =============================================================================

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  task_description TEXT NOT NULL,
  context TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('success', 'failure', 'partial')),
  timestamp INTEGER NOT NULL, -- Unix timestamp in milliseconds
  end_time INTEGER,
  duration INTEGER, -- Duration in milliseconds
  agent_type TEXT,
  parent_task_id TEXT,
  notes TEXT,
  access_count INTEGER DEFAULT 0,
  last_accessed INTEGER,
  quality REAL DEFAULT 0.5 CHECK(quality >= 0 AND quality <= 1),
  namespace TEXT DEFAULT 'default',

  -- Indexes
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Indexes for episodes
CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes(timestamp);
CREATE INDEX IF NOT EXISTS idx_episodes_outcome ON episodes(outcome);
CREATE INDEX IF NOT EXISTS idx_episodes_agent_type ON episodes(agent_type);
CREATE INDEX IF NOT EXISTS idx_episodes_namespace ON episodes(namespace);
CREATE INDEX IF NOT EXISTS idx_episodes_quality ON episodes(quality);
CREATE INDEX IF NOT EXISTS idx_episodes_parent_task ON episodes(parent_task_id);

-- =============================================================================
-- EPISODE TAGS
-- Many-to-many relationship for episode categorization
-- =============================================================================

CREATE TABLE IF NOT EXISTS episode_tags (
  episode_id TEXT NOT NULL,
  tag TEXT NOT NULL,

  PRIMARY KEY (episode_id, tag),
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_episode_tags_tag ON episode_tags(tag);

-- =============================================================================
-- ACTIONS TABLE
-- Individual actions within episodes
-- =============================================================================

CREATE TABLE IF NOT EXISTS actions (
  id TEXT PRIMARY KEY,
  episode_id TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters TEXT, -- JSON
  result TEXT, -- JSON
  timestamp INTEGER NOT NULL,
  duration INTEGER,
  success INTEGER NOT NULL CHECK(success IN (0, 1)),
  error TEXT,
  order_index INTEGER NOT NULL,

  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_actions_episode ON actions(episode_id);
CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(type);
CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON actions(timestamp);

-- =============================================================================
-- EPISODE EMBEDDINGS
-- Vector embeddings for semantic search
-- =============================================================================

CREATE TABLE IF NOT EXISTS episode_embeddings (
  episode_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL, -- Serialized float32 array
  dimensions INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,

  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- =============================================================================
-- FACTS TABLE
-- Knowledge graph facts (subject-predicate-object triples)
-- =============================================================================

CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  confirmations INTEGER DEFAULT 1,
  contradictions INTEGER DEFAULT 0,
  namespace TEXT DEFAULT 'default',

  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Indexes for facts
CREATE INDEX IF NOT EXISTS idx_facts_subject ON facts(subject);
CREATE INDEX IF NOT EXISTS idx_facts_predicate ON facts(predicate);
CREATE INDEX IF NOT EXISTS idx_facts_object ON facts(object);
CREATE INDEX IF NOT EXISTS idx_facts_namespace ON facts(namespace);
CREATE INDEX IF NOT EXISTS idx_facts_confidence ON facts(confidence);

-- Composite index for triple lookups
CREATE INDEX IF NOT EXISTS idx_facts_triple ON facts(subject, predicate, object);

-- =============================================================================
-- FACT TAGS
-- Many-to-many relationship for fact categorization
-- =============================================================================

CREATE TABLE IF NOT EXISTS fact_tags (
  fact_id TEXT NOT NULL,
  tag TEXT NOT NULL,

  PRIMARY KEY (fact_id, tag),
  FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fact_tags_tag ON fact_tags(tag);

-- =============================================================================
-- PROCEDURES TABLE
-- Reusable action sequences
-- =============================================================================

CREATE TABLE IF NOT EXISTS procedures (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_pattern TEXT NOT NULL,
  description TEXT,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  created INTEGER NOT NULL,
  last_updated INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  namespace TEXT DEFAULT 'default',

  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Indexes for procedures
CREATE INDEX IF NOT EXISTS idx_procedures_name ON procedures(name);
CREATE INDEX IF NOT EXISTS idx_procedures_namespace ON procedures(namespace);
CREATE INDEX IF NOT EXISTS idx_procedures_usage ON procedures(usage_count);

-- =============================================================================
-- PROCEDURE STEPS
-- Steps within procedures
-- =============================================================================

CREATE TABLE IF NOT EXISTS procedure_steps (
  id TEXT PRIMARY KEY,
  procedure_id TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL,
  parameters TEXT, -- JSON
  expected_outcome TEXT,
  condition TEXT,

  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  UNIQUE(procedure_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_procedure_steps_procedure ON procedure_steps(procedure_id);

-- =============================================================================
-- PROCEDURE TAGS
-- Many-to-many relationship for procedure categorization
-- =============================================================================

CREATE TABLE IF NOT EXISTS procedure_tags (
  procedure_id TEXT NOT NULL,
  tag TEXT NOT NULL,

  PRIMARY KEY (procedure_id, tag),
  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_procedure_tags_tag ON procedure_tags(tag);

-- =============================================================================
-- PROCEDURE SOURCE EPISODES
-- Track which episodes a procedure was derived from
-- =============================================================================

CREATE TABLE IF NOT EXISTS procedure_sources (
  procedure_id TEXT NOT NULL,
  episode_id TEXT NOT NULL,

  PRIMARY KEY (procedure_id, episode_id),
  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- =============================================================================
-- PROCEDURE PRECONDITIONS AND POSTCONDITIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS procedure_conditions (
  id TEXT PRIMARY KEY,
  procedure_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('precondition', 'postcondition')),
  condition_text TEXT NOT NULL,
  order_index INTEGER NOT NULL,

  FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_procedure_conditions ON procedure_conditions(procedure_id, type);

-- =============================================================================
-- FULL-TEXT SEARCH (FTS5)
-- Virtual tables for fast text search
-- =============================================================================

-- Episodes FTS
CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
  id UNINDEXED,
  task_description,
  context,
  notes,
  content=episodes,
  content_rowid=rowid,
  tokenize='porter unicode61'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS episodes_ai AFTER INSERT ON episodes BEGIN
  INSERT INTO episodes_fts(rowid, id, task_description, context, notes)
  VALUES (new.rowid, new.id, new.task_description, new.context, new.notes);
END;

CREATE TRIGGER IF NOT EXISTS episodes_ad AFTER DELETE ON episodes BEGIN
  DELETE FROM episodes_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS episodes_au AFTER UPDATE ON episodes BEGIN
  DELETE FROM episodes_fts WHERE rowid = old.rowid;
  INSERT INTO episodes_fts(rowid, id, task_description, context, notes)
  VALUES (new.rowid, new.id, new.task_description, new.context, new.notes);
END;

-- Facts FTS
CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
  id UNINDEXED,
  subject,
  predicate,
  object,
  content=facts,
  content_rowid=rowid,
  tokenize='porter unicode61'
);

-- Triggers for facts FTS
CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
  INSERT INTO facts_fts(rowid, id, subject, predicate, object)
  VALUES (new.rowid, new.id, new.subject, new.predicate, new.object);
END;

CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
  DELETE FROM facts_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS facts_au AFTER UPDATE ON facts BEGIN
  DELETE FROM facts_fts WHERE rowid = old.rowid;
  INSERT INTO facts_fts(rowid, id, subject, predicate, object)
  VALUES (new.rowid, new.id, new.subject, new.predicate, new.object);
END;

-- Procedures FTS
CREATE VIRTUAL TABLE IF NOT EXISTS procedures_fts USING fts5(
  id UNINDEXED,
  name,
  trigger_pattern,
  description,
  content=procedures,
  content_rowid=rowid,
  tokenize='porter unicode61'
);

-- Triggers for procedures FTS
CREATE TRIGGER IF NOT EXISTS procedures_ai AFTER INSERT ON procedures BEGIN
  INSERT INTO procedures_fts(rowid, id, name, trigger_pattern, description)
  VALUES (new.rowid, new.id, new.name, new.trigger_pattern, new.description);
END;

CREATE TRIGGER IF NOT EXISTS procedures_ad AFTER DELETE ON procedures BEGIN
  DELETE FROM procedures_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS procedures_au AFTER UPDATE ON procedures BEGIN
  DELETE FROM procedures_fts WHERE rowid = old.rowid;
  INSERT INTO procedures_fts(rowid, id, name, trigger_pattern, description)
  VALUES (new.rowid, new.id, new.name, new.trigger_pattern, new.description);
END;

-- =============================================================================
-- METADATA TABLE
-- System metadata and configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS memory_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Initialize metadata
INSERT OR IGNORE INTO memory_metadata (key, value) VALUES
  ('schema_version', '1.0.0'),
  ('created_at', strftime('%s', 'now') * 1000),
  ('namespace', 'default');

-- =============================================================================
-- VIEWS
-- Convenient views for common queries
-- =============================================================================

-- Episode summary view
CREATE VIEW IF NOT EXISTS v_episode_summary AS
SELECT
  e.id,
  e.task_description,
  e.outcome,
  e.timestamp,
  e.duration,
  e.agent_type,
  e.quality,
  e.access_count,
  COUNT(a.id) as action_count,
  GROUP_CONCAT(et.tag, ',') as tags
FROM episodes e
LEFT JOIN actions a ON e.id = a.episode_id
LEFT JOIN episode_tags et ON e.id = et.episode_id
GROUP BY e.id;

-- Procedure summary view
CREATE VIEW IF NOT EXISTS v_procedure_summary AS
SELECT
  p.id,
  p.name,
  p.trigger_pattern,
  p.success_count,
  p.failure_count,
  p.usage_count,
  CASE
    WHEN (p.success_count + p.failure_count) > 0
    THEN CAST(p.success_count AS REAL) / (p.success_count + p.failure_count)
    ELSE 0
  END as success_rate,
  COUNT(ps.id) as step_count,
  GROUP_CONCAT(pt.tag, ',') as tags
FROM procedures p
LEFT JOIN procedure_steps ps ON p.id = ps.procedure_id
LEFT JOIN procedure_tags pt ON p.id = pt.procedure_id
GROUP BY p.id;

-- Knowledge graph view
CREATE VIEW IF NOT EXISTS v_knowledge_graph AS
SELECT
  f.subject,
  f.predicate,
  f.object,
  f.confidence,
  f.source,
  f.confirmations,
  f.contradictions,
  GROUP_CONCAT(ft.tag, ',') as tags
FROM facts f
LEFT JOIN fact_tags ft ON f.id = ft.fact_id
GROUP BY f.id;

-- =============================================================================
-- UTILITY FUNCTIONS (via queries)
-- =============================================================================

-- Example: Get top N most similar episodes (requires application-level vector similarity)
-- This would be called from TypeScript code with pre-computed similarity scores

-- Example: Get entity knowledge
-- SELECT * FROM v_knowledge_graph WHERE subject = 'entity_name';

-- Example: Search episodes by text
-- SELECT * FROM episodes WHERE id IN (
--   SELECT id FROM episodes_fts WHERE episodes_fts MATCH 'search query'
-- );
