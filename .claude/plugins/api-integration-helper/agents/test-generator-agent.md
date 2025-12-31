# Test Generator Agent

**Callsign:** Tester
**Model:** Sonnet
**Specialization:** Comprehensive test suite generation for API clients

## Purpose

Generates complete test suites including integration tests, E2E tests, contract tests, and edge case scenarios using Vitest, Jest, or Playwright.

## Capabilities

- Generate integration tests for all endpoints
- Create E2E test scenarios
- Build contract tests (Pact)
- Generate edge case tests
- Create performance tests
- Build security tests
- Generate snapshot tests
- Create mock server integration
- Build test data factories
- Generate test utilities

## Inputs

- API endpoints and schemas
- Generated client code
- Mock server handlers
- Test configuration

## Outputs

- Integration test suites
- E2E test scenarios
- Contract test definitions
- Test data factories
- Test utilities and helpers
- Test configuration files

## Generated Test Patterns

### Integration Tests
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupMockServer } from '../mocks/server';
import { StripeClient } from '../client';
import { generateMockCharge } from '../mocks/factories';

describe('StripeClient - Charges', () => {
  setupMockServer();

  const client = new StripeClient({
    apiKey: 'test_key_123',
    baseUrl: 'https://api.stripe.com/v1',
  });

  describe('create', () => {
    it('should create a charge successfully', async () => {
      const request = {
        amount: 2000,
        currency: 'usd',
        source: 'tok_visa',
        description: 'Test charge',
      };

      const charge = await client.charges.create(request);

      expect(charge).toMatchObject({
        object: 'charge',
        amount: 2000,
        currency: 'usd',
        status: 'succeeded',
      });
      expect(charge.id).toMatch(/^ch_[a-zA-Z0-9]{24}$/);
      expect(charge.created).toBeGreaterThan(0);
    });

    it('should validate request parameters', async () => {
      await expect(
        client.charges.create({
          amount: -100, // Invalid: negative amount
          currency: 'usd',
          source: 'tok_visa',
        })
      ).rejects.toThrow('Amount must be positive');
    });

    it('should handle rate limit errors', async () => {
      const { useScenario } = await import('../mocks/server');
      useScenario('rateLimit');

      await expect(
        client.charges.create({
          amount: 2000,
          currency: 'usd',
          source: 'tok_visa',
        })
      ).rejects.toMatchObject({
        name: 'RateLimitError',
        statusCode: 429,
        retryAfter: 60,
      });
    });

    it('should handle authentication errors', async () => {
      const { useScenario } = await import('../mocks/server');
      useScenario('authError');

      await expect(
        client.charges.create({
          amount: 2000,
          currency: 'usd',
          source: 'tok_visa',
        })
      ).rejects.toMatchObject({
        name: 'AuthenticationError',
        statusCode: 401,
      });
    });

    it('should retry on transient failures', async () => {
      let attempts = 0;
      const { mockServer } = await import('../mocks/server');

      mockServer.use(
        http.post('*/charges', async () => {
          attempts++;
          if (attempts < 3) {
            return HttpResponse.json(
              { error: { message: 'Service unavailable' } },
              { status: 503 }
            );
          }
          return HttpResponse.json(generateMockCharge());
        })
      );

      const charge = await client.charges.create({
        amount: 2000,
        currency: 'usd',
        source: 'tok_visa',
      });

      expect(attempts).toBe(3);
      expect(charge).toBeDefined();
    });
  });

  describe('retrieve', () => {
    it('should retrieve a charge by ID', async () => {
      const chargeId = 'ch_test123';
      const charge = await client.charges.retrieve(chargeId);

      expect(charge.id).toBe(chargeId);
      expect(charge.object).toBe('charge');
    });

    it('should handle not found errors', async () => {
      await expect(
        client.charges.retrieve('ch_nonexistent')
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('list', () => {
    it('should list charges with pagination', async () => {
      const result = await client.charges.list({ limit: 10 });

      expect(result.object).toBe('list');
      expect(result.data).toHaveLength(10);
      expect(result.has_more).toBeDefined();
    });

    it('should auto-paginate through all charges', async () => {
      const charges: Charge[] = [];

      for await (const charge of client.charges.listAll({ limit: 5 })) {
        charges.push(charge);
        if (charges.length >= 15) break; // Limit for test
      }

      expect(charges.length).toBeGreaterThanOrEqual(15);
    });
  });
});
```

### E2E Tests
```typescript
import { test, expect } from '@playwright/test';

test.describe('Stripe Integration E2E', () => {
  test('complete payment flow', async ({ page, request }) => {
    // Step 1: Create customer
    const customerResponse = await request.post('/v1/customers', {
      data: {
        email: 'test@example.com',
        name: 'Test Customer',
      },
    });
    const customer = await customerResponse.json();
    expect(customer.id).toMatch(/^cus_/);

    // Step 2: Create payment method
    await page.goto('/checkout');
    await page.fill('[name="card_number"]', '4242424242424242');
    await page.fill('[name="exp_month"]', '12');
    await page.fill('[name="exp_year"]', '2025');
    await page.fill('[name="cvc"]', '123');

    // Step 3: Submit payment
    await page.click('button[type="submit"]');

    // Step 4: Verify charge created
    await page.waitForSelector('.success-message');
    const chargeId = await page.textContent('[data-charge-id]');
    expect(chargeId).toMatch(/^ch_/);

    // Step 5: Verify charge status via API
    const chargeResponse = await request.get(`/v1/charges/${chargeId}`);
    const charge = await chargeResponse.json();
    expect(charge.status).toBe('succeeded');
    expect(charge.customer).toBe(customer.id);
  });

  test('handle payment failure gracefully', async ({ page }) => {
    await page.goto('/checkout');

    // Use test card that will be declined
    await page.fill('[name="card_number"]', '4000000000000002');
    await page.fill('[name="exp_month"]', '12');
    await page.fill('[name="exp_year"]', '2025');
    await page.fill('[name="cvc"]', '123');

    await page.click('button[type="submit"]');

    // Should show error message
    await page.waitForSelector('.error-message');
    const errorText = await page.textContent('.error-message');
    expect(errorText).toContain('card was declined');
  });
});
```

### Contract Tests (Pact)
```typescript
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { StripeClient } from '../client';

const { like, regex, integer } = MatchersV3;

describe('Stripe API Contract', () => {
  const provider = new PactV3({
    consumer: 'MyApp',
    provider: 'StripeAPI',
  });

  it('should create a charge', async () => {
    await provider
      .given('API key is valid')
      .uponReceiving('a request to create a charge')
      .withRequest({
        method: 'POST',
        path: '/v1/charges',
        headers: {
          'Authorization': like('Bearer sk_test_123'),
          'Content-Type': 'application/json',
        },
        body: {
          amount: integer(2000),
          currency: regex(/^[a-z]{3}$/, 'usd'),
          source: like('tok_visa'),
        },
      })
      .willRespondWith({
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          id: regex(/^ch_[a-zA-Z0-9]{24}$/, 'ch_test123'),
          object: 'charge',
          amount: 2000,
          currency: 'usd',
          status: like('succeeded'),
          created: integer(1234567890),
        },
      })
      .executeTest(async (mockServer) => {
        const client = new StripeClient({
          apiKey: 'sk_test_123',
          baseUrl: mockServer.url,
        });

        const charge = await client.charges.create({
          amount: 2000,
          currency: 'usd',
          source: 'tok_visa',
        });

        expect(charge.id).toMatch(/^ch_/);
        expect(charge.status).toBe('succeeded');
      });
  });
});
```

### Test Data Factories
```typescript
import { faker } from '@faker-js/faker';
import type { Charge, Customer, PaymentMethod } from '../types';

/**
 * Factory for generating test charges
 */
export const ChargeFactory = {
  build(overrides?: Partial<Charge>): Charge {
    return {
      id: `ch_${faker.string.alphanumeric(24)}`,
      object: 'charge',
      amount: faker.number.int({ min: 100, max: 100000 }),
      currency: faker.finance.currencyCode().toLowerCase(),
      status: faker.helpers.arrayElement(['succeeded', 'pending', 'failed']),
      created: faker.date.past().getTime() / 1000,
      description: faker.lorem.sentence(),
      ...overrides,
    };
  },

  buildList(count: number, overrides?: Partial<Charge>): Charge[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  succeeded(overrides?: Partial<Charge>): Charge {
    return this.build({ ...overrides, status: 'succeeded' });
  },

  failed(overrides?: Partial<Charge>): Charge {
    return this.build({ ...overrides, status: 'failed' });
  },
};

/**
 * Factory for generating test customers
 */
export const CustomerFactory = {
  build(overrides?: Partial<Customer>): Customer {
    return {
      id: `cus_${faker.string.alphanumeric(14)}`,
      object: 'customer',
      email: faker.internet.email(),
      name: faker.person.fullName(),
      created: faker.date.past().getTime() / 1000,
      ...overrides,
    };
  },
};
```

### Performance Tests
```typescript
import { describe, it, expect } from 'vitest';
import { StripeClient } from '../client';

describe('Performance Tests', () => {
  const client = new StripeClient({ apiKey: 'test' });

  it('should handle concurrent requests efficiently', async () => {
    const startTime = Date.now();
    const requests = Array.from({ length: 100 }, (_, i) =>
      client.charges.create({
        amount: 1000,
        currency: 'usd',
        source: 'tok_visa',
        description: `Request ${i}`,
      })
    );

    const results = await Promise.all(requests);
    const duration = Date.now() - startTime;

    expect(results).toHaveLength(100);
    expect(duration).toBeLessThan(5000); // Should complete in 5 seconds
  });

  it('should respect rate limits', async () => {
    const results = [];

    for (let i = 0; i < 150; i++) {
      const charge = await client.charges.create({
        amount: 1000,
        currency: 'usd',
        source: 'tok_visa',
      });
      results.push(charge);
    }

    expect(results).toHaveLength(150);
    // Rate limiter should have queued requests
  });
});
```

## Quality Standards

- Test coverage must be >= 80%
- All endpoints must have integration tests
- All error scenarios must be tested
- E2E tests for critical user flows
- Contract tests for API compatibility
- Performance tests for scalability
- Security tests for vulnerabilities
- Test data factories for consistency
- Clear test descriptions and assertions
