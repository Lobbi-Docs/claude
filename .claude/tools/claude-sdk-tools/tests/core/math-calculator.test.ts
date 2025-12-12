/**
 * @claude-sdk/tools - MathCalculatorTool Tests
 * Comprehensive tests for mathematical operations
 */

import { describe, it, expect } from 'vitest';
import { MathCalculatorTool } from '../../src/tools/core/math-calculator.js';

// ============================================================================
// Basic Operations Tests
// ============================================================================

describe('MathCalculatorTool - Basic Operations', () => {
  it('should add two numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'add',
      value: 5,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(8);
  });

  it('should subtract two numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'subtract',
      value: 10,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(7);
  });

  it('should multiply two numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'multiply',
      value: 5,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(15);
  });

  it('should divide two numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'divide',
      value: 10,
      operand: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(5);
  });

  it('should calculate modulo', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'modulo',
      value: 10,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1);
  });

  it('should handle precision in division', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'divide',
      value: 10,
      operand: 3,
      precision: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(3.33);
    expect(result.data?.metadata?.precision).toBe(2);
  });

  it('should handle negative numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'add',
      value: -5,
      operand: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(-2);
  });

  it('should handle decimal numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'multiply',
      value: 2.5,
      operand: 4,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(10);
  });

  it('should fail on division by zero', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'divide',
      value: 10,
      operand: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should fail on modulo by zero', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'modulo',
      value: 10,
      operand: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should fail without required parameters', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'add',
      value: 5,
    } as any);

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Advanced Operations Tests
// ============================================================================

describe('MathCalculatorTool - Advanced Operations', () => {
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

  it('should calculate square root with precision', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'sqrt',
      value: 2,
      precision: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1.414);
  });

  it('should calculate natural logarithm', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'log',
      value: Math.E,
      precision: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1);
  });

  it('should calculate base-10 logarithm', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'log10',
      value: 100,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(2);
  });

  it('should calculate exponential', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'exp',
      value: 1,
      precision: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBeCloseTo(2.718, 2);
  });

  it('should calculate absolute value', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'abs',
      value: -10,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(10);
  });

  it('should calculate ceiling', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'ceil',
      value: 4.3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(5);
  });

  it('should calculate floor', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'floor',
      value: 4.9,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(4);
  });

  it('should round number', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'round',
      value: 4.5,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(5);
  });

  it('should handle zero power', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'power',
      value: 5,
      operand: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1);
  });

  it('should handle negative power', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'power',
      value: 2,
      operand: -2,
      precision: 2,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(0.25);
  });
});

// ============================================================================
// Trigonometric Operations Tests
// ============================================================================

describe('MathCalculatorTool - Trigonometric Operations', () => {
  it('should calculate sine', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'sin',
      value: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(0);
  });

  it('should calculate sine of π/2', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'sin',
      value: Math.PI / 2,
      precision: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1);
  });

  it('should calculate cosine', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'cos',
      value: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1);
  });

  it('should calculate tangent', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'tan',
      value: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(0);
  });

  it('should calculate arcsine', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'asin',
      value: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(0);
  });

  it('should calculate arccosine', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'acos',
      value: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(0);
  });

  it('should calculate arctangent', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'atan',
      value: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(0);
  });

  it('should handle trigonometric with precision', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'sin',
      value: Math.PI / 4,
      precision: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBeCloseTo(0.707, 2);
  });
});

// ============================================================================
// Statistics Operations Tests
// ============================================================================

describe('MathCalculatorTool - Statistics Operations', () => {
  it('should calculate mean', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mean',
      values: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(3);
  });

  it('should calculate mean with decimals', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mean',
      values: [1.5, 2.5, 3.5],
      precision: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(2.5);
  });

  it('should calculate median of odd-length array', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'median',
      values: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(3);
  });

  it('should calculate median of even-length array', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'median',
      values: [1, 2, 3, 4],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(2.5);
  });

  it('should calculate median of unsorted array', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'median',
      values: [5, 1, 3, 2, 4],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(3);
  });

  it('should calculate mode', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mode',
      values: [1, 2, 2, 3, 3, 3, 4],
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
    expect(result.data?.result).toBeGreaterThan(0);
  });

  it('should calculate variance', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'variance',
      values: [2, 4, 4, 4, 5, 5, 7, 9],
      precision: 2,
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('number');
    expect(result.data?.result).toBeGreaterThan(0);
  });

  it('should calculate sum', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'sum',
      values: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(15);
  });

  it('should calculate minimum', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'min',
      values: [5, 2, 8, 1, 9],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(1);
  });

  it('should calculate maximum', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'max',
      values: [5, 2, 8, 1, 9],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(9);
  });

  it('should calculate range', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'range',
      values: [1, 2, 8, 3, 9],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(8);
  });

  it('should handle single value in statistics', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mean',
      values: [5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(5);
  });

  it('should handle empty array', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mean',
      values: [],
    });

    expect(result.success).toBe(false);
  });

  it('should handle negative numbers in statistics', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mean',
      values: [-2, -1, 0, 1, 2],
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(0);
  });

  it('should include metadata in statistics', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'mean',
      values: [1, 2, 3, 4, 5],
    });

    expect(result.success).toBe(true);
    expect(result.data?.metadata?.count).toBe(5);
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('MathCalculatorTool - Edge Cases', () => {
  it('should handle very large numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'add',
      value: 1e15,
      operand: 1e15,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(2e15);
  });

  it('should handle very small numbers', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'multiply',
      value: 1e-10,
      operand: 1e-10,
    });

    expect(result.success).toBe(true);
    // Use toBeCloseTo for floating point comparison
    expect(result.data?.result).toBeCloseTo(1e-20, 25);
  });

  it('should handle precision edge cases', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'divide',
      value: 1,
      operand: 3,
      precision: 10,
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('number');
  });

  it('should handle infinity result', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'power',
      value: 10,
      operand: 1000,
    });

    expect(result.success).toBe(true);
    expect(result.data?.result).toBe(Infinity);
  });

  it('should handle NaN input gracefully', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'add',
      value: NaN,
      operand: 5,
    });

    expect(result.success).toBe(true);
    expect(Number.isNaN(result.data?.result)).toBe(true);
  });

  it('should handle precision at maximum value', async () => {
    const result = await MathCalculatorTool.execute({
      operation: 'divide',
      value: 10,
      operand: 3,
      precision: 20, // max precision is 20
    });

    expect(result.success).toBe(true);
    expect(typeof result.data?.result).toBe('number');
    expect(result.data?.metadata?.precision).toBe(20);
  });
});
