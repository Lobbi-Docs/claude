# Workflow: Integrate with Stripe API

**Objective:** Generate a complete, production-ready Stripe API client with authentication, types, validation, error handling, rate limiting, and tests.

**Estimated Duration:** 15-20 minutes
**Agents Required:** 8-10
**Complexity:** High

## Overview

This workflow demonstrates integrating with the Stripe API to create a fully-featured TypeScript client that includes:
- OAuth 2.0 and API key authentication
- Fully typed request/response interfaces
- Zod validation for runtime safety
- Exponential backoff retry logic
- Rate limiting and request queuing
- Circuit breaker for resilience
- MSW mock server for testing
- Comprehensive test suite

## Phase 1: Discovery & Analysis (3-5 min)

### Agents Involved
- **Schema Parser Agent** (Primary)
- **API Explorer Agent** (Support)

### Tasks

1. **Fetch Stripe OpenAPI Specification**
   ```bash
   curl https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json \
     -o stripe-openapi.json
   ```

2. **Parse Schema**
   - Parse OpenAPI 3.0 specification
   - Extract endpoint definitions
   - Identify authentication requirements
   - Discover rate limit specifications
   - Extract type definitions

3. **Explore Key Endpoints**
   Focus on core Stripe resources:
   - `/v1/charges` - Create and manage charges
   - `/v1/customers` - Customer management
   - `/v1/payment_intents` - Modern payment flow
   - `/v1/subscriptions` - Recurring billing
   - `/v1/invoices` - Invoice management

### Outputs
- Parsed schema with 100+ endpoints
- Authentication requirements: Bearer token
- Rate limits: 100 req/sec (live), 25 req/sec (test)
- Base URL: `https://api.stripe.com/v1`
- API version: Specified via header

---

## Phase 2: Planning & Design (2-3 min)

### Agents Involved
- **Type Generator Agent** (Primary)
- **Auth Builder Agent** (Primary)

### Tasks

1. **Design Type System**
   - Plan branded types for IDs (ChargeId, CustomerId, etc.)
   - Design discriminated unions for polymorphic types
   - Plan Zod schemas for validation
   - Design request/response type separation

2. **Plan Authentication Strategy**
   - API key authentication (primary)
   - Bearer token format: `Bearer sk_test_...`
   - Secure credential storage
   - Support for restricted keys

3. **Plan Client Architecture**
   ```typescript
   StripeClient
     ├── charges
     ├── customers
     ├── paymentIntents
     ├── subscriptions
     └── invoices
   ```

### Outputs
- Type system design document
- Authentication flow diagram
- Client architecture plan
- Integration checklist

---

## Phase 3: Code Generation (5-7 min)

### Agents Involved
- **Type Generator Agent** (Parallel)
- **Client Generator Agent** (Parallel)
- **Auth Builder Agent** (Parallel)
- **Error Handler Agent** (Parallel)
- **Rate Limiter Agent** (Parallel)

### Tasks (Parallel Execution)

#### Type Generator Agent
```typescript
// Generate types for Stripe resources
export interface Charge {
  readonly id: ChargeId;
  readonly object: 'charge';
  readonly amount: number;
  readonly currency: Currency;
  readonly status: ChargeStatus;
  readonly customer?: CustomerId;
  readonly description?: string;
  readonly metadata: Record<string, string>;
  readonly created: number;
}

export const ChargeSchema = z.object({
  id: z.string().regex(/^ch_[a-zA-Z0-9]{24}$/),
  object: z.literal('charge'),
  amount: z.number().int().positive(),
  currency: CurrencySchema,
  status: z.enum(['succeeded', 'pending', 'failed']),
  // ... more fields
});
```

#### Client Generator Agent
```typescript
export class StripeClient {
  public readonly charges = {
    create: async (params: CreateChargeRequest): Promise<Charge> => {
      return this.request({
        method: 'POST',
        path: '/charges',
        body: params,
        responseSchema: ChargeSchema,
      });
    },
    // ... more methods
  };
}
```

#### Auth Builder Agent
```typescript
export class StripeAuth {
  constructor(private apiKey: string) {}

  async authenticateRequest(request: Request): Promise<Request> {
    request.headers.set('Authorization', `Bearer ${this.apiKey}`);
    request.headers.set('Stripe-Version', '2023-10-16');
    return request;
  }
}
```

#### Error Handler Agent
```typescript
export class StripeError extends APIError {
  constructor(
    message: string,
    public readonly type: StripeErrorType,
    public readonly code?: string,
    statusCode?: number
  ) {
    super(message, statusCode);
  }
}

// Retry logic with exponential backoff
const retryHandler = new RetryHandler({
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504],
});
```

#### Rate Limiter Agent
```typescript
// Token bucket for Stripe rate limits
const rateLimiter = new TokenBucketRateLimiter({
  maxTokens: 100, // Stripe allows 100 req/sec
  refillRate: 100,
  refillInterval: 1000,
});

const requestQueue = new RequestQueue({
  maxConcurrent: 25,
  maxQueueSize: 1000,
});
```

### Outputs
- `src/types.ts` - 500+ lines of TypeScript types
- `src/schemas.ts` - Zod validation schemas
- `src/client.ts` - Main client implementation
- `src/auth.ts` - Authentication logic
- `src/errors.ts` - Error classes and handlers
- `src/rate-limiter.ts` - Rate limiting implementation

---

## Phase 4: Testing & Validation (3-5 min)

### Agents Involved
- **Mock Server Agent** (Parallel)
- **Validation Builder Agent** (Parallel)
- **Test Generator Agent** (Parallel)

### Tasks (Parallel Execution)

#### Mock Server Agent
```typescript
// Generate MSW handlers
export const stripeHandlers = [
  http.post('https://api.stripe.com/v1/charges', async ({ request }) => {
    const body = await request.json();
    const charge = generateMockCharge(body);
    return HttpResponse.json(charge, { status: 201 });
  }),
  // ... 50+ handlers for all endpoints
];
```

#### Validation Builder Agent
```typescript
// Add custom Stripe validators
export const StripeIdSchema = z
  .string()
  .refine(
    (id) => /^(ch|cus|pi|sub|in)_[a-zA-Z0-9]{24}$/.test(id),
    'Invalid Stripe ID format'
  );

export const CurrencySchema = z
  .string()
  .length(3)
  .toLowerCase()
  .refine(
    (code) => SUPPORTED_CURRENCIES.includes(code),
    'Unsupported currency'
  );
```

#### Test Generator Agent
```typescript
describe('StripeClient - Charges', () => {
  setupMockServer();

  it('should create a charge with valid parameters', async () => {
    const client = new StripeClient({ apiKey: 'sk_test_123' });

    const charge = await client.charges.create({
      amount: 2000,
      currency: 'usd',
      source: 'tok_visa',
    });

    expect(charge.id).toMatch(/^ch_/);
    expect(charge.amount).toBe(2000);
  });

  it('should handle rate limit errors gracefully', async () => {
    useScenario('rateLimit');

    await expect(
      client.charges.create({ amount: 2000, currency: 'usd', source: 'tok_visa' })
    ).rejects.toThrow(RateLimitError);
  });

  // ... 100+ test cases
});
```

### Outputs
- `src/__mocks__/handlers.ts` - MSW mock handlers
- `src/__mocks__/factories.ts` - Test data factories
- `src/__tests__/charges.test.ts` - 20+ test cases per resource
- `src/__tests__/integration.test.ts` - E2E integration tests
- Test coverage: >85%

---

## Phase 5: Documentation (2-3 min)

### Agents Involved
- **Documentation Generator Agent** (Primary)

### Tasks

1. **Generate Usage Documentation**
   ```markdown
   # Stripe Client

   ## Installation
   ```bash
   npm install @myorg/stripe-client
   ```

   ## Quick Start
   ```typescript
   import { StripeClient } from '@myorg/stripe-client';

   const stripe = new StripeClient({
     apiKey: process.env.STRIPE_API_KEY,
   });

   const charge = await stripe.charges.create({
     amount: 2000,
     currency: 'usd',
     source: 'tok_visa',
   });
   ```

2. **Generate API Reference**
   - Document all methods
   - Include type signatures
   - Add usage examples
   - Document error handling

3. **Generate Migration Guide**
   - If replacing stripe-node package
   - Highlight differences
   - Provide migration examples

### Outputs
- `README.md` - Getting started guide
- `docs/api-reference.md` - Complete API documentation
- `docs/examples.md` - Code examples
- `docs/error-handling.md` - Error handling guide
- `docs/rate-limiting.md` - Rate limiting strategies

---

## Final Artifacts

### Generated Files
```
stripe-client/
├── src/
│   ├── client.ts              # Main client (500 lines)
│   ├── types.ts               # TypeScript types (800 lines)
│   ├── schemas.ts             # Zod schemas (600 lines)
│   ├── auth.ts                # Authentication (100 lines)
│   ├── errors.ts              # Error classes (200 lines)
│   ├── rate-limiter.ts        # Rate limiting (300 lines)
│   ├── resources/
│   │   ├── charges.ts         # Charges resource
│   │   ├── customers.ts       # Customers resource
│   │   ├── payment-intents.ts # Payment intents resource
│   │   └── ...                # More resources
│   ├── __mocks__/
│   │   ├── handlers.ts        # MSW handlers (400 lines)
│   │   └── factories.ts       # Data factories (200 lines)
│   └── __tests__/
│       ├── charges.test.ts    # Charges tests (300 lines)
│       └── ...                # More tests
├── docs/
│   ├── api-reference.md
│   ├── examples.md
│   └── error-handling.md
├── package.json
├── tsconfig.json
└── README.md
```

### Quality Metrics
- **Type Safety:** 100% (strict TypeScript)
- **Test Coverage:** >85%
- **Documentation:** Complete API reference
- **Error Handling:** All error codes mapped
- **Rate Limiting:** Fully implemented
- **Validation:** Request/response validation

### Integration Time
- **Total Duration:** ~18 minutes
- **Lines of Code Generated:** ~4,000
- **Test Cases:** ~150
- **Endpoints Covered:** 50+

## Success Criteria

✅ All core Stripe endpoints implemented
✅ Full type safety with TypeScript strict mode
✅ Zod validation for all requests/responses
✅ OAuth 2.0 and API key authentication working
✅ Rate limiting prevents 429 errors
✅ Retry logic handles transient failures
✅ Circuit breaker prevents cascading failures
✅ MSW mock server for testing
✅ Test coverage >85%
✅ Complete documentation
✅ Production-ready client passes all quality gates
