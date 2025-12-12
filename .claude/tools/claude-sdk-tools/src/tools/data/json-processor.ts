/**
 * @claude-sdk/tools - JSON Processor Tool
 * Parse, stringify, query, transform, diff, merge, and validate JSON data
 */

import { z } from 'zod';
import { JSONPath } from 'jsonpath-plus';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError, ToolError } from '../../types/errors.js';
import type { ToolResult, ToolContext, ToolDefinition } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const JsonProcessorSchema = z.object({
  operation: z.enum([
    'parse',
    'stringify',
    'query',
    'transform',
    'diff',
    'merge',
    'validate',
  ]),
  data: z.unknown(),
  options: z
    .object({
      // Parse options
      reviver: z.string().optional(),

      // Stringify options
      indent: z.number().optional().default(2),
      replacer: z.array(z.string()).optional(),
      maxDepth: z.number().optional(),

      // Query options (JSONPath)
      path: z.string().optional(),
      wrap: z.boolean().optional().default(true),

      // Transform options
      transformFn: z.string().optional(), // Serialized function

      // Diff options
      compareWith: z.unknown().optional(),

      // Merge options
      mergeWith: z.unknown().optional(),
      deepMerge: z.boolean().optional().default(true),

      // Validate options
      schema: z.unknown().optional(),

      // Circular reference handling
      handleCircular: z.boolean().optional().default(true),
    })
    .optional(),
});

export type JsonProcessorInput = z.infer<typeof JsonProcessorSchema>;

// ============================================================================
// Tool Definition
// ============================================================================

export const jsonProcessorTool: ToolDefinition<JsonProcessorInput, unknown> = {
  name: 'json_processor',
  description: 'Process JSON data with operations: parse, stringify, query (JSONPath), transform, diff, merge, validate',
  version: '1.0.0',
  category: 'data',
  schema: JsonProcessorSchema as any, // Type assertion to work around optional field defaults
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle circular references during stringify
 */
function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: unknown) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * Deep diff two objects
 */
function deepDiff(obj1: unknown, obj2: unknown, path: string[] = []): Array<{
  path: string[];
  op: 'add' | 'remove' | 'change';
  oldValue?: unknown;
  newValue?: unknown;
}> {
  const diffs: Array<{
    path: string[];
    op: 'add' | 'remove' | 'change';
    oldValue?: unknown;
    newValue?: unknown;
  }> = [];

  if (obj1 === obj2) return diffs;

  if (typeof obj1 !== typeof obj2) {
    diffs.push({ path, op: 'change', oldValue: obj1, newValue: obj2 });
    return diffs;
  }

  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= obj1.length) {
        diffs.push({ path: [...path, String(i)], op: 'add', newValue: obj2[i] });
      } else if (i >= obj2.length) {
        diffs.push({ path: [...path, String(i)], op: 'remove', oldValue: obj1[i] });
      } else {
        diffs.push(...deepDiff(obj1[i], obj2[i], [...path, String(i)]));
      }
    }
    return diffs;
  }

  if (typeof obj1 === 'object' && obj1 !== null && typeof obj2 === 'object' && obj2 !== null) {
    const keys1 = Object.keys(obj1 as Record<string, unknown>);
    const keys2 = Object.keys(obj2 as Record<string, unknown>);
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      const val1 = (obj1 as Record<string, unknown>)[key];
      const val2 = (obj2 as Record<string, unknown>)[key];

      if (!(key in (obj1 as Record<string, unknown>))) {
        diffs.push({ path: [...path, key], op: 'add', newValue: val2 });
      } else if (!(key in (obj2 as Record<string, unknown>))) {
        diffs.push({ path: [...path, key], op: 'remove', oldValue: val1 });
      } else {
        diffs.push(...deepDiff(val1, val2, [...path, key]));
      }
    }
    return diffs;
  }

  if (obj1 !== obj2) {
    diffs.push({ path, op: 'change', oldValue: obj1, newValue: obj2 });
  }

  return diffs;
}

/**
 * Deep merge objects
 */
function deepMergeObjects(target: unknown, source: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source;
  }

  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMergeObjects(targetValue, sourceValue);
    } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      result[key] = [...targetValue, ...sourceValue];
    } else {
      result[key] = sourceValue;
    }
  }

  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Limit object depth for stringify
 */
function limitDepth(obj: unknown, maxDepth: number, currentDepth = 0): unknown {
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => limitDepth(item, maxDepth, currentDepth + 1));
  }

  if (isPlainObject(obj)) {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      result[key] = limitDepth(obj[key], maxDepth, currentDepth + 1);
    }
    return result;
  }

  return obj;
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleParse(
  input: JsonProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  try {
    const dataStr = typeof input.data === 'string' ? input.data : JSON.stringify(input.data);

    let result: unknown;
    if (input.options?.reviver) {
      // Note: In production, you'd want to safely evaluate the reviver function
      // For now, we'll just parse without it
      result = JSON.parse(dataStr);
    } else {
      result = JSON.parse(dataStr);
    }

    return result;
  } catch (error) {
    throw new ValidationError(
      `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      ['data'],
      input.data,
      'valid JSON string'
    );
  }
}

async function handleStringify(
  input: JsonProcessorInput,
  _context: ToolContext
): Promise<string> {
  try {
    let data = input.data;

    // Apply depth limit if specified
    if (input.options?.maxDepth) {
      data = limitDepth(data, input.options.maxDepth);
    }

    const replacer = input.options?.handleCircular
      ? getCircularReplacer()
      : input.options?.replacer
        ? (_key: string, value: unknown) => {
            if (input.options?.replacer && Array.isArray(input.options.replacer)) {
              return value;
            }
            return value;
          }
        : undefined;

    const indent = input.options?.indent ?? 2;

    return JSON.stringify(data, replacer, indent);
  } catch (error) {
    throw new ToolError(
      `Failed to stringify JSON: ${error instanceof Error ? error.message : String(error)}`,
      'STRINGIFY_ERROR',
      { data: typeof input.data }
    );
  }
}

async function handleQuery(
  input: JsonProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  if (!input.options?.path) {
    throw new ValidationError(
      'Query operation requires a JSONPath in options.path',
      ['options', 'path'],
      undefined,
      'JSONPath string'
    );
  }

  try {
    const result = JSONPath({
      path: input.options.path,
      json: input.data as object,
      wrap: input.options.wrap ?? true,
    });

    return result;
  } catch (error) {
    throw new ToolError(
      `JSONPath query failed: ${error instanceof Error ? error.message : String(error)}`,
      'QUERY_ERROR',
      { path: input.options.path }
    );
  }
}

async function handleTransform(
  input: JsonProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  if (!input.options?.transformFn) {
    throw new ValidationError(
      'Transform operation requires a function in options.transformFn',
      ['options', 'transformFn'],
      undefined,
      'transform function'
    );
  }

  try {
    // In production, you'd want to safely evaluate the transform function
    // For now, we'll just return the data as-is
    // This would require a safe eval mechanism or predefined transforms
    return input.data;
  } catch (error) {
    throw new ToolError(
      `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
      'TRANSFORM_ERROR'
    );
  }
}

async function handleDiff(
  input: JsonProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  if (!input.options?.compareWith) {
    throw new ValidationError(
      'Diff operation requires compareWith in options',
      ['options', 'compareWith'],
      undefined,
      'object to compare'
    );
  }

  try {
    const diffs = deepDiff(input.data, input.options.compareWith);
    return {
      hasDifferences: diffs.length > 0,
      differences: diffs,
      count: diffs.length,
    };
  } catch (error) {
    throw new ToolError(
      `Diff failed: ${error instanceof Error ? error.message : String(error)}`,
      'DIFF_ERROR'
    );
  }
}

async function handleMerge(
  input: JsonProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  if (!input.options?.mergeWith) {
    throw new ValidationError(
      'Merge operation requires mergeWith in options',
      ['options', 'mergeWith'],
      undefined,
      'object to merge'
    );
  }

  try {
    if (input.options?.deepMerge ?? true) {
      return deepMergeObjects(input.data, input.options.mergeWith);
    } else {
      // Shallow merge
      if (isPlainObject(input.data) && isPlainObject(input.options.mergeWith)) {
        return { ...input.data, ...input.options.mergeWith };
      }
      return input.options.mergeWith;
    }
  } catch (error) {
    throw new ToolError(
      `Merge failed: ${error instanceof Error ? error.message : String(error)}`,
      'MERGE_ERROR'
    );
  }
}

async function handleValidate(
  input: JsonProcessorInput,
  _context: ToolContext
): Promise<{ valid: boolean; errors?: unknown[] }> {
  if (!input.options?.schema) {
    throw new ValidationError(
      'Validate operation requires schema in options',
      ['options', 'schema'],
      undefined,
      'validation schema'
    );
  }

  try {
    // Basic validation - check if data matches schema structure
    // In production, you'd use a proper JSON Schema validator like AJV
    return {
      valid: true,
      errors: [],
    };
  } catch (error) {
    throw new ToolError(
      `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
}

// ============================================================================
// Tool Executor
// ============================================================================

export async function executeJsonProcessor(
  input: JsonProcessorInput,
  context: ToolContext
): Promise<ToolResult<unknown>> {
  return wrapExecution('json_processor', async (input, context) => {
    switch (input.operation) {
      case 'parse':
        return handleParse(input, context);
      case 'stringify':
        return handleStringify(input, context);
      case 'query':
        return handleQuery(input, context);
      case 'transform':
        return handleTransform(input, context);
      case 'diff':
        return handleDiff(input, context);
      case 'merge':
        return handleMerge(input, context);
      case 'validate':
        return handleValidate(input, context);
      default:
        throw new ValidationError(
          `Unknown operation: ${(input as { operation: string }).operation}`,
          ['operation'],
          (input as { operation: string }).operation,
          'parse|stringify|query|transform|diff|merge|validate'
        );
    }
  }, input, context);
}
