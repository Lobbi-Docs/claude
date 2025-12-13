/**
 * API Response Utilities
 *
 * This module establishes consistent response formatting across all endpoints,
 * ensuring predictable API behavior for client integrations.
 *
 * Business Value:
 * - Consistent response structure simplifies client-side error handling
 * - Request correlation IDs enable distributed tracing for troubleshooting
 * - Type-safe response builders prevent malformed API responses
 */

import { ApiResponse, ApiError, ErrorCode } from '../types/index.js';

/**
 * Create standardized success response
 *
 * WHY: Consistent success responses enable client libraries to parse responses
 * uniformly, reducing integration complexity and improving reliability.
 *
 * @param data - Response payload
 * @param metadata - Optional pagination/metadata
 * @returns Formatted API response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: ApiResponse<T>['metadata']
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(metadata && { metadata }),
  };
}

/**
 * Create standardized error response
 *
 * WHY: Structured error responses with correlation IDs enable rapid issue
 * diagnosis and improve developer experience during integration.
 *
 * @param code - Error code from ErrorCode enum
 * @param message - Human-readable error message
 * @param requestId - Request correlation ID for tracing
 * @param details - Optional additional error context
 * @returns Formatted error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  requestId?: string,
  details?: unknown
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      requestId: requestId || 'unknown',
    },
  };
}

/**
 * Create paginated response with metadata
 *
 * WHY: Standardized pagination reduces client complexity and enables efficient
 * data loading patterns for large result sets.
 *
 * @param data - Array of items
 * @param total - Total number of items available
 * @param limit - Items per page
 * @param offset - Current offset
 * @returns Paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): ApiResponse<T[]> {
  return createSuccessResponse(data, {
    page: Math.floor(offset / limit) + 1,
    limit,
    total,
    hasMore: offset + limit < total,
  });
}
