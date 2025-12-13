/**
 * Semantic Search Engine with TF-IDF
 * Provides intelligent plugin search with ranking and filtering
 */

import Database from 'better-sqlite3';
import {
  SearchFilters,
  SearchOptions,
  SearchResults,
  SearchResultItem,
  PluginIndexEntry,
  ScoringWeights,
  TokenizationResult
} from './types';

/**
 * Default scoring weights for search ranking
 */
const DEFAULT_WEIGHTS: ScoringWeights = {
  tf_idf: 0.4,
  downloads: 0.2,
  rating: 0.2,
  recency: 0.1,
  relevance: 0.1
};

/**
 * Stop words to exclude from search
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'this', 'can', 'all', 'but', 'or'
]);

export class SearchEngine {
  private db: Database.Database;
  private weights: ScoringWeights;

  constructor(dbPath: string, weights: ScoringWeights = DEFAULT_WEIGHTS) {
    this.db = new Database(dbPath);
    this.weights = weights;
  }

  /**
   * Tokenize search query
   */
  private tokenize(text: string): TokenizationResult {
    if (!text) {
      return { tokens: [], stems: [], stopWordsRemoved: 0 };
    }

    const words = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0);

    let stopWordsRemoved = 0;
    const tokens: string[] = [];
    const stems: string[] = [];

    for (const word of words) {
      if (STOP_WORDS.has(word)) {
        stopWordsRemoved++;
        continue;
      }

      tokens.push(word);
      stems.push(this.stem(word));
    }

    return { tokens, stems, stopWordsRemoved };
  }

  /**
   * Simple stemming
   */
  private stem(word: string): string {
    word = word.replace(/ing$/, '');
    word = word.replace(/ed$/, '');
    word = word.replace(/es$/, '');
    word = word.replace(/s$/, '');
    word = word.replace(/ly$/, '');
    word = word.replace(/er$/, '');
    word = word.replace(/est$/, '');
    return word;
  }

  /**
   * Search plugins with semantic ranking
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResults> {
    const startTime = Date.now();

    // Tokenize query
    const { stems } = this.tokenize(query);

    if (stems.length === 0) {
      return {
        query,
        results: [],
        total: 0,
        page: 1,
        pageSize: options.limit || 20,
        totalPages: 0,
        executionTime: Date.now() - startTime,
        filters: options.filters
      };
    }

    // Build base query with filters
    const { sql: filterSql, params: filterParams } = this.buildFilterQuery(options.filters);

    // Get matching plugins using FTS5
    const ftsQuery = stems.join(' OR ');
    const matchingPlugins = this.db.prepare(`
      SELECT DISTINCT pi.*, ps.rank as fts_rank
      FROM plugin_index pi
      JOIN plugin_search ps ON ps.plugin_id = pi.plugin_id
      WHERE ps MATCH ?
        ${filterSql}
    `).all(ftsQuery, ...filterParams) as Array<PluginIndexEntry & { fts_rank: number }>;

    // Calculate TF-IDF scores for matching plugins
    const scoredResults = this.scoreResults(matchingPlugins, stems, query);

    // Sort results
    const sortedResults = this.sortResults(scoredResults, options.sort || 'relevance');

    // Paginate
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const paginatedResults = sortedResults.slice(offset, offset + limit);

    // Track search analytics
    this.trackSearch(query, options.filters, sortedResults.length);

    return {
      query,
      results: paginatedResults,
      total: sortedResults.length,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(sortedResults.length / limit),
      executionTime: Date.now() - startTime,
      filters: options.filters
    };
  }

  /**
   * Build SQL filter query
   */
  private buildFilterQuery(filters?: SearchFilters): { sql: string, params: any[] } {
    if (!filters) {
      return { sql: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.category) {
      conditions.push('pi.category = ?');
      params.push(filters.category);
    }

    if (filters.author) {
      conditions.push('pi.author_name LIKE ?');
      params.push(`%${filters.author}%`);
    }

    if (filters.minRating !== undefined) {
      conditions.push('pi.rating >= ?');
      params.push(filters.minRating);
    }

    if (filters.minDownloads !== undefined) {
      conditions.push('pi.downloads >= ?');
      params.push(filters.minDownloads);
    }

    if (filters.maxDownloads !== undefined) {
      conditions.push('pi.downloads <= ?');
      params.push(filters.maxDownloads);
    }

    if (filters.isFeatured !== undefined) {
      conditions.push('pi.is_featured = ?');
      params.push(filters.isFeatured ? 1 : 0);
    }

    if (filters.excludeDeprecated !== false) {
      conditions.push('pi.is_deprecated = 0');
    }

    if (filters.publishedAfter) {
      conditions.push('pi.published_at >= ?');
      params.push(filters.publishedAfter.toISOString());
    }

    if (filters.publishedBefore) {
      conditions.push('pi.published_at <= ?');
      params.push(filters.publishedBefore.toISOString());
    }

    if (filters.tags && filters.tags.length > 0) {
      // Check if any tag matches
      const tagConditions = filters.tags.map(() => 'pi.tags LIKE ?');
      conditions.push(`(${tagConditions.join(' OR ')})`);
      filters.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    const sql = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    return { sql, params };
  }

  /**
   * Score search results using TF-IDF and other factors
   */
  private scoreResults(
    plugins: Array<PluginIndexEntry & { fts_rank: number }>,
    queryTerms: string[],
    originalQuery: string
  ): SearchResultItem[] {
    const results: SearchResultItem[] = [];

    // Get max values for normalization
    const maxDownloads = Math.max(...plugins.map(p => p.downloads), 1);
    const maxRating = 5.0;
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    for (const plugin of plugins) {
      // Calculate TF-IDF score
      const tfidfScore = this.calculateTFIDFScore(plugin.plugin_id, queryTerms);

      // Normalize downloads (0-1)
      const downloadScore = plugin.downloads / maxDownloads;

      // Normalize rating (0-1)
      const ratingScore = plugin.rating / maxRating;

      // Recency score (newer is better)
      const pluginAge = now - (plugin.published_at ? new Date(plugin.published_at).getTime() : now);
      const recencyScore = Math.max(0, 1 - (pluginAge / oneYear));

      // Relevance boost for exact matches
      const relevanceBoost = this.calculateRelevanceBoost(plugin, originalQuery);

      // Combined score
      const score = (
        tfidfScore * this.weights.tf_idf +
        downloadScore * this.weights.downloads +
        ratingScore * this.weights.rating +
        recencyScore * this.weights.recency +
        relevanceBoost * this.weights.relevance
      );

      // Determine matched fields
      const matchedFields = this.getMatchedFields(plugin, queryTerms);

      results.push({
        plugin,
        score,
        tf_idf_score: tfidfScore,
        download_score: downloadScore,
        rating_score: ratingScore,
        recency_score: recencyScore,
        relevance_boost: relevanceBoost,
        matchedFields
      });
    }

    return results;
  }

  /**
   * Calculate TF-IDF score for plugin against query terms
   */
  private calculateTFIDFScore(pluginId: string, queryTerms: string[]): number {
    if (queryTerms.length === 0) return 0;

    const stmt = this.db.prepare(`
      SELECT SUM(tfidf_score) as total_score
      FROM tfidf_index
      WHERE plugin_id = ? AND term IN (${queryTerms.map(() => '?').join(',')})
    `);

    const result = stmt.get(pluginId, ...queryTerms) as { total_score: number | null };
    return result?.total_score || 0;
  }

  /**
   * Calculate relevance boost for exact or partial matches
   */
  private calculateRelevanceBoost(plugin: PluginIndexEntry, query: string): number {
    const lowerQuery = query.toLowerCase();
    let boost = 0;

    // Exact name match
    if (plugin.name.toLowerCase() === lowerQuery) {
      boost += 1.0;
    }
    // Name starts with query
    else if (plugin.name.toLowerCase().startsWith(lowerQuery)) {
      boost += 0.7;
    }
    // Name contains query
    else if (plugin.name.toLowerCase().includes(lowerQuery)) {
      boost += 0.5;
    }

    // Description contains query
    if (plugin.description?.toLowerCase().includes(lowerQuery)) {
      boost += 0.3;
    }

    // Featured plugins get a small boost
    if (plugin.is_featured) {
      boost += 0.2;
    }

    return Math.min(boost, 1.0);
  }

  /**
   * Get fields that matched the query
   */
  private getMatchedFields(plugin: PluginIndexEntry, queryTerms: string[]): string[] {
    const matched: string[] = [];

    for (const term of queryTerms) {
      if (plugin.name.toLowerCase().includes(term)) {
        matched.push('name');
      }
      if (plugin.description?.toLowerCase().includes(term)) {
        matched.push('description');
      }
      if (plugin.keywords?.toLowerCase().includes(term)) {
        matched.push('keywords');
      }
      if (plugin.readme_content?.toLowerCase().includes(term)) {
        matched.push('readme');
      }
    }

    return [...new Set(matched)];
  }

  /**
   * Sort search results
   */
  private sortResults(results: SearchResultItem[], sortBy: string): SearchResultItem[] {
    switch (sortBy) {
      case 'downloads':
        return results.sort((a, b) => b.plugin.downloads - a.plugin.downloads);
      case 'rating':
        return results.sort((a, b) => b.plugin.rating - a.plugin.rating);
      case 'recent':
        return results.sort((a, b) => {
          const aDate = a.plugin.published_at ? new Date(a.plugin.published_at).getTime() : 0;
          const bDate = b.plugin.published_at ? new Date(b.plugin.published_at).getTime() : 0;
          return bDate - aDate;
        });
      case 'name':
        return results.sort((a, b) => a.plugin.name.localeCompare(b.plugin.name));
      case 'relevance':
      default:
        return results.sort((a, b) => b.score - a.score);
    }
  }

  /**
   * Fuzzy search with typo tolerance
   */
  async fuzzySearch(query: string, options: SearchOptions = {}): Promise<SearchResults> {
    // Try exact search first
    const exactResults = await this.search(query, options);

    // If we have good results, return them
    if (exactResults.results.length >= 5) {
      return exactResults;
    }

    // Otherwise, try fuzzy matching
    const { stems } = this.tokenize(query);
    const fuzzyTerms: string[] = [];

    for (const term of stems) {
      // Add variations with edit distance 1
      fuzzyTerms.push(term);
      fuzzyTerms.push(term + '*');  // Prefix match
    }

    // Search with fuzzy terms
    return this.search(fuzzyTerms.join(' OR '), options);
  }

  /**
   * Get suggestions for autocomplete
   */
  getSuggestions(partial: string, limit: number = 10): string[] {
    const { stems } = this.tokenize(partial);
    if (stems.length === 0) return [];

    const lastTerm = stems[stems.length - 1];

    const stmt = this.db.prepare(`
      SELECT DISTINCT name
      FROM plugin_index
      WHERE name LIKE ? OR keywords LIKE ?
      ORDER BY downloads DESC
      LIMIT ?
    `);

    const results = stmt.all(`${lastTerm}%`, `%${lastTerm}%`, limit) as Array<{ name: string }>;
    return results.map(r => r.name);
  }

  /**
   * Track search analytics
   */
  private trackSearch(query: string, filters?: SearchFilters, resultsCount: number = 0): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO search_analytics (query, filters, results_count, searched_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(query, JSON.stringify(filters || {}), resultsCount);

      // Check for search gaps
      if (resultsCount === 0) {
        this.trackSearchGap(query, resultsCount);
      }
    } catch (error) {
      // Non-critical error, just log
      console.warn('Failed to track search:', error);
    }
  }

  /**
   * Track search gaps (queries with no results)
   */
  private trackSearchGap(query: string, resultsCount: number): void {
    const stmt = this.db.prepare(`
      INSERT INTO search_gaps (query, results_count, first_seen, last_seen, occurrence_count)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1)
      ON CONFLICT(query) DO UPDATE SET
        last_seen = CURRENT_TIMESTAMP,
        occurrence_count = occurrence_count + 1
    `);

    stmt.run(query, resultsCount);
  }

  /**
   * Record click on search result
   */
  recordClick(query: string, pluginId: string, position: number, sessionId?: string): void {
    try {
      const stmt = this.db.prepare(`
        UPDATE search_analytics
        SET clicked_plugin_id = ?, click_position = ?
        WHERE query = ? AND session_id = ? AND clicked_plugin_id IS NULL
        ORDER BY searched_at DESC
        LIMIT 1
      `);

      stmt.run(pluginId, position, query, sessionId || '');
    } catch (error) {
      console.warn('Failed to record click:', error);
    }
  }

  /**
   * Get all available categories
   */
  getCategories(): Array<{ name: string, display_name: string, plugin_count: number }> {
    const stmt = this.db.prepare(`
      SELECT c.name, c.display_name, COUNT(pi.id) as plugin_count
      FROM categories c
      LEFT JOIN plugin_index pi ON c.name = pi.category
      WHERE c.is_active = 1
      GROUP BY c.name
      ORDER BY c.sort_order
    `);

    return stmt.all() as Array<{ name: string, display_name: string, plugin_count: number }>;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
