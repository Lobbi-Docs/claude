/**
 * @claude-sdk/tools - DataTransformerTool
 * Advanced data transformation and manipulation operations
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

const DataOperationEnum = z.enum([
  'flatten',
  'unflatten',
  'map',
  'filter',
  'reduce',
  'sort',
  'group',
  'unique',
  'merge',
]);

export const DataTransformerSchema = z.object({
  operation: DataOperationEnum,
  input: z.any(),

  // Flatten/Unflatten options
  separator: z.string().optional(),
  maxDepth: z.number().int().positive().optional(),

  // Map options
  mapFn: z.string().optional(), // JavaScript function as string
  mapPath: z.string().optional(), // Path to map over

  // Filter options
  filterFn: z.string().optional(), // JavaScript function as string
  filterPath: z.string().optional(), // Path to filter
  filterValue: z.any().optional(), // Value to filter by

  // Reduce options
  reduceFn: z.string().optional(), // JavaScript function as string
  initialValue: z.any().optional(),

  // Sort options
  sortBy: z.string().optional(), // Path or property to sort by
  sortOrder: z.enum(['asc', 'desc']).optional(),
  sortFn: z.string().optional(), // Custom comparator function

  // Group options
  groupBy: z.string().optional(), // Path or property to group by

  // Unique options
  uniqueBy: z.string().optional(), // Path or property for uniqueness

  // Merge options
  mergeWith: z.any().optional(), // Data to merge with
  mergeStrategy: z.enum(['shallow', 'deep', 'concat']).optional(),
});

export type DataTransformerInput = z.infer<typeof DataTransformerSchema>;

export interface DataTransformerOutput {
  result: any;
  operation: string;
  metadata?: {
    inputType?: string;
    outputType?: string;
    itemCount?: number;
    transformedCount?: number;
  };
}

// ============================================================================
// DataTransformerTool Implementation
// ============================================================================

export class DataTransformerTool {
  static readonly name = 'data_transformer';
  static readonly description = 'Transform and manipulate data structures including flatten, unflatten, map, filter, reduce, sort, group, unique, and merge operations';
  static readonly schema = DataTransformerSchema;

  static async execute(
    input: DataTransformerInput,
    context?: ToolContext
  ): Promise<ToolResult<DataTransformerOutput>> {
    return wrapExecution(this.name, async (input, _ctx) => {
      const { operation } = input;

      switch (operation) {
        case 'flatten':
          return this.handleFlatten(input);
        case 'unflatten':
          return this.handleUnflatten(input);
        case 'map':
          return this.handleMap(input);
        case 'filter':
          return this.handleFilter(input);
        case 'reduce':
          return this.handleReduce(input);
        case 'sort':
          return this.handleSort(input);
        case 'group':
          return this.handleGroup(input);
        case 'unique':
          return this.handleUnique(input);
        case 'merge':
          return this.handleMerge(input);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    }, input, context);
  }

  // ============================================================================
  // Operation Handlers
  // ============================================================================

  private static handleFlatten(input: DataTransformerInput): DataTransformerOutput {
    const separator = input.separator ?? '.';
    const maxDepth = input.maxDepth;

    const flatten = (obj: any, prefix = '', depth = 0): any => {
      if (maxDepth !== undefined && depth >= maxDepth) {
        return { [prefix.slice(0, -separator.length)]: obj };
      }

      if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return { [prefix.slice(0, -separator.length)]: obj };
      }

      return Object.keys(obj).reduce((acc, key) => {
        const value = obj[key];
        const newKey = prefix + key + separator;

        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(acc, flatten(value, newKey, depth + 1));
        } else {
          acc[newKey.slice(0, -separator.length)] = value;
        }

        return acc;
      }, {} as any);
    };

    const result = flatten(input.input);

    return {
      result,
      operation: 'flatten',
      metadata: {
        inputType: this.getType(input.input),
        outputType: 'object',
        itemCount: Object.keys(result).length,
      },
    };
  }

  private static handleUnflatten(input: DataTransformerInput): DataTransformerOutput {
    if (typeof input.input !== 'object' || input.input === null) {
      throw new Error('Unflatten operation requires object input');
    }

    const separator = input.separator ?? '.';
    const result: any = {};

    for (const [key, value] of Object.entries(input.input)) {
      const parts = key.split(separator);
      let current = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }

      current[parts[parts.length - 1]] = value;
    }

    return {
      result,
      operation: 'unflatten',
      metadata: {
        inputType: 'object',
        outputType: this.getType(result),
        itemCount: Object.keys(input.input).length,
      },
    };
  }

  private static handleMap(input: DataTransformerInput): DataTransformerOutput {
    if (!Array.isArray(input.input)) {
      throw new Error('Map operation requires array input');
    }

    let result: any[];

    if (input.mapFn) {
      // Use provided function
      const fn = this.createFunction(input.mapFn);
      result = input.input.map(fn);
    } else if (input.mapPath) {
      // Extract values by path
      result = input.input.map((item) => this.getValueByPath(item, input.mapPath!));
    } else {
      throw new Error('Map operation requires mapFn or mapPath parameter');
    }

    return {
      result,
      operation: 'map',
      metadata: {
        inputType: 'array',
        outputType: 'array',
        itemCount: input.input.length,
        transformedCount: result.length,
      },
    };
  }

  private static handleFilter(input: DataTransformerInput): DataTransformerOutput {
    if (!Array.isArray(input.input)) {
      throw new Error('Filter operation requires array input');
    }

    let result: any[];

    if (input.filterFn) {
      // Use provided function
      const fn = this.createFunction(input.filterFn);
      result = input.input.filter(fn);
    } else if (input.filterPath && input.filterValue !== undefined) {
      // Filter by path and value
      result = input.input.filter((item) => {
        const value = this.getValueByPath(item, input.filterPath!);
        return value === input.filterValue;
      });
    } else {
      throw new Error('Filter operation requires filterFn or (filterPath and filterValue) parameters');
    }

    return {
      result,
      operation: 'filter',
      metadata: {
        inputType: 'array',
        outputType: 'array',
        itemCount: input.input.length,
        transformedCount: result.length,
      },
    };
  }

  private static handleReduce(input: DataTransformerInput): DataTransformerOutput {
    if (!Array.isArray(input.input)) {
      throw new Error('Reduce operation requires array input');
    }
    if (!input.reduceFn) {
      throw new Error('Reduce operation requires reduceFn parameter');
    }

    const fn = this.createFunction(input.reduceFn, 2); // reducer function takes 2 params
    const hasInitial = input.initialValue !== undefined;
    const result = hasInitial
      ? input.input.reduce(fn, input.initialValue)
      : input.input.reduce(fn);

    return {
      result,
      operation: 'reduce',
      metadata: {
        inputType: 'array',
        outputType: this.getType(result),
        itemCount: input.input.length,
      },
    };
  }

  private static handleSort(input: DataTransformerInput): DataTransformerOutput {
    if (!Array.isArray(input.input)) {
      throw new Error('Sort operation requires array input');
    }

    const result = [...input.input]; // Create a copy
    const sortOrder = input.sortOrder ?? 'asc';

    if (input.sortFn) {
      // Use custom comparator
      const fn = this.createFunction(input.sortFn, 2);
      result.sort(fn);
    } else if (input.sortBy) {
      // Sort by path/property
      result.sort((a, b) => {
        const aVal = this.getValueByPath(a, input.sortBy!);
        const bVal = this.getValueByPath(b, input.sortBy!);

        if (aVal === bVal) return 0;
        const comparison = aVal < bVal ? -1 : 1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      // Default sort
      result.sort((a, b) => {
        if (a === b) return 0;
        const comparison = a < b ? -1 : 1;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return {
      result,
      operation: 'sort',
      metadata: {
        inputType: 'array',
        outputType: 'array',
        itemCount: input.input.length,
        transformedCount: result.length,
      },
    };
  }

  private static handleGroup(input: DataTransformerInput): DataTransformerOutput {
    if (!Array.isArray(input.input)) {
      throw new Error('Group operation requires array input');
    }
    if (!input.groupBy) {
      throw new Error('Group operation requires groupBy parameter');
    }

    const result: Record<string, any[]> = {};

    for (const item of input.input) {
      const key = String(this.getValueByPath(item, input.groupBy));
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }

    return {
      result,
      operation: 'group',
      metadata: {
        inputType: 'array',
        outputType: 'object',
        itemCount: input.input.length,
        transformedCount: Object.keys(result).length,
      },
    };
  }

  private static handleUnique(input: DataTransformerInput): DataTransformerOutput {
    if (!Array.isArray(input.input)) {
      throw new Error('Unique operation requires array input');
    }

    let result: any[];

    if (input.uniqueBy) {
      // Unique by path/property
      const seen = new Set();
      result = input.input.filter((item) => {
        const value = this.getValueByPath(item, input.uniqueBy!);
        const key = JSON.stringify(value);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    } else {
      // Simple unique
      const seen = new Set();
      result = input.input.filter((item) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }

    return {
      result,
      operation: 'unique',
      metadata: {
        inputType: 'array',
        outputType: 'array',
        itemCount: input.input.length,
        transformedCount: result.length,
      },
    };
  }

  private static handleMerge(input: DataTransformerInput): DataTransformerOutput {
    if (!input.mergeWith) {
      throw new Error('Merge operation requires mergeWith parameter');
    }

    const strategy = input.mergeStrategy ?? 'shallow';
    let result: any;

    switch (strategy) {
      case 'shallow':
        if (Array.isArray(input.input) && Array.isArray(input.mergeWith)) {
          result = [...input.input, ...input.mergeWith];
        } else if (typeof input.input === 'object' && typeof input.mergeWith === 'object') {
          result = { ...input.input, ...input.mergeWith };
        } else {
          throw new Error('Shallow merge requires both inputs to be arrays or objects');
        }
        break;

      case 'deep':
        if (typeof input.input !== 'object' || typeof input.mergeWith !== 'object') {
          throw new Error('Deep merge requires both inputs to be objects');
        }
        result = this.deepMerge(input.input, input.mergeWith);
        break;

      case 'concat':
        if (!Array.isArray(input.input) || !Array.isArray(input.mergeWith)) {
          throw new Error('Concat merge requires both inputs to be arrays');
        }
        result = input.input.concat(input.mergeWith);
        break;

      default:
        throw new Error(`Unknown merge strategy: ${strategy}`);
    }

    return {
      result,
      operation: 'merge',
      metadata: {
        inputType: this.getType(input.input),
        outputType: this.getType(result),
      },
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  private static createFunction(fnString: string, paramCount: number = 1): (...args: any[]) => any {
    try {
      // Support both arrow functions and function expressions
      // For single param: "x => x * 2" or "function(x) { return x * 2; }"
      // For multiple params: "(a, b) => a + b" or "function(a, b) { return a + b; }"

      if (fnString.includes('=>')) {
        // Arrow function
        return eval(`(${fnString})`) as (...args: any[]) => any;
      } else if (fnString.includes('function')) {
        // Function expression
        return eval(`(${fnString})`) as (...args: any[]) => any;
      } else {
        // Assume it's just the function body
        const params = paramCount === 1 ? 'x' : `a, b`;
        return eval(`((${params}) => ${fnString})`) as (...args: any[]) => any;
      }
    } catch (error) {
      throw new Error(`Invalid function: ${fnString}. Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static deepMerge(target: any, source: any): any {
    if (Array.isArray(target) && Array.isArray(source)) {
      return [...target, ...source];
    }

    if (typeof target !== 'object' || typeof source !== 'object') {
      return source;
    }

    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  private static getType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }
}
