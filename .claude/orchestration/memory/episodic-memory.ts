/**
 * Episodic Memory: Task execution records
 *
 * Stores complete episodes of agent task execution including context,
 * actions, outcomes, and learned insights for future retrieval.
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  Episode,
  Action,
  Outcome,
  ConsolidationOptions,
  DatabaseConfig,
} from './types';
import { MemoryIndex } from './memory-index';

/**
 * Episodic Memory Manager
 */
export class EpisodicMemory {
  private db: Database.Database;
  private namespace: string;
  private memoryIndex: MemoryIndex;

  constructor(config: DatabaseConfig, memoryIndex: MemoryIndex) {
    this.db = new Database(config.dbPath);
    this.namespace = config.namespace || 'default';
    this.memoryIndex = memoryIndex;
  }

  /**
   * Store a new episode
   */
  async store(episode: Omit<Episode, 'id' | 'timestamp' | 'accessCount' | 'quality'>): Promise<string> {
    const id = uuidv4();
    const timestamp = new Date();

    const fullEpisode: Episode = {
      id,
      timestamp,
      accessCount: 0,
      quality: this.calculateQuality(episode.outcome, episode.actions),
      ...episode,
    };

    // Begin transaction
    const transaction = this.db.transaction(() => {
      // Insert episode
      const episodeStmt = this.db.prepare(`
        INSERT INTO episodes (
          id, task_description, context, outcome, timestamp, end_time,
          duration, agent_type, parent_task_id, notes, access_count,
          last_accessed, quality, namespace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      episodeStmt.run(
        id,
        episode.taskDescription,
        episode.context,
        episode.outcome,
        timestamp.getTime(),
        episode.endTime?.getTime() || null,
        episode.duration || null,
        episode.agentType || null,
        episode.parentTaskId || null,
        episode.notes || null,
        0,
        null,
        fullEpisode.quality,
        this.namespace
      );

      // Insert tags
      const tagStmt = this.db.prepare(`
        INSERT INTO episode_tags (episode_id, tag) VALUES (?, ?)
      `);

      for (const tag of episode.tags) {
        tagStmt.run(id, tag);
      }

      // Insert actions
      const actionStmt = this.db.prepare(`
        INSERT INTO actions (
          id, episode_id, type, description, parameters, result,
          timestamp, duration, success, error, order_index
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      episode.actions.forEach((action, index) => {
        actionStmt.run(
          action.id,
          id,
          action.type,
          action.description,
          action.parameters ? JSON.stringify(action.parameters) : null,
          action.result ? JSON.stringify(action.result) : null,
          action.timestamp.getTime(),
          action.duration || null,
          action.success ? 1 : 0,
          action.error || null,
          index
        );
      });
    });

    transaction();

    // Generate and store embedding
    const embeddingText = `${episode.taskDescription}\n${episode.context}\n${episode.notes || ''}`;
    const embedding = await this.memoryIndex.embed(embeddingText);
    this.memoryIndex.store(id, embedding, { type: 'episode' });

    return id;
  }

  /**
   * Calculate quality score for an episode
   */
  private calculateQuality(outcome: Outcome, actions: Action[]): number {
    let score = 0.5; // Base score

    // Outcome contribution
    if (outcome === 'success') {
      score += 0.3;
    } else if (outcome === 'partial') {
      score += 0.1;
    }

    // Action success rate
    const successfulActions = actions.filter((a) => a.success).length;
    const actionSuccessRate = actions.length > 0 ? successfulActions / actions.length : 0;
    score += actionSuccessRate * 0.2;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Retrieve episode by ID
   */
  retrieve(id: string): Episode | null {
    const episodeStmt = this.db.prepare(`
      SELECT * FROM episodes WHERE id = ? AND namespace = ?
    `);

    const episode = episodeStmt.get(id, this.namespace) as any;

    if (!episode) {
      return null;
    }

    // Update access count
    this.db.prepare(`
      UPDATE episodes SET access_count = access_count + 1, last_accessed = ?
      WHERE id = ?
    `).run(Date.now(), id);

    // Get tags
    const tags = this.db.prepare(`
      SELECT tag FROM episode_tags WHERE episode_id = ?
    `).all(id) as Array<{ tag: string }>;

    // Get actions
    const actions = this.db.prepare(`
      SELECT * FROM actions WHERE episode_id = ? ORDER BY order_index
    `).all(id) as any[];

    return {
      id: episode.id,
      taskDescription: episode.task_description,
      context: episode.context,
      outcome: episode.outcome as Outcome,
      timestamp: new Date(episode.timestamp),
      endTime: episode.end_time ? new Date(episode.end_time) : undefined,
      duration: episode.duration || undefined,
      tags: tags.map((t) => t.tag),
      agentType: episode.agent_type || undefined,
      parentTaskId: episode.parent_task_id || undefined,
      notes: episode.notes || undefined,
      accessCount: episode.access_count,
      lastAccessed: episode.last_accessed ? new Date(episode.last_accessed) : undefined,
      quality: episode.quality,
      actions: actions.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        parameters: a.parameters ? JSON.parse(a.parameters) : undefined,
        result: a.result ? JSON.parse(a.result) : undefined,
        timestamp: new Date(a.timestamp),
        duration: a.duration || undefined,
        success: a.success === 1,
        error: a.error || undefined,
      })),
    };
  }

  /**
   * Retrieve similar episodes using vector search
   */
  async retrieveSimilar(query: string, limit: number = 5): Promise<Episode[]> {
    const results = await this.memoryIndex.search(query, {
      limit,
      minSimilarity: 0.5,
    });

    return results
      .map((result) => this.retrieve(result.id))
      .filter((ep): ep is Episode => ep !== null);
  }

  /**
   * Consolidate old episodes
   *
   * Summarizes or removes old, low-value episodes to save space
   */
  consolidate(options: ConsolidationOptions): number {
    const { olderThan, minQuality, keepTopN, strategy } = options;

    // Find episodes to consolidate
    const stmt = this.db.prepare(`
      SELECT id FROM episodes
      WHERE namespace = ?
        AND timestamp < ?
        AND quality < ?
      ORDER BY access_count DESC
      LIMIT ?
    `);

    const episodes = stmt.all(
      this.namespace,
      olderThan.getTime(),
      minQuality || 0.3,
      10000 // Safety limit
    ) as Array<{ id: string }>;

    // Keep top N most accessed
    const toKeep = keepTopN || 100;
    const toRemove = episodes.slice(toKeep);

    // Remove episodes
    const deleteStmt = this.db.prepare(`
      DELETE FROM episodes WHERE id = ?
    `);

    const transaction = this.db.transaction(() => {
      for (const { id } of toRemove) {
        deleteStmt.run(id);
      }
    });

    transaction();

    return toRemove.length;
  }

  /**
   * Prune low-value memories
   *
   * Remove episodes that haven't been accessed recently and have low quality
   */
  prune(accessThreshold: number = 0): number {
    const stmt = this.db.prepare(`
      DELETE FROM episodes
      WHERE namespace = ?
        AND access_count <= ?
        AND quality < 0.3
        AND timestamp < ?
    `);

    // Prune episodes older than 30 days with low access
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const result = stmt.run(this.namespace, accessThreshold, thirtyDaysAgo);

    return result.changes || 0;
  }

  /**
   * Get all episodes matching filters
   */
  query(filters: {
    outcome?: Outcome;
    agentType?: string;
    tags?: string[];
    minQuality?: number;
    limit?: number;
  }): Episode[] {
    let sql = `
      SELECT DISTINCT e.id FROM episodes e
      WHERE e.namespace = ?
    `;

    const params: any[] = [this.namespace];

    if (filters.outcome) {
      sql += ' AND e.outcome = ?';
      params.push(filters.outcome);
    }

    if (filters.agentType) {
      sql += ' AND e.agent_type = ?';
      params.push(filters.agentType);
    }

    if (filters.tags && filters.tags.length > 0) {
      sql += ` AND e.id IN (
        SELECT episode_id FROM episode_tags WHERE tag IN (${filters.tags.map(() => '?').join(',')})
      )`;
      params.push(...filters.tags);
    }

    if (filters.minQuality !== undefined) {
      sql += ' AND e.quality >= ?';
      params.push(filters.minQuality);
    }

    sql += ' ORDER BY e.timestamp DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as Array<{ id: string }>;

    return results
      .map((r) => this.retrieve(r.id))
      .filter((ep): ep is Episode => ep !== null);
  }

  /**
   * Get episodes by outcome
   */
  getByOutcome(outcome: Outcome, limit: number = 10): Episode[] {
    return this.query({ outcome, limit });
  }

  /**
   * Get successful episodes for learning
   */
  getSuccessful(limit: number = 10): Episode[] {
    return this.getByOutcome('success', limit);
  }

  /**
   * Get failed episodes for analysis
   */
  getFailed(limit: number = 10): Episode[] {
    return this.getByOutcome('failure', limit);
  }

  /**
   * Update episode notes/reflections
   */
  addNotes(id: string, notes: string): void {
    const stmt = this.db.prepare(`
      UPDATE episodes SET notes = ? WHERE id = ? AND namespace = ?
    `);

    stmt.run(notes, id, this.namespace);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    successful: number;
    failed: number;
    partial: number;
    avgQuality: number;
    avgDuration: number;
  } {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN outcome = 'partial' THEN 1 ELSE 0 END) as partial,
        AVG(quality) as avgQuality,
        AVG(duration) as avgDuration
      FROM episodes
      WHERE namespace = ?
    `).get(this.namespace) as any;

    return stats;
  }
}
