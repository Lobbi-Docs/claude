/**
 * @claude-sdk/tools - Custom Error Classes
 * Hierarchical error system for consistent error handling
 */

/**
 * Base error class for all tool errors
 * Provides structured error information for debugging and logging
 */
export class ToolError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause instanceof Error ? this.cause.message : this.cause,
    };
  }
}

/**
 * Validation error for input/output schema failures
 */
export class ValidationError extends ToolError {
  public readonly path: string[];
  public readonly received: unknown;
  public readonly expected: string;

  constructor(
    message: string,
    path: string[],
    received: unknown,
    expected: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', {
      ...details,
      path,
      received: String(received),
      expected,
    });
    this.name = 'ValidationError';
    this.path = path;
    this.received = received;
    this.expected = expected;
  }

  static fromZodError(error: { issues: Array<{ path: (string | number)[]; message: string; code: string }> }): ValidationError {
    const firstIssue = error.issues[0];
    return new ValidationError(
      firstIssue?.message || 'Validation failed',
      firstIssue?.path.map(String) || [],
      undefined,
      firstIssue?.code || 'unknown',
      { issues: error.issues }
    );
  }
}

/**
 * Network error for HTTP/WebSocket/API failures
 */
export class NetworkError extends ToolError {
  public readonly statusCode?: number;
  public readonly url?: string;
  public readonly method?: string;

  constructor(
    message: string,
    statusCode?: number,
    url?: string,
    method?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'NETWORK_ERROR', { ...details, statusCode, url, method }, cause);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.url = url;
    this.method = method;
  }

  static fromFetchError(error: Error, url: string, method: string): NetworkError {
    return new NetworkError(
      `Network request failed: ${error.message}`,
      undefined,
      url,
      method,
      undefined,
      error
    );
  }
}

/**
 * Timeout error for operations exceeding time limits
 */
export class TimeoutError extends ToolError {
  public readonly timeout: number;
  public readonly operation: string;

  constructor(
    operation: string,
    timeout: number,
    details?: Record<string, unknown>
  ) {
    super(
      `Operation "${operation}" timed out after ${timeout}ms`,
      'TIMEOUT_ERROR',
      { ...details, timeout, operation }
    );
    this.name = 'TimeoutError';
    this.timeout = timeout;
    this.operation = operation;
  }
}

/**
 * Security error for authentication/authorization failures
 */
export class SecurityError extends ToolError {
  public readonly securityCode: SecurityErrorCode;

  constructor(
    message: string,
    securityCode: SecurityErrorCode,
    details?: Record<string, unknown>
  ) {
    super(message, `SECURITY_${securityCode}`, details);
    this.name = 'SecurityError';
    this.securityCode = securityCode;
  }
}

export type SecurityErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'INVALID_SIGNATURE'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED';

/**
 * Configuration error for invalid tool configuration
 */
export class ConfigurationError extends ToolError {
  public readonly configKey: string;
  public readonly configValue: unknown;

  constructor(
    message: string,
    configKey: string,
    configValue: unknown,
    details?: Record<string, unknown>
  ) {
    super(message, 'CONFIGURATION_ERROR', { ...details, configKey, configValue });
    this.name = 'ConfigurationError';
    this.configKey = configKey;
    this.configValue = configValue;
  }
}

/**
 * Resource error for file/database/external resource failures
 */
export class ResourceError extends ToolError {
  public readonly resourceType: ResourceType;
  public readonly resourceId?: string;

  constructor(
    message: string,
    resourceType: ResourceType,
    resourceId?: string,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, `RESOURCE_${resourceType.toUpperCase()}_ERROR`, { ...details, resourceId }, cause);
    this.name = 'ResourceError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

export type ResourceType = 'file' | 'database' | 'cache' | 'queue' | 'external';

/**
 * Rate limit error for throttled operations
 */
export class RateLimitError extends ToolError {
  public readonly retryAfter?: number;
  public readonly limit: number;
  public readonly remaining: number;

  constructor(
    message: string,
    limit: number,
    remaining: number,
    retryAfter?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_ERROR', { ...details, limit, remaining, retryAfter });
    this.name = 'RateLimitError';
    this.limit = limit;
    this.remaining = remaining;
    this.retryAfter = retryAfter;
  }
}

/**
 * Type guard functions for error types
 */
export const isToolError = (error: unknown): error is ToolError =>
  error instanceof ToolError;

export const isValidationError = (error: unknown): error is ValidationError =>
  error instanceof ValidationError;

export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError;

export const isTimeoutError = (error: unknown): error is TimeoutError =>
  error instanceof TimeoutError;

export const isSecurityError = (error: unknown): error is SecurityError =>
  error instanceof SecurityError;

export const isRateLimitError = (error: unknown): error is RateLimitError =>
  error instanceof RateLimitError;
