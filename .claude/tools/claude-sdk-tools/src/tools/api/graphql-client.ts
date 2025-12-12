/**
 * @claude-sdk/tools - GraphQL Client Tool
 * Execute GraphQL queries and mutations with variable substitution
 */

import { z } from 'zod';
import { wrapExecution, withTimeout, withRetry } from '../../utils/index.js';
import { NetworkError, ValidationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const GraphqlClientSchema = z.object({
  url: z.string().url('Must be a valid GraphQL endpoint URL'),
  query: z.string().min(1, 'Query cannot be empty'),
  variables: z.record(z.unknown()).optional(),
  operationName: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().int().positive().default(30000),
  retries: z.number().int().min(0).max(5).default(3),
});

export type GraphqlClientInput = z.infer<typeof GraphqlClientSchema>;

export interface GraphqlError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export interface GraphqlClientResponse {
  data?: unknown;
  errors?: GraphqlError[];
  extensions?: Record<string, unknown>;
  status: number;
  headers: Record<string, string>;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
}

// ============================================================================
// GraphQL Client Tool Implementation
// ============================================================================

export class GraphqlClientTool {
  static readonly toolName = 'graphql_client';
  static readonly description = 'Execute GraphQL queries and mutations with variable substitution, operation name support, and comprehensive error handling including GraphQL-specific errors';
  static readonly schema = GraphqlClientSchema;

  /**
   * Execute GraphQL query or mutation
   */
  static async execute(
    input: GraphqlClientInput,
    context?: ToolContext
  ): Promise<ToolResult<GraphqlClientResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const startTime = Date.now();

      // Validate query syntax
      this.validateQuery(input.query);

      // Prepare GraphQL request body
      const requestBody = {
        query: input.query,
        ...(input.variables && { variables: input.variables }),
        ...(input.operationName && { operationName: input.operationName }),
      };

      // Prepare request options
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': '@claude-sdk/tools/graphql-client',
          ...input.headers,
        },
        body: JSON.stringify(requestBody),
      };

      // Execute request with timeout and retry
      const executeRequest = async (): Promise<Response> => {
        return withTimeout(
          `GraphQL ${input.operationName || 'query'}`,
          async () => {
            try {
              const response = await fetch(input.url, requestOptions);

              // GraphQL always returns 200, but may have errors in body
              if (!response.ok) {
                throw new NetworkError(
                  `HTTP ${response.status}: ${response.statusText}`,
                  response.status,
                  input.url,
                  'POST'
                );
              }

              return response;
            } catch (error) {
              if (error instanceof NetworkError) {
                throw error;
              }
              throw NetworkError.fromFetchError(
                error instanceof Error ? error : new Error(String(error)),
                input.url,
                'POST'
              );
            }
          },
          input.timeout
        );
      };

      // Execute with retry logic
      const response = await withRetry(executeRequest, {
        retries: input.retries,
        delay: 1000,
        backoff: 'exponential',
        shouldRetry: (error) => {
          // Retry on network errors and 5xx status codes
          if (error instanceof NetworkError) {
            return !error.statusCode || error.statusCode >= 500;
          }
          return false;
        },
      });

      // Parse GraphQL response
      const responseText = await response.text();
      let graphqlResponse: GraphqlClientResponse;

      try {
        const parsed = JSON.parse(responseText);

        // Extract headers
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const endTime = Date.now();

        graphqlResponse = {
          data: parsed.data,
          errors: parsed.errors,
          extensions: parsed.extensions,
          status: response.status,
          headers,
          timing: {
            start: startTime,
            end: endTime,
            duration: endTime - startTime,
          },
        };

        // Check for GraphQL errors
        if (parsed.errors && parsed.errors.length > 0) {
          ctx.logger?.warn('GraphQL query returned errors', {
            errors: parsed.errors,
            operation: input.operationName,
          });

          // If there's no data and only errors, treat as failure
          if (!parsed.data) {
            throw new NetworkError(
              `GraphQL errors: ${parsed.errors.map((e: GraphqlError) => e.message).join(', ')}`,
              response.status,
              input.url,
              'POST',
              { graphqlErrors: parsed.errors }
            );
          }
        }

        ctx.logger?.info(`GraphQL ${input.operationName || 'query'} executed`, {
          hasData: !!parsed.data,
          hasErrors: !!parsed.errors,
          duration: graphqlResponse.timing.duration,
        });

        return graphqlResponse;
      } catch (error) {
        if (error instanceof NetworkError) {
          throw error;
        }
        throw new ValidationError(
          'Failed to parse GraphQL response',
          ['response'],
          responseText,
          'valid JSON',
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
    }, input, context);
  }

  /**
   * Validate GraphQL query syntax (basic validation)
   */
  private static validateQuery(query: string): void {
    const trimmedQuery = query.trim();

    // Check for basic GraphQL structure
    if (!trimmedQuery.match(/^(query|mutation|subscription|fragment|\{)/i)) {
      throw new ValidationError(
        'Invalid GraphQL query: must start with query, mutation, subscription, fragment, or {',
        ['query'],
        trimmedQuery.substring(0, 50),
        'valid GraphQL query'
      );
    }

    // Check for balanced braces
    const openBraces = (trimmedQuery.match(/{/g) || []).length;
    const closeBraces = (trimmedQuery.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      throw new ValidationError(
        'Invalid GraphQL query: unbalanced braces',
        ['query'],
        `${openBraces} open, ${closeBraces} close`,
        'balanced braces'
      );
    }
  }

  /**
   * Convenience method for queries
   */
  static async query(
    url: string,
    query: string,
    variables?: Record<string, unknown>,
    options?: Partial<GraphqlClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<GraphqlClientResponse>> {
    return this.execute(
      {
        ...options,
        url,
        query,
        variables,
      } as GraphqlClientInput,
      context
    );
  }

  /**
   * Convenience method for mutations
   */
  static async mutate(
    url: string,
    mutation: string,
    variables?: Record<string, unknown>,
    options?: Partial<GraphqlClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<GraphqlClientResponse>> {
    return this.execute(
      {
        ...options,
        url,
        query: mutation,
        variables,
      } as GraphqlClientInput,
      context
    );
  }

  /**
   * Build a simple query from fields
   */
  static buildQuery(
    operation: string,
    fields: string[],
    variables?: Record<string, string>
  ): string {
    const varDeclarations = variables
      ? `(${Object.entries(variables).map(([name, type]) => `$${name}: ${type}`).join(', ')})`
      : '';

    const varUsage = variables
      ? `(${Object.keys(variables).map(name => `${name}: $${name}`).join(', ')})`
      : '';

    return `
      query ${varDeclarations} {
        ${operation}${varUsage} {
          ${fields.join('\n          ')}
        }
      }
    `.trim();
  }

  /**
   * Build a simple mutation from fields
   */
  static buildMutation(
    operation: string,
    fields: string[],
    variables?: Record<string, string>
  ): string {
    const varDeclarations = variables
      ? `(${Object.entries(variables).map(([name, type]) => `$${name}: ${type}`).join(', ')})`
      : '';

    const varUsage = variables
      ? `(${Object.keys(variables).map(name => `${name}: $${name}`).join(', ')})`
      : '';

    return `
      mutation ${varDeclarations} {
        ${operation}${varUsage} {
          ${fields.join('\n          ')}
        }
      }
    `.trim();
  }
}
