/**
 * @claude-sdk/tools - Data Merger Tests
 * Comprehensive tests for deep merge, shallow merge, array strategies, and path-specific rules
 */

import { describe, it, expect } from 'vitest';
import { executeDataMerger } from '../../src/tools/data/data-merger.js';
import type { ToolContext } from '../../src/types/index.js';

// Mock context for tests
const mockContext: ToolContext = {
  sessionId: 'test-session',
  userId: 'test-user',
  timestamp: new Date(),
  metadata: {},
};

// ============================================================================
// Merge (Shallow) Operation Tests
// ============================================================================

describe('DataMergerTool - Merge Operation', () => {
  it('should perform shallow merge', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge',
        data: { a: 1, b: 2 },
        options: { source: { b: 3, c: 4 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should handle empty source', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge',
        data: { a: 1, b: 2 },
        options: { source: {} },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: 2 });
  });

  it('should handle empty target', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge',
        data: {},
        options: { source: { a: 1, b: 2 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: 2 });
  });

  it('should require source or sources option', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge',
        data: { a: 1 },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should clone objects when cloneObjects is true', async () => {
    const original = { a: 1, b: 2 };

    const result = await executeDataMerger(
      {
        operation: 'merge',
        data: original,
        options: { source: { c: 3 }, cloneObjects: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).not.toBe(original); // Different object reference
  });
});

// ============================================================================
// Deep Merge Operation Tests
// ============================================================================

describe('DataMergerTool - Deep Merge Operation', () => {
  it('should perform deep merge on nested objects', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { a: 1, b: { c: 2, d: 3 } },
        options: { source: { b: { d: 4, e: 5 }, f: 6 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: { c: 2, d: 4, e: 5 }, f: 6 });
  });

  it('should merge multiple sources', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { a: 1 },
        options: {
          sources: [{ b: 2 }, { c: 3 }, { d: 4 }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  it('should replace arrays by default', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { items: [1, 2, 3] },
        options: { source: { items: [4, 5] }, arrayStrategy: 'replace' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toEqual([4, 5]);
  });

  it('should concat arrays when arrayStrategy is concat', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { items: [1, 2] },
        options: { source: { items: [3, 4] }, arrayStrategy: 'concat' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toEqual([1, 2, 3, 4]);
  });

  it('should create union of arrays when arrayStrategy is union', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { items: [1, 2, 3] },
        options: { source: { items: [3, 4, 5] }, arrayStrategy: 'union' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toHaveLength(5); // [1, 2, 3, 4, 5] - no duplicates
  });

  it('should merge arrays by key', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: {
          users: [
            { id: 1, name: 'John', age: 30 },
            { id: 2, name: 'Jane', age: 25 },
          ],
        },
        options: {
          source: {
            users: [
              { id: 1, age: 31 }, // Update John's age
              { id: 3, name: 'Bob', age: 35 }, // Add new user
            ],
          },
          arrayStrategy: 'merge_by_key',
          arrayMergeKey: 'id',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.users).toHaveLength(3);
    const john = merged.users.find((u: any) => u.id === 1);
    expect(john.age).toBe(31);
  });

  it('should respect maxDepth option', async () => {
    const deepData = {
      l1: { l2: { l3: { l4: { l5: 'original' } } } },
    };

    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: deepData,
        options: {
          source: { l1: { l2: { l3: { l4: { l5: 'new', l6: 'added' } } } } },
          maxDepth: 3,
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    // Should stop merging after level 3
  });

  it('should skip null values when skipNull is true', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { a: 1, b: 2 },
        options: { source: { b: null, c: 3 }, skipNull: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.b).toBe(2); // Not overwritten with null
    expect(merged.c).toBe(3);
  });

  it('should skip undefined values when skipUndefined is true', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { a: 1, b: 2 },
        options: { source: { b: undefined, c: 3 }, skipUndefined: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.b).toBe(2); // Not overwritten with undefined
  });

  it('should use target value when onConflict is use_target', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { name: 'John', age: 30 },
        options: {
          source: { name: 'Jane', age: 25 },
          onConflict: 'use_target',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.name).toBe('John'); // Target value kept
    expect(merged.age).toBe(30);
  });

  it('should combine values when onConflict is combine', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { count: 5, text: 'Hello' },
        options: {
          source: { count: 3, text: ' World' },
          onConflict: 'combine',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.count).toBe(8); // Numbers added
    expect(merged.text).toBe('Hello World'); // Strings concatenated
  });

  it('should handle deeply nested structures', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: {
          level1: {
            level2: {
              level3: {
                value: 'original',
              },
            },
          },
        },
        options: {
          source: {
            level1: {
              level2: {
                level3: {
                  value: 'updated',
                  newValue: 'added',
                },
              },
            },
          },
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.level1.level2.level3.value).toBe('updated');
    expect(merged.level1.level2.level3.newValue).toBe('added');
  });

  it('should require source or sources option', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { a: 1 },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// Merge with Rules Operation Tests
// ============================================================================

describe('DataMergerTool - Merge with Rules Operation', () => {
  it('should apply path-specific merge rules', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_with_rules',
        data: {
          config: { timeout: 5000 },
          items: [1, 2],
        },
        options: {
          source: {
            config: { timeout: 3000, retries: 3 },
            items: [3, 4],
          },
          pathRules: [
            { path: 'items', strategy: 'deep', arrayStrategy: 'concat' },
          ],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toEqual([1, 2, 3, 4]); // Concatenated per rule
  });

  it('should use different strategies for different paths', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_with_rules',
        data: {
          settings: { theme: 'dark' },
          cache: [1, 2, 3],
          history: ['a', 'b'],
        },
        options: {
          source: {
            settings: { theme: 'light', lang: 'en' },
            cache: [4, 5],
            history: ['c', 'd'],
          },
          pathRules: [
            { path: 'cache', strategy: 'replace', arrayStrategy: 'replace' },
            { path: 'history', strategy: 'deep', arrayStrategy: 'concat' },
          ],
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.cache).toEqual([4, 5]); // Replaced
    expect(merged.history).toEqual(['a', 'b', 'c', 'd']); // Concatenated
  });

  it('should require pathRules option', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_with_rules',
        data: { a: 1 },
        options: { source: { b: 2 } },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should require source or sources option', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_with_rules',
        data: { a: 1 },
        options: {
          pathRules: [{ path: 'a', strategy: 'deep' }],
        },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should merge remaining paths with default strategy', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_with_rules',
        data: {
          explicit: { a: 1 },
          implicit: { b: 2 },
        },
        options: {
          source: {
            explicit: { a: 10, c: 3 },
            implicit: { b: 20, d: 4 },
          },
          pathRules: [
            { path: 'explicit', strategy: 'replace' },
          ],
          strategy: 'deep', // Default for non-explicit paths
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.explicit).toEqual({ a: 10, c: 3 }); // Replaced
    expect(merged.implicit).toEqual({ b: 20, d: 4 }); // Deep merged
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('DataMergerTool - Edge Cases', () => {
  it('should handle merging with non-object types', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge',
        data: 'string',
        options: { source: { a: 1 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1 }); // Non-object replaced
  });

  it('should handle circular references with clone', async () => {
    const obj: any = { a: 1 };
    obj.self = obj;

    const result = await executeDataMerger(
      {
        operation: 'merge',
        data: obj,
        options: { source: { b: 2 }, cloneObjects: true },
      },
      mockContext
    );

    expect(result.success).toBe(true);
  });

  it('should handle empty arrays', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { items: [] },
        options: { source: { items: [1, 2, 3] }, arrayStrategy: 'concat' },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.items).toEqual([1, 2, 3]);
  });

  it('should handle merging different types', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { value: 'string' },
        options: { source: { value: 123 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.value).toBe(123); // Source value replaces
  });

  it('should handle unknown operation', async () => {
    const result = await executeDataMerger(
      {
        operation: 'unknown' as any,
        data: {},
        options: { source: {} },
      },
      mockContext
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should preserve data types during merge', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: {
          string: 'text',
          number: 42,
          boolean: true,
          null_value: null,
          array: [1, 2],
          object: { nested: 'value' },
        },
        options: {
          source: {
            number: 100,
            boolean: false,
            array: [3],
          },
          arrayStrategy: 'concat',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(typeof merged.string).toBe('string');
    expect(typeof merged.number).toBe('number');
    expect(typeof merged.boolean).toBe('boolean');
    expect(merged.null_value).toBeNull();
    expect(Array.isArray(merged.array)).toBe(true);
    expect(typeof merged.object).toBe('object');
  });

  it('should handle special characters in keys', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: { 'key-with-dash': 1, 'key.with.dots': 2 },
        options: { source: { 'key-with-dash': 10, 'another-key': 3 } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged['key-with-dash']).toBe(10);
    expect(merged['key.with.dots']).toBe(2);
  });

  it('should handle large objects efficiently', async () => {
    const largeObject: any = {};
    for (let i = 0; i < 1000; i++) {
      largeObject[`key${i}`] = i;
    }

    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: largeObject,
        options: { source: { key999: 'updated', newKey: 'added' } },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.key999).toBe('updated');
    expect(merged.newKey).toBe('added');
  });

  it('should handle complex nested array merging', async () => {
    const result = await executeDataMerger(
      {
        operation: 'merge_deep',
        data: {
          users: [
            { id: 1, tags: ['admin'] },
            { id: 2, tags: ['user'] },
          ],
        },
        options: {
          source: {
            users: [
              { id: 1, tags: ['moderator'] },
              { id: 3, tags: ['guest'] },
            ],
          },
          arrayStrategy: 'merge_by_key',
          arrayMergeKey: 'id',
        },
      },
      mockContext
    );

    expect(result.success).toBe(true);
    const merged = result.data as any;
    expect(merged.users).toHaveLength(3);
    const user1 = merged.users.find((u: any) => u.id === 1);
    expect(user1.tags).toContain('moderator');
  });
});
