-- Plugin Discovery System Database Schema
-- SQLite compatible with FTS5 for full-text search

-- ============================================
-- PLUGIN INDEX TABLE
-- Core plugin metadata for search and discovery
-- ============================================
CREATE TABLE IF NOT EXISTS plugin_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    author_name TEXT,
    author_email TEXT,
    license TEXT,
    homepage TEXT,
    repository_url TEXT,
    category TEXT,  -- agents, skills, commands, workflows, tools
    tags TEXT,  -- JSON array of tags
    keywords TEXT,  -- Space-separated keywords for indexing
    readme_content TEXT,  -- Full README for content analysis
    downloads INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,  -- Average rating 0-5
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    last_modified_at TIMESTAMP,
    is_featured BOOLEAN DEFAULT 0,
    is_deprecated BOOLEAN DEFAULT 0,
    metadata TEXT  -- JSON for additional properties
);

CREATE INDEX IF NOT EXISTS idx_plugin_name ON plugin_index(name);
CREATE INDEX IF NOT EXISTS idx_plugin_category ON plugin_index(category);
CREATE INDEX IF NOT EXISTS idx_plugin_downloads ON plugin_index(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_rating ON plugin_index(rating DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_updated ON plugin_index(updated_at DESC);

-- ============================================
-- FULL-TEXT SEARCH TABLE (FTS5)
-- Virtual table for efficient text search
-- ============================================
CREATE VIRTUAL TABLE IF NOT EXISTS plugin_search USING fts5(
    plugin_id UNINDEXED,
    name,
    description,
    author_name,
    keywords,
    readme_content,
    tags,
    content=plugin_index,
    content_rowid=id,
    tokenize='porter unicode61'
);

-- Triggers to keep FTS5 table in sync
CREATE TRIGGER IF NOT EXISTS plugin_search_insert AFTER INSERT ON plugin_index BEGIN
    INSERT INTO plugin_search(rowid, plugin_id, name, description, author_name, keywords, readme_content, tags)
    VALUES (new.id, new.plugin_id, new.name, new.description, new.author_name, new.keywords, new.readme_content, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS plugin_search_delete AFTER DELETE ON plugin_index BEGIN
    DELETE FROM plugin_search WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS plugin_search_update AFTER UPDATE ON plugin_index BEGIN
    DELETE FROM plugin_search WHERE rowid = old.id;
    INSERT INTO plugin_search(rowid, plugin_id, name, description, author_name, keywords, readme_content, tags)
    VALUES (new.id, new.plugin_id, new.name, new.description, new.author_name, new.keywords, new.readme_content, new.tags);
END;

-- ============================================
-- INSTALL STATISTICS TABLE
-- Track plugin installations for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS install_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,  -- Optional user identifier
    version TEXT,
    uninstalled_at TIMESTAMP,
    installation_source TEXT,  -- search, recommendation, manual, etc.
    FOREIGN KEY (plugin_id) REFERENCES plugin_index(plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_install_plugin ON install_stats(plugin_id);
CREATE INDEX IF NOT EXISTS idx_install_date ON install_stats(installed_at DESC);
CREATE INDEX IF NOT EXISTS idx_install_user ON install_stats(user_id);

-- ============================================
-- SEARCH ANALYTICS TABLE
-- Track search queries and results
-- ============================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    filters TEXT,  -- JSON filters applied
    results_count INTEGER,
    clicked_plugin_id TEXT,  -- Plugin clicked from results
    click_position INTEGER,  -- Position in results (1-based)
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id TEXT,
    user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_search_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_date ON search_analytics(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_clicked ON search_analytics(clicked_plugin_id);

-- ============================================
-- RECOMMENDATION CACHE TABLE
-- Cache computed recommendations with TTL
-- ============================================
CREATE TABLE IF NOT EXISTS recommendation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT UNIQUE NOT NULL,  -- Hash of context
    recommendation_type TEXT NOT NULL,  -- collaborative, content_based, similar, trending
    context TEXT,  -- JSON context used for recommendation
    results TEXT NOT NULL,  -- JSON array of plugin_ids with scores
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cache_key ON recommendation_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON recommendation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_type ON recommendation_cache(recommendation_type);

-- ============================================
-- PLUGIN RELATIONSHIPS TABLE
-- Track co-installation patterns for collaborative filtering
-- ============================================
CREATE TABLE IF NOT EXISTS plugin_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_a TEXT NOT NULL,
    plugin_b TEXT NOT NULL,
    co_install_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,  -- Confidence score for recommendation
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plugin_a, plugin_b),
    FOREIGN KEY (plugin_a) REFERENCES plugin_index(plugin_id),
    FOREIGN KEY (plugin_b) REFERENCES plugin_index(plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_relationship_a ON plugin_relationships(plugin_a, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_relationship_b ON plugin_relationships(plugin_b, confidence DESC);

-- ============================================
-- TF-IDF INDEX TABLE
-- Pre-computed TF-IDF scores for terms
-- ============================================
CREATE TABLE IF NOT EXISTS tfidf_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    term_frequency REAL NOT NULL,  -- TF score
    inverse_document_frequency REAL NOT NULL,  -- IDF score
    tfidf_score REAL NOT NULL,  -- TF * IDF
    field TEXT NOT NULL,  -- name, description, keywords, etc.
    last_computed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plugin_id) REFERENCES plugin_index(plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_tfidf_term ON tfidf_index(term);
CREATE INDEX IF NOT EXISTS idx_tfidf_plugin ON tfidf_index(plugin_id);
CREATE INDEX IF NOT EXISTS idx_tfidf_score ON tfidf_index(tfidf_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tfidf_unique ON tfidf_index(term, plugin_id, field);

-- ============================================
-- DOCUMENT FREQUENCY TABLE
-- Track document frequency for IDF calculation
-- ============================================
CREATE TABLE IF NOT EXISTS document_frequency (
    term TEXT PRIMARY KEY,
    document_count INTEGER NOT NULL,
    total_documents INTEGER NOT NULL,
    idf_score REAL NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRENDING PLUGINS TABLE
-- Track recent install velocity for trending algorithm
-- ============================================
CREATE TABLE IF NOT EXISTS trending_plugins (
    plugin_id TEXT PRIMARY KEY,
    installs_today INTEGER DEFAULT 0,
    installs_week INTEGER DEFAULT 0,
    installs_month INTEGER DEFAULT 0,
    velocity_score REAL DEFAULT 0.0,  -- Weighted velocity metric
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plugin_id) REFERENCES plugin_index(plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_trending_velocity ON trending_plugins(velocity_score DESC);

-- ============================================
-- USER INSTALLED PLUGINS TABLE
-- Track what each user has installed for personalization
-- ============================================
CREATE TABLE IF NOT EXISTS user_installed_plugins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    UNIQUE(user_id, plugin_id),
    FOREIGN KEY (plugin_id) REFERENCES plugin_index(plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_user_plugins ON user_installed_plugins(user_id, is_active);

-- ============================================
-- SEARCH GAPS TABLE
-- Track queries with no or poor results
-- ============================================
CREATE TABLE IF NOT EXISTS search_gaps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    results_count INTEGER,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    occurrence_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'open',  -- open, addressed, ignored
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_gaps_query ON search_gaps(query);
CREATE INDEX IF NOT EXISTS idx_gaps_count ON search_gaps(occurrence_count DESC);

-- ============================================
-- CATEGORIES TABLE
-- Plugin categories with metadata
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    parent_category TEXT,
    plugin_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_category_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_category_order ON categories(sort_order);

-- Pre-populate categories
INSERT OR IGNORE INTO categories (name, display_name, description, sort_order) VALUES
    ('agents', 'Agents', 'Autonomous agents for various tasks', 1),
    ('skills', 'Skills', 'Reusable skills and capabilities', 2),
    ('commands', 'Commands', 'CLI commands and tools', 3),
    ('workflows', 'Workflows', 'Pre-built workflows and processes', 4),
    ('hooks', 'Hooks', 'Event hooks and triggers', 5),
    ('templates', 'Templates', 'Project and code templates', 6),
    ('tools', 'Tools', 'Development tools and utilities', 7);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Popular plugins view
CREATE VIEW IF NOT EXISTS v_popular_plugins AS
SELECT
    pi.*,
    COALESCE(tp.velocity_score, 0) as trending_score,
    COUNT(DISTINCT is2.user_id) as unique_installs
FROM plugin_index pi
LEFT JOIN trending_plugins tp ON pi.plugin_id = tp.plugin_id
LEFT JOIN install_stats is2 ON pi.plugin_id = is2.plugin_id AND is2.uninstalled_at IS NULL
WHERE pi.is_deprecated = 0
GROUP BY pi.plugin_id
ORDER BY pi.downloads DESC, pi.rating DESC;

-- Recent plugins view
CREATE VIEW IF NOT EXISTS v_recent_plugins AS
SELECT *
FROM plugin_index
WHERE is_deprecated = 0
ORDER BY published_at DESC
LIMIT 50;

-- Featured plugins view
CREATE VIEW IF NOT EXISTS v_featured_plugins AS
SELECT *
FROM plugin_index
WHERE is_featured = 1 AND is_deprecated = 0
ORDER BY rating DESC, downloads DESC;

-- Search query popularity view
CREATE VIEW IF NOT EXISTS v_popular_searches AS
SELECT
    query,
    COUNT(*) as search_count,
    AVG(results_count) as avg_results,
    MAX(searched_at) as last_searched
FROM search_analytics
WHERE searched_at >= datetime('now', '-30 days')
GROUP BY query
ORDER BY search_count DESC
LIMIT 100;

-- Click-through rate view
CREATE VIEW IF NOT EXISTS v_search_ctr AS
SELECT
    query,
    COUNT(*) as total_searches,
    SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) as clicks,
    ROUND(100.0 * SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as ctr_percent
FROM search_analytics
WHERE searched_at >= datetime('now', '-7 days')
GROUP BY query
HAVING total_searches >= 5
ORDER BY total_searches DESC;
