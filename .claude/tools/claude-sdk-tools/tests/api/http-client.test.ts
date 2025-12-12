/**
 * @claude-sdk/tools - HTTP Client Tool Tests
 * Comprehensive unit tests for HTTP client with all methods and error handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HttpClientTool } from '../../src/tools/api/http-client.js';
import type { HttpClientInput } from '../../src/tools/api/http-client.js';

describe('HttpClientTool', () => {
  // Test with httpbin.org for real HTTP testing
  const baseUrl = 'https://httpbin.org';

  describe('Schema Validation', () => {
    it('should accept valid URL', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/get`,
        method: 'GET',
      };

      const result = await HttpClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', async () => {
      const input = {
        url: 'not-a-valid-url',
        method: 'GET',
      } as HttpClientInput;

      await expect(async () => {
        await HttpClientTool.execute(input);
      }).rejects.toThrow();
    });

    it('should accept valid HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

      for (const method of methods) {
        const input: HttpClientInput = {
          url: `${baseUrl}/${method.toLowerCase()}`,
          method,
        };

        const result = await HttpClientTool.execute(input);
        expect(result.success).toBe(true);
      }
    });

    it('should use default method GET', async () => {
      const input = {
        url: `${baseUrl}/get`,
      } as HttpClientInput;

      const result = await HttpClientTool.execute(input);
      expect(result.success).toBe(true);
      expect(result.data?.method).toBe('GET');
    });

    it('should accept timeout parameter', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/get`,
        method: 'GET',
        timeout: 5000,
      };

      const result = await HttpClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should accept retries parameter', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/get`,
        method: 'GET',
        retries: 2,
      };

      const result = await HttpClientTool.execute(input);
      expect(result.success).toBe(true);
    });
  });

  describe('GET Requests', () => {
    it('should make successful GET request', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/get`);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
      expect(result.data?.method).toBe('GET');
    });

    it('should include query parameters in GET request', async () => {
      const queryParams = {
        foo: 'bar',
        baz: 123,
        active: true,
      };

      const result = await HttpClientTool.get(`${baseUrl}/get`, { queryParams });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.args).toMatchObject({
        foo: 'bar',
        baz: '123',
        active: 'true',
      });
    });

    it('should include custom headers in GET request', async () => {
      const headers = {
        'X-Custom-Header': 'test-value',
        'X-Another-Header': 'another-value',
      };

      const result = await HttpClientTool.get(`${baseUrl}/get`, { headers });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.headers['X-Custom-Header']).toBe('test-value');
      expect(responseData.headers['X-Another-Header']).toBe('another-value');
    });

    it('should return timing information', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/get`);

      expect(result.success).toBe(true);
      expect(result.data?.timing).toBeDefined();
      expect(result.data?.timing.start).toBeGreaterThan(0);
      expect(result.data?.timing.end).toBeGreaterThan(result.data?.timing.start!);
      expect(result.data?.timing.duration).toBeGreaterThan(0);
    });
  });

  describe('POST Requests', () => {
    it('should make POST request with JSON body', async () => {
      const body = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = await HttpClientTool.post(`${baseUrl}/post`, body);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
      const responseData = result.data?.data as any;
      expect(responseData.json).toMatchObject(body);
    });

    it('should make POST request with string body', async () => {
      const body = 'plain text content';

      const result = await HttpClientTool.post(`${baseUrl}/post`, body);

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.data).toBe(body);
    });

    it('should auto-detect Content-Type for JSON', async () => {
      const body = { test: 'value' };

      const result = await HttpClientTool.post(`${baseUrl}/post`, body);

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.headers['Content-Type']).toContain('application/json');
    });

    it('should auto-detect Content-Type for plain text', async () => {
      const body = 'test string';

      const result = await HttpClientTool.post(`${baseUrl}/post`, body);

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.headers['Content-Type']).toContain('text/plain');
    });

    it('should allow custom Content-Type header', async () => {
      const body = { test: 'value' };
      const headers = {
        'Content-Type': 'application/xml',
      };

      const result = await HttpClientTool.post(`${baseUrl}/post`, body, { headers });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.headers['Content-Type']).toContain('application/xml');
    });
  });

  describe('PUT Requests', () => {
    it('should make PUT request with body', async () => {
      const body = { updated: 'data' };

      const result = await HttpClientTool.put(`${baseUrl}/put`, body);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
      const responseData = result.data?.data as any;
      expect(responseData.json).toMatchObject(body);
    });
  });

  describe('PATCH Requests', () => {
    it('should make PATCH request with body', async () => {
      const body = { patched: 'field' };

      const result = await HttpClientTool.patch(`${baseUrl}/patch`, body);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
      const responseData = result.data?.data as any;
      expect(responseData.json).toMatchObject(body);
    });
  });

  describe('DELETE Requests', () => {
    it('should make DELETE request', async () => {
      const result = await HttpClientTool.delete(`${baseUrl}/delete`);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
      expect(result.data?.method).toBe('DELETE');
    });

    it('should include query parameters in DELETE request', async () => {
      const queryParams = { id: '123' };

      const result = await HttpClientTool.delete(`${baseUrl}/delete`, { queryParams });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.args).toMatchObject({ id: '123' });
    });
  });

  describe('HEAD Requests', () => {
    it('should make HEAD request', async () => {
      const result = await HttpClientTool.head(`${baseUrl}/get`);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
      expect(result.data?.method).toBe('HEAD');
      // HEAD requests should not have a body
      expect(result.data?.data).toBeNull();
    });
  });

  describe('OPTIONS Requests', () => {
    it('should make OPTIONS request', async () => {
      const result = await HttpClientTool.options(`${baseUrl}/get`);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
      // OPTIONS typically returns allowed methods in headers
      expect(result.data?.headers).toBeDefined();
    });
  });

  describe('Response Types', () => {
    it('should parse JSON response', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/json`,
        method: 'GET',
        responseType: 'json',
      };

      const result = await HttpClientTool.execute(input);

      expect(result.success).toBe(true);
      expect(typeof result.data?.data).toBe('object');
    });

    it('should parse text response', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/html`,
        method: 'GET',
        responseType: 'text',
      };

      const result = await HttpClientTool.execute(input);

      expect(result.success).toBe(true);
      expect(typeof result.data?.data).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 Not Found', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/status/404`);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('404');
    });

    it('should handle 500 Internal Server Error', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/status/500`);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('500');
    });

    it('should handle 401 Unauthorized', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/status/401`);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('401');
    });

    it('should handle 403 Forbidden', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/status/403`);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('403');
    });

    it('should handle timeout errors', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/delay/10`, // 10 second delay
        method: 'GET',
        timeout: 1000, // 1 second timeout
        retries: 0, // No retries
      };

      const result = await HttpClientTool.execute(input);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    }, 15000); // Increase test timeout

    it('should use custom validateStatus function', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/status/404`,
        method: 'GET',
        validateStatus: (status) => status === 404, // Accept 404 as valid
      };

      const result = await HttpClientTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(404);
    });
  });

  describe('Headers', () => {
    it('should include User-Agent header', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/headers`);

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.headers['User-Agent']).toContain('@claude-sdk/tools');
    });

    it('should return response headers', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/response-headers?X-Test=value`);

      expect(result.success).toBe(true);
      expect(result.data?.headers).toBeDefined();
      expect(typeof result.data?.headers).toBe('object');
    });

    it('should merge custom headers with defaults', async () => {
      const headers = {
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2',
      };

      const result = await HttpClientTool.get(`${baseUrl}/headers`, { headers });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.headers['X-Custom-1']).toBe('value1');
      expect(responseData.headers['X-Custom-2']).toBe('value2');
      expect(responseData.headers['User-Agent']).toContain('@claude-sdk/tools');
    });
  });

  describe('Redirects', () => {
    it('should follow redirects by default', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/redirect/2`,
        method: 'GET',
        followRedirects: true,
      };

      const result = await HttpClientTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
    });

    it('should not follow redirects when disabled', async () => {
      const input: HttpClientInput = {
        url: `${baseUrl}/redirect/1`,
        method: 'GET',
        followRedirects: false,
        validateStatus: (status) => status >= 300 && status < 400,
      };

      const result = await HttpClientTool.execute(input);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBeGreaterThanOrEqual(300);
      expect(result.data?.status).toBeLessThan(400);
    });
  });

  describe('Query Parameters', () => {
    it('should build URL with single query parameter', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/get`, {
        queryParams: { key: 'value' },
      });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.args.key).toBe('value');
    });

    it('should build URL with multiple query parameters', async () => {
      const queryParams = {
        param1: 'value1',
        param2: 'value2',
        param3: 'value3',
      };

      const result = await HttpClientTool.get(`${baseUrl}/get`, { queryParams });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.args).toMatchObject(queryParams);
    });

    it('should handle different query parameter types', async () => {
      const queryParams = {
        stringParam: 'text',
        numberParam: 42,
        booleanParam: true,
      };

      const result = await HttpClientTool.get(`${baseUrl}/get`, { queryParams });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.args.stringParam).toBe('text');
      expect(responseData.args.numberParam).toBe('42');
      expect(responseData.args.booleanParam).toBe('true');
    });

    it('should preserve existing query parameters in URL', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/get?existing=param`, {
        queryParams: { new: 'param' },
      });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.args.existing).toBe('param');
      expect(responseData.args.new).toBe('param');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      const result = await HttpClientTool.get(`${baseUrl}/status/204`); // No Content

      // 204 No Content is not considered "ok" by default
      expect(result.success).toBe(false);
      expect(result.data?.status).toBe(204);
    });

    it('should handle large response', async () => {
      // Request large amount of data
      const result = await HttpClientTool.get(`${baseUrl}/bytes/10000`);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe(200);
    });

    it('should handle special characters in query params', async () => {
      const queryParams = {
        special: 'hello world!@#$%',
      };

      const result = await HttpClientTool.get(`${baseUrl}/get`, { queryParams });

      expect(result.success).toBe(true);
      const responseData = result.data?.data as any;
      expect(responseData.args.special).toBe('hello world!@#$%');
    });
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(HttpClientTool.toolName).toBe('http_client');
    });

    it('should have description', () => {
      expect(HttpClientTool.description).toBeDefined();
      expect(typeof HttpClientTool.description).toBe('string');
      expect(HttpClientTool.description.length).toBeGreaterThan(0);
    });

    it('should have schema', () => {
      expect(HttpClientTool.schema).toBeDefined();
    });
  });
});
