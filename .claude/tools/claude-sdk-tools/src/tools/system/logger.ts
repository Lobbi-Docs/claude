/**
 * @claude-sdk/tools - LoggerTool
 * Structured logging with multiple levels and formats
 */

import { z } from 'zod';
import { success, failure } from '../../utils/index.js';
import { ConfigurationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const LoggerSchema = z.object({
  operation: z.enum(['log', 'clear', 'query', 'export', 'configure']),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  correlationId: z.string().optional(),
  context: z.record(z.unknown()).optional(),
  // Query options
  filterLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  filterCorrelationId: z.string().optional(),
  limit: z.number().min(1).max(1000).optional(),
  // Export options
  format: z.enum(['json', 'text']).optional(),
  // Configuration
  maxLogs: z.number().min(10).max(100000).optional(),
  minLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

export type LoggerInput = z.infer<typeof LoggerSchema>;

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: Record<string, unknown>;
  correlationId?: string;
  context?: Record<string, unknown>;
}

export interface LoggerOutput {
  operation: string;
  logged?: boolean;
  cleared?: boolean;
  count?: number;
  logs?: LogEntry[];
  exported?: string;
  config?: LoggerConfig;
}

export interface LoggerConfig {
  maxLogs: number;
  minLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// LoggerTool Implementation
// ============================================================================

export class LoggerTool {
  private static logs: LogEntry[] = [];
  private static config: LoggerConfig = {
    maxLogs: 1000,
    minLevel: 'debug',
  };

  private static readonly LEVEL_PRIORITY = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Execute logging operations
   */
  static async execute(
    input: LoggerInput,
    context: ToolContext
  ): Promise<ToolResult<LoggerOutput>> {
    try {
      switch (input.operation) {
        case 'log':
          return this.log(input, context);
        case 'clear':
          return this.clear(input, context);
        case 'query':
          return this.query(input, context);
        case 'export':
          return this.exportLogs(input, context);
        case 'configure':
          return this.configure(input, context);
        default:
          throw new ConfigurationError(
            `Unknown operation: ${input.operation}`,
            'operation',
            input.operation
          );
      }
    } catch (error) {
      context.logger?.error('Logger operation failed', error);
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Log a message
   */
  private static async log(
    input: LoggerInput,
    context: ToolContext
  ): Promise<ToolResult<LoggerOutput>> {
    if (!input.level) {
      throw new ConfigurationError('Level is required for log operation', 'level', undefined);
    }
    if (!input.message) {
      throw new ConfigurationError('Message is required for log operation', 'message', undefined);
    }

    // Check if level meets minimum threshold
    if (
      this.LEVEL_PRIORITY[input.level] < this.LEVEL_PRIORITY[this.config.minLevel]
    ) {
      // Skip logging
      return success({
        operation: 'log',
        logged: false,
      });
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: input.level,
      message: input.message,
      data: input.data,
      correlationId: input.correlationId ?? context.requestId,
      context: input.context,
    };

    this.logs.push(entry);

    // Enforce rotation (keep only maxLogs entries)
    if (this.logs.length > this.config.maxLogs) {
      const excess = this.logs.length - this.config.maxLogs;
      this.logs.splice(0, excess);
    }

    // Also log to context logger if available
    context.logger?.[input.level](input.message, input.data);

    return success({
      operation: 'log',
      logged: true,
      count: this.logs.length,
    });
  }

  /**
   * Clear logs
   */
  private static async clear(
    input: LoggerInput,
    context: ToolContext
  ): Promise<ToolResult<LoggerOutput>> {
    void input; // Mark as used
    const count = this.logs.length;
    this.logs = [];

    context.logger?.info(`Logger: Cleared ${count} logs`);

    return success({
      operation: 'clear',
      cleared: true,
      count: 0,
    });
  }

  /**
   * Query logs
   */
  private static async query(
    input: LoggerInput,
    context: ToolContext
  ): Promise<ToolResult<LoggerOutput>> {
    let filtered = [...this.logs];

    // Filter by level
    if (input.filterLevel) {
      const minPriority = this.LEVEL_PRIORITY[input.filterLevel];
      filtered = filtered.filter(
        (log) => this.LEVEL_PRIORITY[log.level] >= minPriority
      );
    }

    // Filter by correlation ID
    if (input.filterCorrelationId) {
      filtered = filtered.filter(
        (log) => log.correlationId === input.filterCorrelationId
      );
    }

    // Apply limit
    const limit = input.limit ?? 100;
    const logs = filtered.slice(-limit); // Get most recent entries

    context.logger?.debug(`Logger: Queried ${logs.length} logs`);

    return success({
      operation: 'query',
      count: logs.length,
      logs,
    });
  }

  /**
   * Export logs to formatted string
   */
  private static async exportLogs(
    input: LoggerInput,
    context: ToolContext
  ): Promise<ToolResult<LoggerOutput>> {
    const format = input.format ?? 'json';
    let exported: string;

    if (format === 'json') {
      exported = JSON.stringify(this.logs, null, 2);
    } else {
      // Text format
      exported = this.logs
        .map((log) => {
          const parts = [
            log.timestamp,
            log.level.toUpperCase().padEnd(5),
            log.correlationId ? `[${log.correlationId}]` : '',
            log.message,
          ];

          if (log.data) {
            parts.push(JSON.stringify(log.data));
          }

          return parts.filter(Boolean).join(' | ');
        })
        .join('\n');
    }

    context.logger?.debug(`Logger: Exported ${this.logs.length} logs as ${format}`);

    return success({
      operation: 'export',
      count: this.logs.length,
      exported,
    });
  }

  /**
   * Configure logger
   */
  private static async configure(
    input: LoggerInput,
    context: ToolContext
  ): Promise<ToolResult<LoggerOutput>> {
    if (input.maxLogs !== undefined) {
      this.config.maxLogs = input.maxLogs;
    }

    if (input.minLevel) {
      this.config.minLevel = input.minLevel;
    }

    context.logger?.info('Logger: Configuration updated', this.config);

    return success({
      operation: 'configure',
      config: { ...this.config },
    });
  }

  /**
   * Get current configuration
   */
  static getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Get log count
   */
  static getLogCount(): number {
    return this.logs.length;
  }
}
