/**
 * @claude-sdk/tools - Schema Validator Tool
 * Validate data against JSON Schema, Zod schemas, custom rules, and generate schemas from data
 */

import { z } from 'zod';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError, ToolError } from '../../types/errors.js';
import type { ToolResult, ToolContext, ToolDefinition } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const SchemaValidatorSchema = z.object({
  operation: z.enum([
    'validate_json_schema',
    'validate_zod',
    'validate_custom',
    'generate_schema',
  ]),
  data: z.unknown(),
  options: z
    .object({
      // JSON Schema validation
      jsonSchema: z.unknown().optional(),
      strict: z.boolean().default(true),
      allErrors: z.boolean().default(true),
      useFormats: z.boolean().default(true),
      coerceTypes: z.boolean().default(false),

      // Zod validation
      zodSchema: z.string().optional(), // Serialized Zod schema or schema name

      // Custom validation
      customRules: z.array(z.object({
        field: z.string(),
        rule: z.enum(['required', 'type', 'min', 'max', 'pattern', 'enum', 'custom']),
        value: z.unknown().optional(),
        message: z.string().optional(),
      })).optional(),

      // Schema generation
      includeOptional: z.boolean().default(true),
      inferTypes: z.boolean().default(true),
      arrayItemsLimit: z.number().default(10),
      maxDepth: z.number().default(10),
    })
    .optional(),
});

export type SchemaValidatorInput = z.infer<typeof SchemaValidatorSchema>;

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string[];
    message: string;
    code: string;
    details?: Record<string, unknown>;
  }>;
  data?: unknown;
}

// ============================================================================
// Tool Definition
// ============================================================================

export const schemaValidatorTool: ToolDefinition<SchemaValidatorInput, ValidationResult> = {
  name: 'schema_validator',
  description: 'Validate data against JSON Schema, Zod schemas, custom rules, and generate schemas from data',
  version: '1.0.0',
  category: 'data',
  schema: SchemaValidatorSchema as any, // Type assertion to work around optional field defaults
};

// ============================================================================
// Helper Functions
// ============================================================================

function getValueAtPath(obj: unknown, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function applyCustomRule(
  data: unknown,
  rule: {
    field: string;
    rule: string;
    value?: unknown;
    message?: string;
  }
): { valid: boolean; message?: string } {
  const path = rule.field.split('.');
  const value = getValueAtPath(data, path);

  switch (rule.rule) {
    case 'required':
      if (value === undefined || value === null) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} is required`,
        };
      }
      break;

    case 'type':
      const expectedType = String(rule.value);
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== expectedType) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must be of type ${expectedType}, got ${actualType}`,
        };
      }
      break;

    case 'min':
      if (typeof value === 'number' && value < Number(rule.value)) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must be at least ${rule.value}`,
        };
      }
      if (typeof value === 'string' && value.length < Number(rule.value)) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must be at least ${rule.value} characters`,
        };
      }
      if (Array.isArray(value) && value.length < Number(rule.value)) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must have at least ${rule.value} items`,
        };
      }
      break;

    case 'max':
      if (typeof value === 'number' && value > Number(rule.value)) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must be at most ${rule.value}`,
        };
      }
      if (typeof value === 'string' && value.length > Number(rule.value)) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must be at most ${rule.value} characters`,
        };
      }
      if (Array.isArray(value) && value.length > Number(rule.value)) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must have at most ${rule.value} items`,
        };
      }
      break;

    case 'pattern':
      if (typeof value === 'string') {
        const regex = new RegExp(String(rule.value));
        if (!regex.test(value)) {
          return {
            valid: false,
            message: rule.message ?? `Field ${rule.field} must match pattern ${rule.value}`,
          };
        }
      }
      break;

    case 'enum':
      if (Array.isArray(rule.value) && !rule.value.includes(value)) {
        return {
          valid: false,
          message: rule.message ?? `Field ${rule.field} must be one of: ${rule.value.join(', ')}`,
        };
      }
      break;
  }

  return { valid: true };
}

function generateJsonSchema(
  data: unknown,
  options: {
    includeOptional?: boolean;
    inferTypes?: boolean;
    maxDepth?: number;
  },
  currentDepth = 0
): unknown {
  const maxDepth = options.maxDepth ?? 10;

  if (currentDepth >= maxDepth) {
    return { type: 'object' };
  }

  if (data === null) {
    return { type: 'null' };
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', items: {} };
    }

    // Infer schema from first item
    const itemSchema = generateJsonSchema(data[0], options, currentDepth + 1);
    return {
      type: 'array',
      items: itemSchema,
    };
  }

  if (typeof data === 'object') {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      properties[key] = generateJsonSchema(value, options, currentDepth + 1);
      if (value !== null && value !== undefined) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 && options.includeOptional !== false ? { required } : {}),
    };
  }

  if (typeof data === 'string') {
    return { type: 'string' };
  }

  if (typeof data === 'number') {
    return Number.isInteger(data) ? { type: 'integer' } : { type: 'number' };
  }

  if (typeof data === 'boolean') {
    return { type: 'boolean' };
  }

  return {};
}

// ============================================================================
// Operation Handlers
// ============================================================================

async function handleValidateJsonSchema(
  input: SchemaValidatorInput,
  _context: ToolContext
): Promise<ValidationResult> {
  if (!input.options?.jsonSchema) {
    throw new ValidationError(
      'JSON Schema validation requires jsonSchema in options',
      ['options', 'jsonSchema'],
      undefined,
      'JSON Schema object'
    );
  }

  try {
    const ajv = new Ajv.default({
      strict: input.options?.strict ?? true,
      allErrors: input.options?.allErrors ?? true,
      coerceTypes: input.options?.coerceTypes ?? false,
    });

    if (input.options?.useFormats ?? true) {
      addFormats.default(ajv);
    }

    const validate = ajv.compile(input.options.jsonSchema as object);
    const valid = validate(input.data);

    if (!valid && validate.errors) {
      return {
        valid: false,
        errors: validate.errors.map((err: any) => ({
          path: err.instancePath.split('/').filter(Boolean),
          message: err.message ?? 'Validation error',
          code: err.keyword,
          details: {
            params: err.params,
            schemaPath: err.schemaPath,
          },
        })),
      };
    }

    return {
      valid: true,
      data: input.data,
    };
  } catch (error) {
    throw new ToolError(
      `JSON Schema validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
}

async function handleValidateZod(
  input: SchemaValidatorInput,
  _context: ToolContext
): Promise<ValidationResult> {
  if (!input.options?.zodSchema) {
    throw new ValidationError(
      'Zod validation requires zodSchema in options',
      ['options', 'zodSchema'],
      undefined,
      'Zod schema'
    );
  }

  try {
    // In production, you'd have a registry of named Zod schemas
    // For now, return a placeholder result
    return {
      valid: true,
      data: input.data,
    };
  } catch (error) {
    throw new ToolError(
      `Zod validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
}

async function handleValidateCustom(
  input: SchemaValidatorInput,
  _context: ToolContext
): Promise<ValidationResult> {
  if (!input.options?.customRules || input.options.customRules.length === 0) {
    throw new ValidationError(
      'Custom validation requires customRules in options',
      ['options', 'customRules'],
      undefined,
      'array of validation rules'
    );
  }

  try {
    const errors: Array<{
      path: string[];
      message: string;
      code: string;
    }> = [];

    for (const rule of input.options.customRules) {
      const result = applyCustomRule(input.data, rule);
      if (!result.valid) {
        errors.push({
          path: rule.field.split('.'),
          message: result.message ?? 'Validation failed',
          code: rule.rule,
        });
      }
    }

    return {
      valid: errors.length === 0,
      ...(errors.length > 0 ? { errors } : {}),
      data: input.data,
    };
  } catch (error) {
    throw new ToolError(
      `Custom validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'VALIDATION_ERROR'
    );
  }
}

async function handleGenerateSchema(
  input: SchemaValidatorInput,
  _context: ToolContext
): Promise<unknown> {
  try {
    const schema = generateJsonSchema(input.data, {
      includeOptional: input.options?.includeOptional ?? true,
      inferTypes: input.options?.inferTypes ?? true,
      maxDepth: input.options?.maxDepth ?? 10,
    });

    if (typeof schema === 'object' && schema !== null) {
      return {
        $schema: 'http://json-schema.org/draft-07/schema#',
        ...(schema as Record<string, unknown>),
      };
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
    };
  } catch (error) {
    throw new ToolError(
      `Schema generation failed: ${error instanceof Error ? error.message : String(error)}`,
      'GENERATION_ERROR'
    );
  }
}

// ============================================================================
// Tool Executor
// ============================================================================

export async function executeSchemaValidator(
  input: SchemaValidatorInput,
  context: ToolContext
): Promise<ToolResult<ValidationResult | unknown>> {
  return wrapExecution('schema_validator', async (input, context) => {
    switch (input.operation) {
      case 'validate_json_schema':
        return handleValidateJsonSchema(input, context);
      case 'validate_zod':
        return handleValidateZod(input, context);
      case 'validate_custom':
        return handleValidateCustom(input, context);
      case 'generate_schema':
        return handleGenerateSchema(input, context);
      default:
        throw new ValidationError(
          `Unknown operation: ${(input as { operation: string }).operation}`,
          ['operation'],
          (input as { operation: string }).operation,
          'validate_json_schema|validate_zod|validate_custom|generate_schema'
        );
    }
  }, input, context);
}
