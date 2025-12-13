/**
 * Type definitions for the Plugin Discovery System
 *
 * Establishes scalable data management patterns for intelligent plugin discovery,
 * semantic search, and AI-powered recommendations across the Claude Code ecosystem.
 *
 * Best for: Plugin marketplaces, discovery interfaces, recommendation engines
 */

import type { PluginManifest } from '../types.js';

// ============================================================================
// CORE PLUGIN TYPES
// ============================================================================

/**
 * Plugin metadata in the index
 */
export interface PluginIndexEntry {
  id?: number;
  plugin_id: string;
  name: string;
  version: string;
  description?: string;
  author_name?: string;
  author_email?: string;
  license?: string;
  homepage?: string;
  repository_url?: string;
  category?: string;
  tags?: string[];  // JSON array
  keywords?: string;
  readme_content?: string;
  downloads: number;
  rating: number;
  rating_count: number;
  created_at?: Date;
  updated_at?: Date;
  published_at?: Date;
  last_modified_at?: Date;
  is_featured: boolean;
  is_deprecated: boolean;
  metadata?: Record<string, any>;
}

/**
 * Search filters for plugin discovery
 */
export interface SearchFilters {
  category?: string;
  tags?: string[];
  author?: string;
  minRating?: number;
  minDownloads?: number;
  maxDownloads?: number;
  isFeatured?: boolean;
  excludeDeprecated?: boolean;
  publishedAfter?: Date;
  publishedBefore?: Date;
}

/**
 * Search options
 */
export interface SearchOptions {
  filters?: SearchFilters;
  sort?: 'relevance' | 'downloads' | 'rating' | 'recent' | 'name';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeReadme?: boolean;
}

/**
 * Search result item with scoring
 */
export interface SearchResultItem {
  plugin: PluginIndexEntry;
  score: number;
  tf_idf_score: number;
  download_score: number;
  rating_score: number;
  recency_score: number;
  relevance_boost: number;
  matchedFields: string[];  // Fields that matched the query
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Complete search results
 */
export interface SearchResults {
  query: string;
  results: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  executionTime: number;  // milliseconds
  filters?: SearchFilters;
}

/**
 * Recommendation context for personalized suggestions
 */
export interface RecommendationContext {
  userId?: string;
  installedPlugins?: string[];
  recentSearches?: string[];
  currentCategory?: string;
  limit?: number;
  excludeInstalled?: boolean;
}

/**
 * Recommended plugin with explanation
 */
export interface RecommendedPlugin {
  plugin: PluginIndexEntry;
  score: number;
  reason: string;
  type: 'collaborative' | 'content_based' | 'trending' | 'popular';
}

/**
 * TF-IDF term score
 */
export interface TFIDFScore {
  term: string;
  plugin_id: string;
  term_frequency: number;
  inverse_document_frequency: number;
  tfidf_score: number;
  field: string;
}

/**
 * Document frequency for IDF calculation
 */
export interface DocumentFrequency {
  term: string;
  document_count: number;
  total_documents: number;
  idf_score: number;
  last_updated: Date;
}

/**
 * Install statistics entry
 */
export interface InstallStat {
  id?: number;
  plugin_id: string;
  installed_at: Date;
  user_id?: string;
  version?: string;
  uninstalled_at?: Date;
  installation_source?: string;
}

/**
 * Search analytics entry
 */
export interface SearchAnalytic {
  id?: number;
  query: string;
  filters?: string;
  results_count: number;
  clicked_plugin_id?: string;
  click_position?: number;
  searched_at: Date;
  session_id?: string;
  user_id?: string;
}

/**
 * Plugin relationship for collaborative filtering
 */
export interface PluginRelationship {
  id?: number;
  plugin_a: string;
  plugin_b: string;
  co_install_count: number;
  confidence: number;
  last_updated: Date;
}

/**
 * Recommendation cache entry
 */
export interface RecommendationCache {
  id?: number;
  cache_key: string;
  recommendation_type: string;
  context?: string;
  results: string;  // JSON
  generated_at: Date;
  expires_at: Date;
  hit_count: number;
}

/**
 * Trending plugin data
 */
export interface TrendingPlugin {
  plugin_id: string;
  installs_today: number;
  installs_week: number;
  installs_month: number;
  velocity_score: number;
  last_updated: Date;
}

/**
 * Category metadata
 */
export interface Category {
  id?: number;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  parent_category?: string;
  plugin_count: number;
  sort_order: number;
  is_active: boolean;
}

/**
 * Search gap tracking
 */
export interface SearchGap {
  id?: number;
  query: string;
  results_count: number;
  first_seen: Date;
  last_seen: Date;
  occurrence_count: number;
  status: 'open' | 'addressed' | 'ignored';
  notes?: string;
}

/**
 * Trending period
 */
export type TrendingPeriod = 'day' | 'week' | 'month';

/**
 * Analytics summary
 */
export interface AnalyticsSummary {
  topSearches: Array<{
    query: string;
    count: number;
    avgResults: number;
  }>;
  searchGaps: Array<{
    query: string;
    count: number;
  }>;
  clickThroughRate: {
    overall: number;
    byQuery: Array<{
      query: string;
      ctr: number;
    }>;
  };
  popularPlugins: Array<{
    plugin_id: string;
    name: string;
    downloads: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

/**
 * Index build options
 */
export interface IndexBuildOptions {
  rebuild?: boolean;  // Full rebuild vs incremental
  computeTFIDF?: boolean;
  updateRelationships?: boolean;
  updateTrending?: boolean;
}

/**
 * Index statistics
 */
export interface IndexStats {
  totalPlugins: number;
  totalTerms: number;
  avgTermsPerPlugin: number;
  lastBuilt: Date;
  buildDuration: number;
  indexSize: number;  // bytes
}

/**
 * Tokenization result
 */
export interface TokenizationResult {
  tokens: string[];
  stems: string[];
  stopWordsRemoved: number;
}

/**
 * Search scoring weights
 */
export interface ScoringWeights {
  tf_idf: number;      // Default 0.4
  downloads: number;   // Default 0.2
  rating: number;      // Default 0.2
  recency: number;     // Default 0.1
  relevance: number;   // Default 0.1
}

/**
 * Plugin similarity score
 */
export interface SimilarityScore {
  plugin_a: string;
  plugin_b: string;
  similarity: number;
  common_tags: string[];
  common_keywords: string[];
}

/**
 * User plugin profile
 */
export interface UserPluginProfile {
  user_id: string;
  installed_plugins: string[];
  preferred_categories: string[];
  search_history: string[];
  install_count: number;
  avg_rating_given: number;
}

/**
 * Discovery API response wrapper
 */
export interface DiscoveryResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: Date;
    executionTime: number;
    cached: boolean;
  };
}

/**
 * Batch indexing result
 */
export interface BatchIndexResult {
  indexed: number;
  skipped: number;
  failed: number;
  errors: Array<{
    plugin_id: string;
    error: string;
  }>;
  duration: number;
}
