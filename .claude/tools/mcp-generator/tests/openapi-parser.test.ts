/**
 * Tests for OpenAPI Parser
 */

import { describe, it, expect } from 'vitest';
import { OpenAPIParser } from '../src/parsers/openapi-parser.js';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tests', 'fixtures');

// Ensure test directory exists
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

describe('OpenAPIParser', () => {
  describe('loadSpec', () => {
    it('should load and parse a valid OpenAPI 3.0 YAML spec', async () => {
      const specPath = join(TEST_DIR, 'test-openapi.yaml');
      const spec = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      responses:
        '200':
          description: Success
`;
      writeFileSync(specPath, spec, 'utf-8');

      const parser = new OpenAPIParser();
      const result = await parser.loadSpec(specPath);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.openapi).toBe('3.0.0');

      unlinkSync(specPath);
    });

    it('should load and parse a valid OpenAPI 3.1 JSON spec', async () => {
      const specPath = join(TEST_DIR, 'test-openapi.json');
      const spec = {
        openapi: '3.1.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              operationId: 'listUsers',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      };
      writeFileSync(specPath, JSON.stringify(spec), 'utf-8');

      const parser = new OpenAPIParser();
      const result = await parser.loadSpec(specPath);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.openapi).toBe('3.1.0');

      unlinkSync(specPath);
    });

    it('should fail for invalid OpenAPI version', async () => {
      const specPath = join(TEST_DIR, 'invalid-version.yaml');
      const spec = `
openapi: 2.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
`;
      writeFileSync(specPath, spec, 'utf-8');

      const parser = new OpenAPIParser();
      const result = await parser.loadSpec(specPath);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Unsupported OpenAPI version');

      unlinkSync(specPath);
    });
  });

  describe('parse', () => {
    it('should parse a simple GET endpoint', async () => {
      const specPath = join(TEST_DIR, 'simple-get.yaml');
      const spec = `
openapi: 3.0.0
info:
  title: Simple API
  version: 1.0.0
paths:
  /users/{id}:
    get:
      summary: Get user by ID
      operationId: getUserById
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
`;
      writeFileSync(specPath, spec, 'utf-8');

      const parser = new OpenAPIParser();
      await parser.loadSpec(specPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data?.tools).toHaveLength(1);
      expect(result.data?.tools[0].name).toBe('get_user_by_id');
      expect(result.data?.tools[0].inputSchema.properties).toHaveProperty('id');
      expect(result.data?.tools[0].inputSchema.required).toContain('id');

      unlinkSync(specPath);
    });

    it('should parse POST endpoint with request body', async () => {
      const specPath = join(TEST_DIR, 'post-with-body.yaml');
      const spec = `
openapi: 3.0.0
info:
  title: API with POST
  version: 1.0.0
paths:
  /users:
    post:
      summary: Create user
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                email:
                  type: string
              required:
                - name
                - email
      responses:
        '201':
          description: Created
`;
      writeFileSync(specPath, spec, 'utf-8');

      const parser = new OpenAPIParser();
      await parser.loadSpec(specPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data?.tools).toHaveLength(1);
      expect(result.data?.tools[0].name).toBe('create_user');
      expect(result.data?.tools[0].inputSchema.properties).toHaveProperty('name');
      expect(result.data?.tools[0].inputSchema.properties).toHaveProperty('email');
      expect(result.data?.tools[0].inputSchema.required).toContain('name');
      expect(result.data?.tools[0].inputSchema.required).toContain('email');

      unlinkSync(specPath);
    });

    it('should extract API key authentication', async () => {
      const specPath = join(TEST_DIR, 'api-with-auth.yaml');
      const spec = `
openapi: 3.0.0
info:
  title: Authenticated API
  version: 1.0.0
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
paths:
  /data:
    get:
      summary: Get data
      responses:
        '200':
          description: Success
`;
      writeFileSync(specPath, spec, 'utf-8');

      const parser = new OpenAPIParser();
      await parser.loadSpec(specPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data?.authentication).toBeDefined();
      expect(result.data?.authentication?.type).toBe('apiKey');
      expect(result.data?.authentication?.name).toBe('X-API-Key');
      expect(result.data?.authentication?.in).toBe('header');

      unlinkSync(specPath);
    });

    it('should extract base URL from servers', async () => {
      const specPath = join(TEST_DIR, 'api-with-servers.yaml');
      const spec = `
openapi: 3.0.0
info:
  title: API with Servers
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /data:
    get:
      summary: Get data
      responses:
        '200':
          description: Success
`;
      writeFileSync(specPath, spec, 'utf-8');

      const parser = new OpenAPIParser();
      await parser.loadSpec(specPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data?.baseUrl).toBe('https://api.example.com/v1');

      unlinkSync(specPath);
    });
  });
});
