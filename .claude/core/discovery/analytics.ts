/**
 * Discovery Analytics
 * Track and analyze search behavior, click-through rates, and discovery patterns
 */

import Database from 'better-sqlite3';
import {
  AnalyticsSummary,
  SearchGap,
  SearchAnalytic
} from './types';

export class DiscoveryAnalytics {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
  }

  /**
   * Get top search queries
   */
  getTopSearches(
    limit: number = 20,
    daysBack: number = 30
  ): Array<{ query: string; count: number; avgResults: number; lastSearched: Date }> {
    const stmt = this.db.prepare(`
      SELECT
        query,
        COUNT(*) as count,
        AVG(results_count) as avgResults,
        MAX(searched_at) as lastSearched
      FROM search_analytics
      WHERE searched_at >= datetime('now', '-' || ? || ' days')
      GROUP BY query
      ORDER BY count DESC
      LIMIT ?
    `);

    const results = stmt.all(daysBack, limit) as Array<{
      query: string;
      count: number;
      avgResults: number;
      lastSearched: string;
    }>;

    return results.map(r => ({
      ...r,
      lastSearched: new Date(r.lastSearched)
    }));
  }

  /**
   * Get search gaps (queries with no or few results)
   */
  getSearchGaps(
    minOccurrences: number = 3,
    status: 'open' | 'addressed' | 'ignored' | 'all' = 'open'
  ): SearchGap[] {
    let sql = `
      SELECT * FROM search_gaps
      WHERE occurrence_count >= ?
    `;

    const params: any[] = [minOccurrences];

    if (status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY occurrence_count DESC, last_seen DESC';

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as Array<{
      id: number;
      query: string;
      results_count: number;
      first_seen: string;
      last_seen: string;
      occurrence_count: number;
      status: 'open' | 'addressed' | 'ignored';
      notes?: string;
    }>;

    return results.map(r => ({
      ...r,
      first_seen: new Date(r.first_seen),
      last_seen: new Date(r.last_seen)
    }));
  }

  /**
   * Calculate click-through rate (CTR) for searches
   */
  getClickThroughRate(daysBack: number = 7): {
    overall: number;
    byQuery: Array<{ query: string; searches: number; clicks: number; ctr: number }>;
  } {
    // Overall CTR
    const overallStmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalSearches,
        SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) as totalClicks
      FROM search_analytics
      WHERE searched_at >= datetime('now', '-' || ? || ' days')
    `);

    const overall = overallStmt.get(daysBack) as { totalSearches: number; totalClicks: number };
    const overallCTR = overall.totalSearches > 0
      ? (overall.totalClicks / overall.totalSearches) * 100
      : 0;

    // CTR by query
    const byQueryStmt = this.db.prepare(`
      SELECT
        query,
        COUNT(*) as searches,
        SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) as clicks,
        ROUND(100.0 * SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as ctr
      FROM search_analytics
      WHERE searched_at >= datetime('now', '-' || ? || ' days')
      GROUP BY query
      HAVING searches >= 5
      ORDER BY searches DESC
      LIMIT 50
    `);

    const byQuery = byQueryStmt.all(daysBack) as Array<{
      query: string;
      searches: number;
      clicks: number;
      ctr: number;
    }>;

    return {
      overall: overallCTR,
      byQuery
    };
  }

  /**
   * Get most clicked plugins from search results
   */
  getMostClickedPlugins(
    limit: number = 20,
    daysBack: number = 30
  ): Array<{ plugin_id: string; plugin_name: string; clicks: number; avgPosition: number }> {
    const stmt = this.db.prepare(`
      SELECT
        sa.clicked_plugin_id as plugin_id,
        pi.name as plugin_name,
        COUNT(*) as clicks,
        AVG(sa.click_position) as avgPosition
      FROM search_analytics sa
      JOIN plugin_index pi ON sa.clicked_plugin_id = pi.plugin_id
      WHERE sa.clicked_plugin_id IS NOT NULL
        AND sa.searched_at >= datetime('now', '-' || ? || ' days')
      GROUP BY sa.clicked_plugin_id
      ORDER BY clicks DESC
      LIMIT ?
    `);

    return stmt.all(daysBack, limit) as Array<{
      plugin_id: string;
      plugin_name: string;
      clicks: number;
      avgPosition: number;
    }>;
  }

  /**
   * Get search result position bias
   * Shows how position affects click probability
   */
  getPositionBias(): Array<{ position: number; clicks: number; ctr: number }> {
    const stmt = this.db.prepare(`
      SELECT
        click_position as position,
        COUNT(*) as clicks
      FROM search_analytics
      WHERE clicked_plugin_id IS NOT NULL
        AND click_position IS NOT NULL
      GROUP BY click_position
      ORDER BY click_position
    `);

    const positions = stmt.all() as Array<{ position: number; clicks: number }>;

    // Calculate CTR per position (simplified - assumes equal exposure)
    const totalClicks = positions.reduce((sum, p) => sum + p.clicks, 0);

    return positions.map(p => ({
      ...p,
      ctr: totalClicks > 0 ? (p.clicks / totalClicks) * 100 : 0
    }));
  }

  /**
   * Get popular plugin categories
   */
  getPopularCategories(daysBack: number = 30): Array<{
    category: string;
    installs: number;
    searches: number;
    clicks: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        pi.category,
        COUNT(DISTINCT is2.id) as installs,
        (SELECT COUNT(*) FROM search_analytics sa
         WHERE sa.clicked_plugin_id = pi.plugin_id
         AND sa.searched_at >= datetime('now', '-' || ? || ' days')) as searches,
        (SELECT COUNT(*) FROM search_analytics sa
         WHERE sa.clicked_plugin_id = pi.plugin_id
         AND sa.clicked_plugin_id IS NOT NULL
         AND sa.searched_at >= datetime('now', '-' || ? || ' days')) as clicks
      FROM plugin_index pi
      LEFT JOIN install_stats is2 ON pi.plugin_id = is2.plugin_id
        AND is2.installed_at >= datetime('now', '-' || ? || ' days')
      GROUP BY pi.category
      ORDER BY installs DESC
    `);

    return stmt.all(daysBack, daysBack, daysBack) as Array<{
      category: string;
      installs: number;
      searches: number;
      clicks: number;
    }>;
  }

  /**
   * Get trending searches (queries with increasing frequency)
   */
  getTrendingSearches(limit: number = 20): Array<{
    query: string;
    thisWeek: number;
    lastWeek: number;
    growth: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT
        query,
        SUM(CASE WHEN searched_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as thisWeek,
        SUM(CASE WHEN searched_at >= datetime('now', '-14 days')
                  AND searched_at < datetime('now', '-7 days') THEN 1 ELSE 0 END) as lastWeek
      FROM search_analytics
      WHERE searched_at >= datetime('now', '-14 days')
      GROUP BY query
      HAVING thisWeek > 0 AND lastWeek > 0
      ORDER BY (CAST(thisWeek AS REAL) / lastWeek) DESC
      LIMIT ?
    `);

    const results = stmt.all(limit) as Array<{
      query: string;
      thisWeek: number;
      lastWeek: number;
    }>;

    return results.map(r => ({
      ...r,
      growth: r.lastWeek > 0 ? ((r.thisWeek - r.lastWeek) / r.lastWeek) * 100 : 0
    }));
  }

  /**
   * Get search conversion funnel
   */
  getSearchFunnel(daysBack: number = 30): {
    searches: number;
    withResults: number;
    withClicks: number;
    withInstalls: number;
    conversionRate: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as searches,
        SUM(CASE WHEN results_count > 0 THEN 1 ELSE 0 END) as withResults,
        SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) as withClicks,
        (SELECT COUNT(DISTINCT plugin_id) FROM install_stats
         WHERE installation_source = 'search'
         AND installed_at >= datetime('now', '-' || ? || ' days')) as withInstalls
      FROM search_analytics
      WHERE searched_at >= datetime('now', '-' || ? || ' days')
    `);

    const funnel = stmt.get(daysBack, daysBack) as {
      searches: number;
      withResults: number;
      withClicks: number;
      withInstalls: number;
    };

    return {
      ...funnel,
      conversionRate: funnel.searches > 0
        ? (funnel.withInstalls / funnel.searches) * 100
        : 0
    };
  }

  /**
   * Get comprehensive analytics summary
   */
  getSummary(daysBack: number = 30): AnalyticsSummary {
    const topSearches = this.getTopSearches(10, daysBack);
    const searchGaps = this.getSearchGaps(3, 'open');
    const ctr = this.getClickThroughRate(daysBack);
    const popularPlugins = this.getMostClickedPlugins(10, daysBack);

    // Get plugin trends
    const trendingStmt = this.db.prepare(`
      SELECT
        plugin_id,
        name,
        downloads,
        CASE
          WHEN installs_week > installs_month / 4 THEN 'up'
          WHEN installs_week < installs_month / 5 THEN 'down'
          ELSE 'stable'
        END as trend
      FROM plugin_index pi
      LEFT JOIN trending_plugins tp ON pi.plugin_id = tp.plugin_id
      ORDER BY downloads DESC
      LIMIT 10
    `);

    const pluginTrends = trendingStmt.all() as Array<{
      plugin_id: string;
      name: string;
      downloads: number;
      trend: 'up' | 'down' | 'stable';
    }>;

    return {
      topSearches: topSearches.map(s => ({
        query: s.query,
        count: s.count,
        avgResults: s.avgResults
      })),
      searchGaps: searchGaps.slice(0, 10).map(g => ({
        query: g.query,
        count: g.occurrence_count
      })),
      clickThroughRate: ctr,
      popularPlugins: pluginTrends
    };
  }

  /**
   * Get user search patterns
   */
  getUserSearchPatterns(userId: string): {
    totalSearches: number;
    uniqueQueries: number;
    avgResultsPerSearch: number;
    clickThroughRate: number;
    favoriteCategories: Array<{ category: string; count: number }>;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as totalSearches,
        COUNT(DISTINCT query) as uniqueQueries,
        AVG(results_count) as avgResultsPerSearch,
        ROUND(100.0 * SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as clickThroughRate
      FROM search_analytics
      WHERE user_id = ?
    `);

    const stats = stmt.get(userId) as {
      totalSearches: number;
      uniqueQueries: number;
      avgResultsPerSearch: number;
      clickThroughRate: number;
    };

    // Get favorite categories
    const categoryStmt = this.db.prepare(`
      SELECT pi.category, COUNT(*) as count
      FROM search_analytics sa
      JOIN plugin_index pi ON sa.clicked_plugin_id = pi.plugin_id
      WHERE sa.user_id = ? AND sa.clicked_plugin_id IS NOT NULL
      GROUP BY pi.category
      ORDER BY count DESC
      LIMIT 5
    `);

    const favoriteCategories = categoryStmt.all(userId) as Array<{
      category: string;
      count: number;
    }>;

    return {
      ...stats,
      favoriteCategories
    };
  }

  /**
   * Track search result quality score
   */
  getSearchQualityScore(daysBack: number = 7): {
    score: number;
    metrics: {
      avgResultsPerSearch: number;
      percentWithResults: number;
      clickThroughRate: number;
      avgClickPosition: number;
    };
  } {
    const stmt = this.db.prepare(`
      SELECT
        AVG(results_count) as avgResultsPerSearch,
        ROUND(100.0 * SUM(CASE WHEN results_count > 0 THEN 1 ELSE 0 END) / COUNT(*), 2) as percentWithResults,
        ROUND(100.0 * SUM(CASE WHEN clicked_plugin_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as clickThroughRate,
        AVG(CASE WHEN clicked_plugin_id IS NOT NULL THEN click_position ELSE NULL END) as avgClickPosition
      FROM search_analytics
      WHERE searched_at >= datetime('now', '-' || ? || ' days')
    `);

    const metrics = stmt.get(daysBack) as {
      avgResultsPerSearch: number;
      percentWithResults: number;
      clickThroughRate: number;
      avgClickPosition: number;
    };

    // Calculate quality score (0-100)
    const score = (
      (Math.min(metrics.percentWithResults, 95) / 95) * 30 +  // 30% weight
      (Math.min(metrics.clickThroughRate, 40) / 40) * 40 +    // 40% weight
      (Math.max(0, 10 - metrics.avgClickPosition) / 10) * 30  // 30% weight
    );

    return {
      score: Math.round(score),
      metrics
    };
  }

  /**
   * Export analytics data for external analysis
   */
  exportSearchData(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): string {
    const stmt = this.db.prepare(`
      SELECT * FROM search_analytics
      WHERE searched_at >= ? AND searched_at <= ?
      ORDER BY searched_at DESC
    `);

    const data = stmt.all(startDate.toISOString(), endDate.toISOString()) as SearchAnalytic[];

    if (format === 'csv') {
      if (data.length === 0) return '';

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row =>
        Object.values(row).map(v => JSON.stringify(v)).join(',')
      );

      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Update search gap status
   */
  updateSearchGapStatus(gapId: number, status: 'open' | 'addressed' | 'ignored', notes?: string): void {
    const stmt = this.db.prepare(`
      UPDATE search_gaps
      SET status = ?, notes = ?
      WHERE id = ?
    `);

    stmt.run(status, notes || null, gapId);
  }

  /**
   * Clean old analytics data
   */
  cleanOldData(daysToKeep: number = 90): number {
    const stmt = this.db.prepare(`
      DELETE FROM search_analytics
      WHERE searched_at < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysToKeep);
    return result.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
