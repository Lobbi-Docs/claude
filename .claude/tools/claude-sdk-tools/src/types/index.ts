/**
 * @claude-sdk/tools - Core Type Definitions
 * Foundational types for all custom tools in the Claude Agent SDK
 */

import { z } from 'zod';

// ============================================================================
// Result Types
// ============================================================================

/**
 * Generic result wrapper for all tool operations
 * Provides consistent success/error handling across all tools
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: ToolErrorInfo;
  metadata?: ToolMetadata;
}

export interface ToolErrorInfo {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ToolMetadata {
  executionTime?: number;
  timestamp?: string;
  requestId?: string;
  cached?: boolean;
  retryCount?: number;
  [key: string]: unknown;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Execution context passed to every tool operation
 * Contains runtime information and configuration
 */
export interface ToolContext {
  toolName: string;
  timestamp: Date;
  requestId: string;
  metadata?: Record<string, unknown>;
  logger?: ToolLogger;
  cache?: ToolCache;
}

export interface ToolLogger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export interface ToolCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Base configuration for all tools
 */
export interface ToolConfig {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Enable caching (default: false) */
  cache?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Log level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  /** Enable validation (default: true) */
  validate?: boolean;
}

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * Tool definition metadata
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  schema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  config?: ToolConfig;
  tags?: string[];
}

export type ToolCategory =
  | 'core'
  | 'api'
  | 'data'
  | 'system'
  | 'security'
  | 'testing'
  | 'developer';

/**
 * Tool execution function signature
 */
export type ToolExecutor<TInput, TOutput> = (
  input: TInput,
  context: ToolContext
) => Promise<ToolResult<TOutput>>;

// ============================================================================
// MCP Integration Types
// ============================================================================

/**
 * MCP tool registration options
 */
export interface MCPToolOptions {
  /** Server name for namespacing */
  serverName: string;
  /** Enable streaming responses */
  streaming?: boolean;
  /** Maximum concurrent executions */
  maxConcurrency?: number;
}

/**
 * MCP server configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  tools: ToolDefinition[];
  options?: MCPToolOptions;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationError {
  path: string[];
  message: string;
  code: string;
}

// ============================================================================
// Zod Schema Helpers
// ============================================================================

export const ToolResultSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
        stack: z.string().optional(),
      })
      .optional(),
    metadata: z
      .object({
        executionTime: z.number().optional(),
        timestamp: z.string().optional(),
        requestId: z.string().optional(),
        cached: z.boolean().optional(),
        retryCount: z.number().optional(),
      })
      .passthrough()
      .optional(),
  });

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type AsyncFunction<TInput = unknown, TOutput = unknown> = (
  input: TInput
) => Promise<TOutput>;
