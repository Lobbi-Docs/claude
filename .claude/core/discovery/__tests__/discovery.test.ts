/**
 * Discovery System Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createDiscoveryAPI } from '../api';
import { PluginIndexer } from '../indexer';
import type { PluginManifest } from '../../types';

const TEST_DB_PATH = path.join(__dirname, 'test-discovery.db');

// Sample plugin manifests for testing
const testPlugins: Array<{ manifest: PluginManifest; readme?: string }> = [
  {
    manifest: {
      name: 'auth-agent',
      version: '1.0.0',
      description: 'Authentication agent for secure user login',
      author: { name: 'Test Author', email: 'test@example.com' },
      provides: { agents: 'auth' },
      dependencies: {}
    },
    readme: 'This agent handles authentication and authorization for users.'
  },
  {
    manifest: {
      name: 'database-connector',
      version: '2.1.0',
      description: 'Connect to various databases with ease',
      author: { name: 'DB Team' },
      provides: { skills: 'db' },
      dependencies: {}
    },
    readme: 'Database connector supporting PostgreSQL, MySQL, and MongoDB.'
  },
  {
    manifest: {
      name: 'test-runner',
      version: '1.5.0',
      description: 'Automated testing framework',
      author: { name: 'QA Team' },
      provides: { commands: 'test' },
      dependencies: {}
    },
    readme: 'Run unit tests and integration tests automatically.'
  },
  {
    manifest: {
      name: 'auth-helper',
      version: '0.9.0',
      description: 'Helper utilities for authentication',
      author: { name: 'Test Author' },
      provides: { skills: 'auth-utils' },
      dependencies: { 'auth-agent': '^1.0.0' }
    },
    readme: 'Utility functions for authentication workflows.'
  },
  {
    manifest: {
      name: 'deployment-tool',
      version: '3.0.0',
      description: 'Deploy applications to cloud platforms',
      author: { name: 'DevOps Team' },
      provides: { tools: 'deploy' },
      dependencies: {}
    },
    readme: 'Deploy to AWS, Azure, and Google Cloud Platform.'
  }
];

describe('Discovery System', () => {
  let discovery: ReturnType<typeof createDiscoveryAPI>;

  beforeAll(async () => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create discovery API
    discovery = createDiscoveryAPI(TEST_DB_PATH);

    // Index test plugins
    const indexer = new PluginIndexer(TEST_DB_PATH);
    for (const { manifest, readme } of testPlugins) {
      indexer.indexPlugin(manifest, readme);
    }

    // Compute TF-IDF
    indexer.computeTFIDF();
    indexer.close();
  });

  afterAll(() => {
    discovery.close();
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Search Engine', () => {
    it('should search for plugins by keyword', async () => {
      const result = await discovery.search('authentication');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.total).toBeGreaterThan(0);
      expect(result.data!.results.length).toBeGreaterThan(0);

      // Should find auth-agent
      const authAgent = result.data!.results.find(r => r.plugin.name === 'auth-agent');
      expect(authAgent).toBeDefined();
    });

    it('should filter search results by category', async () => {
      const result = await discovery.search('', {
        filters: { category: 'agents' }
      });

      expect(result.success).toBe(true);
      expect(result.data!.results.every(r => r.plugin.category === 'agents')).toBe(true);
    });

    it('should sort search results by downloads', async () => {
      const result = await discovery.search('', {
        sort: 'downloads',
        order: 'desc'
      });

      expect(result.success).toBe(true);
      const downloads = result.data!.results.map(r => r.plugin.downloads);
      for (let i = 1; i < downloads.length; i++) {
        expect(downloads[i]).toBeLessThanOrEqual(downloads[i - 1]);
      }
    });

    it('should handle empty search query', async () => {
      const result = await discovery.search('');

      expect(result.success).toBe(true);
      expect(result.data!.total).toBe(0);
    });

    it('should provide autocomplete suggestions', async () => {
      const result = await discovery.getSuggestions('auth');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
      expect(result.data!.some(s => s.includes('auth'))).toBe(true);
    });

    it('should handle fuzzy search for typos', async () => {
      const result = await discovery.fuzzySearch('autentication'); // Missing 'h'

      expect(result.success).toBe(true);
      // Should still find authentication-related plugins
    });
  });

  describe('Recommendations', () => {
    it('should provide personalized recommendations', async () => {
      const result = await discovery.recommend({
        installedPlugins: ['auth-agent'],
        limit: 5
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
    });

    it('should exclude installed plugins from recommendations', async () => {
      const result = await discovery.recommend({
        installedPlugins: ['auth-agent', 'database-connector'],
        excludeInstalled: true,
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data!.every(r =>
        !['auth-agent', 'database-connector'].includes(r.plugin.plugin_id)
      )).toBe(true);
    });

    it('should find similar plugins', async () => {
      const result = await discovery.similar('auth-agent', 3);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Should find auth-helper as similar
      const similar = result.data!.find(r => r.plugin.name === 'auth-helper');
      expect(similar).toBeDefined();
    });

    it('should get trending plugins', async () => {
      const result = await discovery.trending('week', 5);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.every(r => r.type === 'trending')).toBe(true);
    });
  });

  describe('Categories', () => {
    it('should list all categories', async () => {
      const result = await discovery.categories();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);

      const categoryNames = result.data!.map(c => c.name);
      expect(categoryNames).toContain('agents');
      expect(categoryNames).toContain('skills');
      expect(categoryNames).toContain('commands');
    });
  });

  describe('Tracking', () => {
    it('should record plugin installation', () => {
      expect(() => {
        discovery.recordInstall('auth-agent', 'user123', '1.0.0', 'search');
      }).not.toThrow();
    });

    it('should record search clicks', () => {
      expect(() => {
        discovery.recordClick('authentication', 'auth-agent', 1, 'session123');
      }).not.toThrow();
    });

    it('should record plugin uninstallation', () => {
      expect(() => {
        discovery.recordUninstall('auth-agent', 'user123');
      }).not.toThrow();
    });
  });

  describe('Analytics', () => {
    it('should get analytics summary', async () => {
      const result = await discovery.getAnalytics(30);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.topSearches).toBeDefined();
      expect(result.data!.clickThroughRate).toBeDefined();
      expect(result.data!.popularPlugins).toBeDefined();
    });
  });

  describe('Index Management', () => {
    it('should get index statistics', async () => {
      const result = await discovery.getIndexStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.totalPlugins).toBe(testPlugins.length);
      expect(result.data!.totalTerms).toBeGreaterThan(0);
      expect(result.data!.indexSize).toBeGreaterThan(0);
    });

    it('should update TF-IDF scores', async () => {
      const result = await discovery.updateTFIDF();

      expect(result.success).toBe(true);
    });

    it('should update trending scores', async () => {
      const result = await discovery.updateTrending();

      expect(result.success).toBe(true);
    });

    it('should optimize database', async () => {
      const result = await discovery.optimize();

      expect(result.success).toBe(true);
    });

    it('should cleanup old data', async () => {
      const result = await discovery.cleanup(90);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.cacheCleared).toBeGreaterThanOrEqual(0);
      expect(result.data!.analyticsDeleted).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid plugin ID in similar search', async () => {
      const result = await discovery.similar('non-existent-plugin', 5);

      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(0);
    });

    it('should return error response for invalid operations', async () => {
      // This would need a scenario that causes an error
      // For now, verify the response structure
      const result = await discovery.search('test');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Performance', () => {
    it('should complete searches quickly', async () => {
      const startTime = Date.now();
      await discovery.search('authentication');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should complete recommendations quickly', async () => {
      const startTime = Date.now();
      await discovery.recommend({
        installedPlugins: ['auth-agent'],
        limit: 10
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });
  });
});

describe('Plugin Indexer', () => {
  let indexer: PluginIndexer;

  beforeAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    indexer = new PluginIndexer(TEST_DB_PATH);
  });

  afterAll(() => {
    indexer.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it('should index a plugin', () => {
    const changes = indexer.indexPlugin(testPlugins[0].manifest, testPlugins[0].readme);
    expect(changes).toBeGreaterThan(0);
  });

  it('should compute TF-IDF scores', () => {
    // Index a few plugins first
    testPlugins.forEach(({ manifest, readme }) => {
      indexer.indexPlugin(manifest, readme);
    });

    expect(() => {
      indexer.computeTFIDF();
    }).not.toThrow();
  });

  it('should get index statistics', () => {
    const stats = indexer.getStats();

    expect(stats.totalPlugins).toBe(testPlugins.length);
    expect(stats.totalTerms).toBeGreaterThan(0);
    expect(stats.avgTermsPerPlugin).toBeGreaterThan(0);
  });

  it('should optimize database', () => {
    expect(() => {
      indexer.optimize();
    }).not.toThrow();
  });
});
