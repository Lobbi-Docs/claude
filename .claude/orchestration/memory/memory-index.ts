/**
 * Memory Index: Vector storage and hybrid search
 *
 * Provides vector embeddings, similarity search, and hybrid keyword+semantic search
 * for the agent memory system.
 */

import Database from 'better-sqlite3';
import {
  SearchOptions,
  SearchResult,
  MemoryType,
  MemorySnapshot,
  EmbeddingConfig,
  DatabaseConfig,
  Episode,
  Fact,
  Procedure,
} from './types';

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Serialize float32 array to buffer for storage
 */
function serializeEmbedding(embedding: number[]): Buffer {
  const buffer = Buffer.allocUnsafe(embedding.length * 4);
  for (let i = 0; i < embedding.length; i++) {
    buffer.writeFloatLE(embedding[i], i * 4);
  }
  return buffer;
}

/**
 * Deserialize buffer to float32 array
 */
function deserializeEmbedding(buffer: Buffer): number[] {
  const embedding: number[] = [];
  for (let i = 0; i < buffer.length; i += 4) {
    embedding.push(buffer.readFloatLE(i));
  }
  return embedding;
}

/**
 * Memory Index: Vector storage and hybrid search
 */
export class MemoryIndex {
  private db: Database.Database;
  private namespace: string;
  private embeddingConfig: EmbeddingConfig;

  constructor(config: DatabaseConfig, embeddingConfig: EmbeddingConfig) {
    this.db = new Database(config.dbPath);
    this.namespace = config.namespace || 'default';
    this.embeddingConfig = embeddingConfig;

    // Enable WAL mode for better concurrency
    if (config.enableWAL) {
      this.db.pragma('journal_mode = WAL');
    }

    // Initialize schema
    this.initializeSchema();
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    // Schema is initialized from memory.sql
    // This is a placeholder for any runtime initialization
  }

  /**
   * Generate embedding for text
   *
   * This is a placeholder - in production, would call Claude API,
   * OpenAI API, or local embedding model
   */
  async embed(text: string): Promise<number[]> {
    // For now, return a simple hash-based embedding (REPLACE IN PRODUCTION)
    // This is just a deterministic placeholder
    const embedding = new Array(this.embeddingConfig.dimensions).fill(0);

    // Simple character-based hash for demonstration
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % this.embeddingConfig.dimensions] += charCode;
    }

    // Normalize
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => (norm > 0 ? val / norm : 0));

    // PRODUCTION IMPLEMENTATION:
    // switch (this.embeddingConfig.provider) {
    //   case 'claude':
    //     return this.embedWithClaude(text);
    //   case 'openai':
    //     return this.embedWithOpenAI(text);
    //   case 'local':
    //     return this.embedWithLocal(text);
    //   default:
    //     throw new Error(`Unknown provider: ${this.embeddingConfig.provider}`);
    // }
  }

  /**
   * Store vector with metadata
   */
  store(id: string, vector: number[], metadata: any): void {
    const serialized = serializeEmbedding(vector);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO episode_embeddings (episode_id, embedding, dimensions, model)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(id, serialized, vector.length, this.embeddingConfig.model || 'default');
  }

  /**
   * Get vector by ID
   */
  getVector(id: string): number[] | null {
    const stmt = this.db.prepare(`
      SELECT embedding FROM episode_embeddings WHERE episode_id = ?
    `);

    const result = stmt.get(id) as { embedding: Buffer } | undefined;
    return result ? deserializeEmbedding(result.embedding) : null;
  }

  /**
   * Keyword search using FTS5
   */
  private keywordSearch(
    query: string,
    type: MemoryType,
    options: SearchOptions
  ): SearchResult[] {
    let tableName: string;
    let dataTable: string;

    switch (type) {
      case 'episodic':
        tableName = 'episodes_fts';
        dataTable = 'episodes';
        break;
      case 'semantic':
        tableName = 'facts_fts';
        dataTable = 'facts';
        break;
      case 'procedural':
        tableName = 'procedures_fts';
        dataTable = 'procedures';
        break;
      default:
        throw new Error(`Unknown memory type: ${type}`);
    }

    const sql = `
      SELECT
        d.*,
        bm25(fts.rowid) as score
      FROM ${tableName} fts
      JOIN ${dataTable} d ON fts.rowid = d.rowid
      WHERE fts MATCH ? AND d.namespace = ?
      ORDER BY score DESC
      LIMIT ?
    `;

    const stmt = this.db.prepare(sql);
    const results = stmt.all(query, this.namespace, options.limit || 10) as any[];

    return results.map((row) => ({
      id: row.id,
      type,
      score: Math.abs(row.score), // BM25 returns negative scores
      data: row,
      metadata: {},
    }));
  }

  /**
   * Semantic search using vector similarity
   */
  private async semanticSearch(
    queryEmbedding: number[],
    type: MemoryType,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    // Get all embeddings (in production, use approximate nearest neighbor index)
    const stmt = this.db.prepare(`
      SELECT episode_id, embedding FROM episode_embeddings
    `);

    const embeddings = stmt.all() as Array<{ episode_id: string; embedding: Buffer }>;

    // Calculate similarities
    const similarities = embeddings
      .map(({ episode_id, embedding }) => ({
        id: episode_id,
        score: cosineSimilarity(queryEmbedding, deserializeEmbedding(embedding)),
      }))
      .filter((item) => item.score >= (options.minSimilarity || 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);

    // Fetch full data for top results
    const results: SearchResult[] = [];

    for (const { id, score } of similarities) {
      let data: any;
      let memoryType: MemoryType = 'episodic'; // Default

      if (type === 'episodic' || type === undefined) {
        const episodeStmt = this.db.prepare(`
          SELECT * FROM episodes WHERE id = ? AND namespace = ?
        `);
        data = episodeStmt.get(id, this.namespace);
        memoryType = 'episodic';
      }

      if (data) {
        results.push({
          id,
          type: memoryType,
          score,
          data,
          metadata: {},
        });
      }
    }

    return results;
  }

  /**
   * Hybrid search: combines keyword and semantic search
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const weights = options.hybridWeights || { keyword: 0.5, semantic: 0.5 };

    // Default to episodic search if no type specified
    const type: MemoryType = 'episodic';

    // Keyword search
    const keywordResults = this.keywordSearch(query, type, options);

    // Semantic search
    const queryEmbedding = await this.embed(query);
    const semanticResults = await this.semanticSearch(queryEmbedding, type, options);

    // Combine and re-rank
    const combined = new Map<string, SearchResult>();

    // Add keyword results
    for (const result of keywordResults) {
      combined.set(result.id, {
        ...result,
        score: result.score * weights.keyword,
      });
    }

    // Add or merge semantic results
    for (const result of semanticResults) {
      const existing = combined.get(result.id);
      if (existing) {
        // Combine scores
        existing.score += result.score * weights.semantic;
      } else {
        combined.set(result.id, {
          ...result,
          score: result.score * weights.semantic,
        });
      }
    }

    // Sort by combined score
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
  }

  /**
   * Set namespace for multi-tenant support
   */
  setNamespace(namespace: string): void {
    this.namespace = namespace;
  }

  /**
   * Export memory snapshot
   */
  export(): MemorySnapshot {
    const episodes = this.db
      .prepare('SELECT * FROM episodes WHERE namespace = ?')
      .all(this.namespace) as any[];

    const facts = this.db
      .prepare('SELECT * FROM facts WHERE namespace = ?')
      .all(this.namespace) as any[];

    const procedures = this.db
      .prepare('SELECT * FROM procedures WHERE namespace = ?')
      .all(this.namespace) as any[];

    return {
      version: '1.0.0',
      timestamp: new Date(),
      namespace: this.namespace,
      episodes: episodes as Episode[],
      facts: facts as Fact[],
      procedures: procedures as Procedure[],
      metadata: {
        episodeCount: episodes.length,
        factCount: facts.length,
        procedureCount: procedures.length,
      },
    };
  }

  /**
   * Import memory snapshot
   */
  import(snapshot: MemorySnapshot): void {
    const transaction = this.db.transaction(() => {
      // Import episodes
      const episodeStmt = this.db.prepare(`
        INSERT OR REPLACE INTO episodes (
          id, task_description, context, outcome, timestamp, end_time,
          duration, agent_type, parent_task_id, notes, access_count,
          last_accessed, quality, namespace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const episode of snapshot.episodes) {
        episodeStmt.run(
          episode.id,
          episode.taskDescription,
          episode.context,
          episode.outcome,
          episode.timestamp.getTime(),
          episode.endTime?.getTime() || null,
          episode.duration || null,
          episode.agentType || null,
          episode.parentTaskId || null,
          episode.notes || null,
          episode.accessCount,
          episode.lastAccessed?.getTime() || null,
          episode.quality,
          snapshot.namespace
        );
      }

      // Import facts
      const factStmt = this.db.prepare(`
        INSERT OR REPLACE INTO facts (
          id, subject, predicate, object, confidence, source, timestamp,
          confirmations, contradictions, namespace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const fact of snapshot.facts) {
        factStmt.run(
          fact.id,
          fact.subject,
          fact.predicate,
          fact.object,
          fact.confidence,
          fact.source,
          fact.timestamp.getTime(),
          fact.confirmations,
          fact.contradictions,
          snapshot.namespace
        );
      }

      // Import procedures
      const procedureStmt = this.db.prepare(`
        INSERT OR REPLACE INTO procedures (
          id, name, trigger_pattern, description, success_count, failure_count,
          usage_count, created, last_updated, version, namespace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const procedure of snapshot.procedures) {
        procedureStmt.run(
          procedure.id,
          procedure.name,
          procedure.triggerPattern,
          procedure.description || null,
          procedure.successCount,
          procedure.failureCount,
          procedure.usageCount,
          procedure.created.getTime(),
          procedure.lastUpdated.getTime(),
          procedure.version,
          snapshot.namespace
        );
      }
    });

    transaction();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
