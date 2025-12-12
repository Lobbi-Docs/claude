/**
 * @claude-sdk/tools - Core Tools Tests
 * Comprehensive tests for all core utility tools
 */

import { describe, it, expect } from 'vitest';
import { StringManipulatorTool } from '../../src/tools/core/string-manipulator.js';
import { DataTransformerTool } from '../../src/tools/core/data-transformer.js';
import { DateTimeUtilsTool } from '../../src/tools/core/datetime-utils.js';
import { MathCalculatorTool } from '../../src/tools/core/math-calculator.js';
import { UuidGeneratorTool } from '../../src/tools/core/uuid-generator.js';
import { HashGeneratorTool } from '../../src/tools/core/hash-generator.js';

// ============================================================================
// StringManipulatorTool Tests
// ============================================================================

describe('StringManipulatorTool', () => {
  it('should split strings', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'split',
      input: 'hello,world,test',
      separator: ',',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['hello', 'world', 'test']);
  });

  it('should join arrays', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'join',
      input: ['hello', 'world'],
      delimiter: ' ',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world');
  });

  it('should convert case to camelCase', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'hello_world_test',
      caseType: 'camel',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('helloWorldTest');
  });

  it('should convert case to snake_case', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'case_convert',
      input: 'helloWorldTest',
      caseType: 'snake',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello_world_test');
  });

  it('should replace strings', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'replace',
      input: 'hello world world',
      search: 'world',
      replacement: 'there',
      replaceAll: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello there there');
  });

  it('should perform regex match', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'regex_match',
      input: 'test123abc456',
      pattern: '\\d+',
      flags: 'g',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual(['123', '456']);
  });

  it('should interpolate template strings', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'template',
      input: 'Hello {{name}}, you are {{age}} years old',
      variables: { name: 'John', age: 30 },
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('Hello John, you are 30 years old');
  });

  it('should trim strings', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'trim',
      input: '  hello world  ',
      trimType: 'both',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('hello world');
  });

  it('should pad strings', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'pad',
      input: 'test',
      length: 10,
      padChar: '0',
      padSide: 'start',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('000000test');
  });

  it('should truncate strings', async () => {
    const result = await StringManipulatorTool.execute({
      operation: 'truncate',
      input: 'This is a very long string',
      maxLength: 10,
      ellipsis: '...',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('This is...');
  });
});

// ============================================================================
// DataTransformerTool Tests
// ============================================================================

describe('DataTransformerTool', () => {
  it('should flatten objects', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'flatten',
      input: { a: { b: { c: 1 } } },
      separator: '.',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ 'a.b.c': 1 });
  });

  it('should unflatten objects', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unflatten',
      input: { 'a.b.c': 1 },
      separator: '.',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: { b: { c: 1 } } });
  });

  it('should map arrays', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'map',
      input: [1, 2, 3],
      mapFn: 'x => x * 2',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([2, 4, 6]);
  });

  it('should filter arrays', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'filter',
      input: [1, 2, 3, 4, 5],
      filterFn: 'x => x > 2',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([3, 4, 5]);
  });

  it('should sort arrays', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'sort',
      input: [3, 1, 4, 1, 5, 9, 2, 6],
      sortOrder: 'asc',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('should group arrays by property', async () => {
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
      a: [{ type: 'a', value: 1 }, { type: 'a', value: 3 }],
      b: [{ type: 'b', value: 2 }],
    });
  });

  it('should get unique values', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'unique',
      input: [1, 2, 2, 3, 3, 3, 4],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual([1, 2, 3, 4]);
  });

  it('should merge objects', async () => {
    const result = await DataTransformerTool.execute({
      operation: 'merge',
      input: { a: 1, b: 2 },
      mergeWith: { b: 3, c: 4 },
      mergeStrategy: 'shallow',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toEqual({ a: 1, b: 3, c: 4 });
  });
});

// ============================================================================
// DateTimeUtilsTool Tests
// ============================================================================

describe('DateTimeUtilsTool', () => {
  it('should parse dates', async () => {
    const result = await DateTimeUtilsTool.execute({
      operation: 'parse',
      date: '2024-01-15T12:00:00Z',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('2024-01-15T12:00:00.000Z');
  });

  it('should format dates', async () => {
    const result = await DateTimeUtilsTool.execute({
      operation: 'format',
      date: '2024-01-15T12:00:00Z',
      outputFormat: 'YYYY-MM-DD',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('2024-01-15');
  });

  it('should calculate date differences', async () => {
    const result = await DateTimeUtilsTool.execute({
      operation: 'diff',
      date: '2024-01-01T00:00:00Z',
      date2: '2024-01-02T00:00:00Z',
      diffUnit: 'days',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1);
  });

  it('should add time to dates', async () => {
    const result = await DateTimeUtilsTool.execute({
      operation: 'add',
      date: '2024-01-01T00:00:00Z',
      amount: 5,
      unit: 'days',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe('2024-01-06T00:00:00.000Z');
  });

  it('should compare dates', async () => {
    const result = await DateTimeUtilsTool.execute({
      operation: 'compare',
      date: '2024-01-01T00:00:00Z',
      date2: '2024-01-02T00:00:00Z',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(-1); // date1 is before date2
  });
});

// ============================================================================
// MathCalculatorTool Tests
// ============================================================================

describe('MathCalculatorTool', () => {
  it('should perform addition', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'add',
      value: 5,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(8);
  });

  it('should perform multiplication', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'multiply',
      value: 5,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(15);
  });

  it('should calculate power', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'power',
      value: 2,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(8);
  });

  it('should calculate square root', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'sqrt',
      value: 16,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(4);
  });

  it('should calculate mean', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mean',
      values: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(3);
  });

  it('should calculate median', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'median',
      values: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(3);
  });

  it('should calculate standard deviation', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'std_dev',
      values: [2, 4, 4, 4, 5, 5, 7, 9],
      precision: 2,
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('number');
  });

  it('should handle precision', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'divide',
      value: 10,
      operand: 3,
      precision: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(3.33);
  });
});

// ============================================================================
// UuidGeneratorTool Tests
// ============================================================================

describe('UuidGeneratorTool', () => {
  it('should generate UUID v4', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v4',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('string');
    expect(result.data?.result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should generate UUID v5', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'generate',
      version: 'v5',
      namespace: UuidGeneratorTool.NAMESPACE_DNS,
      name: 'example.com',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('string');
    expect(result.data?.result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should validate UUIDs', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(true);
  });

  it('should invalidate bad UUIDs', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'validate',
      uuid: 'not-a-uuid',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(false);
  });

  it('should parse UUID components', async () => {
    const result = await UuidGeneratorTool.execute({
      operation: 'parse',
      uuid: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toHaveProperty('version');
    expect(result.data?.result).toHaveProperty('variant');
  });
});

// ============================================================================
// HashGeneratorTool Tests
// ============================================================================

describe('HashGeneratorTool', () => {
  it('should generate MD5 hash', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'md5',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toBe('5eb63bbbe01eeed093cb22bb8f5acdc3');
  });

  it('should generate SHA256 hash', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
    });

    expect(result.success).toBe(true);
    expect(result.data?.hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('should generate HMAC', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
      hmac: true,
      secret: 'secret-key',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
    expect(result.data?.metadata?.hmac).toBe(true);
  });

  it('should support base64 encoding', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
      encoding: 'base64',
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.hash).toBe('string');
    expect(result.data?.encoding).toBe('base64');
  });

  it('should support multiple rounds', async () => {
    const result = await HashGeneratorTool.execute({
      input: 'hello world',
      algorithm: 'sha256',
      rounds: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.rounds).toBe(3);
  });
});
