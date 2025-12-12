/**
 * @claude-sdk/tools - REST API Builder Tool Tests
 * Comprehensive unit tests for REST API configuration and request building
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RestApiBuilderTool,
  RestApiRequestTool,
  RestApiDeleteTool,
} from '../../src/tools/api/rest-api-builder.js';
import type {
  RestApiConfigInput,
  RestApiRequestInput,
} from '../../src/tools/api/rest-api-builder.js';

// Mock HttpClientTool
vi.mock('../../src/tools/api/http-client.js', () => ({
  HttpClientTool: {
    execute: vi.fn(async (input) => ({
      success: true,
      data: {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { message: 'Success' },
        url: input.url,
        method: input.method,
        timing: {
          start: Date.now(),
          end: Date.now() + 100,
          duration: 100,
        },
      },
    })),
  },
}));

describe('RestApiBuilderTool', () => {
  const baseUrl = 'https://api.example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should accept valid REST API configuration', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.apiId).toBeDefined();
      expect(result.data?.baseUrl).toBe(baseUrl);
      expect(result.data?.authType).toBe('none');
    });

    it('should reject invalid base URL', async () => {
      const input = {
        baseUrl: 'not-a-valid-url',
        authentication: {
          type: 'none',
        },
      } as RestApiConfigInput;

      await expect(async () => {
        await RestApiBuilderTool.execute(input);
      }).rejects.toThrow();
    });

    it('should accept API version', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        version: 'v1',
        authentication: {
          type: 'none',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe('v1');
    });

    it('should accept default headers', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
        defaultHeaders: {
          'X-Client-Id': 'my-client',
          'Accept-Language': 'en-US',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should accept timeout and retries', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
        timeout: 10000,
        retries: 5,
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
    });
  });

  describe('Authentication - None', () => {
    it('should create API with no authentication', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.authType).toBe('none');
    });
  });

  describe('Authentication - Bearer Token', () => {
    it('should create API with bearer authentication', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'bearer',
          token: 'my-secret-token',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.authType).toBe('bearer');
    });

    it('should require token for bearer authentication', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'bearer',
          // Missing token
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('token');
    });
  });

  describe('Authentication - Basic', () => {
    it('should create API with basic authentication', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'basic',
          username: 'user',
          password: 'pass',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.authType).toBe('basic');
    });

    it('should require username and password for basic auth', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'basic',
          username: 'user',
          // Missing password
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('username and password');
    });
  });

  describe('Authentication - API Key', () => {
    it('should create API with API key authentication', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'apiKey',
          apiKey: 'my-api-key',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.authType).toBe('apiKey');
    });

    it('should use default API key header', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'apiKey',
          apiKey: 'my-api-key',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should accept custom API key header', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'apiKey',
          apiKey: 'my-api-key',
          apiKeyHeader: 'X-Custom-API-Key',
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should require API key for apiKey authentication', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'apiKey',
          // Missing apiKey
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('apiKey');
    });
  });

  describe('Authentication - Custom', () => {
    it('should create API with custom authentication headers', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'custom',
          customHeaders: {
            'X-Auth-Token': 'token123',
            'X-User-Id': 'user456',
          },
        },
      };

      const result = await RestApiBuilderTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.authType).toBe('custom');
    });
  });

  describe('API Configuration Storage', () => {
    it('should generate unique API IDs', async () => {
      const input: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
      };

      const result1 = await RestApiBuilderTool.execute(input);
      const result2 = await RestApiBuilderTool.execute(input);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.apiId).not.toBe(result2.data?.apiId);
    });

    it('should store multiple API configurations', async () => {
      const input1: RestApiConfigInput = {
        baseUrl: 'https://api1.example.com',
        authentication: { type: 'none' },
      };

      const input2: RestApiConfigInput = {
        baseUrl: 'https://api2.example.com',
        authentication: { type: 'bearer', token: 'token' },
      };

      const result1 = await RestApiBuilderTool.execute(input1);
      const result2 = await RestApiBuilderTool.execute(input2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data?.apiId).not.toBe(result2.data?.apiId);
    });
  });

  describe('REST API Requests', () => {
    let apiId: string;

    beforeEach(async () => {
      const config: RestApiConfigInput = {
        baseUrl,
        version: 'v1',
        authentication: {
          type: 'bearer',
          token: 'test-token',
        },
      };

      const result = await RestApiBuilderTool.execute(config);
      expect(result.success).toBe(true);
      apiId = result.data!.apiId;
    });

    it('should make GET request', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'GET',
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('GET');
    });

    it('should make POST request with body', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'POST',
        body: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('POST');
    });

    it('should make PUT request', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users/123',
        method: 'PUT',
        body: {
          name: 'Jane Doe',
        },
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('PUT');
    });

    it('should make PATCH request', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users/123',
        method: 'PATCH',
        body: {
          name: 'Updated Name',
        },
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('PATCH');
    });

    it('should make DELETE request', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users/123',
        method: 'DELETE',
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('DELETE');
    });

    it('should include query parameters', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'GET',
        queryParams: {
          page: 1,
          limit: 10,
          active: true,
        },
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should include custom headers', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'GET',
        headers: {
          'X-Request-Id': 'req-123',
          'X-Custom-Header': 'value',
        },
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should override timeout', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/slow-endpoint',
        method: 'GET',
        timeout: 60000,
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
    });

    it('should fail with non-existent API ID', async () => {
      const input: RestApiRequestInput = {
        apiId: 'non-existent-id',
        endpoint: '/users',
        method: 'GET',
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });
  });

  describe('URL Building', () => {
    let apiId: string;

    beforeEach(async () => {
      const config: RestApiConfigInput = {
        baseUrl: 'https://api.example.com',
        version: 'v2',
        authentication: {
          type: 'none',
        },
      };

      const result = await RestApiBuilderTool.execute(config);
      expect(result.success).toBe(true);
      apiId = result.data!.apiId;
    });

    it('should build URL with version', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'GET',
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.url).toContain('/v2/users');
    });

    it('should handle endpoint with leading slash', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'GET',
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      // Should not have double slashes
      expect(result.data?.url).not.toContain('//users');
    });

    it('should handle endpoint without leading slash', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: 'users',
        method: 'GET',
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.url).toContain('/users');
    });

    it('should handle nested endpoints', async () => {
      const input: RestApiRequestInput = {
        apiId,
        endpoint: '/users/123/posts/456',
        method: 'GET',
      };

      const result = await RestApiRequestTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.url).toContain('/users/123/posts/456');
    });
  });

  describe('Convenience Methods', () => {
    let apiId: string;

    beforeEach(async () => {
      const config: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
      };

      const result = await RestApiBuilderTool.execute(config);
      expect(result.success).toBe(true);
      apiId = result.data!.apiId;
    });

    it('should use convenience GET method', async () => {
      const result = await RestApiRequestTool.get(apiId, '/users');

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('GET');
    });

    it('should use convenience POST method', async () => {
      const body = { name: 'Test User' };
      const result = await RestApiRequestTool.post(apiId, '/users', body);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('POST');
    });

    it('should use convenience PUT method', async () => {
      const body = { name: 'Updated User' };
      const result = await RestApiRequestTool.put(apiId, '/users/123', body);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('PUT');
    });

    it('should use convenience PATCH method', async () => {
      const body = { name: 'Patched User' };
      const result = await RestApiRequestTool.patch(apiId, '/users/123', body);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('PATCH');
    });

    it('should use convenience DELETE method', async () => {
      const result = await RestApiRequestTool.delete(apiId, '/users/123');

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('DELETE');
    });
  });

  describe('API Deletion', () => {
    it('should delete API configuration', async () => {
      // Create API
      const config: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
      };

      const createResult = await RestApiBuilderTool.execute(config);
      expect(createResult.success).toBe(true);
      const apiId = createResult.data!.apiId;

      // Delete API
      const deleteResult = await RestApiDeleteTool.execute(apiId);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.data?.apiId).toBe(apiId);
      expect(deleteResult.data?.deleted).toBe(true);
    });

    it('should fail to delete non-existent API', async () => {
      const result = await RestApiDeleteTool.execute('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not found');
    });

    it('should not allow requests to deleted API', async () => {
      // Create and delete API
      const config: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
      };

      const createResult = await RestApiBuilderTool.execute(config);
      const apiId = createResult.data!.apiId;

      await RestApiDeleteTool.execute(apiId);

      // Try to make request
      const requestResult = await RestApiRequestTool.get(apiId, '/users');

      expect(requestResult.success).toBe(false);
      expect(requestResult.error?.message).toContain('not found');
    });
  });

  describe('Header Merging', () => {
    it('should merge default headers with request headers', async () => {
      const config: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
        defaultHeaders: {
          'X-Client-Id': 'my-client',
          'Accept': 'application/json',
        },
      };

      const createResult = await RestApiBuilderTool.execute(config);
      const apiId = createResult.data!.apiId;

      const requestInput: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'GET',
        headers: {
          'X-Request-Id': 'req-123',
        },
      };

      const result = await RestApiRequestTool.execute(requestInput);

      expect(result.success).toBe(true);
    });

    it('should allow request headers to override default headers', async () => {
      const config: RestApiConfigInput = {
        baseUrl,
        authentication: {
          type: 'none',
        },
        defaultHeaders: {
          'Accept': 'application/json',
        },
      };

      const createResult = await RestApiBuilderTool.execute(config);
      const apiId = createResult.data!.apiId;

      const requestInput: RestApiRequestInput = {
        apiId,
        endpoint: '/users',
        method: 'GET',
        headers: {
          'Accept': 'application/xml', // Override
        },
      };

      const result = await RestApiRequestTool.execute(requestInput);

      expect(result.success).toBe(true);
    });
  });

  describe('Tool Metadata', () => {
    it('RestApiBuilderTool should have correct metadata', () => {
      expect(RestApiBuilderTool.toolName).toBe('rest_api_create');
      expect(RestApiBuilderTool.description).toBeDefined();
      expect(typeof RestApiBuilderTool.description).toBe('string');
      expect(RestApiBuilderTool.schema).toBeDefined();
    });

    it('RestApiRequestTool should have correct metadata', () => {
      expect(RestApiRequestTool.toolName).toBe('rest_api_request');
      expect(RestApiRequestTool.description).toBeDefined();
      expect(RestApiRequestTool.schema).toBeDefined();
    });

    it('RestApiDeleteTool should have correct metadata', () => {
      expect(RestApiDeleteTool.toolName).toBe('rest_api_delete');
      expect(RestApiDeleteTool.description).toBeDefined();
    });
  });
});
