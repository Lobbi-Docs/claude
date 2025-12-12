/**
 * @claude-sdk/tools - MockServerTool
 * In-memory HTTP mock server for testing API integrations
 */

import { z } from 'zod';
import { success, wrapExecution } from '../../utils/index.js';
import { ValidationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schemas
// ============================================================================

export const MockResponseSchema = z.object({
  status: z.number().min(100).max(599).default(200),
  headers: z.record(z.string()).optional(),
  body: z.unknown(),
  delay: z.number().min(0).optional(),
});

export const MockRouteSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']),
  pattern: z.string(),
  response: MockResponseSchema,
  matchMode: z.enum(['exact', 'regex', 'prefix', 'suffix']).default('exact'),
});

export const ConfigureMockSchema = z.object({
  action: z.literal('configure'),
  routes: z.array(MockRouteSchema),
});

export const MatchRequestSchema = z.object({
  action: z.literal('match'),
  method: z.string(),
  url: z.string(),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
});

export const RecordedRequestSchema = z.object({
  action: z.literal('getRecorded'),
  filter: z
    .object({
      method: z.string().optional(),
      urlPattern: z.string().optional(),
    })
    .optional(),
});

export const ClearMocksSchema = z.object({
  action: z.literal('clear'),
});

export const MockServerSchema = z.discriminatedUnion('action', [
  ConfigureMockSchema,
  MatchRequestSchema,
  RecordedRequestSchema,
  ClearMocksSchema,
]);

// ============================================================================
// Types
// ============================================================================

export type MockResponse = z.infer<typeof MockResponseSchema>;
export type MockRoute = z.infer<typeof MockRouteSchema>;
export type MockServerInput = z.infer<typeof MockServerSchema>;

interface MockRequest {
  timestamp: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface MatchResult {
  matched: boolean;
  response?: MockResponse;
  route?: MockRoute;
}

// ============================================================================
// MockServerTool Implementation
// ============================================================================

export class MockServerTool {
  private static routes: MockRoute[] = [];
  private static recordedRequests: MockRequest[] = [];

  /**
   * Configure mock routes
   */
  private static configure(routes: MockRoute[]): ToolResult<{ configured: number }> {
    this.routes = routes;
    return success({
      configured: routes.length,
    });
  }

  /**
   * Match an incoming request against configured routes
   */
  private static async matchRequest(
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: unknown
  ): Promise<ToolResult<MatchResult>> {
    // Record the request
    this.recordedRequests.push({
      timestamp: new Date().toISOString(),
      method,
      url,
      headers,
      body,
    });

    // Find matching route
    const route = this.routes.find((r) => {
      if (r.method !== method) return false;
      return this.matchPattern(url, r.pattern, r.matchMode);
    });

    if (!route) {
      return success({
        matched: false,
      });
    }

    // Apply delay if specified
    if (route.response.delay) {
      await new Promise((resolve) => setTimeout(resolve, route.response.delay));
    }

    return success({
      matched: true,
      response: route.response,
      route,
    });
  }

  /**
   * Get recorded requests
   */
  private static getRecorded(filter?: {
    method?: string;
    urlPattern?: string;
  }): ToolResult<{ requests: MockRequest[]; count: number }> {
    let requests = this.recordedRequests;

    if (filter?.method) {
      requests = requests.filter((r) => r.method === filter.method);
    }

    if (filter?.urlPattern) {
      requests = requests.filter((r) => r.url.includes(filter.urlPattern!));
    }

    return success({
      requests,
      count: requests.length,
    });
  }

  /**
   * Clear all mocks and recorded requests
   */
  private static clear(): ToolResult<{ cleared: boolean }> {
    this.routes = [];
    this.recordedRequests = [];
    return success({ cleared: true });
  }

  /**
   * Match URL pattern based on mode
   */
  private static matchPattern(url: string, pattern: string, mode: string): boolean {
    switch (mode) {
      case 'exact':
        return url === pattern;
      case 'regex':
        try {
          return new RegExp(pattern).test(url);
        } catch {
          return false;
        }
      case 'prefix':
        return url.startsWith(pattern);
      case 'suffix':
        return url.endsWith(pattern);
      default:
        return false;
    }
  }

  /**
   * Main execution method
   */
  static async execute(
    input: MockServerInput,
    context?: ToolContext
  ): Promise<ToolResult<unknown>> {
    return wrapExecution(
      'MockServerTool',
      async (inp: MockServerInput) => {
        // Validate input
        const parsed = MockServerSchema.safeParse(inp);
        if (!parsed.success) {
          throw ValidationError.fromZodError(parsed.error);
        }

        const { action } = parsed.data;

        switch (action) {
          case 'configure':
            return this.configure(parsed.data.routes);

          case 'match':
            return this.matchRequest(
              parsed.data.method,
              parsed.data.url,
              parsed.data.headers,
              parsed.data.body
            );

          case 'getRecorded':
            return this.getRecorded(parsed.data.filter);

          case 'clear':
            return this.clear();

          default:
            throw new ValidationError(
              'Invalid action',
              ['action'],
              action,
              'configure|match|getRecorded|clear'
            );
        }
      },
      input,
      context
    );
  }
}
