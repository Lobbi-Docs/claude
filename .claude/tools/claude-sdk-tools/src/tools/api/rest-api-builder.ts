/**
 * @claude-sdk/tools - REST API Builder Tool
 * Build and configure REST API clients with base URL, authentication, and interceptors
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import { ConfigurationError, NetworkError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';
import { HttpClientTool, type HttpClientInput, type HttpClientResponse } from './http-client.js';

// ============================================================================
// Schema Definitions
// ============================================================================

export const RestApiConfigSchema = z.object({
  baseUrl: z.string().url('Must be a valid base URL'),
  version: z.string().optional(),
  authentication: z.object({
    type: z.enum(['none', 'bearer', 'basic', 'apiKey', 'custom']),
    token: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    apiKey: z.string().optional(),
    apiKeyHeader: z.string().default('X-API-Key'),
    customHeaders: z.record(z.string()).optional(),
  }).default({ type: 'none' }),
  defaultHeaders: z.record(z.string()).optional(),
  timeout: z.number().int().positive().default(30000),
  retries: z.number().int().min(0).max(5).default(3),
  validateStatus: z.function()
    .args(z.number())
    .returns(z.boolean())
    .optional(),
  interceptors: z.object({
    request: z.array(z.string()).optional(),
    response: z.array(z.string()).optional(),
  }).optional(),
});

export const RestApiRequestSchema = z.object({
  apiId: z.string(),
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
  body: z.union([
    z.string(),
    z.record(z.unknown()),
    z.array(z.unknown()),
  ]).optional(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  timeout: z.number().int().positive().optional(),
});

export type RestApiConfigInput = z.infer<typeof RestApiConfigSchema>;
export type RestApiRequestInput = z.infer<typeof RestApiRequestSchema>;

export interface RestApiConfig {
  id: string;
  config: RestApiConfigInput;
  createdAt: number;
}

export interface RestApiCreateResponse {
  apiId: string;
  baseUrl: string;
  version?: string;
  authType: string;
}

// ============================================================================
// REST API Configuration Manager
// ============================================================================

class RestApiManager {
  private static apis = new Map<string, RestApiConfig>();

  static getApi(id: string): RestApiConfig | undefined {
    return this.apis.get(id);
  }

  static addApi(api: RestApiConfig): void {
    this.apis.set(api.id, api);
  }

  static removeApi(id: string): void {
    this.apis.delete(id);
  }

  static getAllApis(): RestApiConfig[] {
    return Array.from(this.apis.values());
  }

  static generateId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

// ============================================================================
// REST API Builder Tool - Create
// ============================================================================

export class RestApiBuilderTool {
  static readonly toolName = 'rest_api_create';
  static readonly description = 'Create a REST API client configuration with base URL, authentication (bearer, basic, API key), default headers, and request/response interceptors';
  static readonly schema = RestApiConfigSchema;

  /**
   * Create REST API configuration
   */
  static async execute(
    input: RestApiConfigInput,
    context?: ToolContext
  ): Promise<ToolResult<RestApiCreateResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      // Validate authentication configuration
      this.validateAuthentication(input.authentication);

      // Generate API ID
      const apiId = RestApiManager.generateId();

      // Store API configuration
      const apiConfig: RestApiConfig = {
        id: apiId,
        config: input,
        createdAt: Date.now(),
      };

      RestApiManager.addApi(apiConfig);

      ctx.logger?.info(`REST API created: ${apiId}`, {
        baseUrl: input.baseUrl,
        version: input.version,
        authType: input.authentication.type,
      });

      return {
        apiId,
        baseUrl: input.baseUrl,
        version: input.version,
        authType: input.authentication.type,
      };
    }, input, context);
  }

  /**
   * Validate authentication configuration
   */
  private static validateAuthentication(auth: RestApiConfigInput['authentication']): void {
    switch (auth.type) {
      case 'bearer':
        if (!auth.token) {
          throw new ConfigurationError(
            'Bearer authentication requires a token',
            'authentication.token',
            auth.token
          );
        }
        break;
      case 'basic':
        if (!auth.username || !auth.password) {
          throw new ConfigurationError(
            'Basic authentication requires username and password',
            'authentication',
            { username: auth.username, password: '***' }
          );
        }
        break;
      case 'apiKey':
        if (!auth.apiKey) {
          throw new ConfigurationError(
            'API Key authentication requires an apiKey',
            'authentication.apiKey',
            auth.apiKey
          );
        }
        break;
    }
  }
}

// ============================================================================
// REST API Request Tool
// ============================================================================

export class RestApiRequestTool {
  static readonly toolName = 'rest_api_request';
  static readonly description = 'Execute a REST API request using a configured API client';
  static readonly schema = RestApiRequestSchema;

  /**
   * Execute REST API request
   */
  static async execute(
    input: RestApiRequestInput,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return wrapExecution(this.toolName, async (input, ctx) => {
      // Get API configuration
      const apiConfig = RestApiManager.getApi(input.apiId);

      if (!apiConfig) {
        throw new ConfigurationError(
          `REST API configuration not found: ${input.apiId}`,
          'apiId',
          input.apiId
        );
      }

      // Build full URL
      const url = this.buildUrl(apiConfig.config, input.endpoint);

      // Build headers with authentication
      const headers = this.buildHeaders(apiConfig.config, input.headers);

      // Prepare HTTP client request
      const httpRequest: HttpClientInput = {
        url,
        method: input.method,
        headers,
        queryParams: input.queryParams,
        body: input.body,
        timeout: input.timeout || apiConfig.config.timeout,
        retries: apiConfig.config.retries,
        validateStatus: apiConfig.config.validateStatus,
        followRedirects: true,
        responseType: 'json',
        stream: false,
      };

      ctx.logger?.info(`REST API request: ${input.method} ${url}`, {
        apiId: input.apiId,
        endpoint: input.endpoint,
      });

      // Execute request using HttpClientTool
      const result = await HttpClientTool.execute(httpRequest, context);

      if (!result.success) {
        throw new NetworkError(
          result.error?.message || 'REST API request failed',
          undefined,
          url,
          input.method,
          { apiId: input.apiId, endpoint: input.endpoint }
        );
      }

      return result.data!;
    }, input, context);
  }

  /**
   * Build full URL with version
   */
  private static buildUrl(config: RestApiConfigInput, endpoint: string): string {
    let baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash

    // Add version if configured
    if (config.version) {
      baseUrl = `${baseUrl}/${config.version}`;
    }

    // Add endpoint (ensure single slash)
    const cleanEndpoint = endpoint.replace(/^\//, '');
    return `${baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Build headers with authentication and defaults
   */
  private static buildHeaders(
    config: RestApiConfigInput,
    customHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...config.defaultHeaders,
      ...customHeaders,
    };

    // Add authentication headers
    const auth = config.authentication;

    switch (auth.type) {
      case 'bearer':
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        break;

      case 'basic':
        if (auth.username && auth.password) {
          const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'apiKey':
        if (auth.apiKey) {
          headers[auth.apiKeyHeader] = auth.apiKey;
        }
        break;

      case 'custom':
        if (auth.customHeaders) {
          Object.assign(headers, auth.customHeaders);
        }
        break;
    }

    return headers;
  }

  /**
   * Convenience method for GET requests
   */
  static async get(
    apiId: string,
    endpoint: string,
    options?: Partial<RestApiRequestInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute(
      {
        ...options,
        apiId,
        endpoint,
        method: 'GET',
      } as RestApiRequestInput,
      context
    );
  }

  /**
   * Convenience method for POST requests
   */
  static async post(
    apiId: string,
    endpoint: string,
    body?: unknown,
    options?: Partial<RestApiRequestInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute(
      {
        ...options,
        apiId,
        endpoint,
        method: 'POST',
        body,
      } as RestApiRequestInput,
      context
    );
  }

  /**
   * Convenience method for PUT requests
   */
  static async put(
    apiId: string,
    endpoint: string,
    body?: unknown,
    options?: Partial<RestApiRequestInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute(
      {
        ...options,
        apiId,
        endpoint,
        method: 'PUT',
        body,
      } as RestApiRequestInput,
      context
    );
  }

  /**
   * Convenience method for PATCH requests
   */
  static async patch(
    apiId: string,
    endpoint: string,
    body?: unknown,
    options?: Partial<RestApiRequestInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute(
      {
        ...options,
        apiId,
        endpoint,
        method: 'PATCH',
        body,
      } as RestApiRequestInput,
      context
    );
  }

  /**
   * Convenience method for DELETE requests
   */
  static async delete(
    apiId: string,
    endpoint: string,
    options?: Partial<RestApiRequestInput>,
    context?: ToolContext
  ): Promise<ToolResult<HttpClientResponse>> {
    return this.execute(
      {
        ...options,
        apiId,
        endpoint,
        method: 'DELETE',
      } as RestApiRequestInput,
      context
    );
  }
}

// ============================================================================
// REST API Delete Tool
// ============================================================================

export class RestApiDeleteTool {
  static readonly toolName = 'rest_api_delete';
  static readonly description = 'Delete a REST API client configuration';

  static async execute(
    apiId: string,
    context?: ToolContext
  ): Promise<ToolResult<{ apiId: string; deleted: boolean }>> {
    return wrapExecution(this.toolName, async (apiId, ctx) => {
      const apiConfig = RestApiManager.getApi(apiId);

      if (!apiConfig) {
        throw new ConfigurationError(
          `REST API configuration not found: ${apiId}`,
          'apiId',
          apiId
        );
      }

      RestApiManager.removeApi(apiId);

      ctx.logger?.info(`REST API deleted: ${apiId}`);

      return {
        apiId,
        deleted: true,
      };
    }, apiId, context);
  }
}
