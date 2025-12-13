/**
 * Checkpoint Manager - Context checkpointing and restoration
 *
 * Features:
 * - Save context snapshots at phase boundaries
 * - Restore from checkpoints
 * - Delta-based storage (only changes)
 * - Checkpoint metadata (phase, tokens, timestamp)
 * - SQLite persistence
 */

import { Database } from 'better-sqlite3';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  Checkpoint,
  CheckpointMetadata,
  CheckpointId,
  ConversationContext,
  OptimizationStrategy,
} from './types';

/**
 * Checkpoint Manager class
 */
export class CheckpointManager {
  private db: Database;
  private checkpoints = new Map<CheckpointId, Checkpoint>();

  constructor(db: Database) {
    this.db = db;
    this.initializeDb();
  }

  /**
   * Initialize database tables
   */
  private initializeDb(): void {
    // Tables are created via context.sql schema
    // This method can load existing checkpoints into memory if needed
  }

  /**
   * Create a checkpoint
   */
  async checkpoint(
    name: string,
    context: ConversationContext,
    options?: {
      sessionId?: string;
      taskId?: string;
      phase?: string;
      type?: 'manual' | 'automatic' | 'phase_boundary' | 'threshold';
      optimizationApplied?: boolean;
      compressionStrategy?: OptimizationStrategy;
      originalTokens?: number;
      parentCheckpointId?: string;
    }
  ): Promise<CheckpointId> {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    // Calculate token metrics
    const totalTokens = context.totalTokens;
    const systemTokens = this.calculateSectionTokens(context, 'system');
    const conversationTokens = this.calculateSectionTokens(context, 'conversation');
    const toolResultsTokens = this.calculateSectionTokens(context, 'tools');

    // Serialize context
    const contextSnapshot = JSON.stringify(context);
    const activeFiles = JSON.stringify(context.files.map((f) => f.path));
    const toolCache = JSON.stringify(
      context.toolResults.reduce((acc, tr) => {
        acc[tr.tool] = tr.result;
        return acc;
      }, {} as Record<string, any>)
    );

    // Calculate delta if parent checkpoint exists
    let deltaChanges: any = null;
    if (options?.parentCheckpointId) {
      const parent = this.checkpoints.get(options.parentCheckpointId);
      if (parent) {
        deltaChanges = this.calculateDelta(parent.context, context);
      }
    }

    // Create checkpoint metadata
    const metadata: CheckpointMetadata = {
      id,
      name,
      sessionId: options?.sessionId,
      taskId: options?.taskId,
      phase: options?.phase || 'unknown',
      type: options?.type || 'manual',
      createdAt: timestamp,
      tokens: {
        total: totalTokens,
        system: systemTokens,
        conversation: conversationTokens,
        toolResults: toolResultsTokens,
      },
      optimizationApplied: options?.optimizationApplied || false,
      compressionStrategy: options?.compressionStrategy,
      originalTokens: options?.originalTokens,
    };

    // Create full checkpoint
    const checkpoint: Checkpoint = {
      ...metadata,
      context,
      activeFiles: context.files.map((f) => f.path),
      toolCache: context.toolResults.reduce((acc, tr) => {
        acc[tr.tool] = tr.result;
        return acc;
      }, {} as Record<string, any>),
      parentCheckpointId: options?.parentCheckpointId,
      deltaChanges,
    };

    // Store in memory
    this.checkpoints.set(id, checkpoint);

    // Persist to database
    this.saveToDb(checkpoint, contextSnapshot, activeFiles, toolCache);

    return id;
  }

  /**
   * Restore context from checkpoint
   */
  async restore(checkpointId: CheckpointId): Promise<ConversationContext> {
    // Try memory first
    let checkpoint = this.checkpoints.get(checkpointId);

    // Load from database if not in memory
    if (!checkpoint) {
      checkpoint = this.loadFromDb(checkpointId);
      if (checkpoint) {
        this.checkpoints.set(checkpointId, checkpoint);
      }
    }

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    // If using delta storage, reconstruct from parent
    if (checkpoint.deltaChanges && checkpoint.parentCheckpointId) {
      const parent = await this.restore(checkpoint.parentCheckpointId);
      return this.applyDelta(parent, checkpoint.deltaChanges);
    }

    return checkpoint.context;
  }

  /**
   * Get checkpoint metadata
   */
  getMetadata(checkpointId: CheckpointId): CheckpointMetadata | undefined {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (checkpoint) {
      // Return metadata without full context
      const { context, activeFiles, toolCache, deltaChanges, ...metadata } = checkpoint;
      return metadata;
    }

    // Try loading from database
    return this.loadMetadataFromDb(checkpointId);
  }

  /**
   * List all checkpoints
   */
  listCheckpoints(filters?: {
    sessionId?: string;
    phase?: string;
    type?: string;
    limit?: number;
  }): CheckpointMetadata[] {
    return this.queryCheckpointsFromDb(filters);
  }

  /**
   * Delete checkpoint
   */
  delete(checkpointId: CheckpointId): boolean {
    this.checkpoints.delete(checkpointId);

    const stmt = this.db.prepare('DELETE FROM context_checkpoints WHERE id = ?');
    const result = stmt.run(checkpointId);

    return result.changes > 0;
  }

  /**
   * Delete checkpoints older than specified date
   */
  deleteOlderThan(date: Date): number {
    const stmt = this.db.prepare('DELETE FROM context_checkpoints WHERE created_at < ?');
    const result = stmt.run(date.toISOString());

    // Clear from memory cache
    for (const [id, checkpoint] of this.checkpoints.entries()) {
      if (new Date(checkpoint.createdAt) < date) {
        this.checkpoints.delete(id);
      }
    }

    return result.changes;
  }

  /**
   * Get checkpoint timeline
   */
  getTimeline(sessionId?: string): CheckpointMetadata[] {
    let query = 'SELECT * FROM v_checkpoint_timeline';
    const params: any[] = [];

    if (sessionId) {
      query += ' WHERE session_id = ?';
      params.push(sessionId);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.rowToMetadata);
  }

  /**
   * Calculate delta between two contexts
   */
  private calculateDelta(oldContext: ConversationContext, newContext: ConversationContext): any {
    return {
      addedTurns: newContext.turns.slice(oldContext.turns.length),
      addedFiles: newContext.files.filter(
        (f) => !oldContext.files.some((of) => of.path === f.path)
      ),
      addedToolResults: newContext.toolResults.slice(oldContext.toolResults.length),
      tokenDelta: newContext.totalTokens - oldContext.totalTokens,
    };
  }

  /**
   * Apply delta to reconstruct context
   */
  private applyDelta(baseContext: ConversationContext, delta: any): ConversationContext {
    return {
      ...baseContext,
      turns: [...baseContext.turns, ...(delta.addedTurns || [])],
      files: [...baseContext.files, ...(delta.addedFiles || [])],
      toolResults: [...baseContext.toolResults, ...(delta.addedToolResults || [])],
      totalTokens: baseContext.totalTokens + (delta.tokenDelta || 0),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate tokens for specific section type
   */
  private calculateSectionTokens(
    context: ConversationContext,
    type: 'system' | 'conversation' | 'tools' | 'files'
  ): number {
    return context.sections
      .filter((s) => s.type === type)
      .reduce((sum, s) => sum + s.tokens, 0);
  }

  /**
   * Save checkpoint to database
   */
  private saveToDb(
    checkpoint: Checkpoint,
    contextSnapshot: string,
    activeFiles: string,
    toolCache: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO context_checkpoints (
        id, name, session_id, task_id, phase, checkpoint_type, created_at,
        total_tokens, system_tokens, conversation_tokens, tool_results_tokens,
        context_snapshot, active_files, tool_cache,
        optimization_applied, compression_strategy, original_tokens,
        delta_from_parent, delta_changes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      checkpoint.id,
      checkpoint.name,
      checkpoint.sessionId || null,
      checkpoint.taskId || null,
      checkpoint.phase,
      checkpoint.type,
      checkpoint.createdAt,
      checkpoint.tokens.total,
      checkpoint.tokens.system,
      checkpoint.tokens.conversation,
      checkpoint.tokens.toolResults,
      contextSnapshot,
      activeFiles,
      toolCache,
      checkpoint.optimizationApplied ? 1 : 0,
      checkpoint.compressionStrategy || null,
      checkpoint.originalTokens || null,
      checkpoint.parentCheckpointId || null,
      checkpoint.deltaChanges ? JSON.stringify(checkpoint.deltaChanges) : null
    );
  }

  /**
   * Load checkpoint from database
   */
  private loadFromDb(checkpointId: CheckpointId): Checkpoint | undefined {
    const stmt = this.db.prepare('SELECT * FROM context_checkpoints WHERE id = ?');
    const row = stmt.get(checkpointId) as any;

    if (!row) return undefined;

    return this.rowToCheckpoint(row);
  }

  /**
   * Load checkpoint metadata from database
   */
  private loadMetadataFromDb(checkpointId: CheckpointId): CheckpointMetadata | undefined {
    const stmt = this.db.prepare(`
      SELECT id, name, session_id, task_id, phase, checkpoint_type, created_at,
             total_tokens, system_tokens, conversation_tokens, tool_results_tokens,
             optimization_applied, compression_strategy, original_tokens
      FROM context_checkpoints WHERE id = ?
    `);
    const row = stmt.get(checkpointId) as any;

    if (!row) return undefined;

    return this.rowToMetadata(row);
  }

  /**
   * Query checkpoints from database
   */
  private queryCheckpointsFromDb(filters?: {
    sessionId?: string;
    phase?: string;
    type?: string;
    limit?: number;
  }): CheckpointMetadata[] {
    let query = 'SELECT * FROM context_checkpoints WHERE 1=1';
    const params: any[] = [];

    if (filters?.sessionId) {
      query += ' AND session_id = ?';
      params.push(filters.sessionId);
    }

    if (filters?.phase) {
      query += ' AND phase = ?';
      params.push(filters.phase);
    }

    if (filters?.type) {
      query += ' AND checkpoint_type = ?';
      params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.rowToMetadata);
  }

  /**
   * Convert database row to Checkpoint
   */
  private rowToCheckpoint(row: any): Checkpoint {
    return {
      id: row.id,
      name: row.name,
      sessionId: row.session_id,
      taskId: row.task_id,
      phase: row.phase,
      type: row.checkpoint_type,
      createdAt: row.created_at,
      tokens: {
        total: row.total_tokens,
        system: row.system_tokens,
        conversation: row.conversation_tokens,
        toolResults: row.tool_results_tokens,
      },
      optimizationApplied: row.optimization_applied === 1,
      compressionStrategy: row.compression_strategy,
      originalTokens: row.original_tokens,
      context: JSON.parse(row.context_snapshot),
      activeFiles: JSON.parse(row.active_files || '[]'),
      toolCache: JSON.parse(row.tool_cache || '{}'),
      parentCheckpointId: row.delta_from_parent,
      deltaChanges: row.delta_changes ? JSON.parse(row.delta_changes) : undefined,
    };
  }

  /**
   * Convert database row to CheckpointMetadata
   */
  private rowToMetadata(row: any): CheckpointMetadata {
    return {
      id: row.id,
      name: row.name,
      sessionId: row.session_id,
      taskId: row.task_id,
      phase: row.phase,
      type: row.checkpoint_type,
      createdAt: row.created_at,
      tokens: {
        total: row.total_tokens,
        system: row.system_tokens || 0,
        conversation: row.conversation_tokens || 0,
        toolResults: row.tool_results_tokens || 0,
      },
      optimizationApplied: row.optimization_applied === 1,
      compressionStrategy: row.compression_strategy,
      originalTokens: row.original_tokens,
    };
  }
}

/**
 * Create a new checkpoint manager instance
 */
export function createCheckpointManager(db: Database): CheckpointManager {
  return new CheckpointManager(db);
}
