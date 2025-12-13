#!/usr/bin/env node
/**
 * Discovery System CLI
 * Command-line interface for plugin discovery operations
 */

import { createDiscoveryAPI } from './api';
import * as path from 'path';

const DEFAULT_DB_PATH = path.join(process.cwd(), '.claude', 'core', 'discovery', 'db', 'discovery.db');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const dbPath = process.env.DISCOVERY_DB_PATH || DEFAULT_DB_PATH;
  const discovery = createDiscoveryAPI(dbPath);

  try {
    switch (command) {
      case 'search': {
        const query = args[1];
        if (!query) {
          console.error('Usage: discovery search <query>');
          process.exit(1);
        }

        const result = await discovery.search(query, {
          limit: 10
        });

        if (result.success && result.data) {
          console.log(`\nFound ${result.data.total} results in ${result.metadata?.executionTime}ms:\n`);
          result.data.results.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.plugin.name} (v${item.plugin.version})`);
            console.log(`   Score: ${item.score.toFixed(3)}`);
            console.log(`   ${item.plugin.description}`);
            console.log(`   Downloads: ${item.plugin.downloads} | Rating: ${item.plugin.rating}/5`);
            console.log('');
          });
        } else {
          console.error(`Search failed: ${result.error}`);
        }
        break;
      }

      case 'trending': {
        const period = (args[1] || 'week') as 'day' | 'week' | 'month';
        const limit = parseInt(args[2] || '10');

        const result = await discovery.trending(period, limit);

        if (result.success && result.data) {
          console.log(`\nTrending plugins (${period}):\n`);
          result.data.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.plugin.name} (v${item.plugin.version})`);
            console.log(`   ${item.reason}`);
            console.log(`   ${item.plugin.description}`);
            console.log('');
          });
        } else {
          console.error(`Failed to get trending: ${result.error}`);
        }
        break;
      }

      case 'recommend': {
        const installedPlugins = args.slice(1);

        const result = await discovery.recommend({
          installedPlugins,
          limit: 10,
          excludeInstalled: true
        });

        if (result.success && result.data) {
          console.log(`\nRecommendations based on installed plugins:\n`);
          result.data.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.plugin.name} (v${item.plugin.version})`);
            console.log(`   ${item.reason}`);
            console.log(`   ${item.plugin.description}`);
            console.log('');
          });
        } else {
          console.error(`Failed to get recommendations: ${result.error}`);
        }
        break;
      }

      case 'similar': {
        const pluginId = args[1];
        const limit = parseInt(args[2] || '5');

        if (!pluginId) {
          console.error('Usage: discovery similar <plugin-id> [limit]');
          process.exit(1);
        }

        const result = await discovery.similar(pluginId, limit);

        if (result.success && result.data) {
          console.log(`\nPlugins similar to ${pluginId}:\n`);
          result.data.forEach((item, idx) => {
            console.log(`${idx + 1}. ${item.plugin.name} (v${item.plugin.version})`);
            console.log(`   Similarity: ${item.score.toFixed(3)}`);
            console.log(`   ${item.reason}`);
            console.log('');
          });
        } else {
          console.error(`Failed to find similar plugins: ${result.error}`);
        }
        break;
      }

      case 'categories': {
        const result = await discovery.categories();

        if (result.success && result.data) {
          console.log('\nAvailable categories:\n');
          result.data.forEach(cat => {
            console.log(`  ${cat.display_name} (${cat.name}): ${cat.plugin_count} plugins`);
          });
          console.log('');
        } else {
          console.error(`Failed to get categories: ${result.error}`);
        }
        break;
      }

      case 'analytics': {
        const days = parseInt(args[1] || '30');

        const result = await discovery.getAnalytics(days);

        if (result.success && result.data) {
          console.log(`\nAnalytics Summary (last ${days} days):\n`);

          console.log('Top Searches:');
          result.data.topSearches.forEach((s, idx) => {
            console.log(`  ${idx + 1}. "${s.query}" - ${s.count} searches, ${s.avgResults.toFixed(1)} avg results`);
          });

          console.log(`\nOverall Click-Through Rate: ${result.data.clickThroughRate.overall.toFixed(2)}%`);

          console.log('\nSearch Gaps (queries with no results):');
          result.data.searchGaps.forEach((g, idx) => {
            console.log(`  ${idx + 1}. "${g.query}" - ${g.count} occurrences`);
          });

          console.log('\nPopular Plugins:');
          result.data.popularPlugins.forEach((p, idx) => {
            console.log(`  ${idx + 1}. ${p.name} - ${p.downloads} downloads (${p.trend})`);
          });
          console.log('');
        } else {
          console.error(`Failed to get analytics: ${result.error}`);
        }
        break;
      }

      case 'build-index': {
        const registryPath = args[1] || './registry';

        console.log(`Building index from ${registryPath}...`);

        const result = await discovery.buildIndex(registryPath, {
          rebuild: true,
          computeTFIDF: true,
          updateRelationships: true,
          updateTrending: true
        });

        if (result.success && result.data) {
          console.log(`\nIndex built successfully:`);
          console.log(`  Indexed: ${result.data.indexed} plugins`);
          console.log(`  Failed: ${result.data.failed} plugins`);
          console.log(`  Duration: ${result.data.duration}ms`);
        } else {
          console.error(`Failed to build index: ${result.error}`);
        }
        break;
      }

      case 'stats': {
        const result = await discovery.getIndexStats();

        if (result.success && result.data) {
          console.log('\nIndex Statistics:\n');
          console.log(`  Total Plugins: ${result.data.totalPlugins}`);
          console.log(`  Total Terms: ${result.data.totalTerms}`);
          console.log(`  Avg Terms per Plugin: ${result.data.avgTermsPerPlugin.toFixed(1)}`);
          console.log(`  Index Size: ${(result.data.indexSize / 1024).toFixed(2)} KB`);
          console.log(`  Last Built: ${result.data.lastBuilt.toLocaleString()}`);
          console.log('');
        } else {
          console.error(`Failed to get stats: ${result.error}`);
        }
        break;
      }

      case 'update-tfidf': {
        console.log('Updating TF-IDF scores...');
        const result = await discovery.updateTFIDF();

        if (result.success) {
          console.log('TF-IDF scores updated successfully');
        } else {
          console.error(`Failed to update TF-IDF: ${result.error}`);
        }
        break;
      }

      case 'update-trending': {
        console.log('Updating trending scores...');
        const result = await discovery.updateTrending();

        if (result.success) {
          console.log('Trending scores updated successfully');
        } else {
          console.error(`Failed to update trending: ${result.error}`);
        }
        break;
      }

      case 'update-relationships': {
        console.log('Updating plugin relationships...');
        const result = await discovery.updateRelationships();

        if (result.success) {
          console.log('Relationships updated successfully');
        } else {
          console.error(`Failed to update relationships: ${result.error}`);
        }
        break;
      }

      case 'cleanup': {
        const days = parseInt(args[1] || '90');

        console.log(`Cleaning up data older than ${days} days...`);
        const result = await discovery.cleanup(days);

        if (result.success && result.data) {
          console.log(`Cleaned up successfully:`);
          console.log(`  Cache entries cleared: ${result.data.cacheCleared}`);
          console.log(`  Analytics records deleted: ${result.data.analyticsDeleted}`);
        } else {
          console.error(`Cleanup failed: ${result.error}`);
        }
        break;
      }

      case 'optimize': {
        console.log('Optimizing database...');
        const result = await discovery.optimize();

        if (result.success) {
          console.log('Database optimized successfully');
        } else {
          console.error(`Optimization failed: ${result.error}`);
        }
        break;
      }

      case 'help':
      default: {
        console.log(`
Discovery System CLI

Usage: discovery <command> [options]

Commands:
  search <query>              Search for plugins
  trending [period] [limit]   Get trending plugins (day|week|month)
  recommend <plugin-ids...>   Get recommendations based on installed plugins
  similar <plugin-id> [limit] Find similar plugins
  categories                  List all categories
  analytics [days]            Get analytics summary
  build-index [registry-path] Build search index from registry
  stats                       Show index statistics
  update-tfidf                Update TF-IDF scores
  update-trending             Update trending scores
  update-relationships        Update plugin relationships
  cleanup [days]              Clean up old data (default: 90 days)
  optimize                    Optimize database
  help                        Show this help message

Environment Variables:
  DISCOVERY_DB_PATH          Path to discovery database (default: .claude/core/discovery/db/discovery.db)

Examples:
  discovery search authentication
  discovery trending week 10
  discovery recommend auth-agent database-connector
  discovery similar auth-agent 5
  discovery analytics 30
  discovery build-index ./registry
        `);
        break;
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    discovery.close();
  }
}

main();
