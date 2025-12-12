/**
 * @claude-sdk/tools - EnvManagerTool
 * Environment variable management with in-memory operations
 */

import { z } from 'zod';
import { success, failure } from '../../utils/index.js';
import { ConfigurationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const EnvManagerSchema = z.object({
  operation: z.enum(['get', 'set', 'list', 'has', 'delete', 'parse']),
  key: z.string().optional(),
  value: z.string().optional(),
  defaultValue: z.string().optional(),
  envContent: z.string().optional(), // For parsing .env file content
  typeCoerce: z.enum(['string', 'number', 'boolean']).optional(),
});

export type EnvManagerInput = z.infer<typeof EnvManagerSchema>;

export interface EnvManagerOutput {
  operation: string;
  key?: string;
  value?: string | number | boolean | null;
  exists?: boolean;
  variables?: Record<string, string>;
  parsed?: Record<string, string>;
}

// ============================================================================
// EnvManagerTool Implementation
// ============================================================================

export class EnvManagerTool {
  private static env: Map<string, string> = new Map();

  /**
   * Execute environment variable management operations
   */
  static async execute(
    input: EnvManagerInput,
    context: ToolContext
  ): Promise<ToolResult<EnvManagerOutput>> {
    try {
      context.logger?.debug(`EnvManager: ${input.operation}`, { key: input.key });

      switch (input.operation) {
        case 'get':
          return this.get(input, context);
        case 'set':
          return this.set(input, context);
        case 'list':
          return this.list(input, context);
        case 'has':
          return this.has(input, context);
        case 'delete':
          return this.delete(input, context);
        case 'parse':
          return this.parse(input, context);
        default:
          throw new ConfigurationError(
            `Unknown operation: ${input.operation}`,
            'operation',
            input.operation
          );
      }
    } catch (error) {
      context.logger?.error('EnvManager failed', error);
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get environment variable value with optional default and type coercion
   */
  private static async get(
    input: EnvManagerInput,
    context: ToolContext
  ): Promise<ToolResult<EnvManagerOutput>> {
    if (!input.key) {
      throw new ConfigurationError('Key is required for get operation', 'key', undefined);
    }

    const value = this.env.get(input.key) ?? process.env[input.key] ?? input.defaultValue;

    if (value === undefined) {
      return success({
        operation: 'get',
        key: input.key,
        value: null,
        exists: false,
      });
    }

    // Type coercion
    let coercedValue: string | number | boolean = value;
    if (input.typeCoerce) {
      coercedValue = this.coerceType(value, input.typeCoerce);
    }

    context.logger?.debug(`EnvManager: Retrieved ${input.key}`, { value: coercedValue });

    return success({
      operation: 'get',
      key: input.key,
      value: coercedValue,
      exists: true,
    });
  }

  /**
   * Set environment variable (in-memory only for security)
   */
  private static async set(
    input: EnvManagerInput,
    context: ToolContext
  ): Promise<ToolResult<EnvManagerOutput>> {
    if (!input.key) {
      throw new ConfigurationError('Key is required for set operation', 'key', undefined);
    }
    if (input.value === undefined) {
      throw new ConfigurationError('Value is required for set operation', 'value', undefined);
    }

    this.env.set(input.key, input.value);
    context.logger?.debug(`EnvManager: Set ${input.key}`);

    return success({
      operation: 'set',
      key: input.key,
      value: input.value,
    });
  }

  /**
   * List all environment variables (in-memory only)
   */
  private static async list(
    input: EnvManagerInput,
    context: ToolContext
  ): Promise<ToolResult<EnvManagerOutput>> {
    void input; // Mark as used
    const variables = Object.fromEntries(this.env);
    context.logger?.debug(`EnvManager: Listed ${Object.keys(variables).length} variables`);

    return success({
      operation: 'list',
      variables,
    });
  }

  /**
   * Check if environment variable exists
   */
  private static async has(
    input: EnvManagerInput,
    context: ToolContext
  ): Promise<ToolResult<EnvManagerOutput>> {
    if (!input.key) {
      throw new ConfigurationError('Key is required for has operation', 'key', undefined);
    }

    const exists = this.env.has(input.key) || input.key in process.env;
    context.logger?.debug(`EnvManager: Check ${input.key}`, { exists });

    return success({
      operation: 'has',
      key: input.key,
      exists,
    });
  }

  /**
   * Delete environment variable (in-memory only)
   */
  private static async delete(
    input: EnvManagerInput,
    context: ToolContext
  ): Promise<ToolResult<EnvManagerOutput>> {
    if (!input.key) {
      throw new ConfigurationError('Key is required for delete operation', 'key', undefined);
    }

    const existed = this.env.has(input.key);
    this.env.delete(input.key);
    context.logger?.debug(`EnvManager: Deleted ${input.key}`, { existed });

    return success({
      operation: 'delete',
      key: input.key,
      exists: existed,
    });
  }

  /**
   * Parse .env file content
   */
  private static async parse(
    input: EnvManagerInput,
    context: ToolContext
  ): Promise<ToolResult<EnvManagerOutput>> {
    if (!input.envContent) {
      throw new ConfigurationError(
        'envContent is required for parse operation',
        'envContent',
        undefined
      );
    }

    const parsed: Record<string, string> = {};
    const lines = input.envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Remove quotes if present
        let cleanValue = value.trim();
        if (
          (cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
          (cleanValue.startsWith("'") && cleanValue.endsWith("'"))
        ) {
          cleanValue = cleanValue.slice(1, -1);
        }
        parsed[key] = cleanValue;
      }
    }

    // Store in memory
    for (const [key, value] of Object.entries(parsed)) {
      this.env.set(key, value);
    }

    context.logger?.debug(`EnvManager: Parsed ${Object.keys(parsed).length} variables`);

    return success({
      operation: 'parse',
      parsed,
    });
  }

  /**
   * Coerce string value to specified type
   */
  private static coerceType(value: string, type: 'string' | 'number' | 'boolean'): string | number | boolean {
    switch (type) {
      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          throw new ConfigurationError(
            `Cannot coerce "${value}" to number`,
            'typeCoerce',
            value
          );
        }
        return num;
      }
      case 'boolean': {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
        throw new ConfigurationError(
          `Cannot coerce "${value}" to boolean`,
          'typeCoerce',
          value
        );
      }
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Clear all in-memory environment variables
   */
  static clear(): void {
    this.env.clear();
  }
}
