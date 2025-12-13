/**
 * Tests for MCP Generator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPGenerator } from '../src/generators/mcp-generator.js';
import type { ParsedAPI } from '../src/types.js';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_OUTPUT_DIR = join(process.cwd(), 'tests', 'output');

describe('MCPGenerator', () => {
  beforeEach(() => {
    // Clean up test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up after tests
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe('generate', () => {
    it('should generate a complete MCP server from OpenAPI spec', async () => {
      const api: ParsedAPI = {
        tools: [
          {
            name: 'get_users',
            description: 'Get all users',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'integer', description: 'Max results' },
              },
            },
          },
        ],
        authentication: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          envVar: 'API_KEY',
        },
        baseUrl: 'https://api.example.com',
        metadata: {
          title: 'Test API',
          version: '1.0.0',
          description: 'A test API',
          source: 'openapi',
        },
      };

      const generator = new MCPGenerator();
      const result = await generator.generate(api, {
        serverName: 'test-mcp-server',
        outputDir: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(TEST_OUTPUT_DIR);

      // Check generated files
      expect(existsSync(join(TEST_OUTPUT_DIR, 'index.ts'))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, 'package.json'))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, 'tsconfig.json'))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, 'README.md'))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, '.env.example'))).toBe(true);

      // Validate package.json
      const packageJson = JSON.parse(
        readFileSync(join(TEST_OUTPUT_DIR, 'package.json'), 'utf-8')
      );
      expect(packageJson.name).toBe('test-mcp-server');
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.dependencies).toHaveProperty('@modelcontextprotocol/sdk');
      expect(packageJson.dependencies).toHaveProperty('zod');
      expect(packageJson.dependencies).toHaveProperty('node-fetch');

      // Validate index.ts contains expected code
      const indexTs = readFileSync(join(TEST_OUTPUT_DIR, 'index.ts'), 'utf-8');
      expect(indexTs).toContain('get_users');
      expect(indexTs).toContain('X-API-Key');
      expect(indexTs).toContain('https://api.example.com');
    });

    it('should generate MCP server from GraphQL schema', async () => {
      const api: ParsedAPI = {
        tools: [
          {
            name: 'query_users',
            description: 'Query users',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'integer', description: 'Max results' },
              },
            },
            handler: 'query:users',
          },
          {
            name: 'mutation_create_user',
            description: 'Create user',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'User name' },
                email: { type: 'string', description: 'User email' },
              },
              required: ['name', 'email'],
            },
            handler: 'mutation:createUser',
          },
        ],
        metadata: {
          title: 'GraphQL API',
          version: '1.0.0',
          description: 'A GraphQL API',
          source: 'graphql',
        },
      };

      const generator = new MCPGenerator();
      const result = await generator.generate(api, {
        serverName: 'graphql-mcp-server',
        outputDir: TEST_OUTPUT_DIR,
      });

      expect(result.success).toBe(true);

      // Check generated files
      expect(existsSync(join(TEST_OUTPUT_DIR, 'index.ts'))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, 'package.json'))).toBe(true);

      // Validate package.json includes GraphQL dependencies
      const packageJson = JSON.parse(
        readFileSync(join(TEST_OUTPUT_DIR, 'package.json'), 'utf-8')
      );
      expect(packageJson.dependencies).toHaveProperty('graphql');
      expect(packageJson.dependencies).toHaveProperty('graphql-request');

      // Validate index.ts contains GraphQL handlers
      const indexTs = readFileSync(join(TEST_OUTPUT_DIR, 'index.ts'), 'utf-8');
      expect(indexTs).toContain('query_users');
      expect(indexTs).toContain('mutation_create_user');
      expect(indexTs).toContain('query:users');
      expect(indexTs).toContain('mutation:createUser');
    });

    it('should generate README with correct authentication docs', async () => {
      const api: ParsedAPI = {
        tools: [],
        authentication: {
          type: 'bearer',
          scheme: 'bearer',
          envVar: 'BEARER_TOKEN',
        },
        metadata: {
          title: 'Authenticated API',
          version: '1.0.0',
          source: 'openapi',
        },
      };

      const generator = new MCPGenerator();
      await generator.generate(api, {
        serverName: 'auth-mcp-server',
        outputDir: TEST_OUTPUT_DIR,
      });

      const readme = readFileSync(join(TEST_OUTPUT_DIR, 'README.md'), 'utf-8');
      expect(readme).toContain('Bearer Token Authentication');
      expect(readme).toContain('BEARER_TOKEN');
    });

    it('should generate .env.example for authenticated APIs', async () => {
      const api: ParsedAPI = {
        tools: [],
        authentication: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          envVar: 'MY_API_KEY',
        },
        metadata: {
          title: 'API',
          version: '1.0.0',
          source: 'openapi',
        },
      };

      const generator = new MCPGenerator();
      await generator.generate(api, {
        serverName: 'api-server',
        outputDir: TEST_OUTPUT_DIR,
      });

      expect(existsSync(join(TEST_OUTPUT_DIR, '.env.example'))).toBe(true);
      const envExample = readFileSync(
        join(TEST_OUTPUT_DIR, '.env.example'),
        'utf-8'
      );
      expect(envExample).toContain('MY_API_KEY');
    });

    it('should not generate .env.example for unauthenticated APIs', async () => {
      const api: ParsedAPI = {
        tools: [],
        metadata: {
          title: 'Public API',
          version: '1.0.0',
          source: 'openapi',
        },
      };

      const generator = new MCPGenerator();
      await generator.generate(api, {
        serverName: 'public-server',
        outputDir: TEST_OUTPUT_DIR,
      });

      expect(existsSync(join(TEST_OUTPUT_DIR, '.env.example'))).toBe(false);
    });
  });
});
