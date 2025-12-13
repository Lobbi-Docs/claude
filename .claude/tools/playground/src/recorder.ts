/**
 * Recorder - Execution recording and replay
 *
 * Features:
 * - Record all tool calls and responses
 * - Replay recorded sessions
 * - Export/import recordings
 * - Annotate recordings with notes
 */

import { nanoid } from 'nanoid';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Recording metadata
 */
export interface RecordingMetadata {
  id: string;
  agentId: string;
  timestamp: string;
  duration: number; // milliseconds
  success: boolean;
  toolCalls: number;
  input: any;
  result?: any;
  error?: string;
  tags: string[];
  notes: string;
}

/**
 * Recording event
 */
export interface RecordingEvent {
  id: string;
  recordingId: string;
  sequence: number;
  timestamp: string;
  type: 'tool_call' | 'tool_response' | 'state_change' | 'breakpoint' | 'log' | 'checkpoint';
  data: any;
}

/**
 * Annotation
 */
export interface Annotation {
  id: string;
  recordingId: string;
  eventId?: string;
  timestamp: string;
  author: string;
  text: string;
  type: 'note' | 'warning' | 'error' | 'info';
}

/**
 * Recorder configuration
 */
export interface RecorderConfig {
  dbPath?: string;
  maxRecordings?: number;
  autoCleanup?: boolean;
}

/**
 * Recorder class
 */
export class Recorder {
  private db!: Database.Database;
  private activeRecordings: Map<string, { recordingId: string; sequence: number }> = new Map();
  private readonly config: Required<RecorderConfig>;

  constructor(config: RecorderConfig = {}) {
    this.config = {
      dbPath: config.dbPath || join(process.cwd(), '.playground', 'recordings.db'),
      maxRecordings: config.maxRecordings ?? 1000,
      autoCleanup: config.autoCleanup ?? true
    };

    this.initializeDatabase();
  }

  /**
   * Initialize SQLite database
   */
  private initializeDatabase(): void {
    // Ensure directory exists
    const dir = this.config.dbPath.substring(0, this.config.dbPath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.config.dbPath);

    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        duration INTEGER NOT NULL,
        success INTEGER NOT NULL,
        tool_calls INTEGER NOT NULL,
        input TEXT,
        result TEXT,
        error TEXT,
        tags TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        recording_id TEXT NOT NULL,
        event_id TEXT,
        timestamp TEXT NOT NULL,
        author TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_recordings_timestamp ON recordings(timestamp);
      CREATE INDEX IF NOT EXISTS idx_recordings_agent ON recordings(agent_id);
      CREATE INDEX IF NOT EXISTS idx_events_recording ON events(recording_id);
      CREATE INDEX IF NOT EXISTS idx_annotations_recording ON annotations(recording_id);
    `);
  }

  // ===== Recording Management =====

  /**
   * Start recording a session
   */
  startRecording(sessionId: string, agentId: string, input: any): string {
    const recordingId = nanoid();

    this.activeRecordings.set(sessionId, {
      recordingId,
      sequence: 0
    });

    // Create recording metadata (will be updated on finish)
    const stmt = this.db.prepare(`
      INSERT INTO recordings (id, agent_id, timestamp, duration, success, tool_calls, input, tags, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      recordingId,
      agentId,
      new Date().toISOString(),
      0,
      0,
      0,
      JSON.stringify(input),
      JSON.stringify([]),
      ''
    );

    return recordingId;
  }

  /**
   * Record an event
   */
  recordEvent(
    sessionId: string,
    type: RecordingEvent['type'],
    data: any
  ): void {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) return;

    const event: RecordingEvent = {
      id: nanoid(),
      recordingId: recording.recordingId,
      sequence: recording.sequence++,
      timestamp: new Date().toISOString(),
      type,
      data
    };

    const stmt = this.db.prepare(`
      INSERT INTO events (id, recording_id, sequence, timestamp, type, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.recordingId,
      event.sequence,
      event.timestamp,
      event.type,
      JSON.stringify(event.data)
    );
  }

  /**
   * Finish recording
   */
  finishRecording(
    sessionId: string,
    duration: number,
    success: boolean,
    result?: any,
    error?: Error
  ): boolean {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) return false;

    // Count tool calls
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM events
      WHERE recording_id = ? AND type = 'tool_call'
    `);
    const { count } = countStmt.get(recording.recordingId) as { count: number };

    // Update recording metadata
    const updateStmt = this.db.prepare(`
      UPDATE recordings
      SET duration = ?, success = ?, tool_calls = ?, result = ?, error = ?
      WHERE id = ?
    `);

    updateStmt.run(
      duration,
      success ? 1 : 0,
      count,
      result ? JSON.stringify(result) : null,
      error ? error.message : null,
      recording.recordingId
    );

    this.activeRecordings.delete(sessionId);

    // Auto-cleanup if enabled
    if (this.config.autoCleanup) {
      this.cleanupOldRecordings();
    }

    return true;
  }

  /**
   * Get recording by ID
   */
  getRecording(recordingId: string): RecordingMetadata | null {
    const stmt = this.db.prepare(`
      SELECT * FROM recordings WHERE id = ?
    `);

    const row = stmt.get(recordingId) as any;
    if (!row) return null;

    return this.rowToRecording(row);
  }

  /**
   * Get all recordings
   */
  getAllRecordings(): RecordingMetadata[] {
    const stmt = this.db.prepare(`
      SELECT * FROM recordings ORDER BY timestamp DESC
    `);

    const rows = stmt.all() as any[];
    return rows.map(row => this.rowToRecording(row));
  }

  /**
   * Get recordings by agent
   */
  getRecordingsByAgent(agentId: string): RecordingMetadata[] {
    const stmt = this.db.prepare(`
      SELECT * FROM recordings WHERE agent_id = ? ORDER BY timestamp DESC
    `);

    const rows = stmt.all(agentId) as any[];
    return rows.map(row => this.rowToRecording(row));
  }

  /**
   * Get recordings by tags
   */
  getRecordingsByTags(tags: string[]): RecordingMetadata[] {
    const stmt = this.db.prepare(`
      SELECT * FROM recordings WHERE tags LIKE ?
    `);

    const rows: any[] = [];
    for (const tag of tags) {
      const tagRows = stmt.all(`%"${tag}"%`) as any[];
      rows.push(...tagRows);
    }

    // Remove duplicates
    const unique = rows.filter((row, index, self) =>
      index === self.findIndex(r => r.id === row.id)
    );

    return unique.map(row => this.rowToRecording(row));
  }

  /**
   * Get recording events
   */
  getRecordingEvents(recordingId: string): RecordingEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM events WHERE recording_id = ? ORDER BY sequence ASC
    `);

    const rows = stmt.all(recordingId) as any[];
    return rows.map(row => ({
      id: row.id,
      recordingId: row.recording_id,
      sequence: row.sequence,
      timestamp: row.timestamp,
      type: row.type,
      data: JSON.parse(row.data)
    }));
  }

  /**
   * Delete recording
   */
  deleteRecording(recordingId: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM recordings WHERE id = ?`);
    const result = stmt.run(recordingId);
    return result.changes > 0;
  }

  // ===== Annotation Management =====

  /**
   * Add annotation
   */
  addAnnotation(
    recordingId: string,
    text: string,
    type: Annotation['type'] = 'note',
    author: string = 'user',
    eventId?: string
  ): Annotation {
    const annotation: Annotation = {
      id: nanoid(),
      recordingId,
      eventId,
      timestamp: new Date().toISOString(),
      author,
      text,
      type
    };

    const stmt = this.db.prepare(`
      INSERT INTO annotations (id, recording_id, event_id, timestamp, author, text, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      annotation.id,
      annotation.recordingId,
      annotation.eventId || null,
      annotation.timestamp,
      annotation.author,
      annotation.text,
      annotation.type
    );

    return annotation;
  }

  /**
   * Get annotations for recording
   */
  getAnnotations(recordingId: string): Annotation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM annotations WHERE recording_id = ? ORDER BY timestamp ASC
    `);

    const rows = stmt.all(recordingId) as any[];
    return rows.map(row => ({
      id: row.id,
      recordingId: row.recording_id,
      eventId: row.event_id,
      timestamp: row.timestamp,
      author: row.author,
      text: row.text,
      type: row.type
    }));
  }

  /**
   * Delete annotation
   */
  deleteAnnotation(annotationId: string): boolean {
    const stmt = this.db.prepare(`DELETE FROM annotations WHERE id = ?`);
    const result = stmt.run(annotationId);
    return result.changes > 0;
  }

  // ===== Tags Management =====

  /**
   * Add tags to recording
   */
  addTags(recordingId: string, tags: string[]): boolean {
    const recording = this.getRecording(recordingId);
    if (!recording) return false;

    const currentTags = new Set(recording.tags);
    tags.forEach(tag => currentTags.add(tag));

    const stmt = this.db.prepare(`
      UPDATE recordings SET tags = ? WHERE id = ?
    `);

    stmt.run(JSON.stringify(Array.from(currentTags)), recordingId);
    return true;
  }

  /**
   * Remove tags from recording
   */
  removeTags(recordingId: string, tags: string[]): boolean {
    const recording = this.getRecording(recordingId);
    if (!recording) return false;

    const currentTags = new Set(recording.tags);
    tags.forEach(tag => currentTags.delete(tag));

    const stmt = this.db.prepare(`
      UPDATE recordings SET tags = ? WHERE id = ?
    `);

    stmt.run(JSON.stringify(Array.from(currentTags)), recordingId);
    return true;
  }

  // ===== Export/Import =====

  /**
   * Export recording to JSON
   */
  exportRecording(recordingId: string): {
    metadata: RecordingMetadata;
    events: RecordingEvent[];
    annotations: Annotation[];
  } | null {
    const metadata = this.getRecording(recordingId);
    if (!metadata) return null;

    const events = this.getRecordingEvents(recordingId);
    const annotations = this.getAnnotations(recordingId);

    return { metadata, events, annotations };
  }

  /**
   * Import recording from JSON
   */
  importRecording(data: {
    metadata: RecordingMetadata;
    events: RecordingEvent[];
    annotations: Annotation[];
  }): string {
    const newRecordingId = nanoid();

    // Import metadata
    const metaStmt = this.db.prepare(`
      INSERT INTO recordings (id, agent_id, timestamp, duration, success, tool_calls, input, result, error, tags, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    metaStmt.run(
      newRecordingId,
      data.metadata.agentId,
      data.metadata.timestamp,
      data.metadata.duration,
      data.metadata.success ? 1 : 0,
      data.metadata.toolCalls,
      JSON.stringify(data.metadata.input),
      data.metadata.result ? JSON.stringify(data.metadata.result) : null,
      data.metadata.error || null,
      JSON.stringify(data.metadata.tags),
      data.metadata.notes
    );

    // Import events
    const eventStmt = this.db.prepare(`
      INSERT INTO events (id, recording_id, sequence, timestamp, type, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const event of data.events) {
      eventStmt.run(
        nanoid(),
        newRecordingId,
        event.sequence,
        event.timestamp,
        event.type,
        JSON.stringify(event.data)
      );
    }

    // Import annotations
    const annotationStmt = this.db.prepare(`
      INSERT INTO annotations (id, recording_id, event_id, timestamp, author, text, type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const annotation of data.annotations) {
      annotationStmt.run(
        nanoid(),
        newRecordingId,
        annotation.eventId || null,
        annotation.timestamp,
        annotation.author,
        annotation.text,
        annotation.type
      );
    }

    return newRecordingId;
  }

  // ===== Utility Methods =====

  /**
   * Clean up old recordings
   */
  private cleanupOldRecordings(): void {
    const countStmt = this.db.prepare(`SELECT COUNT(*) as count FROM recordings`);
    const { count } = countStmt.get() as { count: number };

    if (count > this.config.maxRecordings) {
      const toDelete = count - this.config.maxRecordings;

      const deleteStmt = this.db.prepare(`
        DELETE FROM recordings
        WHERE id IN (
          SELECT id FROM recordings
          ORDER BY timestamp ASC
          LIMIT ?
        )
      `);

      deleteStmt.run(toDelete);
    }
  }

  /**
   * Convert database row to recording metadata
   */
  private rowToRecording(row: any): RecordingMetadata {
    return {
      id: row.id,
      agentId: row.agent_id,
      timestamp: row.timestamp,
      duration: row.duration,
      success: row.success === 1,
      toolCalls: row.tool_calls,
      input: row.input ? JSON.parse(row.input) : null,
      result: row.result ? JSON.parse(row.result) : undefined,
      error: row.error || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      notes: row.notes || ''
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRecordings: number;
    successfulRecordings: number;
    failedRecordings: number;
    totalToolCalls: number;
    avgDuration: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(tool_calls) as tool_calls,
        AVG(duration) as avg_duration
      FROM recordings
    `);

    const row = stmt.get() as any;

    return {
      totalRecordings: row.total || 0,
      successfulRecordings: row.successful || 0,
      failedRecordings: (row.total || 0) - (row.successful || 0),
      totalToolCalls: row.tool_calls || 0,
      avgDuration: row.avg_duration || 0
    };
  }

  /**
   * Close database
   */
  close(): void {
    this.db.close();
  }
}
