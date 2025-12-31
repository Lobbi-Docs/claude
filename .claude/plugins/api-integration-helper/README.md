# API Integration Helper Plugin (Connector)

**Callsign:** Connector
**Version:** 1.0.0
**Author:** Brookside BI
**License:** MIT

## Overview

The API Integration Helper plugin (codename: **Connector**) is a production-ready orchestration plugin that generates complete, enterprise-grade API clients from OpenAPI, GraphQL, and AsyncAPI specifications. Unlike basic code generators, Connector produces fully-featured clients with authentication, type safety, validation, error handling, rate limiting, and comprehensive test suites.

## What Makes This Plugin Different

**Not just a code generator** - Connector orchestrates 10 specialized agents to produce production-ready API clients:

- ✅ **Full Type Safety**: Branded types, discriminated unions, strict TypeScript
- ✅ **Runtime Validation**: Zod schemas for all requests and responses
- ✅ **Enterprise Authentication**: OAuth 2.0 with PKCE, API keys, JWT, custom flows
- ✅ **Resilience Patterns**: Retry logic, circuit breakers, timeouts, fallbacks
- ✅ **Rate Limiting**: Token bucket, request queuing, adaptive throttling
- ✅ **Mock Servers**: MSW/Prism with realistic data generation
- ✅ **Comprehensive Tests**: Integration, E2E, contract tests (85%+ coverage)
- ✅ **Complete Documentation**: API reference, examples, migration guides

## Agent Roster (10 Specialized Agents)

| Agent | Callsign | Model | Specialization |
|-------|----------|-------|----------------|
| Schema Parser | Parser | Sonnet | OpenAPI/GraphQL schema parsing and validation |
| Type Generator | Typer | Sonnet | TypeScript types, Zod schemas, branded types |
| Client Generator | Builder | Sonnet | Production-ready API client with all methods |
| Auth Builder | Guardian | Sonnet | OAuth 2.0, PKCE, API keys, JWT flows |
| Error Handler | Sentinel | Sonnet | Typed errors, retry logic, circuit breakers |
| Rate Limiter | Throttle | Sonnet | Rate limiting, request queuing, throttling |
| Mock Server | Mimic | Sonnet | MSW/Prism mocks with realistic data |
| Validation Builder | Validator | Haiku | Zod validation, custom validators, type guards |
| Test Generator | Tester | Sonnet | Integration, E2E, contract tests |
| API Explorer | Scout | Haiku | Interactive CLI for API exploration |

## Quick Start

### Generate Client from OpenAPI Spec

```bash
# Parse OpenAPI specification
npx connector parse-openapi https://api.example.com/openapi.json

# Generate complete client
npx connector generate-client \
  --input openapi.json \
  --output ./src/api-client \
  --auth oauth2 \
  --language typescript
```

### Integrate with Stripe

```bash
# Automated Stripe integration
npx connector integrate-api stripe \
  --api-key sk_test_xxx \
  --output ./src/stripe-client
```

## Generated Client Example

**Input:** Stripe OpenAPI specification

**Output:** Production-ready client with:

```typescript
import { StripeClient } from './stripe-client';

// Initialize client with type-safe config
const stripe = new StripeClient({
  apiKey: process.env.STRIPE_API_KEY,
  timeout: 30000,
  maxRetries: 3,
});

// Fully typed methods with validation
const charge = await stripe.charges.create({
  amount: 2000,
  currency: 'usd',
  source: 'tok_visa',
  description: 'Test payment',
});

// Auto-pagination
for await (const charge of stripe.charges.listAll({ limit: 100 })) {
  console.log(charge.id); // Type: ChargeId (branded type)
}

// Comprehensive error handling
try {
  await stripe.charges.create(invalidData);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Retry after ${error.retryAfter}s`);
  }
}
```

## Features

### 1. Schema Parsing & Analysis

- **Auto-detects** OpenAPI 2.0/3.0/3.1, GraphQL SDL, AsyncAPI
- **Validates** specification structure and completeness
- **Resolves** $ref pointers and circular references
- **Extracts** endpoints, types, authentication, rate limits

### 2. Type Generation

**Branded Types** for type safety:
```typescript
type UserId = string & { readonly __brand: 'UserId' };
type Email = string & { readonly __brand: 'Email' };
```

**Discriminated Unions** for polymorphic types:
```typescript
type PaymentMethod =
  | { type: 'card'; card: Card }
  | { type: 'bank_account'; bankAccount: BankAccount };
```

**Zod Schemas** for runtime validation:
```typescript
const UserSchema = z.object({
  id: z.string().regex(/^user_[a-zA-Z0-9]{24}$/),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});
```

### 3. Authentication Flows

**OAuth 2.0 with PKCE:**
```typescript
const oauth = new OAuth2Manager({
  clientId: 'xxx',
  authorizationUrl: 'https://auth.example.com/authorize',
  tokenUrl: 'https://auth.example.com/token',
  usePKCE: true,
});

// Generate authorization URL with PKCE challenge
const url = await oauth.getAuthorizationUrl();

// Exchange code for tokens
const tokens = await oauth.exchangeCodeForToken(code);

// Automatic token refresh
const accessToken = await oauth.getAccessToken();
```

**API Key:**
```typescript
const apiKey = new APIKeyAuth({
  apiKey: 'xxx',
  location: 'header',
  name: 'X-API-Key',
});
```

### 4. Error Handling & Resilience

**Typed Error Classes:**
```typescript
class RateLimitError extends APIError {
  constructor(message: string, retryAfter: number) {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}
```

**Retry with Exponential Backoff:**
```typescript
const retryHandler = new RetryHandler({
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
});

await retryHandler.execute(() => apiCall());
```

**Circuit Breaker:**
```typescript
const circuitBreaker = new CircuitBreaker({
  threshold: 5,        // Open after 5 failures
  timeout: 60000,      // Wait 60s before retry
  monitoringPeriod: 30000,
});

await circuitBreaker.execute(() => apiCall());
```

### 5. Rate Limiting

**Token Bucket Algorithm:**
```typescript
const rateLimiter = new TokenBucketRateLimiter({
  maxTokens: 100,      // 100 requests
  refillRate: 100,     // 100 per second
  refillInterval: 1000,
});

await rateLimiter.acquire(); // Wait for token
```

**Request Queue with Priorities:**
```typescript
const queue = new RequestQueue({
  maxConcurrent: 10,
  maxQueueSize: 1000,
});

// High priority request
await queue.enqueue(() => apiCall(), RequestPriority.HIGH);
```

### 6. Mock Server & Testing

**MSW Handlers:**
```typescript
export const handlers = [
  http.post('*/charges', async ({ request }) => {
    const body = await request.json();
    const charge = generateMockCharge(body);
    return HttpResponse.json(charge, { status: 201 });
  }),
];
```

**Test Suite:**
```typescript
describe('API Client', () => {
  setupMockServer();

  it('should create charge', async () => {
    const charge = await client.charges.create({
      amount: 2000,
      currency: 'usd',
    });

    expect(charge.id).toMatch(/^ch_/);
  });
});
```

## Workflows

### Workflow 1: Integrate with Stripe API

**Duration:** 15-20 minutes
**Output:** 4,000+ lines of production code

**Phases:**
1. **Discovery** (3-5 min) - Parse Stripe OpenAPI spec
2. **Planning** (2-3 min) - Design types and architecture
3. **Generation** (5-7 min) - Generate client, auth, error handling
4. **Testing** (3-5 min) - Generate mocks and test suite
5. **Documentation** (2-3 min) - Generate API docs and examples

**Deliverables:**
- Complete Stripe client with 50+ endpoints
- 500+ TypeScript types with Zod validation
- OAuth 2.0 and API key authentication
- Rate limiting (100 req/sec)
- MSW mock server with 50+ handlers
- 150+ test cases (85%+ coverage)
- Complete documentation

### Workflow 2: Generate Client from OpenAPI Spec

**Duration:** 10-15 minutes
**Output:** Production-ready client for any API

**Supports:**
- OpenAPI 2.0 (Swagger)
- OpenAPI 3.0
- OpenAPI 3.1
- Any API with OpenAPI documentation

## Project Structure

```
api-integration-helper/
├── plugin.json                    # Plugin metadata and configuration
├── README.md                      # This file
├── agents/                        # 10 specialized agents
│   ├── schema-parser-agent.md
│   ├── type-generator-agent.md
│   ├── client-generator-agent.md
│   ├── auth-builder-agent.md
│   ├── error-handler-agent.md
│   ├── rate-limiter-agent.md
│   ├── mock-server-agent.md
│   ├── validation-builder-agent.md
│   ├── test-generator-agent.md
│   └── api-explorer-agent.md
├── interfaces/                    # TypeScript interfaces
│   └── core.ts                    # Core data structures
├── workflows/                     # Integration workflows
│   ├── integrate-stripe-api.md
│   └── generate-openapi-client.md
└── examples/                      # Example generated code
    └── stripe-client-generated.ts
```

## Configuration

```json
{
  "defaultLanguage": "typescript",
  "typeGeneration": {
    "strictMode": true,
    "useZod": true,
    "useBrandedTypes": true
  },
  "authentication": {
    "defaultAuthType": "bearer",
    "enableTokenRefresh": true
  },
  "errorHandling": {
    "maxRetries": 3,
    "retryDelay": 1000,
    "useCircuitBreaker": true
  },
  "rateLimiting": {
    "enabled": true,
    "strategy": "token-bucket",
    "maxConcurrent": 10
  },
  "mockServer": {
    "framework": "msw",
    "generateRealisticData": true,
    "validateRequests": true
  },
  "testing": {
    "framework": "vitest",
    "coverageThreshold": 80
  }
}
```

## Quality Standards

All generated code must meet:

- ✅ **Type Safety:** 100% TypeScript strict mode
- ✅ **Test Coverage:** Minimum 80%
- ✅ **Documentation:** Complete API reference
- ✅ **Validation:** All requests/responses validated
- ✅ **Error Handling:** All error codes mapped
- ✅ **Rate Limiting:** Fully implemented
- ✅ **Authentication:** Production-ready flows
- ✅ **No `any` types:** Use `unknown` if necessary

## Use Cases

1. **Stripe Integration** - Generate production Stripe client in 15 minutes
2. **Third-Party APIs** - Generate clients for any OpenAPI-documented API
3. **Internal APIs** - Generate type-safe clients for microservices
4. **API Migration** - Replace vendor SDKs with custom clients
5. **GraphQL APIs** - Generate typed clients from GraphQL schemas
6. **Webhook Handlers** - Generate webhook verification and handling code

## Comparison with Alternatives

| Feature | Connector | openapi-generator | swagger-codegen |
|---------|-----------|-------------------|-----------------|
| Type Safety | Branded types, discriminated unions | Basic types | Basic types |
| Validation | Zod runtime validation | None | None |
| Authentication | OAuth 2.0, PKCE, JWT, custom | Basic | Basic |
| Error Handling | Typed errors, retry, circuit breaker | Basic | Basic |
| Rate Limiting | Token bucket, queuing, throttling | None | None |
| Mock Server | MSW with realistic data | None | None |
| Tests | Integration, E2E, contract (85%+) | Basic | None |
| Documentation | Complete with examples | API reference only | Basic |

## License

MIT

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Support

- **Documentation:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/Lobbi-Docs/claude/issues)
- **Email:** plugins@brooksidebi.com
