/**
 * @claude-sdk/tools - Schema Validator Tests
 * Comprehensive tests for JSON Schema validation, Zod validation, custom rules, and schema generation
 */

import { describe, it, expect } from 'vitest';
import { executeSchemaValidator } from '../../src/tools/data/schema-validator.js';
import type { ToolContext } from '../../src/types/index.js';

// Mock context for tests
const mockContext: ToolContext = {
  sessionId: 'test-session',
  userId: 'test-user',
  timestamp: new Date(),
  metadata: {},
};

// ============================================================================
// JSON Schema Validation Tests
// ============================================================================

describe('SchemaValidatorTool - JSON Schema Validation', () => {
  it('should validate data against simple JSON schema', async () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { name: 'John', age: 30 },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should detect invalid data type', async () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'number' },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { age: 'not a number' },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
    expect(validation.errors).toBeDefined();
  });

  it('should detect missing required fields', async () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name', 'email'],
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { name: 'John' }, // Missing email
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
  });

  it('should validate nested objects', async () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: {
              type: 'object',
              properties: {
                city: { type: 'string' },
              },
            },
          },
        },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: {
          user: {
            name: 'John',
            address: { city: 'NYC' },
          },
        },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate arrays', async () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate with format validators', async () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        url: { type: 'string', format: 'uri' },
        date: { type: 'string', format: 'date' },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: {
          email: 'john@example.com',
          url: 'https://example.com',
          date: '2024-01-15',
        },
        options: { jsonSchema: schema, useFormats: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should detect invalid format', async () => {
    const schema = {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { email: 'not-an-email' },
        options: { jsonSchema: schema, useFormats: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
  });

  it('should validate with enum constraint', async () => {
    const schema = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { status: 'active' },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate with min/max constraints', async () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'number', minimum: 0, maximum: 150 },
        username: { type: 'string', minLength: 3, maxLength: 20 },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { age: 30, username: 'john_doe' },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate with pattern constraint', async () => {
    const schema = {
      type: 'object',
      properties: {
        phone: { type: 'string', pattern: '^\\d{3}-\\d{3}-\\d{4}$' },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { phone: '555-123-4567' },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should require jsonSchema option', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { name: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should return all errors when allErrors is true', async () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string', format: 'email' },
      },
      required: ['name', 'age', 'email'],
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { age: 'not a number' }, // Missing name and email, wrong type for age
        options: { jsonSchema: schema, allErrors: true, useFormats: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// Zod Validation Tests
// ============================================================================

describe('SchemaValidatorTool - Zod Validation', () => {
  it('should validate with Zod schema (placeholder)', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_zod',
        data: { name: 'John', age: 30 },
        options: { zodSchema: 'UserSchema' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    // Currently returns placeholder result
  });

  it('should require zodSchema option', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_zod',
        data: { name: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Custom Validation Rules Tests
// ============================================================================

describe('SchemaValidatorTool - Custom Validation', () => {
  it('should validate required fields', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { name: 'John', age: 30 },
        options: {
          customRules: [
            { field: 'name', rule: 'required' },
            { field: 'age', rule: 'required' },
          ],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should detect missing required field', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { name: 'John' },
        options: {
          customRules: [{ field: 'email', rule: 'required' }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
    expect(validation.errors).toHaveLength(1);
  });

  it('should validate type rule', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { age: 30, items: [1, 2, 3] },
        options: {
          customRules: [
            { field: 'age', rule: 'type', value: 'number' },
            { field: 'items', rule: 'type', value: 'array' },
          ],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate min rule for numbers', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { age: 25 },
        options: {
          customRules: [{ field: 'age', rule: 'min', value: 18 }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate min rule for strings', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { username: 'john' },
        options: {
          customRules: [{ field: 'username', rule: 'min', value: 3 }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate max rule', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { age: 25 },
        options: {
          customRules: [{ field: 'age', rule: 'max', value: 100 }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate pattern rule', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { email: 'john@example.com' },
        options: {
          customRules: [{ field: 'email', rule: 'pattern', value: '@' }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should validate enum rule', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { status: 'active' },
        options: {
          customRules: [
            { field: 'status', rule: 'enum', value: ['active', 'inactive', 'pending'] },
          ],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should support custom error messages', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: {},
        options: {
          customRules: [
            {
              field: 'email',
              rule: 'required',
              message: 'Email address is required',
            },
          ],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
    expect(validation.errors[0].message).toBe('Email address is required');
  });

  it('should validate nested fields', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { user: { name: 'John' } },
        options: {
          customRules: [{ field: 'user.name', rule: 'required' }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should require customRules option', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'validate_custom',
        data: { name: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Generate Schema Tests
// ============================================================================

describe('SchemaValidatorTool - Generate Schema', () => {
  it('should generate schema from simple object', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: { name: 'John', age: 30, active: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.type).toBe('object');
    expect(schema.properties.name.type).toBe('string');
    expect(schema.properties.age.type).toBe('integer');
    expect(schema.properties.active.type).toBe('boolean');
  });

  it('should generate schema for nested objects', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: {
          user: {
            name: 'John',
            address: {
              city: 'NYC',
            },
          },
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.properties.user.type).toBe('object');
    expect(schema.properties.user.properties.address.type).toBe('object');
  });

  it('should generate schema for arrays', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: { items: [1, 2, 3] },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.properties.items.type).toBe('array');
  });

  it('should handle empty objects', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: {},
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.type).toBe('object');
  });

  it('should handle null values', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: { value: null },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.properties.value.type).toBe('null');
  });

  it('should include required fields', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: { name: 'John', age: 30 },
        options: { includeOptional: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.required).toBeDefined();
    expect(schema.required).toContain('name');
    expect(schema.required).toContain('age');
  });

  it('should respect maxDepth option', async () => {
    const deepData = {
      l1: { l2: { l3: { l4: { l5: 'deep' } } } },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: deepData,
        options: { maxDepth: 2 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.properties.l1.properties.l2.type).toBe('object');
  });

  it('should distinguish integers from floats', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'generate_schema',
        data: { integer: 42, float: 3.14 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const schema = result.data as any;
    expect(schema.properties.integer.type).toBe('integer');
    expect(schema.properties.float.type).toBe('number');
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('SchemaValidatorTool - Edge Cases', () => {
  it('should handle complex schemas', async () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: {
          user: {
            name: 'John',
            roles: [
              { id: 1, name: 'admin' },
              { id: 2, name: 'user' },
            ],
          },
        },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should handle unknown operation', async () => {
    const result = await executeSchemaValidator(
      {
        operation: 'unknown' as any,
        data: {},
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should provide detailed error information', async () => {
    const schema = {
      type: 'object',
      properties: {
        age: { type: 'number', minimum: 0 },
      },
    };

    const result = await executeSchemaValidator(
      {
        operation: 'validate_json_schema',
        data: { age: -5 },
        options: { jsonSchema: schema },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(false);
    expect(validation.errors[0].code).toBeDefined();
    expect(validation.errors[0].message).toBeDefined();
  });
});
