/**
 * Agent Memory System - Main Entry Point
 *
 * Provides unified interface for episodic, semantic, and procedural memory.
 */

import { MemoryIndex } from './memory-index';
import { EpisodicMemory } from './episodic-memory';
import { SemanticMemory } from './semantic-memory';
import { ProceduralMemory } from './procedural-memory';
import {
  DatabaseConfig,
  EmbeddingConfig,
  MemoryStats,
  Episode,
  Fact,
  Procedure,
} from './types';

export * from './types';
export { MemoryIndex } from './memory-index';
export { EpisodicMemory } from './episodic-memory';
export { SemanticMemory } from './semantic-memory';
export { ProceduralMemory } from './procedural-memory';

/**
 * Unified Memory System
 *
 * Combines all three memory types (episodic, semantic, procedural)
 * into a single interface for easy use.
 */
export class AgentMemory {
  public episodic: EpisodicMemory;
  public semantic: SemanticMemory;
  public procedural: ProceduralMemory;
  private memoryIndex: MemoryIndex;

  constructor(
    dbPath: string = '.claude/orchestration/db/memory.db',
    namespace: string = 'default'
  ) {
    const dbConfig: DatabaseConfig = {
      dbPath,
      enableFTS: true,
      enableWAL: true,
      namespace,
    };

    const embeddingConfig: EmbeddingConfig = {
      provider: 'local', // Change to 'claude' or 'openai' in production
      dimensions: 384,
      batchSize: 32,
    };

    this.memoryIndex = new MemoryIndex(dbConfig, embeddingConfig);
    this.episodic = new EpisodicMemory(dbConfig, this.memoryIndex);
    this.semantic = new SemanticMemory(dbConfig);
    this.procedural = new ProceduralMemory(dbConfig);
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const Database = require('better-sqlite3');

    const schemaPath = path.join(__dirname, '..', 'db', 'memory.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const db = new Database(this.memoryIndex['db'].name);

    // Execute schema
    db.exec(schema);
    db.close();
  }

  /**
   * Store a complete task execution
   */
  async storeExecution(
    taskDescription: string,
    context: string,
    actions: Array<{
      id: string;
      type: string;
      description: string;
      parameters?: any;
      result?: any;
      timestamp: Date;
      duration?: number;
      success: boolean;
      error?: string;
    }>,
    outcome: 'success' | 'failure' | 'partial',
    options?: {
      agentType?: string;
      tags?: string[];
      notes?: string;
      extractFacts?: boolean;
      createProcedure?: boolean;
    }
  ): Promise<string> {
    const endTime = new Date();
    const startTime = actions.length > 0 ? actions[0].timestamp : endTime;
    const duration = endTime.getTime() - startTime.getTime();

    // Store episode
    const episodeId = await this.episodic.store({
      taskDescription,
      context,
      actions,
      outcome,
      endTime,
      duration,
      tags: options?.tags || [],
      agentType: options?.agentType,
      notes: options?.notes,
    });

    // Extract facts from context and task description if requested
    if (options?.extractFacts) {
      const fullText = `${taskDescription}\n${context}\n${options.notes || ''}`;
      this.semantic.extractFacts(fullText, episodeId);
    }

    // Create procedure from successful episodes if requested
    if (options?.createProcedure && outcome === 'success') {
      this.procedural.recordProcedure(episodeId, actions);
    }

    return episodeId;
  }

  /**
   * Search across all memory types
   */
  async search(query: string, options?: {
    types?: Array<'episodic' | 'semantic' | 'procedural'>;
    limit?: number;
  }): Promise<{
    episodes: Episode[];
    facts: Fact[];
    procedures: Procedure[];
  }> {
    const types = options?.types || ['episodic', 'semantic', 'procedural'];
    const limit = options?.limit || 5;

    const results = {
      episodes: [] as Episode[],
      facts: [] as Fact[],
      procedures: [] as Procedure[],
    };

    if (types.includes('episodic')) {
      results.episodes = await this.episodic.retrieveSimilar(query, limit);
    }

    if (types.includes('semantic')) {
      results.facts = this.semantic.searchFacts(query, limit);
    }

    if (types.includes('procedural')) {
      results.procedures = this.procedural.suggestProcedures(query);
    }

    return results;
  }

  /**
   * Get comprehensive statistics
   */
  getStats(): MemoryStats {
    const episodicStats = this.episodic.getStats();
    const semanticStats = this.semantic.getStats();
    const proceduralStats = this.procedural.getStats();

    const totalEntries =
      episodicStats.total +
      semanticStats.totalFacts +
      proceduralStats.totalProcedures;

    return {
      episodeCount: episodicStats.total,
      factCount: semanticStats.totalFacts,
      procedureCount: proceduralStats.totalProcedures,
      totalEntries,
      databaseSize: 0, // Would need to read file size
      avgEpisodeQuality: episodicStats.avgQuality,
      topEpisodes: [], // Would need to query
      topProcedures: proceduralStats.topProcedures.map((p) => ({
        id: p.name,
        usageCount: p.usageCount,
      })),
      outcomeBreakdown: {
        success: episodicStats.successful,
        failure: episodicStats.failed,
        partial: episodicStats.partial,
      },
      agentTypeBreakdown: {},
    };
  }

  /**
   * Export all memory to snapshot
   */
  exportSnapshot(): any {
    return this.memoryIndex.export();
  }

  /**
   * Import memory from snapshot
   */
  importSnapshot(snapshot: any): void {
    this.memoryIndex.import(snapshot);
  }

  /**
   * Clear all memory (use with caution!)
   */
  clear(): void {
    const Database = require('better-sqlite3');
    const db = new Database(this.memoryIndex['db'].name);

    db.exec(`
      DELETE FROM episodes;
      DELETE FROM facts;
      DELETE FROM procedures;
      DELETE FROM episode_embeddings;
    `);

    db.close();
  }

  /**
   * Close database connections
   */
  close(): void {
    this.memoryIndex.close();
  }
}

/**
 * Create default memory instance
 */
export function createMemory(namespace: string = 'default'): AgentMemory {
  const dbPath = process.env.MEMORY_DB_PATH || '.claude/orchestration/db/memory.db';
  return new AgentMemory(dbPath, namespace);
}
