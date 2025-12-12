/**
 * @claude-sdk/tools - SnapshotTesterTool
 * Snapshot testing for data structures and outputs
 */

import { z } from 'zod';
import { success, wrapExecution, deepClone } from '../../utils/index.js';
import { ValidationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schemas
// ============================================================================

export const CreateSnapshotSchema = z.object({
  action: z.literal('create'),
  name: z.string(),
  data: z.unknown(),
  options: z
    .object({
      pretty: z.boolean().default(true),
      sortKeys: z.boolean().default(false),
    })
    .optional(),
});

export const CompareSnapshotSchema = z.object({
  action: z.literal('compare'),
  name: z.string(),
  data: z.unknown(),
  options: z
    .object({
      updateOnMismatch: z.boolean().default(false),
      ignoreKeys: z.array(z.string()).optional(),
    })
    .optional(),
});

export const UpdateSnapshotSchema = z.object({
  action: z.literal('update'),
  name: z.string(),
  data: z.unknown(),
});

export const GetSnapshotSchema = z.object({
  action: z.literal('get'),
  name: z.string(),
});

export const DeleteSnapshotSchema = z.object({
  action: z.literal('delete'),
  name: z.string(),
});

export const ListSnapshotsSchema = z.object({
  action: z.literal('list'),
});

export const ClearSnapshotsSchema = z.object({
  action: z.literal('clear'),
});

export const SnapshotTesterSchema = z.discriminatedUnion('action', [
  CreateSnapshotSchema,
  CompareSnapshotSchema,
  UpdateSnapshotSchema,
  GetSnapshotSchema,
  DeleteSnapshotSchema,
  ListSnapshotsSchema,
  ClearSnapshotsSchema,
]);

// ============================================================================
// Types
// ============================================================================

export type SnapshotTesterInput = z.infer<typeof SnapshotTesterSchema>;

interface Snapshot {
  name: string;
  data: unknown;
  created: string;
  updated: string;
  serialized: string;
}

interface ComparisonResult {
  matches: boolean;
  diff?: string;
  expected?: unknown;
  actual?: unknown;
}

// ============================================================================
// SnapshotTesterTool Implementation
// ============================================================================

export class SnapshotTesterTool {
  private static snapshots = new Map<string, Snapshot>();

  /**
   * Create a new snapshot
   */
  private static createSnapshot(
    name: string,
    data: unknown,
    options?: { pretty?: boolean; sortKeys?: boolean }
  ): ToolResult<{ created: boolean; snapshot: Snapshot }> {
    const serialized = this.serialize(data, options);
    const now = new Date().toISOString();

    const snapshot: Snapshot = {
      name,
      data: deepClone(data),
      created: now,
      updated: now,
      serialized,
    };

    this.snapshots.set(name, snapshot);

    return success({
      created: true,
      snapshot,
    });
  }

  /**
   * Compare data against stored snapshot
   */
  private static compareSnapshot(
    name: string,
    data: unknown,
    options?: { updateOnMismatch?: boolean; ignoreKeys?: string[] }
  ): ToolResult<ComparisonResult> {
    const snapshot = this.snapshots.get(name);

    if (!snapshot) {
      return success({
        matches: false,
        diff: `Snapshot "${name}" does not exist`,
        actual: data,
      });
    }

    // Process data (remove ignored keys if specified)
    let processedData = deepClone(data);
    let processedSnapshot = deepClone(snapshot.data);

    if (options?.ignoreKeys) {
      processedData = this.removeKeys(processedData, options.ignoreKeys);
      processedSnapshot = this.removeKeys(processedSnapshot, options.ignoreKeys);
    }

    const matches = this.deepEqual(processedData, processedSnapshot);

    if (!matches && options?.updateOnMismatch) {
      // Update snapshot
      this.updateSnapshot(name, data);
    }

    const result: ComparisonResult = {
      matches,
    };

    if (!matches) {
      result.diff = this.generateDiff(processedSnapshot, processedData);
      result.expected = processedSnapshot;
      result.actual = processedData;
    }

    return success(result);
  }

  /**
   * Update an existing snapshot
   */
  private static updateSnapshot(
    name: string,
    data: unknown
  ): ToolResult<{ updated: boolean; snapshot: Snapshot }> {
    const existing = this.snapshots.get(name);

    if (!existing) {
      throw new ValidationError('Snapshot not found', ['name'], name, 'existing snapshot name');
    }

    const serialized = this.serialize(data);
    const snapshot: Snapshot = {
      name,
      data: deepClone(data),
      created: existing.created,
      updated: new Date().toISOString(),
      serialized,
    };

    this.snapshots.set(name, snapshot);

    return success({
      updated: true,
      snapshot,
    });
  }

  /**
   * Get a snapshot by name
   */
  private static getSnapshot(name: string): ToolResult<{ snapshot: Snapshot | null }> {
    const snapshot = this.snapshots.get(name);

    return success({
      snapshot: snapshot || null,
    });
  }

  /**
   * Delete a snapshot
   */
  private static deleteSnapshot(name: string): ToolResult<{ deleted: boolean }> {
    const deleted = this.snapshots.delete(name);

    return success({ deleted });
  }

  /**
   * List all snapshots
   */
  private static listSnapshots(): ToolResult<{
    snapshots: Array<{ name: string; created: string; updated: string }>;
    count: number;
  }> {
    const snapshots = Array.from(this.snapshots.values()).map((s) => ({
      name: s.name,
      created: s.created,
      updated: s.updated,
    }));

    return success({
      snapshots,
      count: snapshots.length,
    });
  }

  /**
   * Clear all snapshots
   */
  private static clearSnapshots(): ToolResult<{ cleared: boolean; count: number }> {
    const count = this.snapshots.size;
    this.snapshots.clear();

    return success({
      cleared: true,
      count,
    });
  }

  /**
   * Serialize data to string
   */
  private static serialize(
    data: unknown,
    options?: { pretty?: boolean; sortKeys?: boolean }
  ): string {
    const pretty = options?.pretty ?? true;
    const sortKeys = options?.sortKeys ?? false;

    if (sortKeys && typeof data === 'object' && data !== null) {
      data = this.sortObjectKeys(data);
    }

    try {
      return JSON.stringify(data, null, pretty ? 2 : 0);
    } catch (error) {
      return String(data);
    }
  }

  /**
   * Sort object keys recursively
   */
  private static sortObjectKeys(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sortObjectKeys(item));
    }

    if (typeof obj === 'object') {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj).sort();

      for (const key of keys) {
        sorted[key] = this.sortObjectKeys((obj as Record<string, unknown>)[key]);
      }

      return sorted;
    }

    return obj;
  }

  /**
   * Remove specified keys from object
   */
  private static removeKeys(obj: unknown, keys: string[]): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.removeKeys(item, keys));
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(obj)) {
        if (!keys.includes(key)) {
          result[key] = this.removeKeys(value, keys);
        }
      }

      return result;
    }

    return obj;
  }

  /**
   * Deep equality check
   */
  private static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      this.deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  /**
   * Generate diff between expected and actual
   */
  private static generateDiff(expected: unknown, actual: unknown): string {
    const expectedStr = this.serialize(expected, { pretty: true });
    const actualStr = this.serialize(actual, { pretty: true });

    const expectedLines = expectedStr.split('\n');
    const actualLines = actualStr.split('\n');

    const diff: string[] = [];
    const maxLines = Math.max(expectedLines.length, actualLines.length);

    for (let i = 0; i < maxLines; i++) {
      const expectedLine = expectedLines[i] || '';
      const actualLine = actualLines[i] || '';

      if (expectedLine !== actualLine) {
        if (expectedLine) {
          diff.push(`- ${expectedLine}`);
        }
        if (actualLine) {
          diff.push(`+ ${actualLine}`);
        }
      } else {
        diff.push(`  ${expectedLine}`);
      }
    }

    return diff.join('\n');
  }

  /**
   * Main execution method
   */
  static async execute(
    input: SnapshotTesterInput,
    context?: ToolContext
  ): Promise<ToolResult<unknown>> {
    return wrapExecution(
      'SnapshotTesterTool',
      async (inp: SnapshotTesterInput) => {
        // Validate input
        const parsed = SnapshotTesterSchema.safeParse(inp);
        if (!parsed.success) {
          throw ValidationError.fromZodError(parsed.error);
        }

        const { action } = parsed.data;

        switch (action) {
          case 'create':
            return this.createSnapshot(parsed.data.name, parsed.data.data, parsed.data.options);

          case 'compare':
            return this.compareSnapshot(parsed.data.name, parsed.data.data, parsed.data.options);

          case 'update':
            return this.updateSnapshot(parsed.data.name, parsed.data.data);

          case 'get':
            return this.getSnapshot(parsed.data.name);

          case 'delete':
            return this.deleteSnapshot(parsed.data.name);

          case 'list':
            return this.listSnapshots();

          case 'clear':
            return this.clearSnapshots();

          default:
            throw new ValidationError(
              'Invalid action',
              ['action'],
              action,
              'create|compare|update|get|delete|list|clear'
            );
        }
      },
      input,
      context
    );
  }
}
