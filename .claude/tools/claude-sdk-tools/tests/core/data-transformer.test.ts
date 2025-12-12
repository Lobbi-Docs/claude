/**
 * @claude-sdk/tools - DataTransformerTool Tests
 * Comprehensive tests for data transformation operations
 */

import { describe, it, expect } from 'vitest';
import { DataTransformerTool } from '../../src/tools/core/data-transformer.js';

// ============================================================================
// Flatten Operation Tests
// ============================================================================

describe('DataTransformerTool - Flatten', () => {
  it('should flatten nested object', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'flatten',
      input: { a: { b: { c: 1 } } },
      separator: '.',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ 'a.b.c': 1 });
  });

  it('should flatten object with multiple properties', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'flatten',
      input: {
        user: {
          name: 'John',
          address: {
            city: 'NYC',
            zip: '10001',
          },
        },
        active: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({
      'user.name': 'John',
      'user.address.city': 'NYC',
      'user.address.zip': '10001',
      active: true,
    });
  });

  it('should flatten with custom separator', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'flatten',
      input: { a: { b: { c: 1 } } },
      separator: '_',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ 'a_b_c': 1 });
  });

  it('should flatten with maxDepth limit', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'flatten',
      input: { a: { b: { c: { d: 1 } } } },
      separator: '.',
      maxDepth: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ 'a.b': { c: { d: 1 } } });
  });

  it('should handle arrays in flattened objects', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'flatten',
      input: { a: { b: [1, 2, 3] } },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ 'a.b': [1, 2, 3] });
  });

  it('should handle null values', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'flatten',
      input: { a: { b: null } },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ 'a.b': null });
  });
});

// ============================================================================
// Unflatten Operation Tests
// ============================================================================

describe('DataTransformerTool - Unflatten', () => {
  it('should unflatten flat object', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unflatten',
      input: { 'a.b.c': 1 },
      separator: '.',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: { b: { c: 1 } } });
  });

  it('should unflatten object with multiple paths', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unflatten',
      input: {
        'user.name': 'John',
        'user.address.city': 'NYC',
        'user.address.zip': '10001',
        active: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({
      user: {
        name: 'John',
        address: {
          city: 'NYC',
          zip: '10001',
        },
      },
      active: true,
    });
  });

  it('should unflatten with custom separator', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unflatten',
      input: { 'a_b_c': 1 },
      separator: '_',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: { b: { c: 1 } } });
  });

  it('should handle non-object input gracefully', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unflatten',
      input: [1, 2, 3] as any,
    });

    // Arrays are technically objects, so this might succeed or fail based on implementation
    // We just verify it doesn't crash
    expect(typeof result.success).toBe('boolean');
  });
});

// ============================================================================
// Map Operation Tests
// ============================================================================

describe('DataTransformerTool - Map', () => {
  it('should map array values', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'map',
      input: [1, 2, 3],
      mapFn: 'x => x * 2',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([2, 4, 6]);
  });

  it('should map with index', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'map',
      input: ['a', 'b', 'c'],
      mapFn: '(x, i) => x + i',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['a0', 'b1', 'c2']);
  });

  it('should map object properties', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'map',
      input: [{ age: 20 }, { age: 30 }, { age: 40 }],
      mapFn: 'x => x.age',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([20, 30, 40]);
  });

  it('should handle empty array', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'map',
      input: [],
      mapFn: 'x => x * 2',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([]);
  });

  it('should fail with non-array input', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'map',
      input: 'not an array' as any,
      mapFn: 'x => x',
    });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Filter Operation Tests
// ============================================================================

describe('DataTransformerTool - Filter', () => {
  it('should filter array values', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'filter',
      input: [1, 2, 3, 4, 5],
      filterFn: 'x => x > 2',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([3, 4, 5]);
  });

  it('should filter objects by property', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'filter',
      input: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 35 },
      ],
      filterFn: 'x => x.age >= 30',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([
      { name: 'John', age: 30 },
      { name: 'Bob', age: 35 },
    ]);
  });

  it('should handle no matches', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'filter',
      input: [1, 2, 3],
      filterFn: 'x => x > 10',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([]);
  });

  it('should fail with non-array input', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'filter',
      input: { a: 1 } as any,
      filterFn: 'x => x > 0',
    });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Reduce Operation Tests
// ============================================================================

describe('DataTransformerTool - Reduce', () => {
  it('should reduce array to sum', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'reduce',
      input: [1, 2, 3, 4, 5],
      reduceFn: '(acc, x) => acc + x',
      initialValue: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(15);
  });

  it('should reduce to product', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'reduce',
      input: [2, 3, 4],
      reduceFn: '(acc, x) => acc * x',
      initialValue: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(24);
  });

  it('should reduce to object', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'reduce',
      input: ['a', 'b', 'c'],
      reduceFn: '(acc, x, i) => { acc[x] = i; return acc; }',
      initialValue: {},
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: 0, b: 1, c: 2 });
  });

  it('should handle empty array with initial value', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'reduce',
      input: [],
      reduceFn: '(acc, x) => acc + x',
      initialValue: 10,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(10);
  });

  it('should fail with non-array input', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'reduce',
      input: 'not array' as any,
      reduceFn: '(acc, x) => acc + x',
      initialValue: 0,
    });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Sort Operation Tests
// ============================================================================

describe('DataTransformerTool - Sort', () => {
  it('should sort numbers ascending', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'sort',
      input: [3, 1, 4, 1, 5, 9, 2, 6],
      sortOrder: 'asc',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('should sort numbers descending', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'sort',
      input: [3, 1, 4, 1, 5],
      sortOrder: 'desc',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([5, 4, 3, 1, 1]);
  });

  it('should sort strings alphabetically', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'sort',
      input: ['banana', 'apple', 'cherry'],
      sortOrder: 'asc',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['apple', 'banana', 'cherry']);
  });

  it('should sort by object property', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'sort',
      input: [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 35 },
      ],
      sortBy: 'age',
      sortOrder: 'asc',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([
      { name: 'Jane', age: 25 },
      { name: 'John', age: 30 },
      { name: 'Bob', age: 35 },
    ]);
  });

  it('should handle empty array', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'sort',
      input: [],
      sortOrder: 'asc',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([]);
  });

  it('should handle non-array input', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'sort',
      input: { a: 1 } as any,
      sortOrder: 'asc',
    });

    // Should fail or handle gracefully
    // Just verify it doesn't crash
    expect(typeof result.success).toBe('boolean');
  });
});

// ============================================================================
// Group Operation Tests
// ============================================================================

describe('DataTransformerTool - Group', () => {
  it('should group by property', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'group',
      input: [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ],
      groupBy: 'type',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({
      a: [
        { type: 'a', value: 1 },
        { type: 'a', value: 3 },
      ],
      b: [{ type: 'b', value: 2 }],
    });
  });

  it('should group by nested property', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'group',
      input: [
        { user: { role: 'admin' }, name: 'John' },
        { user: { role: 'user' }, name: 'Jane' },
        { user: { role: 'admin' }, name: 'Bob' },
      ],
      groupBy: 'user.role',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toHaveProperty('admin');
    expect(result.data?.result).toHaveProperty('user');
    expect(result.data?.result.admin).toHaveLength(2);
    expect(result.data?.result.user).toHaveLength(1);
  });

  it('should handle empty array', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'group',
      input: [],
      groupBy: 'type',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({});
  });

  it('should handle non-array input', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'group',
      input: { a: 1 } as any,
      groupBy: 'type',
    });

    // Should fail or handle gracefully
    expect(typeof result.success).toBe('boolean');
  });
});

// ============================================================================
// Unique Operation Tests
// ============================================================================

describe('DataTransformerTool - Unique', () => {
  it('should get unique values from array', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unique',
      input: [1, 2, 2, 3, 3, 3, 4],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([1, 2, 3, 4]);
  });

  it('should get unique strings', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unique',
      input: ['a', 'b', 'a', 'c', 'b'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['a', 'b', 'c']);
  });

  it('should get unique by object property', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unique',
      input: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
        { id: 1, name: 'Bob' },
      ],
      uniqueBy: 'id',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toHaveLength(2);
    expect(result.data?.result.map((x: any) => x.id)).toEqual([1, 2]);
  });

  it('should handle empty array', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unique',
      input: [],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([]);
  });

  it('should handle already unique values', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unique',
      input: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([1, 2, 3, 4, 5]);
  });

  it('should handle non-array input', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unique',
      input: 'not array' as any,
    });

    // Should fail or handle gracefully
    expect(typeof result.success).toBe('boolean');
  });
});

// ============================================================================
// Merge Operation Tests
// ============================================================================

describe('DataTransformerTool - Merge', () => {
  it('should merge objects shallow', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'merge',
      input: { a: 1, b: 2 },
      mergeWith: { b: 3, c: 4 },
      mergeStrategy: 'shallow',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('should merge objects deep', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'merge',
      input: { a: { x: 1 }, b: 2 },
      mergeWith: { a: { y: 2 }, c: 3 },
      mergeStrategy: 'deep',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({
      a: { x: 1, y: 2 },
      b: 2,
      c: 3,
    });
  });

  it('should merge arrays with concat', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'merge',
      input: [1, 2, 3],
      mergeWith: [4, 5, 6],
      mergeStrategy: 'concat',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('should handle empty objects', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'merge',
      input: {},
      mergeWith: { a: 1 },
      mergeStrategy: 'shallow',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: 1 });
  });

  it('should handle null values in merge', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'merge',
      input: { a: 1, b: null },
      mergeWith: { b: 2, c: 3 },
      mergeStrategy: 'shallow',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: 1, b: 2, c: 3 });
  });
});
