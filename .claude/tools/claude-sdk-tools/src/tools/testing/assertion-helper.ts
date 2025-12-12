/**
 * @claude-sdk/tools - AssertionHelperTool
 * Comprehensive assertion utilities for testing
 */

import { z } from 'zod';
import { wrapExecution } from '../../utils/index.js';
import { ValidationError } from '../../types/errors.js';
import type { ToolResult, ToolContext } from '../../types/index.js';

// ============================================================================
// Schemas
// ============================================================================

export const AssertionSchema = z.discriminatedUnion('assertion', [
  z.object({
    assertion: z.literal('equal'),
    actual: z.unknown(),
    expected: z.unknown(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('deepEqual'),
    actual: z.unknown(),
    expected: z.unknown(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('notEqual'),
    actual: z.unknown(),
    expected: z.unknown(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('contains'),
    value: z.unknown(),
    expected: z.unknown(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('matches'),
    value: z.string(),
    pattern: z.string(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('throws'),
    fn: z.string(), // Serialized function
    expectedError: z.string().optional(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('typeOf'),
    value: z.unknown(),
    expectedType: z.enum([
      'string',
      'number',
      'boolean',
      'object',
      'array',
      'null',
      'undefined',
      'function',
      'bigint',
      'symbol',
    ]),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('truthy'),
    value: z.unknown(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('falsy'),
    value: z.unknown(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('greaterThan'),
    value: z.number(),
    threshold: z.number(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('lessThan'),
    value: z.number(),
    threshold: z.number(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('between'),
    value: z.number(),
    min: z.number(),
    max: z.number(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('hasProperty'),
    object: z.record(z.unknown()),
    property: z.string(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('isEmpty'),
    value: z.unknown(),
    message: z.string().optional(),
  }),
  z.object({
    assertion: z.literal('isNotEmpty'),
    value: z.unknown(),
    message: z.string().optional(),
  }),
]);

// ============================================================================
// Types
// ============================================================================

export type AssertionInput = z.infer<typeof AssertionSchema>;

interface AssertionResult {
  passed: boolean;
  message: string;
  actual?: unknown;
  expected?: unknown;
  diff?: string;
}

// ============================================================================
// AssertionHelperTool Implementation
// ============================================================================

export class AssertionHelperTool {
  /**
   * Assert equality (shallow)
   */
  private static assertEqual(
    actual: unknown,
    expected: unknown,
    message?: string
  ): AssertionResult {
    const passed = actual === expected;

    return {
      passed,
      message:
        message ||
        (passed
          ? 'Values are equal'
          : `Expected ${this.stringify(expected)} but got ${this.stringify(actual)}`),
      actual,
      expected,
      diff: passed ? undefined : this.generateDiff(actual, expected),
    };
  }

  /**
   * Assert deep equality
   */
  private static assertDeepEqual(
    actual: unknown,
    expected: unknown,
    message?: string
  ): AssertionResult {
    const passed = this.deepEqual(actual, expected);

    return {
      passed,
      message:
        message ||
        (passed
          ? 'Values are deeply equal'
          : `Expected deep equality but values differ`),
      actual,
      expected,
      diff: passed ? undefined : this.generateDiff(actual, expected),
    };
  }

  /**
   * Assert inequality
   */
  private static assertNotEqual(
    actual: unknown,
    expected: unknown,
    message?: string
  ): AssertionResult {
    const passed = actual !== expected;

    return {
      passed,
      message:
        message ||
        (passed
          ? 'Values are not equal'
          : `Expected values to differ but both are ${this.stringify(actual)}`),
      actual,
      expected,
    };
  }

  /**
   * Assert contains
   */
  private static assertContains(
    value: unknown,
    expected: unknown,
    message?: string
  ): AssertionResult {
    let passed = false;

    if (typeof value === 'string' && typeof expected === 'string') {
      passed = value.includes(expected);
    } else if (Array.isArray(value)) {
      passed = value.some((item) => this.deepEqual(item, expected));
    } else if (typeof value === 'object' && value !== null && typeof expected === 'string') {
      passed = expected in value;
    }

    return {
      passed,
      message:
        message ||
        (passed
          ? 'Value contains expected item'
          : `Value does not contain ${this.stringify(expected)}`),
      actual: value,
      expected,
    };
  }

  /**
   * Assert matches regex pattern
   */
  private static assertMatches(
    value: string,
    pattern: string,
    message?: string
  ): AssertionResult {
    let passed = false;
    let error: string | undefined;

    try {
      const regex = new RegExp(pattern);
      passed = regex.test(value);
    } catch (e) {
      error = `Invalid regex pattern: ${e instanceof Error ? e.message : String(e)}`;
    }

    return {
      passed,
      message:
        message ||
        error ||
        (passed
          ? `Value matches pattern ${pattern}`
          : `Value "${value}" does not match pattern ${pattern}`),
      actual: value,
      expected: pattern,
    };
  }

  /**
   * Assert type of value
   */
  private static assertTypeOf(
    value: unknown,
    expectedType: string,
    message?: string
  ): AssertionResult {
    let actualType: string;

    if (value === null) {
      actualType = 'null';
    } else if (Array.isArray(value)) {
      actualType = 'array';
    } else {
      actualType = typeof value;
    }

    const passed = actualType === expectedType;

    return {
      passed,
      message:
        message ||
        (passed
          ? `Value is of type ${expectedType}`
          : `Expected type ${expectedType} but got ${actualType}`),
      actual: actualType,
      expected: expectedType,
    };
  }

  /**
   * Assert truthy
   */
  private static assertTruthy(value: unknown, message?: string): AssertionResult {
    const passed = !!value;

    return {
      passed,
      message:
        message || (passed ? 'Value is truthy' : `Value is falsy: ${this.stringify(value)}`),
      actual: value,
    };
  }

  /**
   * Assert falsy
   */
  private static assertFalsy(value: unknown, message?: string): AssertionResult {
    const passed = !value;

    return {
      passed,
      message:
        message || (passed ? 'Value is falsy' : `Value is truthy: ${this.stringify(value)}`),
      actual: value,
    };
  }

  /**
   * Assert greater than
   */
  private static assertGreaterThan(
    value: number,
    threshold: number,
    message?: string
  ): AssertionResult {
    const passed = value > threshold;

    return {
      passed,
      message:
        message ||
        (passed
          ? `${value} is greater than ${threshold}`
          : `Expected ${value} to be greater than ${threshold}`),
      actual: value,
      expected: threshold,
    };
  }

  /**
   * Assert less than
   */
  private static assertLessThan(
    value: number,
    threshold: number,
    message?: string
  ): AssertionResult {
    const passed = value < threshold;

    return {
      passed,
      message:
        message ||
        (passed
          ? `${value} is less than ${threshold}`
          : `Expected ${value} to be less than ${threshold}`),
      actual: value,
      expected: threshold,
    };
  }

  /**
   * Assert between
   */
  private static assertBetween(
    value: number,
    min: number,
    max: number,
    message?: string
  ): AssertionResult {
    const passed = value >= min && value <= max;

    return {
      passed,
      message:
        message ||
        (passed
          ? `${value} is between ${min} and ${max}`
          : `Expected ${value} to be between ${min} and ${max}`),
      actual: value,
      expected: { min, max },
    };
  }

  /**
   * Assert has property
   */
  private static assertHasProperty(
    object: Record<string, unknown>,
    property: string,
    message?: string
  ): AssertionResult {
    const passed = property in object;

    return {
      passed,
      message:
        message ||
        (passed
          ? `Object has property "${property}"`
          : `Object does not have property "${property}"`),
      actual: object,
      expected: property,
    };
  }

  /**
   * Assert empty
   */
  private static assertIsEmpty(value: unknown, message?: string): AssertionResult {
    let passed = false;

    if (value === null || value === undefined) {
      passed = true;
    } else if (typeof value === 'string' || Array.isArray(value)) {
      passed = value.length === 0;
    } else if (typeof value === 'object') {
      passed = Object.keys(value).length === 0;
    }

    return {
      passed,
      message: message || (passed ? 'Value is empty' : 'Value is not empty'),
      actual: value,
    };
  }

  /**
   * Assert not empty
   */
  private static assertIsNotEmpty(value: unknown, message?: string): AssertionResult {
    const emptyResult = this.assertIsEmpty(value);
    const passed = !emptyResult.passed;

    return {
      passed,
      message: message || (passed ? 'Value is not empty' : 'Value is empty'),
      actual: value,
    };
  }

  /**
   * Deep equality check
   */
  private static deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object') return a === b;

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.deepEqual(val, b[idx]));
    }

    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      this.deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  /**
   * Generate diff between values
   */
  private static generateDiff(actual: unknown, expected: unknown): string {
    const actualStr = this.stringify(actual);
    const expectedStr = this.stringify(expected);

    if (actualStr === expectedStr) return 'No difference';

    return `- Expected: ${expectedStr}\n+ Actual:   ${actualStr}`;
  }

  /**
   * Stringify value for display
   */
  private static stringify(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return '[Function]';
    if (typeof value === 'symbol') return value.toString();

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  /**
   * Main execution method
   */
  static async execute(
    input: AssertionInput,
    context?: ToolContext
  ): Promise<ToolResult<AssertionResult>> {
    return wrapExecution(
      'AssertionHelperTool',
      async (inp: AssertionInput): Promise<AssertionResult> => {
        // Validate input
        const parsed = AssertionSchema.safeParse(inp);
        if (!parsed.success) {
          throw ValidationError.fromZodError(parsed.error);
        }

        const data = parsed.data;
        let result: AssertionResult;

        switch (data.assertion) {
          case 'equal':
            result = this.assertEqual(data.actual, data.expected, data.message);
            break;

          case 'deepEqual':
            result = this.assertDeepEqual(data.actual, data.expected, data.message);
            break;

          case 'notEqual':
            result = this.assertNotEqual(data.actual, data.expected, data.message);
            break;

          case 'contains':
            result = this.assertContains(data.value, data.expected, data.message);
            break;

          case 'matches':
            result = this.assertMatches(data.value, data.pattern, data.message);
            break;

          case 'typeOf':
            result = this.assertTypeOf(data.value, data.expectedType, data.message);
            break;

          case 'truthy':
            result = this.assertTruthy(data.value, data.message);
            break;

          case 'falsy':
            result = this.assertFalsy(data.value, data.message);
            break;

          case 'greaterThan':
            result = this.assertGreaterThan(data.value, data.threshold, data.message);
            break;

          case 'lessThan':
            result = this.assertLessThan(data.value, data.threshold, data.message);
            break;

          case 'between':
            result = this.assertBetween(data.value, data.min, data.max, data.message);
            break;

          case 'hasProperty':
            result = this.assertHasProperty(data.object, data.property, data.message);
            break;

          case 'isEmpty':
            result = this.assertIsEmpty(data.value, data.message);
            break;

          case 'isNotEmpty':
            result = this.assertIsNotEmpty(data.value, data.message);
            break;

          case 'throws':
            // Note: 'throws' assertion is difficult with serialized functions
            // Returning a not implemented result
            result = {
              passed: false,
              message: 'Throws assertion requires function execution context',
              actual: 'N/A',
              expected: data.expectedError || 'Error',
            };
            break;

          default:
            throw new ValidationError(
              'Invalid assertion type',
              ['assertion'],
              (data as { assertion: string }).assertion,
              'valid assertion type'
            );
        }

        return result;
      },
      input,
      context
    );
  }
}
