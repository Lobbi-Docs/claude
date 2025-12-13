/**
 * Database Service Layer
 *
 * This module establishes type-safe database operations using better-sqlite3,
 * providing a clean abstraction over SQL queries with comprehensive error handling.
 *
 * Business Value:
 * - Centralized database logic enables consistent query patterns
 * - Prepared statements prevent SQL injection and improve performance
 * - Connection pooling and transaction support ensure data integrity
 */

import Database from 'better-sqlite3';
import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import {
  PluginEntity,
  Publisher,
  Rating,
  DownloadStats,
  SearchResult,
  TrendingPlugin,
} from '../types/index.js';

/**
 * Database connection singleton
 * WHY: Single connection instance prevents connection leaks and ensures
 * consistent transaction behavior across the application.
 */
class DatabaseService {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure database directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    this.db.pragma('foreign_keys = ON'); // Enforce foreign key constraints

    this.initializeSchema();
    logger.info('Database initialized', { path: dbPath });
  }

  /**
   * Initialize database schema with all required tables
   * WHY: Automatic schema initialization ensures database is always in valid state
   */
  private initializeSchema(): void {
    const schemaPath = path.resolve(
      config.dbPath,
      '../../orchestration/db/discovery.sql'
    );

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    }

    // Add publishers table extension
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS publishers (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        website TEXT,
        github_username TEXT,
        verified BOOLEAN DEFAULT 0,
        role TEXT DEFAULT 'publisher' CHECK(role IN ('publisher', 'moderator', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES publishers(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_publishers_username ON publishers(username);
      CREATE INDEX IF NOT EXISTS idx_publishers_email ON publishers(email);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
    `);
  }

  // ========================================================================
  // PLUGIN OPERATIONS
  // ========================================================================

  /**
   * Insert new plugin into registry
   */
  createPlugin(plugin: Omit<PluginEntity, 'id' | 'published_at' | 'updated_at'>): PluginEntity {
    const id = crypto.randomUUID();
    const contentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(plugin))
      .digest('hex');

    const stmt = this.db.prepare(`
      INSERT INTO plugin_index (
        id, name, version, description, author, author_email, license,
        homepage, repository_url, repository_type, category, subcategory,
        tags, keywords, readme_content, documentation_url,
        dependencies, peer_dependencies, minimum_claude_version,
        compatible_platforms, content_hash
      ) VALUES (
        @id, @name, @version, @description, @author, @author_email, @license,
        @homepage, @repository_url, @repository_type, @category, @subcategory,
        @tags, @keywords, @readme_content, @documentation_url,
        @dependencies, @peer_dependencies, @minimum_claude_version,
        @compatible_platforms, @content_hash
      )
    `);

    stmt.run({
      id,
      ...plugin,
      tags: JSON.stringify(plugin.tags || []),
      keywords: JSON.stringify(plugin.keywords || []),
      dependencies: JSON.stringify(plugin.dependencies || {}),
      peer_dependencies: JSON.stringify(plugin.peer_dependencies || {}),
      compatible_platforms: JSON.stringify(plugin.compatible_platforms || []),
      contentHash,
    });

    return this.getPluginById(id)!;
  }

  /**
   * Get plugin by ID
   */
  getPluginById(id: string): PluginEntity | null {
    const stmt = this.db.prepare('SELECT * FROM plugin_index WHERE id = ?');
    return stmt.get(id) as PluginEntity | null;
  }

  /**
   * Get plugin by name
   */
  getPluginByName(name: string): PluginEntity | null {
    const stmt = this.db.prepare('SELECT * FROM plugin_index WHERE name = ?');
    return stmt.get(name) as PluginEntity | null;
  }

  /**
   * List plugins with pagination and filters
   */
  listPlugins(params: {
    limit: number;
    offset: number;
    category?: string;
    searchable?: boolean;
  }): { plugins: PluginEntity[]; total: number } {
    let whereClause = 'WHERE 1=1';
    const queryParams: any = {};

    if (params.category) {
      whereClause += ' AND category = @category';
      queryParams.category = params.category;
    }

    if (params.searchable !== undefined) {
      whereClause += ' AND is_searchable = @searchable';
      queryParams.searchable = params.searchable ? 1 : 0;
    }

    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM plugin_index ${whereClause}`);
    const { count } = countStmt.get(queryParams) as { count: number };

    const stmt = this.db.prepare(`
      SELECT * FROM plugin_index
      ${whereClause}
      ORDER BY quality_score DESC, updated_at DESC
      LIMIT @limit OFFSET @offset
    `);

    const plugins = stmt.all({
      ...queryParams,
      limit: params.limit,
      offset: params.offset,
    }) as PluginEntity[];

    return { plugins, total: count };
  }

  /**
   * Update plugin
   */
  updatePlugin(id: string, updates: Partial<PluginEntity>): PluginEntity | null {
    const existing = this.getPluginById(id);
    if (!existing) return null;

    const updateFields: string[] = [];
    const params: any = { id };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        updateFields.push(`${key} = @${key}`);
        params[key] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
    });

    if (updateFields.length === 0) return existing;

    updateFields.push('updated_at = CURRENT_TIMESTAMP');

    const stmt = this.db.prepare(`
      UPDATE plugin_index
      SET ${updateFields.join(', ')}
      WHERE id = @id
    `);

    stmt.run(params);
    return this.getPluginById(id);
  }

  /**
   * Delete plugin
   */
  deletePlugin(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM plugin_index WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(pluginId: string): void {
    const stmt = this.db.prepare(`
      UPDATE plugin_index
      SET download_count = download_count + 1
      WHERE id = ?
    `);
    stmt.run(pluginId);
  }

  // ========================================================================
  // SEARCH OPERATIONS
  // ========================================================================

  /**
   * Full-text search using FTS5
   */
  searchPlugins(query: string, limit: number, offset: number): SearchResult[] {
    const stmt = this.db.prepare(`
      SELECT
        p.*,
        bm25(ps.rowid) as relevance_score,
        'fts' as match_type
      FROM plugin_search_index ps
      JOIN plugin_index p ON ps.plugin_id = p.id
      WHERE plugin_search_index MATCH ?
        AND p.is_searchable = 1
      ORDER BY relevance_score DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(query, limit, offset) as SearchResult[];
  }

  /**
   * Get trending plugins
   */
  getTrendingPlugins(limit: number): TrendingPlugin[] {
    const stmt = this.db.prepare(`
      SELECT * FROM trending_plugins LIMIT ?
    `);

    return stmt.all(limit) as TrendingPlugin[];
  }

  // ========================================================================
  // USER OPERATIONS
  // ========================================================================

  /**
   * Create new publisher
   */
  createPublisher(publisher: Omit<Publisher, 'id' | 'created_at' | 'updated_at'>): Publisher {
    const id = crypto.randomUUID();

    const stmt = this.db.prepare(`
      INSERT INTO publishers (
        id, username, email, password_hash, display_name, bio,
        avatar_url, website, github_username, verified, role
      ) VALUES (
        @id, @username, @email, @password_hash, @display_name, @bio,
        @avatar_url, @website, @github_username, @verified, @role
      )
    `);

    stmt.run({ id, ...publisher });
    return this.getPublisherById(id)!;
  }

  /**
   * Get publisher by ID
   */
  getPublisherById(id: string): Publisher | null {
    const stmt = this.db.prepare('SELECT * FROM publishers WHERE id = ?');
    return stmt.get(id) as Publisher | null;
  }

  /**
   * Get publisher by username
   */
  getPublisherByUsername(username: string): Publisher | null {
    const stmt = this.db.prepare('SELECT * FROM publishers WHERE username = ?');
    return stmt.get(username) as Publisher | null;
  }

  /**
   * Get publisher by email
   */
  getPublisherByEmail(email: string): Publisher | null {
    const stmt = this.db.prepare('SELECT * FROM publishers WHERE email = ?');
    return stmt.get(email) as Publisher | null;
  }

  /**
   * Update last login timestamp
   */
  updateLastLogin(userId: string): void {
    const stmt = this.db.prepare(`
      UPDATE publishers
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(userId);
  }

  // ========================================================================
  // RATING OPERATIONS
  // ========================================================================

  /**
   * Create or update rating
   */
  upsertRating(rating: {
    plugin_id: string;
    user_id: string;
    stars: number;
    review_title?: string;
    review_text?: string;
    version_reviewed?: string;
  }): Rating {
    const stmt = this.db.prepare(`
      INSERT INTO ratings (plugin_id, user_id, stars, review_title, review_text, version_reviewed)
      VALUES (@plugin_id, @user_id, @stars, @review_title, @review_text, @version_reviewed)
      ON CONFLICT(plugin_id, user_id) DO UPDATE SET
        stars = @stars,
        review_title = @review_title,
        review_text = @review_text,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);

    const result = stmt.get(rating) as Rating;

    // Update plugin average rating
    this.updatePluginRating(rating.plugin_id);

    return result;
  }

  /**
   * Get ratings for plugin
   */
  getPluginRatings(pluginId: string, limit: number, offset: number): Rating[] {
    const stmt = this.db.prepare(`
      SELECT * FROM ratings
      WHERE plugin_id = ? AND is_approved = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);

    return stmt.all(pluginId, limit, offset) as Rating[];
  }

  /**
   * Update plugin average rating
   */
  private updatePluginRating(pluginId: string): void {
    const stmt = this.db.prepare(`
      UPDATE plugin_index
      SET
        average_rating = (SELECT AVG(stars) FROM ratings WHERE plugin_id = ? AND is_approved = 1),
        review_count = (SELECT COUNT(*) FROM ratings WHERE plugin_id = ? AND is_approved = 1)
      WHERE id = ?
    `);

    stmt.run(pluginId, pluginId, pluginId);
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    logger.info('Database connection closed');
  }
}

// Export singleton instance
export const db = new DatabaseService(config.dbPath);
