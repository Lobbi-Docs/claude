/**
 * @claude-sdk/tools - CSV Processor Tool
 * Parse, stringify, filter, sort, select columns, and transform CSV data
 */

import { z } from 'zod';
import Papa from 'papaparse';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError, ToolError } from '../../types/errors.js';
import type { ToolResult, ToolContext, ToolDefinition } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const CsvProcessorSchema = z.object({
  operation: z.enum([
    'parse',
    'stringify',
    'filter',
    'sort',
    'select_columns',
    'transform',
  ]),
  data: z.unknown(),
  options: z
    .object({
      // Parse options
      delimiter: z.string().optional().default(','),
      newline: z.string().optional(),
      quoteChar: z.string().optional().default('"'),
      escapeChar: z.string().optional().default('"'),
      header: z.boolean().optional().default(true),
      dynamicTyping: z.boolean().optional().default(true),
      skipEmptyLines: z.boolean().optional().default(true),
      comments: z.string().optional(),

      // Stringify options
      quotes: z.boolean().optional().default(true),
      quoteCharStrigify: z.string().optional().default('"'),
      escapeCharStringify: z.string().optional().default('"'),
      delimiterStringify: z.string().optional().default(','),
      headerStringify: z.boolean().optional().default(true),
      newlineStringify: z.string().optional().default('\n'),

      // Filter options
      filterFn: z.string().optional(), // Serialized predicate
      filterColumn: z.string().optional(),
      filterValue: z.unknown().optional(),
      filterOperator: z.enum(['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'startsWith', 'endsWith']).optional(),

      // Sort options
      sortColumn: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),

      // Select columns
      columns: z.array(z.string()).optional(),

      // Transform options
      transformColumn: z.string().optional(),
      transformFn: z.string().optional(),
    })
    .optional(),
});

export type CsvProcessorInput = z.infer<typeof CsvProcessorSchema>;

// ============================================================================
// Tool Definition
// ============================================================================

export const csvProcessorTool: ToolDefinition<CsvProcessorInput, unknown> = {
  name: 'csv_processor',
  description: 'Process CSV data with operations: parse, stringify, filter, sort, select_columns, transform',
  version: '1.0.0',
  category: 'data',
  schema: CsvProcessorSchema as any, // Type assertion to work around optional field defaults
};

// ============================================================================
// Helper Functions
// ============================================================================

function applyFilter(
  row: Record<string, unknown>,
  column: string,
  value: unknown,
  operator: string
): boolean {
  const cellValue = row[column];

  switch (operator) {
    case 'eq':
      return cellValue === value;
    case 'ne':
      return cellValue !== value;
    case 'gt':
      return Number(cellValue) > Number(value);
    case 'lt':
      return Number(cellValue) < Number(value);
    case 'gte':
      return Number(cellValue) >= Number(value);
    case 'lte':
      return Number(cellValue) <= Number(value);
    case 'contains':
      return String(cellValue).includes(String(value));
    case 'startsWith':
      return String(cellValue).startsWith(String(value));
    case 'endsWith':
      return String(cellValue).endsWith(String(value));
    default:
      return true;
  }
}

function compareValues(a: unknown, b: unknown, order: 'asc' | 'desc'): number {
  let comparison = 0;

  if (typeof a === 'number' && typeof b === 'number') {
    comparison = a - b;
  } else if (typeof a === 'string' && typeof b === 'string') {
    comparison = a.localeCompare(b);
  } else {
    comparison = String(a).localeCompare(String(b));
  }

  return order === 'asc' ? comparison : -comparison;
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleParse(
  input: CsvProcessorInput,
  _context: ToolContext
): Promise<{ data: unknown[]; meta: unknown }> {
  try {
    const csvString = typeof input.data === 'string' ? input.data : String(input.data);

    const config: Papa.ParseConfig<Record<string, unknown>> & { download?: false; worker?: false } = {
      delimiter: input.options?.delimiter ?? ',',
      newline: input.options?.newline as '\r' | '\n' | '\r\n' | undefined,
      quoteChar: input.options?.quoteChar ?? '"',
      escapeChar: input.options?.escapeChar ?? '"',
      header: input.options?.header ?? true,
      dynamicTyping: input.options?.dynamicTyping ?? true,
      skipEmptyLines: input.options?.skipEmptyLines ?? true,
      comments: input.options?.comments,
      download: false,
      worker: false,
    };

    const result = Papa.parse<Record<string, unknown>>(csvString, config);

    if (result.errors && result.errors.length > 0) {
      throw new ToolError(
        `CSV parsing encountered errors`,
        'PARSE_ERROR',
        { errors: result.errors }
      );
    }

    return {
      data: (result.data ?? []) as unknown[],
      meta: result.meta ?? {},
    };
  } catch (error) {
    throw new ValidationError(
      `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`,
      ['data'],
      input.data,
      'valid CSV string'
    );
  }
}

async function handleStringify(
  input: CsvProcessorInput,
  _context: ToolContext
): Promise<string> {
  try {
    if (!Array.isArray(input.data)) {
      throw new ValidationError(
        'Stringify operation requires array data',
        ['data'],
        typeof input.data,
        'array'
      );
    }

    const result = Papa.unparse(input.data, {
      quotes: input.options?.quotes ?? true,
      quoteChar: input.options?.quoteCharStrigify ?? '"',
      escapeChar: input.options?.escapeCharStringify ?? '"',
      delimiter: input.options?.delimiterStringify ?? ',',
      header: input.options?.headerStringify ?? true,
      newline: input.options?.newlineStringify ?? '\n',
    });

    return result;
  } catch (error) {
    throw new ToolError(
      `Failed to stringify CSV: ${error instanceof Error ? error.message : String(error)}`,
      'STRINGIFY_ERROR'
    );
  }
}

async function handleFilter(
  input: CsvProcessorInput,
  _context: ToolContext
): Promise<unknown[]> {
  if (!Array.isArray(input.data)) {
    throw new ValidationError(
      'Filter operation requires array data',
      ['data'],
      typeof input.data,
      'array'
    );
  }

  if (!input.options?.filterColumn || input.options?.filterValue === undefined) {
    throw new ValidationError(
      'Filter operation requires filterColumn and filterValue in options',
      ['options'],
      input.options,
      'filterColumn and filterValue'
    );
  }

  try {
    const filtered = input.data.filter((row) => {
      if (typeof row !== 'object' || row === null) return false;

      return applyFilter(
        row as Record<string, unknown>,
        input.options!.filterColumn!,
        input.options!.filterValue,
        input.options?.filterOperator ?? 'eq'
      );
    });

    return filtered;
  } catch (error) {
    throw new ToolError(
      `Filter failed: ${error instanceof Error ? error.message : String(error)}`,
      'FILTER_ERROR'
    );
  }
}

async function handleSort(
  input: CsvProcessorInput,
  _context: ToolContext
): Promise<unknown[]> {
  if (!Array.isArray(input.data)) {
    throw new ValidationError(
      'Sort operation requires array data',
      ['data'],
      typeof input.data,
      'array'
    );
  }

  if (!input.options?.sortColumn) {
    throw new ValidationError(
      'Sort operation requires sortColumn in options',
      ['options', 'sortColumn'],
      undefined,
      'column name'
    );
  }

  try {
    const sorted = [...input.data].sort((a, b) => {
      if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
        return 0;
      }

      const aVal = (a as Record<string, unknown>)[input.options!.sortColumn!];
      const bVal = (b as Record<string, unknown>)[input.options!.sortColumn!];

      return compareValues(aVal, bVal, input.options?.sortOrder ?? 'asc');
    });

    return sorted;
  } catch (error) {
    throw new ToolError(
      `Sort failed: ${error instanceof Error ? error.message : String(error)}`,
      'SORT_ERROR'
    );
  }
}

async function handleSelectColumns(
  input: CsvProcessorInput,
  _context: ToolContext
): Promise<unknown[]> {
  if (!Array.isArray(input.data)) {
    throw new ValidationError(
      'Select columns operation requires array data',
      ['data'],
      typeof input.data,
      'array'
    );
  }

  if (!input.options?.columns || input.options.columns.length === 0) {
    throw new ValidationError(
      'Select columns operation requires columns array in options',
      ['options', 'columns'],
      input.options?.columns,
      'array of column names'
    );
  }

  try {
    const selected = input.data.map((row) => {
      if (typeof row !== 'object' || row === null) return {};

      const result: Record<string, unknown> = {};
      for (const col of input.options!.columns!) {
        result[col] = (row as Record<string, unknown>)[col];
      }
      return result;
    });

    return selected;
  } catch (error) {
    throw new ToolError(
      `Select columns failed: ${error instanceof Error ? error.message : String(error)}`,
      'SELECT_ERROR'
    );
  }
}

async function handleTransform(
  input: CsvProcessorInput,
  _context: ToolContext
): Promise<unknown[]> {
  if (!Array.isArray(input.data)) {
    throw new ValidationError(
      'Transform operation requires array data',
      ['data'],
      typeof input.data,
      'array'
    );
  }

  try {
    // In production, implement safe transform function evaluation
    // For now, return data as-is
    return input.data;
  } catch (error) {
    throw new ToolError(
      `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
      'TRANSFORM_ERROR'
    );
  }
}

// ============================================================================
// Tool Executor
// ============================================================================

export async function executeCsvProcessor(
  input: CsvProcessorInput,
  context: ToolContext
): Promise<ToolResult<unknown>> {
  return wrapExecution('csv_processor', async (input, context) => {
    switch (input.operation) {
      case 'parse':
        return handleParse(input, context);
      case 'stringify':
        return handleStringify(input, context);
      case 'filter':
        return handleFilter(input, context);
      case 'sort':
        return handleSort(input, context);
      case 'select_columns':
        return handleSelectColumns(input, context);
      case 'transform':
        return handleTransform(input, context);
      default:
        throw new ValidationError(
          `Unknown operation: ${(input as { operation: string }).operation}`,
          ['operation'],
          (input as { operation: string }).operation,
          'parse|stringify|filter|sort|select_columns|transform'
        );
    }
  }, input, context);
}
