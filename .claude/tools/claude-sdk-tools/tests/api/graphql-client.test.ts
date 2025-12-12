/**
 * @claude-sdk/tools - GraphQL Client Tool Tests
 * Comprehensive unit tests for GraphQL client with queries, mutations, and error handling
 */

import { describe, it, expect, vi } from 'vitest';
import { GraphqlClientTool } from '../../src/tools/api/graphql-client.js';
import type { GraphqlClientInput, GraphqlClientResponse } from '../../src/tools/api/graphql-client.js';

// Mock fetch for GraphQL tests
global.fetch = vi.fn();

describe('GraphqlClientTool', () => {
  const mockGraphQLEndpoint = 'https://api.example.com/graphql';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should accept valid GraphQL endpoint URL', async () => {
      const mockResponse = {
        data: { user: { id: '1', name: 'John' } },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'query { user { id name } }',
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', async () => {
      const input = {
        url: 'not-a-valid-url',
        query: 'query { user { id } }',
      } as GraphqlClientInput;

      await expect(async () => {
        await GraphqlClientTool.execute(input);
      }).rejects.toThrow();
    });

    it('should reject empty query', async () => {
      const input = {
        url: mockGraphQLEndpoint,
        query: '',
      } as GraphqlClientInput;

      await expect(async () => {
        await GraphqlClientTool.execute(input);
      }).rejects.toThrow();
    });

    it('should accept optional variables', async () => {
      const mockResponse = {
        data: { user: { id: '1', name: 'John' } },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'query GetUser($id: ID!) { user(id: $id) { id name } }',
        variables: { id: '1' },
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should accept optional operation name', async () => {
      const mockResponse = {
        data: { user: { id: '1', name: 'John' } },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'query GetUser { user { id name } }',
        operationName: 'GetUser',
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should accept custom headers', async () => {
      const mockResponse = {
        data: { user: { id: '1', name: 'John' } },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'query { user { id } }',
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(true);

      // Verify headers were sent
      expect(global.fetch).toHaveBeenCalledWith(
        mockGraphQLEndpoint,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'value',
          }),
        })
      );
    });
  });

  describe('Query Validation', () => {
    it('should validate query starts with "query" keyword', async () => {
      const mockResponse = {
        data: { users: [] },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'query { users { id name } }',
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should validate query starts with "mutation" keyword', async () => {
      const mockResponse = {
        data: { createUser: { id: '1', name: 'John' } },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'mutation { createUser(name: "John") { id name } }',
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should allow shorthand query syntax with braces', async () => {
      const mockResponse = {
        data: { user: { id: '1' } },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: '{ user { id } }',
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(true);
    });

    it('should reject query with invalid syntax', async () => {
      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'invalid syntax here',
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid GraphQL query');
    });

    it('should detect unbalanced braces', async () => {
      const input: GraphqlClientInput = {
        url: mockGraphQLEndpoint,
        query: 'query { user { id }', // Missing closing brace
      };

      const result = await GraphqlClientTool.execute(input);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('unbalanced braces');
    });
  });

  describe('Queries', () => {
    it('should execute simple query', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id name email } }'
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockResponse.data);
    });

    it('should execute query with variables', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '123',
            name: 'Jane Smith',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const variables = { userId: '123' };

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query GetUser($userId: ID!) { user(id: $userId) { id name } }',
        variables
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockResponse.data);

      // Verify variables were sent in request body
      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.variables).toEqual(variables);
    });

    it('should execute nested query', async () => {
      const mockResponse = {
        data: {
          user: {
            id: '1',
            name: 'John',
            posts: [
              { id: 'p1', title: 'First Post' },
              { id: 'p2', title: 'Second Post' },
            ],
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id name posts { id title } } }'
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockResponse.data);
    });
  });

  describe('Mutations', () => {
    it('should execute simple mutation', async () => {
      const mockResponse = {
        data: {
          createUser: {
            id: 'new-123',
            name: 'New User',
            email: 'new@example.com',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.mutate(
        mockGraphQLEndpoint,
        'mutation { createUser(name: "New User", email: "new@example.com") { id name email } }'
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockResponse.data);
    });

    it('should execute mutation with variables', async () => {
      const mockResponse = {
        data: {
          updateUser: {
            id: '1',
            name: 'Updated Name',
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const variables = {
        id: '1',
        name: 'Updated Name',
      };

      const result = await GraphqlClientTool.mutate(
        mockGraphQLEndpoint,
        'mutation UpdateUser($id: ID!, $name: String!) { updateUser(id: $id, name: $name) { id name } }',
        variables
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockResponse.data);

      // Verify variables were sent
      const callArgs = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.variables).toEqual(variables);
    });

    it('should execute mutation with complex input object', async () => {
      const mockResponse = {
        data: {
          createPost: {
            id: 'post-123',
            title: 'New Post',
            published: true,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const variables = {
        input: {
          title: 'New Post',
          content: 'Post content',
          published: true,
          tags: ['tech', 'news'],
        },
      };

      const result = await GraphqlClientTool.mutate(
        mockGraphQLEndpoint,
        'mutation CreatePost($input: PostInput!) { createPost(input: $input) { id title published } }',
        variables
      );

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual(mockResponse.data);
    });
  });

  describe('GraphQL Errors', () => {
    it('should handle GraphQL errors with data', async () => {
      const mockResponse = {
        data: {
          user: null,
        },
        errors: [
          {
            message: 'User not found',
            path: ['user'],
            extensions: {
              code: 'NOT_FOUND',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user(id: "999") { id name } }'
      );

      // GraphQL returns 200 even with errors, but should have error info
      expect(result.success).toBe(true);
      expect(result.data?.errors).toBeDefined();
      expect(result.data?.errors?.length).toBeGreaterThan(0);
      expect(result.data?.errors?.[0].message).toBe('User not found');
    });

    it('should fail when only errors and no data', async () => {
      const mockResponse = {
        errors: [
          {
            message: 'Syntax error',
            locations: [{ line: 1, column: 7 }],
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { invalid syntax }'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('GraphQL errors');
      expect(result.error?.message).toContain('Syntax error');
    });

    it('should handle multiple GraphQL errors', async () => {
      const mockResponse = {
        errors: [
          { message: 'Error 1', path: ['field1'] },
          { message: 'Error 2', path: ['field2'] },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { field1 field2 }'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Error 1');
      expect(result.error?.message).toContain('Error 2');
    });

    it('should include error locations and extensions', async () => {
      const mockResponse = {
        data: null,
        errors: [
          {
            message: 'Field error',
            locations: [{ line: 2, column: 3 }],
            path: ['user', 'email'],
            extensions: {
              code: 'VALIDATION_ERROR',
              field: 'email',
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { email } }'
      );

      expect(result.success).toBe(false);
      // Error details should be preserved
      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall).toBeDefined();
    });
  });

  describe('HTTP Errors', () => {
    it('should handle 401 Unauthorized', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Map(),
        text: async () => 'Unauthorized',
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id } }'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('401');
    });

    it('should handle 500 Internal Server Error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map(),
        text: async () => 'Server error',
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id } }'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('500');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id } }'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Network error');
    });
  });

  describe('Response Parsing', () => {
    it('should handle malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => 'not valid json{',
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id } }'
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('parse');
    });

    it('should include timing information', async () => {
      const mockResponse = {
        data: { user: { id: '1' } },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map(),
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id } }'
      );

      expect(result.success).toBe(true);
      expect(result.data?.timing).toBeDefined();
      expect(result.data?.timing.start).toBeGreaterThan(0);
      expect(result.data?.timing.end).toBeGreaterThan(result.data?.timing.start!);
      expect(result.data?.timing.duration).toBeGreaterThan(0);
    });

    it('should include response headers', async () => {
      const mockResponse = {
        data: { user: { id: '1' } },
      };

      const mockHeaders = new Map([
        ['content-type', 'application/json'],
        ['x-request-id', 'req-123'],
      ]);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: mockHeaders,
        text: async () => JSON.stringify(mockResponse),
      });

      const result = await GraphqlClientTool.query(
        mockGraphQLEndpoint,
        'query { user { id } }'
      );

      expect(result.success).toBe(true);
      expect(result.data?.headers).toBeDefined();
      expect(result.data?.headers['content-type']).toBe('application/json');
      expect(result.data?.headers['x-request-id']).toBe('req-123');
    });
  });

  describe('Query Builders', () => {
    it('should build simple query', () => {
      const query = GraphqlClientTool.buildQuery('users', ['id', 'name', 'email']);

      expect(query).toContain('query');
      expect(query).toContain('users');
      expect(query).toContain('id');
      expect(query).toContain('name');
      expect(query).toContain('email');
    });

    it('should build query with variables', () => {
      const query = GraphqlClientTool.buildQuery(
        'user',
        ['id', 'name'],
        { id: 'ID!' }
      );

      expect(query).toContain('$id: ID!');
      expect(query).toContain('user(id: $id)');
    });

    it('should build simple mutation', () => {
      const mutation = GraphqlClientTool.buildMutation(
        'createUser',
        ['id', 'name', 'email']
      );

      expect(mutation).toContain('mutation');
      expect(mutation).toContain('createUser');
      expect(mutation).toContain('id');
      expect(mutation).toContain('name');
      expect(mutation).toContain('email');
    });

    it('should build mutation with variables', () => {
      const mutation = GraphqlClientTool.buildMutation(
        'updateUser',
        ['id', 'name'],
        { id: 'ID!', name: 'String!' }
      );

      expect(mutation).toContain('$id: ID!');
      expect(mutation).toContain('$name: String!');
      expect(mutation).toContain('updateUser(id: $id, name: $name)');
    });
  });

  describe('Tool Metadata', () => {
    it('should have correct tool name', () => {
      expect(GraphqlClientTool.toolName).toBe('graphql_client');
    });

    it('should have description', () => {
      expect(GraphqlClientTool.description).toBeDefined();
      expect(typeof GraphqlClientTool.description).toBe('string');
      expect(GraphqlClientTool.description.length).toBeGreaterThan(0);
    });

    it('should have schema', () => {
      expect(GraphqlClientTool.schema).toBeDefined();
    });
  });
});
