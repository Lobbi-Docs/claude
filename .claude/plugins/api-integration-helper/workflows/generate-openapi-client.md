# Workflow: Generate Client from OpenAPI Spec

**Objective:** Automatically generate a fully-typed, production-ready API client from any OpenAPI 3.0/3.1 specification.

**Estimated Duration:** 10-15 minutes
**Agents Required:** 6-8
**Complexity:** Medium-High

## Overview

This is a generic workflow that works with any OpenAPI specification. It demonstrates the plugin's ability to generate production-quality clients for any API documented with OpenAPI.

## Input Requirements

- OpenAPI 3.0 or 3.1 specification (JSON or YAML)
- API credentials (if available)
- Base URL (if not in spec)
- Configuration preferences

## Workflow Steps

### Step 1: Parse OpenAPI Specification (2 min)

**Agent:** Schema Parser Agent

**Input:**
```bash
# Can accept URL, file path, or inline JSON
npx connector parse-openapi ./api-spec.yaml
```

**Actions:**
1. Auto-detect OpenAPI version (2.0, 3.0, 3.1)
2. Validate specification structure
3. Extract all endpoints and operations
4. Parse component schemas (types)
5. Identify authentication schemes
6. Extract server configurations
7. Parse tags and groups
8. Identify deprecated operations

**Output:**
```typescript
{
  type: 'openapi',
  version: '3.1.0',
  metadata: {
    title: 'Pet Store API',
    version: '1.0.0',
    baseUrl: 'https://api.petstore.com/v1',
    authentication: {
      type: 'api-key',
      scheme: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    }
  },
  parsed: {
    endpoints: [/* 25 endpoints */],
    types: [/* 15 type definitions */],
    enums: [/* 5 enums */]
  }
}
```

---

### Step 2: Generate Type Definitions (2-3 min)

**Agent:** Type Generator Agent

**Actions:**
1. Generate TypeScript interfaces from schemas
2. Create branded types for IDs and special strings
3. Build discriminated unions for oneOf/anyOf
4. Generate enums from enum values
5. Create Zod schemas for validation
6. Generate type guards
7. Add JSDoc comments from descriptions

**Generated Types:**
```typescript
// src/types.ts

/**
 * Pet object
 */
export interface Pet {
  readonly id: PetId;
  name: string;
  category?: Category;
  photoUrls: string[];
  tags?: Tag[];
  status: PetStatus;
}

/**
 * Branded type for Pet ID
 */
declare const PetIdBrand: unique symbol;
export type PetId = number & { readonly [PetIdBrand]: typeof PetIdBrand };

/**
 * Pet status enum
 */
export enum PetStatus {
  Available = 'available',
  Pending = 'pending',
  Sold = 'sold',
}

/**
 * Category object
 */
export interface Category {
  readonly id: number;
  name: string;
}

/**
 * Tag object
 */
export interface Tag {
  readonly id: number;
  name: string;
}
```

**Generated Schemas:**
```typescript
// src/schemas.ts

import { z } from 'zod';

export const PetStatusSchema = z.enum(['available', 'pending', 'sold']);

export const CategorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
});

export const TagSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
});

export const PetSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  category: CategorySchema.optional(),
  photoUrls: z.array(z.string().url()),
  tags: z.array(TagSchema).optional(),
  status: PetStatusSchema,
});

export type Pet = z.infer<typeof PetSchema>;
```

---

### Step 3: Implement Authentication (1-2 min)

**Agent:** Auth Builder Agent

**Actions:**
1. Detect authentication type from spec
2. Generate auth manager class
3. Implement token/key handling
4. Create auth interceptor
5. Add credential storage

**Generated Auth (API Key Example):**
```typescript
// src/auth.ts

export interface PetStoreAuthConfig {
  apiKey: string;
}

export class PetStoreAuth {
  constructor(private config: PetStoreAuthConfig) {}

  /**
   * Add API key to request headers
   */
  async authenticateRequest(request: Request): Promise<Request> {
    request.headers.set('X-API-Key', this.config.apiKey);
    return request;
  }

  /**
   * Validate API key format
   */
  validateCredentials(): boolean {
    return this.config.apiKey.length >= 32;
  }
}
```

**Generated Auth (OAuth 2.0 Example):**
```typescript
// src/auth.ts

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export class OAuth2Manager {
  // ... (full OAuth 2.0 implementation with PKCE)
}
```

---

### Step 4: Generate Client Code (3-4 min)

**Agent:** Client Generator Agent

**Actions:**
1. Create main client class
2. Group endpoints by tags
3. Generate method for each operation
4. Add request builders
5. Implement response parsing
6. Add pagination support
7. Generate fluent API

**Generated Client:**
```typescript
// src/client.ts

import type { Pet, PetStatus, Category, Tag } from './types';
import { PetSchema } from './schemas';
import { PetStoreAuth } from './auth';

export interface PetStoreConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export class PetStoreClient {
  private auth: PetStoreAuth;
  private baseUrl: string;
  private config: Required<PetStoreConfig>;

  constructor(config: PetStoreConfig) {
    this.config = {
      baseUrl: 'https://api.petstore.com/v1',
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
    this.auth = new PetStoreAuth({ apiKey: config.apiKey });
    this.baseUrl = this.config.baseUrl;
  }

  /**
   * Pet operations
   */
  public readonly pets = {
    /**
     * Find pets by status
     *
     * @param status - Pet status filter
     * @returns Array of pets matching the status
     */
    findByStatus: async (status: PetStatus): Promise<Pet[]> => {
      const response = await this.request<Pet[]>({
        method: 'GET',
        path: '/pets/findByStatus',
        query: { status },
      });

      return z.array(PetSchema).parse(response);
    },

    /**
     * Get pet by ID
     *
     * @param id - Pet ID
     * @returns Pet object
     */
    getById: async (id: PetId): Promise<Pet> => {
      const response = await this.request<Pet>({
        method: 'GET',
        path: `/pets/${id}`,
      });

      return PetSchema.parse(response);
    },

    /**
     * Create a new pet
     *
     * @param pet - Pet data
     * @returns Created pet object
     */
    create: async (pet: Omit<Pet, 'id'>): Promise<Pet> => {
      const validated = PetSchema.omit({ id: true }).parse(pet);

      const response = await this.request<Pet>({
        method: 'POST',
        path: '/pets',
        body: validated,
      });

      return PetSchema.parse(response);
    },

    /**
     * Update an existing pet
     *
     * @param id - Pet ID
     * @param updates - Partial pet data
     * @returns Updated pet object
     */
    update: async (id: PetId, updates: Partial<Pet>): Promise<Pet> => {
      const response = await this.request<Pet>({
        method: 'PATCH',
        path: `/pets/${id}`,
        body: updates,
      });

      return PetSchema.parse(response);
    },

    /**
     * Delete a pet
     *
     * @param id - Pet ID
     */
    delete: async (id: PetId): Promise<void> => {
      await this.request<void>({
        method: 'DELETE',
        path: `/pets/${id}`,
      });
    },
  };

  /**
   * Category operations
   */
  public readonly categories = {
    list: async (): Promise<Category[]> => {
      const response = await this.request<Category[]>({
        method: 'GET',
        path: '/categories',
      });

      return z.array(CategorySchema).parse(response);
    },

    create: async (category: Omit<Category, 'id'>): Promise<Category> => {
      const response = await this.request<Category>({
        method: 'POST',
        path: '/categories',
        body: category,
      });

      return CategorySchema.parse(response);
    },
  };

  /**
   * Core request method
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    let request = new Request(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Authenticate request
    request = await this.auth.authenticateRequest(request);

    // Execute with retry logic
    const response = await this.executeWithRetry(() => fetch(request));

    // Handle errors
    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    // Parse response
    if (response.status === 204 || options.method === 'DELETE') {
      return undefined as T;
    }

    return await response.json() as T;
  }

  private buildUrl(path: string, query?: Record<string, any>): string {
    const url = new URL(path, this.baseUrl);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.config.maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const error = await response.json().catch(() => ({}));

    throw new PetStoreError(
      error.message || 'API request failed',
      response.status,
      error.code
    );
  }
}
```

---

### Step 5: Generate Error Handling & Resilience (2 min)

**Agents:** Error Handler Agent + Rate Limiter Agent (Parallel)

**Generated Error Classes:**
```typescript
// src/errors.ts

export class PetStoreError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'PetStoreError';
  }
}

export class ValidationError extends PetStoreError {
  constructor(message: string, public readonly errors: any[]) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends PetStoreError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}
```

---

### Step 6: Generate Tests & Mocks (2-3 min)

**Agents:** Mock Server Agent + Test Generator Agent (Parallel)

**Generated Mock Handlers:**
```typescript
// src/__mocks__/handlers.ts

import { http, HttpResponse } from 'msw';
import { generateMockPet } from './factories';

export const petStoreHandlers = [
  http.get('*/pets/findByStatus', ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const pets = Array.from({ length: 5 }, () =>
      generateMockPet({ status })
    );

    return HttpResponse.json(pets);
  }),

  http.get('*/pets/:id', ({ params }) => {
    const pet = generateMockPet({ id: Number(params.id) });
    return HttpResponse.json(pet);
  }),

  http.post('*/pets', async ({ request }) => {
    const body = await request.json();
    const pet = generateMockPet(body);
    return HttpResponse.json(pet, { status: 201 });
  }),
];
```

**Generated Tests:**
```typescript
// src/__tests__/pets.test.ts

import { describe, it, expect } from 'vitest';
import { setupMockServer } from '../__mocks__/server';
import { PetStoreClient } from '../client';
import { PetStatus } from '../types';

describe('PetStoreClient - Pets', () => {
  setupMockServer();

  const client = new PetStoreClient({
    apiKey: 'test_key_123',
  });

  it('should find pets by status', async () => {
    const pets = await client.pets.findByStatus(PetStatus.Available);

    expect(pets).toHaveLength(5);
    expect(pets[0].status).toBe(PetStatus.Available);
  });

  it('should get pet by ID', async () => {
    const pet = await client.pets.getById(1 as PetId);

    expect(pet.id).toBe(1);
    expect(pet).toHaveProperty('name');
  });

  it('should create a new pet', async () => {
    const newPet = {
      name: 'Fluffy',
      photoUrls: ['https://example.com/fluffy.jpg'],
      status: PetStatus.Available,
    };

    const created = await client.pets.create(newPet);

    expect(created).toHaveProperty('id');
    expect(created.name).toBe('Fluffy');
  });
});
```

---

### Step 7: Generate Documentation (1-2 min)

**Agent:** Documentation Generator Agent

**Generated README:**
```markdown
# Pet Store API Client

Production-ready TypeScript client for the Pet Store API.

## Installation

```bash
npm install @myorg/petstore-client
```

## Quick Start

```typescript
import { PetStoreClient, PetStatus } from '@myorg/petstore-client';

const client = new PetStoreClient({
  apiKey: process.env.PETSTORE_API_KEY,
});

// Find available pets
const pets = await client.pets.findByStatus(PetStatus.Available);

// Get specific pet
const pet = await client.pets.getById(123);

// Create new pet
const newPet = await client.pets.create({
  name: 'Fluffy',
  photoUrls: ['https://example.com/fluffy.jpg'],
  status: PetStatus.Available,
});
```

## Features

- ✅ Full TypeScript support with strict types
- ✅ Runtime validation with Zod
- ✅ Automatic retry with exponential backoff
- ✅ Comprehensive error handling
- ✅ MSW mocks for testing
- ✅ 85%+ test coverage

## API Reference

See [API Documentation](./docs/api-reference.md) for detailed method signatures.
```

---

## Final Output

### Generated File Structure
```
petstore-client/
├── src/
│   ├── client.ts           # Main client (300 lines)
│   ├── types.ts            # TypeScript types (200 lines)
│   ├── schemas.ts          # Zod schemas (150 lines)
│   ├── auth.ts             # Authentication (50 lines)
│   ├── errors.ts           # Error classes (100 lines)
│   ├── __mocks__/
│   │   ├── handlers.ts     # MSW handlers (150 lines)
│   │   └── factories.ts    # Data factories (100 lines)
│   └── __tests__/
│       └── pets.test.ts    # Tests (200 lines)
├── docs/
│   └── api-reference.md
├── package.json
└── README.md
```

### Quality Metrics
- **Lines of Code:** ~1,250
- **Type Safety:** 100%
- **Test Coverage:** >85%
- **Time to Generate:** ~12 minutes
- **Endpoints:** All endpoints from spec
- **Documentation:** Complete

## Success Criteria

✅ Client compiles with TypeScript strict mode
✅ All endpoints from OpenAPI spec implemented
✅ Request/response validation with Zod
✅ Authentication working
✅ Error handling comprehensive
✅ MSW mocks for all endpoints
✅ Tests passing with >85% coverage
✅ Documentation generated
✅ Ready for production use
