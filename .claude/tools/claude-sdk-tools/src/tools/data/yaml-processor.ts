/**
 * @claude-sdk/tools - YAML Processor Tool
 * Parse, stringify, merge, and validate YAML data
 */

import { z } from 'zod';
import * as yaml from 'js-yaml';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError, ToolError } from '../../types/errors.js';
import type { ToolResult, ToolContext, ToolDefinition } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const YamlProcessorSchema = z.object({
  operation: z.enum([
    'parse',
    'stringify',
    'merge',
    'validate',
  ]),
  data: z.unknown(),
  options: z
    .object({
      // Parse options
      filename: z.string().optional(),
      onWarning: z.boolean().default(false),
      schema: z.enum(['FAILSAFE_SCHEMA', 'JSON_SCHEMA', 'CORE_SCHEMA', 'DEFAULT_SCHEMA']).default('DEFAULT_SCHEMA'),
      json: z.boolean().default(false),

      // Stringify options
      indent: z.number().default(2),
      noArrayIndent: z.boolean().default(false),
      skipInvalid: z.boolean().default(false),
      flowLevel: z.number().default(-1),
      sortKeys: z.boolean().default(false),
      lineWidth: z.number().default(80),
      noRefs: z.boolean().default(false),
      noCompatMode: z.boolean().default(false),
      condenseFlow: z.boolean().default(false),
      quotingType: z.enum(['single', 'double']).optional(),
      forceQuotes: z.boolean().default(false),

      // Merge options
      mergeWith: z.unknown().optional(),
      deepMerge: z.boolean().default(true),
      arrayMergeStrategy: z.enum(['replace', 'concat', 'union']).default('replace'),

      // Validate options
      validateSchema: z.unknown().optional(),

      // Multi-document support
      multiDocument: z.boolean().default(false),
    })
    .optional(),
});

export type YamlProcessorInput = z.infer<typeof YamlProcessorSchema>;

// ============================================================================
// Tool Definition
// ============================================================================

export const yamlProcessorTool: ToolDefinition<YamlProcessorInput, unknown> = {
  name: 'yaml_processor',
  description: 'Process YAML data with operations: parse, stringify, merge, validate (supports multi-document YAML)',
  version: '1.0.0',
  category: 'data',
  schema: YamlProcessorSchema as any, // Type assertion to work around optional field defaults
};

// ============================================================================
// Helper Functions
// ============================================================================

function getYamlSchema(schemaName: string): yaml.Schema {
  switch (schemaName) {
    case 'FAILSAFE_SCHEMA':
      return yaml.FAILSAFE_SCHEMA;
    case 'JSON_SCHEMA':
      return yaml.JSON_SCHEMA;
    case 'CORE_SCHEMA':
      return yaml.CORE_SCHEMA;
    case 'DEFAULT_SCHEMA':
    default:
      return yaml.DEFAULT_SCHEMA;
  }
}

function deepMergeObjects(
  target: unknown,
  source: unknown,
  arrayStrategy: 'replace' | 'concat' | 'union'
): unknown {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source;
  }

  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      result[key] = deepMergeObjects(targetValue, sourceValue, arrayStrategy);
    } else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      switch (arrayStrategy) {
        case 'concat':
          result[key] = [...targetValue, ...sourceValue];
          break;
        case 'union':
          result[key] = [...new Set([...targetValue, ...sourceValue])];
          break;
        case 'replace':
        default:
          result[key] = sourceValue;
          break;
      }
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

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleParse(
  input: YamlProcessorInput,
  _context: ToolContext
): Promise<unknown> {
  try {
    const yamlString = typeof input.data === 'string' ? input.data : String(input.data);

    const schema = getYamlSchema(input.options?.schema ?? 'DEFAULT_SCHEMA');

    if (input.options?.multiDocument) {
      // Parse all documents
      const documents = yaml.loadAll(yamlString, undefined, {
        filename: input.options?.filename,
        schema,
        json: input.options?.json ?? false,
      });
      return documents;
    } else {
      // Parse single document
      const result = yaml.load(yamlString, {
        filename: input.options?.filename,
        schema,
        json: input.options?.json ?? false,
      });
      return result;
    }
  } catch (error) {
    throw new ValidationError(
      `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
      ['data'],
      input.data,
      'valid YAML string'
    );
  }
}

async function handleStringify(
  input: YamlProcessorInput,
  _context: ToolContext
): Promise<string> {
  try {
    const schema = getYamlSchema(input.options?.schema ?? 'DEFAULT_SCHEMA');

    const dumpOptions: yaml.DumpOptions = {
      indent: input.options?.indent ?? 2,
      noArrayIndent: input.options?.noArrayIndent ?? false,
      skipInvalid: input.options?.skipInvalid ?? false,
      flowLevel: input.options?.flowLevel ?? -1,
      sortKeys: input.options?.sortKeys ?? false,
      lineWidth: input.options?.lineWidth ?? 80,
      noRefs: input.options?.noRefs ?? false,
      noCompatMode: input.options?.noCompatMode ?? false,
      condenseFlow: input.options?.condenseFlow ?? false,
      schema,
    };

    if (input.options?.quotingType) {
      dumpOptions.quotingType = input.options.quotingType === 'single' ? "'" : '"';
    }

    if (input.options?.forceQuotes) {
      dumpOptions.forceQuotes = true;
    }

    if (Array.isArray(input.data) && input.options?.multiDocument) {
      // Dump multiple documents
      const documents = input.data.map((doc) => yaml.dump(doc, dumpOptions));
      return documents.join('---\n');
    } else {
      // Dump single document
      return yaml.dump(input.data, dumpOptions);
    }
  } catch (error) {
    throw new ToolError(
      `Failed to stringify YAML: ${error instanceof Error ? error.message : String(error)}`,
      'STRINGIFY_ERROR'
    );
  }
}

async function handleMerge(
  input: YamlProcessorInput,
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
      return deepMergeObjects(
        input.data,
        input.options.mergeWith,
        input.options?.arrayMergeStrategy ?? 'replace'
      );
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
  input: YamlProcessorInput,
  _context: ToolContext
): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    // Validate that the data can be stringified and parsed back
    const yamlString = typeof input.data === 'string' ? input.data : yaml.dump(input.data);

    try {
      yaml.load(yamlString);
      return {
        valid: true,
        errors: [],
      };
    } catch (parseError) {
      return {
        valid: false,
        errors: [parseError instanceof Error ? parseError.message : String(parseError)],
      };
    }
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

export async function executeYamlProcessor(
  input: YamlProcessorInput,
  context: ToolContext
): Promise<ToolResult<unknown>> {
  return wrapExecution('yaml_processor', async (input, context) => {
    switch (input.operation) {
      case 'parse':
        return handleParse(input, context);
      case 'stringify':
        return handleStringify(input, context);
      case 'merge':
        return handleMerge(input, context);
      case 'validate':
        return handleValidate(input, context);
      default:
        throw new ValidationError(
          `Unknown operation: ${(input as { operation: string }).operation}`,
          ['operation'],
          (input as { operation: string }).operation,
          'parse|stringify|merge|validate'
        );
    }
  }, input, context);
}
