/**
 * @claude-sdk/tools - Data Merger Tool
 * Deep merge data with configurable strategies, array handling, and path-specific rules
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError, ToolError } from '../../types/errors.js';
import type { ToolResult, ToolContext, ToolDefinition } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const DataMergerSchema = z.object({
  operation: z.enum([
    'merge',
    'merge_deep',
    'merge_with_rules',
  ]),
  data: z.unknown(),
  options: z
    .object({
      // Source data to merge
      sources: z.array(z.unknown()).optional(),
      source: z.unknown().optional(),

      // Merge strategies
      strategy: z.enum(['replace', 'concat', 'union', 'deep']).optional().default('deep'),
      arrayStrategy: z.enum(['replace', 'concat', 'union', 'merge_by_key']).optional().default('replace'),

      // Array merge by key
      arrayMergeKey: z.string().optional(), // Key to identify array items for merging

      // Path-specific rules
      pathRules: z.array(z.object({
        path: z.string(), // Dot notation path like 'user.preferences'
        strategy: z.enum(['replace', 'concat', 'union', 'deep']),
        arrayStrategy: z.enum(['replace', 'concat', 'union', 'merge_by_key']).optional(),
      })).optional(),

      // Conflict resolution
      onConflict: z.enum(['use_source', 'use_target', 'combine']).optional().default('use_source'),

      // Control options
      maxDepth: z.number().optional().default(100),
      cloneObjects: z.boolean().optional().default(true),
      skipNull: z.boolean().optional().default(false),
      skipUndefined: z.boolean().optional().default(false),
    })
    .optional(),
});

export type DataMergerInput = z.infer<typeof DataMergerSchema>;

// ============================================================================
// Tool Definition
// ============================================================================

export const dataMergerTool: ToolDefinition<DataMergerInput, unknown> = {
  name: 'data_merger',
  description: 'Merge data with deep merge strategies, array handling, path-specific rules, and conflict resolution',
  version: '1.0.0',
  category: 'data',
  schema: DataMergerSchema as any, // Type assertion to work around optional field defaults
};

// ============================================================================
// Helper Functions
// ============================================================================

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function clone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => clone(item)) as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = clone(val);
    }
    return result as T;
  }

  return value;
}

function getPathValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function setPathValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// Helper function to get path-specific merge rule (for future use)
// function getPathRule(
//   path: string,
//   rules?: Array<{ path: string; strategy: string; arrayStrategy?: string }>
// ): { strategy: string; arrayStrategy?: string } | undefined {
//   if (!rules) return undefined;
//
//   for (const rule of rules) {
//     if (path === rule.path || path.startsWith(rule.path + '.')) {
//       return rule;
//     }
//   }
//
//   return undefined;
// }

function mergeArrays(
  target: unknown[],
  source: unknown[],
  strategy: string,
  mergeKey?: string
): unknown[] {
  switch (strategy) {
    case 'replace':
      return source;

    case 'concat':
      return [...target, ...source];

    case 'union':
      const seen = new Set();
      const result: unknown[] = [];

      for (const item of [...target, ...source]) {
        const key = JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(item);
        }
      }

      return result;

    case 'merge_by_key':
      if (!mergeKey) {
        return source; // Fallback to replace
      }

      const merged = new Map<unknown, unknown>();

      // Add target items
      for (const item of target) {
        if (isPlainObject(item) && mergeKey in item) {
          merged.set(item[mergeKey], item);
        }
      }

      // Merge or add source items
      for (const item of source) {
        if (isPlainObject(item) && mergeKey in item) {
          const key = item[mergeKey];
          if (merged.has(key)) {
            const existing = merged.get(key);
            merged.set(key, deepMergeInternal(existing, item, 'deep', strategy, mergeKey));
          } else {
            merged.set(key, item);
          }
        }
      }

      return Array.from(merged.values());

    default:
      return source;
  }
}

function deepMergeInternal(
  target: unknown,
  source: unknown,
  strategy: string,
  arrayStrategy: string,
  arrayMergeKey?: string,
  currentDepth = 0,
  maxDepth = 100,
  options?: {
    skipNull?: boolean;
    skipUndefined?: boolean;
    onConflict?: string;
  }
): unknown {
  if (currentDepth >= maxDepth) {
    return source;
  }

  // Handle null and undefined based on options
  if (source === null && options?.skipNull) {
    return target;
  }

  if (source === undefined && options?.skipUndefined) {
    return target;
  }

  // If source is not an object, return based on strategy
  if (!isPlainObject(source)) {
    if (strategy === 'replace') {
      return source;
    }
    return source;
  }

  // If target is not an object, return source
  if (!isPlainObject(target)) {
    return source;
  }

  const result: Record<string, unknown> = { ...target };

  for (const [key, sourceValue] of Object.entries(source)) {
    const targetValue = result[key];

    // Skip based on options
    if (sourceValue === null && options?.skipNull) {
      continue;
    }

    if (sourceValue === undefined && options?.skipUndefined) {
      continue;
    }

    // Handle arrays
    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      result[key] = mergeArrays(targetValue, sourceValue, arrayStrategy, arrayMergeKey);
    }
    // Handle nested objects
    else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMergeInternal(
        targetValue,
        sourceValue,
        strategy,
        arrayStrategy,
        arrayMergeKey,
        currentDepth + 1,
        maxDepth,
        options
      );
    }
    // Handle conflicts
    else if (targetValue !== undefined) {
      switch (options?.onConflict) {
        case 'use_target':
          // Keep target value
          break;
        case 'combine':
          // Try to combine values
          if (typeof targetValue === 'string' && typeof sourceValue === 'string') {
            result[key] = targetValue + sourceValue;
          } else if (typeof targetValue === 'number' && typeof sourceValue === 'number') {
            result[key] = targetValue + sourceValue;
          } else {
            result[key] = sourceValue;
          }
          break;
        case 'use_source':
        default:
          result[key] = sourceValue;
          break;
      }
    }
    // No conflict, set source value
    else {
      result[key] = sourceValue;
    }
  }

  return result;
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleMerge(
  input: DataMergerInput,
  _context: ToolContext
): Promise<unknown> {
  const source = input.options?.source ?? input.options?.sources?.[0];

  if (!source) {
    throw new ValidationError(
      'Merge operation requires source or sources in options',
      ['options'],
      input.options,
      'source or sources array'
    );
  }

  try {
    const cloneData = input.options?.cloneObjects ?? true;
    const target = cloneData ? clone(input.data) : input.data;

    if (!isPlainObject(target) || !isPlainObject(source)) {
      return source; // Simple replacement
    }

    return { ...target, ...source };
  } catch (error) {
    throw new ToolError(
      `Merge failed: ${error instanceof Error ? error.message : String(error)}`,
      'MERGE_ERROR'
    );
  }
}

async function handleMergeDeep(
  input: DataMergerInput,
  _context: ToolContext
): Promise<unknown> {
  const sources = input.options?.sources ?? (input.options?.source ? [input.options.source] : []);

  if (sources.length === 0) {
    throw new ValidationError(
      'Deep merge operation requires source or sources in options',
      ['options'],
      input.options,
      'source or sources array'
    );
  }

  try {
    const cloneData = input.options?.cloneObjects ?? true;
    let result = cloneData ? clone(input.data) : input.data;

    for (const source of sources) {
      result = deepMergeInternal(
        result,
        source,
        input.options?.strategy ?? 'deep',
        input.options?.arrayStrategy ?? 'replace',
        input.options?.arrayMergeKey,
        0,
        input.options?.maxDepth ?? 100,
        {
          skipNull: input.options?.skipNull ?? false,
          skipUndefined: input.options?.skipUndefined ?? false,
          onConflict: input.options?.onConflict ?? 'use_source',
        }
      );
    }

    return result;
  } catch (error) {
    throw new ToolError(
      `Deep merge failed: ${error instanceof Error ? error.message : String(error)}`,
      'MERGE_ERROR'
    );
  }
}

async function handleMergeWithRules(
  input: DataMergerInput,
  _context: ToolContext
): Promise<unknown> {
  const sources = input.options?.sources ?? (input.options?.source ? [input.options.source] : []);

  if (sources.length === 0) {
    throw new ValidationError(
      'Merge with rules operation requires source or sources in options',
      ['options'],
      input.options,
      'source or sources array'
    );
  }

  if (!input.options?.pathRules || input.options.pathRules.length === 0) {
    throw new ValidationError(
      'Merge with rules operation requires pathRules in options',
      ['options', 'pathRules'],
      input.options?.pathRules,
      'array of path rules'
    );
  }

  try {
    const cloneData = input.options?.cloneObjects ?? true;
    let result = cloneData ? clone(input.data) as Record<string, unknown> : input.data as Record<string, unknown>;

    // Apply path-specific rules
    for (const rule of input.options.pathRules) {
      const targetValue = getPathValue(result, rule.path);
      const sourceValues = sources.map((src) => getPathValue(src, rule.path));

      let merged = targetValue;
      for (const sourceValue of sourceValues) {
        if (sourceValue !== undefined) {
          merged = deepMergeInternal(
            merged,
            sourceValue,
            rule.strategy,
            rule.arrayStrategy ?? input.options?.arrayStrategy ?? 'replace',
            input.options?.arrayMergeKey,
            0,
            input.options?.maxDepth ?? 100,
            {
              skipNull: input.options?.skipNull ?? false,
              skipUndefined: input.options?.skipUndefined ?? false,
              onConflict: input.options?.onConflict ?? 'use_source',
            }
          );
        }
      }

      if (merged !== undefined) {
        setPathValue(result, rule.path, merged);
      }
    }

    // Merge remaining paths with default strategy
    for (const source of sources) {
      result = deepMergeInternal(
        result,
        source,
        input.options?.strategy ?? 'deep',
        input.options?.arrayStrategy ?? 'replace',
        input.options?.arrayMergeKey,
        0,
        input.options?.maxDepth ?? 100,
        {
          skipNull: input.options?.skipNull ?? false,
          skipUndefined: input.options?.skipUndefined ?? false,
          onConflict: input.options?.onConflict ?? 'use_source',
        }
      ) as Record<string, unknown>;
    }

    return result;
  } catch (error) {
    throw new ToolError(
      `Merge with rules failed: ${error instanceof Error ? error.message : String(error)}`,
      'MERGE_ERROR'
    );
  }
}

// ============================================================================
// Tool Executor
// ============================================================================

export async function executeDataMerger(
  input: DataMergerInput,
  context: ToolContext
): Promise<ToolResult<unknown>> {
  return wrapExecution('data_merger', async (input, context) => {
    switch (input.operation) {
      case 'merge':
        return handleMerge(input, context);
      case 'merge_deep':
        return handleMergeDeep(input, context);
      case 'merge_with_rules':
        return handleMergeWithRules(input, context);
      default:
        throw new ValidationError(
          `Unknown operation: ${(input as { operation: string }).operation}`,
          ['operation'],
          (input as { operation: string }).operation,
          'merge|merge_deep|merge_with_rules'
        );
    }
  }, input, context);
}
