/**
 * @claude-sdk/tools - HTTP Client Tool
 * Universal HTTP client with full REST support
 */

import { z } from 'zod';
import { wrapExecution, withTimeout, withRetry } from '../../utils/index.js';
import { NetworkError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const HttpClientSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  body: z.union([
    z.string(),
    z.record(z.unknown()),
    z.array(z.unknown()),
  ]).optional(),
  timeout: z.number().int().positive().default(30000),
  retries: z.number().int().min(0).max(5).default(3),
  followRedirects: z.boolean().default(true),
  responseType: z.enum(['json', 'text', 'blob', 'arrayBuffer']).default('json'),
  validateStatus: z.function()
    .args(z.number())
    .returns(z.boolean())
    .optional(),
  stream: z.boolean().default(false),
});

export type HttpClientInput = z.infer<typeof HttpClientSchema>;

export interface HttpClientResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  url: string;
  method: string;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
}

// ============================================================================
// HTTP Client Tool Implementation
// ============================================================================

export class HttpClientTool {
  static readonly toolName = 'http_client';
  static readonly description = 'Universal HTTP client for making REST API requests with full method support, headers, query params, timeout, retry logic, and streaming capabilities';
  static readonly schema = HttpClientSchema;

  /**
   * Execute HTTP request
   */
  static async execute(
    input: HttpClientInput,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      const startTime = Date.now();

      // Build URL with query parameters
      const url = this.buildUrl(input.url, input.queryParams);

      // Prepare request options
      const requestOptions: RequestInit = {
        method: input.method,
        headers: this.buildHeaders(input.headers, input.body),
        redirect: input.followRedirects ? 'follow' : 'manual',
      };

      // Add body for methods that support it
      if (input.body && !['GET', 'HEAD'].includes(input.method)) {
        requestOptions.body = this.prepareBody(input.body);
      }

      // Execute request with timeout and retry
      const executeRequest = async (): Promise<Response> => {
        return withTimeout(
          `HTTP ${input.method} ${url}`,
          async () => {
            try {
              const response = await fetch(url, requestOptions);

              // Validate status if custom validator provided
              const isValid = input.validateStatus
                ? input.validateStatus(response.status)
                : response.ok;

              if (!isValid) {
                throw new NetworkError(
                  `HTTP ${response.status}: ${response.statusText}`,
                  response.status,
                  url,
                  input.method
                );
              }

              return response;
            } catch (error) {
              if (error instanceof NetworkError) {
                throw error;
              }
              throw NetworkError.fromFetchError(
                error instanceof Error ? error : new Error(String(error)),
                url,
                input.method
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

      // Parse response based on type
      const data = await this.parseResponse(response, input.responseType);

      // Extract headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const endTime = Date.now();

      const result: HttpClientResponse = {
        status: response.status,
        statusText: response.statusText,
        headers,
        data,
        url: response.url,
        method: input.method,
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
        },
      };

      ctx.logger?.info(`HTTP ${input.method} ${url}`, {
        status: response.status,
        duration: result.timing.duration,
      });

      return result;
    }, input, context);
  }

  /**
   * Build URL with query parameters
   */
  private static buildUrl(baseUrl: string, queryParams?: Record<string, string | number | boolean>): string {
    if (!queryParams || Object.keys(queryParams).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return url.toString();
  }

  /**
   * Build headers with content-type detection
   */
  private static buildHeaders(
    customHeaders?: Record<string, string>,
    body?: unknown
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': '@claude-sdk/tools/http-client',
      ...customHeaders,
    };

    // Auto-detect content-type if not provided
    if (body && !headers['Content-Type'] && !headers['content-type']) {
      if (typeof body === 'string') {
        headers['Content-Type'] = 'text/plain';
      } else if (typeof body === 'object') {
        headers['Content-Type'] = 'application/json';
      }
    }

    return headers;
  }

  /**
   * Prepare request body
   */
  private static prepareBody(body: unknown): string {
    if (typeof body === 'string') {
      return body;
    }
    return JSON.stringify(body);
  }

  /**
   * Parse response based on type
   */
  private static async parseResponse(
    response: Response,
    responseType: 'json' | 'text' | 'blob' | 'arrayBuffer'
  ): Promise<unknown> {
    switch (responseType) {
      case 'json':
        const text = await response.text();
        return text ? JSON.parse(text) : null;
      case 'text':
        return response.text();
      case 'blob':
        return response.blob();
      case 'arrayBuffer':
        return response.arrayBuffer();
      default:
        return response.text();
    }
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  static async get(
    url: string,
    options?: Partial<HttpClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute({ ...options, url, method: 'GET' } as HttpClientInput, context);
  }

  static async post(
    url: string,
    body?: unknown,
    options?: Partial<HttpClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute({ ...options, url, method: 'POST', body } as HttpClientInput, context);
  }

  static async put(
    url: string,
    body?: unknown,
    options?: Partial<HttpClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute({ ...options, url, method: 'PUT', body } as HttpClientInput, context);
  }

  static async patch(
    url: string,
    body?: unknown,
    options?: Partial<HttpClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute({ ...options, url, method: 'PATCH', body } as HttpClientInput, context);
  }

  static async delete(
    url: string,
    options?: Partial<HttpClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute({ ...options, url, method: 'DELETE' } as HttpClientInput, context);
  }

  static async head(
    url: string,
    options?: Partial<HttpClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute({ ...options, url, method: 'HEAD' } as HttpClientInput, context);
  }

  static async options(
    url: string,
    options?: Partial<HttpClientInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute({ ...options, url, method: 'OPTIONS' } as HttpClientInput, context);
  }
}
