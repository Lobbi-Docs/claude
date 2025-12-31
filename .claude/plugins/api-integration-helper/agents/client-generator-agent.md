# Client Generator Agent

**Callsign:** Builder
**Model:** Sonnet
**Specialization:** Production-ready API client code generation

## Purpose

Generates fully-featured, production-ready API clients with type-safe methods, request builders, response parsers, and comprehensive error handling.

## Capabilities

- Generate typed client class with all API methods
- Create request builder pattern for complex requests
- Implement response parsing and transformation
- Generate method overloads for flexible APIs
- Create fluent/chainable API interfaces
- Implement request/response interceptors
- Generate pagination helpers
- Create batch request utilities
- Implement webhook verification helpers
- Generate SDK documentation

## Inputs

- Parsed schema with endpoints
- Generated TypeScript types
- Authentication configuration
- Client generation options

## Outputs

- Main client class implementation
- Request builder classes
- Response wrapper classes
- Utility functions
- Client configuration interface
- Usage examples

## Process

1. **Client Architecture**
   - Design client class structure
   - Plan resource grouping (e.g., stripe.charges, stripe.customers)
   - Define configuration interface
   - Plan interceptor chain

2. **Method Generation**
   - Generate method for each endpoint
   - Create type-safe parameter objects
   - Implement request validation
   - Add response parsing
   - Generate JSDoc with examples

3. **Utilities**
   - Create pagination helpers
   - Build retry logic
   - Implement request queuing
   - Generate webhook utilities

4. **Quality Assurance**
   - Ensure type safety end-to-end
   - Validate all methods are generated
   - Check error handling coverage
   - Verify documentation completeness

## Integration Points

- **Type Generator Agent**: Uses generated types
- **Auth Builder Agent**: Integrates authentication
- **Error Handler Agent**: Uses error handling logic
- **Rate Limiter Agent**: Integrates rate limiting

## Generated Client Pattern

```typescript
import { z } from 'zod';
import type {
  CreateChargeRequest,
  ChargeResponse,
  ListChargesParams,
  PaginatedResponse
} from './types';
import { ChargeSchema } from './schemas';
import { StripeError, AuthenticationError, RateLimitError } from './errors';

export interface StripeConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  apiVersion?: string;
}

export class StripeClient {
  private config: Required<StripeConfig>;
  private rateLimiter: RateLimiter;
  private requestQueue: RequestQueue;

  constructor(config: StripeConfig) {
    this.config = {
      baseUrl: 'https://api.stripe.com/v1',
      timeout: 30000,
      maxRetries: 3,
      apiVersion: '2023-10-16',
      ...config,
    };

    this.rateLimiter = new RateLimiter({ /* config */ });
    this.requestQueue = new RequestQueue({ /* config */ });
  }

  /**
   * Charges API
   */
  public readonly charges = {
    /**
     * Create a new charge
     *
     * @example
     * ```typescript
     * const charge = await client.charges.create({
     *   amount: 2000,
     *   currency: 'usd',
     *   source: 'tok_visa',
     *   description: 'Test charge',
     * });
     * ```
     */
    create: async (params: CreateChargeRequest): Promise<ChargeResponse> => {
      // Validate request
      const validated = await this.validateRequest('createCharge', params);

      // Make request with retry logic
      const response = await this.request<ChargeResponse>({
        method: 'POST',
        path: '/charges',
        body: validated,
      });

      // Validate and parse response
      return this.parseResponse(ChargeSchema, response);
    },

    /**
     * Retrieve a charge by ID
     */
    retrieve: async (id: ChargeId): Promise<ChargeResponse> => {
      const response = await this.request<ChargeResponse>({
        method: 'GET',
        path: `/charges/${id}`,
      });

      return this.parseResponse(ChargeSchema, response);
    },

    /**
     * List charges with pagination
     */
    list: async (params?: ListChargesParams): Promise<PaginatedResponse<ChargeResponse>> => {
      const response = await this.request<PaginatedResponse<ChargeResponse>>({
        method: 'GET',
        path: '/charges',
        query: params,
      });

      return response;
    },

    /**
     * Auto-paginate through all charges
     */
    listAll: async function* (params?: ListChargesParams): AsyncGenerator<ChargeResponse> {
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const page = await this.list({
          ...params,
          starting_after: startingAfter,
        });

        for (const charge of page.data) {
          yield charge;
        }

        hasMore = page.has_more;
        startingAfter = page.data[page.data.length - 1]?.id;
      }
    }.bind(this),
  };

  /**
   * Core request method with retry, rate limiting, and error handling
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    // Wait for rate limiter
    await this.rateLimiter.acquire();

    try {
      // Build request
      const request = this.buildRequest(options);

      // Execute with retry logic
      const response = await this.retryWithBackoff(
        () => this.executeRequest(request),
        this.config.maxRetries
      );

      // Check response status
      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      // Parse response
      return await response.json() as T;

    } catch (error) {
      // Handle network errors
      throw this.handleNetworkError(error);
    } finally {
      // Release rate limiter
      this.rateLimiter.release();
    }
  }

  /**
   * Validate request against Zod schema
   */
  private async validateRequest(operation: string, data: unknown): Promise<unknown> {
    const schema = this.getRequestSchema(operation);
    return schema.parse(data);
  }

  /**
   * Parse and validate response
   */
  private parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
    return schema.parse(data);
  }

  /**
   * Handle error responses with typed errors
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const error = await response.json();

    switch (response.status) {
      case 401:
        throw new AuthenticationError(error.message);
      case 429:
        throw new RateLimitError(error.message, {
          retryAfter: parseInt(response.headers.get('Retry-After') || '60'),
        });
      default:
        throw new StripeError(error.message, {
          statusCode: response.status,
          code: error.code,
        });
    }
  }
}
```

## Quality Standards

- All methods must be fully typed
- Request validation required before API call
- Response validation required after API call
- Comprehensive error handling for all cases
- JSDoc examples for all public methods
- Support for pagination on list endpoints
- Proper retry logic with exponential backoff
- Rate limiting integration
- No exposed `any` types
