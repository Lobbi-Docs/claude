# Plugin Discovery System

A comprehensive semantic search and recommendation engine for Claude Code plugins, featuring TF-IDF based text search, collaborative filtering, content-based recommendations, and detailed analytics.

## Features

### 🔍 Semantic Search
- **TF-IDF scoring** for intelligent text ranking
- **Fuzzy matching** with typo tolerance
- **Full-text search** using SQLite FTS5
- **Advanced filtering** by category, rating, downloads, tags, and more
- **Autocomplete suggestions** for search queries

### 🎯 Intelligent Recommendations
- **Collaborative filtering**: "Users who installed X also installed Y"
- **Content-based filtering**: Similar descriptions, tags, and keywords
- **Trending plugins**: Based on recent install velocity
- **Similar plugins**: Find related plugins based on content similarity
- **Personalized suggestions**: Based on user's installed plugins

### 📊 Analytics & Insights
- **Search analytics**: Track queries, results, and click patterns
- **Click-through rates**: Monitor search effectiveness
- **Search gaps**: Identify queries with no results
- **Trending searches**: Detect emerging plugin interests
- **Quality scoring**: Measure search result quality
- **Conversion funnels**: Track from search to installation

## Architecture

### Components

```
discovery/
├── api.ts                    # Main API facade
├── search-engine.ts          # TF-IDF semantic search
├── recommendation-engine.ts  # Collaborative & content-based filtering
├── analytics.ts              # Discovery metrics and tracking
├── indexer.ts                # Index building and management
├── types.ts                  # TypeScript type definitions
└── db/
    └── discovery.sql         # SQLite schema with FTS5
```

### Database Schema

- **plugin_index**: Core plugin metadata
- **plugin_search**: FTS5 virtual table for full-text search
- **tfidf_index**: Pre-computed TF-IDF scores
- **document_frequency**: IDF calculations
- **install_stats**: Installation tracking
- **search_analytics**: Search behavior tracking
- **plugin_relationships**: Co-installation patterns
- **trending_plugins**: Install velocity metrics
- **recommendation_cache**: Cached recommendations with TTL

## Usage

### Basic Search

```typescript
import { createDiscoveryAPI } from './discovery';

const discovery = createDiscoveryAPI();

// Simple search
const results = await discovery.search('authentication', {
  filters: {
    category: 'agents',
    minRating: 4.0,
    excludeDeprecated: true
  },
  sort: 'relevance',
  limit: 20
});

console.log(`Found ${results.data.total} plugins`);
results.data.results.forEach(item => {
  console.log(`${item.plugin.name} - Score: ${item.score}`);
});
```

### Fuzzy Search

```typescript
// Handles typos and partial matches
const results = await discovery.fuzzySearch('autentication'); // Note the typo
```

### Autocomplete

```typescript
const suggestions = await discovery.getSuggestions('auth');
// Returns: ['authentication-agent', 'auth-helper', 'authorize-cli', ...]
```

### Recommendations

```typescript
// Personalized recommendations
const recommendations = await discovery.recommend({
  userId: 'user123',
  installedPlugins: ['plugin-a', 'plugin-b'],
  currentCategory: 'agents',
  limit: 10,
  excludeInstalled: true
});

recommendations.data.forEach(rec => {
  console.log(`${rec.plugin.name} - ${rec.reason} (${rec.type})`);
});
```

### Trending Plugins

```typescript
const trending = await discovery.trending('week', 10);
// Get top 10 trending plugins this week
```

### Similar Plugins

```typescript
const similar = await discovery.similar('my-plugin-id', 5);
// Find 5 plugins similar to 'my-plugin-id'
```

### Analytics

```typescript
// Get analytics summary
const analytics = await discovery.getAnalytics(30); // Last 30 days

console.log('Top searches:', analytics.data.topSearches);
console.log('Search gaps:', analytics.data.searchGaps);
console.log('CTR:', analytics.data.clickThroughRate.overall);
console.log('Popular plugins:', analytics.data.popularPlugins);
```

### Tracking Events

```typescript
// Record installation
discovery.recordInstall('plugin-id', 'user123', '1.0.0', 'search');

// Record search click
discovery.recordClick('authentication', 'plugin-id', 1, 'session123');

// Record uninstallation
discovery.recordUninstall('plugin-id', 'user123');
```

### Index Management

```typescript
// Build index from registry
const result = await discovery.buildIndex('./registry', {
  rebuild: true,
  computeTFIDF: true,
  updateRelationships: true,
  updateTrending: true
});

console.log(`Indexed ${result.data.indexed} plugins in ${result.data.duration}ms`);

// Update specific components
await discovery.updateTFIDF();
await discovery.updateRelationships();
await discovery.updateTrending();

// Get index stats
const stats = await discovery.getIndexStats();
console.log(`Index contains ${stats.data.totalPlugins} plugins, ${stats.data.totalTerms} terms`);

// Optimize database
await discovery.optimize();

// Cleanup old data
const cleanup = await discovery.cleanup(90); // Keep last 90 days
console.log(`Cleared ${cleanup.data.cacheCleared} cache entries`);
```

## Search Algorithm

The search engine uses a weighted scoring algorithm:

```
score = tf_idf_score * 0.4 +
        download_score * 0.2 +
        rating_score * 0.2 +
        recency_score * 0.1 +
        relevance_boost * 0.1
```

### Scoring Components

1. **TF-IDF Score (40%)**: Semantic relevance based on term frequency and inverse document frequency
2. **Download Score (20%)**: Normalized plugin download count
3. **Rating Score (20%)**: Plugin rating (0-5 scale)
4. **Recency Score (10%)**: Newer plugins get a slight boost
5. **Relevance Boost (10%)**: Exact/partial name matches, featured plugins

### Custom Weights

```typescript
import { SearchEngine } from './discovery';

const engine = new SearchEngine(dbPath, {
  tf_idf: 0.5,     // Increase semantic relevance
  downloads: 0.15,
  rating: 0.25,
  recency: 0.05,
  relevance: 0.05
});
```

## Recommendation Algorithms

### Collaborative Filtering

Finds plugins frequently co-installed with user's plugins using confidence scores:

```
confidence = co_install_count / total_users_with_plugin_a
```

### Content-Based Filtering

Uses Jaccard similarity for tags and keywords:

```
similarity = (common_items) / (all_items)
combined_similarity = tag_similarity * 0.6 + keyword_similarity * 0.4
```

### Trending Score

Weighted install velocity:

```
velocity = installs_today * 10 + installs_week * 3 + installs_month
```

## Performance

- **FTS5**: Efficient full-text search using Porter stemming
- **Indexed queries**: All searches use database indexes
- **Cached recommendations**: Results cached with configurable TTL
- **Batch operations**: Transaction-based bulk updates
- **Lazy loading**: On-demand index building

### Cache TTL

- Collaborative filtering: 1 hour
- Content-based filtering: 2 hours
- Trending: 30 minutes
- Similar plugins: 1 hour

## Data Privacy

- User IDs are optional for all operations
- Analytics can be anonymized
- Search tracking can be disabled
- Old data automatically cleaned up (configurable retention)

## Maintenance

### Regular Tasks

```typescript
// Daily
await discovery.updateTrending();

// Weekly
await discovery.updateRelationships();
await discovery.cleanup(90);

// Monthly
await discovery.updateTFIDF();
await discovery.optimize();
```

### Rebuilding Index

```typescript
// Full rebuild (when adding many new plugins)
await discovery.buildIndex('./registry', {
  rebuild: true,
  computeTFIDF: true,
  updateRelationships: true,
  updateTrending: true
});

// Incremental update (for a few new plugins)
const indexer = new PluginIndexer(dbPath);
indexer.indexPlugin(manifest, readme);
indexer.close();
```

## Error Handling

All API methods return a `DiscoveryResponse<T>` with:

```typescript
interface DiscoveryResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    timestamp: Date;
    executionTime: number;
    cached: boolean;
  };
}
```

Example:

```typescript
const result = await discovery.search('test');

if (result.success) {
  console.log(`Found ${result.data.total} results in ${result.metadata.executionTime}ms`);
} else {
  console.error(`Search failed: ${result.error}`);
}
```

## Integration

### With Plugin CLI

```typescript
import { createDiscoveryAPI } from '@claude/core/discovery';

const discovery = createDiscoveryAPI();

// In search command
async function searchPlugins(query: string) {
  const results = await discovery.search(query);
  return results.data;
}

// In install command
async function installPlugin(pluginId: string) {
  // ... installation logic ...
  discovery.recordInstall(pluginId, getCurrentUserId(), plugin.version, 'cli');
}
```

### With Web UI

```typescript
// Search with autocomplete
const handleSearchInput = debounce(async (input: string) => {
  const suggestions = await discovery.getSuggestions(input, 5);
  setSuggestions(suggestions.data);
}, 300);

// Display recommendations on plugin page
const relatedPlugins = await discovery.similar(currentPlugin.id, 5);

// Show trending in sidebar
const trending = await discovery.trending('week', 10);
```

## Testing

See `__tests__/discovery/` for comprehensive test suite.

```bash
npm test -- discovery
```

## License

MIT
