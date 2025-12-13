/**
 * Database integration for Agent Playground
 *
 * Connects the playground to the orchestration database and provides
 * type-safe access to playground-specific tables.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Database configuration
 */
export interface DatabaseConfig {
  /** Path to SQLite database file */
  dbPath?: string;

  /** Whether to run in read-only mode */
  readonly?: boolean;

  /** Whether to enable verbose logging */
  verbose?: boolean;

  /** Whether to initialize schema */
  initSchema?: boolean;
}

/**
 * Playground database client
 *
 * Provides type-safe access to playground tables with proper error handling
 * and connection management.
 */
export class PlaygroundDatabase {
  private db: Database.Database;
  private schemaInitialized: boolean = false;

  constructor(config: DatabaseConfig = {}) {
    const {
      dbPath = join(__dirname, '../../../orchestration/db/orchestration.db'),
      readonly = false,
      verbose = false,
      initSchema = true
    } = config;

    this.db = new Database(dbPath, {
      readonly,
      verbose: verbose ? console.log : undefined
    });

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    if (initSchema) {
      this.initializeSchema();
    }
  }

  /**
   * Initialize playground database schema
   *
   * Reads and executes the playground.sql schema file to create
   * all necessary tables and indexes.
   */
  private initializeSchema(): void {
    if (this.schemaInitialized) {
      return;
    }

    try {
      const schemaPath = join(__dirname, '../../../orchestration/db/playground.sql');
      const schema = readFileSync(schemaPath, 'utf-8');

      // Execute schema in transaction
      this.db.exec(schema);
      this.schemaInitialized = true;
    } catch (error) {
      console.error('Failed to initialize playground schema:', error);
      throw error;
    }
  }

  /**
   * Create a new playground session
   */
  createSession(data: {
    id: string;
    userId?: string;
    agentId: string;
    agentType?: string;
    input?: any;
    metadata?: any;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO playground_sessions (id, user_id, agent_id, agent_type, input, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.userId || null,
      data.agentId,
      data.agentType || null,
      data.input ? JSON.stringify(data.input) : null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );
  }

  /**
   * Update session status
   */
  updateSessionStatus(sessionId: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE playground_sessions
      SET status = ?
      WHERE id = ?
    `);

    stmt.run(status, sessionId);
  }

  /**
   * Complete a session
   */
  completeSession(data: {
    sessionId: string;
    result?: any;
    error?: string;
    durationMs: number;
  }): void {
    const stmt = this.db.prepare(`
      UPDATE playground_sessions
      SET status = ?, ended_at = CURRENT_TIMESTAMP, result = ?, error = ?, duration_ms = ?
      WHERE id = ?
    `);

    const status = data.error ? 'error' : 'completed';
    stmt.run(
      status,
      data.result ? JSON.stringify(data.result) : null,
      data.error || null,
      data.durationMs,
      data.sessionId
    );
  }

  /**
   * Record an execution step
   */
  recordStep(data: {
    sessionId: string;
    stepNumber: number;
    stepType: string;
    action: string;
    stateSnapshot?: any;
    variables?: any;
    callStack?: any;
    contextUsage?: number;
    durationMs?: number;
    metadata?: any;
  }): number {
    const stmt = this.db.prepare(`
      INSERT INTO playground_execution_steps
      (session_id, step_number, step_type, action, state_snapshot, variables, call_stack, context_usage, duration_ms, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.sessionId,
      data.stepNumber,
      data.stepType,
      data.action,
      data.stateSnapshot ? JSON.stringify(data.stateSnapshot) : null,
      data.variables ? JSON.stringify(data.variables) : null,
      data.callStack ? JSON.stringify(data.callStack) : null,
      data.contextUsage || null,
      data.durationMs || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return info.lastInsertRowid as number;
  }

  /**
   * Add a breakpoint
   */
  addBreakpoint(data: {
    id: string;
    sessionId: string;
    breakpointType: string;
    enabled?: boolean;
    location?: string;
    lineNumber?: number;
    condition?: string;
    toolName?: string;
    phaseName?: string;
    metadata?: any;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO playground_breakpoints
      (id, session_id, breakpoint_type, enabled, location, line_number, condition, tool_name, phase_name, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.sessionId,
      data.breakpointType,
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
      data.location || null,
      data.lineNumber || null,
      data.condition || null,
      data.toolName || null,
      data.phaseName || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );
  }

  /**
   * Update breakpoint hit count
   */
  recordBreakpointHit(breakpointId: string): void {
    const stmt = this.db.prepare(`
      UPDATE playground_breakpoints
      SET hit_count = hit_count + 1, last_hit_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(breakpointId);
  }

  /**
   * Record a tool call
   */
  recordToolCall(data: {
    id: string;
    sessionId: string;
    stepId?: number;
    toolName: string;
    params: any;
    response?: any;
    error?: string;
    isMock?: boolean;
    durationMs?: number;
    metadata?: any;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO playground_tool_calls
      (id, session_id, step_id, tool_name, params, response, error, is_mock, duration_ms, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.sessionId,
      data.stepId || null,
      data.toolName,
      JSON.stringify(data.params),
      data.response ? JSON.stringify(data.response) : null,
      data.error || null,
      data.isMock ? 1 : 0,
      data.durationMs || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );
  }

  /**
   * Create a recording
   */
  createRecording(data: {
    id: string;
    sessionId: string;
    agentId: string;
    name?: string;
    description?: string;
    durationMs: number;
    stepCount: number;
    success: boolean;
    error?: string;
    data: any;
    sizeBytes: number;
    tags?: string[];
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO playground_recordings
      (id, session_id, agent_id, name, description, duration_ms, step_count, success, error, data, size_bytes, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.sessionId,
      data.agentId,
      data.name || null,
      data.description || null,
      data.durationMs,
      data.stepCount,
      data.success ? 1 : 0,
      data.error || null,
      JSON.stringify(data.data),
      data.sizeBytes,
      data.tags ? JSON.stringify(data.tags) : null
    );
  }

  /**
   * Get all recordings
   */
  getAllRecordings(limit: number = 50): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM v_playground_recordings_summary
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  /**
   * Get recording by ID
   */
  getRecording(id: string): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM playground_recordings
      WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    // Parse JSON fields
    return {
      ...row,
      data: JSON.parse(row.data),
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  /**
   * Add a mock response
   */
  addMock(data: {
    id: string;
    sessionId: string;
    toolName: string;
    requestPattern?: any;
    response: any;
    delayMs?: number;
    errorRate?: number;
    errorResponse?: any;
    enabled?: boolean;
    expiresAt?: string;
    metadata?: any;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO playground_mocks
      (id, session_id, tool_name, request_pattern, response, delay_ms, error_rate, error_response, enabled, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.sessionId,
      data.toolName,
      data.requestPattern ? JSON.stringify(data.requestPattern) : null,
      JSON.stringify(data.response),
      data.delayMs || 0,
      data.errorRate || 0.0,
      data.errorResponse ? JSON.stringify(data.errorResponse) : null,
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
      data.expiresAt || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );
  }

  /**
   * Create a memory snapshot
   */
  createSnapshot(data: {
    id: string;
    sessionId: string;
    stepId?: number;
    heapUsedBytes?: number;
    heapTotalBytes?: number;
    externalBytes?: number;
    contextTokens?: number;
    contextLimit?: number;
    variables: any;
    callStack?: any;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO playground_memory_snapshots
      (id, session_id, step_id, heap_used_bytes, heap_total_bytes, external_bytes, context_tokens, context_limit, variables, call_stack)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      data.id,
      data.sessionId,
      data.stepId || null,
      data.heapUsedBytes || null,
      data.heapTotalBytes || null,
      data.externalBytes || null,
      data.contextTokens || null,
      data.contextLimit || null,
      JSON.stringify(data.variables),
      data.callStack ? JSON.stringify(data.callStack) : null
    );
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): any | null {
    const stmt = this.db.prepare(`
      SELECT * FROM v_playground_session_summary
      WHERE id = ?
    `);

    return stmt.get(sessionId) || null;
  }

  /**
   * Get tool call statistics
   */
  getToolStats(): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM v_playground_tool_stats
    `);

    return stmt.all();
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(daysOld: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM playground_sessions
      WHERE started_at < datetime('now', '-' || ? || ' days')
    `);

    const info = stmt.run(daysOld);
    return info.changes;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Begin a transaction
   */
  beginTransaction(): void {
    this.db.exec('BEGIN TRANSACTION');
  }

  /**
   * Commit a transaction
   */
  commitTransaction(): void {
    this.db.exec('COMMIT');
  }

  /**
   * Rollback a transaction
   */
  rollbackTransaction(): void {
    this.db.exec('ROLLBACK');
  }
}

/**
 * Create a playground database instance
 */
export function createPlaygroundDatabase(config?: DatabaseConfig): PlaygroundDatabase {
  return new PlaygroundDatabase(config);
}
