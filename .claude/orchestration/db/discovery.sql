-- ============================================================================
-- PLUGIN DISCOVERY SYSTEM DATABASE SCHEMA
-- ============================================================================
-- SQLite-compatible schema for intelligent plugin discovery with semantic
-- search, AI-powered recommendations, and comprehensive analytics.
--
-- Part of the Claude Code Plugin Ecosystem
-- Establishes scalable data management patterns for plugin search and discovery
-- ============================================================================

-- ============================================================================
-- PLUGIN INDEX TABLE
-- Core searchable plugin metadata with full-text search capabilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS plugin_index (
    id TEXT PRIMARY KEY,                          -- Plugin unique identifier
    name TEXT NOT NULL UNIQUE,                    -- Plugin name
    version TEXT NOT NULL,                        -- Latest version
    description TEXT,                             -- Plugin description
    author TEXT,                                  -- Author name
    author_email TEXT,                            -- Author contact
    license TEXT,                                 -- License type
    homepage TEXT,                                -- Homepage URL
    repository_url TEXT,                          -- Source repository
    repository_type TEXT,                         -- git, github, gitlab, etc.

    -- Categorization and discoverability
    category TEXT NOT NULL,                       -- Primary category
    subcategory TEXT,                             -- Secondary classification
    tags TEXT,                                    -- JSON array of tags
    keywords TEXT,                                -- JSON array of extracted keywords

    -- Content for search
    readme_content TEXT,                          -- Full README text
    documentation_url TEXT,                       -- Documentation link

    -- Semantic search support
    embedding TEXT,                               -- JSON array of embedding vector (768-dim typical)
    embedding_model TEXT DEFAULT 'text-embedding-ada-002', -- Model used for embedding

    -- Dependency and compatibility
    dependencies TEXT,                            -- JSON object of dependencies
    peer_dependencies TEXT,                       -- JSON object of peer deps
    minimum_claude_version TEXT,                  -- Minimum required Claude version
    compatible_platforms TEXT,                    -- JSON array of platforms

    -- Metrics and quality indicators
    download_count INTEGER DEFAULT 0,             -- Total downloads
    install_count INTEGER DEFAULT 0,              -- Current installations
    star_count INTEGER DEFAULT 0,                 -- GitHub stars (if applicable)
    average_rating REAL DEFAULT 0.0,              -- Weighted average rating
    review_count INTEGER DEFAULT 0,               -- Number of reviews
    quality_score REAL DEFAULT 0.0,               -- Computed quality score (0-100)

    -- Freshness and activity
    published_at TIMESTAMP,                       -- First publication date
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last update
    last_indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Last indexing time
    is_deprecated BOOLEAN DEFAULT 0,              -- Deprecation flag
    deprecation_message TEXT,                     -- Deprecation notice

    -- Content hash for change detection
    content_hash TEXT NOT NULL,                   -- SHA-256 of indexed content

    -- Metadata
    metadata TEXT,                                -- Additional JSON metadata

    -- Searchability flags
    is_searchable BOOLEAN DEFAULT 1,              -- Include in search results
    is_featured BOOLEAN DEFAULT 0                 -- Featured/promoted plugin
);

CREATE INDEX IF NOT EXISTS idx_plugin_index_name ON plugin_index(name);
CREATE INDEX IF NOT EXISTS idx_plugin_index_category ON plugin_index(category);
CREATE INDEX IF NOT EXISTS idx_plugin_index_author ON plugin_index(author);
CREATE INDEX IF NOT EXISTS idx_plugin_index_quality ON plugin_index(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_index_rating ON plugin_index(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_index_updated ON plugin_index(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_index_searchable ON plugin_index(is_searchable) WHERE is_searchable = 1;

-- ============================================================================
-- FULL-TEXT SEARCH INDEX (FTS5)
-- Virtual table for fast keyword search across plugin content
-- ============================================================================
CREATE VIRTUAL TABLE IF NOT EXISTS plugin_search_index USING fts5(
    plugin_id UNINDEXED,                          -- Link to plugin_index.id
    name,                                          -- Plugin name (high weight)
    description,                                   -- Description (medium weight)
    tags,                                          -- Tags (high weight)
    keywords,                                      -- Extracted keywords (high weight)
    readme_content,                                -- Full text (low weight)
    author,                                        -- Author name
    tokenize = 'porter unicode61',                -- Porter stemming + Unicode support
    content='plugin_index',                        -- Linked to plugin_index table
    content_rowid='rowid'                          -- Use plugin_index rowid
);

-- Triggers to keep FTS5 index synchronized
CREATE TRIGGER IF NOT EXISTS plugin_search_insert AFTER INSERT ON plugin_index BEGIN
    INSERT INTO plugin_search_index(rowid, plugin_id, name, description, tags, keywords, readme_content, author)
    VALUES (new.rowid, new.id, new.name, new.description, new.tags, new.keywords, new.readme_content, new.author);
END;

CREATE TRIGGER IF NOT EXISTS plugin_search_delete AFTER DELETE ON plugin_index BEGIN
    DELETE FROM plugin_search_index WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS plugin_search_update AFTER UPDATE ON plugin_index BEGIN
    DELETE FROM plugin_search_index WHERE rowid = old.rowid;
    INSERT INTO plugin_search_index(rowid, plugin_id, name, description, tags, keywords, readme_content, author)
    VALUES (new.rowid, new.id, new.name, new.description, new.tags, new.keywords, new.readme_content, new.author);
END;

-- ============================================================================
-- SEARCH HISTORY TABLE
-- Track search queries for analytics and recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,                              -- User session identifier
    user_id TEXT,                                 -- User identifier (if authenticated)

    -- Query details
    query_text TEXT NOT NULL,                     -- Search query
    query_type TEXT DEFAULT 'hybrid',             -- keyword, semantic, hybrid
    filters TEXT,                                 -- JSON object of applied filters

    -- Results
    result_count INTEGER DEFAULT 0,               -- Number of results returned
    result_ids TEXT,                              -- JSON array of result plugin IDs
    top_result_id TEXT,                           -- ID of top result

    -- User interaction
    clicked_result_id TEXT,                       -- Which result was clicked (if any)
    clicked_rank INTEGER,                         -- Rank of clicked result
    time_to_click INTEGER,                        -- Milliseconds to click

    -- Performance metrics
    search_duration_ms INTEGER,                   -- Search execution time

    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (clicked_result_id) REFERENCES plugin_index(id)
);

CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query_text);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_session ON search_history(session_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created ON search_history(created_at DESC);

-- ============================================================================
-- USER INSTALLS TABLE
-- Track plugin installation lifecycle for collaborative filtering
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_installs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                        -- User identifier
    plugin_id TEXT NOT NULL,                      -- Plugin identifier
    plugin_name TEXT NOT NULL,                    -- Plugin name (denormalized)
    version TEXT NOT NULL,                        -- Installed version

    -- Lifecycle timestamps
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uninstalled_at TIMESTAMP,                     -- NULL if currently installed
    last_used_at TIMESTAMP,                       -- Last usage timestamp

    -- Installation context
    install_source TEXT,                          -- search, recommendation, manual, dependency
    install_context TEXT,                         -- JSON metadata about installation

    -- Usage metrics
    usage_count INTEGER DEFAULT 0,                -- Number of times used
    usage_duration INTEGER DEFAULT 0,             -- Total usage time (seconds)

    FOREIGN KEY (plugin_id) REFERENCES plugin_index(id)
);

CREATE INDEX IF NOT EXISTS idx_user_installs_user ON user_installs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_installs_plugin ON user_installs(plugin_id);
CREATE INDEX IF NOT EXISTS idx_user_installs_active ON user_installs(user_id, plugin_id) WHERE uninstalled_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_installs_installed ON user_installs(installed_at DESC);

-- ============================================================================
-- RECOMMENDATIONS TABLE
-- Track recommendations shown and their effectiveness
-- ============================================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,                        -- User identifier
    session_id TEXT,                              -- Session identifier

    -- Recommendation details
    plugin_id TEXT NOT NULL,                      -- Recommended plugin
    recommendation_type TEXT NOT NULL,            -- collaborative, content, trending, contextual, personalized
    score REAL NOT NULL,                          -- Recommendation confidence score (0-1)
    reason TEXT,                                  -- Human-readable explanation
    context TEXT,                                 -- JSON metadata about recommendation context

    -- Display and interaction
    shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clicked_at TIMESTAMP,                         -- When user clicked (if they did)
    installed_at TIMESTAMP,                       -- When user installed (if they did)
    dismissed_at TIMESTAMP,                       -- When user dismissed (if they did)

    -- Position in recommendation list
    rank INTEGER,                                 -- Position shown (1 = first)

    FOREIGN KEY (plugin_id) REFERENCES plugin_index(id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_plugin ON recommendations(plugin_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_shown ON recommendations(shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(recommendation_type);

-- ============================================================================
-- RATINGS TABLE
-- Plugin ratings and reviews with sentiment analysis
-- ============================================================================
CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_id TEXT NOT NULL,                      -- Plugin being rated
    user_id TEXT NOT NULL,                        -- User providing rating

    -- Rating details
    stars INTEGER NOT NULL CHECK(stars BETWEEN 1 AND 5), -- 1-5 star rating
    review_title TEXT,                            -- Optional review title
    review_text TEXT,                             -- Optional review text

    -- Sentiment analysis (computed)
    sentiment_score REAL,                         -- -1 to 1 (negative to positive)
    sentiment_label TEXT,                         -- negative, neutral, positive
    sentiment_confidence REAL,                    -- 0-1 confidence score

    -- Context
    version_reviewed TEXT,                        -- Plugin version reviewed
    verified_install BOOLEAN DEFAULT 0,           -- User actually installed this plugin

    -- Community feedback
    helpful_count INTEGER DEFAULT 0,              -- Number of "helpful" votes
    not_helpful_count INTEGER DEFAULT 0,          -- Number of "not helpful" votes
    helpful_ratio REAL DEFAULT 0.0,               -- Computed helpful ratio

    -- Moderation
    is_flagged BOOLEAN DEFAULT 0,                 -- Community flagged for review
    flag_count INTEGER DEFAULT 0,                 -- Number of flags
    is_approved BOOLEAN DEFAULT 1,                -- Moderator approved
    moderator_notes TEXT,                         -- Internal moderation notes

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Author response
    author_response TEXT,                         -- Plugin author's response
    author_response_at TIMESTAMP,                 -- When author responded

    UNIQUE(plugin_id, user_id),                   -- One review per user per plugin
    FOREIGN KEY (plugin_id) REFERENCES plugin_index(id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_plugin ON ratings(plugin_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_stars ON ratings(stars DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_helpful ON ratings(helpful_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_created ON ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_approved ON ratings(is_approved) WHERE is_approved = 1;

-- ============================================================================
-- REVIEW VOTES TABLE
-- Track helpful/not helpful votes on reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS review_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,                   -- Rating being voted on
    user_id TEXT NOT NULL,                        -- User voting
    helpful BOOLEAN NOT NULL,                     -- TRUE = helpful, FALSE = not helpful
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(review_id, user_id),                   -- One vote per user per review
    FOREIGN KEY (review_id) REFERENCES ratings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user ON review_votes(user_id);

-- Trigger to update helpful counts on ratings table
CREATE TRIGGER IF NOT EXISTS review_votes_insert_update AFTER INSERT ON review_votes BEGIN
    UPDATE ratings
    SET
        helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = new.review_id AND helpful = 1),
        not_helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = new.review_id AND helpful = 0),
        helpful_ratio = CAST((SELECT COUNT(*) FROM review_votes WHERE review_id = new.review_id AND helpful = 1) AS REAL) /
                       NULLIF((SELECT COUNT(*) FROM review_votes WHERE review_id = new.review_id), 0)
    WHERE id = new.review_id;
END;

CREATE TRIGGER IF NOT EXISTS review_votes_delete_update AFTER DELETE ON review_votes BEGIN
    UPDATE ratings
    SET
        helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = old.review_id AND helpful = 1),
        not_helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = old.review_id AND helpful = 0),
        helpful_ratio = CAST((SELECT COUNT(*) FROM review_votes WHERE review_id = old.review_id AND helpful = 1) AS REAL) /
                       NULLIF((SELECT COUNT(*) FROM review_votes WHERE review_id = old.review_id), 0)
    WHERE id = old.review_id;
END;

-- ============================================================================
-- PLUGIN ASSOCIATIONS TABLE
-- Collaborative filtering: track plugin co-installations
-- ============================================================================
CREATE TABLE IF NOT EXISTS plugin_associations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plugin_a_id TEXT NOT NULL,                    -- First plugin
    plugin_b_id TEXT NOT NULL,                    -- Second plugin

    -- Association metrics
    co_install_count INTEGER DEFAULT 1,           -- Number of times installed together
    confidence REAL DEFAULT 0.0,                  -- P(B|A) - probability of B given A
    lift REAL DEFAULT 1.0,                        -- Lift measure for association strength

    -- Timestamps
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(plugin_a_id, plugin_b_id),
    FOREIGN KEY (plugin_a_id) REFERENCES plugin_index(id),
    FOREIGN KEY (plugin_b_id) REFERENCES plugin_index(id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_associations_a ON plugin_associations(plugin_a_id);
CREATE INDEX IF NOT EXISTS idx_plugin_associations_b ON plugin_associations(plugin_b_id);
CREATE INDEX IF NOT EXISTS idx_plugin_associations_confidence ON plugin_associations(confidence DESC);

-- ============================================================================
-- TRENDING PLUGINS VIEW
-- Calculated view of trending plugins based on recent activity
-- ============================================================================
CREATE VIEW IF NOT EXISTS trending_plugins AS
SELECT
    p.id,
    p.name,
    p.category,
    p.description,
    p.average_rating,
    COUNT(DISTINCT ui.user_id) as recent_installs,
    AVG(r.stars) as recent_rating,
    p.quality_score,
    -- Trending score: weighted combination of recent installs and rating
    (COUNT(DISTINCT ui.user_id) * 0.7 + COALESCE(AVG(r.stars), 0) * 10 * 0.3) as trending_score
FROM
    plugin_index p
    LEFT JOIN user_installs ui ON p.id = ui.plugin_id
        AND ui.installed_at >= datetime('now', '-7 days')
    LEFT JOIN ratings r ON p.id = r.plugin_id
        AND r.created_at >= datetime('now', '-30 days')
WHERE
    p.is_searchable = 1
GROUP BY
    p.id
ORDER BY
    trending_score DESC;

-- ============================================================================
-- SEARCH ANALYTICS VIEW
-- Analyze search query patterns
-- ============================================================================
CREATE VIEW IF NOT EXISTS search_analytics AS
SELECT
    query_text,
    COUNT(*) as search_count,
    AVG(result_count) as avg_results,
    AVG(search_duration_ms) as avg_duration_ms,
    SUM(CASE WHEN clicked_result_id IS NOT NULL THEN 1 ELSE 0 END) as click_count,
    CAST(SUM(CASE WHEN clicked_result_id IS NOT NULL THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as click_through_rate,
    MAX(created_at) as last_searched_at
FROM
    search_history
GROUP BY
    query_text
ORDER BY
    search_count DESC;

-- ============================================================================
-- PLUGIN QUALITY SCORE CALCULATION
-- Computed quality score based on multiple factors
-- ============================================================================
-- This would typically be updated by a background job, but we can create a view
-- for on-demand calculation:

CREATE VIEW IF NOT EXISTS plugin_quality_metrics AS
SELECT
    p.id,
    p.name,
    -- Rating component (0-40 points)
    COALESCE(p.average_rating * 8, 0) as rating_points,
    -- Review count component (0-20 points, capped at 50 reviews)
    MIN(p.review_count * 0.4, 20) as review_points,
    -- Install count component (0-20 points, capped at 1000 installs)
    MIN(p.install_count * 0.02, 20) as install_points,
    -- Recency component (0-10 points, linear decay over 365 days)
    MAX(10 - (julianday('now') - julianday(p.updated_at)) / 36.5, 0) as recency_points,
    -- Documentation component (0-10 points)
    CASE
        WHEN p.readme_content IS NOT NULL AND LENGTH(p.readme_content) > 500 THEN 10
        WHEN p.readme_content IS NOT NULL AND LENGTH(p.readme_content) > 100 THEN 5
        ELSE 0
    END as documentation_points,
    -- Total quality score (0-100)
    COALESCE(p.average_rating * 8, 0) +
    MIN(p.review_count * 0.4, 20) +
    MIN(p.install_count * 0.02, 20) +
    MAX(10 - (julianday('now') - julianday(p.updated_at)) / 36.5, 0) +
    CASE
        WHEN p.readme_content IS NOT NULL AND LENGTH(p.readme_content) > 500 THEN 10
        WHEN p.readme_content IS NOT NULL AND LENGTH(p.readme_content) > 100 THEN 5
        ELSE 0
    END as total_quality_score
FROM
    plugin_index p;

-- ============================================================================
-- INITIALIZATION
-- Insert default categories and setup data
-- ============================================================================

-- This would typically be populated by the application, but here's a reference
-- structure for plugin categories:
--
-- Categories:
-- - development: Core development tools
-- - testing: Testing and quality assurance
-- - devops: CI/CD and deployment
-- - frontend: Frontend development
-- - backend: Backend development
-- - cloud: Cloud infrastructure
-- - collaboration: Team collaboration
-- - documentation: Documentation tools
-- - security: Security and compliance
-- - data: Data management and analytics
-- - utilities: General utilities

-- ============================================================================
-- PERFORMANCE OPTIMIZATION NOTES
-- ============================================================================
--
-- 1. FTS5 provides fast full-text search with BM25 ranking built-in
-- 2. Indexes are created on frequently queried columns
-- 3. Views are used for complex calculations to avoid repeated queries
-- 4. Triggers keep FTS5 index synchronized automatically
-- 5. JSON columns allow flexible metadata without schema changes
-- 6. UNIQUE constraints prevent duplicate data
-- 7. Foreign keys maintain referential integrity
--
-- For production use with large datasets:
-- - Consider partitioning search_history by date
-- - Implement query result caching at application layer
-- - Use prepared statements for all queries
-- - Regularly VACUUM and ANALYZE the database
-- - Monitor FTS5 index size and rebuild if needed (INSERT INTO plugin_search_index(plugin_search_index) VALUES('rebuild'))
--
-- ============================================================================
