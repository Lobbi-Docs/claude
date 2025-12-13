# Discovery System - Agent Task Delegation

## Overview

This directory contains task specifications for specialized agents implementing the Plugin Discovery System. Each agent has specific expertise and responsibilities.

## Agent Assignments

### Agent 1: Search Engine Specialist (Sonnet 4.5)
**File**: `search-engine.ts`
**Expertise**: Full-text search, FTS5, BM25 ranking, hybrid search algorithms
**Responsibilities**:
- Implement keyword search using SQLite FTS5
- Implement semantic search with vector embeddings
- Create hybrid search combining keyword + semantic
- Build ranking algorithm with configurable weights
- Add query autocompletion and suggestions
- Implement faceted search support

**Key Methods to Implement**:
```typescript
- search(query: SearchQuery): Promise<SearchResponse>
- keywordSearch(query: string, filters?: SearchFilters): Promise<SearchResult[]>
- semanticSearch(embedding: number[], filters?: SearchFilters): Promise<SearchResult[]>
- hybridSearch(query: string, embedding: number[], filters?: SearchFilters): Promise<SearchResult[]>
- rank(results: SearchResult[], weights?: ScoringWeights): SearchResult[]
- suggest(partial: string, limit?: number): Promise<string[]>
- highlightMatches(text: string, terms: string[]): SearchHighlight[]
```

**Database Tables Used**:
- `plugin_index` (main search data)
- `plugin_search_index` (FTS5 virtual table)
- `search_history` (for logging)

**Success Criteria**:
- Search latency <100ms for keyword, <500ms for hybrid
- BM25 ranking implemented correctly
- Fuzzy matching for typo tolerance
- Proper highlighting of search terms
- Query suggestions based on search history

---

### Agent 2: Plugin Indexer Specialist (Sonnet 4.5)
**File**: `plugin-indexer.ts`
**Expertise**: Text processing, TF-IDF, keyword extraction, incremental indexing
**Responsibilities**:
- Index plugin manifests and README files
- Extract keywords using TF-IDF or similar
- Generate embeddings (integration with external service)
- Track content changes for incremental updates
- Build and maintain dependency relationships
- Compute quality scores

**Key Methods to Implement**:
```typescript
- indexPlugin(manifest: PluginManifest, readme?: string): Promise<void>
- indexAll(plugins: PluginManifest[]): Promise<BatchIndexResult>
- updateIndex(pluginId: string): Promise<void>
- deleteFromIndex(pluginId: string): Promise<void>
- extractKeywords(text: string, maxKeywords?: number): Promise<string[]>
- generateEmbedding(text: string): Promise<number[]>
- computeQualityScore(plugin: PluginIndexEntry): Promise<number>
- buildDependencyGraph(pluginId: string): Promise<DependencyGraph>
- detectChanges(pluginId: string, newContent: string): Promise<boolean>
```

**Database Tables Used**:
- `plugin_index`
- `plugin_search_index` (via triggers)
- All other tables as needed for relationships

**Success Criteria**:
- Index update <1s per plugin
- Quality score formula documented and sensible
- Incremental indexing works correctly
- Content hash changes detected
- TF-IDF extraction produces relevant keywords

---

### Agent 3: Recommendation Engine Specialist (Opus 4.5)
**File**: `recommendation-engine.ts`
**Expertise**: Collaborative filtering, content-based filtering, ML algorithms
**Responsibilities**:
- Implement collaborative filtering (co-installation patterns)
- Implement content-based recommendations (similarity)
- Create context-aware suggestions (project type)
- Build trending plugin detection
- Personalize recommendations based on user history
- Track recommendation effectiveness

**Key Methods to Implement**:
```typescript
- recommend(context: RecommendationContext, limit?: number): Promise<RecommendationResponse>
- collaborativeFiltering(userId: string, limit?: number): Promise<Recommendation[]>
- contentBasedFiltering(pluginId: string, limit?: number): Promise<Recommendation[]>
- contextualRecommendations(context: RecommendationContext): Promise<Recommendation[]>
- getTrending(period: TrendingPeriod, limit?: number): Promise<TrendingPlugin[]>
- computeCoInstallationPatterns(): Promise<void>
- computeSimilarityScores(pluginId: string): Promise<SimilarityScore[]>
- trackRecommendation(tracking: RecommendationTracking): Promise<void>
```

**Database Tables Used**:
- `user_installs`
- `plugin_associations`
- `recommendations`
- `plugin_index`

**Success Criteria**:
- Recommendations latency <200ms
- Collaborative filtering produces sensible suggestions
- Content similarity uses embeddings or keyword overlap
- Trending detection works for day/week/month windows
- Recommendation tracking enables A/B testing

---

### Agent 4: Catalog & Browse Specialist (Sonnet 4.5)
**File**: `catalog.ts`
**Expertise**: Data filtering, pagination, faceted search, category hierarchies
**Responsibilities**:
- Implement category browse functionality
- Create multi-criteria filtering
- Build pagination with configurable page sizes
- Implement plugin comparison view
- Generate facets for filter UI
- Provide dependency graph data

**Key Methods to Implement**:
```typescript
- browse(request: CatalogBrowseRequest): Promise<CatalogPage>
- getCategories(): Promise<CategoryInfo[]>
- getCategoryTree(): Promise<CategoryInfo[]>
- filter(criteria: SearchFilters, plugins: PluginIndexEntry[]): PluginIndexEntry[]
- sort(plugins: PluginIndexEntry[], sortBy: SearchSortOption): PluginIndexEntry[]
- paginate(plugins: PluginIndexEntry[], page: number, pageSize: number): CatalogPage
- comparePlugins(pluginIds: string[]): Promise<PluginComparison>
- getFacets(plugins: PluginIndexEntry[]): Promise<Facet[]>
- getDependencyGraph(pluginId: string): Promise<DependencyGraph>
```

**Database Tables Used**:
- `plugin_index`
- Categories (from metadata or separate table)

**Success Criteria**:
- Browse supports all filter combinations
- Pagination handles edge cases (empty, single page, etc.)
- Category hierarchy renders correctly
- Comparison view shows meaningful differences
- Facets update based on current filters

---

### Agent 5: Rating & Review System Specialist (Sonnet 4.5)
**File**: `rating-system.ts`
**Expertise**: Sentiment analysis, review moderation, community features
**Responsibilities**:
- Implement rating submission and retrieval
- Create review system with sentiment analysis
- Build helpful/not helpful voting
- Support author responses
- Implement review moderation
- Compute aggregate rating statistics

**Key Methods to Implement**:
```typescript
- submitRating(rating: RatingSubmission): Promise<Rating>
- getRating(pluginId: string, userId: string): Promise<Rating | null>
- getPluginRatings(pluginId: string, limit?: number, offset?: number): Promise<Rating[]>
- getRatingStats(pluginId: string): Promise<RatingStats>
- voteOnReview(vote: ReviewVote): Promise<void>
- analyzeSentiment(reviewText: string): Promise<{score: number, label: string, confidence: number}>
- flagReview(reviewId: number, userId: string, reason: string): Promise<void>
- moderateReview(reviewId: number, action: ModerationAction): Promise<void>
- respondToReview(reviewId: number, authorResponse: string): Promise<void>
- computeAggregateRating(pluginId: string): Promise<RatingStats>
```

**Database Tables Used**:
- `ratings`
- `review_votes` (with triggers)
- `plugin_index` (to update average_rating)

**Success Criteria**:
- Rating submission validates input (1-5 stars)
- One review per user per plugin enforced
- Sentiment analysis produces reasonable results
- Helpful ratio computed correctly by triggers
- Weighted average accounts for review quality
- Moderation system prevents abuse

---

### Agent 6: Integration & Main API (Sonnet 4.5)
**File**: `index.ts` (main export)
**Expertise**: API design, integration, error handling, configuration
**Responsibilities**:
- Create unified DiscoveryAPI implementation
- Integrate all specialized components
- Implement configuration management
- Add error handling and logging
- Create performance monitoring
- Provide convenience methods

**Key Classes/Functions to Implement**:
```typescript
export class DiscoverySystem implements DiscoveryAPI {
  constructor(config: DiscoveryConfig)

  // Delegate to specialized components
  async search(query: SearchQuery): Promise<SearchResponse>
  async recommend(context: RecommendationContext): Promise<RecommendationResponse>
  async browse(request: CatalogBrowseRequest): Promise<CatalogPage>
  async submitRating(rating: RatingSubmission): Promise<Rating>
  async indexPlugin(manifest: PluginManifest, readme?: string): Promise<void>

  // Utility methods
  async initialize(): Promise<void>
  async close(): Promise<void>
  getStats(): Promise<IndexStats>
}

export function createDiscoverySystem(config: DiscoveryConfig): DiscoverySystem
```

**Components to Integrate**:
- SearchEngine
- PluginIndexer
- RecommendationEngine
- Catalog
- RatingSystem

**Success Criteria**:
- All components initialized correctly
- Error handling wraps lower-level errors
- Configuration validated on startup
- Database migrations applied automatically
- Performance metrics tracked
- Graceful shutdown/cleanup

---

### Agent 7: Testing Specialist (Sonnet 4.5)
**File**: `__tests__/discovery.test.ts`
**Expertise**: Test automation, edge cases, integration testing
**Responsibilities**:
- Write unit tests for all components
- Create integration tests for workflows
- Test edge cases and error handling
- Benchmark performance
- Create test fixtures and mocks
- Document test coverage

**Test Suites to Create**:
```typescript
describe('SearchEngine', () => {
  test('keyword search returns ranked results')
  test('semantic search uses embeddings')
  test('hybrid search combines scores')
  test('handles empty query')
  test('respects filters')
  test('search performance <100ms')
})

describe('PluginIndexer', () => {
  test('indexes new plugin')
  test('updates existing plugin')
  test('detects content changes')
  test('extracts keywords')
  test('computes quality score')
})

describe('RecommendationEngine', () => {
  test('collaborative filtering works')
  test('content-based filtering works')
  test('trending detection works')
  test('context-aware suggestions')
})

describe('Catalog', () => {
  test('browse by category')
  test('apply filters')
  test('pagination works')
  test('compare plugins')
})

describe('RatingSystem', () => {
  test('submit rating')
  test('vote on review')
  test('compute aggregate rating')
  test('sentiment analysis')
})

describe('Integration', () => {
  test('end-to-end search workflow')
  test('end-to-end recommendation workflow')
  test('concurrent operations')
})
```

**Success Criteria**:
- >80% code coverage
- All critical paths tested
- Performance benchmarks pass
- Integration tests pass
- Edge cases handled

---

## Execution Order

### Phase 1 (Parallel): Foundation
- Agent 2: Plugin Indexer
- Agent 4: Catalog & Browse
- Agent 5: Rating System

### Phase 2 (Parallel): Intelligence
- Agent 1: Search Engine (depends on Indexer)
- Agent 3: Recommendation Engine (depends on Indexer)

### Phase 3 (Sequential): Integration
- Agent 6: Main API Integration

### Phase 4 (Final): Quality
- Agent 7: Testing

## Communication Protocol

Each agent should:
1. Read the implementation plan and this task file
2. Review the database schema and types
3. Implement their assigned component
4. Add comprehensive JSDoc comments
5. Follow TypeScript strict mode
6. Use the existing database connection patterns
7. Report completion with summary of what was built
8. Note any dependencies or blockers

## Shared Resources

- Database: `.claude/orchestration/db/discovery.db` (created from schema)
- Types: `.claude/core/discovery/types.ts`
- Config: Passed via `DiscoveryConfig`
- Test Data: Create fixtures in `__tests__/fixtures/`

## Success Metrics

- All components implemented with <2% bugs
- Performance targets met
- Tests pass with >80% coverage
- Documentation complete
- Integration works end-to-end
