/**
 * Request Validation Middleware
 *
 * This module establishes type-safe request validation using Zod schemas,
 * ensuring data integrity before processing API requests.
 *
 * Business Value:
 * - Prevents invalid data from corrupting database state
 * - Provides clear validation errors for API consumers
 * - Reduces defensive coding in route handlers through validated inputs
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ErrorCode } from '../types/index.js';
import { createErrorResponse } from '../utils/response.js';

/**
 * Validate request body against Zod schema
 *
 * WHY: Schema validation catches malformed requests at the API boundary,
 * preventing invalid data from propagating through the application.
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          createErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            'Request validation failed',
            (req as any).requestId,
            {
              validationErrors: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            }
          )
        );
        return;
      }

      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Unexpected validation error',
          (req as any).requestId
        )
      );
    }
  };
}

/**
 * Validate query parameters against Zod schema
 *
 * WHY: Query parameter validation ensures search and filter operations
 * receive properly typed inputs, preventing runtime errors.
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Convert string query params to appropriate types
      const parsed = schema.parse(req.query);
      req.query = parsed as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(
          createErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            'Query parameter validation failed',
            (req as any).requestId,
            {
              validationErrors: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
              })),
            }
          )
        );
        return;
      }

      res.status(500).json(
        createErrorResponse(
          ErrorCode.INTERNAL_ERROR,
          'Unexpected validation error',
          (req as any).requestId
        )
      );
    }
  };
}
