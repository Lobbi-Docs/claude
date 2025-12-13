/**
 * Structured Logging Utility
 *
 * This module establishes Winston-based structured logging for comprehensive
 * operational observability and troubleshooting capabilities.
 *
 * Business Value:
 * - Structured logs enable automated log analysis and alerting
 * - Correlation IDs connect related log entries across distributed operations
 * - Log levels support environment-specific verbosity control
 */

import winston from 'winston';
import { config } from '../config.js';

/**
 * Winston logger instance with structured formatting
 *
 * WHY: Structured logging (JSON format) enables log aggregation systems
 * to parse and index logs efficiently for searching and analysis.
 */
export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'registry-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),

    // Write all logs with level 'error' to error.log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),

    // Write all logs to combined.log
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    }),
  ],
});

/**
 * Log HTTP request with correlation ID
 *
 * WHY: Request logging provides audit trail and enables performance analysis
 * for identifying slow endpoints and usage patterns.
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  requestId: string
): void {
  logger.info('HTTP Request', {
    method,
    path,
    statusCode,
    durationMs: duration,
    requestId,
  });
}

/**
 * Log error with full context
 *
 * WHY: Detailed error logging accelerates issue diagnosis by capturing
 * stack traces and contextual information at error occurrence.
 */
export function logError(
  message: string,
  error: Error,
  context?: Record<string, unknown>
): void {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    ...context,
  });
}
