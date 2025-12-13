/**
 * Tests for GraphQL Parser
 */

import { describe, it, expect } from 'vitest';
import { GraphQLParser } from '../src/parsers/graphql-parser.js';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), 'tests', 'fixtures');

// Ensure test directory exists
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

describe('GraphQLParser', () => {
  describe('loadSchema', () => {
    it('should load and parse a valid GraphQL schema', async () => {
      const schemaPath = join(TEST_DIR, 'test-schema.graphql');
      const schema = `
type Query {
  users: [User!]!
}

type User {
  id: ID!
  name: String!
  email: String!
}
`;
      writeFileSync(schemaPath, schema, 'utf-8');

      const parser = new GraphQLParser();
      const result = await parser.loadSchema(schemaPath);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      unlinkSync(schemaPath);
    });

    it('should fail for invalid GraphQL schema', async () => {
      const schemaPath = join(TEST_DIR, 'invalid-schema.graphql');
      const schema = `
type Query {
  users: [User!]!
}

type User {
  id: ID!
  name: String!
  invalid syntax here
}
`;
      writeFileSync(schemaPath, schema, 'utf-8');

      const parser = new GraphQLParser();
      const result = await parser.loadSchema(schemaPath);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();

      unlinkSync(schemaPath);
    });
  });

  describe('parse', () => {
    it('should parse queries into MCP tools', async () => {
      const schemaPath = join(TEST_DIR, 'query-schema.graphql');
      const schema = `
type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
}

type User {
  id: ID!
  name: String!
}
`;
      writeFileSync(schemaPath, schema, 'utf-8');

      const parser = new GraphQLParser();
      await parser.loadSchema(schemaPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      expect(result.data?.tools).toHaveLength(2);

      const userTool = result.data?.tools.find((t) => t.name === 'query_user');
      expect(userTool).toBeDefined();
      expect(userTool?.inputSchema.properties).toHaveProperty('id');
      expect(userTool?.inputSchema.required).toContain('id');

      const usersTool = result.data?.tools.find((t) => t.name === 'query_users');
      expect(usersTool).toBeDefined();
      expect(usersTool?.inputSchema.properties).toHaveProperty('limit');
      expect(usersTool?.inputSchema.properties).toHaveProperty('offset');
      expect(usersTool?.inputSchema.required).toBeUndefined(); // Optional args

      unlinkSync(schemaPath);
    });

    it('should parse mutations into MCP tools', async () => {
      const schemaPath = join(TEST_DIR, 'mutation-schema.graphql');
      const schema = `
type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}

type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  dummy: String
}
`;
      writeFileSync(schemaPath, schema, 'utf-8');

      const parser = new GraphQLParser();
      await parser.loadSchema(schemaPath);
      const result = parser.parse();

      expect(result.success).toBe(true);

      const createTool = result.data?.tools.find(
        (t) => t.name === 'mutation_create_user'
      );
      expect(createTool).toBeDefined();
      expect(createTool?.inputSchema.properties).toHaveProperty('input');
      expect(createTool?.inputSchema.required).toContain('input');

      const updateTool = result.data?.tools.find(
        (t) => t.name === 'mutation_update_user'
      );
      expect(updateTool).toBeDefined();
      expect(updateTool?.inputSchema.properties).toHaveProperty('id');
      expect(updateTool?.inputSchema.properties).toHaveProperty('input');

      unlinkSync(schemaPath);
    });

    it('should handle different scalar types', async () => {
      const schemaPath = join(TEST_DIR, 'scalars-schema.graphql');
      const schema = `
type Query {
  getData(
    stringArg: String!
    intArg: Int!
    floatArg: Float!
    boolArg: Boolean!
    idArg: ID!
  ): String
}
`;
      writeFileSync(schemaPath, schema, 'utf-8');

      const parser = new GraphQLParser();
      await parser.loadSchema(schemaPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      const tool = result.data?.tools[0];
      expect(tool?.inputSchema.properties?.stringArg.type).toBe('string');
      expect(tool?.inputSchema.properties?.intArg.type).toBe('integer');
      expect(tool?.inputSchema.properties?.floatArg.type).toBe('number');
      expect(tool?.inputSchema.properties?.boolArg.type).toBe('boolean');
      expect(tool?.inputSchema.properties?.idArg.type).toBe('string');

      unlinkSync(schemaPath);
    });

    it('should handle enum types', async () => {
      const schemaPath = join(TEST_DIR, 'enum-schema.graphql');
      const schema = `
enum UserRole {
  ADMIN
  USER
  GUEST
}

type Query {
  usersByRole(role: UserRole!): [User!]!
}

type User {
  id: ID!
  role: UserRole!
}
`;
      writeFileSync(schemaPath, schema, 'utf-8');

      const parser = new GraphQLParser();
      await parser.loadSchema(schemaPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      const tool = result.data?.tools[0];
      expect(tool?.inputSchema.properties?.role.type).toBe('string');
      expect(tool?.inputSchema.properties?.role.enum).toEqual(['ADMIN', 'USER', 'GUEST']);

      unlinkSync(schemaPath);
    });

    it('should handle list types', async () => {
      const schemaPath = join(TEST_DIR, 'list-schema.graphql');
      const schema = `
type Query {
  usersByIds(ids: [ID!]!): [User!]!
}

type User {
  id: ID!
  tags: [String!]!
}
`;
      writeFileSync(schemaPath, schema, 'utf-8');

      const parser = new GraphQLParser();
      await parser.loadSchema(schemaPath);
      const result = parser.parse();

      expect(result.success).toBe(true);
      const tool = result.data?.tools[0];
      expect(tool?.inputSchema.properties?.ids.type).toBe('array');
      expect(tool?.inputSchema.properties?.ids.items?.type).toBe('string');

      unlinkSync(schemaPath);
    });
  });
});
