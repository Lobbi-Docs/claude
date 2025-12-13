/**
 * Plugin Recommendation Engine
 * Provides collaborative filtering and content-based recommendations
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import {
  RecommendationContext,
  RecommendedPlugin,
  PluginIndexEntry,
  TrendingPeriod,
  SimilarityScore,
  RecommendationCache
} from './types';

/**
 * Cache TTL in seconds
 */
const CACHE_TTL = {
  collaborative: 3600,      // 1 hour
  content_based: 7200,      // 2 hours
  trending: 1800,           // 30 minutes
  similar: 3600             // 1 hour
};

export class RecommendationEngine {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
  }

  /**
   * Generate cache key from context
   */
  private getCacheKey(type: string, context: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(type);
    hash.update(JSON.stringify(context));
    return hash.digest('hex');
  }

  /**
   * Get cached recommendation if available
   */
  private getCachedRecommendation(cacheKey: string): RecommendedPlugin[] | null {
    const stmt = this.db.prepare(`
      SELECT * FROM recommendation_cache
      WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
    `);

    const cached = stmt.get(cacheKey) as RecommendationCache | undefined;

    if (cached) {
      // Update hit count
      this.db.prepare('UPDATE recommendation_cache SET hit_count = hit_count + 1 WHERE id = ?')
        .run(cached.id);

      return JSON.parse(cached.results);
    }

    return null;
  }

  /**
   * Cache recommendation results
   */
  private cacheRecommendation(
    cacheKey: string,
    type: string,
    context: RecommendationContext,
    results: RecommendedPlugin[]
  ): void {
    const ttl = CACHE_TTL[type as keyof typeof CACHE_TTL] || 3600;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const stmt = this.db.prepare(`
      INSERT INTO recommendation_cache (cache_key, recommendation_type, context, results, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        results = excluded.results,
        expires_at = excluded.expires_at,
        generated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      cacheKey,
      type,
      JSON.stringify(context),
      JSON.stringify(results),
      expiresAt.toISOString()
    );
  }

  /**
   * Get personalized recommendations
   * Combines collaborative and content-based filtering
   */
  async recommend(context: RecommendationContext): Promise<RecommendedPlugin[]> {
    const cacheKey = this.getCacheKey('personalized', context);
    const cached = this.getCachedRecommendation(cacheKey);
    if (cached) return cached;

    const limit = context.limit || 10;
    const installedPlugins = context.installedPlugins || [];

    // Get collaborative filtering recommendations
    const collaborative = await this.collaborativeFiltering(installedPlugins, limit);

    // Get content-based recommendations
    const contentBased = await this.contentBasedFiltering(installedPlugins, context.currentCategory, limit);

    // Get trending recommendations
    const trending = await this.getTrending('week', limit);

    // Merge and deduplicate
    const merged = this.mergeRecommendations([
      ...collaborative,
      ...contentBased,
      ...trending
    ], limit);

    // Filter out installed plugins if requested
    const filtered = context.excludeInstalled
      ? merged.filter(r => !installedPlugins.includes(r.plugin.plugin_id))
      : merged;

    // Cache results
    this.cacheRecommendation(cacheKey, 'personalized', context, filtered);

    return filtered;
  }

  /**
   * Collaborative filtering: Users who installed X also installed Y
   */
  async collaborativeFiltering(
    installedPlugins: string[],
    limit: number = 10
  ): Promise<RecommendedPlugin[]> {
    if (installedPlugins.length === 0) {
      return [];
    }

    const cacheKey = this.getCacheKey('collaborative', { installedPlugins, limit });
    const cached = this.getCachedRecommendation(cacheKey);
    if (cached) return cached;

    // Find plugins frequently co-installed with user's plugins
    const placeholders = installedPlugins.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT
        pr.plugin_b as plugin_id,
        SUM(pr.confidence) as total_confidence,
        COUNT(*) as relationship_count
      FROM plugin_relationships pr
      WHERE pr.plugin_a IN (${placeholders})
        AND pr.plugin_b NOT IN (${placeholders})
      GROUP BY pr.plugin_b
      ORDER BY total_confidence DESC, relationship_count DESC
      LIMIT ?
    `);

    const recommendations = stmt.all(...installedPlugins, ...installedPlugins, limit) as Array<{
      plugin_id: string;
      total_confidence: number;
      relationship_count: number;
    }>;

    // Get full plugin details
    const results: RecommendedPlugin[] = [];
    for (const rec of recommendations) {
      const plugin = this.getPluginById(rec.plugin_id);
      if (plugin && !plugin.is_deprecated) {
        results.push({
          plugin,
          score: rec.total_confidence,
          reason: `Users who installed ${this.getPluginNames(installedPlugins).slice(0, 2).join(', ')} also installed this`,
          type: 'collaborative'
        });
      }
    }

    this.cacheRecommendation(cacheKey, 'collaborative', { installedPlugins, limit }, results);
    return results;
  }

  /**
   * Content-based filtering: Similar descriptions, tags, categories
   */
  async contentBasedFiltering(
    installedPlugins: string[],
    category?: string,
    limit: number = 10
  ): Promise<RecommendedPlugin[]> {
    const cacheKey = this.getCacheKey('content_based', { installedPlugins, category, limit });
    const cached = this.getCachedRecommendation(cacheKey);
    if (cached) return cached;

    const results: RecommendedPlugin[] = [];

    if (installedPlugins.length > 0) {
      // Find plugins with similar tags and keywords
      const similarities = this.calculateContentSimilarity(installedPlugins, limit);

      for (const sim of similarities) {
        const plugin = this.getPluginById(sim.plugin_b);
        if (plugin && !plugin.is_deprecated && !installedPlugins.includes(plugin.plugin_id)) {
          results.push({
            plugin,
            score: sim.similarity,
            reason: `Similar to ${this.getPluginNames([sim.plugin_a]).join(', ')}`,
            type: 'content_based'
          });
        }
      }
    }

    // Also recommend popular plugins in the same category
    if (category && results.length < limit) {
      const categoryPlugins = this.getPopularInCategory(category, limit - results.length, installedPlugins);
      results.push(...categoryPlugins);
    }

    this.cacheRecommendation(cacheKey, 'content_based', { installedPlugins, category, limit }, results);
    return results.slice(0, limit);
  }

  /**
   * Calculate content similarity between plugins
   */
  private calculateContentSimilarity(pluginIds: string[], limit: number): SimilarityScore[] {
    const results: SimilarityScore[] = [];

    for (const pluginId of pluginIds) {
      const sourcePlugin = this.getPluginById(pluginId);
      if (!sourcePlugin) continue;

      const sourceTags = new Set(JSON.parse(sourcePlugin.tags || '[]'));
      const sourceKeywords = new Set((sourcePlugin.keywords || '').split(' '));

      // Find plugins with overlapping tags/keywords
      const stmt = this.db.prepare(`
        SELECT * FROM plugin_index
        WHERE plugin_id != ?
          AND is_deprecated = 0
        ORDER BY rating DESC, downloads DESC
        LIMIT 100
      `);

      const candidates = stmt.all(pluginId) as PluginIndexEntry[];

      for (const candidate of candidates) {
        const candidateTags = new Set(JSON.parse(candidate.tags || '[]'));
        const candidateKeywords = new Set((candidate.keywords || '').split(' '));

        // Calculate Jaccard similarity for tags
        const commonTags = new Set([...sourceTags].filter(t => candidateTags.has(t)));
        const allTags = new Set([...sourceTags, ...candidateTags]);
        const tagSimilarity = allTags.size > 0 ? commonTags.size / allTags.size : 0;

        // Calculate Jaccard similarity for keywords
        const commonKeywords = new Set([...sourceKeywords].filter(k => candidateKeywords.has(k)));
        const allKeywords = new Set([...sourceKeywords, ...candidateKeywords]);
        const keywordSimilarity = allKeywords.size > 0 ? commonKeywords.size / allKeywords.size : 0;

        // Combined similarity
        const similarity = (tagSimilarity * 0.6) + (keywordSimilarity * 0.4);

        if (similarity > 0.1) {
          results.push({
            plugin_a: pluginId,
            plugin_b: candidate.plugin_id,
            similarity,
            common_tags: Array.from(commonTags),
            common_keywords: Array.from(commonKeywords)
          });
        }
      }
    }

    // Sort by similarity and deduplicate
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get trending plugins based on recent install velocity
   */
  async getTrending(period: TrendingPeriod = 'week', limit: number = 10): Promise<RecommendedPlugin[]> {
    const cacheKey = this.getCacheKey('trending', { period, limit });
    const cached = this.getCachedRecommendation(cacheKey);
    if (cached) return cached;

    const stmt = this.db.prepare(`
      SELECT tp.*, pi.*
      FROM trending_plugins tp
      JOIN plugin_index pi ON tp.plugin_id = pi.plugin_id
      WHERE pi.is_deprecated = 0
      ORDER BY tp.velocity_score DESC
      LIMIT ?
    `);

    const trending = stmt.all(limit) as PluginIndexEntry[];

    const results: RecommendedPlugin[] = trending.map(plugin => ({
      plugin,
      score: 1.0,
      reason: `Trending this ${period}`,
      type: 'trending'
    }));

    this.cacheRecommendation(cacheKey, 'trending', { period, limit }, results);
    return results;
  }

  /**
   * Get plugins similar to a specific plugin
   */
  async getSimilar(pluginId: string, limit: number = 10): Promise<RecommendedPlugin[]> {
    const cacheKey = this.getCacheKey('similar', { pluginId, limit });
    const cached = this.getCachedRecommendation(cacheKey);
    if (cached) return cached;

    // Use content-based similarity
    const similarities = this.calculateContentSimilarity([pluginId], limit);

    const results: RecommendedPlugin[] = [];
    for (const sim of similarities) {
      const plugin = this.getPluginById(sim.plugin_b);
      if (plugin && !plugin.is_deprecated) {
        results.push({
          plugin,
          score: sim.similarity,
          reason: `Similar tags: ${sim.common_tags.slice(0, 3).join(', ')}`,
          type: 'content_based'
        });
      }
    }

    this.cacheRecommendation(cacheKey, 'similar', { pluginId, limit }, results);
    return results;
  }

  /**
   * Get popular plugins in a category
   */
  private getPopularInCategory(
    category: string,
    limit: number,
    exclude: string[] = []
  ): RecommendedPlugin[] {
    const placeholders = exclude.map(() => '?').join(',');
    const excludeClause = exclude.length > 0 ? `AND plugin_id NOT IN (${placeholders})` : '';

    const stmt = this.db.prepare(`
      SELECT * FROM plugin_index
      WHERE category = ? ${excludeClause}
        AND is_deprecated = 0
      ORDER BY downloads DESC, rating DESC
      LIMIT ?
    `);

    const params = exclude.length > 0 ? [category, ...exclude, limit] : [category, limit];
    const plugins = stmt.all(...params) as PluginIndexEntry[];

    return plugins.map(plugin => ({
      plugin,
      score: 0.8,
      reason: `Popular in ${category}`,
      type: 'popular' as const
    }));
  }

  /**
   * Merge and deduplicate recommendations
   */
  private mergeRecommendations(
    recommendations: RecommendedPlugin[],
    limit: number
  ): RecommendedPlugin[] {
    const seen = new Set<string>();
    const merged: RecommendedPlugin[] = [];

    // Sort by score first
    const sorted = recommendations.sort((a, b) => b.score - a.score);

    for (const rec of sorted) {
      if (!seen.has(rec.plugin.plugin_id)) {
        seen.add(rec.plugin.plugin_id);
        merged.push(rec);

        if (merged.length >= limit) {
          break;
        }
      }
    }

    return merged;
  }

  /**
   * Get plugin by ID
   */
  private getPluginById(pluginId: string): PluginIndexEntry | null {
    const stmt = this.db.prepare('SELECT * FROM plugin_index WHERE plugin_id = ?');
    return stmt.get(pluginId) as PluginIndexEntry | null;
  }

  /**
   * Get plugin names from IDs
   */
  private getPluginNames(pluginIds: string[]): string[] {
    if (pluginIds.length === 0) return [];

    const placeholders = pluginIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT name FROM plugin_index WHERE plugin_id IN (${placeholders})
    `);

    const results = stmt.all(...pluginIds) as Array<{ name: string }>;
    return results.map(r => r.name);
  }

  /**
   * Record plugin installation for improving recommendations
   */
  recordInstallation(
    pluginId: string,
    userId?: string,
    version?: string,
    source?: string
  ): void {
    try {
      // Record install stat
      const stmt = this.db.prepare(`
        INSERT INTO install_stats (plugin_id, user_id, version, installation_source)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(pluginId, userId || null, version || null, source || null);

      // Update user installed plugins
      if (userId) {
        const userStmt = this.db.prepare(`
          INSERT INTO user_installed_plugins (user_id, plugin_id)
          VALUES (?, ?)
          ON CONFLICT(user_id, plugin_id) DO UPDATE SET
            installed_at = CURRENT_TIMESTAMP,
            is_active = 1
        `);
        userStmt.run(userId, pluginId);
      }

      // Increment download count
      this.db.prepare('UPDATE plugin_index SET downloads = downloads + 1 WHERE plugin_id = ?')
        .run(pluginId);

      // Invalidate related caches
      this.invalidateCache(pluginId);
    } catch (error) {
      console.warn('Failed to record installation:', error);
    }
  }

  /**
   * Record plugin uninstallation
   */
  recordUninstallation(pluginId: string, userId?: string): void {
    try {
      if (userId) {
        const stmt = this.db.prepare(`
          UPDATE user_installed_plugins
          SET is_active = 0
          WHERE user_id = ? AND plugin_id = ?
        `);
        stmt.run(userId, pluginId);
      }

      // Mark as uninstalled in install_stats
      const statsStmt = this.db.prepare(`
        UPDATE install_stats
        SET uninstalled_at = CURRENT_TIMESTAMP
        WHERE plugin_id = ? AND user_id = ? AND uninstalled_at IS NULL
      `);
      statsStmt.run(pluginId, userId || null);

      this.invalidateCache(pluginId);
    } catch (error) {
      console.warn('Failed to record uninstallation:', error);
    }
  }

  /**
   * Invalidate cache entries related to a plugin
   */
  private invalidateCache(pluginId: string): void {
    // For simplicity, just set expiry to now
    // In production, you might want more granular cache invalidation
    this.db.prepare(`
      UPDATE recommendation_cache
      SET expires_at = CURRENT_TIMESTAMP
      WHERE context LIKE ?
    `).run(`%${pluginId}%`);
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const stmt = this.db.prepare(`
      DELETE FROM recommendation_cache
      WHERE expires_at < CURRENT_TIMESTAMP
    `);

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
