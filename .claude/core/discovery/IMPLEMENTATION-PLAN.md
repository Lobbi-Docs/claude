# Plugin Discovery System - Implementation Plan

## Overview

Implement an intelligent plugin discovery system with semantic search, AI-powered recommendations, and comprehensive plugin management for the Claude Code plugin ecosystem.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Discovery System                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Search     │  │   Indexer    │  │ Recommender  │      │
│  │   Engine     │  │              │  │   Engine     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                    ┌───────▼────────┐                        │
│                    │   Discovery    │                        │
│                    │    Database    │                        │
│                    │   (SQLite)     │                        │
│                    └───────┬────────┘                        │
│                            │                                 │
│  ┌──────────────┐  ┌──────▼───────┐  ┌──────────────┐      │
│  │   Catalog    │  │    Rating    │  │   Analytics  │      │
│  │              │  │    System    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Indexing**: Plugin manifests → Indexer → Embeddings + Keywords → Database
2. **Search**: Query → Search Engine → Hybrid (keyword + semantic) → Ranked Results
3. **Recommendations**: User Context + Install History → Recommendation Engine → Personalized Suggestions
4. **Browse**: Category/Filters → Catalog → Paginated Results
5. **Ratings**: User Reviews → Rating System → Aggregated Scores + Sentiment

## Database Schema (`discovery.sql`)

### Tables

#### `plugin_index`
Full-text searchable plugin metadata with embeddings
- FTS5 virtual table for fast keyword search
- JSON column for embeddings (vector similarity)
- Rich metadata (category, tags, author, description)

#### `search_history`
Track search queries for analytics and recommendations
- Query text, results returned, timestamp
- Used for trending searches and query suggestions

#### `user_installs`
Installation lifecycle tracking
- When plugins were installed/uninstalled
- Used for collaborative filtering ("users who installed X also installed Y")

#### `recommendations`
Recommendation tracking and effectiveness measurement
- What was recommended, why, was it clicked/installed
- Feedback loop for improving recommendations

#### `ratings`
Plugin ratings and reviews
- Star ratings (1-5), review text, sentiment score
- Helpful/not helpful voting on reviews

#### `review_votes`
Community moderation of reviews
- Track which reviews users find helpful
- Weight ratings based on review quality

## TypeScript Components

### 1. Types (`types.ts`)

Extended types for discovery system:
- `SearchQuery`, `SearchResult`, `SearchFilters`
- `PluginIndexEntry`, `EmbeddingVector`
- `Recommendation`, `RecommendationContext`
- `Rating`, `Review`, `ReviewVote`
- `CatalogPage`, `CategoryHierarchy`

### 2. Search Engine (`search-engine.ts`)

**Key Features:**
- Hybrid search (keyword + semantic)
- FTS5 with BM25 ranking
- Vector similarity using cosine distance
- Faceted search and filtering
- Result ranking algorithm combining:
  - Keyword relevance score
  - Semantic similarity score
  - Popularity score
  - Quality score (based on ratings)
  - Recency score

**Methods:**
- `search(query, filters)`: Main search entry point
- `keywordSearch(query)`: FTS5 full-text search
- `semanticSearch(embedding)`: Vector similarity search
- `hybridSearch(query, embedding)`: Combined approach
- `rank(results)`: Apply ranking algorithm
- `suggest(partial)`: Query autocompletion

### 3. Plugin Indexer (`plugin-indexer.ts`)

**Key Features:**
- Index plugin manifests and READMEs
- Extract keywords using TF-IDF
- Generate embeddings (placeholder for external service)
- Incremental re-indexing on changes
- Dependency relationship mapping

**Methods:**
- `indexPlugin(manifest, readme)`: Index single plugin
- `indexAll()`: Full reindex
- `updateIndex(pluginName)`: Incremental update
- `extractKeywords(text)`: TF-IDF keyword extraction
- `generateEmbedding(text)`: Create semantic embedding
- `buildDependencyGraph()`: Map plugin relationships

### 4. Recommendation Engine (`recommendation-engine.ts`)

**Recommendation Strategies:**

1. **Collaborative Filtering**
   - "Users who installed X also installed Y"
   - Association rule mining (A→B confidence)

2. **Content-Based Filtering**
   - Similar plugins by category, keywords, description
   - Embedding similarity

3. **Context-Aware**
   - Based on project type (detected from package.json, files)
   - Based on currently installed plugins

4. **Trending**
   - Most installed recently
   - Fastest growing

5. **Personalized**
   - Based on user's install history
   - Based on user's search history

**Methods:**
- `recommend(context, limit)`: Get personalized recommendations
- `similarPlugins(pluginId, limit)`: Content-based similarity
- `trending(timeWindow, limit)`: Popular plugins
- `collaborative(userId, limit)`: Collaborative filtering
- `contextual(projectContext)`: Project-aware suggestions

### 5. Catalog (`catalog.ts`)

**Features:**
- Browse by category hierarchy
- Multi-criteria filtering
- Sort by various metrics
- Pagination with page size control
- Plugin comparison view
- Dependency graph data

**Methods:**
- `browse(category, page, filters)`: Main browse interface
- `getCategories()`: Category hierarchy
- `filter(criteria)`: Apply filters
- `sort(by, order)`: Sort results
- `compare(pluginIds)`: Side-by-side comparison
- `getDependencyGraph(pluginId)`: Visualization data

### 6. Rating System (`rating-system.ts`)

**Features:**
- Star ratings with weighted averages
- Review text with sentiment analysis
- Helpful/not helpful voting
- Author responses
- Review moderation flags

**Methods:**
- `rate(pluginId, userId, rating)`: Submit rating
- `review(pluginId, userId, review)`: Submit review
- `vote(reviewId, userId, helpful)`: Vote on review
- `getAggregateRating(pluginId)`: Get weighted average
- `analyzeSentiment(reviewText)`: Sentiment analysis
- `flagReview(reviewId, reason)`: Moderation

## Implementation Strategy

### Phase 1: Database Layer (Agent: database-schema-architect)
- Create `discovery.sql` schema
- Implement migrations
- Add indexes for performance
- Set up FTS5 virtual tables

### Phase 2: Core Indexing (Agent: search-indexing-specialist)
- Implement `plugin-indexer.ts`
- TF-IDF keyword extraction
- Embedding generation integration
- Incremental indexing logic

### Phase 3: Search Engine (Agent: search-ranking-engineer)
- Implement `search-engine.ts`
- Hybrid search algorithm
- Ranking function
- Query suggestions

### Phase 4: Recommendations (Agent: recommendation-algorithm-specialist)
- Implement `recommendation-engine.ts`
- Collaborative filtering
- Content-based filtering
- Context-aware suggestions

### Phase 5: Catalog & Ratings (Agent: catalog-rating-specialist)
- Implement `catalog.ts`
- Implement `rating-system.ts`
- Category management
- Review system

### Phase 6: Integration & Testing (Agent: integration-testing-specialist)
- Write comprehensive tests
- Integration testing
- Performance benchmarks
- Edge case handling

### Phase 7: Documentation (Agent: technical-documentation-specialist)
- API documentation
- Usage examples
- Architecture diagrams
- Migration guides

## Dependencies

- `better-sqlite3`: SQLite database driver (already installed)
- `natural` or similar: TF-IDF and NLP (to be added)
- External embedding service (OpenAI, Anthropic, or local model)

## Performance Targets

- Search latency: <100ms for keyword, <500ms for hybrid
- Index update: <1s per plugin
- Recommendations: <200ms
- Support 10,000+ plugins without degradation

## Scalability Considerations

- SQLite FTS5 is sufficient for 10K-100K plugins
- Consider PostgreSQL with pgvector for larger scale
- Cache popular queries and results
- Lazy load embeddings for semantic search

## Security & Privacy

- No PII in search/recommendation logs (user_id is UUID)
- Reviews can be pseudonymous
- Rate limiting on search API
- Sanitize review text for XSS

## Next Steps

1. Create specialized agents for each phase
2. Implement components in parallel where possible
3. Integrate with existing plugin system
4. Add discovery UI in future iteration
