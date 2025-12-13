/**
 * Discovery API
 * Main entry point for plugin discovery functionality
 */

import * as path from 'path';
import { SearchEngine } from './search-engine';
import { RecommendationEngine } from './recommendation-engine';
import { DiscoveryAnalytics } from './analytics';
import { PluginIndexer } from './indexer';
import {
  SearchFilters,
  SearchOptions,
  SearchResults,
  RecommendationContext,
  RecommendedPlugin,
  TrendingPeriod,
  Category,
  DiscoveryResponse,
  IndexBuildOptions,
  AnalyticsSummary,
  PluginIndexEntry
} from './types';

export class DiscoveryAPI {
  private dbPath: string;
  private searchEngine: SearchEngine;
  private recommendationEngine: RecommendationEngine;
  private analytics: DiscoveryAnalytics;
  private indexer: PluginIndexer;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.searchEngine = new SearchEngine(dbPath);
    this.recommendationEngine = new RecommendationEngine(dbPath);
    this.analytics = new DiscoveryAnalytics(dbPath);
    this.indexer = new PluginIndexer(dbPath);
  }

  /**
   * Search for plugins
   */
  async search(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<DiscoveryResponse<SearchResults>> {
    const startTime = Date.now();

    try {
      const mergedOptions: SearchOptions = {
        ...options,
        filters
      };

      const results = await this.searchEngine.search(query, mergedOptions);

      return {
        success: true,
        data: results,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Fuzzy search with typo tolerance
   */
  async fuzzySearch(
    query: string,
    filters?: SearchFilters,
    options?: SearchOptions
  ): Promise<DiscoveryResponse<SearchResults>> {
    const startTime = Date.now();

    try {
      const mergedOptions: SearchOptions = {
        ...options,
        filters
      };

      const results = await this.searchEngine.fuzzySearch(query, mergedOptions);

      return {
        success: true,
        data: results,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async getSuggestions(
    partial: string,
    limit: number = 10
  ): Promise<DiscoveryResponse<string[]>> {
    const startTime = Date.now();

    try {
      const suggestions = this.searchEngine.getSuggestions(partial, limit);

      return {
        success: true,
        data: suggestions,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Get personalized recommendations
   */
  async recommend(
    context: RecommendationContext
  ): Promise<DiscoveryResponse<RecommendedPlugin[]>> {
    const startTime = Date.now();

    try {
      const recommendations = await this.recommendationEngine.recommend(context);

      return {
        success: true,
        data: recommendations,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false  // Cache tracking happens internally
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Get trending plugins
   */
  async trending(
    period: TrendingPeriod = 'week',
    limit: number = 10
  ): Promise<DiscoveryResponse<RecommendedPlugin[]>> {
    const startTime = Date.now();

    try {
      const trending = await this.recommendationEngine.getTrending(period, limit);

      return {
        success: true,
        data: trending,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Get plugins similar to a specific plugin
   */
  async similar(
    pluginId: string,
    limit: number = 10
  ): Promise<DiscoveryResponse<RecommendedPlugin[]>> {
    const startTime = Date.now();

    try {
      const similar = await this.recommendationEngine.getSimilar(pluginId, limit);

      return {
        success: true,
        data: similar,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Get all available categories
   */
  async categories(): Promise<DiscoveryResponse<Category[]>> {
    const startTime = Date.now();

    try {
      const categories = this.searchEngine.getCategories();

      // Convert to Category type
      const categoryList: Category[] = categories.map(c => ({
        name: c.name,
        display_name: c.display_name,
        plugin_count: c.plugin_count,
        sort_order: 0,
        is_active: true
      }));

      return {
        success: true,
        data: categoryList,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Record plugin installation
   */
  recordInstall(
    pluginId: string,
    userId?: string,
    version?: string,
    source?: string
  ): void {
    this.recommendationEngine.recordInstallation(pluginId, userId, version, source);
  }

  /**
   * Record plugin uninstallation
   */
  recordUninstall(pluginId: string, userId?: string): void {
    this.recommendationEngine.recordUninstallation(pluginId, userId);
  }

  /**
   * Record search result click
   */
  recordClick(
    query: string,
    pluginId: string,
    position: number,
    sessionId?: string
  ): void {
    this.searchEngine.recordClick(query, pluginId, position, sessionId);
  }

  /**
   * Get analytics summary
   */
  async getAnalytics(daysBack: number = 30): Promise<DiscoveryResponse<AnalyticsSummary>> {
    const startTime = Date.now();

    try {
      const summary = this.analytics.getSummary(daysBack);

      return {
        success: true,
        data: summary,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Build or rebuild the search index
   */
  async buildIndex(
    registryPath: string,
    options?: IndexBuildOptions
  ): Promise<DiscoveryResponse<{ indexed: number; failed: number; duration: number }>> {
    const startTime = Date.now();

    try {
      const result = await this.indexer.buildIndex(registryPath, options);

      return {
        success: true,
        data: {
          indexed: result.indexed,
          failed: result.failed,
          duration: result.duration
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Update TF-IDF index
   */
  async updateTFIDF(): Promise<DiscoveryResponse<void>> {
    const startTime = Date.now();

    try {
      this.indexer.computeTFIDF();

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Update plugin relationships for collaborative filtering
   */
  async updateRelationships(): Promise<DiscoveryResponse<void>> {
    const startTime = Date.now();

    try {
      this.indexer.updatePluginRelationships();

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Update trending scores
   */
  async updateTrending(): Promise<DiscoveryResponse<void>> {
    const startTime = Date.now();

    try {
      this.indexer.updateTrendingScores();

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Clean expired cache and old data
   */
  async cleanup(analyticsRetentionDays: number = 90): Promise<DiscoveryResponse<{
    cacheCleared: number;
    analyticsDeleted: number;
  }>> {
    const startTime = Date.now();

    try {
      const cacheCleared = this.recommendationEngine.cleanExpiredCache();
      const analyticsDeleted = this.analytics.cleanOldData(analyticsRetentionDays);

      return {
        success: true,
        data: {
          cacheCleared,
          analyticsDeleted
        },
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Optimize database
   */
  async optimize(): Promise<DiscoveryResponse<void>> {
    const startTime = Date.now();

    try {
      this.indexer.optimize();

      return {
        success: true,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<DiscoveryResponse<{
    totalPlugins: number;
    totalTerms: number;
    avgTermsPerPlugin: number;
    lastBuilt: Date;
    indexSize: number;
  }>> {
    const startTime = Date.now();

    try {
      const stats = this.indexer.getStats();

      return {
        success: true,
        data: stats,
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date(),
          executionTime: Date.now() - startTime,
          cached: false
        }
      };
    }
  }

  /**
   * Close all database connections
   */
  close(): void {
    this.searchEngine.close();
    this.recommendationEngine.close();
    this.analytics.close();
    this.indexer.close();
  }
}

/**
 * Create a discovery API instance
 */
export function createDiscoveryAPI(dbPath?: string): DiscoveryAPI {
  const defaultDbPath = path.join(process.cwd(), '.claude', 'core', 'discovery', 'db', 'discovery.db');
  return new DiscoveryAPI(dbPath || defaultDbPath);
}

/**
 * Export all types for consumers
 */
export * from './types';
