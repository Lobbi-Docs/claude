/**
 * Procedural Memory: Action Sequences and Procedures
 *
 * Stores and manages reusable procedures abstracted from successful episodes,
 * allowing agents to learn and reuse action patterns.
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import {
  Procedure,
  Step,
  ProcedureChange,
  Episode,
  DatabaseConfig,
} from './types';

/**
 * Procedural Memory Manager
 */
export class ProceduralMemory {
  private db: Database.Database;
  private namespace: string;

  constructor(config: DatabaseConfig) {
    this.db = new Database(config.dbPath);
    this.namespace = config.namespace || 'default';
  }

  /**
   * Record a successful action sequence as a procedure
   */
  recordProcedure(
    taskId: string,
    actions: Array<{ type: string; description: string; parameters?: any }>
  ): Procedure {
    const id = uuidv4();
    const now = new Date();

    // Generate name from task ID
    const name = `procedure-${taskId.substring(0, 8)}`;

    // Extract trigger pattern (simple: first action type)
    const triggerPattern = actions.length > 0 ? actions[0].type : 'unknown';

    const procedure: Procedure = {
      id,
      name,
      triggerPattern,
      steps: actions.map((action, index) => ({
        order: index,
        description: action.description,
        actionType: action.type,
        parameters: action.parameters,
      })),
      successCount: 1,
      failureCount: 0,
      successRate: 1.0,
      usageCount: 1,
      tags: ['recorded', taskId],
      created: now,
      lastUpdated: now,
      version: 1,
      sourceEpisodes: [taskId],
    };

    this.storeProcedure(procedure);

    return procedure;
  }

  /**
   * Store a procedure
   */
  private storeProcedure(procedure: Procedure): void {
    const transaction = this.db.transaction(() => {
      // Insert procedure
      const stmt = this.db.prepare(`
        INSERT INTO procedures (
          id, name, trigger_pattern, description, success_count,
          failure_count, usage_count, created, last_updated, version, namespace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
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
        this.namespace
      );

      // Insert steps
      const stepStmt = this.db.prepare(`
        INSERT INTO procedure_steps (
          id, procedure_id, step_order, description, action_type,
          parameters, expected_outcome, condition
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const step of procedure.steps) {
        stepStmt.run(
          uuidv4(),
          procedure.id,
          step.order,
          step.description,
          step.actionType,
          step.parameters ? JSON.stringify(step.parameters) : null,
          step.expectedOutcome || null,
          step.condition || null
        );
      }

      // Insert tags
      const tagStmt = this.db.prepare(`
        INSERT INTO procedure_tags (procedure_id, tag) VALUES (?, ?)
      `);

      for (const tag of procedure.tags) {
        tagStmt.run(procedure.id, tag);
      }

      // Insert source episodes
      const sourceStmt = this.db.prepare(`
        INSERT INTO procedure_sources (procedure_id, episode_id) VALUES (?, ?)
      `);

      for (const episodeId of procedure.sourceEpisodes) {
        sourceStmt.run(procedure.id, episodeId);
      }

      // Insert preconditions
      if (procedure.preconditions) {
        const preStmt = this.db.prepare(`
          INSERT INTO procedure_conditions (id, procedure_id, type, condition_text, order_index)
          VALUES (?, ?, 'precondition', ?, ?)
        `);

        procedure.preconditions.forEach((cond, index) => {
          preStmt.run(uuidv4(), procedure.id, cond, index);
        });
      }

      // Insert postconditions
      if (procedure.postconditions) {
        const postStmt = this.db.prepare(`
          INSERT INTO procedure_conditions (id, procedure_id, type, condition_text, order_index)
          VALUES (?, ?, 'postcondition', ?, ?)
        `);

        procedure.postconditions.forEach((cond, index) => {
          postStmt.run(uuidv4(), procedure.id, cond, index);
        });
      }
    });

    transaction();
  }

  /**
   * Abstract multiple similar episodes into a procedure
   */
  abstractProcedure(episodes: Episode[]): Procedure | null {
    if (episodes.length === 0) {
      return null;
    }

    // Find common action patterns
    const actionSequences = episodes.map((ep) =>
      ep.actions.map((a) => ({ type: a.type, description: a.description }))
    );

    // Find longest common subsequence of action types
    const commonSteps = this.findCommonSequence(actionSequences);

    if (commonSteps.length === 0) {
      return null;
    }

    const id = uuidv4();
    const now = new Date();

    // Generate name from first episode
    const name = `abstracted-${episodes[0].taskDescription.substring(0, 20).replace(/\s+/g, '-')}`;

    const procedure: Procedure = {
      id,
      name,
      triggerPattern: commonSteps[0].type,
      description: `Abstracted from ${episodes.length} similar episodes`,
      steps: commonSteps.map((step, index) => ({
        order: index,
        description: step.description,
        actionType: step.type,
      })),
      successCount: episodes.filter((ep) => ep.outcome === 'success').length,
      failureCount: episodes.filter((ep) => ep.outcome === 'failure').length,
      successRate: episodes.filter((ep) => ep.outcome === 'success').length / episodes.length,
      usageCount: episodes.length,
      tags: ['abstracted'],
      created: now,
      lastUpdated: now,
      version: 1,
      sourceEpisodes: episodes.map((ep) => ep.id),
    };

    this.storeProcedure(procedure);

    return procedure;
  }

  /**
   * Find common action sequence across multiple episodes
   */
  private findCommonSequence(
    sequences: Array<Array<{ type: string; description: string }>>
  ): Array<{ type: string; description: string }> {
    if (sequences.length === 0) {
      return [];
    }

    // Use first sequence as reference
    const reference = sequences[0];
    const common: Array<{ type: string; description: string }> = [];

    // Find actions that appear in all sequences
    for (const action of reference) {
      const appearsInAll = sequences.every((seq) =>
        seq.some((a) => a.type === action.type)
      );

      if (appearsInAll) {
        common.push(action);
      }
    }

    return common;
  }

  /**
   * Suggest procedures for a task
   */
  suggestProcedures(task: string): Procedure[] {
    // Search by task description similarity (using FTS)
    const stmt = this.db.prepare(`
      SELECT p.* FROM procedures_fts fts
      JOIN procedures p ON fts.rowid = p.rowid
      WHERE fts MATCH ? AND p.namespace = ?
      ORDER BY p.success_rate DESC, p.usage_count DESC
      LIMIT 5
    `);

    const results = stmt.all(task, this.namespace) as any[];
    return results.map((row) => this.rowToProcedure(row));
  }

  /**
   * Get procedure by ID
   */
  getProcedure(id: string): Procedure | null {
    const stmt = this.db.prepare(`
      SELECT * FROM procedures WHERE id = ? AND namespace = ?
    `);

    const result = stmt.get(id, this.namespace) as any;

    if (!result) {
      return null;
    }

    return this.rowToProcedure(result);
  }

  /**
   * Convert database row to Procedure
   */
  private rowToProcedure(row: any): Procedure {
    // Get steps
    const steps = this.db.prepare(`
      SELECT * FROM procedure_steps WHERE procedure_id = ? ORDER BY step_order
    `).all(row.id) as any[];

    // Get tags
    const tags = this.db.prepare(`
      SELECT tag FROM procedure_tags WHERE procedure_id = ?
    `).all(row.id) as Array<{ tag: string }>;

    // Get source episodes
    const sources = this.db.prepare(`
      SELECT episode_id FROM procedure_sources WHERE procedure_id = ?
    `).all(row.id) as Array<{ episode_id: string }>;

    // Get preconditions
    const preconditions = this.db.prepare(`
      SELECT condition_text FROM procedure_conditions
      WHERE procedure_id = ? AND type = 'precondition'
      ORDER BY order_index
    `).all(row.id) as Array<{ condition_text: string }>;

    // Get postconditions
    const postconditions = this.db.prepare(`
      SELECT condition_text FROM procedure_conditions
      WHERE procedure_id = ? AND type = 'postcondition'
      ORDER BY order_index
    `).all(row.id) as Array<{ condition_text: string }>;

    return {
      id: row.id,
      name: row.name,
      triggerPattern: row.trigger_pattern,
      description: row.description || undefined,
      steps: steps.map((s) => ({
        order: s.step_order,
        description: s.description,
        actionType: s.action_type,
        parameters: s.parameters ? JSON.parse(s.parameters) : undefined,
        expectedOutcome: s.expected_outcome || undefined,
        condition: s.condition || undefined,
      })),
      successCount: row.success_count,
      failureCount: row.failure_count,
      successRate: (row.success_count + row.failure_count) > 0
        ? row.success_count / (row.success_count + row.failure_count)
        : 0,
      usageCount: row.usage_count,
      tags: tags.map((t) => t.tag),
      created: new Date(row.created),
      lastUpdated: new Date(row.last_updated),
      version: row.version,
      sourceEpisodes: sources.map((s) => s.episode_id),
      preconditions: preconditions.length > 0
        ? preconditions.map((p) => p.condition_text)
        : undefined,
      postconditions: postconditions.length > 0
        ? postconditions.map((p) => p.condition_text)
        : undefined,
    };
  }

  /**
   * Update procedure after execution
   */
  updateProcedure(id: string, changes: ProcedureChange): void {
    const procedure = this.getProcedure(id);

    if (!procedure) {
      throw new Error(`Procedure not found: ${id}`);
    }

    const transaction = this.db.transaction(() => {
      // Apply changes based on type
      switch (changes.type) {
        case 'add_step':
          if (changes.step) {
            const stmt = this.db.prepare(`
              INSERT INTO procedure_steps (
                id, procedure_id, step_order, description, action_type,
                parameters, expected_outcome, condition
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
              uuidv4(),
              id,
              changes.step.order,
              changes.step.description,
              changes.step.actionType,
              changes.step.parameters ? JSON.stringify(changes.step.parameters) : null,
              changes.step.expectedOutcome || null,
              changes.step.condition || null
            );
          }
          break;

        case 'remove_step':
          if (changes.stepIndex !== undefined) {
            this.db.prepare(`
              DELETE FROM procedure_steps WHERE procedure_id = ? AND step_order = ?
            `).run(id, changes.stepIndex);
          }
          break;

        case 'modify_step':
          if (changes.stepIndex !== undefined && changes.step) {
            this.db.prepare(`
              UPDATE procedure_steps SET
                description = ?,
                action_type = ?,
                parameters = ?,
                expected_outcome = ?,
                condition = ?
              WHERE procedure_id = ? AND step_order = ?
            `).run(
              changes.step.description,
              changes.step.actionType,
              changes.step.parameters ? JSON.stringify(changes.step.parameters) : null,
              changes.step.expectedOutcome || null,
              changes.step.condition || null,
              id,
              changes.stepIndex
            );
          }
          break;
      }

      // Update version and timestamp
      this.db.prepare(`
        UPDATE procedures SET
          version = version + 1,
          last_updated = ?
        WHERE id = ?
      `).run(Date.now(), id);
    });

    transaction();
  }

  /**
   * Record procedure usage result
   */
  recordUsage(id: string, success: boolean): void {
    const field = success ? 'success_count' : 'failure_count';

    this.db.prepare(`
      UPDATE procedures SET
        ${field} = ${field} + 1,
        usage_count = usage_count + 1
      WHERE id = ?
    `).run(id);
  }

  /**
   * Get all procedures
   */
  getAllProcedures(options?: {
    minSuccessRate?: number;
    tags?: string[];
    limit?: number;
  }): Procedure[] {
    let sql = `SELECT * FROM procedures WHERE namespace = ?`;
    const params: any[] = [this.namespace];

    if (options?.tags && options.tags.length > 0) {
      sql += ` AND id IN (
        SELECT procedure_id FROM procedure_tags
        WHERE tag IN (${options.tags.map(() => '?').join(',')})
      )`;
      params.push(...options.tags);
    }

    sql += ' ORDER BY success_count DESC, usage_count DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    const results = stmt.all(...params) as any[];

    return results
      .map((row) => this.rowToProcedure(row))
      .filter((p) => {
        if (options?.minSuccessRate !== undefined) {
          return p.successRate >= options.minSuccessRate;
        }
        return true;
      });
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalProcedures: number;
    avgSuccessRate: number;
    avgUsageCount: number;
    topProcedures: Array<{ name: string; successRate: number; usageCount: number }>;
  } {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as totalProcedures,
        AVG(CASE WHEN (success_count + failure_count) > 0
          THEN CAST(success_count AS REAL) / (success_count + failure_count)
          ELSE 0 END) as avgSuccessRate,
        AVG(usage_count) as avgUsageCount
      FROM procedures
      WHERE namespace = ?
    `).get(this.namespace) as any;

    const topProcedures = this.db.prepare(`
      SELECT name,
        CASE WHEN (success_count + failure_count) > 0
          THEN CAST(success_count AS REAL) / (success_count + failure_count)
          ELSE 0 END as successRate,
        usage_count as usageCount
      FROM procedures
      WHERE namespace = ?
      ORDER BY usage_count DESC
      LIMIT 5
    `).all(this.namespace) as any[];

    return {
      ...stats,
      topProcedures,
    };
  }
}
