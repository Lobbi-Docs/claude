/**
 * Plugin Index Manager
 * Builds and maintains searchable index from plugin registry
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  PluginIndexEntry,
  IndexBuildOptions,
  IndexStats,
  BatchIndexResult,
  TokenizationResult,
  DocumentFrequency,
  TFIDFScore
} from './types';
import { PluginManifest } from '../types';

/**
 * Stop words to exclude from indexing
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'this', 'can', 'all', 'but', 'or'
]);

export class PluginIndexer {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    const schemaPath = path.join(__dirname, 'db', 'discovery.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute schema in transactions for better performance
    this.db.exec(schema);
  }

  /**
   * Tokenize and stem text for indexing
   */
  private tokenize(text: string): TokenizationResult {
    if (!text) {
      return { tokens: [], stems: [], stopWordsRemoved: 0 };
    }

    // Convert to lowercase and extract words
    const words = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')  // Replace special chars with space
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
      // Simple stemming (just remove common suffixes)
      stems.push(this.stem(word));
    }

    return { tokens, stems, stopWordsRemoved };
  }

  /**
   * Simple Porter-like stemming
   */
  private stem(word: string): string {
    // Remove common suffixes
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
   * Extract keywords from plugin manifest
   */
  private extractKeywords(manifest: PluginManifest, readme?: string): string {
    const parts: string[] = [];

    if (manifest.name) parts.push(manifest.name);
    if (manifest.description) parts.push(manifest.description);
    if (readme) parts.push(readme);

    const combined = parts.join(' ');
    const { stems } = this.tokenize(combined);

    // Get unique stems
    const uniqueStems = [...new Set(stems)];
    return uniqueStems.join(' ');
  }

  /**
   * Index a single plugin
   */
  indexPlugin(manifest: PluginManifest, readme?: string): number {
    const tags = manifest.provides ? Object.keys(manifest.provides) : [];
    const keywords = this.extractKeywords(manifest, readme);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO plugin_index (
        plugin_id, name, version, description,
        author_name, author_email, license, homepage, repository_url,
        category, tags, keywords, readme_content,
        downloads, rating, rating_count,
        published_at, updated_at, metadata
      ) VALUES (
        @plugin_id, @name, @version, @description,
        @author_name, @author_email, @license, @homepage, @repository_url,
        @category, @tags, @keywords, @readme_content,
        COALESCE((SELECT downloads FROM plugin_index WHERE plugin_id = @plugin_id), 0),
        COALESCE((SELECT rating FROM plugin_index WHERE plugin_id = @plugin_id), 0),
        COALESCE((SELECT rating_count FROM plugin_index WHERE plugin_id = @plugin_id), 0),
        COALESCE((SELECT published_at FROM plugin_index WHERE plugin_id = @plugin_id), CURRENT_TIMESTAMP),
        CURRENT_TIMESTAMP,
        @metadata
      )
    `);

    const result = stmt.run({
      plugin_id: manifest.name,
      name: manifest.name,
      version: manifest.version,
      description: manifest.description || '',
      author_name: manifest.author?.name || '',
      author_email: manifest.author?.email || '',
      license: manifest.license || '',
      homepage: manifest.homepage || '',
      repository_url: manifest.repository?.url || '',
      category: this.detectCategory(manifest),
      tags: JSON.stringify(tags),
      keywords,
      readme_content: readme || '',
      metadata: JSON.stringify(manifest)
    });

    return result.changes;
  }

  /**
   * Detect plugin category from manifest
   */
  private detectCategory(manifest: PluginManifest): string {
    if (!manifest.provides) return 'tools';

    const provides = manifest.provides;
    if (provides.agents) return 'agents';
    if (provides.skills) return 'skills';
    if (provides.commands) return 'commands';
    if (provides.workflows) return 'workflows';
    if (provides.hooks) return 'hooks';
    if (provides.templates) return 'templates';

    return 'tools';
  }

  /**
   * Build index from plugin registry directory
   */
  async buildIndex(registryPath: string, options: IndexBuildOptions = {}): Promise<BatchIndexResult> {
    const startTime = Date.now();
    const result: BatchIndexResult = {
      indexed: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0
    };

    try {
      // Read all plugin manifests
      const plugins = this.readPluginRegistry(registryPath);

      // Start transaction for better performance
      const insertMany = this.db.transaction((plugins: Array<{ manifest: PluginManifest, readme?: string }>) => {
        for (const { manifest, readme } of plugins) {
          try {
            this.indexPlugin(manifest, readme);
            result.indexed++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              plugin_id: manifest.name,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      });

      insertMany(plugins);

      // Compute TF-IDF if requested
      if (options.computeTFIDF) {
        this.computeTFIDF();
      }

      // Update plugin relationships if requested
      if (options.updateRelationships) {
        this.updatePluginRelationships();
      }

      // Update trending scores if requested
      if (options.updateTrending) {
        this.updateTrendingScores();
      }

    } catch (error) {
      console.error('Error building index:', error);
      throw error;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Read plugin manifests from registry
   */
  private readPluginRegistry(registryPath: string): Array<{ manifest: PluginManifest, readme?: string }> {
    const plugins: Array<{ manifest: PluginManifest, readme?: string }> = [];

    // Check if registry is a JSON file or directory
    if (fs.existsSync(registryPath) && fs.statSync(registryPath).isFile()) {
      // Read from JSON file
      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));

      if (Array.isArray(registry)) {
        for (const item of registry) {
          plugins.push({ manifest: item });
        }
      } else if (registry.plugins) {
        for (const item of registry.plugins) {
          plugins.push({ manifest: item });
        }
      }
    } else if (fs.existsSync(registryPath) && fs.statSync(registryPath).isDirectory()) {
      // Read from directory structure
      const dirs = fs.readdirSync(registryPath);

      for (const dir of dirs) {
        const pluginDir = path.join(registryPath, dir);
        if (!fs.statSync(pluginDir).isDirectory()) continue;

        const manifestPath = path.join(pluginDir, 'plugin.json');
        const readmePath = path.join(pluginDir, 'README.md');

        if (fs.existsSync(manifestPath)) {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          const readme = fs.existsSync(readmePath)
            ? fs.readFileSync(readmePath, 'utf-8')
            : undefined;

          plugins.push({ manifest, readme });
        }
      }
    }

    return plugins;
  }

  /**
   * Compute TF-IDF scores for all plugins
   */
  computeTFIDF(): void {
    // Clear existing TF-IDF data
    this.db.prepare('DELETE FROM tfidf_index').run();
    this.db.prepare('DELETE FROM document_frequency').run();

    // Get all plugins
    const plugins = this.db.prepare('SELECT * FROM plugin_index').all() as PluginIndexEntry[];

    // Calculate document frequency for each term
    const termDocCount = new Map<string, Set<string>>();
    const totalDocs = plugins.length;

    for (const plugin of plugins) {
      const fields = {
        name: plugin.name,
        description: plugin.description || '',
        keywords: plugin.keywords || '',
        readme: plugin.readme_content || ''
      };

      for (const [field, text] of Object.entries(fields)) {
        const { stems } = this.tokenize(text);
        const uniqueStems = new Set(stems);

        for (const stem of uniqueStems) {
          if (!termDocCount.has(stem)) {
            termDocCount.set(stem, new Set());
          }
          termDocCount.get(stem)!.add(plugin.plugin_id);
        }
      }
    }

    // Insert document frequencies
    const dfStmt = this.db.prepare(`
      INSERT INTO document_frequency (term, document_count, total_documents, idf_score)
      VALUES (?, ?, ?, ?)
    `);

    const insertDF = this.db.transaction((entries: Array<[string, number]>) => {
      for (const [term, docCount] of entries) {
        const idf = Math.log(totalDocs / docCount);
        dfStmt.run(term, docCount, totalDocs, idf);
      }
    });

    const dfEntries: Array<[string, number]> = Array.from(termDocCount.entries())
      .map(([term, docs]) => [term, docs.size]);
    insertDF(dfEntries);

    // Calculate TF-IDF for each plugin
    const tfidfStmt = this.db.prepare(`
      INSERT INTO tfidf_index (term, plugin_id, term_frequency, inverse_document_frequency, tfidf_score, field)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertTFIDF = this.db.transaction(() => {
      for (const plugin of plugins) {
        const fields = {
          name: plugin.name,
          description: plugin.description || '',
          keywords: plugin.keywords || '',
          readme: plugin.readme_content || ''
        };

        for (const [field, text] of Object.entries(fields)) {
          const { stems } = this.tokenize(text);
          const termCounts = new Map<string, number>();

          // Count term frequencies
          for (const stem of stems) {
            termCounts.set(stem, (termCounts.get(stem) || 0) + 1);
          }

          const totalTerms = stems.length;

          // Calculate TF-IDF for each term
          for (const [term, count] of termCounts.entries()) {
            const tf = count / totalTerms;
            const dfRow = this.db.prepare('SELECT idf_score FROM document_frequency WHERE term = ?').get(term) as { idf_score: number } | undefined;

            if (dfRow) {
              const idf = dfRow.idf_score;
              const tfidf = tf * idf;

              tfidfStmt.run(term, plugin.plugin_id, tf, idf, tfidf, field);
            }
          }
        }
      }
    });

    insertTFIDF();
  }

  /**
   * Update plugin co-installation relationships
   */
  updatePluginRelationships(): void {
    // Get all user plugin combinations
    const stmt = this.db.prepare(`
      SELECT a.plugin_id as plugin_a, b.plugin_id as plugin_b, COUNT(*) as count
      FROM user_installed_plugins a
      JOIN user_installed_plugins b ON a.user_id = b.user_id AND a.plugin_id < b.plugin_id
      WHERE a.is_active = 1 AND b.is_active = 1
      GROUP BY a.plugin_id, b.plugin_id
    `);

    const relationships = stmt.all() as Array<{ plugin_a: string, plugin_b: string, count: number }>;

    // Get total install count for confidence calculation
    const totalInstalls = this.db.prepare('SELECT COUNT(DISTINCT user_id) as total FROM user_installed_plugins').get() as { total: number };

    // Insert or update relationships
    const upsertStmt = this.db.prepare(`
      INSERT INTO plugin_relationships (plugin_a, plugin_b, co_install_count, confidence, last_updated)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(plugin_a, plugin_b) DO UPDATE SET
        co_install_count = excluded.co_install_count,
        confidence = excluded.confidence,
        last_updated = CURRENT_TIMESTAMP
    `);

    const upsert = this.db.transaction((relationships: Array<{ plugin_a: string, plugin_b: string, count: number }>) => {
      for (const rel of relationships) {
        const confidence = rel.count / totalInstalls.total;
        upsertStmt.run(rel.plugin_a, rel.plugin_b, rel.count, confidence);
      }
    });

    upsert(relationships);
  }

  /**
   * Update trending plugin scores
   */
  updateTrendingScores(): void {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      INSERT INTO trending_plugins (plugin_id, installs_today, installs_week, installs_month, velocity_score, last_updated)
      SELECT
        plugin_id,
        SUM(CASE WHEN installed_at >= ? THEN 1 ELSE 0 END) as installs_today,
        SUM(CASE WHEN installed_at >= ? THEN 1 ELSE 0 END) as installs_week,
        SUM(CASE WHEN installed_at >= ? THEN 1 ELSE 0 END) as installs_month,
        -- Velocity score: weighted by recency
        (SUM(CASE WHEN installed_at >= ? THEN 1 ELSE 0 END) * 10.0 +
         SUM(CASE WHEN installed_at >= ? THEN 1 ELSE 0 END) * 3.0 +
         SUM(CASE WHEN installed_at >= ? THEN 1 ELSE 0 END)) as velocity_score,
        CURRENT_TIMESTAMP
      FROM install_stats
      WHERE uninstalled_at IS NULL
      GROUP BY plugin_id
      ON CONFLICT(plugin_id) DO UPDATE SET
        installs_today = excluded.installs_today,
        installs_week = excluded.installs_week,
        installs_month = excluded.installs_month,
        velocity_score = excluded.velocity_score,
        last_updated = CURRENT_TIMESTAMP
    `);

    stmt.run(
      oneDayAgo.toISOString(),
      oneWeekAgo.toISOString(),
      oneMonthAgo.toISOString(),
      oneDayAgo.toISOString(),
      oneWeekAgo.toISOString(),
      oneMonthAgo.toISOString()
    );
  }

  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    const stats = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM plugin_index) as totalPlugins,
        (SELECT COUNT(DISTINCT term) FROM tfidf_index) as totalTerms,
        (SELECT AVG(term_count) FROM (
          SELECT plugin_id, COUNT(*) as term_count FROM tfidf_index GROUP BY plugin_id
        )) as avgTermsPerPlugin
    `).get() as { totalPlugins: number, totalTerms: number, avgTermsPerPlugin: number };

    const dbStat = fs.statSync(this.dbPath);

    return {
      totalPlugins: stats.totalPlugins,
      totalTerms: stats.totalTerms,
      avgTermsPerPlugin: stats.avgTermsPerPlugin,
      lastBuilt: new Date(dbStat.mtime),
      buildDuration: 0,  // Would need to store this
      indexSize: dbStat.size
    };
  }

  /**
   * Optimize database
   */
  optimize(): void {
    this.db.pragma('optimize');
    this.db.exec('VACUUM');
    this.db.exec('ANALYZE');
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
