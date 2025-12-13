# Discovery System - Quick Start Guide

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd C:\Users\MarkusAhling\pro\alpha-0.1\claude\.claude\core
npm install better-sqlite3 @types/better-sqlite3
```

### 2. Build Index

```bash
# Using CLI
npx tsx discovery/cli.ts build-index ../registry

# Or programmatically
import { createDiscoveryAPI } from './discovery';
const discovery = createDiscoveryAPI();
await discovery.buildIndex('../registry', {
  rebuild: true,
  computeTFIDF: true,
  updateRelationships: true,
  updateTrending: true
});
```

### 3. Try It Out

```typescript
import { createDiscoveryAPI } from './discovery';

const discovery = createDiscoveryAPI();

// Search
const results = await discovery.search('authentication');
console.log(`Found ${results.data.total} plugins`);

// Get recommendations
const recs = await discovery.recommend({
  installedPlugins: ['auth-agent'],
  limit: 5
});

// Get trending
const trending = await discovery.trending('week', 10);

// Always close when done
discovery.close();
```

## Common Use Cases

### Search with Filters

```typescript
const results = await discovery.search('database', {
  filters: {
    category: 'skills',
    minRating: 4.0,
    minDownloads: 100,
    excludeDeprecated: true
  },
  sort: 'downloads',
  limit: 20
});
```

### Autocomplete Search Box

```typescript
// In your UI component
const handleInputChange = debounce(async (value: string) => {
  const suggestions = await discovery.getSuggestions(value, 10);
  setSuggestions(suggestions.data);
}, 300);
```

### "Users Also Installed" Widget

```typescript
const recommendations = await discovery.recommend({
  userId: currentUser.id,
  installedPlugins: currentUser.plugins,
  limit: 5,
  excludeInstalled: true
});
```

### Similar Plugins Section

```typescript
const similar = await discovery.similar(currentPlugin.id, 5);
```

### Trending Sidebar

```typescript
const trending = await discovery.trending('week', 10);
```

## CLI Commands

```bash
# Search
npx tsx discovery/cli.ts search authentication

# Get trending
npx tsx discovery/cli.ts trending week 10

# Get recommendations
npx tsx discovery/cli.ts recommend auth-agent database-connector

# Find similar plugins
npx tsx discovery/cli.ts similar auth-agent 5

# View analytics
npx tsx discovery/cli.ts analytics 30

# Maintenance
npx tsx discovery/cli.ts update-tfidf
npx tsx discovery/cli.ts update-trending
npx tsx discovery/cli.ts cleanup 90
npx tsx discovery/cli.ts optimize
```

## Maintenance Tasks

### Daily (Automated)

```typescript
// Update trending scores based on recent installs
await discovery.updateTrending();
```

### Weekly (Automated)

```typescript
// Update plugin co-installation relationships
await discovery.updateRelationships();

// Clean old analytics
await discovery.cleanup(90);
```

### Monthly (Manual)

```typescript
// Rebuild TF-IDF index
await discovery.updateTFIDF();

// Optimize database
await discovery.optimize();
```

## Tracking Events

```typescript
// When user installs a plugin
discovery.recordInstall(
  pluginId,
  userId,        // optional
  version,       // optional
  'search'       // source: search, recommendation, manual
);

// When user clicks search result
discovery.recordClick(
  query,
  pluginId,
  position,      // 1-based position in results
  sessionId      // optional
);

// When user uninstalls
discovery.recordUninstall(pluginId, userId);
```

## Environment Variables

```bash
# Optional: Custom database path
export DISCOVERY_DB_PATH=/path/to/discovery.db
```

## Performance Tips

1. **Cache Warmup**: Build index once, updates are incremental
2. **Batch Operations**: Use transactions for multiple plugins
3. **Monitor Cache Hit Rate**: Check `hit_count` in cache table
4. **Regular Cleanup**: Remove old analytics (90+ days)
5. **Optimize Weekly**: Run VACUUM and ANALYZE

## Error Handling

```typescript
const result = await discovery.search('test');

if (!result.success) {
  console.error('Search failed:', result.error);
  // Fallback to basic listing
}
```

## TypeScript Integration

```typescript
import type {
  SearchResults,
  RecommendedPlugin,
  SearchFilters,
  AnalyticsSummary
} from './discovery';

// Full type safety
const results: SearchResults = response.data;
```

## Testing

```bash
# Run all tests
npm test -- discovery

# Run specific test
npm test -- discovery.test.ts -t "should search for plugins"
```

## Troubleshooting

### Database Locked Error
```typescript
// Always close connections
discovery.close();

// Or use try-finally
try {
  await discovery.search('test');
} finally {
  discovery.close();
}
```

### No Search Results
```bash
# Rebuild index
npx tsx discovery/cli.ts build-index ../registry

# Check stats
npx tsx discovery/cli.ts stats
```

### Slow Queries
```bash
# Optimize database
npx tsx discovery/cli.ts optimize
```

## Integration Examples

### Express.js API

```typescript
import express from 'express';
import { createDiscoveryAPI } from './discovery';

const app = express();
const discovery = createDiscoveryAPI();

app.get('/api/search', async (req, res) => {
  const { q, category, sort, limit } = req.query;

  const result = await discovery.search(q as string, {
    filters: { category: category as string },
    sort: sort as any,
    limit: parseInt(limit as string) || 20
  });

  res.json(result);
});

app.get('/api/trending', async (req, res) => {
  const result = await discovery.trending('week', 10);
  res.json(result);
});

// Cleanup on shutdown
process.on('SIGTERM', () => discovery.close());
```

### React Hook

```typescript
import { useState, useEffect } from 'react';
import { createDiscoveryAPI } from './discovery';

const discovery = createDiscoveryAPI();

export function usePluginSearch(query: string) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    setLoading(true);
    discovery.search(query, { limit: 10 })
      .then(res => setResults(res.data?.results || []))
      .finally(() => setLoading(false));
  }, [query]);

  return { results, loading };
}
```

## Next Steps

1. ✅ Install dependencies
2. ✅ Build initial index
3. ✅ Run tests to verify
4. 🔄 Integrate into your application
5. 🔄 Set up maintenance cron jobs
6. 🔄 Monitor analytics and adjust

## Support

- **Documentation**: See `README.md` for full details
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`
- **Tests**: See `__tests__/discovery.test.ts` for examples
- **CLI Help**: `npx tsx discovery/cli.ts help`
