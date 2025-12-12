/**
 * @claude-sdk/tools - Utility Functions
 * Shared utilities for all custom tools
 */

import { ToolError, TimeoutError } from '../types/errors.js';
import type { ToolResult, ToolContext, ToolMetadata, ToolLogger } from '../types/index.js';

// ============================================================================
// Result Helpers
// ============================================================================

/**
 * Create a successful result
 */
export function success<T>(data: T, metadata?: ToolMetadata): ToolResult<T> {
  return {
    success: true,
    data,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a failure result
 */
export function failure<T = never>(
  error: ToolError | Error | string,
  metadata?: ToolMetadata
): ToolResult<T> {
  const errorInfo =
    error instanceof ToolError
      ? {
          code: error.code,
          message: error.message,
          details: error.details,
          stack: error.stack,
        }
      : error instanceof Error
        ? {
            code: 'UNKNOWN_ERROR',
            message: error.message,
            stack: error.stack,
          }
        : {
            code: 'UNKNOWN_ERROR',
            message: String(error),
          };

  return {
    success: false,
    error: errorInfo,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Context Helpers
// ============================================================================

/**
 * Create a new tool context
 */
export function createContext(
  toolName: string,
  options?: Partial<ToolContext>
): ToolContext {
  return {
    toolName,
    timestamp: new Date(),
    requestId: generateRequestId(),
    ...options,
  };
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================================
// Execution Helpers
// ============================================================================

/**
 * Execute an async function with timeout
 */
export async function withTimeout<T>(
  operation: string,
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () =>
          reject(new TimeoutError(operation, timeout))
        );
      }),
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: 'linear' | 'exponential';
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 'exponential', shouldRetry } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === retries) break;
      if (shouldRetry && !shouldRetry(lastError)) break;

      const waitTime =
        backoff === 'exponential' ? delay * Math.pow(2, attempt) : delay * (attempt + 1);

      await sleep(waitTime);
    }
  }

  throw lastError;
}

/**
 * Wrap an async function with error handling
 */
export async function wrapExecution<TInput, TOutput>(
  toolName: string,
  fn: (input: TInput, context: ToolContext) => Promise<TOutput>,
  input: TInput,
  context?: Partial<ToolContext>
): Promise<ToolResult<TOutput>> {
  const ctx = createContext(toolName, context);
  const startTime = Date.now();

  try {
    const data = await fn(input, ctx);
    return success(data, {
      executionTime: Date.now() - startTime,
      requestId: ctx.requestId,
    });
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)), {
      executionTime: Date.now() - startTime,
      requestId: ctx.requestId,
    });
  }
}

// ============================================================================
// Data Helpers
// ============================================================================

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  const result = { ...target };

  for (const source of sources) {
    if (!source) continue;

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        isPlainObject(sourceValue) &&
        isPlainObject(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else if (sourceValue !== undefined) {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Check if value is a plain object
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Pick specific keys from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

// ============================================================================
// String Helpers
// ============================================================================

/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * Convert string to PascalCase
 */
export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .replace(/^_/, '')
    .toLowerCase();
}

/**
 * Convert string to kebab-case
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .replace(/[_\s]+/g, '-')
    .replace(/^-/, '')
    .toLowerCase();
}

// ============================================================================
// Time Helpers
// ============================================================================

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format duration in human readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

// ============================================================================
// Logger Factory
// ============================================================================

/**
 * Create a simple console logger
 */
export function createLogger(prefix: string, level: string = 'info'): ToolLogger {
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = levels.indexOf(level);

  const shouldLog = (msgLevel: string) =>
    levels.indexOf(msgLevel) >= currentLevel;

  return {
    debug: (message, data) => {
      if (shouldLog('debug')) console.debug(`[${prefix}] ${message}`, data ?? '');
    },
    info: (message, data) => {
      if (shouldLog('info')) console.info(`[${prefix}] ${message}`, data ?? '');
    },
    warn: (message, data) => {
      if (shouldLog('warn')) console.warn(`[${prefix}] ${message}`, data ?? '');
    },
    error: (message, data) => {
      if (shouldLog('error')) console.error(`[${prefix}] ${message}`, data ?? '');
    },
  };
}

// ============================================================================
// UUID Helper
// ============================================================================

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  // Use crypto.randomUUID if available (Node 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
