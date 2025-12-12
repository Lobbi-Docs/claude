/**
 * @claude-sdk/tools - JSON Processor Tests
 * Comprehensive tests for JSON parsing, stringifying, querying, and operations
 */

import { describe, it, expect } from 'vitest';
import { executeJsonProcessor } from '../../src/tools/data/json-processor.js';
import type { ToolContext } from '../../src/types/index.js';

// Mock context for tests
const mockContext: ToolContext = {
  sessionId: 'test-session',
  userId: 'test-user',
  timestamp: new Date(),
  metadata: {},
};

// ============================================================================
// Parse Operation Tests
// ============================================================================

describe('JsonProcessorTool - Parse Operation', () => {
  it('should parse valid JSON string', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{"name":"John","age":30}',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'John', age: 30 });
  });

  it('should parse JSON array', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '[1,2,3,4,5]',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([1, 2, 3, 4, 5]);
  });

  it('should parse nested JSON', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{"user":{"name":"Jane","address":{"city":"NYC"}}}',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      user: { name: 'Jane', address: { city: 'NYC' } },
    });
  });

  it('should handle empty JSON object', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{}',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it('should handle empty JSON array', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '[]',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should handle invalid JSON', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{invalid json}',
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle malformed JSON', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{"name":"John",}', // Trailing comma
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Stringify Operation Tests
// ============================================================================

describe('JsonProcessorTool - Stringify Operation', () => {
  it('should stringify object', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: { name: 'John', age: 30 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(typeof result.data).toBe('string');
    expect(JSON.parse(result.data as string)).toEqual({ name: 'John', age: 30 });
  });

  it('should stringify with custom indentation', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: { a: 1, b: 2 },
        options: { indent: 4 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('    '); // 4 spaces
  });

  it('should stringify nested structures', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: { user: { name: 'Jane', tags: ['admin', 'user'] } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = JSON.parse(result.data as string);
    expect(parsed.user.tags).toEqual(['admin', 'user']);
  });

  it('should handle circular references with handleCircular option', async () => {
    const obj: any = { name: 'test' };
    obj.self = obj; // Create circular reference

    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: obj,
        options: { handleCircular: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('[Circular]');
  });

  it('should limit depth with maxDepth option', async () => {
    const deepObj = {
      level1: {
        level2: {
          level3: {
            level4: 'deep',
          },
        },
      },
    };

    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: deepObj,
        options: { maxDepth: 2 },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('[Max Depth Reached]');
  });

  it('should stringify arrays', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: [1, 2, 3, 4, 5],
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(JSON.parse(result.data as string)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should stringify empty object', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: {},
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe('{}');
  });
});

// ============================================================================
// Query Operation Tests (JSONPath)
// ============================================================================

describe('JsonProcessorTool - Query Operation', () => {
  const testData = {
    users: [
      { id: 1, name: 'John', age: 30, role: 'admin' },
      { id: 2, name: 'Jane', age: 25, role: 'user' },
      { id: 3, name: 'Bob', age: 35, role: 'user' },
    ],
    metadata: {
      total: 3,
      page: 1,
    },
  };

  it('should query simple path', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'query',
        data: testData,
        options: { path: '$.metadata.total' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([3]);
  });

  it('should query array elements', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'query',
        data: testData,
        options: { path: '$.users[*].name' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(['John', 'Jane', 'Bob']);
  });

  it('should query with filter', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'query',
        data: testData,
        options: { path: '$.users[?(@.age > 30)]' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    const users = result.data as any[];
    expect(users.some(u => u.name === 'Bob')).toBe(true);
  });

  it('should query nested properties', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'query',
        data: { a: { b: { c: { d: 'value' } } } },
        options: { path: '$.a.b.c.d' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(['value']);
  });

  it('should handle non-existent path', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'query',
        data: testData,
        options: { path: '$.nonexistent' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should require path option', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'query',
        data: testData,
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Diff Operation Tests
// ============================================================================

describe('JsonProcessorTool - Diff Operation', () => {
  it('should detect simple changes', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'diff',
        data: { name: 'John', age: 30 },
        options: { compareWith: { name: 'John', age: 31 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const diff = result.data as any;
    expect(diff.hasDifferences).toBe(true);
    expect(diff.differences).toHaveLength(1);
    expect(diff.differences[0].path).toEqual(['age']);
    expect(diff.differences[0].op).toBe('change');
  });

  it('should detect additions', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'diff',
        data: { name: 'John' },
        options: { compareWith: { name: 'John', age: 30 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const diff = result.data as any;
    expect(diff.hasDifferences).toBe(true);
    expect(diff.differences.some((d: any) => d.op === 'add')).toBe(true);
  });

  it('should detect removals', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'diff',
        data: { name: 'John', age: 30 },
        options: { compareWith: { name: 'John' } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const diff = result.data as any;
    expect(diff.hasDifferences).toBe(true);
    expect(diff.differences.some((d: any) => d.op === 'remove')).toBe(true);
  });

  it('should detect no differences', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'diff',
        data: { name: 'John', age: 30 },
        options: { compareWith: { name: 'John', age: 30 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const diff = result.data as any;
    expect(diff.hasDifferences).toBe(false);
    expect(diff.differences).toHaveLength(0);
  });

  it('should detect nested changes', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'diff',
        data: { user: { name: 'John', age: 30 } },
        options: { compareWith: { user: { name: 'Jane', age: 30 } } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const diff = result.data as any;
    expect(diff.hasDifferences).toBe(true);
    expect(diff.differences[0].path).toContain('name');
  });

  it('should detect array changes', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'diff',
        data: [1, 2, 3],
        options: { compareWith: [1, 2, 4] },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const diff = result.data as any;
    expect(diff.hasDifferences).toBe(true);
  });

  it('should require compareWith option', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'diff',
        data: { name: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Merge Operation Tests
// ============================================================================

describe('JsonProcessorTool - Merge Operation', () => {
  it('should perform deep merge', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'merge',
        data: { a: 1, b: { c: 2 } },
        options: { mergeWith: { b: { d: 3 }, e: 4 }, deepMerge: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
  });

  it('should perform shallow merge', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'merge',
        data: { a: 1, b: { c: 2 } },
        options: { mergeWith: { b: { d: 3 } }, deepMerge: false },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.a).toBe(1);
    expect(merged.b).toEqual({ d: 3 }); // Shallow merge replaces nested object
  });

  it('should merge arrays by concatenation', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'merge',
        data: { items: [1, 2] },
        options: { mergeWith: { items: [3, 4] }, deepMerge: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toEqual([1, 2, 3, 4]);
  });

  it('should handle empty objects', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'merge',
        data: {},
        options: { mergeWith: { a: 1 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1 });
  });

  it('should require mergeWith option', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'merge',
        data: { a: 1 },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Validate Operation Tests
// ============================================================================

describe('JsonProcessorTool - Validate Operation', () => {
  it('should validate data against schema', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'validate',
        data: { name: 'John', age: 30 },
        options: {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
          },
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const validation = result.data as any;
    expect(validation.valid).toBe(true);
  });

  it('should require schema option', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'validate',
        data: { name: 'John' },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('JsonProcessorTool - Edge Cases', () => {
  it('should handle null values', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: { value: null },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toContain('null');
  });

  it('should handle undefined values', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'stringify',
        data: { value: undefined },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    // undefined values are typically omitted in JSON
  });

  it('should handle special characters', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{"text":"Line 1\\nLine 2\\tTabbed"}',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.text).toContain('\n');
    expect(parsed.text).toContain('\t');
  });

  it('should handle unicode characters', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{"emoji":"😀","chinese":"你好"}',
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.emoji).toBe('😀');
    expect(parsed.chinese).toBe('你好');
  });

  it('should handle large numbers', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'parse',
        data: '{"big":9007199254740991}', // MAX_SAFE_INTEGER
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const parsed = result.data as any;
    expect(parsed.big).toBe(9007199254740991);
  });

  it('should handle unknown operation', async () => {
    const result = await executeJsonProcessor(
      {
        operation: 'unknown' as any,
        data: {},
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
